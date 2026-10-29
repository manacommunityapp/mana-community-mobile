import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { THEME, FONTS, SHADOWS } from '@/constants/config';
import { financeExtService, BrsSession, BrsLine, BrsSummary } from '@/services/financeExtService';

export default function BankReconciliationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<BrsSession | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [sessionError, setSessionError] = useState('');

  const [newBankName, setNewBankName] = useState('');
  const [newMonth, setNewMonth] = useState('');
  const [newOpening, setNewOpening] = useState('');
  const [newClosing, setNewClosing] = useState('');

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['finance', 'brs', 'sessions'],
    queryFn: financeExtService.getBrsSessions,
  });

  const { data: lines = [], isLoading: loadingLines } = useQuery({
    queryKey: ['finance', 'brs', 'lines', selectedSession?.id],
    queryFn: () => financeExtService.getBrsLines(selectedSession!.id),
    enabled: !!selectedSession,
  });

  const { data: summary } = useQuery({
    queryKey: ['finance', 'brs', 'summary', selectedSession?.id],
    queryFn: () => financeExtService.getBrsSummary(selectedSession!.id),
    enabled: !!selectedSession,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      financeExtService.createBrsSession({
        bankAccountName: newBankName,
        statementMonth: newMonth,
        openingBalance: parseFloat(newOpening) || 0,
        closingBalance: parseFloat(newClosing) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'brs', 'sessions'] });
      setShowNewModal(false);
      setNewBankName(''); setNewMonth(''); setNewOpening(''); setNewClosing('');
      setSessionError('');
    },
    onError: (err: any) => setSessionError(err?.message || 'Failed to create session.'),
  });

  const autoMatchMutation = useMutation({
    mutationFn: () => financeExtService.autoMatch(selectedSession!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'brs'] });
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => financeExtService.lockBrsSession(selectedSession!.id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'brs', 'sessions'] });
      setSelectedSession(updated);
    },
  });

  const renderSession = ({ item }: { item: BrsSession }) => (
    <TouchableOpacity
      style={s.sessionCard}
      onPress={() => setSelectedSession(item)}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.sessionBank}>{item.bankAccountName}</Text>
        <Text style={s.sessionMonth}>{item.statementMonth}</Text>
        <Text style={s.sessionBalance}>
          Opening: ₹{item.openingBalance.toLocaleString('en-IN')} → Closing: ₹{item.closingBalance.toLocaleString('en-IN')}
        </Text>
      </View>
      <View>
        <View style={[s.statusBadge, item.status === 'LOCKED' ? s.lockedBadge : s.openBadge]}>
          <Text style={[s.statusBadgeText, item.status === 'LOCKED' ? s.lockedText : s.openText]}>
            {item.status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} style={{ marginTop: 8, alignSelf: 'flex-end' }} />
      </View>
    </TouchableOpacity>
  );

  const renderLine = ({ item }: { item: BrsLine }) => {
    const isCredit = !!item.creditAmount;
    const amount = item.creditAmount ?? item.debitAmount ?? 0;
    const matchColors: Record<string, string> = {
      UNMATCHED: '#FEF3C7',
      MATCHED_INVOICE: '#D1FAE5',
      MATCHED_PAYMENT: '#D1FAE5',
      MATCHED_VENDOR: '#DBEAFE',
      SUSPENSE: '#FEE2E2',
    };
    return (
      <View style={s.lineRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.lineDate}>{item.valueDate}</Text>
          <Text style={s.lineDesc} numberOfLines={2}>{item.description}</Text>
          {item.utrReference ? <Text style={s.lineUtr}>UTR: {item.utrReference}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={[s.lineAmount, isCredit ? s.credit : s.debit]}>
            {isCredit ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
          </Text>
          <View style={[s.matchBadge, { backgroundColor: matchColors[item.matchStatus] || '#F3F4F6' }]}>
            <Text style={s.matchBadgeText}>{item.matchStatus.replace('_', ' ')}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (selectedSession) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setSelectedSession(null)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{selectedSession.bankAccountName}</Text>
            <Text style={s.headerSub}>{selectedSession.statementMonth}</Text>
          </View>
          <TouchableOpacity
            style={[s.actionHeaderBtn, { backgroundColor: '#DBEAFE' }]}
            onPress={() => autoMatchMutation.mutate()}
            disabled={autoMatchMutation.isPending || selectedSession.status === 'LOCKED'}
          >
            <Text style={s.actionHeaderBtnText}>Auto Match</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionHeaderBtn, { backgroundColor: '#FEF3C7', marginLeft: 6 }]}
            onPress={() => lockMutation.mutate()}
            disabled={lockMutation.isPending || selectedSession.status === 'LOCKED'}
          >
            <Text style={[s.actionHeaderBtnText, { color: '#92400E' }]}>
              {selectedSession.status === 'LOCKED' ? 'Locked' : 'Lock'}
            </Text>
          </TouchableOpacity>
        </View>

        {summary && (
          <View style={s.summaryRow}>
            <View style={[s.summaryChip, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[s.summaryChipText, { color: '#065F46' }]}>Matched: {summary.totalMatched}</Text>
            </View>
            <View style={[s.summaryChip, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[s.summaryChipText, { color: '#92400E' }]}>Unmatched: {summary.totalUnmatched}</Text>
            </View>
            <View style={[s.summaryChip, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[s.summaryChipText, { color: '#991B1B' }]}>Suspense: {summary.totalSuspense}</Text>
            </View>
          </View>
        )}

        {loadingLines ? (
          <View style={s.center}><ActivityIndicator color={THEME.brand} /></View>
        ) : lines.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="document-outline" size={36} color={THEME.textMuted} />
            <Text style={s.emptyText}>No statement lines yet.</Text>
            <Text style={s.emptySubText}>Upload via API: POST /api/finance/brs/sessions/{selectedSession.id}/lines/upload</Text>
          </View>
        ) : (
          <FlatList
            data={lines}
            keyExtractor={(i) => i.id}
            renderItem={renderLine}
            contentContainerStyle={s.list}
            ItemSeparatorComponent={() => <View style={s.separator} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bank Reconciliation</Text>
        <TouchableOpacity onPress={() => setShowNewModal(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color={THEME.brandDark} />
        </TouchableOpacity>
      </View>

      {loadingSessions ? (
        <View style={s.center}><ActivityIndicator color={THEME.brand} /></View>
      ) : sessions.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="business-outline" size={40} color={THEME.textMuted} />
          <Text style={s.emptyText}>No BRS sessions yet.</Text>
          <TouchableOpacity style={s.newBtn} onPress={() => setShowNewModal(true)}>
            <Text style={s.newBtnText}>New BRS Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(i) => i.id}
          renderItem={renderSession}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showNewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>New BRS Session</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            {sessionError ? <Text style={s.inlineError}>{sessionError}</Text> : null}
            {[
              { label: 'Bank Account Name', value: newBankName, set: setNewBankName, placeholder: 'e.g. SBI Current A/c' },
              { label: 'Statement Month (YYYY-MM)', value: newMonth, set: setNewMonth, placeholder: '2026-10' },
              { label: 'Opening Balance (₹)', value: newOpening, set: setNewOpening, placeholder: '0', kb: 'decimal-pad' },
              { label: 'Closing Balance (₹)', value: newClosing, set: setNewClosing, placeholder: '0', kb: 'decimal-pad' },
            ].map((f) => (
              <View key={f.label} style={s.addField}>
                <Text style={s.addLabel}>{f.label}</Text>
                <TextInput
                  style={s.addInput}
                  value={f.value}
                  onChangeText={f.set}
                  placeholder={f.placeholder}
                  placeholderTextColor={THEME.textMuted}
                  keyboardType={(f as any).kb || 'default'}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[s.submitBtn, createMutation.isPending && { opacity: 0.6 }]}
              onPress={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.submitBtnText}>Create Session</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.surfaceMuted,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  headerSub: { textAlign: 'center', fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.brandLight,
  },
  actionHeaderBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },
  actionHeaderBtnText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8', fontFamily: FONTS.semiBold },
  summaryRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border },
  summaryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  summaryChipText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.semiBold },
  list: { padding: 16, gap: 10 },
  separator: { height: 8 },
  sessionCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: THEME.border, padding: 14, ...SHADOWS.card,
  },
  sessionBank: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  sessionMonth: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 2 },
  sessionBalance: { fontSize: 11, color: THEME.textMuted, fontFamily: FONTS.regular, marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  lockedBadge: { backgroundColor: '#D1FAE5' },
  lockedText: { color: '#065F46' },
  openBadge: { backgroundColor: '#FEF3C7' },
  openText: { color: '#92400E' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  lineRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', padding: 12,
    borderRadius: 10, borderWidth: 1, borderColor: THEME.border,
  },
  lineDate: { fontSize: 11, color: THEME.textMuted, fontFamily: FONTS.regular },
  lineDesc: { fontSize: 13, color: THEME.textPrimary, fontFamily: FONTS.medium, marginTop: 2 },
  lineUtr: { fontSize: 10.5, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 2 },
  lineAmount: { fontSize: 14, fontWeight: '700', fontFamily: FONTS.semiBold },
  credit: { color: '#059669' },
  debit: { color: THEME.lossDark },
  matchBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  matchBadgeText: { fontSize: 9.5, fontWeight: '700', color: '#374151' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyText: { fontSize: 14, color: THEME.textSecondary, fontFamily: FONTS.medium },
  emptySubText: { fontSize: 11, color: THEME.textMuted, fontFamily: FONTS.regular, textAlign: 'center' },
  newBtn: { backgroundColor: THEME.brand, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  newBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, gap: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  inlineError: { fontSize: 13, color: THEME.lossDark, fontFamily: FONTS.medium },
  addField: { gap: 4 },
  addLabel: { fontSize: 12, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  addInput: {
    backgroundColor: THEME.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 14, color: THEME.textPrimary, fontFamily: FONTS.regular,
  },
  submitBtn: { backgroundColor: THEME.brand, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
