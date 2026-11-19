import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentsService, BillReminder } from '../../services/paymentsService';

export default function BillReminders() {
  const [reminders, setReminders] = useState<BillReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    paymentsService.listReminders().then(setReminders).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const markPaid = (id: number, name: string) => {
    Alert.alert('Mark as Paid', `Mark "${name}" as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => paymentsService.markReminderPaid(id).then(load).catch(() => Alert.alert('Error', 'Could not update')) },
    ]);
  };

  const isOverdue = (r: BillReminder) => !r.paid && new Date(r.dueDate) < new Date();

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#f59e0b" />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={reminders}
        keyExtractor={r => String(r.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No bill reminders</Text>}
        renderItem={({ item: r }) => {
          const overdue = isOverdue(r);
          return (
            <View style={[styles.card, overdue && styles.overdueCard]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{r.billerName}</Text>
                <Text style={styles.type}>{r.billType}{r.amount ? ` · ₹${r.amount}` : ''}</Text>
                <Text style={[styles.due, overdue && { color: '#dc2626' }]}>
                  Due: {new Date(r.dueDate).toLocaleDateString()}{overdue ? ' ⚠ OVERDUE' : ''}
                </Text>
              </View>
              <View style={styles.actions}>
                <View style={[styles.badge, { backgroundColor: r.paid ? '#dcfce7' : overdue ? '#fef2f2' : '#fefce8' }]}>
                  <Text style={[styles.badgeText, { color: r.paid ? '#16a34a' : overdue ? '#dc2626' : '#ca8a04' }]}>{r.paid ? 'Paid' : overdue ? 'Overdue' : 'Pending'}</Text>
                </View>
                {!r.paid && (
                  <TouchableOpacity style={styles.paidBtn} onPress={() => markPaid(r.id, r.billerName)}>
                    <Text style={styles.paidBtnText}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  overdueCard: { borderColor: '#fca5a5' },
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  type: { fontSize: 13, color: '#64748b', marginTop: 2 },
  due: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  actions: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  paidBtn: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  paidBtnText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
