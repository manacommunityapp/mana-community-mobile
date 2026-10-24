/**
 * Vendor Khata Home — Khatabook-style digital ledger for vendors.
 * Lists all customers & suppliers with their running balance.
 * Inspired by Khatabook: per-party khata, "You Gave / You Got" model,
 * receivables vs. payables summary, WhatsApp reminders.
 */
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  khatabookService,
  KhataParty,
  CreatePartyDto,
} from '@/services/khatabookService';

const PARTY_TYPE_OPTIONS: { label: string; value: KhataParty['type'] }[] = [
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Supplier', value: 'SUPPLIER' },
];

function fmt(n: number) {
  return '₹' + Math.abs(n).toLocaleString('en-IN');
}

function PartyCard({ party, onPress }: { party: KhataParty; onPress: () => void }) {
  const isReceivable = party.balance > 0;
  const isPayable = party.balance < 0;
  const isZero = party.balance === 0;

  return (
    <TouchableOpacity style={s.partyCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.avatar, { backgroundColor: party.avatarColor + '22' }]}>
        <Text style={[s.avatarText, { color: party.avatarColor }]}>{party.avatarInitials}</Text>
      </View>

      <View style={s.partyInfo}>
        <Text style={s.partyName} numberOfLines={1}>{party.name}</Text>
        <Text style={s.partyMeta}>{party.phone} · {party.type}</Text>
        <Text style={s.partyDate}>Last: {new Date(party.lastActivity).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
      </View>

      <View style={s.balanceBox}>
        {isZero ? (
          <Text style={s.balanceZero}>Settled</Text>
        ) : (
          <>
            <Text style={[s.balanceAmount, isReceivable ? s.receivableColor : s.payableColor]}>
              {fmt(party.balance)}
            </Text>
            <Text style={[s.balanceLabel, isReceivable ? s.receivableColor : s.payableColor]}>
              {isReceivable ? 'Will Get' : 'Will Give'}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function VendorKhataHome() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [addVisible, setAddVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add party form
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<KhataParty['type']>('CUSTOMER');
  const [newNotes, setNewNotes] = useState('');

  const { data: parties = [], isLoading: loadingParties, refetch } = useQuery({
    queryKey: ['vendor-khata-parties'],
    queryFn: khatabookService.getVendorParties,
  });

  const { data: stats } = useQuery({
    queryKey: ['vendor-khata-stats'],
    queryFn: khatabookService.getVendorStats,
  });

  const addPartyMutation = useMutation({
    mutationFn: (dto: CreatePartyDto) => khatabookService.addVendorParty(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-khata-parties'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-khata-stats'] });
      setAddVisible(false);
      resetForm();
    },
    onError: () => Alert.alert('Error', 'Could not add party. Try again.'),
  });

  const resetForm = () => {
    setNewName('');
    setNewPhone('');
    setNewType('CUSTOMER');
    setNewNotes('');
  };

  const handleAdd = () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Required', 'Enter name and phone number.');
      return;
    }
    addPartyMutation.mutate({ name: newName.trim(), phone: newPhone.trim(), type: newType, notes: newNotes.trim() || undefined });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const filtered = useMemo(() => {
    let list = parties;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.phone.includes(q));
    }
    if (filter === 'RECEIVABLE') list = list.filter(p => p.balance > 0);
    if (filter === 'PAYABLE') list = list.filter(p => p.balance < 0);
    return list.slice().sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [parties, search, filter]);

  return (
    <View style={s.container}>
      {/* ── Top Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs/feed' as any)}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>My Khata Book</Text>
          <Text style={s.headerSub}>Vendor Ledger & Credit Accounts</Text>
        </View>
        <TouchableOpacity
          style={s.headerIconBtn}
          onPress={() => router.push('/vendor-finance/reports' as any)}
        >
          <Ionicons name="bar-chart-outline" size={18} color={THEME.brandDark} />
        </TouchableOpacity>
      </View>

      {/* ── Stats Banner ── */}
      <View style={s.statsBanner}>
        <View style={s.statItem}>
          <Text style={s.statLabel}>Will Get</Text>
          <Text style={[s.statValue, { color: THEME.brandDark }]}>
            {fmt(stats?.totalReceivable ?? 0)}
          </Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statLabel}>Will Give</Text>
          <Text style={[s.statValue, { color: THEME.lossDark }]}>
            {fmt(stats?.totalPayable ?? 0)}
          </Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statItem}>
          <Text style={s.statLabel}>Parties</Text>
          <Text style={[s.statValue, { color: THEME.textPrimary }]}>
            {stats?.partiesWithBalance ?? parties.length}
          </Text>
        </View>
      </View>

      {/* ── Search + Filter ── */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={THEME.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name or phone..."
            placeholderTextColor={THEME.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={THEME.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.addFab} onPress={() => setAddVisible(true)}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Filter Pills ── */}
      <View style={s.filterRow}>
        {(['ALL', 'RECEIVABLE', 'PAYABLE'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterPill, filter === f && s.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterPillText, filter === f && s.filterPillTextActive]}>
              {f === 'ALL' ? 'All' : f === 'RECEIVABLE' ? '▲ Will Get' : '▼ Will Give'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Party List ── */}
      <ScrollView
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.brand]} />}
        showsVerticalScrollIndicator={false}
      >
        {loadingParties ? (
          <ActivityIndicator size="large" color={THEME.brand} style={{ marginTop: 48 }} />
        ) : filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="book-outline" size={52} color={THEME.border} />
            <Text style={s.emptyTitle}>No Entries Yet</Text>
            <Text style={s.emptySub}>Add a customer or supplier to start tracking credit.</Text>
            <TouchableOpacity style={s.emptyAddBtn} onPress={() => setAddVisible(true)}>
              <Ionicons name="add-circle-outline" size={16} color={THEME.brandDark} />
              <Text style={s.emptyAddBtnText}>Add First Party</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {filtered.map((party, idx) => (
              <View key={party.id}>
                <PartyCard
                  party={party}
                  onPress={() => router.push({ pathname: '/vendor-finance/khata', params: { partyId: party.id } } as any)}
                />
                {idx < filtered.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add Party Modal ── */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>Add to Khata Book</Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Name *</Text>
            <TextInput
              style={s.field}
              placeholder="Customer or supplier name"
              placeholderTextColor={THEME.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={s.fieldLabel}>Phone Number *</Text>
            <TextInput
              style={s.field}
              placeholder="10-digit mobile number"
              placeholderTextColor={THEME.textMuted}
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />

            <Text style={s.fieldLabel}>Type</Text>
            <View style={s.typeRow}>
              {PARTY_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.typeChip, newType === opt.value && s.typeChipActive]}
                  onPress={() => setNewType(opt.value)}
                >
                  <Text style={[s.typeChipText, newType === opt.value && s.typeChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[s.field, { height: 60 }]}
              placeholder="e.g. Monthly AC service provider"
              placeholderTextColor={THEME.textMuted}
              multiline
              value={newNotes}
              onChangeText={setNewNotes}
            />

            <TouchableOpacity
              style={s.saveBtn}
              onPress={handleAdd}
              disabled={addPartyMutation.isPending}
            >
              {addPartyMutation.isPending
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.saveBtnText}>Add to Khata</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  headerSub: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.brandLight,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  statValue: { fontSize: 16, fontWeight: '800', marginTop: 2, fontFamily: FONTS.semiBold, fontVariant: ['tabular-nums'] },
  statDivider: { width: 1, backgroundColor: THEME.border, marginHorizontal: 8 },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.surface,
    borderRadius: 10, borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, color: THEME.textPrimary },
  addFab: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: THEME.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: THEME.border,
    backgroundColor: THEME.surface,
  },
  filterPillActive: { backgroundColor: THEME.brandLight, borderColor: THEME.brandBorder },
  filterPillText: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary },
  filterPillTextActive: { color: THEME.brandDark },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  partyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.card,
    marginBottom: 8,
  },
  divider: { height: 0 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', fontFamily: FONTS.semiBold },
  partyInfo: { flex: 1, gap: 2 },
  partyName: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  partyMeta: { fontSize: 11.5, color: THEME.textSecondary },
  partyDate: { fontSize: 10.5, color: THEME.textMuted },
  balanceBox: { alignItems: 'flex-end' },
  balanceAmount: { fontSize: 15, fontWeight: '800', fontFamily: FONTS.semiBold, fontVariant: ['tabular-nums'] },
  balanceLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  balanceZero: { fontSize: 12, color: THEME.textMuted, fontWeight: '600' },
  receivableColor: { color: THEME.brandDark },
  payableColor: { color: THEME.lossDark },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
  emptySub: { fontSize: 13, color: THEME.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 12, backgroundColor: THEME.brandLight, borderRadius: 10 },
  emptyAddBtnText: { fontSize: 13, fontWeight: '700', color: THEME.brandDark },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 4,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 12 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary, marginTop: 10, marginBottom: 4 },
  field: {
    backgroundColor: THEME.surfaceSubtle,
    borderWidth: 1, borderColor: THEME.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: THEME.textPrimary,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: THEME.border,
    backgroundColor: THEME.surfaceMuted, alignItems: 'center',
  },
  typeChipActive: { backgroundColor: THEME.brandLight, borderColor: THEME.brandBorder },
  typeChipText: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary },
  typeChipTextActive: { color: THEME.brandDark },
  saveBtn: {
    backgroundColor: THEME.brand,
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
