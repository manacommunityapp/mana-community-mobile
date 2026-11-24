import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { homeServicesService, HsRecurringPlan } from '../../services/homeServicesService';

export default function RecurringPlans() {
  const [plans, setPlans] = useState<HsRecurringPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    homeServicesService.myPlans().then(setPlans).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const pause = (id: number) => {
    Alert.alert('Pause Plan', 'Pause this recurring plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pause', onPress: () => homeServicesService.pausePlan(id).then(load) },
    ]);
  };

  const cancel = (id: number) => {
    Alert.alert('Cancel Plan', 'Cancel this recurring plan?', [
      { text: 'No', style: 'cancel' },
      { text: 'Cancel Plan', style: 'destructive', onPress: () => homeServicesService.cancelPlan(id).then(load) },
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#7c3aed" />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={plans}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No recurring plans set up</Text>}
        renderItem={({ item: p }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cat}>{p.category.replace(/_/g, ' ')}</Text>
              <Text style={styles.freq}>{p.frequency} · Next: {new Date(p.nextServiceDate).toLocaleDateString()}</Text>
            </View>
            <View style={styles.actions}>
              <View style={[styles.badge, { backgroundColor: p.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9' }]}>
                <Text style={[styles.badgeText, { color: p.status === 'ACTIVE' ? '#16a34a' : '#94a3b8' }]}>{p.status}</Text>
              </View>
              {p.status === 'ACTIVE' && (
                <TouchableOpacity style={styles.pauseBtn} onPress={() => pause(p.id)}>
                  <Text style={styles.pauseText}>Pause</Text>
                </TouchableOpacity>
              )}
              {p.status !== 'CANCELLED' && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(p.id)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  cat: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  freq: { fontSize: 13, color: '#64748b', marginTop: 2 },
  actions: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  pauseBtn: { backgroundColor: '#fefce8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 },
  pauseText: { color: '#ca8a04', fontSize: 12, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 },
  cancelText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
