import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  householdService,
  HouseholdSnapshot,
} from '@/services/householdService';
import type { FamilyMemberType } from '@/services/familyService';
import type { VehicleType } from '@/services/vehicleRegistrationService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const RELATION_OPTIONS: { value: FamilyMemberType; label: string }[] = [
  { value: 'SPOUSE', label: 'Spouse' },
  { value: 'CHILD', label: 'Child' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER', label: 'Other' },
];

const VEHICLE_OPTIONS: { value: VehicleType; label: string; icon: IoniconsName }[] = [
  { value: 'CAR', label: 'Car', icon: 'car-outline' },
  { value: 'BIKE', label: 'Bike', icon: 'bicycle-outline' },
  { value: 'SCOOTER', label: 'Scooter', icon: 'bicycle-outline' },
  { value: 'SUV', label: 'SUV', icon: 'car-sport-outline' },
  { value: 'TRUCK', label: 'Truck', icon: 'bus-outline' },
  { value: 'OTHER', label: 'Other', icon: 'car-outline' },
];

const OWNERSHIP_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  TENANT: 'Tenant',
  UNKNOWN: '—',
};

export default function HouseholdScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [memberModal, setMemberModal] = useState(false);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', phone: '', relation: 'SPOUSE' as FamilyMemberType });
  const [vehicleForm, setVehicleForm] = useState({ plateNumber: '', vehicleType: 'CAR' as VehicleType, make: '', color: '' });

  const { data, isLoading, refetch } = useQuery<HouseholdSnapshot>({
    queryKey: ['household', 'snapshot'],
    queryFn: () => householdService.getSnapshot(),
    staleTime: 30_000,
  });

  const addMemberMut = useMutation({
    mutationFn: () => householdService.addMember({ name: memberForm.name, phone: memberForm.phone || undefined, relation: memberForm.relation }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['household'] }); setMemberModal(false); setMemberForm({ name: '', phone: '', relation: 'SPOUSE' }); },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Could not add member'),
  });

  const removeMemberMut = useMutation({
    mutationFn: (id: number) => householdService.removeMember(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['household'] }),
    onError: (e: any) => Alert.alert('Error', e?.message || 'Could not remove member'),
  });

  const addVehicleMut = useMutation({
    mutationFn: () => householdService.addVehicle({ plateNumber: vehicleForm.plateNumber, vehicleType: vehicleForm.vehicleType, make: vehicleForm.make || undefined, color: vehicleForm.color || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['household'] }); setVehicleModal(false); setVehicleForm({ plateNumber: '', vehicleType: 'CAR', make: '', color: '' }); },
    onError: (e: any) => Alert.alert('Error', e?.message || 'Could not add vehicle'),
  });

  const removeVehicleMut = useMutation({
    mutationFn: (id: number) => householdService.removeVehicle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['household'] }),
    onError: (e: any) => Alert.alert('Error', e?.message || 'Could not remove vehicle'),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  const unit = data?.unit;
  const members = data?.members ?? [];
  const vehicles = data?.vehicles ?? [];

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Flat Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Flat / Unit</Text>
          <View style={s.card}>
            <Row icon="home-outline" label="Unit" value={unit?.unitNumber ?? '—'} />
            {unit?.block ? <Row icon="business-outline" label="Block / Tower" value={unit.block} /> : null}
            <Row icon="key-outline" label="Ownership" value={OWNERSHIP_LABEL[unit?.ownershipType ?? 'UNKNOWN']} />
            <Row icon="person-outline" label="Resident" value={unit?.residentName || '—'} last />
          </View>
        </View>

        {/* Family Members */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Family Members</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setMemberModal(true)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          {members.length === 0 ? (
            <Text style={s.empty}>No family members registered yet.</Text>
          ) : (
            <View style={s.card}>
              {members.map((m, i) => (
                <View key={m.id} style={[s.memberRow, i < members.length - 1 && s.memberBorder]}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{m.name}</Text>
                    <Text style={s.memberRelation}>{m.relation}</Text>
                  </View>
                  {!m.isEmergencyContact && (
                    <TouchableOpacity
                      style={s.removeBtn}
                      onPress={() => Alert.alert('Remove Member', `Remove ${m.name}?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => removeMemberMut.mutate(m.id) },
                      ])}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.error ?? '#EF4444'} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Vehicles */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Vehicles</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setVehicleModal(true)}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          {vehicles.length === 0 ? (
            <Text style={s.empty}>No vehicles registered yet.</Text>
          ) : (
            <View style={s.card}>
              {vehicles.map((v, i) => (
                <View key={v.id} style={[s.memberRow, i < vehicles.length - 1 && s.memberBorder]}>
                  <View style={[s.avatar, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="car-outline" size={20} color="#0284C7" />
                  </View>
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{v.plateNumber}</Text>
                    <Text style={s.memberRelation}>{v.vehicleType}{v.make ? ` · ${v.make}` : ''}{v.color ? ` · ${v.color}` : ''}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.removeBtn}
                    onPress={() => Alert.alert('Remove Vehicle', `Remove ${v.plateNumber}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeVehicleMut.mutate(v.id) },
                    ])}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.error ?? '#EF4444'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={memberModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Add Family Member</Text>
            <Text style={s.inputLabel}>Full Name *</Text>
            <TextInput style={s.input} value={memberForm.name} onChangeText={v => setMemberForm(f => ({ ...f, name: v }))} placeholder="e.g. Priya Sharma" placeholderTextColor={THEME.textMuted} />
            <Text style={s.inputLabel}>Phone (optional)</Text>
            <TextInput style={s.input} value={memberForm.phone} onChangeText={v => setMemberForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" placeholder="10-digit mobile" placeholderTextColor={THEME.textMuted} />
            <Text style={s.inputLabel}>Relation</Text>
            <View style={s.pills}>
              {RELATION_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={[s.pill, memberForm.relation === opt.value && s.pillActive]} onPress={() => setMemberForm(f => ({ ...f, relation: opt.value }))}>
                  <Text style={[s.pillText, memberForm.relation === opt.value && s.pillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setMemberModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, !memberForm.name.trim() && s.submitDisabled]} disabled={!memberForm.name.trim() || addMemberMut.isPending} onPress={() => addMemberMut.mutate()}>
                {addMemberMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Add Member</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal visible={vehicleModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Add Vehicle</Text>
            <Text style={s.inputLabel}>Plate Number *</Text>
            <TextInput style={[s.input, { textTransform: 'uppercase' }]} value={vehicleForm.plateNumber} onChangeText={v => setVehicleForm(f => ({ ...f, plateNumber: v.toUpperCase() }))} placeholder="e.g. KA01AB1234" placeholderTextColor={THEME.textMuted} autoCapitalize="characters" />
            <Text style={s.inputLabel}>Vehicle Type</Text>
            <View style={s.pills}>
              {VEHICLE_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} style={[s.pill, vehicleForm.vehicleType === opt.value && s.pillActive]} onPress={() => setVehicleForm(f => ({ ...f, vehicleType: opt.value }))}>
                  <Text style={[s.pillText, vehicleForm.vehicleType === opt.value && s.pillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.inputLabel}>Make / Brand (optional)</Text>
            <TextInput style={s.input} value={vehicleForm.make} onChangeText={v => setVehicleForm(f => ({ ...f, make: v }))} placeholder="e.g. Honda, Maruti" placeholderTextColor={THEME.textMuted} />
            <Text style={s.inputLabel}>Color (optional)</Text>
            <TextInput style={s.input} value={vehicleForm.color} onChangeText={v => setVehicleForm(f => ({ ...f, color: v }))} placeholder="e.g. White" placeholderTextColor={THEME.textMuted} />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setVehicleModal(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.submitBtn, !vehicleForm.plateNumber.trim() && s.submitDisabled]} disabled={!vehicleForm.plateNumber.trim() || addVehicleMut.isPending} onPress={() => addVehicleMut.mutate()}>
                {addVehicleMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitText}>Add Vehicle</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, last }: { icon: IoniconsName; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.infoRow, !last && s.infoBorder]}>
      <Ionicons name={icon} size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.background },
  scroll: { padding: SPACING.md, paddingBottom: 48 },
  section: { marginBottom: 20 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontFamily: FONTS.semiBold, color: THEME.text, marginBottom: 8 },
  card: { backgroundColor: THEME.card, borderRadius: RADIUS.md, ...SHADOWS.small },
  empty: { fontSize: 13, color: THEME.textMuted, fontStyle: 'italic', marginLeft: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 13, color: COLORS.primary, fontFamily: FONTS.semiBold },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
  infoLabel: { flex: 1, fontSize: 13, color: THEME.textMuted },
  infoValue: { fontSize: 13, fontFamily: FONTS.semiBold, color: THEME.text },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  memberBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight ?? '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: FONTS.semiBold, color: THEME.text },
  memberRelation: { fontSize: 12, color: THEME.textMuted, marginTop: 1 },
  removeBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: THEME.card, borderTopLeftRadius: RADIUS.xl ?? 20, borderTopRightRadius: RADIUS.xl ?? 20, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 17, fontFamily: FONTS.bold, color: THEME.text, marginBottom: 16 },
  inputLabel: { fontSize: 12, color: THEME.textMuted, fontFamily: FONTS.semiBold, marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: THEME.background, borderRadius: RADIUS.sm, padding: 12, fontSize: 14, color: THEME.text, borderWidth: 1, borderColor: THEME.border },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: THEME.border },
  pillActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight ?? '#EEF2FF' },
  pillText: { fontSize: 13, color: THEME.textMuted },
  pillTextActive: { color: COLORS.primary, fontFamily: FONTS.semiBold },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: THEME.border, alignItems: 'center' },
  cancelText: { fontSize: 14, color: THEME.textMuted, fontFamily: FONTS.semiBold },
  submitBtn: { flex: 2, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontSize: 14, color: '#fff', fontFamily: FONTS.bold },
});
