import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { paymentsService, PaymentDispute } from '../../services/paymentsService';

export default function Disputes() {
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsService.listDisputes().then(setDisputes).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#dc2626" />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={disputes}
        keyExtractor={d => String(d.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10b981" />
            <Text style={styles.emptyText}>No disputes — all clear!</Text>
          </View>
        }
        renderItem={({ item: d }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>₹{d.amount} · {d.reason}</Text>
                {d.description ? <Text style={styles.desc}>{d.description}</Text> : null}
                {d.resolution ? <Text style={styles.resolution}>Resolution: {d.resolution}</Text> : null}
                <Text style={styles.date}>{new Date(d.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: d.status === 'RESOLVED' ? '#dcfce7' : '#fef2f2' }]}>
                <Text style={[styles.badgeText, { color: d.status === 'RESOLVED' ? '#16a34a' : '#dc2626' }]}>{d.status}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  amount: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  desc: { fontSize: 13, color: '#64748b', marginTop: 2 },
  resolution: { fontSize: 13, color: '#16a34a', marginTop: 4 },
  date: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginLeft: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#64748b', fontSize: 15, marginTop: 12 },
});
