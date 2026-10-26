import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS } from '@/constants/config';
import { vehicleCareService, VehicleProfile, VehicleType } from '@/services/vehicleCareService';

const VEHICLE_TYPES: { value: VehicleType; label: string; emoji: string }[] = [
  { value: 'CAR', label: 'Car', emoji: '🚗' },
  { value: 'BIKE', label: 'Bike / Scooter', emoji: '🛵' },
  { value: 'SUV', label: 'SUV', emoji: '🚙' },
  { value: 'TRUCK', label: 'Truck / Van', emoji: '🚐' },
];

const MAKES = ['Maruti', 'Hyundai', 'Tata', 'Honda', 'Toyota', 'Mahindra', 'Kia', 'MG', 'Other'];

interface VehicleFormState {
  nickname: string;
  type: VehicleType;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
}

const EMPTY_FORM: VehicleFormState = {
  nickname: '', type: 'CAR', make: '', model: '', color: '', plateNumber: '',
};

function typeEmoji(type: VehicleType): string {
  const t = VEHICLE_TYPES.find(vt => vt.value === type);
  return t?.emoji ?? '🚗';
}

export default function VehiclesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<VehicleProfile | null>(null);
  const [form, setForm] = useState<VehicleFormState>(EMPTY_FORM);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vc-vehicles'],
    queryFn: vehicleCareService.getMyVehicles,
  });

  const addMutation = useMutation({
    mutationFn: (data: Omit<VehicleProfile, 'id'>) => vehicleCareService.addVehicle(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vc-vehicles'] });
      closeModal();
    },
    onError: () => Alert.alert('Error', 'Could not save vehicle. Please try again.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VehicleProfile> }) =>
      vehicleCareService.updateVehicle(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vc-vehicles'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicleCareService.deleteVehicle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vc-vehicles'] }),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => vehicleCareService.setDefaultVehicle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vc-vehicles'] }),
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(v: VehicleProfile) {
    setEditing(v);
    setForm({ nickname: v.nickname, type: v.type, make: v.make, model: v.model, color: v.color, plateNumber: v.plateNumber });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function handleSave() {
    if (!form.nickname.trim() || !form.make.trim() || !form.model.trim() || !form.plateNumber.trim()) {
      Alert.alert('Required Fields', 'Please fill in nickname, make, model and plate number.');
      return;
    }
    const emoji = typeEmoji(form.type);
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { ...form, imageEmoji: emoji } });
    } else {
      addMutation.mutate({ ...form, isDefault: vehicles.length === 0, imageEmoji: emoji });
    }
  }

  function confirmDelete(v: VehicleProfile) {
    Alert.alert('Remove Vehicle', `Remove "${v.nickname}" from your profile?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(v.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <Text style={styles.emptyText}>Loading vehicles…</Text>
        )}
        {!isLoading && vehicles.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🚗</Text>
            <Text style={styles.emptyTitle}>No vehicles yet</Text>
            <Text style={styles.emptyText}>Add your car or bike to get started.</Text>
            <TouchableOpacity onPress={openAdd} style={styles.addFirstBtn}>
              <Text style={styles.addFirstText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
        {vehicles.map(v => (
          <View key={v.id} style={styles.vehicleCard}>
            <View style={styles.vehicleIconBox}>
              <Text style={{ fontSize: 32 }}>{v.imageEmoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.vehicleTopRow}>
                <Text style={styles.vehicleNick}>{v.nickname}</Text>
                {v.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                )}
              </View>
              <Text style={styles.vehicleMakeModel}>{v.make} {v.model}</Text>
              <Text style={styles.vehiclePlate}>🪪 {v.plateNumber}</Text>
              <Text style={styles.vehicleColor}>🎨 {v.color}</Text>
            </View>
            <View style={styles.vehicleActions}>
              {!v.isDefault && (
                <TouchableOpacity onPress={() => defaultMutation.mutate(v.id)} style={styles.actionBtn}>
                  <Ionicons name="star-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => openEdit(v)} style={styles.actionBtn}>
                <Ionicons name="pencil-outline" size={18} color="#64748B" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(v)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {/* Type selector */}
            <Text style={styles.fieldLabel}>Vehicle Type</Text>
            <View style={styles.typeRow}>
              {VEHICLE_TYPES.map(vt => (
                <TouchableOpacity
                  key={vt.value}
                  onPress={() => setForm(f => ({ ...f, type: vt.value }))}
                  style={[styles.typeBtn, form.type === vt.value && styles.typeBtnActive]}
                >
                  <Text style={{ fontSize: 20 }}>{vt.emoji}</Text>
                  <Text style={[styles.typeBtnLabel, form.type === vt.value && styles.typeBtnLabelActive]}>
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Nickname</Text>
            <TextInput
              style={styles.input}
              value={form.nickname}
              onChangeText={v => setForm(f => ({ ...f, nickname: v }))}
              placeholder="e.g. My Swift, Family Car"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Make (Brand)</Text>
            <View style={styles.chipsRow}>
              {MAKES.map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setForm(f => ({ ...f, make: m }))}
                  style={[styles.chip, form.make === m && styles.chipActive]}
                >
                  <Text style={[styles.chipText, form.make === m && styles.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              value={form.make}
              onChangeText={v => setForm(f => ({ ...f, make: v }))}
              placeholder="Or type make…"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Model</Text>
            <TextInput
              style={styles.input}
              value={form.model}
              onChangeText={v => setForm(f => ({ ...f, model: v }))}
              placeholder="e.g. Swift, Activa 6G"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Colour</Text>
            <TextInput
              style={styles.input}
              value={form.color}
              onChangeText={v => setForm(f => ({ ...f, color: v }))}
              placeholder="e.g. Red, Pearl White"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Registration Number</Text>
            <TextInput
              style={[styles.input, styles.plateInput]}
              value={form.plateNumber}
              onChangeText={v => setForm(f => ({ ...f, plateNumber: v.toUpperCase() }))}
              placeholder="TS 09 AB 1234"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />
            <Text style={styles.plateNote}>Used by your vehicle-care provider to identify your vehicle.</Text>
            <View style={{ height: 32 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 6 },
  scroll: { padding: 16, gap: 12 },
  emptyBox: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 6 },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20 },
  addFirstBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  addFirstText: { fontFamily: FONTS.semiBold, fontSize: 15, color: '#fff' },

  vehicleCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12, ...SHADOWS.card },
  vehicleIconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  vehicleTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleNick: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  defaultBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontFamily: FONTS.semiBold, fontSize: 11, color: COLORS.primary },
  vehicleMakeModel: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#374151', marginTop: 2 },
  vehiclePlate: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  vehicleColor: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B' },
  vehicleActions: { justifyContent: 'space-around' },
  actionBtn: { padding: 6 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
  saveText: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primary },
  modalScroll: { padding: 20, gap: 4 },
  fieldLabel: { fontFamily: FONTS.semiBold, fontSize: 13, color: '#374151', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONTS.regular, fontSize: 15, color: COLORS.text, backgroundColor: '#F8FAFC' },
  plateInput: { fontFamily: FONTS.bold, letterSpacing: 2 },
  plateNote: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: { flex: 1, minWidth: '22%', borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', padding: 10, alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC' },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  typeBtnLabel: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#64748B' },
  typeBtnLabelActive: { color: COLORS.primary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  chipText: { fontFamily: FONTS.regular, fontSize: 13, color: '#64748B' },
  chipTextActive: { fontFamily: FONTS.semiBold, color: COLORS.primary },
});
