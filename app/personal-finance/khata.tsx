/**
 * Personal Khata (Udhaar Book) — Khatabook-style personal lending ledger.
 * Track money lent to / borrowed from friends and family.
 * "I Gave" = money I lent out, "I Got" = repayment received.
 */
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl, Alert,
  Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SHADOWS, FONTS, COLORS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  khatabookService,
  KhataParty,
  KhataEntry,
  TransactionKind,
  CreatePartyDto,
} from '@/services/khatabookService';

function fmt(n: number) {
  return '₹' + Math.abs(n).toLocaleString('en-IN');
}

type DetailState = { partyId: string } | null;

function PartyCard({ party, onPress }: { party: KhataParty; onPress: () => void }) {
  const isLent = party.balance > 0;
  const isBorrowed = party.balance < 0;
  return (
    <TouchableOpacity style={s.partyCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.avatar, { backgroundColor: party.avatarColor + '22' }]}>
        <Text style={[s.avatarText, { color: party.avatarColor }]}>{party.avatarInitials}</Text>
      </View>
      <View style={s.partyInfo}>
        <Text style={s.partyName}>{party.name}</Text>
        <Text style={s.partyType}>{party.type === 'FAMILY' ? '👨‍👩‍👧 Family' : '👥 Friend'} · {party.phone}</Text>
        {party.notes ? <Text style={s.partyNotes} numberOfLines={1}>{party.notes}</Text> : null}
      </View>
      <View style={s.balBox}>
        {party.balance === 0 ? (
          <Text style={s.settledText}>Settled</Text>
        ) : (
          <>
            <Text style={[s.balAmount, isLent ? s.lentColor : s.borrowColor]}>{fmt(party.balance)}</Text>
            <Text style={[s.balLabel, isLent ? s.lentColor : s.borrowColor]}>
              {isLent ? 'They Owe' : 'I Owe'}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function KhataDetail({
  partyId,
  onClose,
}: {
  partyId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [txnModal, setTxnModal] = useState(false);
  const [txnKind, setTxnKind] = useState<TransactionKind>('GAVE');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnNote, setTxnNote] = useState('');

  const { data: party } = useQuery({
    queryKey: ['personal-khata-party', partyId],
    queryFn: () => khatabookService.getParty(partyId),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['personal-khata-entries', partyId],
    queryFn: () => khatabookService.getEntries(partyId),
  });

  const addMutation = useMutation({
    mutationFn: () => khatabookService.addEntry({ partyId, kind: txnKind, amount: parseFloat(txnAmount), note: txnNote.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-khata-entries', partyId] });
      queryClient.invalidateQueries({ queryKey: ['personal-khata-party', partyId] });
      queryClient.invalidateQueries({ queryKey: ['personal-khata-parties'] });
      queryClient.invalidateQueries({ queryKey: ['personal-khata-stats'] });
      setTxnModal(false);
      setTxnAmount('');
      setTxnNote('');
    },
    onError: () => Alert.alert('Error', 'Could not save entry.'),
  });

  const handleSend = () => {
    const amt = parseFloat(txnAmount);
    if (!amt || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    addMutation.mutate();
  };

  const handleWhatsApp = () => {
    if (!party) return;
    const owes = (party.balance ?? 0) > 0;
    const msg = owes
      ? `Hi ${party.name}, just a reminder — you owe me ${fmt(party.balance)}. Please settle when convenient 🙏`
      : `Hi ${party.name}, just checking in — I owe you ${fmt(party.balance)}. Will settle soon!`;
    Linking.openURL(`whatsapp://send?phone=91${party.phone}&text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('WhatsApp unavailable'));
  };

  const entriesWithBal: { entry: KhataEntry; running: number }[] = [];
  let running = 0;
  const asc = [...entries].reverse();
  for (const e of asc) {
    running += e.kind === 'GAVE' ? e.amount : -e.amount;
    entriesWithBal.push({ entry: e, running });
  }
  const display = entriesWithBal.reverse();

  const bal = party?.balance ?? 0;
  const isLent = bal > 0;

  return (
    <View style={s.detailContainer}>
      <View style={s.detailHeader}>
        <TouchableOpacity style={s.backBtn} onPress={onClose}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        {party && (
          <View style={[s.detailAvatar, { backgroundColor: party.avatarColor + '22' }]}>
            <Text style={[s.detailAvatarText, { color: party.avatarColor }]}>{party.avatarInitials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.detailName}>{party?.name ?? 'Loading...'}</Text>
          <Text style={s.detailPhone}>{party?.phone}</Text>
        </View>
        <TouchableOpacity style={s.waBtn} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
        </TouchableOpacity>
      </View>

      {/* Balance hero */}
      <View style={[s.detailHero, isLent ? s.lentHero : bal < 0 ? s.borrowHero : s.settledHeroBg]}>
        <Text style={[s.heroSub, isLent ? s.lentColor : bal < 0 ? s.borrowColor : { color: THEME.textSecondary }]}>
          {bal === 0 ? 'All Settled ✅' : isLent ? `${party?.name} Owes You` : `You Owe ${party?.name}`}
        </Text>
        <Text style={[s.heroAmt, isLent ? s.lentColor : bal < 0 ? s.borrowColor : { color: THEME.textSecondary }]}>
          {bal !== 0 ? fmt(bal) : '₹0'}
        </Text>
        <View style={s.heroRow}>
          <Text style={s.heroRowItem}>I Gave: <Text style={[{ fontWeight: '700' }, s.lentColor]}>{fmt(party?.totalGave ?? 0)}</Text></Text>
          <Text style={s.heroRowItem}>I Got: <Text style={[{ fontWeight: '700' }, s.borrowColor]}>{fmt(party?.totalGot ?? 0)}</Text></Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.detailScroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator size="small" color={THEME.brand} style={{ marginTop: 32 }} />
        ) : display.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="wallet-outline" size={44} color={THEME.border} />
            <Text style={s.emptyTitle}>No entries yet</Text>
          </View>
        ) : (
          display.map(({ entry, running: rb }) => {
            const gave = entry.kind === 'GAVE';
            return (
              <View key={entry.id} style={s.entryCard}>
                <View style={[s.entryBubble, gave ? s.gaveBubble : s.gotBubble]}>
                  <Ionicons name={gave ? 'arrow-up' : 'arrow-down'} size={13} color={gave ? THEME.lossDark : THEME.brandDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.entryKind}>{gave ? 'I Gave' : 'I Got'}</Text>
                  {entry.note ? <Text style={s.entryNote} numberOfLines={1}>{entry.note}</Text> : null}
                  <Text style={s.entryDate}>
                    {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.entryAmt, gave ? s.lentColor : s.borrowColor]}>{gave ? '−' : '+'}{fmt(entry.amount)}</Text>
                  <Text style={s.entryBal}>Bal: {fmt(rb)}</Text>
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action buttons */}
      <View style={s.detailActions}>
        <TouchableOpacity style={[s.detailActionBtn, s.iGaveBtn]} onPress={() => { setTxnKind('GAVE'); setTxnModal(true); }}>
          <Ionicons name="arrow-up" size={15} color={THEME.lossDark} />
          <Text style={[s.detailActionText, { color: THEME.lossDark }]}>I Gave</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.detailActionBtn, s.iGotBtn]} onPress={() => { setTxnKind('GOT'); setTxnModal(true); }}>
          <Ionicons name="arrow-down" size={15} color={THEME.brandDark} />
          <Text style={[s.detailActionText, { color: THEME.brandDark }]}>I Got</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction modal */}
      <Modal visible={txnModal} transparent animationType="slide" onRequestClose={() => setTxnModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalRow}>
              <Text style={s.modalTitle}>{txnKind === 'GAVE' ? '↑ I Gave' : '↓ I Got'}</Text>
              <TouchableOpacity onPress={() => setTxnModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={s.kindToggle}>
              {(['GAVE', 'GOT'] as const).map(k => (
                <TouchableOpacity
                  key={k}
                  style={[s.kindBtn, txnKind === k && (k === 'GAVE' ? s.kindBtnActiveGave : s.kindBtnActiveGot)]}
                  onPress={() => setTxnKind(k)}
                >
                  <Text style={[s.kindBtnText, txnKind === k && (k === 'GAVE' ? { color: THEME.lossDark } : { color: THEME.brandDark })]}>
                    {k === 'GAVE' ? 'I Gave' : 'I Got'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.amtRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput
                style={s.amtInput}
                placeholder="0"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
                value={txnAmount}
                onChangeText={setTxnAmount}
                autoFocus
              />
            </View>
            <TextInput
              style={s.noteField}
              placeholder="Note (optional)"
              placeholderTextColor={THEME.textMuted}
              value={txnNote}
              onChangeText={setTxnNote}
            />
            <TouchableOpacity
              style={[s.confirmBtn, txnKind === 'GAVE' ? { backgroundColor: THEME.loss } : { backgroundColor: THEME.brand }]}
              onPress={handleSend}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.confirmText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function PersonalKhata() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [detail, setDetail] = useState<DetailState>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LENT' | 'BORROWED'>('ALL');
  const [addVisible, setAddVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState<'FRIEND' | 'FAMILY'>('FRIEND');

  const { data: parties = [], isLoading, refetch } = useQuery({
    queryKey: ['personal-khata-parties'],
    queryFn: khatabookService.getPersonalParties,
  });

  const { data: stats } = useQuery({
    queryKey: ['personal-khata-stats'],
    queryFn: khatabookService.getPersonalStats,
  });

  const addMutation = useMutation({
    mutationFn: (dto: CreatePartyDto) => khatabookService.addPersonalParty(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-khata-parties'] });
      setAddVisible(false);
      setNewName('');
      setNewPhone('');
      setNewType('FRIEND');
    },
    onError: () => Alert.alert('Error', 'Could not add person.'),
  });

  const handleAdd = () => {
    if (!newName.trim() || !newPhone.trim()) { Alert.alert('Required', 'Enter name and phone.'); return; }
    addMutation.mutate({ name: newName.trim(), phone: newPhone.trim(), type: newType });
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
    if (filter === 'LENT') list = list.filter(p => p.balance > 0);
    if (filter === 'BORROWED') list = list.filter(p => p.balance < 0);
    return list.slice().sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  }, [parties, search, filter]);

  if (detail) {
    return <KhataDetail partyId={detail.partyId} onClose={() => setDetail(null)} />;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.headerTitle}>Udhaar Khata</Text>
          <Text style={s.headerSub}>Personal Lending & Borrowing Book</Text>
        </View>
        <View style={s.privacyBadge}>
          <Ionicons name="lock-closed" size={11} color={THEME.brandDark} />
          <Text style={s.privacyText}>Private</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsBanner}>
        <View style={s.statItem}>
          <Text style={s.statLabel}>I Lent</Text>
          <Text style={[s.statVal, s.lentColor]}>{fmt(stats?.totalReceivable ?? 0)}</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={s.statLabel}>I Owe</Text>
          <Text style={[s.statVal, s.borrowColor]}>{fmt(stats?.totalPayable ?? 0)}</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statItem}>
          <Text style={s.statLabel}>Net</Text>
          <Text style={[s.statVal, { color: (stats?.netBalance ?? 0) >= 0 ? THEME.lossDark : THEME.brandDark }]}>
            {fmt(stats?.netBalance ?? 0)}
          </Text>
        </View>
      </View>

      {/* Search + Add */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={15} color={THEME.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search..."
            placeholderTextColor={THEME.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setAddVisible(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter */}
      <View style={s.filterRow}>
        {(['ALL', 'LENT', 'BORROWED'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterPill, filter === f && s.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'ALL' ? 'All' : f === 'LENT' ? '▲ They Owe' : '▼ I Owe'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.brand]} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={THEME.brand} style={{ marginTop: 48 }} />
        ) : filtered.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="people-outline" size={48} color={THEME.border} />
            <Text style={s.emptyTitle}>No entries yet</Text>
            <Text style={s.emptySub}>Track money lent to friends and family here.</Text>
          </View>
        ) : (
          filtered.map(p => (
            <PartyCard key={p.id} party={p} onPress={() => setDetail({ partyId: p.id })} />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add Person Modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalRow}>
              <Text style={s.modalTitle}>Add to Udhaar Khata</Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLbl}>Name *</Text>
            <TextInput style={s.field} placeholder="Friend / family member name" placeholderTextColor={THEME.textMuted} value={newName} onChangeText={setNewName} />

            <Text style={s.fieldLbl}>Phone *</Text>
            <TextInput style={s.field} placeholder="Mobile number" placeholderTextColor={THEME.textMuted} keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} />

            <Text style={s.fieldLbl}>Relation</Text>
            <View style={s.kindToggle}>
              {(['FRIEND', 'FAMILY'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.kindBtn, newType === t && s.kindBtnActiveGot]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[s.kindBtnText, newType === t && { color: THEME.brandDark }]}>{t === 'FRIEND' ? '👥 Friend' : '👨‍👩‍👧 Family'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[s.confirmBtn, { backgroundColor: THEME.brand, marginTop: 14 }]} onPress={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? <ActivityIndicator color="#FFF" /> : <Text style={s.confirmText}>Add Person</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  detailContainer: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 12,
    backgroundColor: THEME.surface, borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 52 : 16, paddingBottom: 12,
    backgroundColor: THEME.surface, borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.surfaceMuted },
  headerTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  headerSub: { fontSize: 11, color: THEME.textSecondary },
  privacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: THEME.brandLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  privacyText: { fontSize: 11, fontWeight: '700', color: THEME.brandDark },
  statsBanner: {
    flexDirection: 'row', backgroundColor: THEME.surface,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: THEME.textSecondary },
  statVal: { fontSize: 16, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  statDiv: { width: 1, backgroundColor: THEME.border, marginHorizontal: 8 },
  lentColor: { color: THEME.lossDark },
  borrowColor: { color: THEME.brandDark },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.surface, borderRadius: 10, borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, color: THEME.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: THEME.brand, alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.surface },
  filterPillActive: { backgroundColor: THEME.brandLight, borderColor: THEME.brandBorder },
  filterText: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary },
  filterTextActive: { color: THEME.brandDark },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  partyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: THEME.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: THEME.border, marginBottom: 8, ...SHADOWS.card,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  partyInfo: { flex: 1 },
  partyName: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary },
  partyType: { fontSize: 11.5, color: THEME.textSecondary, marginTop: 2 },
  partyNotes: { fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  balBox: { alignItems: 'flex-end' },
  balAmount: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  balLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  settledText: { fontSize: 12, color: THEME.textMuted, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
  emptySub: { fontSize: 13, color: THEME.textSecondary, textAlign: 'center', paddingHorizontal: 28 },
  // Detail
  detailAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  detailAvatarText: { fontSize: 14, fontWeight: '800' },
  detailName: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
  detailPhone: { fontSize: 12, color: THEME.textSecondary },
  waBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  detailHero: { padding: 20, alignItems: 'center', gap: 6 },
  lentHero: { backgroundColor: THEME.lossLight },
  borrowHero: { backgroundColor: THEME.brandLight },
  settledHeroBg: { backgroundColor: THEME.surfaceMuted },
  heroSub: { fontSize: 13, fontWeight: '600' },
  heroAmt: { fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
  heroRow: { flexDirection: 'row', gap: 24, marginTop: 4 },
  heroRowItem: { fontSize: 12, color: THEME.textSecondary },
  detailScroll: { paddingHorizontal: 16, paddingTop: 12 },
  entryCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: THEME.surface, borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: THEME.border, ...SHADOWS.card,
  },
  entryBubble: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  gaveBubble: { backgroundColor: THEME.lossLight },
  gotBubble: { backgroundColor: THEME.brandLight },
  entryKind: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary },
  entryNote: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  entryDate: { fontSize: 11, color: THEME.textMuted, marginTop: 4 },
  entryAmt: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  entryBal: { fontSize: 10.5, color: THEME.textMuted, marginTop: 4 },
  detailActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: THEME.surface, borderTopWidth: 1, borderTopColor: THEME.border, ...SHADOWS.card,
  },
  detailActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5,
  },
  iGaveBtn: { backgroundColor: THEME.lossLight, borderColor: THEME.lossBorder },
  iGotBtn: { backgroundColor: THEME.brandLight, borderColor: THEME.brandBorder },
  detailActionText: { fontSize: 15, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    gap: 10,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 8 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: THEME.textPrimary },
  kindToggle: { flexDirection: 'row', gap: 8, backgroundColor: THEME.surfaceMuted, borderRadius: 12, padding: 4 },
  kindBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  kindBtnActiveGave: { backgroundColor: THEME.lossLight },
  kindBtnActiveGot: { backgroundColor: THEME.brandLight },
  kindBtnText: { fontSize: 14, fontWeight: '600', color: THEME.textSecondary },
  amtRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.surfaceSubtle, borderWidth: 1, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rupee: { fontSize: 26, fontWeight: '700', color: THEME.textSecondary, marginRight: 6 },
  amtInput: { flex: 1, fontSize: 32, fontWeight: '800', color: THEME.textPrimary, fontVariant: ['tabular-nums'] },
  noteField: { backgroundColor: THEME.surfaceSubtle, borderWidth: 1, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: THEME.textPrimary },
  confirmBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  fieldLbl: { fontSize: 13, fontWeight: '600', color: THEME.textSecondary, marginTop: 6 },
  field: { backgroundColor: THEME.surfaceSubtle, borderWidth: 1, borderColor: THEME.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: THEME.textPrimary },
});
