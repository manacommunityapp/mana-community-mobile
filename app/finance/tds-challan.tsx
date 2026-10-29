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
import { financeExtService, TdsChallan, TdsStatus } from '@/services/financeExtService';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const TDS_SECTIONS = ['194C', '194J', '194I', '194H'];

const STATUS_COLORS: Record<TdsStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#92400E' },
  DEPOSITED: { bg: '#DBEAFE', text: '#1D4ED8' },
  FILED: { bg: '#D1FAE5', text: '#065F46' },
};

function currentFY() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

export default function TdsChallanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filterYear, setFilterYear] = useState(currentFY());
  const [filterQuarter, setFilterQuarter] = useState<string | undefined>(undefined);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState<TdsChallan | null>(null);

  const [newYear, setNewYear] = useState(currentFY());
  const [newQuarter, setNewQuarter] = useState('Q1');
  const [newSection, setNewSection] = useState('194C');
  const [newAmount, setNewAmount] = useState('');
  const [newRemarks, setNewRemarks] = useState('');
  const [addError, setAddError] = useState('');

  const [depChallanNum, setDepChallanNum] = useState('');
  const [depBank, setDepBank] = useState('');
  const [depDate, setDepDate] = useState('');
  const [depError, setDepError] = useState('');

  const { data: challans = [], isLoading } = useQuery({
    queryKey: ['finance', 'tds', filterYear, filterQuarter],
    queryFn: () => financeExtService.getTdsChallans(filterYear, filterQuarter),
  });

  const pending = challans.filter((c) => c.status === 'PENDING').length;
  const deposited = challans.filter((c) => c.status === 'DEPOSITED').length;
  const filed = challans.filter((c) => c.status === 'FILED').length;

  const addMutation = useMutation({
    mutationFn: () =>
      financeExtService.createTdsChallan({
        financialYear: newYear,
        quarter: newQuarter,
        tdsSection: newSection,
        totalTdsAmount: parseFloat(newAmount) || 0,
        remarks: newRemarks,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'tds'] });
      setShowAddModal(false);
      setNewAmount(''); setNewRemarks(''); setAddError('');
    },
    onError: (err: any) => setAddError(err?.message || 'Failed to create challan.'),
  });

  const depositMutation = useMutation({
    mutationFn: () =>
      financeExtService.depositTdsChallan(
        selectedChallan!.id,
        depChallanNum,
        depBank,
        depDate,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'tds'] });
      setShowDepositModal(false);
      setSelectedChallan(null);
      setDepChallanNum(''); setDepBank(''); setDepDate(''); setDepError('');
    },
    onError: (err: any) => setDepError(err?.message || 'Failed to record deposit.'),
  });

  const renderChallan = ({ item }: { item: TdsChallan }) => {
    const col = STATUS_COLORS[item.status];
    return (
      <TouchableOpacity
        style={s.challanCard}
        onPress={() => {
          if (item.status === 'PENDING') {
            setSelectedChallan(item);
            setShowDepositModal(true);
          }
        }}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeText}>Sec {item.tdsSection}</Text>
            </View>
            <Text style={s.challanFY}>{item.financialYear} · {item.quarter}</Text>
          </View>
          <Text style={s.challanAmount}>₹{item.totalTdsAmount.toLocaleString('en-IN')}</Text>
          {item.challanNumber ? (
            <Text style={s.challanMeta}>Challan #{item.challanNumber} · {item.bankName}</Text>
          ) : null}
          {item.depositedDate ? (
            <Text style={s.challanMeta}>Deposited: {item.depositedDate}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={[s.statusBadge, { backgroundColor: col.bg }]}>
            <Text style={[s.statusBadgeText, { color: col.text }]}>{item.status}</Text>
          </View>
          {item.status === 'PENDING' && (
            <Ionicons name="chevron-forward" size={14} color={THEME.textSecondary} />
          )}
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
        <Text style={s.headerTitle}>TDS Challans</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={s.addBtn}>
          <Ionicons name="add" size={22} color={THEME.brandDark} />
        </TouchableOpacity>
      </View>

      {/* Filter Row */}
      <View style={s.filterRow}>
        <TextInput
          style={s.yearInput}
          value={filterYear}
          onChangeText={setFilterYear}
          placeholder="FY (2026-27)"
          placeholderTextColor={THEME.textMuted}
        />
        <View style={s.quarterTabs}>
          <TouchableOpacity
            style={[s.qTab, !filterQuarter && s.qTabActive]}
            onPress={() => setFilterQuarter(undefined)}
          >
            <Text style={[s.qTabText, !filterQuarter && s.qTabTextActive]}>All</Text>
          </TouchableOpacity>
          {QUARTERS.map((q) => (
            <TouchableOpacity
              key={q}
              style={[s.qTab, filterQuarter === q && s.qTabActive]}
              onPress={() => setFilterQuarter(q)}
            >
              <Text style={[s.qTabText, filterQuarter === q && s.qTabTextActive]}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary Row */}
      <View style={s.summaryRow}>
        <View style={[s.summaryChip, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[s.summaryText, { color: '#92400E' }]}>Pending: {pending}</Text>
        </View>
        <View style={[s.summaryChip, { backgroundColor: '#DBEAFE' }]}>
          <Text style={[s.summaryText, { color: '#1D4ED8' }]}>Deposited: {deposited}</Text>
        </View>
        <View style={[s.summaryChip, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[s.summaryText, { color: '#065F46' }]}>Filed: {filed}</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={THEME.brand} /></View>
      ) : challans.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="receipt-outline" size={40} color={THEME.textMuted} />
          <Text style={s.emptyText}>No TDS challans for this period.</Text>
        </View>
      ) : (
        <FlatList
          data={challans}
          keyExtractor={(i) => i.id}
          renderItem={renderChallan}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Challan Modal */}
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
              <Text style={s.sheetTitle}>New TDS Challan</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            {addError ? <Text style={s.inlineError}>{addError}</Text> : null}

            <View style={s.addField}>
              <Text style={s.addLabel}>Financial Year</Text>
              <TextInput style={s.addInput} value={newYear} onChangeText={setNewYear} placeholder="2026-27" placeholderTextColor={THEME.textMuted} />
            </View>

            <View style={s.addField}>
              <Text style={s.addLabel}>Quarter</Text>
              <View style={s.pickerRow}>
                {QUARTERS.map((q) => (
                  <TouchableOpacity key={q} style={[s.pickerChip, newQuarter === q && s.pickerChipActive]} onPress={() => setNewQuarter(q)}>
                    <Text style={[s.pickerChipText, newQuarter === q && s.pickerChipTextActive]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.addField}>
              <Text style={s.addLabel}>TDS Section</Text>
              <View style={s.pickerRow}>
                {TDS_SECTIONS.map((sec) => (
                  <TouchableOpacity key={sec} style={[s.pickerChip, newSection === sec && s.pickerChipActive]} onPress={() => setNewSection(sec)}>
                    <Text style={[s.pickerChipText, newSection === sec && s.pickerChipTextActive]}>{sec}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.addField}>
              <Text style={s.addLabel}>Total TDS Amount (₹)</Text>
              <TextInput style={s.addInput} value={newAmount} onChangeText={setNewAmount} placeholder="0" placeholderTextColor={THEME.textMuted} keyboardType="decimal-pad" />
            </View>

            <View style={s.addField}>
              <Text style={s.addLabel}>Remarks</Text>
              <TextInput style={s.addInput} value={newRemarks} onChangeText={setNewRemarks} placeholder="Optional" placeholderTextColor={THEME.textMuted} />
            </View>

            <TouchableOpacity
              style={[s.submitBtn, addMutation.isPending && { opacity: 0.6 }]}
              onPress={() => addMutation.mutate()}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.submitBtnText}>Create Challan</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deposit Modal */}
      <Modal
        visible={showDepositModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDepositModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Mark Deposited</Text>
              <TouchableOpacity onPress={() => setShowDepositModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>
            {selectedChallan && (
              <Text style={s.sheetSub}>
                Sec {selectedChallan.tdsSection} · ₹{selectedChallan.totalTdsAmount.toLocaleString('en-IN')}
              </Text>
            )}
            {depError ? <Text style={s.inlineError}>{depError}</Text> : null}
            {[
              { label: 'Challan Number (ITNS 281)', value: depChallanNum, set: setDepChallanNum, placeholder: 'e.g. 0000123456' },
              { label: 'Bank Name', value: depBank, set: setDepBank, placeholder: 'e.g. SBI' },
              { label: 'Deposited Date (YYYY-MM-DD)', value: depDate, set: setDepDate, placeholder: '2026-10-15' },
            ].map((f) => (
              <View key={f.label} style={s.addField}>
                <Text style={s.addLabel}>{f.label}</Text>
                <TextInput style={s.addInput} value={f.value} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={THEME.textMuted} />
              </View>
            ))}
            <TouchableOpacity
              style={[s.submitBtn, depositMutation.isPending && { opacity: 0.6 }]}
              onPress={() => depositMutation.mutate()}
              disabled={depositMutation.isPending}
            >
              {depositMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.submitBtnText}>Record Deposit</Text>}
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
  filterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  yearInput: {
    backgroundColor: THEME.surfaceMuted, borderRadius: 8, borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: THEME.textPrimary, fontFamily: FONTS.regular, width: 90,
  },
  quarterTabs: { flexDirection: 'row', gap: 6 },
  qTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.surfaceMuted },
  qTabActive: { backgroundColor: THEME.brandLight, borderColor: THEME.brandBorder },
  qTabText: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  qTabTextActive: { color: THEME.brandDark },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border },
  summaryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  summaryText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.semiBold },
  list: { padding: 16, gap: 10 },
  challanCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: THEME.border,
    padding: 14, ...SHADOWS.card,
  },
  sectionBadge: { backgroundColor: THEME.indigoLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  sectionBadgeText: { fontSize: 10.5, fontWeight: '700', color: THEME.indigo, fontFamily: FONTS.semiBold },
  challanFY: { fontSize: 12, color: THEME.textSecondary, fontFamily: FONTS.regular },
  challanAmount: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold, marginTop: 4 },
  challanMeta: { fontSize: 11, color: THEME.textMuted, fontFamily: FONTS.regular, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: THEME.textSecondary, fontFamily: FONTS.medium },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, gap: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: THEME.borderMedium, alignSelf: 'center', marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  sheetSub: { fontSize: 12.5, color: THEME.textSecondary, fontFamily: FONTS.medium },
  inlineError: { fontSize: 13, color: THEME.lossDark, fontFamily: FONTS.medium },
  addField: { gap: 4 },
  addLabel: { fontSize: 12, fontWeight: '600', color: THEME.textPrimary, fontFamily: FONTS.semiBold },
  addInput: {
    backgroundColor: THEME.surfaceMuted, borderRadius: 10, borderWidth: 1, borderColor: THEME.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 14, color: THEME.textPrimary, fontFamily: FONTS.regular,
  },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, backgroundColor: THEME.surfaceMuted },
  pickerChipActive: { backgroundColor: THEME.brandLight, borderColor: THEME.brandBorder },
  pickerChipText: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  pickerChipTextActive: { color: THEME.brandDark },
  submitBtn: { backgroundColor: THEME.brand, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
