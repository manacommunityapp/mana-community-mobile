import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, BackHandler,
  KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  amcService, type AmcRecord, type AmcScope, type AmcCategory,
  type CreateAmcRequest, AMC_CATEGORY_META,
} from '@/services/amcService';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';

type Tab = 'PERSONAL' | 'SOCIETY';

const PERSONAL_CATS: AmcCategory[] = [
  'AC', 'REFRIGERATOR', 'WASHING_MACHINE', 'TV', 'WATER_HEATER',
  'MICROWAVE', 'DISHWASHER', 'INVERTER', 'OTHER',
];
const SOCIETY_CATS: AmcCategory[] = [
  'ELEVATOR', 'GENERATOR', 'PEST_CONTROL', 'CCTV', 'FIRE_SAFETY',
  'WATER_TANK', 'PUMP', 'OTHER',
];

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const BLANK: Omit<CreateAmcRequest, 'scope'> = {
  itemName: '', brand: '', model: '', serialNumber: '',
  category: 'OTHER', purchaseDate: '', warrantyExpiry: '',
  amcStartDate: '', amcExpiry: '', amcVendor: '', amcPhone: '',
  amcAmount: undefined, notes: '',
};

export default function AmcScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('PERSONAL');

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<AmcRecord | null>(null);
  const [form, setForm] = useState<Omit<CreateAmcRequest, 'scope'>>(BLANK);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<AmcRecord | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/home');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
      return () => sub.remove();
    }, [goBack])
  );

  const { data: records = [], isLoading, refetch } = useQuery<AmcRecord[]>({
    queryKey: ['amc', tab],
    queryFn: () => amcService.getRecords(tab as AmcScope),
  });

  const saveMutation = useMutation({
    mutationFn: (data: CreateAmcRequest) =>
      editRecord
        ? amcService.updateRecord(editRecord.id, data)
        : amcService.createRecord(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['amc'] });
      closeForm();
    },
    onError: (err: any) => setFormError(err?.message || 'Failed to save.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => amcService.deleteRecord(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['amc'] });
      setDeleteConfirm(null);
    },
    onError: (err: any) => setFormError(err?.message || 'Failed to delete.'),
  });

  const openAdd = () => {
    setEditRecord(null);
    setForm({ ...BLANK, category: tab === 'SOCIETY' ? 'ELEVATOR' : 'AC' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (rec: AmcRecord) => {
    setEditRecord(rec);
    setForm({
      itemName: rec.itemName, brand: rec.brand ?? '', model: rec.model ?? '',
      serialNumber: rec.serialNumber ?? '', category: rec.category,
      purchaseDate: rec.purchaseDate ?? '', warrantyExpiry: rec.warrantyExpiry ?? '',
      amcStartDate: rec.amcStartDate ?? '', amcExpiry: rec.amcExpiry ?? '',
      amcVendor: rec.amcVendor ?? '', amcPhone: rec.amcPhone ?? '',
      amcAmount: rec.amcAmount, notes: rec.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditRecord(null);
    setForm(BLANK);
    setFormError('');
  };

  const handleSave = () => {
    if (!form.itemName.trim()) { setFormError('Item name is required.'); return; }
    setFormError('');
    saveMutation.mutate({ ...form, scope: tab });
  };

  const expiringSoon = records.filter((r) => {
    const wDays = amcService.daysUntil(r.warrantyExpiry);
    const aDays = amcService.daysUntil(r.amcExpiry);
    const min = [wDays, aDays].filter((d): d is number => d !== null).reduce((a, b) => Math.min(a, b), Infinity);
    return min !== Infinity && min <= 30;
  });

  const cats = tab === 'PERSONAL' ? PERSONAL_CATS : SOCIETY_CATS;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>AMC & Warranty</Text>
          <Text style={s.headerSub}>Track appliance warranties and service contracts</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} hitSlop={8}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['PERSONAL', 'SOCIETY'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, tab === t && s.tabActive]}
            onPress={() => setTab(t)}
          >
            <Ionicons
              name={t === 'PERSONAL' ? 'home-outline' : 'business-outline'}
              size={15}
              color={tab === t ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'PERSONAL' ? 'My Appliances' : 'Society Contracts'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Expiry alerts */}
        {expiringSoon.length > 0 && (
          <View style={s.alertBanner}>
            <Ionicons name="warning" size={18} color="#92400E" />
            <Text style={s.alertText}>
              {expiringSoon.length} item{expiringSoon.length > 1 ? 's' : ''} expiring within 30 days
            </Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : records.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>{tab === 'PERSONAL' ? '🏠' : '🏢'}</Text>
            <Text style={s.emptyTitle}>No {tab === 'PERSONAL' ? 'appliances' : 'contracts'} tracked yet</Text>
            <Text style={s.emptySub}>
              {tab === 'PERSONAL'
                ? 'Add your ACs, fridges, and other appliances to track warranty and AMC expiry.'
                : 'Add society-level contracts like elevator, pest control, and generator AMCs.'}
            </Text>
            <TouchableOpacity style={s.emptyAddBtn} onPress={openAdd}>
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={s.emptyAddBtnText}>Add First Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          records.map((rec) => <AmcCard key={rec.id} rec={rec} onEdit={openEdit} onDelete={setDeleteConfirm} />)
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Add / Edit modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={closeForm}>
        <TouchableOpacity style={s.overlay} onPress={closeForm} activeOpacity={1} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.sheetTitle}>{editRecord ? 'Edit Item' : 'Add Item'}</Text>

              {formError ? (
                <View style={s.formError}>
                  <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                  <Text style={s.formErrorText}>{formError}</Text>
                </View>
              ) : null}

              <FormLabel>Category</FormLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2 }}>
                  {cats.map((c) => {
                    const meta = AMC_CATEGORY_META[c];
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[s.catChip, form.category === c && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                        onPress={() => setForm((f) => ({ ...f, category: c }))}
                      >
                        <Text style={s.catChipEmoji}>{meta.icon}</Text>
                        <Text style={[s.catChipText, form.category === c && { color: '#fff' }]}>{meta.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <FormLabel>Item Name *</FormLabel>
              <TextInput
                style={s.input}
                placeholder="e.g. Bedroom AC Unit 1"
                placeholderTextColor={COLORS.textMuted}
                value={form.itemName}
                onChangeText={(v) => setForm((f) => ({ ...f, itemName: v }))}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FormLabel>Brand</FormLabel>
                  <TextInput style={s.input} placeholder="e.g. Daikin" placeholderTextColor={COLORS.textMuted}
                    value={form.brand} onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormLabel>Model</FormLabel>
                  <TextInput style={s.input} placeholder="e.g. FTKF35TV" placeholderTextColor={COLORS.textMuted}
                    value={form.model} onChangeText={(v) => setForm((f) => ({ ...f, model: v }))} />
                </View>
              </View>

              <FormLabel>Purchase Date</FormLabel>
              <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted}
                value={form.purchaseDate} onChangeText={(v) => setForm((f) => ({ ...f, purchaseDate: v }))} />

              <FormLabel>Warranty Expiry</FormLabel>
              <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted}
                value={form.warrantyExpiry} onChangeText={(v) => setForm((f) => ({ ...f, warrantyExpiry: v }))} />

              <FormLabel>AMC Start Date</FormLabel>
              <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted}
                value={form.amcStartDate} onChangeText={(v) => setForm((f) => ({ ...f, amcStartDate: v }))} />

              <FormLabel>AMC Expiry</FormLabel>
              <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted}
                value={form.amcExpiry} onChangeText={(v) => setForm((f) => ({ ...f, amcExpiry: v }))} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 2 }}>
                  <FormLabel>AMC Vendor</FormLabel>
                  <TextInput style={s.input} placeholder="Vendor name" placeholderTextColor={COLORS.textMuted}
                    value={form.amcVendor} onChangeText={(v) => setForm((f) => ({ ...f, amcVendor: v }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormLabel>AMC Amount ₹</FormLabel>
                  <TextInput style={s.input} placeholder="5000" keyboardType="numeric"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.amcAmount != null ? String(form.amcAmount) : ''}
                    onChangeText={(v) => setForm((f) => ({ ...f, amcAmount: v ? Number(v) : undefined }))} />
                </View>
              </View>

              <FormLabel>Vendor Phone</FormLabel>
              <TextInput style={s.input} placeholder="9876543210" keyboardType="phone-pad"
                placeholderTextColor={COLORS.textMuted}
                value={form.amcPhone} onChangeText={(v) => setForm((f) => ({ ...f, amcPhone: v }))} />

              <FormLabel>Notes</FormLabel>
              <TextInput style={[s.input, { height: 64, textAlignVertical: 'top' }]}
                placeholder="Any notes or serial number..." multiline
                placeholderTextColor={COLORS.textMuted}
                value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} />

              <TouchableOpacity
                style={[s.saveBtn, saveMutation.isPending && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.saveBtnText}>{editRecord ? 'Save Changes' : 'Add Item'}</Text>
                }
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirm */}
      <Modal visible={!!deleteConfirm} animationType="slide" transparent onRequestClose={() => setDeleteConfirm(null)}>
        <TouchableOpacity style={s.overlay} onPress={() => setDeleteConfirm(null)} activeOpacity={1} />
        <View style={s.confirmSheet}>
          <View style={s.sheetHandle} />
          <Text style={s.confirmTitle}>Remove Item?</Text>
          <Text style={s.confirmSub}>Remove <Text style={{ fontWeight: '800' }}>{deleteConfirm?.itemName}</Text> from your tracker?</Text>
          <TouchableOpacity
            style={[s.deleteBtn, deleteMutation.isPending && { opacity: 0.7 }]}
            onPress={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.deleteBtnText}>Remove</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={() => setDeleteConfirm(null)}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FormLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.formLabel}>{children}</Text>;
}

