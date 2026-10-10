import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
  RefreshControl, ScrollView, Platform, DimensionValue,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS, FONTS } from '@/constants/config';
import { GROWW_THEME } from '@/constants/theme';;
import { budgetService, BudgetAllocation } from '@/services/budgetService';

const CATEGORIES = [
  { value: 'CapEx_Asset', label: 'CapEx (Capital Assets)', icon: 'cube-outline' as const, color: GROWW_THEME.indigo, bg: GROWW_THEME.indigoLight },
  { value: 'OpEx_Maintenance', label: 'OpEx (Maintenance & AMCs)', icon: 'construct-outline' as const, color: '#EA580C', bg: '#FFF7ED' },
  { value: 'SECURITY', label: 'Security Services', icon: 'shield-checkmark-outline' as const, color: '#0284C7', bg: '#E0F2FE' },
  { value: 'CLEANING', label: 'Housekeeping & Sanitation', icon: 'sparkles-outline' as const, color: GROWW_THEME.brandDark, bg: GROWW_THEME.brandLight },
  { value: 'FESTIVAL', label: 'Festival Celebrations', icon: 'color-wand-outline' as const, color: '#DB2777', bg: '#FCE7F3' },
  { value: 'SPORTS', label: 'Sports & Amenities', icon: 'football-outline' as const, color: '#7C3AED', bg: '#F5F3FF' },
  { value: 'OpEx_Consumable', label: 'Supplies & Consumables', icon: 'cart-outline' as const, color: '#64748B', bg: '#F1F5F9' },
  { value: 'OpEx_Other', label: 'Other Operational Expenses', icon: 'receipt-outline' as const, color: '#D97706', bg: '#FFFBEB' },
];

