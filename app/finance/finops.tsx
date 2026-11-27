import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/config';
import { finopsService } from '@/services/finopsService';
import { estimateCompressedBytes, getCompressionProfile } from '@/utils/mediaCompression';
import type {
  DeliveryRoutePlan,
  StorageFinOpsSummary,
  TelecomFinOpsSummary,
} from '@/types/finops';

const SOCIETY_ID = 1;

export default function FinOpsScreen() {
  const [wsOnline, setWsOnline] = useState(true);
  const [dozeMode, setDozeMode] = useState(false);
  const [plan, setPlan] = useState<DeliveryRoutePlan | null>(null);
  const [telecom, setTelecom] = useState<TelecomFinOpsSummary | null>(null);
  const [storage, setStorage] = useState<StorageFinOpsSummary | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        finopsService.getTelecomSummary(SOCIETY_ID),
        finopsService.getStorageSummary(SOCIETY_ID),
      ]);
      setTelecom(t);
      setStorage(s);
    } catch {
      // offline preview
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleDispatch = async () => {
    try {
      const p = await finopsService.dispatchGateAlert(SOCIETY_ID, 'res_mobile_a402', wsOnline, dozeMode);
      setPlan(p);
      await loadAll();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unable to dispatch');
    }
  };

  const handleAck = async () => {
    if (!plan) return;
    try {
      const ev = await finopsService.ackGateAlert(plan.alertId, plan.currentChannel, 2500);
      setPlan({ ...plan, status: ev.status });
      await loadAll();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'ACK failed');
    }
  };

  const handleLogWebp = async () => {
    const profile = getCompressionProfile('VISITOR_SNAPSHOT');
    const compressed = estimateCompressedBytes(2_800_000, 'VISITOR_SNAPSHOT');
    try {
      const res = await finopsService.recordCompressionAudit(
        SOCIETY_ID,
        'VISITOR_SNAPSHOT',
        2_800_000,
        compressed,
        profile.format,
      );
      setStorage(res);
      Alert.alert('Logged', `2.8 MB -> ${(compressed / 1024).toFixed(0)} KB ${profile.format}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Audit failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>FinOps &amp; 15s Telecom Router</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>SLA ≤ 15s</Text>
            <Text style={styles.kpiVal}>
              {telecom ? `${telecom.slaCompliancePct.toFixed(1)}%` : '—'}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Telecom Saved</Text>
            <Text style={[styles.kpiVal, { color: COLORS.success }]}>
              {telecom ? `₹${(telecom.totalSavedPaise / 100).toFixed(2)}` : '—'}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>WebP Drop</Text>
            <Text style={styles.kpiVal}>
              {storage ? `${storage.compressionSavingsPct.toFixed(1)}%` : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cost-Aware Gate Delivery Router</Text>
          <View style={styles.row}>
            <Text style={styles.label}>WS / FCM Heartbeat Online</Text>
            <Switch value={wsOnline} onValueChange={setWsOnline} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Aggressive OEM Doze</Text>
            <Switch value={dozeMode} onValueChange={setDozeMode} />
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => void handleDispatch()}>
            <Text style={styles.btnText}>Dispatch Gate Alert</Text>
          </TouchableOpacity>

          {plan ? (
            <View style={styles.planBox}>
              <Text style={styles.planTitle}>
                Initial: {plan.initialChannel} (₹{(plan.currentCostPaise / 100).toFixed(2)})
              </Text>
              <Text style={styles.planSub}>{plan.routingReason}</Text>
              {plan.status !== 'RESOLVED' ? (
                <TouchableOpacity style={styles.okBtn} onPress={() => void handleAck()}>
                  <Text style={styles.btnText}>Tap Approve (Cancel Escalations)</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>S3 WebP Compression Guardrail</Text>
          <Text style={styles.planSub}>
            Guard tablet compresses 2.8 MB JPEG → ~70 KB WebP before S3 PUT; objects &lt; 128 KB skip S3 IA monitoring tax.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => void handleLogWebp()}>
            <Text style={styles.btnText}>Log WebP Upload Telemetry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 14 },
  header: { fontSize: 20, fontWeight: '800', color: COLORS.text },
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
  kpiVal: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: COLORS.textSecondary },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  okBtn: { backgroundColor: COLORS.success, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  planBox: { backgroundColor: COLORS.backgroundAlt, padding: 10, borderRadius: 8 },
  planTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  planSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
