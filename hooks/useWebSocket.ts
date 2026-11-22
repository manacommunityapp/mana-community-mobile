import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Client, IMessage, StompHeaders } from '@stomp/stompjs';
import { CONFIG } from '@/constants/config';
import { tokenStore } from '@/services/apiClient';
import { secureLog } from '@/security';

export type WebSocketState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'FAILED';

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000, 60000];

interface UseWebSocketOptions {
  topics: string[];
  onMessage: (topic: string, body: unknown) => void;
  enabled?: boolean;
  onConnectionLimitReached?: () => void;
  onUnauthorized?: () => void;
}

interface UseWebSocketResult {
  publish: (destination: string, body: unknown) => void;
  connectionState: WebSocketState;
  reconnectAttempt: number;
}

// Module-level registry so clearAllSubscriptions can be called from auth logout
const activeClients = new Set<Client>();

export function clearAllSubscriptions(): void {
  activeClients.forEach(c => { try { c.deactivate(); } catch {} });
  activeClients.clear();
}

export function useWebSocket({
  topics,
  onMessage,
  enabled = true,
  onConnectionLimitReached,
  onUnauthorized,
}: UseWebSocketOptions): UseWebSocketResult {
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [connectionState, setConnectionState] = useState<WebSocketState>('IDLE');
  const reconnectAttemptRef = useRef(0);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manuallyDisconnected = useRef(false);

  const topicsKey = topics.join(',');

  const clearBackgroundTimer = () => {
    if (backgroundTimerRef.current) {
      clearTimeout(backgroundTimerRef.current);
      backgroundTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const connect = async () => {
      const token = await tokenStore.getAccess();
      if (!token || cancelled) return;

      manuallyDisconnected.current = false;
      setConnectionState('CONNECTING');

      const client = new Client({
        brokerURL: CONFIG.WS_URL,
        connectHeaders: { Authorization: `Bearer ${token}` },
        // Disable built-in reconnect — we manage it ourselves
        reconnectDelay: 0,

        onConnect: () => {
          reconnectAttemptRef.current = 0;
          setReconnectAttempt(0);
          setConnectionState('CONNECTED');
          topics.forEach(topic => {
            client.subscribe(topic, (msg: IMessage) => {
              try {
                const body = JSON.parse(msg.body);
                onMessageRef.current(topic, body);
              } catch {
                onMessageRef.current(topic, msg.body);
              }
            });
          });
        },

        onStompError: (frame: { headers: StompHeaders; body: string }) => {
          const errorType = frame.headers['x-error-type'];
          secureLog.warn('[WS] STOMP error', { errorType, message: frame.headers['message'] });

          if (errorType === 'CONNECTION_LIMIT') {
            setConnectionState('FAILED');
            manuallyDisconnected.current = true;
            onConnectionLimitReached?.();
            return;
          }
          if (errorType === 'UNAUTHORIZED') {
            setConnectionState('FAILED');
            manuallyDisconnected.current = true;
            onUnauthorized?.();
            return;
          }
          // RATE_LIMITED or generic — schedule reconnect with backoff
          scheduleReconnect();
        },

        onDisconnect: () => {
          if (!cancelled && !manuallyDisconnected.current) {
            setConnectionState('RECONNECTING');
            scheduleReconnect();
          } else {
            setConnectionState('IDLE');
          }
        },

        onWebSocketError: () => {
          if (!cancelled && !manuallyDisconnected.current) {
            setConnectionState('RECONNECTING');
            scheduleReconnect();
          }
        },
      });

      client.activate();
      clientRef.current = client;
      activeClients.add(client);
    };

    const scheduleReconnect = () => {
      if (cancelled || manuallyDisconnected.current) return;
      const attempt = reconnectAttemptRef.current;
      const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
      reconnectAttemptRef.current = attempt + 1;
      setReconnectAttempt(attempt + 1);
      secureLog.warn('[WS] Reconnecting', { attempt: attempt + 1, delayMs: delay });
      setTimeout(() => {
        if (!cancelled && !manuallyDisconnected.current) connect();
      }, delay);
    };

    connect();

    // AppState: disconnect on background, reconnect on foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimerRef.current = setTimeout(() => {
          if (!cancelled) {
            manuallyDisconnected.current = true;
            clientRef.current?.deactivate();
            setConnectionState('IDLE');
          }
        }, 30_000);
      } else if (nextState === 'active') {
        clearBackgroundTimer();
        if (!cancelled && (!clientRef.current?.connected)) {
          reconnectAttemptRef.current = 0;
          connect();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      cancelled = true;
      manuallyDisconnected.current = true;
      clearBackgroundTimer();
      subscription.remove();
      if (clientRef.current) {
        activeClients.delete(clientRef.current);
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      setConnectionState('IDLE');
    };
  }, [topicsKey, enabled]);

  const publish = useCallback((destination: string, body: unknown) => {
    clientRef.current?.publish({ destination, body: JSON.stringify(body) });
  }, []);

  return { publish, connectionState, reconnectAttempt };
}
