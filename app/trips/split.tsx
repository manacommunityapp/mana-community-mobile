import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  tripSplitService,
  SplitMethod,
  MyMoneyMode,
  ExpenseRequest,
  PaymentRequest,
} from '@/services/tripSplitService';

const CATEGORIES = [
  { code: 'ACCOMMODATION', label: 'Hotel & Stay', icon: 'bed-outline' },
  { code: 'TRANSPORT', label: 'Transport & Bus', icon: 'bus-outline' },
  { code: 'FUEL', label: 'Fuel & Gas', icon: 'car-outline' },
  { code: 'FOOD', label: 'Food & Dining', icon: 'restaurant-outline' },
  { code: 'ACTIVITIES', label: 'Activities & Sports', icon: 'trail-sign-outline' },
  { code: 'TICKETS', label: 'Tickets', icon: 'ticket-outline' },
  { code: 'SHOPPING', label: 'Shopping', icon: 'bag-handle-outline' },
  { code: 'MISCELLANEOUS', label: 'Miscellaneous', icon: 'receipt-outline' },
];

export default function TripSplitScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tripId: string; tripTitle?: string }>();
  const tripId = params.tripId || 'TRP-1';
  const tripTitle = params.tripTitle || 'Community Trip';

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EXPENSES' | 'SETTLEMENTS'>('OVERVIEW');
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [addExpenseModalVisible, setAddExpenseModalVisible] = useState(false);
  const [settleModalVisible, setSettleModalVisible] = useState(false);

  // Form: Expense
  const [expenseCat, setExpenseCat] = useState('FOOD');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<SplitMethod>('EQUAL');

  // Form: Payment
  const [payToUserId, setPayToUserId] = useState<number | null>(null);
  const [payToName, setPayToName] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payRef, setPayRef] = useState('');

  // ── Queries ─────────────────────────────────────────────────────────
  const {
    data: budget,
    isLoading: loadingBudget,
    refetch: refetchBudget,
  } = useQuery({
    queryKey: ['trip-split-budget', tripId],
    queryFn: () => tripSplitService.getBudget(tripId),
  });

  const {
    data: expenses = [],
    isLoading: loadingExpenses,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ['trip-split-expenses', tripId],
    queryFn: () => tripSplitService.getExpenses(tripId),
  });

  const {
    data: settlements = [],
    isLoading: loadingSettlements,
    refetch: refetchSettlements,
  } = useQuery({
    queryKey: ['trip-split-settlements', tripId],
    queryFn: () => tripSplitService.getSettlements(tripId),
  });

  const {
    data: payments = [],
    isLoading: loadingPayments,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['trip-split-payments', tripId],
    queryFn: () => tripSplitService.getPayments(tripId),
  });

  const {
    data: pref = { mode: 'OFF' as MyMoneyMode },
    refetch: refetchPrefs,
  } = useQuery({
    queryKey: ['trip-split-prefs', tripId],
    queryFn: () => tripSplitService.getMyMoneyPrefs(tripId),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchBudget(),
        refetchExpenses(),
        refetchSettlements(),
        refetchPayments(),
        refetchPrefs(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchBudget, refetchExpenses, refetchSettlements, refetchPayments, refetchPrefs]);

  // ── Mutations ───────────────────────────────────────────────────────
  const createExpenseMutation = useMutation({
    mutationFn: async (req: ExpenseRequest) => {
      return await tripSplitService.createExpense(tripId, req);
    },
    onSuccess: () => {
      setAddExpenseModalVisible(false);
      setExpenseDesc('');
      setExpenseAmount('');
      queryClient.invalidateQueries({ queryKey: ['trip-split-expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-split-budget', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-split-settlements', tripId] });
      Alert.alert('✅ Expense Logged', 'Trip split recalculation completed.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not record expense. Verify trip membership.');
    },
  });

  const voidExpenseMutation = useMutation({
    mutationFn: async (expenseId: number) => {
      return await tripSplitService.voidExpense(tripId, expenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-split-expenses', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-split-budget', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-split-settlements', tripId] });
      Alert.alert('Expense Voided', 'The expense has been removed from trip balances.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not void expense.');
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (req: PaymentRequest) => {
      return await tripSplitService.recordPayment(tripId, req);
    },
    onSuccess: () => {
      setSettleModalVisible(false);
      setPayAmount('');
      setPayRef('');
      queryClient.invalidateQueries({ queryKey: ['trip-split-payments', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-split-settlements', tripId] });
      Alert.alert('💸 Payment Recorded', 'Recipient will be prompted to confirm once received.');
    },
    onError: (err: any) => {
      Alert.alert('Payment Error', err?.message || 'Could not record reimbursement.');
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return await tripSplitService.confirmPayment(tripId, paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-split-payments', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-split-budget', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trip-split-settlements', tripId] });
      Alert.alert('Confirmed', 'Reimbursement confirmed and applied to balances.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not confirm payment.');
    },
  });

  const prefMutation = useMutation({
    mutationFn: async (mode: MyMoneyMode) => {
      return await tripSplitService.setMyMoneyPrefs(tripId, mode);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trip-split-prefs', tripId] });
      Alert.alert('Preference Saved', `My Money sync mode set to ${data.mode}.`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not update My Money preference.');
    },
  });

  const handleAddExpense = () => {
    const amt = parseFloat(expenseAmount);
    if (!expenseDesc.trim()) {
      Alert.alert('Required', 'Please enter a description for the expense.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    createExpenseMutation.mutate({
      categoryCode: expenseCat,
      description: expenseDesc.trim(),
      totalAmount: amt,
      splitMethod: expenseMethod,
    });
  };

  const handleRecordPayment = () => {
    const amt = parseFloat(payAmount);
    if (!payToUserId || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid', 'Please specify a recipient and valid payment amount.');
      return;
    }

    recordPaymentMutation.mutate({
      toUserId: payToUserId,
      amount: amt,
      method: payMethod,
      reference: payRef.trim() || undefined,
    });
  };

  const currentUserId = user?.id || (user as any)?.userId;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* ── Hero Banner ── */}
      <LinearGradient colors={GRADIENTS.hero} style={styles.heroBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroBadge}>
          <Ionicons name="wallet-outline" size={14} color="#FFFFFF" />
          <Text style={styles.heroBadgeText}>Mana Trip Split</Text>
        </View>
        <Text style={styles.heroTitle} numberOfLines={1}>{tripTitle}</Text>
        <Text style={styles.heroSubtitle}>Group travel budgeting, split calculation &amp; debt minimization</Text>
      </LinearGradient>

      {/* ── Segment Tabs ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.tabItemActive]}
          onPress={() => setActiveTab('OVERVIEW')}
        >
          <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'EXPENSES' && styles.tabItemActive]}
          onPress={() => setActiveTab('EXPENSES')}
        >
          <Text style={[styles.tabText, activeTab === 'EXPENSES' && styles.tabTextActive]}>
            Expenses ({expenses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'SETTLEMENTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('SETTLEMENTS')}
        >
          <Text style={[styles.tabText, activeTab === 'SETTLEMENTS' && styles.tabTextActive]}>
            Settlements ({settlements.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ════════ TAB 1: OVERVIEW ════════ */}
      {activeTab === 'OVERVIEW' && (
        <View style={styles.tabContentWrap}>
          {/* Your Position KPI */}
          <View style={styles.positionCard}>
            <View style={styles.positionHeader}>
              <View style={styles.rowAlign}>
                <Ionicons name="person-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.positionTitle}>Your Position</Text>
              </View>
              {budget && (
                <View
                  style={[
                    styles.statusPill,
                    budget.youReceive > 0
                      ? styles.statusPillGreen
                      : budget.youOwe > 0
                      ? styles.statusPillRed
                      : styles.statusPillGray,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      budget.youReceive > 0
                        ? { color: '#059669' }
                        : budget.youOwe > 0
                        ? { color: '#DC2626' }
                        : { color: COLORS.textMuted },
                    ]}
                  >
                    {budget.youReceive > 0
                      ? `Receives ₹${budget.youReceive.toLocaleString()}`
                      : budget.youOwe > 0
                      ? `Owes ₹${budget.youOwe.toLocaleString()}`
                      : 'Settled Up'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.positionStatsGrid}>
              <View style={styles.posStatBox}>
                <Text style={styles.posStatLabel}>Your Share</Text>
                <Text style={styles.posStatVal}>₹{budget?.yourShare?.toLocaleString() || '0'}</Text>
              </View>
              <View style={styles.posStatBox}>
                <Text style={styles.posStatLabel}>You Paid</Text>
                <Text style={styles.posStatVal}>₹{budget?.youPaid?.toLocaleString() || '0'}</Text>
              </View>
              <View style={styles.posStatBox}>
                <Text style={styles.posStatLabel}>You Receive</Text>
                <Text style={[styles.posStatVal, { color: '#059669' }]}>
                  ₹{budget?.youReceive?.toLocaleString() || '0'}
                </Text>
              </View>
              <View style={styles.posStatBox}>
                <Text style={styles.posStatLabel}>You Owe</Text>
                <Text style={[styles.posStatVal, { color: '#DC2626' }]}>
                  ₹{budget?.youOwe?.toLocaleString() || '0'}
                </Text>
              </View>
            </View>
          </View>

          {/* Overall Budget Tracker */}
          <View style={styles.budgetOverviewCard}>
            <Text style={styles.cardHeaderTitle}>Trip Budget vs Spend</Text>
            <View style={styles.budgetRow}>
              <View>
                <Text style={styles.budgetSub}>Total Spent</Text>
                <Text style={styles.spentAmount}>₹{budget?.spent?.toLocaleString() || '0'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.budgetSub}>Estimated Budget</Text>
                <Text style={styles.budgetAmount}>
                  {budget?.estimated != null ? `₹${budget.estimated.toLocaleString()}` : 'Uncapped'}
                </Text>
              </View>
            </View>

            {budget?.unsplit != null && budget.unsplit > 0 && (
              <View style={styles.unsplitNotice}>
                <Ionicons name="information-circle-outline" size={14} color="#D97706" />
                <Text style={styles.unsplitNoticeText}>
                  ₹{budget.unsplit.toLocaleString()} in unsplit expenses awaiting division
                </Text>
              </View>
            )}
          </View>

          {/* Spending by Category */}
          {budget?.spentByCategory && Object.keys(budget.spentByCategory).length > 0 && (
            <View style={styles.categoryCard}>
              <Text style={styles.cardHeaderTitle}>Spending by Category</Text>
              {Object.entries(budget.spentByCategory).map(([cat, amt]) => {
                const total = budget.spent || 1;
                const pct = Math.min(100, Math.round((amt / total) * 100));
                return (
                  <View key={cat} style={styles.catItem}>
                    <View style={styles.catItemHeader}>
                      <Text style={styles.catItemName}>{cat}</Text>
                      <Text style={styles.catItemVal}>₹{amt.toLocaleString()} ({pct}%)</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* My Money Opt-In Preference */}
          <View style={styles.prefCard}>
            <View style={styles.rowAlign}>
              <Ionicons name="shield-checkmark" size={18} color="#4F46E5" />
              <Text style={styles.prefTitle}>My Money Privacy &amp; Opt-In</Text>
            </View>
            <Text style={styles.prefDesc}>
              Personal finance data stays strictly isolated. Select how you want this trip to reflect in your My Money dashboard:
            </Text>

            <View style={styles.prefButtonsRow}>
              {(['OFF', 'SHARE', 'SETTLEMENTS'] as MyMoneyMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.prefBtn,
                    pref.mode === mode && styles.prefBtnActive,
                  ]}
                  onPress={() => prefMutation.mutate(mode)}
                  disabled={prefMutation.isPending}
                >
                  <Text style={[styles.prefBtnText, pref.mode === mode && styles.prefBtnTextActive]}>
                    {mode === 'SHARE' ? 'SHARE (Rec)' : mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ════════ TAB 2: EXPENSES ════════ */}
      {activeTab === 'EXPENSES' && (
        <View style={styles.tabContentWrap}>
          <TouchableOpacity
            style={styles.addExpenseBannerBtn}
            onPress={() => setAddExpenseModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addExpenseBannerText}>Record Trip Expense</Text>
          </TouchableOpacity>

          {expenses.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Expenses Recorded</Text>
              <Text style={styles.emptySub}>Tap above to log hotel, fuel, food, or activity expenses.</Text>
            </View>
          ) : (
            expenses.map((exp) => (
              <View key={exp.id} style={[styles.expenseCard, exp.status === 'VOIDED' && { opacity: 0.5 }]}>
                <View style={styles.expenseTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowAlign}>
                      <Text style={styles.expenseDesc}>{exp.description}</Text>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{exp.categoryCode}</Text>
                      </View>
                      {exp.status === 'UNSPLIT' && (
                        <View style={[styles.catBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Text style={[styles.catBadgeText, { color: '#B45309' }]}>SPLIT LATER</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.expenseMeta}>
                      Paid by {exp.paidByName} • {exp.expenseDate}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.expenseAmount}>₹{exp.totalAmount.toLocaleString()}</Text>
                    {exp.status === 'ACTIVE' && (
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert('Void Expense', 'Void this expense from balances?', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Void', style: 'destructive', onPress: () => voidExpenseMutation.mutate(exp.id) },
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#DC2626" style={{ marginTop: 4 }} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* ════════ TAB 3: SETTLEMENTS ════════ */}
      {activeTab === 'SETTLEMENTS' && (
        <View style={styles.tabContentWrap}>
          <View style={styles.settleBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settleBannerTitle}>Optimized Direct Transfers</Text>
              <Text style={styles.settleBannerSub}>
                Calculated by the engine to settle all balances in the minimum transactions.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settleNowBtn}
              onPress={() => {
                if (settlements.length > 0) {
                  setPayToUserId(settlements[0].toUserId);
                  setPayToName(settlements[0].toName);
                  setPayAmount(String(settlements[0].amount));
                }
                setSettleModalVisible(true);
              }}
            >
              <Text style={styles.settleNowText}>Settle Up</Text>
            </TouchableOpacity>
          </View>

          {settlements.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="checkmark-circle" size={40} color="#059669" />
              <Text style={styles.emptyTitle}>All Balances Settled!</Text>
              <Text style={styles.emptySub}>No participant owes any money on this trip.</Text>
            </View>
          ) : (
            settlements.map((t, idx) => (
              <View key={idx} style={styles.transferCard}>
                <View style={styles.transferRow}>
                  <Text style={styles.transferFrom}>{t.fromName}</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} style={{ marginHorizontal: 8 }} />
                  <Text style={styles.transferTo}>{t.toName}</Text>
                </View>
                <Text style={styles.transferAmount}>₹{t.amount.toLocaleString()}</Text>
              </View>
            ))
          )}

          {/* Pending / Confirmed Payments */}
          {payments.length > 0 && (
            <View style={{ marginTop: SPACING.md }}>
              <Text style={styles.sectionHeaderTitle}>Reimbursement History</Text>
              {payments.map((p) => {
                const canConfirm =
                  p.status === 'PENDING' &&
                  (String(p.toUserId) === String(currentUserId) || (user as any)?.isAdmin);

                return (
                  <View key={p.id} style={styles.paymentCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentCardTitle}>
                        {p.fromName} → {p.toName}
                      </Text>
                      <Text style={styles.paymentCardMeta}>
                        Status: {p.status} • Method: {p.method || 'Direct'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.paymentCardAmount}>₹{p.amount.toLocaleString()}</Text>
                      {canConfirm && (
                        <TouchableOpacity
                          style={styles.confirmSmallBtn}
                          onPress={() => confirmPaymentMutation.mutate(p.id)}
                        >
                          <Text style={styles.confirmSmallBtnText}>Confirm</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ── MODAL: RECORD EXPENSE ── */}
      <Modal visible={addExpenseModalVisible} transparent animationType="slide" onRequestClose={() => setAddExpenseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Trip Expense</Text>
              <TouchableOpacity onPress={() => setAddExpenseModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.catChip, expenseCat === c.code && styles.catChipActive]}
                    onPress={() => setExpenseCat(c.code)}
                  >
                    <Text style={[styles.catChipText, expenseCat === c.code && styles.catChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Resort booking, Dinner, Fuel"
                placeholderTextColor={COLORS.textMuted}
                value={expenseDesc}
                onChangeText={setExpenseDesc}
              />

              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
                value={expenseAmount}
                onChangeText={setExpenseAmount}
              />

              <Text style={styles.fieldLabel}>Split Method</Text>
              <View style={styles.splitRow}>
                {(['EQUAL', 'SHARES', 'EXACT', 'PERCENTAGE'] as SplitMethod[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.splitChip, expenseMethod === m && styles.splitChipActive]}
                    onPress={() => setExpenseMethod(m)}
                  >
                    <Text style={[styles.splitChipText, expenseMethod === m && styles.splitChipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setAddExpenseModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleAddExpense}
                  disabled={createExpenseMutation.isPending}
                >
                  {createExpenseMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Save Expense</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: SETTLE UP / RECORD PAYMENT ── */}
      <Modal visible={settleModalVisible} transparent animationType="slide" onRequestClose={() => setSettleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Reimbursement</Text>
              <TouchableOpacity onPress={() => setSettleModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Select Recipient</Text>
              {settlements.map((s) => (
                <TouchableOpacity
                  key={s.toUserId}
                  style={[styles.recipientItem, payToUserId === s.toUserId && styles.recipientItemActive]}
                  onPress={() => {
                    setPayToUserId(s.toUserId);
                    setPayToName(s.toName);
                    setPayAmount(String(s.amount));
                  }}
                >
                  <Text style={styles.recipientName}>{s.toName}</Text>
                  <Text style={styles.recipientAmount}>Owed ₹{s.amount.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.fieldLabel}>Amount Paid (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textMuted}
                value={payAmount}
                onChangeText={setPayAmount}
              />

              <Text style={styles.fieldLabel}>Reference / UPI UTR</Text>
              <TextInput
                style={styles.textInput}
                placeholder="UPI Reference (optional)"
                placeholderTextColor={COLORS.textMuted}
                value={payRef}
                onChangeText={setPayRef}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSettleModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleRecordPayment}
                  disabled={recordPaymentMutation.isPending}
                >
                  {recordPaymentMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitBtnText}>Record Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: SPACING.xl * 2,
  },
  heroBanner: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginBottom: 6,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: -SPACING.md,
    borderRadius: RADIUS.lg,
    padding: 4,
    ...SHADOWS.sm,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  tabItemActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabContentWrap: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  positionCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  positionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusPillGreen: {
    backgroundColor: '#D1FAE5',
  },
  statusPillRed: {
    backgroundColor: '#FEE2E2',
  },
  statusPillGray: {
    backgroundColor: '#F3F4F6',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  positionStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  posStatBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  posStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  posStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  budgetOverviewCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  budgetSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  spentAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
  },
  budgetAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  unsplitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  unsplitNoticeText: {
    fontSize: 11,
    color: '#D97706',
  },
  categoryCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catItem: {
    marginTop: 8,
  },
  catItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  catItemVal: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  catBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
  },
  catBarFill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  prefCard: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#312E81',
  },
  prefDesc: {
    fontSize: 11,
    color: '#4338CA',
    marginTop: 4,
    lineHeight: 16,
  },
  prefButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  prefBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  prefBtnActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  prefBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  prefBtnTextActive: {
    color: '#FFFFFF',
  },
  addExpenseBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  addExpenseBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyWrap: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  expenseCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expenseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  catBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  catBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  expenseMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  settleBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  settleBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  settleBannerSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  settleNowBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  settleNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  transferCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferFrom: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  transferTo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  transferAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  paymentCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  paymentCardMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  paymentCardAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },
  confirmSmallBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginTop: 3,
  },
  confirmSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  catChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginRight: 6,
  },
  catChipActive: {
    backgroundColor: COLORS.primary,
  },
  catChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  splitChip: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  splitChipActive: {
    backgroundColor: '#059669',
  },
  splitChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  splitChipTextActive: {
    color: '#FFFFFF',
  },
  recipientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: 6,
  },
  recipientItemActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  recipientName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  recipientAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: '#059669',
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
