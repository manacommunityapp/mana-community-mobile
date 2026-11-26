import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { offlineSyncService } from '@/services/offlineSyncService';
import { backgroundSync } from '@/services/backgroundSync';
import { requestQueue, type QueuedRequest } from '@/services/requestQueue';
import { useAuth } from '@/hooks/useAuth';
import { SHADOWS, RADIUS } from '@/constants/config';

export default function OfflineSyncScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncFailed, setLastSyncFailed] = useState(false);

  const refreshQueue = async () => {
    const all = await requestQueue.getAll();
    setQueue(all.filter((item) => item.identity.userId === Number(user?.id) && item.identity.communityId === (user?.communityId ?? null)));
  };

  useEffect(() => {
    void refreshQueue();
    const unsubscribeStatus = offlineSyncService.onStatusChange(setIsOnline);
    const unsubscribeQueue = requestQueue.subscribe(() => { void refreshQueue(); });
    return () => { unsubscribeStatus(); unsubscribeQueue(); };
  }, [user?.id, user?.communityId]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await backgroundSync.run();
      await refreshQueue();
      setLastSyncFailed(result.failed > 0 || result.conflicts.length > 0);
      Alert.alert('Sync Finished', `${result.succeeded} confirmed, ${result.failed} failed, ${result.conflicts.length} conflict(s).`);
    } catch (err) {
      setLastSyncFailed(true);
      await refreshQueue();
      const stillPending = queue.filter((item) => item.status === 'PENDING').length;
      Alert.alert(
        'Sync Failed',
        `Sync could not complete. Nothing was confirmed by the server. ${stillPending} item(s) remain pending.`
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Offline Sync Queue"
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.networkDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.networkStatusText}>{isOnline ? 'Online (Connected)' : 'Deep Offline Mode'}</Text>
          </View>
          <Text style={styles.statusDescription}>
            Only bill-paid records are queued for retry. Queued changes stay on this device until the server confirms them; a queued change is not a completed payment.
          </Text>

          {lastSyncFailed && (
            <View style={styles.failureBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
              <Text style={styles.failureBannerText}>
                Some queued changes could not be confirmed. Review the status of each item below before treating it as complete.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.syncBtn}
            onPress={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                <Text style={styles.syncBtnText}>Sync Pending Items Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Persisted Queue List */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeader}>On-device queue ({queue.length})</Text>
        </View>

        {queue.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#10B981" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySubtitle}>No queued changes for this account.</Text>
          </View>
        ) : (
          queue.map((item) => (
            <View key={item.id} style={styles.mutationCard}>
              <View style={styles.mutationHeader}>
                <View style={styles.mutationTypeBadge}>
                  <Text style={styles.mutationTypeText}>{item.operation.type.replaceAll('_', ' ')}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'PENDING' ? '#FEF3C7' : item.status === 'CONFLICT' ? '#FEE2E2' : '#E2E8F0' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: item.status === 'PENDING' ? '#92400E' : item.status === 'CONFLICT' ? '#B91C1C' : '#334155' },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.mutationId}>Bill {item.operation.billId}</Text>
              <Text style={styles.mutationPayload} numberOfLines={2}>
                {item.lastError ?? `${item.retryCount} retry attempt(s)`}
              </Text>
              <Text style={styles.mutationTimestamp}>
                Added: {new Date(item.createdAt).toLocaleString()}
              </Text>
              {item.status === 'FAILED' && (
                <TouchableOpacity onPress={async () => { await requestQueue.retry(item.id); if (isOnline) await backgroundSync.run(); }}>
                  <Text style={styles.clearBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
              {item.status !== 'PENDING' && (
                <TouchableOpacity onPress={() => requestQueue.remove(item.id)}>
                  <Text style={styles.clearBtnText}>Discard item</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 16 },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  networkDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  networkStatusText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  statusDescription: { fontSize: 12, color: '#64748B', lineHeight: 17, marginBottom: 14 },
  syncBtn: {
    backgroundColor: '#0284C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  syncBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  clearBtnText: { fontSize: 12, color: '#0284C7', fontWeight: '600' },
  failureBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  failureBannerText: { flex: 1, fontSize: 11, color: '#B91C1C', lineHeight: 16, fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: '#64748B', marginTop: 4 },
  mutationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  mutationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mutationTypeBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  mutationTypeText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  mutationId: { fontSize: 12, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  mutationPayload: { fontSize: 11, color: '#64748B', fontFamily: 'monospace', marginBottom: 6 },
  mutationTimestamp: { fontSize: 10, color: '#94A3B8' },
});
