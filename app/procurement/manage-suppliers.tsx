import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { SupplierProfile, ProcurementCategory, CreateSupplierPayload } from '@/types/procurement';

const VERIFICATION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  VERIFIED:  { bg: '#D1FAE5', text: '#065F46', label: '✓ Verified' },
  PENDING:   { bg: '#FEF3C7', text: '#92400E', label: '⏳ Pending' },
  REJECTED:  { bg: '#FEE2E2', text: '#991B1B', label: '✗ Rejected' },
  SUSPENDED: { bg: '#F3F4F6', text: '#374151', label: '⊘ Suspended' },
};

const CATEGORY_OPTIONS: ProcurementCategory[] = [
  'CLEANING_SUPPLIES', 'ELECTRICAL', 'PLUMBING', 'OFFICE_SUPPLIES',
  'GARDENING', 'SECURITY_EQUIPMENT', 'FURNITURE', 'IT_EQUIPMENT',
  'FOOD_BEVERAGE', 'MAINTENANCE', 'PACKAGING', 'OTHER',
];

function categoryLabel(c: string) {
  return c.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

type FilterTab = 'ALL' | 'PENDING' | 'VERIFIED';

interface AddForm {
  businessName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  gstNumber: string;
  address: string;
  city: string;
  pincode: string;
  categories: ProcurementCategory[];
  description: string;
}

const EMPTY_FORM: AddForm = {
  businessName: '', contactPerson: '', mobile: '', email: '',
  gstNumber: '', address: '', city: '', pincode: '',
  categories: [], description: '',
};

export default function ManageSuppliers() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterTab>('ALL');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(EMPTY_FORM);

  const { data: suppliers = [], isLoading, refetch } = useQuery<SupplierProfile[]>({
    queryKey: ['procurement-suppliers'],
    queryFn: () => procurementHubService.getSuppliers(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const createMut = useMutation({
    mutationFn: (payload: CreateSupplierPayload) => procurementHubService.createSupplier(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      Alert.alert('Supplier Added', 'Supplier profile created. Verify them once documents are checked.');
    },
    onError: () => Alert.alert('Error', 'Failed to add supplier. Please try again.'),
  });

  const verifyMut = useMutation({
    mutationFn: (id: number) => procurementHubService.verifySupplier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      Alert.alert('Verified', 'Supplier has been verified.');
    },
    onError: () => Alert.alert('Error', 'Verification failed.'),
  });

  const filtered = suppliers.filter(s => {
    if (filter === 'PENDING' && s.verificationStatus !== 'PENDING') return false;
    if (filter === 'VERIFIED' && s.verificationStatus !== 'VERIFIED') return false;
    if (search && !s.businessName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggleCategory(cat: ProcurementCategory) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter(c => c !== cat)
        : [...f.categories, cat],
    }));
  }

  function validateForm(): string | null {
    if (!form.businessName.trim()) return 'Business name is required';
    if (!form.mobile.trim()) return 'Mobile number is required';
    if (!form.city.trim()) return 'City is required';
    if (form.categories.length === 0) return 'Select at least one category';
    return null;
  }

  function handleSubmit() {
    const err = validateForm();
    if (err) { Alert.alert('Validation Error', err); return; }

    createMut.mutate({
      businessName: form.businessName.trim(),
      contactPerson: form.contactPerson.trim() || undefined,
      mobile: form.mobile.trim(),
      email: form.email.trim() || undefined,
      gstNumber: form.gstNumber.trim() || undefined,
      address: form.address.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      categories: form.categories.join(','),
      description: form.description.trim() || undefined,
    });
  }

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary || '#2563EB'} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Search suppliers…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Filter tabs */}
      <View style={s.tabRow}>
        {(['ALL', 'PENDING', 'VERIFIED'] as FilterTab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tab, filter === t && s.tabActive]}
            onPress={() => setFilter(t)}
          >
            <Text style={[s.tabText, filter === t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <Text style={s.summaryText}>
          {filtered.length} supplier{filtered.length !== 1 ? 's' : ''}
          {filter !== 'ALL' ? ` — ${filter.toLowerCase()}` : ''}
        </Text>
        <Text style={s.summaryText}>
          {suppliers.filter(s => s.verificationStatus === 'PENDING').length} awaiting verification
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏭</Text>
            <Text style={s.emptyText}>No suppliers found</Text>
            <Text style={s.emptySubText}>Tap Add to onboard your first supplier</Text>
          </View>
        )}
        {filtered.map(supplier => (
          <SupplierCard
            key={supplier.id}
            supplier={supplier}
            onVerify={() => {
              Alert.alert(
                'Verify Supplier',
                `Confirm verification of ${supplier.businessName}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Verify', onPress: () => verifyMut.mutate(supplier.id) },
                ],
              );
            }}
            onAddProduct={() => router.push(`/procurement/add-product?supplierId=${supplier.id}&supplierName=${encodeURIComponent(supplier.businessName)}` as any)}
          />
        ))}
      </ScrollView>

      {/* Add Supplier Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Add Supplier</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={createMut.isPending}>
              {createMut.isPending
                ? <ActivityIndicator size="small" color="#2563EB" />
                : <Text style={s.modalSave}>Save</Text>
              }
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={s.sectionLabel}>Business Details</Text>
            <Field label="Business Name *" value={form.businessName} onChangeText={t => setForm(f => ({ ...f, businessName: t }))} />
            <Field label="Contact Person" value={form.contactPerson} onChangeText={t => setForm(f => ({ ...f, contactPerson: t }))} />
            <Field label="Mobile *" value={form.mobile} onChangeText={t => setForm(f => ({ ...f, mobile: t }))} keyboardType="phone-pad" />
            <Field label="Email" value={form.email} onChangeText={t => setForm(f => ({ ...f, email: t }))} keyboardType="email-address" autoCapitalize="none" />
            <Field label="GST Number" value={form.gstNumber} onChangeText={t => setForm(f => ({ ...f, gstNumber: t }))} autoCapitalize="characters" />

            <Text style={s.sectionLabel}>Address</Text>
            <Field label="City *" value={form.city} onChangeText={t => setForm(f => ({ ...f, city: t }))} />
            <Field label="Pincode" value={form.pincode} onChangeText={t => setForm(f => ({ ...f, pincode: t }))} keyboardType="numeric" />
            <Field label="Full Address" value={form.address} onChangeText={t => setForm(f => ({ ...f, address: t }))} multiline />

            <Text style={s.sectionLabel}>Categories * (select all that apply)</Text>
            <View style={s.catGrid}>
              {CATEGORY_OPTIONS.map(cat => {
                const active = form.categories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.catChip, active && s.catChipActive]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Text style={[s.catChipText, active && s.catChipTextActive]}>
                      {categoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.sectionLabel}>Description</Text>
            <Field
              label="About the supplier"
              value={form.description}
              onChangeText={t => setForm(f => ({ ...f, description: t }))}
              multiline
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SupplierCard({
  supplier, onVerify, onAddProduct,
}: {
  supplier: SupplierProfile;
  onVerify: () => void;
  onAddProduct: () => void;
}) {
  const vs = VERIFICATION_COLORS[supplier.verificationStatus] ?? VERIFICATION_COLORS.PENDING;
  const cats = typeof supplier.categories === 'string'
    ? (supplier.categories as string).split(',').filter(Boolean)
    : Array.isArray(supplier.categories) ? supplier.categories : [];

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{supplier.businessName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle} numberOfLines={1}>{supplier.businessName}</Text>
            <View style={[s.badge, { backgroundColor: vs.bg }]}>
              <Text style={[s.badgeText, { color: vs.text }]}>{vs.label}</Text>
            </View>
          </View>
          <Text style={s.cardSub}>{supplier.contactPerson} · {supplier.mobile}</Text>
          <Text style={s.cardSub}>{supplier.city}{supplier.pincode ? ` — ${supplier.pincode}` : ''}</Text>
        </View>
      </View>

      {cats.length > 0 && (
        <View style={s.catRow}>
          {cats.slice(0, 3).map(c => (
            <View key={c} style={s.catPill}>
              <Text style={s.catPillText}>{categoryLabel(c)}</Text>
            </View>
          ))}
          {cats.length > 3 && (
            <Text style={s.catMore}>+{cats.length - 3}</Text>
          )}
        </View>
      )}

      {supplier.totalOrders > 0 && (
        <View style={s.metricsRow}>
          <Text style={s.metric}>⭐ {supplier.rating?.toFixed(1) ?? '—'}</Text>
          <Text style={s.metric}>📦 {supplier.totalOrders} orders</Text>
          <Text style={s.metric}>✓ {supplier.fulfillmentRate?.toFixed(0) ?? 100}% fulfilled</Text>
        </View>
      )}

      <View style={s.actionRow}>
        {supplier.verificationStatus === 'PENDING' && (
          <TouchableOpacity style={s.verifyBtn} onPress={onVerify}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
            <Text style={s.verifyBtnText}>Verify Supplier</Text>
          </TouchableOpacity>
        )}
        {supplier.verificationStatus === 'VERIFIED' && (
          <TouchableOpacity style={s.productBtn} onPress={onAddProduct}>
            <Ionicons name="add-circle-outline" size={15} color="#2563EB" />
            <Text style={s.productBtnText}>Add Product</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Field({
  label, value, onChangeText, multiline, keyboardType, autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  multiline?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.fieldInput, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  tabRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  tab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#1E3A5F' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 4,
  },
  summaryText: { fontSize: 12, color: '#6B7280' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubText: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  catPill: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  catPillText: { fontSize: 11, color: '#2563EB', fontWeight: '500' },
  catMore: { fontSize: 11, color: '#9CA3AF', paddingTop: 3 },
  metricsRow: { flexDirection: 'row', gap: 14, marginBottom: 8 },
  metric: { fontSize: 11, color: '#6B7280' },
  actionRow: { flexDirection: 'row', gap: 8 },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#059669', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F0FDF4',
  },
  verifyBtnText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  productBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#2563EB', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#EFF6FF',
  },
  productBtnText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalSave: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  modalBody: { padding: 16, gap: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 4 },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  fieldInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  catChipActive: { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' },
  catChipText: { fontSize: 12, color: '#374151' },
  catChipTextActive: { color: '#fff' },
});
