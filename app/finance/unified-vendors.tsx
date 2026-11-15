import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert, Platform,
  Modal, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  manaVendorMasterService,
  ManaVendor,
  CreateManaVendorRequest,
  UpdateManaVendorRequest,
} from '@/services/manaVendorMasterService';

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceFilter = 'ALL' | 'FINANCE' | 'PROCUREMENT' | 'MANUAL';

const MODULE_COLOR: Record<string, string> = {
  FINANCE:     THEME.indigo,
  PROCUREMENT: '#16A34A',
  MANUAL:      '#D97706',
};

// ─── Vendor Form Modal ────────────────────────────────────────────────────────

interface VendorFormProps {
  communityId: number;
  editing: ManaVendor | null;
  onClose: () => void;
  onSaved: () => void;
}

function VendorFormModal({ communityId, editing, onClose, onSaved }: VendorFormProps) {
  const [form, setForm] = useState<Partial<CreateManaVendorRequest>>({
    communityId,
    name:          editing?.name ?? '',
    contactPerson: editing?.contactPerson ?? '',
    email:         editing?.email ?? '',
    phone:         editing?.phone ?? '',
    gstin:         editing?.gstin ?? '',
    pan:           editing?.pan ?? '',
    address:       editing?.address ?? '',
    city:          editing?.city ?? '',
    state:         editing?.state ?? '',
    pincode:       editing?.pincode ?? '',
    bankDetails:   editing?.bankDetails ?? '',
    categories:    editing?.categories ?? '',
  });
  const [saving, setSaving] = useState(false);

  const field = (label: string, key: keyof typeof form, placeholder = '', keyboard: 'default' | 'email-address' | 'phone-pad' = 'default') => (
    <View style={f.fieldWrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={f.input}
        value={(form[key] as string) ?? ''}
        onChangeText={v => setForm(p => ({ ...p, [key]: v }))}
        placeholder={placeholder}
        placeholderTextColor={THEME.textMuted}
        keyboardType={keyboard}
        autoCapitalize="none"
      />
    </View>
  );

  const handleSave = async () => {
    if (!form.name?.trim()) {
      Alert.alert('Required', 'Vendor name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await manaVendorMasterService.update(communityId, editing.id, form as UpdateManaVendorRequest);
      } else {
        await manaVendorMasterService.create({ ...form, communityId } as CreateManaVendorRequest);
      }
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? 'Failed to save vendor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={f.overlay}
      >
        <View style={f.sheet}>
          <View style={f.handle} />
          <View style={f.headerRow}>
            <Text style={f.title}>{editing ? 'Edit Vendor' : 'New Vendor'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={THEME.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={f.section}>
              <Text style={f.sectionTitle}>Basic Info</Text>
              {field('Vendor Name *', 'name', 'e.g. Sharma & Co.')}
              {field('Contact Person', 'contactPerson')}
              {field('Email', 'email', 'email@example.com', 'email-address')}
              {field('Phone', 'phone', '+91 XXXXX XXXXX', 'phone-pad')}
            </View>

            <View style={f.section}>
              <Text style={f.sectionTitle}>Tax & Banking</Text>
              {field('GSTIN', 'gstin', '22AAAAA0000A1Z5')}
              {field('PAN', 'pan')}
              {field('Bank Details', 'bankDetails', 'Account no. / IFSC')}
              {field('Categories', 'categories', 'e.g. Electrical, Plumbing')}
            </View>

            <View style={f.section}>
              <Text style={f.sectionTitle}>Address</Text>
              {field('Street Address', 'address')}
              {field('City', 'city')}
              {field('State', 'state')}
              {field('Pincode', 'pincode', '600001', 'phone-pad')}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[f.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={f.saveBtnText}>{editing ? 'Update Vendor' : 'Create Vendor'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function UnifiedVendorsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const communityId = user?.communityId as number;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState<SourceFilter>('ALL');
  const [editing, setEditing] = useState<ManaVendor | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: vendors = [], isLoading, refetch } = useQuery({
    queryKey: ['mana-vendors', communityId],
    queryFn:  () => manaVendorMasterService.listActive(communityId),
    enabled:  !!communityId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleDeactivate = (v: ManaVendor) => {
    Alert.alert(
      'Deactivate Vendor',
      `Deactivate "${v.name}"? They will no longer appear in vendor pickers.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await manaVendorMasterService.deactivate(communityId, v.id);
              queryClient.invalidateQueries({ queryKey: ['mana-vendors', communityId] });
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to deactivate.');
            }
          },
        },
      ],
    );
  };

  const filtered = vendors.filter(v => {
    const matchModule = filterModule === 'ALL' || v.sourceModule === filterModule;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      v.name.toLowerCase().includes(q) ||
      (v.email ?? '').toLowerCase().includes(q) ||
      (v.gstin ?? '').toLowerCase().includes(q);
    return matchModule && matchSearch;
  });

  return (
    <View style={s.screen}>
      {/* Top Nav */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/tabs/feed'))}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.navTitle}>Vendor Master</Text>
          <Text style={s.navSub}>Unified across Finance & Procurement</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => setCreating(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search + Filter Row */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={THEME.textMuted} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email or GST…"
            placeholderTextColor={THEME.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {(['ALL', 'FINANCE', 'PROCUREMENT', 'MANUAL'] as SourceFilter[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[s.filterChip, filterModule === m && s.filterChipActive]}
                onPress={() => setFilterModule(m)}
              >
                <Text style={[s.filterChipText, filterModule === m && s.filterChipTextActive]}>
                  {m === 'ALL' ? 'All' : m.charAt(0) + m.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.brand]} />}
      >
        {isLoading ? (
          <ActivityIndicator color={THEME.brand} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="people-outline" size={42} color={THEME.textMuted} />
            <Text style={s.emptyTitle}>No vendors found</Text>
            <Text style={s.emptySub}>Add vendors to the master or change the search filter.</Text>
          </View>
        ) : (
          filtered.map(v => (
            <View key={v.id} style={s.vendorCard}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.vendorName}>{v.name}</Text>
                  {v.email && <Text style={s.vendorMeta}>{v.email}</Text>}
                  {v.phone && <Text style={s.vendorMeta}>{v.phone}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[s.sourceBadge, { borderColor: MODULE_COLOR[v.sourceModule] + '44' }]}>
                    <Text style={[s.sourceText, { color: MODULE_COLOR[v.sourceModule] }]}>
                      {v.sourceModule}
                    </Text>
                  </View>
                </View>
              </View>

              {v.gstin && (
                <View style={s.gstRow}>
                  <Ionicons name="id-card-outline" size={12} color={THEME.textMuted} />
                  <Text style={s.gstText}>GST: {v.gstin}</Text>
                </View>
              )}

              <View style={s.cardActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => setEditing(v)}>
                  <Ionicons name="create-outline" size={15} color={THEME.brandDark} />
                  <Text style={s.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, s.deactivateBtn]} onPress={() => handleDeactivate(v)}>
                  <Ionicons name="ban-outline" size={15} color={THEME.lossDark} />
                  <Text style={[s.actionBtnText, { color: THEME.lossDark }]}>Deactivate</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {(creating || editing) && (
        <VendorFormModal
          communityId={communityId}
          editing={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['mana-vendors', communityId] });
          }}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.background },
  topNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  navSub:   { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.indigo,
  },

  searchWrap: {
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.surfaceMuted, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: THEME.textPrimary, fontFamily: FONTS.regular },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1, borderColor: THEME.border,
  },
  filterChipActive: { backgroundColor: THEME.indigoLight, borderColor: THEME.indigo },
  filterChipText: { fontSize: 12, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  filterChipTextActive: { color: THEME.indigo },

  list: { padding: 14, gap: 10 },

  vendorCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: THEME.border,
    padding: 14, ...SHADOWS.card,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  vendorName: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  vendorMeta: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 2 },
  sourceBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    borderWidth: 1, backgroundColor: 'transparent',
  },
  sourceText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, fontFamily: FONTS.semiBold },

  gstRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  gstText: { fontSize: 11, color: THEME.textMuted, fontFamily: 'monospace' },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 7, borderRadius: 8,
    backgroundColor: THEME.brandLight, borderWidth: 1, borderColor: THEME.brandBorder,
  },
  deactivateBtn: { backgroundColor: THEME.lossLight, borderColor: THEME.lossBorder },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: THEME.brandDark, fontFamily: FONTS.semiBold },

  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  emptySub: { fontSize: 12, color: THEME.textSecondary, textAlign: 'center', fontFamily: FONTS.regular, paddingHorizontal: 24 },
});

// ─── Form styles ──────────────────────────────────────────────────────────────

const f = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', paddingHorizontal: 20, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: THEME.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: FONTS.semiBold, marginBottom: 10 },
  fieldWrap: { marginBottom: 10 },
  label: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.medium, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: THEME.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13, color: THEME.textPrimary, fontFamily: FONTS.regular,
    backgroundColor: THEME.surfaceMuted,
  },
  saveBtn: {
    backgroundColor: THEME.indigo, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
