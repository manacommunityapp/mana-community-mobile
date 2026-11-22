import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';

export function SyncStatusBar() {
  const router = useRouter();
  const { syncStatus, pendingCount, conflictCount } = useBackgroundSync();

  if (syncStatus === 'IDLE' && pendingCount === 0 && conflictCount === 0) return null;

  if (conflictCount > 0) {
    return (
      <TouchableOpacity
        style={[styles.bar, styles.conflict]}
        onPress={() => router.push('/sync/conflicts')}
        activeOpacity={0.85}
      >
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.text}>
          {conflictCount} sync conflict{conflictCount !== 1 ? 's' : ''} — tap to review
        </Text>
      </TouchableOpacity>
    );
  }

  if (syncStatus === 'SYNCING') {
    return (
      <View style={[styles.bar, styles.syncing]}>
        <ActivityIndicator size="small" color="#FFFFFF" />
        <Text style={styles.text}>Syncing {pendingCount} item{pendingCount !== 1 ? 's' : ''}…</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={[styles.bar, styles.pending]}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.text}>
          {pendingCount} action{pendingCount !== 1 ? 's' : ''} queued — awaiting confirmation
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 8,
  },
  pending: { backgroundColor: '#78716C' },
  syncing: { backgroundColor: '#2563EB' },
  conflict: { backgroundColor: '#DC2626' },
  icon: { fontSize: 13 },
  text: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
    flexShrink: 1,
  },
});
