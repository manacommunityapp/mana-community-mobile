import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sportsOpsService, OpenPlaySession } from '../../services/sportsOpsService';

export default function OpenPlayScreen() {
  const [sessions, setSessions] = useState<OpenPlaySession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSessions(await sportsOpsService.listOpenSessions()); }
    catch { Alert.alert('Error', 'Failed to load sessions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const join = (id: number, sport: string) => {
    Alert.alert('Join Session', `Join ${sport} session?`, [
      { text: 'Cancel' },
      { text: 'Join', onPress: async () => {
        try { await sportsOpsService.joinSession(id); Alert.alert('Joined!', 'You have joined the session.'); load(); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Could not join'); }
      }},
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={sessions}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No open sessions</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{item.sport}</Text>
                <Text style={styles.sub}>{item.sessionDate} · {item.startTime}–{item.endTime}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.badgeText, { color: '#16a34a' }]}>OPEN</Text>
              </View>
            </View>
            <View style={styles.row}>
              <Ionicons name="people-outline" size={14} color="#64748b" />
              <Text style={styles.meta}> {item.minPlayers}–{item.maxPlayers} players · {item.skillLevel || 'Open'}</Text>
            </View>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            <TouchableOpacity style={styles.joinBtn} onPress={() => join(item.id, item.sport)}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Join Session</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  meta: { fontSize: 13, color: '#64748b' },
  notes: { fontSize: 13, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  joinBtn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 4 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 15 },
});
