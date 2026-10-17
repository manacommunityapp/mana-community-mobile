import { personalFinanceService } from '@/services/personalFinanceService';
import { useState, useCallback, useMemo } from 'react';
import { usePathname } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, RefreshControl, Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  maintenanceDuesService,
  MaintenanceBillDto,
  PaymentVerificationRequest,
} from '@/services/maintenanceDuesService';

const FINANCE_HUBS = [
  { emoji: '🏦', label: 'Treasury',   color: THEME.indigo,   bg: THEME.indigoLight, route: '/finance/society-dashboard' },
  { emoji: '💳', label: 'Pay Dues',   color: THEME.brandDark, bg: THEME.brandLight,  route: '/finance' },
  { emoji: '⚡', label: 'Pay Bills',  color: '#D97706',            bg: '#FFFBEB',              route: '/bbps' },
  { emoji: '📱', label: 'Recharge',   color: '#0284C7',            bg: '#F0F9FF',              route: '/recharge' },
  { emoji: '📷', label: 'Scan & Pay', color: '#7C3AED',  bg: '#F5F3FF',  route: '/scan-and-pay' },
  { emoji: '🪙', label: 'Gold',       color: '#B45309',  bg: '#FFFBEB',  route: '/gold' },
  { emoji: '📈', label: 'Mutual Funds',color: '#1D4ED8', bg: '#EFF6FF',  route: '/mutual-funds' },
  { emoji: '🤝', label: 'Split Bill', color: '#16A34A',  bg: '#F0FDF4',  route: '/split-bill' },
  { emoji: '🎬', label: 'Movies',    color: '#DC2626',  bg: '#FEF2F2',  route: '/movies' },
  { emoji: '📑', label: 'Budget',     color: '#EA580C',  bg: '#FFF7ED',  route: '/finance/budget' },
  { emoji: '📊', label: 'Reports',    color: '#D97706',            bg: '#FFFBEB',              route: '/finance/society-reports' },
  { emoji: '📋', label: 'Invoices',   color: '#0284C7',            bg: '#E0F2FE',              route: '/finance/invoices' },
  { emoji: '👥', label: 'Vendors',    color: '#7C3AED',            bg: '#F5F3FF',              route: '/finance/vendors' },
  { emoji: '✅', label: 'Approvals',  color: '#DC2626',            bg: '#FEF2F2',              route: '/finance/expenses' },
  { emoji: '💰', label: 'My Money',   color: THEME.brandDark, bg: THEME.brandLight,  route: '/personal-finance' },
] as const;

