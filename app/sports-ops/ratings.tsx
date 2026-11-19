import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sportsOpsService, PlayerRating } from '../../services/sportsOpsService';

function Stars({ value }: { value: number }) {
  return (
    <Text style={{ fontSize: 16, color: '#f59e0b' }}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </Text>
  );
}

export default function RatingsScreen() {
  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [sport, setSport] = useState('');
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRatings(await sportsOpsService.listAllRatings()); }
    catch { Alert.alert('Error', 'Failed to load ratings'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!userId || !sport) return Alert.alert('Required', 'Please fill in User ID and Sport');
    try {
      await sportsOpsService.submitRating({ ratedUserId: Number(userId), sport, rating, comment });
      setShowModal(false);
      setUserId(''); setSport(''); setRating(3); setComment('');
      load();
    } catch { Alert.alert('Error', 'Could not submit rating'); }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={ratings}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>+ Rate a Player</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={<Text style={styles.empty}>No ratings yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.title}>User #{item.ratedUserId} · {item.sport}</Text>
                <Text style={styles.sub}>by User #{item.ratedBy}</Text>
              </View>
              <Stars value={item.rating} />
            </View>
            {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
          </View>
        )}
      />
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Rate a Player</Text>
            <TextInput placeholder="Player User ID" keyboardType="numeric" value={userId} onChangeText={setUserId} style={styles.input} />
            <TextInput placeholder="Sport" value={sport} onChangeText={setSport} style={styles.input} />
            <Text style={{ marginBottom: 6, color: '#475569' }}>Overall Rating</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Text style={{ fontSize: 28, color: s <= rating ? '#f59e0b' : '#d1d5db' }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput placeholder="Comment (optional)" value={comment} onChangeText={setComment} style={[styles.input, { height: 60 }]} multiline />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: '#2563eb' }]} onPress={submit}><Text style={{ color: '#fff', fontWeight: '700' }}>Submit</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: '#e2e8f0' }]} onPress={() => setShowModal(false)}><Text style={{ color: '#374151', fontWeight: '700' }}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  addBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 14 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  comment: { fontSize: 13, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, marginBottom: 12 },
  btn: { padding: 12, borderRadius: 10, alignItems: 'center' },
});
