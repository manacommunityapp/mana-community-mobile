import { useWebSocket, WebSocketState } from './useWebSocket';

export function useWebSocketHealth(topics: string[], onMessage: (topic: string, body: unknown) => void) {
  const { connectionState, reconnectAttempt, publish } = useWebSocket({ topics, onMessage });
  return {
    state: connectionState,
    isConnected: connectionState === 'CONNECTED',
    reconnectAttempt,
    publish,
  };
}
