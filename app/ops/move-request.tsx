import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert,
  RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { communityOpsService, MoveRequestDto, CreateMoveRequest } from '@/services/communityOpsService';

const STATUS_META: Record<MoveRequestDto['status'], { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PENDING:   { label: 'Pending',   color: '#D97706', icon: 'time-outline' },
  APPROVED:  { label: 'Approved',  color: '#059669', icon: 'checkmark-circle-outline' },
  REJECTED:  { label: 'Rejected',  color: '#DC2626', icon: 'close-circle-outline' },
  COMPLETED: { label: 'Completed', color: '#6B7280', icon: 'flag-outline' },
};

function MoveCard({ req }: { req: MoveRequestDto }) {
  const meta = STATUS_META[req.status];
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.iconWrap, { backgroundColor: req.moveType === 'MOVE_IN' ? '#D1FAE5' : '#FEE2E2' }]}>
          <Ionicons
            name={req.moveType === 'MOVE_IN' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'}
            size={24}
            color={req.moveType === 'MOVE_IN' ? '#059669' : '#DC2626'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.moveType}>{req.moveType === 'MOVE_IN' ? 'Move In' : 'Move Out'}</Text>
          <Text style={styles.meta}>Planned: {new Date(req.plannedDate).toLocaleDateString()}</Text>
          {req.moversCompany && <Text style={styles.meta}>Movers: {req.moversCompany}</Text>}
          {req.vehicleNumber && <Text style={styles.meta}>Vehicle: {req.vehicleNumber}</Text>}
        </View>
        <View style={[styles.badge, { backgroundColor: `${meta.color}18` }]}>
          <Ionicons name={meta.icon} size={13} color={meta.color} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
      {req.status === 'APPROVED' && (
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Checklist</Text>
          {['Lift booking confirmed', 'Entry pass generated', 'Security notified', 'Parking slot reserved'].map(item => (
            <View key={item} style={styles.checkItem}>
              <Ionicons name="checkbox-outline" size={16} color="#059669" />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function MoveRequestScreen() {
  const [requests, setRequests] = useState<MoveRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateMoveRequest>({ moveType: 'MOVE_IN', plannedDate: '' });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try { setRequests(await communityOpsService.getMyMoveRequests()); } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.plannedDate.trim()) { Alert.alert('Required', 'Please enter a planned date (YYYY-MM-DD)'); return; }
    setCreating(true);
    try {
      await communityOpsService.createMoveRequest(form);
      setShowCreate(false);
      setForm({ moveType: 'MOVE_IN', plannedDate: '' });
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to submit request');
    } finally { setCreating(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Move Requests</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563EB" />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={<Text style={styles.empty}>No move requests yet.</Text>}
          renderItem={({ item }) => <MoveCard req={item} />}
        />
      )}

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Move Request</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Move Type</Text>
              <View style={styles.typeRow}>
                {(['MOVE_IN', 'MOVE_OUT'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, form.moveType === t && styles.typeBtnActive]}
                    onPress={() => setForm(f => ({ ...f, moveType: t }))}
                  >
                    <Text style={[styles.typeBtnText, form.moveType === t && styles.typeBtnTextActive]}>
                      {t === 'MOVE_IN' ? '↓ Move In' : '↑ Move Out'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Planned Date *</Text>
              <TextInput style={styles.input} value={form.plannedDate} onChangeText={v => setForm(f => ({ ...f, plannedDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#9CA3AF" keyboardType="numbers-and-punctuation" />
              <Text style={styles.label}>Vehicle Number</Text>
              <TextInput style={styles.input} value={form.vehicleNumber ?? ''} onChangeText={v => setForm(f => ({ ...f, vehicleNumber: v }))} placeholder="e.g. MH12AB1234" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
              <Text style={styles.label}>Movers Company</Text>
              <TextInput style={styles.input} value={form.moversCompany ?? ''} onChangeText={v => setForm(f => ({ ...f, moversCompany: v }))} placeholder="e.g. Agarwal Packers" placeholderTextColor="#9CA3AF" />
              <Text style={styles.label}>Contact Number</Text>
              <TextInput style={styles.input} value={form.contactNumber ?? ''} onChangeText={v => setForm(f => ({ ...f, contactNumber: v }))} placeholder="e.g. 9876543210" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
              <TouchableOpacity style={[styles.submitBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  moveType: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  checklist: { marginTop: 14, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 10 },
  checklistTitle: { fontSize: 12, fontWeight: '700', color: '#059669', marginBottom: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checkText: { fontSize: 13, color: '#374151' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeBtnTextActive: { color: '#fff' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
