import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  Modal, TextInput, ScrollView, ActivityIndicator, Alert,
  RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { communityOpsService, DigitalPassDto, PassType, CreatePassRequest } from '@/services/communityOpsService';

const PASS_TYPES: { value: PassType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'DELIVERY',       label: 'Delivery',       icon: 'cube-outline' },
  { value: 'DOMESTIC_WORKER',label: 'Domestic Worker',icon: 'home-outline' },
  { value: 'GUEST',          label: 'Guest',          icon: 'person-outline' },
  { value: 'VEHICLE',        label: 'Vehicle',        icon: 'car-outline' },
  { value: 'CONTRACTOR',     label: 'Contractor',     icon: 'construct-outline' },
];

const STATUS_COLORS: Record<DigitalPassDto['status'], string> = {
  ACTIVE: '#059669', USED: '#6B7280', EXPIRED: '#D97706', REVOKED: '#DC2626',
};

function PassCard({ pass, onRevoke }: { pass: DigitalPassDto; onRevoke: () => void }) {
  const meta = PASS_TYPES.find(t => t.value === pass.passType);
  const isActive = pass.status === 'ACTIVE';
  return (
    <View style={[styles.card, !isActive && styles.cardDimmed]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Ionicons name={meta?.icon ?? 'qr-code-outline'} size={22} color="#2563EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.passType}>{meta?.label ?? pass.passType}</Text>
          {pass.visitorName && <Text style={styles.passName}>{pass.visitorName}</Text>}
          {pass.vehicleNumber && <Text style={styles.passSub}>Vehicle: {pass.vehicleNumber}</Text>}
          {pass.purpose && <Text style={styles.passSub}>{pass.purpose}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[pass.status]}18` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[pass.status] }]}>{pass.status}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        {isActive && (
          <Image
            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${pass.token}` }}
            style={styles.qr}
            resizeMode="contain"
          />
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.validUntil}>Valid until: {new Date(pass.validUntil).toLocaleString()}</Text>
          {isActive && (
            <TouchableOpacity style={styles.revokeBtn} onPress={onRevoke}>
              <Text style={styles.revokeBtnText}>Revoke</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function PassesScreen() {
  const [passes, setPasses] = useState<DigitalPassDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreatePassRequest>({ passType: 'GUEST' });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try { setPasses(await communityOpsService.getMyPasses()); } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, []);

  React.useEffect(() => { load(); }, []);

  const handleRevoke = (id: number) => {
    Alert.alert('Revoke Pass', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        try { await communityOpsService.revokePass(id); load(); } catch (e: any) {
          Alert.alert('Error', e?.response?.data?.message ?? 'Failed');
        }
      }},
    ]);
  };

  const handleCreate = async () => {
    if (!form.passType) return;
    setCreating(true);
    try {
      await communityOpsService.createPass(form);
      setShowCreate(false);
      setForm({ passType: 'GUEST' });
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Failed to create pass');
    } finally { setCreating(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Digital Passes</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2563EB" />
      ) : (
        <FlatList
          data={passes}
          keyExtractor={p => String(p.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListEmptyComponent={<Text style={styles.empty}>No passes yet. Tap + to create one.</Text>}
          renderItem={({ item }) => <PassCard pass={item} onRevoke={() => handleRevoke(item.id)} />}
        />
      )}

      {/* Create pass modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Pass</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Pass Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {PASS_TYPES.map(pt => (
                  <TouchableOpacity
                    key={pt.value}
                    style={[styles.chip, form.passType === pt.value && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, passType: pt.value }))}
                  >
                    <Text style={[styles.chipText, form.passType === pt.value && styles.chipTextActive]}>{pt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.label}>Visitor Name</Text>
              <TextInput style={styles.input} value={form.visitorName ?? ''} onChangeText={v => setForm(f => ({ ...f, visitorName: v }))} placeholder="e.g. John Delivery" placeholderTextColor="#9CA3AF" />
              <Text style={styles.label}>Vehicle Number (optional)</Text>
              <TextInput style={styles.input} value={form.vehicleNumber ?? ''} onChangeText={v => setForm(f => ({ ...f, vehicleNumber: v }))} placeholder="e.g. MH12AB1234" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
              <Text style={styles.label}>Purpose (optional)</Text>
              <TextInput style={styles.input} value={form.purpose ?? ''} onChangeText={v => setForm(f => ({ ...f, purpose: v }))} placeholder="e.g. Groceries delivery" placeholderTextColor="#9CA3AF" />
              <TouchableOpacity style={[styles.submitBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Generate Pass</Text>}
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
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3 },
  cardDimmed: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  passType: { fontSize: 15, fontWeight: '700', color: '#111827' },
  passName: { fontSize: 13, color: '#374151', marginTop: 2 },
  passSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardBody: { marginTop: 12 },
  qr: { width: 160, height: 160, alignSelf: 'center', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  validUntil: { fontSize: 12, color: '#6B7280' },
  revokeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FEE2E2' },
  revokeBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  chipRow: { flexDirection: 'row' },
  chip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
