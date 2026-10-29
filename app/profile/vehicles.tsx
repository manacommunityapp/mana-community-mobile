import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Switch, Modal, TextInput, ScrollView,
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

const EMPTY_FORM: RegisterVehicleRequest = {
  plateNumber: '', vehicleType: 'CAR', make: '', model: '', color: '',
};

export default function VehiclesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<RegisterVehicleRequest>(EMPTY_FORM);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'remove' | 'toggle'; item: VehicleRegistration } | null>(null);
  const [formErr, setFormErr] = useState('');
  const [mutErr, setMutErr] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const { data: raw, isLoading } = useQuery<VehicleRegistration[]>({
    queryKey: ['vehicles', 'my-vehicles'],
    queryFn: () => vehicleRegistrationService.getMyVehicles(),
    staleTime: 30_000,
  });
  const vehicles = raw ?? [];

  const registerMutation = useMutation({
    mutationFn: (data: RegisterVehicleRequest) => vehicleRegistrationService.registerVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setForm(EMPTY_FORM);
      setFormErr('');
      setRegSuccess('Vehicle registered. Enable Gate Auto-Entry to allow ANPR-based access.');
      setTimeout(() => { setShowAdd(false); setRegSuccess(''); }, 2000);
    },
    onError: (err: any) => setFormErr(err.message || 'Failed to register vehicle.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => vehicleRegistrationService.removeVehicle(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicles'] }); setConfirmAction(null); },
    onError: (err: any) => { setMutErr(err.message || 'Failed to remove vehicle.'); setConfirmAction(null); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      vehicleRegistrationService.toggleGateWhitelist(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setTogglingId(null);
      setConfirmAction(null);
    },
    onError: (err: any) => { setMutErr(err.message || 'Failed to update gate whitelist.'); setTogglingId(null); setConfirmAction(null); },
  });

  const handleToggle = (item: VehicleRegistration) => setConfirmAction({ type: 'toggle', item });
  const handleRemove = (item: VehicleRegistration) => setConfirmAction({ type: 'remove', item });

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'remove') {
      removeMutation.mutate(confirmAction.item.id);
    } else {
      const enabling = !confirmAction.item.isGateWhitelisted;
      setTogglingId(confirmAction.item.id);
      toggleMutation.mutate({ id: confirmAction.item.id, enabled: enabling });
    }
  };

  const handleSubmit = () => {
    if (!form.plateNumber.trim()) { setFormErr('Please enter the plate number.'); return; }
    setFormErr('');
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

      {/* Mutation error banner */}
      {!!mutErr && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setMutErr('')}>
            <View style={s.errBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
              <Text style={s.errBannerText}>{mutErr}</Text>
              <TouchableOpacity onPress={() => setMutErr('')} hitSlop={8}>
                <Ionicons name="close" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Inline confirm modal */}
      <Modal visible={!!confirmAction} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setConfirmAction(null)}>
          <View style={s.confirmSheet}>
            <Text style={s.confirmTitle}>
              {confirmAction?.type === 'remove'
                ? 'Remove Vehicle?'
                : confirmAction?.item.isGateWhitelisted ? 'Disable Gate Auto-Entry?' : 'Enable Gate Auto-Entry?'}
            </Text>
            <Text style={s.confirmMsg}>
              {confirmAction?.type === 'remove'
                ? `Remove ${confirmAction?.item.plateNumber} from your registered vehicles?`
                : confirmAction?.item.isGateWhitelisted
                  ? `${confirmAction?.item.plateNumber} will no longer get automatic gate entry.`
                  : `${confirmAction?.item.plateNumber} will be automatically allowed in via ANPR plate scan.`}
            </Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.confirmCancel} onPress={() => setConfirmAction(null)}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmOk, confirmAction?.type === 'remove' && s.confirmOkRed]}
                onPress={handleConfirm}
                disabled={removeMutation.isPending || toggleMutation.isPending}
              >
                {(removeMutation.isPending || toggleMutation.isPending)
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.confirmOkText}>
                      {confirmAction?.type === 'remove' ? 'Remove' : confirmAction?.item.isGateWhitelisted ? 'Disable' : 'Enable'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
            {!!regSuccess && (
              <View style={s.successBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={s.successBannerText}>{regSuccess}</Text>
              </View>
            )}
            {!!formErr && (
              <View style={s.inlineErr}>
                <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                <Text style={s.inlineErrText}>{formErr}</Text>
              </View>
            )}
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
  confirmSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, gap: SPACING.md },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  confirmMsg: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 18 },
  confirmBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  confirmCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold' },
  confirmOk: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: '#2563EB' },
  confirmOkRed: { backgroundColor: '#DC2626' },
  confirmOkText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
  errBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', margin: SPACING.md, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: 'auto' as any },
  errBannerText: { flex: 1, fontSize: 13, color: '#DC2626', fontFamily: 'DMSans-Regular' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  successBannerText: { flex: 1, fontSize: 13, color: '#065F46', fontFamily: 'DMSans-Medium', fontWeight: '600' },
  inlineErr: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  inlineErrText: { flex: 1, fontSize: 12, color: '#DC2626', fontFamily: 'DMSans-Regular', lineHeight: 17 },
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