export default function SocietyBudgetScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fy, setFy] = useState('FY 2026-27');
  const [modalVisible, setModalVisible] = useState(false);
  const [category, setCategory] = useState('OpEx_Maintenance');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const { data: budgets = [], isLoading, refetch } = useQuery<BudgetAllocation[]>({
    queryKey: ['society-budget-screen', fy],
    queryFn: () => budgetService.getBudgets(fy),
  });

  const allocateMutation = useMutation({
    mutationFn: (data: Parameters<typeof budgetService.allocateBudget>[0]) =>
      budgetService.allocateBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['society-budget-screen'] });
      setModalVisible(false);
      setAmount('');
      setNotes('');
      Alert.alert('Budget Allocated', 'Society budget allocation has been updated.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not allocate budget.'),
  });

  const totalAllocated = budgets.reduce((acc, b) => acc + (b.allocatedAmount || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spentAmount || 0), 0);
  const spendRatio = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  const handleSaveAllocation = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid allocation amount.');
      return;
    }
    allocateMutation.mutate({
      financialYear: fy,
      category: category,
      amount: amt,
      notes: notes.trim() || undefined,
    });
  };

  const progressFillWidth: DimensionValue = (Math.min(spendRatio, 100) + '%') as DimensionValue;

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/finance');
          }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={GROWW_THEME.textPrimary} />
        </TouchableOpacity>
        <View style={s.topNavTitleBox}>
          <Text style={s.topNavTitle}>Society Budgeting</Text>
          <Text style={s.topNavSubtitle}>{fy} Planning & Variance</Text>
        </View>
        <TouchableOpacity
          style={s.topNavIconBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={22} color={GROWW_THEME.brandDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[GROWW_THEME.brand]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={s.summaryCard}>
          <View style={s.summaryHeader}>
            <View>
              <Text style={s.summarySub}>Total Approved Budget</Text>
              <Text style={s.summaryAmount}>₹{totalAllocated.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.spendRatioBadge}>
              <Text style={s.spendRatioText}>{spendRatio.toFixed(1)}% Utilized</Text>
            </View>
          </View>

          {/* Groww Progress Bar */}
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: progressFillWidth }]} />
          </View>

          <View style={s.summaryDivider} />

          <View style={s.summaryMetricsRow}>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Total Incurred</Text>
              <Text style={s.metricValue}>₹{totalSpent.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Remaining Buffer</Text>
              <Text style={[s.metricValue, { color: GROWW_THEME.brandDark }]}>
                ₹{Math.max(totalAllocated - totalSpent, 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Category List */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Department Allocations</Text>
          <Text style={s.sectionCount}>{budgets.length} Categories</Text>
        </View>

        <View style={s.cardsList}>
          {budgets.map((b) => {
            const cfg = CATEGORIES.find(c => c.value === b.category) || CATEGORIES[0];
            const ratio = b.allocatedAmount > 0 ? (b.spentAmount / b.allocatedAmount) * 100 : 0;
            const isOver = b.spentAmount > b.allocatedAmount;
            const catFillWidth: DimensionValue = (Math.min(ratio, 100) + '%') as DimensionValue;

            return (
              <View key={b.id} style={s.catCard}>
                <View style={s.catHeader}>
                  <View style={[s.catIconBox, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={17} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.catTitle}>{cfg.label}</Text>
                    <Text style={s.catNotes}>{b.notes || 'Allocated for FY 2026-27'}</Text>
                  </View>
                  <View style={[s.statusPill, isOver ? s.statusOver : s.statusOk]}>
                    <Text style={[s.statusPillText, isOver ? s.textOver : s.textOk]}>
                      {isOver ? 'OVER BUDGET' : ratio.toFixed(0) + '%'}
                    </Text>
                  </View>
                </View>

                {/* Category Progress Bar */}
                <View style={s.catBarBg}>
                  <View style={[
                    s.catBarFill,
                    { width: catFillWidth, backgroundColor: isOver ? GROWW_THEME.loss : GROWW_THEME.brand }
                  ]} />
                </View>

                <View style={s.catFiguresRow}>
                  <Text style={s.catFigSpent}>Spent: ₹{b.spentAmount.toLocaleString('en-IN')}</Text>
                  <Text style={s.catFigAlloc}>Allocated: ₹{b.allocatedAmount.toLocaleString('en-IN')}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Add Allocation Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>Allocate Society Budget</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={GROWW_THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Category Choices */}
            <Text style={s.inputLabel}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[s.chipChoice, category === c.value && s.chipChoiceActive]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={[s.chipChoiceText, category === c.value && s.chipChoiceTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.inputLabel}>Allocated Amount (₹)</Text>
            <TextInput
              style={s.textInput}
              placeholder="e.g. 500000"
              placeholderTextColor={GROWW_THEME.textMuted}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={s.inputLabel}>Allocation Notes / Scope</Text>
            <TextInput
              style={s.textInput}
              placeholder="e.g. Annual lift and DG maintenance AMC"
              placeholderTextColor={GROWW_THEME.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={s.saveBtn}
              onPress={handleSaveAllocation}
              disabled={allocateMutation.isPending}
            >
              {allocateMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.saveBtnText}>Save Allocation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: GROWW_THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GROWW_THEME.surfaceMuted,
  },
  topNavTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: GROWW_THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  topNavSubtitle: {
    fontSize: 11,
    color: GROWW_THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  topNavIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GROWW_THEME.brandLight,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GROWW_THEME.border,
    padding: 16,
    ...SHADOWS.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summarySub: {
    fontSize: 12,
    color: GROWW_THEME.textSecondary,
    fontFamily: FONTS.medium,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: GROWW_THEME.textPrimary,
    marginTop: 4,
    fontFamily: FONTS.displayBold,
    fontVariant: ['tabular-nums'],
  },
  spendRatioBadge: {
    backgroundColor: GROWW_THEME.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  spendRatioText: {
    fontSize: 11,
    fontWeight: '700',
    color: GROWW_THEME.brandDark,
    fontFamily: FONTS.semiBold,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: GROWW_THEME.surfaceMuted,
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: GROWW_THEME.brand,
    borderRadius: 3,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: GROWW_THEME.border,
    marginVertical: 14,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: GROWW_THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: GROWW_THEME.textPrimary,
    marginTop: 2,
    fontFamily: FONTS.semiBold,
    fontVariant: ['tabular-nums'],
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: GROWW_THEME.border,
    marginHorizontal: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GROWW_THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  sectionCount: {
    fontSize: 12,
    color: GROWW_THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  cardsList: {
    gap: 10,
  },
  catCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GROWW_THEME.border,
    padding: 14,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: GROWW_THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  catNotes: {
    fontSize: 11,
    color: GROWW_THEME.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  statusOk: {
    backgroundColor: GROWW_THEME.brandLight,
  },
  textOk: {
    color: GROWW_THEME.brandDark,
  },
  statusOver: {
    backgroundColor: GROWW_THEME.lossLight,
  },
  textOver: {
    color: GROWW_THEME.lossDark,
  },
  catBarBg: {
    height: 4,
    backgroundColor: GROWW_THEME.surfaceMuted,
    borderRadius: 2,
    marginVertical: 10,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  catFiguresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catFigSpent: {
    fontSize: 11.5,
    color: GROWW_THEME.textSecondary,
    fontFamily: FONTS.regular,
    fontVariant: ['tabular-nums'],
  },
  catFigAlloc: {
    fontSize: 11.5,
    fontWeight: '600',
    color: GROWW_THEME.textPrimary,
    fontFamily: FONTS.semiBold,
    fontVariant: ['tabular-nums'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    gap: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: GROWW_THEME.borderMedium,
    alignSelf: 'center',
    marginBottom: 4,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: GROWW_THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: GROWW_THEME.textPrimary,
    fontFamily: FONTS.semiBold,
    marginTop: 4,
  },
  chipChoice: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: GROWW_THEME.border,
  },
  chipChoiceActive: {
    backgroundColor: GROWW_THEME.brandLight,
    borderColor: GROWW_THEME.brandBorder,
  },
  chipChoiceText: {
    fontSize: 11.5,
    color: GROWW_THEME.textSecondary,
  },
  chipChoiceTextActive: {
    fontWeight: '700',
    color: GROWW_THEME.brandDark,
  },
  textInput: {
    borderWidth: 1,
    borderColor: GROWW_THEME.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: GROWW_THEME.textPrimary,
    backgroundColor: '#FAFBFC',
  },
  saveBtn: {
    backgroundColor: GROWW_THEME.brand,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
});
