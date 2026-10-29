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
import { financeExtService, PgSettlement } from '@/services/financeExtService';

export default function PgSettlementsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addError, setAddError] = useState('');

  const [newDate, setNewDate] = useState('');
  const [newUtr, setNewUtr] = useState('');
  const [newGross, setNewGross] = useState('');
  const [newMdr, setNewMdr] = useState('');
  const [newGstMdr, setNewGstMdr] = useState('');
  const [newTxCount, setNewTxCount] = useState('');
  const [newBankAccount, setNewBankAccount] = useState('');
  const [newRemarks, setNewRemarks] = useState('');

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['finance', 'pg-settlements'],
    queryFn: financeExtService.getPgSettlements,
  });

  const totalGross = settlements.reduce((s, i) => s + i.grossAmount, 0);
  const totalMdr = settlements.reduce((s, i) => s + i.mdrAmount + i.gstOnMdr, 0);
  const totalNet = settlements.reduce((s, i) => s + i.netAmount, 0);

  const reconcileMutation = useMutation({
    mutationFn: (id: string) => financeExtService.reconcilePgSettlement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance', 'pg-settlements'] }),
  });

  const addMutation = useMutation({
    mutationFn: () => {
      const gross = parseFloat(newGross) || 0;
      const mdr = parseFloat(newMdr) || 0;
      const gstMdr = parseFloat(newGstMdr) || 0;
      return financeExtService.createPgSettlement({
        settlementDate: newDate,
        utrNumber: newUtr,
        grossAmount: gross,
        mdrAmount: mdr,
        gstOnMdr: gstMdr,
        netAmount: gross - mdr - gstMdr,
        transactionCount: parseInt(newTxCount, 10) || 0,
        bankAccount: newBankAccount,
        remarks: newRemarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'pg-settlements'] });
      setShowAddModal(false);
      setNewDate(''); setNewUtr(''); setNewGross(''); setNewMdr('');
      setNewGstMdr(''); setNewTxCount(''); setNewBankAccount(''); setNewRemarks('');
      setAddError('');
    },
    onError: (err: any) => setAddError(err?.message || 'Failed to add settlement.'),
  });

  const renderSettlement = ({ item }: { item: PgSettlement }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardUtr}>UTR: {item.utrNumber}</Text>
          <Text style={s.cardDate}>{item.settlementDate}</Text>
        </View>
        <View style={[s.statusBadge, item.status === 'RECONCILED' ? s.reconBadge : s.pendingBadge]}>
          <Text style={[s.statusBadgeText, item.status === 'RECONCILED' ? s.reconText : s.pendingText]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={s.amountBreakdown}>
        <View style={s.amountRow}>
          <Text style={s.amountLabel}>Gross Received</Text>
          <Text style={s.amountValue}>₹{item.grossAmount.toLocaleString('en-IN')}</Text>
        </View>
        <View style={s.amountRow}>
          <Text style={s.amountLabel}>MDR + GST on MDR</Text>
          <Text style={[s.amountValue, { color: THEME.lossDark }]}>
            -₹{(item.mdrAmount + item.gstOnMdr).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={[s.amountRow, { borderTopWidth: 1, borderTopColor: THEME.border, paddingTop: 8, marginTop: 4 }]}>
          <Text style={[s.amountLabel, { fontWeight: '700', color: THEME.textPrimary }]}>Net Settled</Text>
          <Text style={[s.amountValue, { color: THEME.brandDark, fontWeight: '800' }]}>
            ₹{item.netAmount.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
      <Text style={s.txCount}>{item.transactionCount} transactions · {item.bankAccount}</Text>
      {item.status === 'PENDING' && (
        <TouchableOpacity
          style={[s.reconcileBtn, reconcileMutation.isPending && { opacity: 0.6 }]}
          onPress={() => reconcileMutation.mutate(item.id)}
          disabled={reconcileMutation.isPending}
        >
          {reconcileMutation.isPending ? (
            <ActivityIndicator size="small" color={THEME.brandDark} />
          ) : (
            <Text style={s.reconcileBtnText}>Reconcile</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>PG Settlements</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color={THEME.brandDark} />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={s.summaryCard}>
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Gross</Text>
          <Text style={s.summaryValue}>₹{totalGross.toLocaleString('en-IN')}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>MDR+GST</Text>
          <Text style={[s.summaryValue, { color: THEME.lossDark }]}>-₹{totalMdr.toLocaleString('en-IN')}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <Text style={s.summaryLabel}>Net</Text>
          <Text style={[s.summaryValue, { color: THEME.brandDark }]}>₹{totalNet.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={THEME.brand} /></View>
      ) : settlements.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="card-outline" size={40} color={THEME.textMuted} />
          <Text style={s.emptyText}>No PG settlements recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={settlements}
          keyExtractor={(i) => i.id}
          renderItem={renderSettlement}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

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
              <Text style={s.sheetTitle}>New PG Settlement</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            {addError ? <Text style={s.inlineError}>{addError}</Text> : null}
            {[
              { label: 'Settlement Date (YYYY-MM-DD)', value: newDate, set: setNewDate, placeholder: '2026-10-28' },
              { label: 'UTR Number', value: newUtr, set: setNewUtr, placeholder: 'e.g. HDFC1234567890' },
              { label: 'Gross Amount (₹)', value: newGross, set: setNewGross, placeholder: '50000', kb: 'decimal-pad' },
              { label: 'MDR Amount (₹)', value: newMdr, set: setNewMdr, placeholder: '900', kb: 'decimal-pad' },
              { label: 'GST on MDR (₹)', value: newGstMdr, set: setNewGstMdr, placeholder: '162', kb: 'decimal-pad' },
              { label: 'Transaction Count', value: newTxCount, set: setNewTxCount, placeholder: '25', kb: 'number-pad' },
              { label: 'Bank Account', value: newBankAccount, set: setNewBankAccount, placeholder: 'SBI Current ...1234' },
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
              style={[s.submitBtn, addMutation.isPending && { opacity: 0.6 }]}
              onPress={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.submitBtnText}>Save Settlement</Text>}
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
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.surfaceMuted },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.brandLight },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular },
  summaryValue: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold, marginTop: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: THEME.border },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: THEME.border, padding: 14, gap: 8, ...SHADOWS.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardUtr: { fontSize: 13, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  cardDate: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reconBadge: { backgroundColor: '#D1FAE5' },
  reconText: { color: '#065F46', fontSize: 10, fontWeight: '700' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  pendingText: { color: '#92400E', fontSize: 10, fontWeight: '700' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  amountBreakdown: { gap: 6 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular },
  amountValue: { fontSize: 13, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  txCount: { fontSize: 11, color: THEME.textMuted, fontFamily: FONTS.regular },
  reconcileBtn: {
    backgroundColor: THEME.brandLight, borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: THEME.brandBorder,
  },
  reconcileBtnText: { fontSize: 13, fontWeight: '700', color: THEME.brandDark, fontFamily: FONTS.bold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: THEME.textSecondary, fontFamily: FONTS.medium },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, gap: 10,
    maxHeight: '90%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  inlineError: { fontSize: 13, color: THEME.lossDark, fontFamily: FONTS.medium },
  addField: { gap: 4 },
  addLabel: { fontSize: 12, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  addInput: {
    backgroundColor: THEME.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    fontSize: 13, color: THEME.textPrimary, fontFamily: FONTS.regular,
  },
  submitBtn: { backgroundColor: THEME.brand, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
