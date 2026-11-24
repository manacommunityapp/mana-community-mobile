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
import { financeExtService, ChequeRecord, ChequeStatus } from '@/services/financeExtService';

const TABS: { label: string; value: ChequeStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'In Hand', value: 'IN_HAND' },
  { label: 'Deposited', value: 'DEPOSITED' },
  { label: 'Cleared', value: 'CLEARED' },
  { label: 'Bounced', value: 'BOUNCED' },
];

const STATUS_COLORS: Record<ChequeStatus, { bg: string; text: string }> = {
  IN_HAND: { bg: '#FEF3C7', text: '#92400E' },
  DEPOSITED: { bg: '#DBEAFE', text: '#1D4ED8' },
  CLEARED: { bg: '#D1FAE5', text: '#065F46' },
  BOUNCED: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function ChequeTrackingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<ChequeStatus | undefined>(undefined);
  const [selectedCheque, setSelectedCheque] = useState<ChequeRecord | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionError, setActionError] = useState('');

  const [newFlat, setNewFlat] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newChequeNum, setNewChequeNum] = useState('');
  const [newBank, setNewBank] = useState('');
  const [newDate, setNewDate] = useState('');
  const [addError, setAddError] = useState('');

  const { data: cheques = [], isLoading } = useQuery({
    queryKey: ['finance', 'cheques', selectedTab],
    queryFn: () => financeExtService.getCheques(selectedTab),
  });

  const statusMutation = useMutation({
    mutationFn: ({ action, remarks }: { action: 'deposit' | 'clear' | 'bounce'; remarks?: string }) =>
      financeExtService.updateChequeStatus(selectedCheque!.id, action, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'cheques'] });
      setShowActionModal(false);
      setSelectedCheque(null);
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err?.message || 'Failed to update cheque status.');
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      financeExtService.createCheque({
        flatNo: newFlat,
        amount: parseFloat(newAmount) || 0,
        chequeNumber: newChequeNum,
        bankName: newBank,
        chequeDate: newDate,
        residentUserId: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'cheques'] });
      setShowAddModal(false);
      setNewFlat(''); setNewAmount(''); setNewChequeNum('');
      setNewBank(''); setNewDate(''); setAddError('');
    },
    onError: (err: any) => {
      setAddError(err?.message || 'Failed to add cheque.');
    },
  });

  const renderCheque = ({ item }: { item: ChequeRecord }) => {
    const col = STATUS_COLORS[item.status];
    const displayDate = item.status === 'CLEARED'
      ? item.clearedDate
      : item.status === 'DEPOSITED'
      ? item.depositedDate
      : item.chequeDate;
    return (
      <TouchableOpacity
        style={s.chequeRow}
        onPress={() => { setSelectedCheque(item); setShowActionModal(true); }}
        activeOpacity={0.75}
      >
        <View style={s.chequeIconBox}>
          <Ionicons name="document-text-outline" size={18} color={THEME.brandDark} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.chequeFlat}>Flat {item.flatNo} · #{item.chequeNumber}</Text>
          <Text style={s.chequeMeta}>{item.bankName}</Text>
          {displayDate ? <Text style={s.chequeDate}>{displayDate}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={s.chequeAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
          <View style={[s.statusBadge, { backgroundColor: col.bg }]}>
            <Text style={[s.statusBadgeText, { color: col.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Cheque Tracking</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color={THEME.brandDark} />
        </TouchableOpacity>
      </View>

      <View style={s.tabsRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.label}
            style={[s.tab, selectedTab === t.value && s.tabActive]}
            onPress={() => setSelectedTab(t.value)}
          >
            <Text style={[s.tabText, selectedTab === t.value && s.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={THEME.brand} />
        </View>
      ) : cheques.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="document-outline" size={40} color={THEME.textMuted} />
          <Text style={s.emptyText}>No cheques found.</Text>
        </View>
      ) : (
        <FlatList
          data={cheques}
          keyExtractor={(i) => i.id}
          renderItem={renderCheque}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Cheque Actions</Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedCheque && (
              <Text style={s.sheetSub}>
                #{selectedCheque.chequeNumber} · Flat {selectedCheque.flatNo} · ₹{selectedCheque.amount.toLocaleString('en-IN')}
              </Text>
            )}
            {actionError ? (
              <Text style={s.inlineError}>{actionError}</Text>
            ) : null}
            <View style={s.actionBtns}>
              <TouchableOpacity
                style={[s.actionBtn, selectedCheque?.status !== 'IN_HAND' && s.actionBtnDisabled]}
                onPress={() => statusMutation.mutate({ action: 'deposit' })}
                disabled={selectedCheque?.status !== 'IN_HAND' || statusMutation.isPending}
              >
                <Text style={s.actionBtnText}>Mark Deposited</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnGreen, selectedCheque?.status !== 'DEPOSITED' && s.actionBtnDisabled]}
                onPress={() => statusMutation.mutate({ action: 'clear' })}
                disabled={selectedCheque?.status !== 'DEPOSITED' || statusMutation.isPending}
              >
                <Text style={s.actionBtnText}>Mark Cleared</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, s.actionBtnRed, (selectedCheque?.status === 'CLEARED' || selectedCheque?.status === 'BOUNCED') && s.actionBtnDisabled]}
                onPress={() => statusMutation.mutate({ action: 'bounce' })}
                disabled={(selectedCheque?.status === 'CLEARED' || selectedCheque?.status === 'BOUNCED') || statusMutation.isPending}
              >
                <Text style={s.actionBtnText}>Mark Bounced</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Cheque Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add Cheque</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            {addError ? <Text style={s.inlineError}>{addError}</Text> : null}
            {[
              { label: 'Flat No', value: newFlat, set: setNewFlat, placeholder: 'e.g. A-1204' },
              { label: 'Amount (₹)', value: newAmount, set: setNewAmount, placeholder: '5000', kb: 'decimal-pad' },
              { label: 'Cheque Number', value: newChequeNum, set: setNewChequeNum, placeholder: '123456' },
              { label: 'Bank Name', value: newBank, set: setNewBank, placeholder: 'HDFC Bank' },
              { label: 'Cheque Date (YYYY-MM-DD)', value: newDate, set: setNewDate, placeholder: '2026-11-01' },
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
              style={[s.addSubmitBtn, addMutation.isPending && { opacity: 0.6 }]}
              onPress={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.addSubmitText}>Save Cheque</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 17,
    fontWeight: '700', color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.brandLight,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: THEME.border,
    backgroundColor: THEME.surfaceMuted,
  },
  tabActive: { backgroundColor: THEME.brandLight, borderColor: THEME.brandBorder },
  tabText: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  tabTextActive: { color: THEME.brandDark },
  list: { padding: 16 },
  separator: { height: 1, backgroundColor: THEME.border },
  chequeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.card,
  },
  chequeIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: THEME.brandLight,
    alignItems: 'center', justifyContent: 'center',
  },
  chequeFlat: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  chequeMeta: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 2 },
  chequeDate: { fontSize: 10.5, color: THEME.textMuted, marginTop: 1 },
  chequeAmount: { fontSize: 14, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: THEME.textMuted, fontFamily: FONTS.regular },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    gap: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  sheetSub: { fontSize: 12.5, color: THEME.textSecondary, fontFamily: FONTS.medium },
  inlineError: { fontSize: 13, color: THEME.lossDark, fontFamily: FONTS.medium },
  actionBtns: { gap: 8 },
  actionBtn: {
    backgroundColor: THEME.brand, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  actionBtnGreen: { backgroundColor: '#059669' },
  actionBtnRed: { backgroundColor: THEME.lossDark },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
  addField: { gap: 4 },
  addLabel: { fontSize: 12, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  addInput: {
    backgroundColor: THEME.surfaceMuted, borderRadius: 10,
    borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 14, color: THEME.textPrimary, fontFamily: FONTS.regular,
  },
  addSubmitBtn: {
    backgroundColor: THEME.brand, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  addSubmitText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
