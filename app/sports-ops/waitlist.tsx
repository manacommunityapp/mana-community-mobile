import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sportsOpsService, CourtSlotWaitlist } from '../../services/sportsOpsService';

export default function WaitlistScreen() {
  const [entries, setEntries] = useState<CourtSlotWaitlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sportsOpsService.myWaitlist()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.heading}>Court Waitlist</Text>
      {entries.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTxt}>You are not on any waitlist.</Text></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={e => String(e.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: e }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Booking #{e.bookingId}</Text>
                <Text style={styles.cardSub}>Position #{e.position}</Text>
                {e.expiresAt && (
                  <Text style={styles.expiry}>Expires {new Date(e.expiresAt).toLocaleString()}</Text>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: e.notified ? '#dcfce7' : '#f1f5f9' }]}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: e.notified ? '#16a34a' : '#64748b' }}>
                  {e.notified ? 'Notified' : 'Waiting'}
                </Text>
              </View>
            </View>
          )}
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
  expiry: { fontSize: 12, color: '#f59e0b', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginLeft: 12 },
});
