import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/config';
import { statutoryAccountingService } from '@/services/statutoryAccountingService';
import type { TallyOutboxItem, TallySyncConflict, TallySyncSummary } from '@/types/accounting';

const SOCIETY_ID = 1;

export default function TallySyncScreen() {
  const [summary, setSummary] = useState<TallySyncSummary | null>(null);
  const [outbox, setOutbox] = useState<TallyOutboxItem[]>([]);
  const [conflicts, setConflicts] = useState<TallySyncConflict[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [sum, ob, conf] = await Promise.all([
        statutoryAccountingService.getTallySummary(SOCIETY_ID),
        statutoryAccountingService.getTallyOutbox(SOCIETY_ID),
        statutoryAccountingService.listConflicts(SOCIETY_ID),
      ]);
      setSummary(sum);
      setOutbox(ob);
      setConflicts(conf);
    } catch {
      // ignore offline preview errors
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleResolve = async (conflictId: string, action: 'REVERT_TALLY' | 'ACCEPT_REVERSAL') => {
    try {
      await statutoryAccountingService.resolveConflict(conflictId, SOCIETY_ID, action);
      Alert.alert('Resolved', `Applied ${action}`);
      await loadAll();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to resolve');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Tally XML Bidirectional Sync</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => void loadAll()}>
          <Text style={styles.refreshText}>Refresh Sync Status</Text>
        </TouchableOpacity>

        {summary ? (
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Pending</Text>
              <Text style={styles.kpiVal}>{summary.pendingOutboxCount}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Synced</Text>
              <Text style={styles.kpiVal}>{summary.syncedCount}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Conflicts</Text>
              <Text style={[styles.kpiVal, summary.openConflictsCount > 0 && { color: COLORS.error }]}>
                {summary.openConflictsCount}
              </Text>
            </View>
          </View>
        ) : null}

        {conflicts.map((c) => (
          <View key={c.conflictId} style={styles.conflictCard}>
            <Text style={styles.conflictTitle}>Conflict · GUID {c.tallyGuid.slice(0, 12)}…</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => void handleResolve(c.conflictId, 'REVERT_TALLY')}
              >
                <Text style={styles.outlineText}>Revert Tally</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.warnBtn}
                onPress={() => void handleResolve(c.conflictId, 'ACCEPT_REVERSAL')}
              >
                <Text style={styles.warnText}>Post Reversal</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.box}>
          <Text style={styles.boxTitle}>Pending XML Outbox ({outbox.length})</Text>
          {outbox.length === 0 ? (
            <Text style={styles.empty}>No pending vouchers in outbox.</Text>
          ) : (
            outbox.map((item) => (
              <View key={item.voucherId} style={styles.outboxItem}>
                <Text style={styles.vchNum}>{item.voucherNumber}</Text>
                <Text style={styles.guid}>GUID: {item.tallyGuid}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12 },
  header: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  refreshBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
  refreshText: { color: '#FFFFFF', fontWeight: '700' },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  kpiLabel: { fontSize: 11, color: COLORS.textMuted },
  kpiVal: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  conflictCard: {
    backgroundColor: COLORS.errorLight,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  conflictTitle: { fontSize: 13, fontWeight: '700', color: COLORS.errorDark },
  actionRow: { flexDirection: 'row', gap: 8 },
  outlineBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineText: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
  warnBtn: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  warnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  box: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  boxTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  empty: { fontSize: 12, color: COLORS.textMuted },
  outboxItem: { borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 8 },
  vchNum: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  guid: { fontSize: 11, color: COLORS.textMuted },
});
