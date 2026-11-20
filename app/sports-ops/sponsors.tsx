import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sportsOpsService, TournamentSponsor } from '../../services/sportsOpsService';

const TIER_COLORS: Record<string, string> = {
  TITLE: '#7c3aed', GOLD: '#d97706', SILVER: '#64748b', BRONZE: '#92400e',
};

export default function SponsorsScreen() {
  const [tournamentId, setTournamentId] = useState('1');
  const [sponsors, setSponsors] = useState<TournamentSponsor[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    const tid = parseInt(tournamentId);
    if (!tid) return;
    setLoading(true);
    sportsOpsService.listSponsors(tid)
      .then(setSponsors)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tournamentId]);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.heading}>Tournament Sponsors</Text>
      <View style={styles.row}>
        <TextInput style={styles.input} value={tournamentId} onChangeText={setTournamentId}
          keyboardType="numeric" placeholder="Tournament ID" placeholderTextColor="#94a3b8" />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : sponsors.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTxt}>No sponsors for this tournament.</Text></View>
      ) : (
        <FlatList
          data={sponsors}
          keyExtractor={s => String(s.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: s }) => {
            const tierColor = TIER_COLORS[s.tier ?? ''] ?? '#64748b';
            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.sponsorName}</Text>
                  {s.tier && <Text style={[styles.tier, { color: tierColor }]}>{s.tier}</Text>}
                  {s.amount != null && <Text style={styles.amount}>₹{s.amount.toLocaleString()}</Text>}
                  {s.contactName && <Text style={styles.contact}>{s.contactName} · {s.contactEmail}</Text>}
                  {s.benefits && <Text style={styles.benefits}>{s.benefits}</Text>}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: s.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: s.status === 'ACTIVE' ? '#16a34a' : '#64748b' }}>{s.status}</Text>
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
  row: { paddingHorizontal: 16, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 10, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: '#94a3b8', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  tier: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '600', color: '#2563eb', marginTop: 2 },
  contact: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  benefits: { fontSize: 12, color: '#64748b', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 16, marginLeft: 10, marginTop: 2 },
});