function AmcCard({
  rec, onEdit, onDelete,
}: {
  rec: AmcRecord;
  onEdit: (r: AmcRecord) => void;
  onDelete: (r: AmcRecord) => void;
}) {
  const meta = AMC_CATEGORY_META[rec.category] ?? AMC_CATEGORY_META.OTHER;
  const wDays = amcService.daysUntil(rec.warrantyExpiry);
  const aDays = amcService.daysUntil(rec.amcExpiry);
  const wStatus = amcService.getExpiryStatus(wDays);
  const aStatus = amcService.getExpiryStatus(aDays);
  const minDays = [wDays, aDays].filter((d): d is number => d !== null).reduce((a, b) => Math.min(a, b), Infinity);
  const isUrgent = minDays !== Infinity && minDays <= 30;

  return (
    <View style={[s.card, isUrgent && s.cardUrgent]}>
      <View style={s.cardHeader}>
        <View style={[s.cardIcon, { backgroundColor: meta.color + '18' }]}>
          <Text style={{ fontSize: 22 }}>{meta.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{rec.itemName}</Text>
          <Text style={s.cardMeta}>
            {meta.label}{rec.brand ? ` · ${rec.brand}` : ''}{rec.model ? ` ${rec.model}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={s.editBtn} onPress={() => onEdit(rec)} hitSlop={8}>
          <Ionicons name="pencil" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.editBtn} onPress={() => onDelete(rec)} hitSlop={8}>
          <Ionicons name="trash-outline" size={14} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View style={s.cardDates}>
        {rec.warrantyExpiry && (
          <View style={s.dateChip}>
            <Ionicons name="shield-checkmark-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.dateChipLabel}>Warranty</Text>
            <View style={[s.expiryBadge, { backgroundColor: wStatus.bg }]}>
              <Text style={[s.expiryBadgeText, { color: wStatus.color }]}>{wStatus.label}</Text>
            </View>
            <Text style={s.dateChipValue}>{fmt(rec.warrantyExpiry)}</Text>
          </View>
        )}
        {rec.amcExpiry && (
          <View style={s.dateChip}>
            <Ionicons name="build-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.dateChipLabel}>AMC</Text>
            <View style={[s.expiryBadge, { backgroundColor: aStatus.bg }]}>
              <Text style={[s.expiryBadgeText, { color: aStatus.color }]}>{aStatus.label}</Text>
            </View>
            <Text style={s.dateChipValue}>{fmt(rec.amcExpiry)}</Text>
          </View>
        )}
        {!rec.warrantyExpiry && !rec.amcExpiry && (
          <Text style={s.noDateText}>No expiry dates set</Text>
        )}
      </View>

      {(rec.amcVendor || rec.amcPhone) && (
        <View style={s.vendorRow}>
          <Ionicons name="business-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.vendorText}>{rec.amcVendor}</Text>
          {rec.amcPhone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${rec.amcPhone}`)} hitSlop={8}>
              <View style={s.callBtn}>
                <Ionicons name="call-outline" size={12} color={COLORS.primary} />
                <Text style={s.callBtnText}>{rec.amcPhone}</Text>
              </View>
            </TouchableOpacity>
          )}
          {rec.amcAmount && (
            <Text style={s.amountText}>₹{rec.amcAmount.toLocaleString('en-IN')}/yr</Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub:   { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13,
  },
  tabActive:     { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabText:       { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },
  tabTextActive: { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  scroll:       { padding: SPACING.md, gap: SPACING.sm },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: '#FCD34D',
    marginBottom: 4,
  },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#92400E' },

  empty:       { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 10 },
  emptyEmoji:  { fontSize: 52 },
  emptyTitle:  { fontSize: 17, fontWeight: '800', color: COLORS.text },
  emptySub:    { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingHorizontal: 20, paddingVertical: 11, marginTop: 8,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.md, gap: 10,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardUrgent: { borderColor: '#FCA5A5' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName:   { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  cardMeta:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  editBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },

  cardDates:   { gap: 6 },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  dateChipLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, width: 52 },
  dateChipValue: { fontSize: 11, color: COLORS.textSecondary, flex: 1, textAlign: 'right' },
  expiryBadge:   { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  expiryBadgeText: { fontSize: 10, fontWeight: '700' },
  noDateText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 6 },

  vendorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8,
  },
  vendorText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  callBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  amountText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  // Overlay / sheets
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: 40, maxHeight: '92%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },

  formError: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.md,
    padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  formErrorText: { flex: 1, fontSize: 13, color: '#DC2626' },

  formLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, marginTop: 8 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 11,
    fontSize: 14, color: COLORS.text, backgroundColor: COLORS.background,
    marginBottom: 2,
  },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.surface,
  },
  catChipEmoji: { fontSize: 14 },
  catChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  confirmSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: 36, gap: 12,
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  confirmSub:   { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  deleteBtn: {
    backgroundColor: '#DC2626', borderRadius: RADIUS.lg,
    paddingVertical: 14, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  cancelBtn:   { backgroundColor: '#F1F5F9', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
});
