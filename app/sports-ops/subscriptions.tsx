import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sportsOpsService, CourtSlotSubscription } from '../../services/sportsOpsService';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SubscriptionsScreen() {
  const [subs, setSubs] = useState<CourtSlotSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSubs(await sportsOpsService.mySubscriptions()); }
    catch { Alert.alert('Error', 'Failed to load subscriptions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = (id: number) => {
    Alert.alert('Cancel Subscription', 'Are you sure?', [
      { text: 'No' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        try { await sportsOpsService.cancelSubscription(id); load(); }
        catch { Alert.alert('Error', 'Could not cancel'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={subs}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No active subscriptions</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Court #{item.courtId} · {DAY_NAMES[item.dayOfWeek]}</Text>
              <Text style={styles.sub}>{item.startTime}–{item.endTime} · {item.frequency}</Text>
              <Text style={styles.meta}>From {item.startDate}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={[styles.badge, { backgroundColor: item.active ? '#dcfce7' : '#f1f5f9' }]}>
                <Text style={[styles.badgeText, { color: item.active ? '#16a34a' : '#94a3b8' }]}>{item.active ? 'Active' : 'Inactive'}</Text>
              </View>
              {item.active && (
                <TouchableOpacity onPress={() => cancel(item.id)} style={styles.cancelBtn}>
                  <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>Cancel</Text>
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
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#fef2f2', borderRadius: 8 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
