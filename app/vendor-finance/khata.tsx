/**
 * Khata Detail Screen — per-party ledger.
 * Core Khatabook flow: "You Gave" (credit out) / "You Got" (payment received).
 * Running balance visible between every entry. WhatsApp reminder support.
 */
import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, RefreshControl, Alert,
  Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { khatabookService, KhataEntry, TransactionKind } from '@/services/khatabookService';

function fmt(n: number) {
  return '₹' + Math.abs(n).toLocaleString('en-IN');
}

function EntryRow({ entry, runningBalance }: { entry: KhataEntry; runningBalance: number }) {
  const isGave = entry.kind === 'GAVE';
  return (
    <View style={s.entryRow}>
      {/* Kind indicator */}
      <View style={[s.kindBubble, isGave ? s.gaveBubble : s.gotBubble]}>
        <Ionicons
          name={isGave ? 'arrow-up' : 'arrow-down'}
          size={14}
          color={isGave ? THEME.lossDark : THEME.brandDark}
        />
      </View>

      <View style={s.entryMid}>
        <Text style={s.entryKindLabel}>
          {isGave ? 'You Gave' : 'You Got'}
          {entry.hasReceipt && <Text style={s.receiptTag}> 📎</Text>}
        </Text>
        {entry.note ? <Text style={s.entryNote} numberOfLines={2}>{entry.note}</Text> : null}
        <Text style={s.entryDate}>
          {new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
        </Text>
      </View>

      <View style={s.entryRight}>
        <Text style={[s.entryAmount, isGave ? s.gaveColor : s.gotColor]}>
          {isGave ? '−' : '+'}{fmt(entry.amount)}
        </Text>
        <Text style={s.runningBal}>
          Bal: {runningBalance >= 0 ? '' : '−'}{fmt(runningBalance)}
        </Text>
      </View>
    </View>
  );
}

export default function KhataDetailScreen() {
  const router = useRouter();
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [txnModal, setTxnModal] = useState(false);
  const [txnKind, setTxnKind] = useState<TransactionKind>('GAVE');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnNote, setTxnNote] = useState('');

  const { data: party, isLoading: loadingParty, refetch: refetchParty } = useQuery({
    queryKey: ['khata-party', partyId],
    queryFn: () => khatabookService.getParty(partyId!),
    enabled: !!partyId,
  });

  const { data: entries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['khata-entries', partyId],
    queryFn: () => khatabookService.getEntries(partyId!),
    enabled: !!partyId,
  });

  const addEntryMutation = useMutation({
    mutationFn: () => khatabookService.addEntry({
      partyId: partyId!,
      kind: txnKind,
      amount: parseFloat(txnAmount),
      note: txnNote.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['khata-entries', partyId] });
      queryClient.invalidateQueries({ queryKey: ['khata-party', partyId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-khata-parties'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-khata-stats'] });
      setTxnModal(false);
      setTxnAmount('');
      setTxnNote('');
    },
    onError: () => Alert.alert('Error', 'Could not save entry.'),
  });

  const handleAddEntry = () => {
    const amt = parseFloat(txnAmount);
    if (!amt || amt <= 0) { Alert.alert('Invalid', 'Enter a valid amount.'); return; }
    addEntryMutation.mutate();
  };

  const handleReminder = () => {
    if (!party) return;
    const isOwes = (party.balance ?? 0) > 0;
    const message = isOwes
      ? `Hi ${party.name}, you have a pending payment of ${fmt(party.balance)} in our khata. Please settle at your earliest convenience.`
      : `Hi ${party.name}, just a reminder that we owe you ${fmt(party.balance)} in our khata. Will settle soon.`;
    const url = `whatsapp://send?phone=91${party.phone}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp', 'Could not open WhatsApp. Share manually.'));
    khatabookService.sendReminder(partyId!);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchParty(), refetchEntries()]).finally(() => setRefreshing(false));
  }, [refetchParty, refetchEntries]);

  // Build running balance list (oldest → newest, reverse for display)
  const entriesWithBalance: { entry: KhataEntry; running: number }[] = [];
  let running = 0;
  const sortedAsc = [...entries].reverse();
  for (const e of sortedAsc) {
    running += e.kind === 'GAVE' ? e.amount : -e.amount;
    entriesWithBalance.push({ entry: e, running });
  }
  const displayEntries = entriesWithBalance.reverse();

  const balance = party?.balance ?? 0;
  const isReceivable = balance > 0;

  if (loadingParty) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={THEME.brand} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>

        {party && (
          <View style={[s.avatarMini, { backgroundColor: party.avatarColor + '22' }]}>
            <Text style={[s.avatarMiniText, { color: party.avatarColor }]}>{party.avatarInitials}</Text>
          </View>
        )}

        <View style={s.headerMid}>
          <Text style={s.headerName}>{party?.name ?? 'Khata'}</Text>
          <Text style={s.headerPhone}>{party?.phone}</Text>
        </View>

        <TouchableOpacity style={s.whatsappBtn} onPress={handleReminder}>
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
        </TouchableOpacity>
      </View>

      {/* ── Balance Hero ── */}
      <View style={[s.balanceHero, isReceivable ? s.receivableHero : balance < 0 ? s.payableHero : s.settledHero]}>
        <Text style={[s.heroLabel, isReceivable ? s.heroLabelReceivable : balance < 0 ? s.heroLabelPayable : s.heroLabelSettled]}>
          {balance === 0 ? 'All Settled' : isReceivable ? `${party?.name ?? 'Party'} Owes You` : `You Owe ${party?.name ?? 'Party'}`}
        </Text>
        <Text style={[s.heroAmount, isReceivable ? s.gaveColor : balance < 0 ? s.gotColor : { color: THEME.textSecondary }]}>
          {balance !== 0 ? fmt(balance) : '₹0'}
        </Text>

        <View style={s.heroMeta}>
          <View style={s.heroMetaItem}>
            <Text style={s.heroMetaLabel}>You Gave</Text>
            <Text style={[s.heroMetaVal, s.gaveColor]}>{fmt(party?.totalGave ?? 0)}</Text>
          </View>
          <View style={s.heroMetaDivider} />
          <View style={s.heroMetaItem}>
            <Text style={s.heroMetaLabel}>You Got</Text>
            <Text style={[s.heroMetaVal, s.gotColor]}>{fmt(party?.totalGot ?? 0)}</Text>
          </View>
        </View>
      </View>

      {/* ── Entries List ── */}
      <ScrollView
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.brand]} />}
        showsVerticalScrollIndicator={false}
      >
        {loadingEntries ? (
          <ActivityIndicator size="small" color={THEME.brand} style={{ marginTop: 32 }} />
        ) : displayEntries.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="receipt-outline" size={44} color={THEME.border} />
            <Text style={s.emptyTitle}>No entries yet</Text>
            <Text style={s.emptySub}>Tap "You Gave" or "You Got" below to add the first transaction.</Text>
          </View>
        ) : (
          displayEntries.map(({ entry, running: bal }) => (
            <EntryRow key={entry.id} entry={entry} runningBalance={bal} />
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Sticky Action Buttons ── */}
      <View style={s.stickyActions}>
        <TouchableOpacity
          style={[s.actionBtn, s.gaveBtn]}
          onPress={() => { setTxnKind('GAVE'); setTxnModal(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-up" size={16} color={THEME.lossDark} />
          <Text style={[s.actionBtnText, { color: THEME.lossDark }]}>You Gave</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.gotBtn]}
          onPress={() => { setTxnKind('GOT'); setTxnModal(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down" size={16} color={THEME.brandDark} />
          <Text style={[s.actionBtnText, { color: THEME.brandDark }]}>You Got</Text>
        </TouchableOpacity>
      </View>

      {/* ── Add Transaction Modal ── */}
      <Modal visible={txnModal} transparent animationType="slide" onRequestClose={() => setTxnModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>
                {txnKind === 'GAVE' ? '↑ You Gave' : '↓ You Got'}
              </Text>
              <TouchableOpacity onPress={() => setTxnModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Kind toggle */}
            <View style={s.kindToggle}>
              <TouchableOpacity
                style={[s.kindToggleBtn, txnKind === 'GAVE' && s.kindToggleBtnActiveGave]}
                onPress={() => setTxnKind('GAVE')}
              >
                <Ionicons name="arrow-up" size={16} color={txnKind === 'GAVE' ? THEME.lossDark : THEME.textSecondary} />
                <Text style={[s.kindToggleBtnText, txnKind === 'GAVE' && { color: THEME.lossDark, fontWeight: '700' }]}>
                  You Gave
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.kindToggleBtn, txnKind === 'GOT' && s.kindToggleBtnActiveGot]}
                onPress={() => setTxnKind('GOT')}
              >
                <Ionicons name="arrow-down" size={16} color={txnKind === 'GOT' ? THEME.brandDark : THEME.textSecondary} />
                <Text style={[s.kindToggleBtnText, txnKind === 'GOT' && { color: THEME.brandDark, fontWeight: '700' }]}>
                  You Got
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={s.amountRow}>
              <Text style={s.rupeeSign}>₹</Text>
              <TextInput
                style={s.amountInput}
                placeholder="0"
                placeholderTextColor={THEME.textMuted}
                keyboardType="numeric"
                value={txnAmount}
                onChangeText={setTxnAmount}
                autoFocus
              />
            </View>

            {/* Note */}
            <TextInput
              style={s.noteInput}
              placeholder="Add a note (optional)"
              placeholderTextColor={THEME.textMuted}
              value={txnNote}
              onChangeText={setTxnNote}
            />

            <TouchableOpacity
              style={[s.confirmBtn, txnKind === 'GAVE' ? s.confirmBtnGave : s.confirmBtnGot]}
              onPress={handleAddEntry}
              disabled={addEntryMutation.isPending}
            >
              {addEntryMutation.isPending
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={s.confirmBtnText}>Save Entry</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  avatarMini: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarMiniText: { fontSize: 14, fontWeight: '800' },
  headerMid: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  headerPhone: { fontSize: 12, color: THEME.textSecondary },
  whatsappBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  balanceHero: { padding: 20, alignItems: 'center', gap: 6 },
  receivableHero: { backgroundColor: THEME.lossLight },
  payableHero: { backgroundColor: THEME.brandLight },
  settledHero: { backgroundColor: THEME.surfaceMuted },
  heroLabel: { fontSize: 13, fontWeight: '600' },
  heroLabelReceivable: { color: THEME.lossDark },
  heroLabelPayable: { color: THEME.brandDark },
  heroLabelSettled: { color: THEME.textSecondary },
  heroAmount: { fontSize: 32, fontWeight: '900', fontFamily: FONTS.semiBold, fontVariant: ['tabular-nums'] },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  heroMetaItem: { flex: 1, alignItems: 'center' },
  heroMetaLabel: { fontSize: 11, color: THEME.textSecondary },
  heroMetaVal: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  heroMetaDivider: { width: 1, height: 28, backgroundColor: THEME.borderMedium },
  gaveColor: { color: THEME.lossDark },
  gotColor: { color: THEME.brandDark },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 12,
    ...SHADOWS.card,
  },
  kindBubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  gaveBubble: { backgroundColor: THEME.lossLight },
  gotBubble: { backgroundColor: THEME.brandLight },
  entryMid: { flex: 1 },
  entryKindLabel: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  receiptTag: { fontSize: 12 },
  entryNote: { fontSize: 12, color: THEME.textSecondary, marginTop: 2 },
  entryDate: { fontSize: 11, color: THEME.textMuted, marginTop: 4 },
  entryRight: { alignItems: 'flex-end' },
  entryAmount: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  runningBal: { fontSize: 10.5, color: THEME.textMuted, marginTop: 4 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary },
  emptySub: { fontSize: 12, color: THEME.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  stickyActions: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: THEME.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    ...SHADOWS.card,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
  },
  gaveBtn: { backgroundColor: THEME.lossLight, borderColor: THEME.lossBorder },
  gotBtn: { backgroundColor: THEME.brandLight, borderColor: THEME.brandBorder },
  actionBtnText: { fontSize: 15, fontWeight: '700', fontFamily: FONTS.bold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: THEME.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    gap: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 8 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  kindToggle: { flexDirection: 'row', gap: 8, backgroundColor: THEME.surfaceMuted, borderRadius: 12, padding: 4 },
  kindToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  kindToggleBtnActiveGave: { backgroundColor: THEME.lossLight },
  kindToggleBtnActiveGot: { backgroundColor: THEME.brandLight },
  kindToggleBtnText: { fontSize: 14, fontWeight: '600', color: THEME.textSecondary },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.surfaceSubtle, borderWidth: 1, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rupeeSign: { fontSize: 26, fontWeight: '700', color: THEME.textSecondary, marginRight: 6 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '800', color: THEME.textPrimary, fontVariant: ['tabular-nums'] },
  noteInput: {
    backgroundColor: THEME.surfaceSubtle,
    borderWidth: 1, borderColor: THEME.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: THEME.textPrimary,
  },
  confirmBtn: { paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  confirmBtnGave: { backgroundColor: THEME.loss },
  confirmBtnGot: { backgroundColor: THEME.brand },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
