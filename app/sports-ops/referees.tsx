import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sportsOpsService, RefereeAssignment } from '../../services/sportsOpsService';

export default function RefereesScreen() {
  const [assignments, setAssignments] = useState<RefereeAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    sportsOpsService.myRefereeAssignments()
      .then(setAssignments)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const confirm = async (id: number) => {
    try {
      await sportsOpsService.confirmReferee(id);
      setAssignments(prev => prev.map(a => a.id === id ? { ...a, confirmed: true, confirmedAt: new Date().toISOString() } : a));
    } catch {
      Alert.alert('Error', 'Failed to confirm assignment.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.heading}>Referee Assignments</Text>
      {assignments.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTxt}>No referee assignments.</Text></View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={a => String(a.id)}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: a }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{a.sport} · {a.eventType}</Text>
                <Text style={styles.cardSub}>Event #{a.eventId}</Text>
                {a.fee != null && <Text style={styles.fee}>Fee: ₹{a.fee}</Text>}
                {a.notes && <Text style={styles.notes}>{a.notes}</Text>}
              </View>
              {a.confirmed ? (
                <View style={styles.confirmedBadge}><Text style={styles.confirmedTxt}>Confirmed</Text></View>
              ) : (
                <TouchableOpacity style={styles.confirmBtn} onPress={() => confirm(a.id)}>
                  <Text style={styles.confirmTxt}>Confirm</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 22, fontWeight: '800', color: '#0f172a', padding: 20, paddingBottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { color: '#94a3b8', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  fee: { fontSize: 13, color: '#2563eb', marginTop: 2, fontWeight: '600' },
  notes: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  confirmedBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  confirmedTxt: { color: '#16a34a', fontWeight: '700', fontSize: 12 },
  confirmBtn: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
