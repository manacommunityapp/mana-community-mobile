import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { healthcareService, PrescriptionFollowup } from '../../services/healthcareService';

export default function FollowupsScreen() {
  const [items, setItems] = useState<PrescriptionFollowup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await healthcareService.listFollowups()); }
    catch { Alert.alert('Error', 'Failed to load follow-ups'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const complete = (id: number) => {
    Alert.alert('Mark Complete', 'Mark this follow-up as completed?', [
      { text: 'Cancel' },
      { text: 'Complete', onPress: async () => {
        try { await healthcareService.completeFollowup(id); load(); }
        catch { Alert.alert('Error', 'Could not complete'); }
      }},
    ]);
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={items}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No follow-ups</Text>}
        renderItem={({ item }) => {
          const overdue = !item.completed && isOverdue(item.followupDueDate);
          return (
            <View style={[styles.card, overdue && { borderLeftWidth: 3, borderLeftColor: '#dc2626' }]}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{item.medicationName}</Text>
                  <Text style={styles.sub}>Patient #{item.patientUserId} · Dr. #{item.doctorId}</Text>
                  {item.dosage && <Text style={styles.meta}>{item.dosage}{item.durationDays ? ` · ${item.durationDays} days` : ''}</Text>}
                </View>
                <View style={[styles.badge, { backgroundColor: item.completed ? '#dcfce7' : overdue ? '#fef2f2' : '#fefce8' }]}>
                  <Text style={[styles.badgeText, { color: item.completed ? '#16a34a' : overdue ? '#dc2626' : '#ca8a04' }]}>
                    {item.completed ? 'Done' : overdue ? 'Overdue' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>Due: {new Date(item.followupDueDate).toLocaleDateString()}</Text>
              {!item.completed && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => complete(item.id)}>
                  <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>Mark Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  completeBtn: { marginTop: 8, paddingVertical: 7, backgroundColor: '#f0fdf4', borderRadius: 8, alignItems: 'center' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