export default function MaintenanceDuesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [isPayModal, setIsPayModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'WALLET' | 'CARD'>('UPI');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [receiptModalBill, setReceiptModalBill] = useState<MaintenanceBillDto | null>(null);

  const {
    data: pendingBills = [],
    isLoading: loadingPending,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['maintenance-bills-pending'],
    queryFn: maintenanceDuesService.getPendingBills,
  });

  const {
    data: historyBills = [],
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['maintenance-bills-history'],
    queryFn: maintenanceDuesService.getPaymentHistory,
  });

  const {
    data: walletData,
    isLoading: loadingWallet,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: maintenanceDuesService.getWalletBalance,
  });

  const walletBalance = walletData?.balance ?? 0;

  const activeBill = useMemo(() => {
    if (selectedBillId) {
      const match = pendingBills.find(b => b.id === selectedBillId);
      if (match) return match;
    }
    if (pendingBills.length > 0) return pendingBills[0];
    if (historyBills.length > 0) return historyBills[0];
    return null;
  }, [pendingBills, historyBills, selectedBillId]);

  const chargesList = useMemo(() => {
    if (!activeBill) return [];
    if (activeBill.charges && activeBill.charges.length > 0) return activeBill.charges;
    const list: { item: string; amount: number }[] = [];
    if (activeBill.maintenanceAmount) list.push({ item: 'Society Maintenance Fee', amount: activeBill.maintenanceAmount });
    if (activeBill.waterCharges) list.push({ item: 'Water Consumption Charges', amount: activeBill.waterCharges });
    if (activeBill.sinkingFund) list.push({ item: 'Sinking Fund Reserve', amount: activeBill.sinkingFund });
    if (activeBill.penaltyLateFee) list.push({ item: 'Late Penalty Surcharge', amount: activeBill.penaltyLateFee });
    if (list.length === 0 && activeBill.totalAmount) {
      list.push({ item: 'Monthly Maintenance Demand', amount: activeBill.totalAmount });
    }
    return list;
  }, [activeBill]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPending(), refetchHistory(), refetchWallet()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPending, refetchHistory, refetchWallet]);

  const initiatePaymentMutation = useMutation({
    mutationFn: (billId: string) => maintenanceDuesService.initiatePayment(billId),
    onSuccess: (order) => {
      Alert.alert(
        'Payment Gateway Initiated',
        'Order ID: ' + order.orderId + '\nAmount: ₹' + order.amount.toLocaleString('en-IN') + '\nOpening payment checkout...',
        [
          {
            text: 'Simulate Success',
            onPress: () => {
              verifyPaymentMutation.mutate({
                billId: activeBill?.id || 'bill-1',
                orderId: order.orderId,
                paymentId: 'pay_mock_' + Math.random().toString(36).substring(2, 9),
                signature: 'sig_mock_verified',
                method: selectedMethod,
              });
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert('Payment Error', err?.message || 'Failed to initiate payment.');
    },
  });

  const payWalletMutation = useMutation({
    mutationFn: ({ billId, amount }: { billId: string; amount: number }) =>
      maintenanceDuesService.payWithWallet(billId, amount),
    onSuccess: () => {
      setIsPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['maintenance-bills-pending'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-bills-history'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      Alert.alert('Payment Successful', 'Bill cleared using Advance Wallet balance.');
    },
    onError: (err: any) => {
      Alert.alert('Wallet Payment Failed', err?.message || 'Insufficient wallet balance or error.');
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (req: PaymentVerificationRequest) => maintenanceDuesService.verifyPayment(req),
    onSuccess: () => {
      setIsPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['maintenance-bills-pending'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-bills-history'] });
      Alert.alert('Payment Verified', 'Your maintenance payment has been successfully recorded.');
    },
    onError: (err: any) => {
      Alert.alert('Verification Failed', err?.message || 'Payment could not be verified.');
    },
  });

  const handlePayPress = () => {
    if (!activeBill) return;
    setIsPayModal(true);
  };

  const handleConfirmPay = () => {
    if (!activeBill) return;
    if (selectedMethod === 'WALLET') {
      payWalletMutation.mutate({ billId: activeBill.id, amount: activeBill.totalAmount });
    } else {
      initiatePaymentMutation.mutate(activeBill.id);
    }
  };

  const handleDownloadReceipt = async (bill: MaintenanceBillDto) => {
    try {
      const res = await maintenanceDuesService.downloadReceipt(bill.id);
      if (res && res.downloadUrl && (await Linking.canOpenURL(res.downloadUrl))) {
        Linking.openURL(res.downloadUrl);
      } else {
        setReceiptModalBill(bill);
      }
    } catch {
      setReceiptModalBill(bill);
    }
  };

  const totalOutstanding = useMemo(() => {
    return pendingBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  }, [pendingBills]);

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/tabs/feed');
          }}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={s.topNavTitleBox}>
          <Text style={s.topNavTitle}>Society Finance</Text>
          <Text style={s.topNavSubtitle}>Mana Community Treasury & Dues</Text>
        </View>
        <TouchableOpacity
          style={s.topNavIconBtn}
          onPress={() => router.push('/finance/society-dashboard' as any)}
        >
          <Ionicons name="stats-chart-outline" size={19} color={THEME.brandDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.brand]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Pill Navigation Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.hubsScroll}
        >
          {FINANCE_HUBS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[s.hubPill, pathname === item.route && s.hubPillActive]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <Text style={s.hubEmoji}>{item.emoji}</Text>
              <Text style={[s.hubLabel, pathname === item.route && s.hubLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Portfolio Balance Hero Card */}
        <View style={s.portfolioCard}>
          <View style={s.portfolioHeader}>
            <View>
              <Text style={s.portfolioSub}>Current Outstanding Dues</Text>
              <Text style={s.portfolioAmount}>
                ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[s.gainBadge, totalOutstanding > 0 ? s.dueBadge : s.clearBadge]}>
              <Ionicons
                name={totalOutstanding > 0 ? "alert-circle" : "checkmark-circle"}
                size={13}
                color={totalOutstanding > 0 ? THEME.lossDark : THEME.brandDark}
              />
              <Text style={[s.gainBadgePillText, totalOutstanding > 0 ? s.dueBadgeText : s.clearBadgeText]}>
                {totalOutstanding > 0 ? 'Due This Month' : 'All Cleared'}
              </Text>
            </View>
          </View>

          <View style={s.portfolioDivider} />

          {/* Quick Metrics Strip */}
          <View style={s.metricsRow}>
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Advance Wallet</Text>
              <Text style={s.metricValue}>₹{walletBalance.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Pending Invoices</Text>
              <Text style={s.metricValue}>{pendingBills.length} Bills</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metricItem}>
              <Text style={s.metricLabel}>Unit Assigned</Text>
              <Text style={s.metricValue}>T-{user?.tower || 'A'} #{user?.flatNumber || '1204'}</Text>
            </View>
          </View>
        </View>

        {/* Society Treasury & ERP Quick Access Banner */}
        <TouchableOpacity
          style={s.treasuryBanner}
          onPress={() => router.push('/finance/society-dashboard' as any)}
          activeOpacity={0.8}
        >
          <View style={s.treasuryIconBox}>
            <Ionicons name="business" size={18} color={THEME.brandDark} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.treasuryTitle}>Society Treasury & ERP</Text>
              <View style={s.erpBadgePill}>
                <Text style={s.erpBadgeText}>ERP</Text>
              </View>
            </View>
            <Text style={s.treasurySub}>Collections, Sinking Funds & TDS Compliance</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={THEME.textSecondary} />
        </TouchableOpacity>

        {/* Active Bill Breakdown Card */}
        {activeBill ? (
          <View style={s.billCard}>
            <View style={s.billCardHeader}>
              <View>
                <Text style={s.billTitle}>{activeBill.billNumber || activeBill.monthYear + ' Maintenance'}</Text>
                <Text style={s.billSubtitle}>Due Date: {activeBill.dueDate ? new Date(activeBill.dueDate).toLocaleDateString() : '15th of month'}</Text>
              </View>
              <View style={[s.billStatusPill, activeBill.status === 'PAID' ? s.pillPaid : s.pillPending]}>
                <Text style={[s.billStatusPillText, activeBill.status === 'PAID' ? s.textPaid : s.textPending]}>
                  {activeBill.status === 'PAID' ? 'PAID' : 'PENDING'}
                </Text>
              </View>
            </View>

            <View style={s.chargesDivider} />

            {/* Charges Breakdown Table */}
            <View style={s.chargesTable}>
              {chargesList.map((charge, idx) => (
                <View key={idx} style={s.chargeRow}>
                  <Text style={s.chargeItem}>{charge.item}</Text>
                  <Text style={s.chargeAmount}>₹{charge.amount.toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>

            <View style={s.totalDivider} />

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Demand</Text>
              <Text style={s.totalValue}>₹{(activeBill.totalAmount || 0).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        ) : (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={44} color={THEME.brand} />
            <Text style={s.emptyTitle}>No Pending Invoices</Text>
            <Text style={s.emptySub}>You have settled all your society maintenance dues.</Text>
          </View>
        )}

        {/* Payment History */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => router.push('/finance/society-reports' as any)}>
            <Text style={s.sectionLink}>View Ledger →</Text>
          </TouchableOpacity>
        </View>

        {historyBills.length === 0 ? (
          <View style={s.noHistoryCard}>
            <Text style={s.noHistoryText}>No past payment transactions recorded.</Text>
          </View>
        ) : (
          <View style={s.historyContainer}>
            {historyBills.slice(0, 5).map((bill, index) => (
              <View key={bill.id}>
                <TouchableOpacity
                  style={s.historyRow}
                  activeOpacity={0.7}
                  onPress={() => handleDownloadReceipt(bill)}
                >
                  <View style={s.historyIconBox}>
                    <Ionicons name="receipt-outline" size={17} color={THEME.brandDark} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.historyTitle}>{bill.monthYear || 'Society Maintenance'}</Text>
                    <Text style={s.historyDate}>{bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : 'Paid'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.historyAmount}>₹{(bill.totalAmount || 0).toLocaleString('en-IN')}</Text>
                    <Text style={s.historyReceiptLink}>Receipt ↓</Text>
                  </View>
                </TouchableOpacity>
                {index < historyBills.length - 1 && <View style={s.historyDivider} />}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Floating Action Bar */}
      {activeBill && activeBill.status !== 'PAID' && (
        <View style={s.stickyFooter}>
          <View style={s.stickyPriceBox}>
            <Text style={s.stickyPriceLabel}>Amount Payable</Text>
            <Text style={s.stickyPriceValue}>₹{(activeBill.totalAmount || 0).toLocaleString('en-IN')}</Text>
          </View>
          <TouchableOpacity
            style={s.payBtn}
            onPress={handlePayPress}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={16} color="#FFFFFF" />
            <Text style={s.payBtnText}>Pay Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Checkout Bottom Sheet Modal */}
      <Modal
        visible={isPayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPayModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>Choose Payment Method</Text>
              <TouchableOpacity onPress={() => setIsPayModal(false)}>
                <Ionicons name="close" size={22} color={THEME.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalBillTitle}>
              {activeBill?.monthYear} Maintenance Demand: ₹{(activeBill?.totalAmount || 0).toLocaleString('en-IN')}
            </Text>

            {/* Methods */}
            <View style={s.methodsList}>
              <TouchableOpacity
                style={[s.methodCard, selectedMethod === 'UPI' && s.methodCardActive]}
                onPress={() => setSelectedMethod('UPI')}
              >
                <View style={s.methodIconBox}>
                  <Ionicons name="qr-code-outline" size={20} color={THEME.brandDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.methodName}>Instant UPI (GPay / PhonePe / Paytm)</Text>
                  <Text style={s.methodSub}>Zero convenience fee</Text>
                </View>
                <Ionicons
                  name={selectedMethod === 'UPI' ? "radio-button-on" : "radio-button-off"}
                  size={19}
                  color={selectedMethod === 'UPI' ? THEME.brand : THEME.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.methodCard, selectedMethod === 'WALLET' && s.methodCardActive]}
                onPress={() => setSelectedMethod('WALLET')}
              >
                <View style={s.methodIconBox}>
                  <Ionicons name="wallet-outline" size={20} color={THEME.indigo} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.methodName}>Advance Wallet Balance</Text>
                  <Text style={s.methodSub}>Available: ₹{walletBalance.toLocaleString('en-IN')}</Text>
                </View>
                <Ionicons
                  name={selectedMethod === 'WALLET' ? "radio-button-on" : "radio-button-off"}
                  size={19}
                  color={selectedMethod === 'WALLET' ? THEME.brand : THEME.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.methodCard, selectedMethod === 'CARD' && s.methodCardActive]}
                onPress={() => setSelectedMethod('CARD')}
              >
                <View style={s.methodIconBox}>
                  <Ionicons name="card-outline" size={20} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.methodName}>Debit / Credit Card / NetBanking</Text>
                  <Text style={s.methodSub}>All major Indian banks supported</Text>
                </View>
                <Ionicons
                  name={selectedMethod === 'CARD' ? "radio-button-on" : "radio-button-off"}
                  size={19}
                  color={selectedMethod === 'CARD' ? THEME.brand : THEME.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.modalConfirmBtn}
              onPress={handleConfirmPay}
              disabled={initiatePaymentMutation.isPending || payWalletMutation.isPending}
            >
              {initiatePaymentMutation.isPending || payWalletMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.modalConfirmBtnText}>Proceed to Pay ₹{(activeBill?.totalAmount || 0).toLocaleString('en-IN')}</Text>
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
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  topNavTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  topNavTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  topNavSubtitle: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  topNavIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.brandLight,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  hubsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  hubPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  hubPillActive: {
    backgroundColor: THEME.brandLight,
    borderColor: THEME.brandBorder,
  },
  hubEmoji: {
    fontSize: 14,
  },
  hubLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  hubLabelActive: {
    color: THEME.brandDark,
  },
  portfolioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    ...SHADOWS.card,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  portfolioSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  portfolioAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.textPrimary,
    marginTop: 4,
    fontFamily: FONTS.displayBold,
    fontVariant: ['tabular-nums'],
  },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gainBadgePillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  dueBadge: {
    backgroundColor: THEME.lossLight,
  },
  dueBadgeText: {
    color: THEME.lossDark,
  },
  clearBadge: {
    backgroundColor: THEME.brandLight,
  },
  clearBadgeText: {
    color: THEME.brandDark,
  },
  portfolioDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10.5,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginTop: 2,
    fontFamily: FONTS.semiBold,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.border,
    marginHorizontal: 8,
  },
  treasuryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 12,
    gap: 12,
  },
  treasuryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treasuryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  erpBadgePill: {
    backgroundColor: THEME.indigoLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  erpBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: THEME.indigo,
  },
  treasurySub: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
  },
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  billSubtitle: {
    fontSize: 11.5,
    color: THEME.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  billStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  billStatusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  pillPending: {
    backgroundColor: THEME.lossLight,
  },
  textPending: {
    color: THEME.lossDark,
  },
  pillPaid: {
    backgroundColor: THEME.brandLight,
  },
  textPaid: {
    color: THEME.brandDark,
  },
  chargesDivider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: 12,
  },
  chargesTable: {
    gap: 8,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chargeItem: {
    fontSize: 13,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  chargeAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
    fontVariant: ['tabular-nums'],
  },
  totalDivider: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: THEME.borderMedium,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.bold,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.brandDark,
    fontFamily: FONTS.semiBold,
  },
  noHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    alignItems: 'center',
  },
  noHistoryText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  historyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 14,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  historyDate: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  historyAmount: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
    fontVariant: ['tabular-nums'],
  },
  historyReceiptLink: {
    fontSize: 10.5,
    fontWeight: '600',
    color: THEME.brandDark,
    marginTop: 2,
  },
  historyDivider: {
    height: 1,
    backgroundColor: THEME.border,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  stickyPriceBox: {
    flex: 1,
  },
  stickyPriceLabel: {
    fontSize: 11,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  stickyPriceValue: {
    fontSize: 19,
    fontWeight: '800',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
    fontVariant: ['tabular-nums'],
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.brand,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  payBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
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
    gap: 14,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.borderMedium,
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
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  modalBillTitle: {
    fontSize: 12.5,
    color: THEME.textSecondary,
    fontFamily: FONTS.medium,
  },
  methodsList: {
    gap: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  methodCardActive: {
    borderColor: THEME.brand,
    backgroundColor: THEME.brandLight,
  },
  methodIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textPrimary,
    fontFamily: FONTS.semiBold,
  },
  methodSub: {
    fontSize: 11,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  modalConfirmBtn: {
    backgroundColor: THEME.brand,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  modalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
});
