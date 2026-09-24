import { useEffect, useRef, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { CONFIG } from '@/constants/config';
import { tokenStore } from '@/services/apiClient';

interface UseWebSocketOptions {
  topics: string[];
  onMessage: (topic: string, body: unknown) => void;
  enabled?: boolean;
}

export function useWebSocket({ topics, onMessage, enabled = true }: UseWebSocketOptions) {
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const topicsKey = topics.join(',');

  useEffect(() => {
    let client: Client | null = null;
    let cancelled = false;

    (async () => {
      const token = await tokenStore.getAccess();
      if (!token || !enabled || cancelled) return;

      client = new Client({
        brokerURL: CONFIG.WS_URL,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          topics.forEach((topic) => {
            client?.subscribe(topic, (msg: IMessage) => {
              try {
                const body = JSON.parse(msg.body);
                onMessageRef.current(topic, body);
              } catch {
                onMessageRef.current(topic, msg.body);
              }
            });
          });
        },
        onStompError: (frame) => {
          console.warn('[WS] STOMP error:', frame.headers['message']);
        },
      });

      client.activate();
      clientRef.current = client;
    })();

    return () => {
      cancelled = true;
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [topicsKey, enabled]);

  const publish = useCallback((destination: string, body: unknown) => {
    clientRef.current?.publish({
      destination,
      body: JSON.stringify(body),
    });
  }, []);

  return { publish };
}
