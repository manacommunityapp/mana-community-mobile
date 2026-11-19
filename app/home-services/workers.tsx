import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { homeServicesService, HsWorker } from '../../services/homeServicesService';

function Stars({ rating }: { rating?: number }) {
  const r = Math.round(rating ?? 0);
  return (
    <Text style={{ color: '#f59e0b', letterSpacing: 1, fontSize: 14 }}>
      {Array(5).fill(0).map((_, i) => i < r ? '★' : '☆').join('')}
    </Text>
  );
}

export default function Workers() {
  const [workers, setWorkers] = useState<HsWorker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeServicesService.listWorkers().then(setWorkers).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#10b981" />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={workers}
        keyExtractor={w => String(w.id)}
        contentContainerStyle={{ padding: 16 }}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No workers available</Text>}
        renderItem={({ item: w }) => (
          <View style={styles.card}>
            <View style={styles.avatar}><Text style={{ fontSize: 24 }}>👷</Text></View>
            <Text style={styles.name}>{w.name}</Text>
            {w.phone ? <Text style={styles.phone}>{w.phone}</Text> : null}
            <Stars rating={w.rating} />
            <Text style={styles.jobs}>{w.totalJobs} jobs</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  phone: { fontSize: 12, color: '#64748b', marginTop: 2 },
  jobs: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
