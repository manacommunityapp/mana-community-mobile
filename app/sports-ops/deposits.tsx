import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sportsOpsService, SportsNoShowDeposit } from '../../services/sportsOpsService';

export default function DepositsScreen() {
  const [deposits, setDeposits] = useState<SportsNoShowDeposit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportsOpsService.listDeposits()
      .then(setDeposits)
      .finally(() => setLoading(false));
  }, []);

  const statusLabel = (d: SportsNoShowDeposit) => {
    if (d.forfeited) return { label: 'Forfeited', color: '#dc2626', bg: '#fee2e2' };
    if (d.released) return { label: 'Released', color: '#16a34a', bg: '#dcfce7' };
    return { label: 'Held', color: '#d97706', bg: '#fef3c7' };
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.heading}>No-Show Deposits</Text>
      {deposits.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTxt}>No deposits found.</Text></View>
      ) : (
        <FlatList
          data={deposits}
          keyExtractor={d => String(d.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: d }) => {
            const st = statusLabel(d);
            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Booking #{d.bookingId}</Text>
                  <Text style={styles.cardSub}>₹{d.amount} · Held {new Date(d.heldAt).toLocaleDateString()}</Text>
                  {d.reason && <Text style={styles.reason}>{d.reason}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: st.color }}>{st.label}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a', padding: 20, paddingBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: '#94a3b8', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  reason: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 12 },
});
