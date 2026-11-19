import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { healthcareService, Referral } from '../../services/healthcareService';

const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  URGENT: { bg: '#fef2f2', text: '#dc2626' },
  HIGH: { bg: '#fff7ed', text: '#ea580c' },
  NORMAL: { bg: '#f0fdf4', text: '#16a34a' },
  LOW: { bg: '#f8fafc', text: '#64748b' },
};

export default function ReferralsScreen() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setReferrals(await healthcareService.listReferrals()); }
    catch { Alert.alert('Error', 'Failed to load referrals'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={referrals}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No referrals</Text>}
        renderItem={({ item }) => {
          const urgency = URGENCY_COLORS[item.urgency] || URGENCY_COLORS.NORMAL;
          return (
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.referredToName}</Text>
                  <Text style={styles.sub}>{item.referredToType}{item.specialization ? ` · ${item.specialization}` : ''}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: urgency.bg }]}>
                  <Text style={[styles.badgeText, { color: urgency.text }]}>{item.urgency}</Text>
                </View>
              </View>
              <Text style={styles.reason}>{item.reason}</Text>
              <View style={styles.footer}>
                <Text style={styles.meta}>Patient #{item.patientUserId} · {new Date(item.referralDate).toLocaleDateString()}</Text>
                <View style={[styles.badge, { backgroundColor: item.status === 'COMPLETED' ? '#dcfce7' : '#f1f5f9' }]}>
                  <Text style={[styles.badgeText, { color: item.status === 'COMPLETED' ? '#16a34a' : '#64748b' }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  reason: { fontSize: 13, color: '#475569', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 12, color: '#94a3b8' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
