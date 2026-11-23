import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WebSocketState } from '@/hooks/useWebSocket';

interface ConnectionStatusBadgeProps {
  state: WebSocketState;
}

const CONFIG: Record<WebSocketState, { label: string; color: string; icon?: string; spin?: boolean } | null> = {
  CONNECTED: null, // hidden when healthy
  IDLE: { label: 'Offline', color: '#94a3b8', icon: 'wifi-outline' },
  CONNECTING: { label: 'Connecting…', color: '#f59e0b', spin: true },
  RECONNECTING: { label: 'Reconnecting…', color: '#f59e0b', spin: true },
  FAILED: { label: 'Connection failed', color: '#ef4444', icon: 'alert-circle-outline' },
};

export function ConnectionStatusBadge({ state }: ConnectionStatusBadgeProps) {
  const cfg = CONFIG[state];
  if (!cfg) return null;

  return (
    <View style={[styles.badge, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '15' }]}>
      {cfg.spin ? (
        <ActivityIndicator size={12} color={cfg.color} />
      ) : cfg.icon ? (
        <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
      ) : null}
      <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
