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
import { offlineSyncService, type SyncMutation } from '@/services/offlineSyncService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

export default function OfflineSyncScreen() {
  const router = useRouter();
  const [queue, setQueue] = useState<SyncMutation[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = () => {
    const q = offlineSyncService.getQueue();
    if (q.length === 0) {
      offlineSyncService.enqueueMutation(1, 101, 'VISITOR_PASS', 'CREATE', { visitorName: 'Amazon Delivery', slot: 'Tower B' });
      offlineSyncService.enqueueMutation(1, 101, 'METER_READING', 'CREATE', { meterId: 102, pulseDelta: 250 });
      setQueue(offlineSyncService.getQueue());
    } else {
      setQueue(q);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const pushRes = await offlineSyncService.pushPendingMutations(1);
      const pullRes = await offlineSyncService.pullDeltaChanges(1);
      setQueue(offlineSyncService.getQueue());
      Alert.alert('Sync Complete', `Processed ${pushRes.acceptedMutationIds.length} mutations. Delta checkpoint updated.`);
    } catch {
      Alert.alert('Sync Staged', 'Network unreachable. Mutations safely queued in local storage.');
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
            Mutations recorded in elevator shafts or basement parking are cached locally and synchronized via Last-Write-Wins (LWW) delta protocol.
          </Text>

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

        {/* Pending Queue List */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionHeader}>Local Mutation Queue ({queue.length})</Text>
          <TouchableOpacity onPress={() => { offlineSyncService.clearSynced(); setQueue(offlineSyncService.getQueue()); }}>
            <Text style={styles.clearBtnText}>Clear Synced</Text>
          </TouchableOpacity>
        </View>

        {queue.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color="#10B981" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySubtitle}>No pending offline mutations in local queue.</Text>
          </View>
        ) : (
          queue.map((item) => (
            <View key={item.mutationId} style={styles.mutationCard}>
              <View style={styles.mutationHeader}>
                <View style={styles.mutationTypeBadge}>
                  <Text style={styles.mutationTypeText}>{item.entityType}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'SYNCED' ? '#D1FAE5' : '#FEF3C7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: item.status === 'SYNCED' ? '#065F46' : '#92400E' },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.mutationId}>{item.mutationId}</Text>
              <Text style={styles.mutationPayload} numberOfLines={2}>
                Payload: {item.payloadJson}
              </Text>
              <Text style={styles.mutationTimestamp}>
                Timestamp: {new Date(item.vectorTimestamp).toLocaleTimeString()}
              </Text>
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
