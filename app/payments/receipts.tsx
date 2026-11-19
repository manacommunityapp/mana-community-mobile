import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentsService, PaymentReceipt } from '../../services/paymentsService';

export default function Receipts() {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsService.listReceipts().then(setReceipts).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#10b981" />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={receipts}
        keyExtractor={r => String(r.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No receipts</Text>}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rnum}>{r.receiptNumber}</Text>
              <Text style={styles.module}>{r.sourceModule} · Ref #{r.referenceId}</Text>
              {r.paymentMethod && <Text style={styles.method}>{r.paymentMethod}</Text>}
              <Text style={styles.date}>{new Date(r.paidAt).toLocaleString()}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amount}>₹{r.amount}</Text>
              <Text style={styles.currency}>{r.currency}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  rnum: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace', color: '#1e293b' },
  module: { fontSize: 13, color: '#64748b', marginTop: 2 },
  method: { fontSize: 12, color: '#94a3b8' },
  date: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  amount: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  currency: { fontSize: 12, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
