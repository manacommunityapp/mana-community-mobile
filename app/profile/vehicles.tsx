import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, Switch, Modal, TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  vehicleRegistrationService,
  VehicleRegistration,
  VehicleType,
  RegisterVehicleRequest,
} from '@/services/vehicleRegistrationService';

const VEHICLE_META: Record<VehicleType, { emoji: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  CAR:     { emoji: '🚗', icon: 'car-outline',        label: 'Car'     },
  BIKE:    { emoji: '🏍️', icon: 'bicycle-outline',    label: 'Bike'    },
  SCOOTER: { emoji: '🛵', icon: 'bicycle-outline',    label: 'Scooter' },
  SUV:     { emoji: '🚙', icon: 'car-sport-outline',  label: 'SUV'     },
  TRUCK:   { emoji: '🚛', icon: 'bus-outline',        label: 'Truck'   },
  OTHER:   { emoji: '🚘', icon: 'car-outline',        label: 'Other'   },
};

const VEHICLE_TYPES: VehicleType[] = ['CAR', 'BIKE', 'SCOOTER', 'SUV', 'TRUCK', 'OTHER'];

const MOCK_VEHICLES: VehicleRegistration[] = [
  {
    id: 1,
    plateNumber: 'KA-04-MN-7788',
    vehicleType: 'CAR',
    make: 'Maruti',
    model: 'Swift',
    color: 'White',
    isGateWhitelisted: true,
    status: 'ACTIVE',
    registeredAt: new Date().toISOString(),
    flatNumber: 'Tower A-1204',
  },
  {
    id: 2,
    plateNumber: 'KA-04-AB-5566',
    vehicleType: 'BIKE',
    make: 'Honda',
    model: 'Activa',
    color: 'Black',
    isGateWhitelisted: false,
    status: 'ACTIVE',
    registeredAt: new Date().toISOString(),
    flatNumber: 'Tower A-1204',
  },
];

const EMPTY_FORM: RegisterVehicleRequest = {
  plateNumber: '', vehicleType: 'CAR', make: '', model: '', color: '',
};

