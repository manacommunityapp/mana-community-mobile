import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { AppState, type AppStateStatus } from 'react-native';
import { CONFIG } from '@/constants/config';
import { tokenStore } from '@/services/apiClient';
import { secureLog } from '@/security';

export type WsState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'FAILED';

type MessageHandler = (data: any) => void;
type VoidCallback = () => void;

interface TrackedSubscription {
  topic: string;
  handler: MessageHandler;
  sub?: StompSubscription;
}

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

class WebSocketManager {
  private client: Client | null = null;
  private tracked = new Map<number, TrackedSubscription>();
  private nextId = 1;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _state: WsState = 'IDLE';
  private connectCallbacks = new Set<VoidCallback>();
  private disconnectCallbacks = new Set<VoidCallback>();

  constructor() {
    // Monitor mobile app foreground / background transitions
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  get state(): WsState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === 'CONNECTED' && (this.client?.connected ?? false);
  }

  private setState(newState: WsState) {
    if (this._state === newState) return;
    this._state = newState;
    if (newState === 'CONNECTED') {
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
      if (this.tracked.size > 0 && !this.isConnected) {
        this.ensureClient();
      }
    }
  };

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)];
    this.reconnectAttempt++;
    this.setState('RECONNECTING');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.client?.deactivate().then(() => {
        this.client = null;
        if (this.tracked.size > 0) {
          this.ensureClient();
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
      reconnectDelay: 0, // Managed manually with exponential backoff
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
      this.ensureClient();
    }

    return () => {
      const existing = this.tracked.get(id);
      if (existing?.sub) {
        try { existing.sub.unsubscribe(); } catch {}
      }
      this.tracked.delete(id);

      // If no topics remain subscribed after a delay, could idle
      if (this.tracked.size === 0) {
        // Keep warm for 10 seconds in case navigating to another screen
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
}

export const websocketManager = new WebSocketManager();
