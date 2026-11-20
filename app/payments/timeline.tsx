import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentsService, PaymentTimelineEvent } from '../../services/paymentsService';

const MODULE_COLORS: Record<string, string> = {
  FOOD: '#10b981', HEALTHCARE: '#3b82f6', SPORTS: '#f59e0b',
  BILLING: '#8b5cf6', FINANCE: '#06b6d4',
};

export default function PaymentTimeline() {
  const [events, setEvents] = useState<PaymentTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsService.timeline().then(setEvents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563eb" />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No payment events</Text>}
        renderItem={({ item: e, index }) => {
          const color = MODULE_COLORS[e.sourceModule] || '#64748b';
          return (
            <View style={styles.row}>
              <View style={styles.dotCol}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                {index < events.length - 1 && <View style={styles.line} />}
              </View>
              <View style={[styles.card, { borderLeftColor: color }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.module, { color }]}>{e.sourceModule}</Text>
                  {e.amount != null && <Text style={styles.amount}>₹{e.amount}</Text>}
                </View>
                <Text style={styles.eventType}>{e.eventType.replace(/_/g, ' ')}</Text>
                {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
                <Text style={styles.time}>{new Date(e.occurredAt).toLocaleString()}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  row: { flexDirection: 'row', marginBottom: 12 },
  dotCol: { alignItems: 'center', width: 20, marginRight: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  line: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginTop: 2 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderLeftWidth: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  module: { fontSize: 11, fontWeight: '700' },
  amount: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  eventType: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  desc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  time: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