export default function VehiclesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<RegisterVehicleRequest>(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const { data: raw, isLoading } = useQuery<VehicleRegistration[]>({
    queryKey: ['vehicles', 'my-vehicles'],
    queryFn: () => vehicleRegistrationService.getMyVehicles(),
    staleTime: 30_000,
  });
  const vehicles = raw && raw.length > 0 ? raw : MOCK_VEHICLES;

  const registerMutation = useMutation({
    mutationFn: (data: RegisterVehicleRequest) => vehicleRegistrationService.registerVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      Alert.alert('Vehicle Registered', 'Your vehicle has been added. Enable Gate Auto-Entry to allow ANPR-based access.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => vehicleRegistrationService.removeVehicle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      vehicleRegistrationService.toggleGateWhitelist(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setTogglingId(null);
    },
    onError: (err: any) => { Alert.alert('Error', err.message); setTogglingId(null); },
  });

  const handleToggle = (item: VehicleRegistration) => {
    const enabling = !item.isGateWhitelisted;
    Alert.alert(
      enabling ? 'Enable Gate Auto-Entry?' : 'Disable Gate Auto-Entry?',
      enabling
        ? `${item.plateNumber} will be automatically allowed in via ANPR plate scan.`
        : `${item.plateNumber} will no longer get automatic gate entry.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: enabling ? 'Enable' : 'Disable',
          onPress: () => {
            setTogglingId(item.id);
            toggleMutation.mutate({ id: item.id, enabled: enabling });
          },
        },
      ]
    );
  };

  const handleRemove = (item: VehicleRegistration) => {
    Alert.alert(
      'Remove Vehicle?',
      `Remove ${item.plateNumber} from your registered vehicles?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(item.id) },
      ]
    );
  };

  const handleSubmit = () => {
    if (!form.plateNumber.trim()) { Alert.alert('Required', 'Please enter the plate number.'); return; }
    registerMutation.mutate({ ...form, plateNumber: form.plateNumber.toUpperCase().trim() });
  };

  const renderItem = ({ item }: { item: VehicleRegistration }) => {
    const meta = VEHICLE_META[item.vehicleType] ?? VEHICLE_META.OTHER;
    const isToggling = togglingId === item.id;

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={s.vehicleEmoji}>
            <Text style={s.emojiText}>{meta.emoji}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.plateNumber}>{item.plateNumber}</Text>
            <Text style={s.vehicleDetail}>
              {[item.make, item.model, item.color].filter(Boolean).join(' · ') || meta.label}
            </Text>
            <View style={[s.statusBadge, item.status === 'ACTIVE' ? s.badgeActive : s.badgeInactive]}>
              <Text style={[s.statusText, item.status === 'ACTIVE' ? s.statusTextActive : s.statusTextInactive]}>
                {item.status}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={8} style={s.removeBtn}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View style={s.whitelistRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.whitelistLabel}>Gate Auto-Entry (ANPR)</Text>
            <Text style={s.whitelistSub}>
              {item.isGateWhitelisted ? '✅ Barrier opens automatically on entry' : 'Disabled — guard manually opens gate'}
            </Text>
          </View>
          {isToggling ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Switch
              value={item.isGateWhitelisted}
              onValueChange={() => handleToggle(item)}
              trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
              thumbColor={item.isGateWhitelisted ? '#2563EB' : '#94A3B8'}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Vehicles</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={s.addBtn} hitSlop={8}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
        <Text style={s.infoText}>Registered vehicles get automatic gate entry via ANPR plate scan.</Text>
      </View>

      {isLoading ? (
        <View style={s.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="car-outline" size={52} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No vehicles registered</Text>
              <Text style={s.emptySub}>Register your vehicles for seamless gate entry via ANPR.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
                <Text style={s.emptyBtnText}>Register Vehicle</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add vehicle modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Register Vehicle</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Plate Number *</Text>
              <TextInput
                style={s.input}
                placeholder="KA-01-AB-1234"
                placeholderTextColor={COLORS.textMuted}
                value={form.plateNumber}
                onChangeText={v => setForm(f => ({ ...f, plateNumber: v.toUpperCase() }))}
                autoCapitalize="characters"
              />

              <Text style={s.label}>Vehicle Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                  {VEHICLE_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[s.typeChip, form.vehicleType === t && s.typeChipActive]}
                      onPress={() => setForm(f => ({ ...f, vehicleType: t }))}
                    >
                      <Text style={s.typeChipEmoji}>{VEHICLE_META[t].emoji}</Text>
                      <Text style={[s.typeChipText, form.vehicleType === t && s.typeChipTextActive]}>
                        {VEHICLE_META[t].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {[
                { key: 'make',  label: 'Make',  placeholder: 'e.g. Maruti' },
                { key: 'model', label: 'Model', placeholder: 'e.g. Swift' },
                { key: 'color', label: 'Color', placeholder: 'e.g. White' },
              ].map(field => (
                <View key={field.key}>
                  <Text style={s.label}>{field.label}</Text>
                  <TextInput
                    style={[s.input, { marginBottom: SPACING.md }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    value={(form as any)[field.key]}
                    onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                  />
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[s.submitBtn, registerMutation.isPending && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>Register Vehicle</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, ...SHADOWS.sm },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#DBEAFE', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  infoText: { flex: 1, fontSize: 12, color: '#1E40AF', fontFamily: 'DMSans-Regular', lineHeight: 17 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },

  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  vehicleEmoji: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  emojiText: { fontSize: 24 },
  plateNumber: { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '900', color: COLORS.text, letterSpacing: 0.5 },
  vehicleDetail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginTop: 4 },
  badgeActive: { backgroundColor: '#D1FAE5' },
  badgeInactive: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  statusTextActive: { color: '#059669' },
  statusTextInactive: { color: '#6B7280' },
  removeBtn: { padding: 6 },

  whitelistRow: { flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: 'rgba(99,102,241,0.1)' },
  whitelistLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  whitelistSub: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, fontFamily: 'DMSans-Regular', lineHeight: 18 },
  emptyBtn: { marginTop: SPACING.md, backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.md, ...SHADOWS.sm },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', marginBottom: SPACING.md },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  typeChipActive: { backgroundColor: '#DBEAFE', borderColor: '#2563EB' },
  typeChipEmoji: { fontSize: 16 },
  typeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  typeChipTextActive: { color: '#2563EB', fontFamily: 'Outfit-Bold', fontWeight: '700' },
  submitBtn: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.sm, ...SHADOWS.sm },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
});
