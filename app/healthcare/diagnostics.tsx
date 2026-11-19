import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { healthcareService, DiagnosticsSla } from '../../services/healthcareService';

export default function DiagnosticsScreen() {
  const [items, setItems] = useState<DiagnosticsSla[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await healthcareService.listDiagnosticBreaches()); }
    catch { Alert.alert('Error', 'Failed to load diagnostics breaches'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.alertBanner}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={styles.alertText}>{items.length} SLA breach{items.length > 1 ? 'es' : ''} detected</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.ok}>
            <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
            <Text style={styles.okText}>No SLA breaches</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.partnerName}</Text>
                <Text style={styles.sub}>{item.testCategory} · Order #{item.orderId}</Text>
                <Text style={styles.meta}>Patient #{item.patientUserId}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.badgeText, { color: '#dc2626' }]}>BREACH</Text>
              </View>
            </View>
            <Text style={styles.meta}>SLA: {item.slaHours}h · Due: {new Date(item.reportDueAt).toLocaleDateString()}</Text>
            {item.breachNotified && (
              <View style={styles.notifiedRow}>
                <Ionicons name="notifications-outline" size={12} color="#64748b" />
                <Text style={styles.meta}> Notification sent</Text>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 10, marginBottom: 14, gap: 6 },
  alertText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  notifiedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ok: { alignItems: 'center', marginTop: 80, gap: 10 },
  okText: { fontSize: 16, color: '#16a34a', fontWeight: '600' },
});
