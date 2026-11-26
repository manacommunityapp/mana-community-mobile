import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { CONFIG } from '@/constants/config';
import { tokenStore } from '@/services/apiClient';
import { backgroundSync } from '@/services/backgroundSync';
import { secureLog } from '@/security';

export type WsState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'FAILED';

type MessageHandler = (data: any) => void;
type VoidCallback = () => void;
type StateCallback = (state: WsState, meta: { attempt: number; networkType: string }) => void;

interface TrackedSubscription {
  topic: string;
  handler: MessageHandler;
  sub?: StompSubscription;
}

export const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000, 60000];

/**
 * Full-jitter exponential backoff (50%-100% of each tier) to prevent thundering-herd
 * reconnection storms across guard tablets and resident mobile devices.
 */
export function computeJitteredBackoff(attempt: number, rng: () => number = Math.random): number {
  const idx = Math.min(Math.max(0, attempt), BACKOFF_MS.length - 1);
  const ceiling = BACKOFF_MS[idx];
  return Math.floor(ceiling * 0.5 + rng() * ceiling * 0.5);
}

class WebSocketManager {
  private client: Client | null = null;
  private tracked = new Map<number, TrackedSubscription>();
  private nextId = 1;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _state: WsState = 'IDLE';
  private _networkType = 'unknown';
  private _isInternetReachable = true;
  private hasDisconnectedOnce = false;
  private connectCallbacks = new Set<VoidCallback>();
  private disconnectCallbacks = new Set<VoidCallback>();
  private stateCallbacks = new Set<StateCallback>();

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    NetInfo.addEventListener(this.handleNetInfoChange);
  }

  get state(): WsState {
    return this._state;
  }

  get networkType(): string {
    return this._networkType;
  }

  get attemptCount(): number {
    return this.reconnectAttempt;
  }

  get isConnected(): boolean {
    return this._state === 'CONNECTED' && (this.client?.connected ?? false);
  }

  private setState(newState: WsState) {
    if (this._state === newState) return;
    this._state = newState;

    if (newState === 'DISCONNECTED' || newState === 'RECONNECTING' || newState === 'FAILED') {
      this.hasDisconnectedOnce = true;
    }

    this.stateCallbacks.forEach((cb) => {
      try {
        cb(newState, { attempt: this.reconnectAttempt, networkType: this._networkType });
      } catch {}
    });

    if (newState === 'CONNECTED') {
      // Phase 2 & 3 reconciliation: flush offline queue + notify subscribers
      if (this.hasDisconnectedOnce) {
        this.hasDisconnectedOnce = false;
        void backgroundSync.run();
      }
      this.connectCallbacks.forEach((cb) => {
        try { cb(); } catch {}
      });
    } else if (newState === 'DISCONNECTED' || newState === 'FAILED') {
      this.disconnectCallbacks.forEach((cb) => {
        try { cb(); } catch {}
      });
    }
  }

  private handleAppStateChange = (nextStatus: AppStateStatus) => {
    if (nextStatus === 'active') {
      if (this.tracked.size > 0 && !this.isConnected && this._isInternetReachable) {
        this.forceReconnect();
      }
    }
  };

  private handleNetInfoChange = (state: NetInfoState) => {
    const prevType = this._networkType;
    const prevReachable = this._isInternetReachable;
    const nextType = String(state.type ?? 'unknown');
    const nextReachable = !!state.isConnected && state.isInternetReachable !== false;

    this._networkType = nextType;
    this._isInternetReachable = nextReachable;

    if (!nextReachable) {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.setState('DISCONNECTED');
      return;
    }

    // Active Wi-Fi <-> Cellular interface switch or offline -> online recovery:
    // Tear down zombie half-open TCP socket immediately and reconnect cleanly.
    const interfaceChanged = prevType !== 'unknown' && prevType !== nextType;
    const recoveredFromOffline = !prevReachable && nextReachable;

    if ((interfaceChanged || recoveredFromOffline) && this.tracked.size > 0) {
      secureLog.info('[STOMP] Network interface transition detected, forcing clean reconnect', {
        prevType,
        nextType,
      });
      this.forceReconnect();
    }
  };

  /**
   * Immediately tear down any potentially hung TCP socket and reconnect with reset backoff.
   */
  forceReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempt = 0;

    if (!this._isInternetReachable) {
      this.setState('DISCONNECTED');
      return;
    }

    const oldClient = this.client;
    this.client = null;
    if (oldClient) {
      Promise.resolve(oldClient.deactivate({ force: true }))
        .catch(() => {})
        .finally(() => {
          if (this.tracked.size > 0) {
            void this.ensureClient();
          }
        });
    } else if (this.tracked.size > 0) {
      void this.ensureClient();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (!this._isInternetReachable) {
      this.setState('DISCONNECTED');
      return;
    }

    const delay = computeJitteredBackoff(this.reconnectAttempt);
    this.reconnectAttempt++;
    this.setState('RECONNECTING');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.client?.deactivate().then(() => {
        this.client = null;
        if (this.tracked.size > 0) {
          void this.ensureClient();
        }
      });
    }, delay);
  }

  private async ensureClient(): Promise<Client | null> {
    if (this.client) return this.client;

    const token = await tokenStore.getAccess();
    if (!token) {
      this.setState('IDLE');
      return null;
    }

    this.setState('CONNECTING');

    const client = new Client({
      brokerURL: CONFIG.WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 0, // Managed manually with jittered exponential backoff
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        this.reconnectAttempt = 0;
        this.setState('CONNECTED');
        this.tracked.forEach((t) => this.applySubscription(t));
      },
      onStompError: (frame) => {
        secureLog.warn('[STOMP] Protocol error', { message: frame.headers?.['message'] });
        this.scheduleReconnect();
      },
      onWebSocketError: (err) => {
        secureLog.warn('[STOMP] Transport error', err);
        this.scheduleReconnect();
      },
      onWebSocketClose: () => {
        if (this._state === 'CONNECTED' || this._state === 'CONNECTING') {
          this.scheduleReconnect();
        }
      },
      onDisconnect: () => {
        this.setState('DISCONNECTED');
      },
    });

    client.activate();
    this.client = client;
    return client;
  }

  private applySubscription(trackedSub: TrackedSubscription) {
    if (!this.client?.connected) return;
    try {
      trackedSub.sub = this.client.subscribe(trackedSub.topic, (message: IMessage) => {
        try {
          const body = JSON.parse(message.body);
          trackedSub.handler(body);
        } catch {
          trackedSub.handler(message.body);
        }
      });
    } catch (e) {
      secureLog.warn('[STOMP] Subscribe error', e);
    }
  }

  /**
   * Subscribe to a STOMP topic. Returns an unsubscribe function.
   * Re-uses the shared WebSocket client across the entire mobile session.
   */
  subscribe(topic: string, handler: MessageHandler): () => void {
    const id = this.nextId++;
    const entry: TrackedSubscription = { topic, handler };
    this.tracked.set(id, entry);

    if (this.client?.connected) {
      this.applySubscription(entry);
    } else {
      void this.ensureClient();
    }

    return () => {
      const existing = this.tracked.get(id);
      if (existing?.sub) {
        try { existing.sub.unsubscribe(); } catch {}
      }
      this.tracked.delete(id);

      // Keep warm for 10 seconds in case navigating to another screen
      if (this.tracked.size === 0) {
        setTimeout(() => {
          if (this.tracked.size === 0 && this.client) {
            this.client.deactivate();
            this.client = null;
            this.setState('IDLE');
          }
        }, 10000);
      }
    };
  }

  publish(destination: string, body: unknown) {
    if (!this.client?.connected) {
      secureLog.warn('[STOMP] Cannot publish — not connected');
      return;
    }
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    this.client.publish({ destination, body: payload });
  }

  onConnect(cb: VoidCallback): () => void {
    this.connectCallbacks.add(cb);
    return () => this.connectCallbacks.delete(cb);
  }

  onDisconnect(cb: VoidCallback): () => void {
    this.disconnectCallbacks.add(cb);
    return () => this.disconnectCallbacks.delete(cb);
  }

  onStateChange(cb: StateCallback): () => void {
    this.stateCallbacks.add(cb);
    return () => this.stateCallbacks.delete(cb);
  }
}

export const websocketManager = new WebSocketManager();
