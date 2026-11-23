import { View, StyleSheet } from 'react-native';
import { WebSocketState } from '@/hooks/useWebSocket';

const COLOR: Record<WebSocketState, string> = {
  IDLE: '#9CA3AF',
  CONNECTING: '#F59E0B',
  CONNECTED: '#22C55E',
  RECONNECTING: '#F59E0B',
  FAILED: '#EF4444',
};

export function ConnectionStatusDot({ state }: { state: WebSocketState }) {
  return <View style={[styles.dot, { backgroundColor: COLOR[state] }]} />;
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
});
