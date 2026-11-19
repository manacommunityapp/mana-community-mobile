import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { healthcareService, DiagnosticsSla } from '../../services/healthcareService';
import { healthcareOpsService, DiagnosticsOrderDto, DiagnosticsStatus } from '../../services/healthcareOpsService';

const PLACEHOLDER_PATIENT_ID = 1;

const ORDER_STEPS: { status: DiagnosticsStatus; label: string }[] = [
  { status: 'ORDERED', label: 'Ordered' },
  { status: 'SAMPLE_COLLECTED', label: 'Sample' },
  { status: 'IN_PROGRESS', label: 'Processing' },
  { status: 'RESULTS_READY', label: 'Ready' },
  { status: 'DELIVERED', label: 'Delivered' },
];

const STEP_INDEX: Record<DiagnosticsStatus, number> = {
  ORDERED: 0, SAMPLE_COLLECTED: 1, IN_PROGRESS: 2, RESULTS_READY: 3, DELIVERED: 4,
};

function ProgressSteps({ status }: { status: DiagnosticsStatus }) {
  const current = STEP_INDEX[status] ?? 0;
  return (
    <View style={styles.progressRow}>
      {ORDER_STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.status}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                done && styles.stepDone,
                active && styles.stepActive,
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={10} color="#fff" />
                  : <View style={[styles.stepInner, active && { backgroundColor: '#2563eb' }]} />}
              </View>
              <Text style={[styles.stepLabel, active && { color: '#2563eb', fontWeight: '700' }]}>
                {step.label}
              </Text>
            </View>
            {i < ORDER_STEPS.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function MyOrdersTab() {
  const [orders, setOrders] = useState<DiagnosticsOrderDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOrders(await healthcareOpsService.getDiagnosticsOrders(PLACEHOLDER_PATIENT_ID)); }
    catch { Alert.alert('Error', 'Failed to load orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <FlatList
      data={orders}
      keyExtractor={i => String(i.id)}
      contentContainerStyle={{ padding: 16 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="flask-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No diagnostics orders</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.partnerName}</Text>
              <Text style={styles.sub}>{item.testNames}</Text>
            </View>
            {item.slaBreached && (
              <View style={[styles.badge, { backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.badgeTxt, { color: '#dc2626' }]}>SLA Breach</Text>
              </View>
            )}
          </View>
          <ProgressSteps status={item.status} />
          <View style={styles.meta}>
            <Text style={styles.metaTxt}>
              Ordered {new Date(item.orderedAt).toLocaleDateString()}
              {item.completedAt ? ` · Done ${new Date(item.completedAt).toLocaleDateString()}` : ` · Expected ${new Date(item.expectedAt).toLocaleDateString()}`}
            </Text>
          </View>
          {item.resultsUrl && item.status === 'DELIVERED' && (
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => item.resultsUrl && Linking.openURL(item.resultsUrl)}
            >
              <Ionicons name="document-text-outline" size={14} color="#2563eb" />
              <Text style={styles.viewBtnTxt}>View Results</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

function SlaBreachesTab() {
  const [items, setItems] = useState<DiagnosticsSla[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await healthcareService.listDiagnosticBreaches()); }
    catch { Alert.alert('Error', 'Failed to load breaches'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <FlatList
      data={items}
      keyExtractor={i => String(i.id)}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={items.length > 0
        ? () => (
            <View style={styles.alertBanner}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={styles.alertText}>{items.length} SLA breach{items.length > 1 ? 'es' : ''} detected</Text>
            </View>
          )
        : undefined
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
          <Text style={[styles.emptyText, { color: '#16a34a' }]}>No SLA breaches</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.partnerName}</Text>
              <Text style={styles.sub}>{item.testCategory} · Order #{item.orderId}</Text>
              <Text style={styles.metaTxt}>Patient #{item.patientUserId}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#fef2f2' }]}>
              <Text style={[styles.badgeTxt, { color: '#dc2626' }]}>BREACH</Text>
            </View>
          </View>
          <Text style={styles.metaTxt}>
            SLA: {item.slaHours}h · Due: {new Date(item.reportDueAt).toLocaleDateString()}
          </Text>
          {item.breachNotified && (
            <View style={styles.notifiedRow}>
              <Ionicons name="notifications-outline" size={12} color="#64748b" />
              <Text style={styles.metaTxt}> Notification sent</Text>
            </View>
          )}
        </View>
      )}
    />
  );
}

type Tab = 'orders' | 'breaches';

export default function DiagnosticsScreen() {
  const [tab, setTab] = useState<Tab>('orders');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'orders' && styles.tabActive]}
          onPress={() => setTab('orders')}
        >
          <Text style={[styles.tabTxt, tab === 'orders' && styles.tabTxtActive]}>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'breaches' && styles.tabActive]}
          onPress={() => setTab('breaches')}
        >
          <Text style={[styles.tabTxt, tab === 'breaches' && styles.tabTxtActive]}>SLA Breaches</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'orders' ? <MyOrdersTab /> : <SlaBreachesTab />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabTxt: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  tabTxtActive: { color: '#2563eb' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  meta: { marginTop: 8 },
  metaTxt: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 10, marginBottom: 14, gap: 6 },
  alertText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  notifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8, backgroundColor: '#eff6ff', borderRadius: 8 },
  viewBtnTxt: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  // Progress steps
  progressRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 8 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepDone: { backgroundColor: '#2563eb' },
  stepActive: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#2563eb' },
  stepInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  stepLabel: { fontSize: 10, color: '#94a3b8', textAlign: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e2e8f0', marginTop: 9, marginHorizontal: -4 },
  stepLineDone: { backgroundColor: '#2563eb' },
});
