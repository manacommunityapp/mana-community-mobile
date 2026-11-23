import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { paymentsService, PaymentReward } from '../../services/paymentsService';

export default function Rewards() {
  const [rewards, setRewards] = useState<PaymentReward[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([paymentsService.myRewards(), paymentsService.rewardBalance()])
      .then(([rws, bal]) => { setRewards(rws); setBalance(bal.points); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const redeem = (id: number) => {
    Alert.alert('Redeem Reward', 'Redeem this reward?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redeem', onPress: () => paymentsService.redeemReward(id).then(load).catch(() => Alert.alert('Error', 'Could not redeem')) },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#7c3aed" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.balanceCard}>
        <Ionicons name="gift-outline" size={32} color="#fff" style={{ marginBottom: 8 }} />
        <Text style={styles.balanceLabel}>Available Points</Text>
        <Text style={styles.balanceNum}>{balance}</Text>
      </View>
      <FlatList
        data={rewards}
        keyExtractor={r => String(r.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No rewards yet</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rtype}>{r.rewardType.replace(/_/g, ' ')}</Text>
              <Text style={styles.module}>{r.sourceModule}{r.description ? ` · ${r.description}` : ''}</Text>
            </View>
            <View style={styles.right}>
              <Text style={[styles.pts, { color: r.redeemed ? '#94a3b8' : '#7c3aed' }]}>+{r.points}</Text>
              {!r.redeemed ? (
                <TouchableOpacity style={styles.redeemBtn} onPress={() => redeem(r.id)}>
                  <Text style={styles.redeemText}>Redeem</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.usedBadge}><Text style={styles.usedText}>Used</Text></View>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  balanceCard: { margin: 16, borderRadius: 18, padding: 24, alignItems: 'center', backgroundColor: '#7c3aed' },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  balanceNum: { color: '#fff', fontSize: 52, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  rtype: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  module: { fontSize: 13, color: '#64748b', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  pts: { fontSize: 18, fontWeight: '800' },
  redeemBtn: { backgroundColor: '#ede9fe', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  redeemText: { color: '#7c3aed', fontSize: 12, fontWeight: '700' },
  usedBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  usedText: { color: '#94a3b8', fontSize: 12 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
