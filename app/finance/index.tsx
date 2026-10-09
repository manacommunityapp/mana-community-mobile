import { personalFinanceService } from '@/services/personalFinanceService';
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  maintenanceDuesService,
  MaintenanceBillDto,
  PaymentVerificationRequest,
} from '@/services/maintenanceDuesService';

const FINANCE_HUBS = [
  { emoji: '🏦', label: 'Treasury',   color: '#4F46E5', bg: '#EEF2FF', route: '/finance/society-dashboard' },
  { emoji: '💳', label: 'Pay Dues',   color: '#059669', bg: '#ECFDF5', route: '/finance' },
  { emoji: '📊', label: 'Reports',    color: '#D97706', bg: '#FFFBEB', route: '/finance/society-reports' },
  { emoji: '📋', label: 'Invoices',   color: '#0284C7', bg: '#E0F2FE', route: '/finance/invoices' },
  { emoji: '👥', label: 'Vendors',    color: '#7C3AED', bg: '#F5F3FF', route: '/finance/vendors' },
  { emoji: '✅', label: 'Approvals',  color: '#DC2626', bg: '#FEF2F2', route: '/finance/expenses' },
  { emoji: '📑', label: 'Budget',     color: '#EA580C', bg: '#FFF7ED', route: '/finance/budget' },
  { emoji: '💰', label: 'My Money',   color: '#16A34A', bg: '#DCFCE7', route: '/personal-finance' },
] as const;

export default function MaintenanceDuesScreen() {
  const router = useRouter();
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

  const payMutation = useMutation({
    mutationFn: async () => {
      if (!activeBill) throw new Error('No active bill selected.');
      const due = activeBill.dueAmount ?? activeBill.totalAmount;
      if (selectedMethod === 'WALLET') {
        if (walletBalance < due) {
          throw new Error(`Insufficient wallet balance (₹${walletBalance.toLocaleString()}). Please choose UPI or Card.`);
        }
        return await maintenanceDuesService.payWithWallet(activeBill.id, due);
      }
      const order = await maintenanceDuesService.initiatePayment(activeBill.id);
      const verificationPayload: PaymentVerificationRequest = {
        billId: activeBill.id,
        orderId: order.orderId,
        paymentId: `pay_${Date.now()}`,
        signature: 'sig_mock_gateway_verified',
        method: selectedMethod,
      };
      return await maintenanceDuesService.verifyPayment(verificationPayload);
    },
    onSuccess: (data) => {
      setIsPayModal(false);
      queryClient.invalidateQueries({ queryKey: ['maintenance-bills-pending'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-bills-history'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      Alert.alert(
        '✅ Payment Cleared',
        `Your maintenance payment has been successfully recorded.\nReceipt No: ${data.receiptNumber || 'N/A'}\nDigital receipt is now available under recent invoices.`,
      );
    },
    onError: (err: any) => {
      Alert.alert('Payment Failed', err?.message || 'Could not process maintenance payment. Please try again.');
    },
  });

  const handleReceiptAction = (b: MaintenanceBillDto) => {
    if (b.receiptUrl && !b.receiptUrl.includes('example') && !b.receiptUrl.includes('mock')) {
      Linking.openURL(b.receiptUrl).catch(() => setReceiptModalBill(b));
    } else {
      setReceiptModalBill(b);
    }
  };

  const isInitialLoading = (loadingPending || loadingHistory || loadingWallet) && !refreshing;

  if (isInitialLoading) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={s.loadingText}>Loading maintenance accounts...</Text>
      </View>
    );
  }

  const outstandingDue = activeBill ? (activeBill.dueAmount ?? (activeBill.status === 'PAID' ? 0 : activeBill.totalAmount)) : 0;
  const isSettled = !activeBill || activeBill.status === 'PAID' || outstandingDue === 0;
  const paidCount = historyBills.filter(b => b.status === 'PAID').length;
  const overdueCount = pendingBills.filter(b => b.status === 'OVERDUE').length;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />
      }
    >
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={['#312E81', '#4F46E5', '#6366F1']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTopRow}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs/feed')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>💳  Community Finance</Text>
            <Text style={s.headerSub}>
              Tower {user?.tower || 'A'} · Flat {user?.flatNumber || '1204'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => router.push('/personal-finance' as any)}
          >
            <Ionicons name="wallet-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={s.headerStats}>
          {[
            { label: 'Wallet', value: `₹${walletBalance.toLocaleString()}`, icon: 'wallet' as const, color: '#34D399' },
            { label: 'Pending', value: String(pendingBills.length), icon: 'time' as const, color: '#FBBF24' },
            { label: 'Paid', value: String(paidCount), icon: 'checkmark-circle' as const, color: '#34D399' },
            { label: 'Overdue', value: String(overdueCount), icon: 'alert-circle' as const, color: '#F87171' },
          ].map((st) => (
            <View key={st.label} style={s.headerStat}>
              <Ionicons name={st.icon} size={14} color={st.color} />
              <Text style={s.headerStatValue}>{st.value}</Text>
              <Text style={s.headerStatLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Finance Hub Grid ── */}
      <View style={s.hubGrid}>
        {FINANCE_HUBS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={s.hubItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={[s.hubIcon, { backgroundColor: item.bg }]}>
              <Text style={s.hubEmoji}>{item.emoji}</Text>
            </View>
            <Text style={s.hubLabel} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Domain Switcher ── */}
      <View style={s.switcherRow}>
        <View style={s.switcherActive}>
          <Ionicons name="business" size={14} color="#fff" />
          <Text style={s.switcherActiveText}>Community Finance</Text>
        </View>
        <TouchableOpacity
          style={s.switcherInactive}
          onPress={() => router.push('/personal-finance' as any)}
        >
          <Ionicons name="wallet-outline" size={14} color="#4F46E5" />
          <Text style={s.switcherInactiveText}>My Money</Text>
        </TouchableOpacity>
      </View>

      {/* ── Society ERP Banner ── */}
      <TouchableOpacity
        style={s.erpBanner}
        onPress={() => router.push('/finance/society-dashboard' as any)}
        activeOpacity={0.8}
      >
        <View style={s.erpIconBox}>
          <Ionicons name="business" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.erpTitle}>Society Treasury & ERP</Text>
          <Text style={s.erpSub}>Invoices, Vendors, 3-Tier Approvals & Balance Sheet</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#A5B4FC" />
      </TouchableOpacity>

      {/* ── Wallet Card ── */}
      <View style={s.walletCard}>
        <View style={s.walletRow}>
          <View style={s.walletIconBox}>
            <Ionicons name="wallet" size={22} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.walletTitle}>Advance Wallet</Text>
              <View style={s.activeBadge}>
                <View style={s.activeDot} />
                <Text style={s.activeBadgeText}>Active</Text>
              </View>
            </View>
            <Text style={s.walletFlat}>
              Tower {user?.tower || 'A'} · Flat {user?.flatNumber || '1204'}
            </Text>
          </View>
          <Text style={s.walletAmount}>₹{walletBalance.toLocaleString()}</Text>
        </View>
      </View>

      {/* ── Active Statement Card ── */}
      {activeBill && (
        <View style={s.billCard}>
          <View style={s.billHeader}>
            <View>
              <Text style={s.billPeriod}>{activeBill.monthYear} Statement</Text>
              <Text style={s.billNumber}>{activeBill.billNumber}</Text>
            </View>
            <View style={[
              s.statusBadge,
              activeBill.status === 'PAID' ? s.statusPaid
                : activeBill.status === 'OVERDUE' ? s.statusOverdue
                : s.statusPending,
            ]}>
              <Ionicons
                name={activeBill.status === 'PAID' ? 'checkmark-circle' : activeBill.status === 'OVERDUE' ? 'alert-circle' : 'time'}
                size={11}
                color={activeBill.status === 'PAID' ? '#059669' : activeBill.status === 'OVERDUE' ? '#DC2626' : '#4F46E5'}
              />
              <Text style={[
                s.statusText,
                activeBill.status === 'PAID' ? s.textPaid
                  : activeBill.status === 'OVERDUE' ? s.textOverdue
                  : s.textPending,
              ]}>
                {activeBill.status}
              </Text>
            </View>
          </View>

          {/* Breakdown */}
          <View style={s.chargeList}>
            {chargesList.map((c, i) => (
              <View key={i} style={s.chargeRow}>
                <Text style={s.chargeItem}>{c.item}</Text>
                <Text style={s.chargeAmt}>₹{c.amount.toLocaleString()}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Payable</Text>
              <Text style={s.totalAmount}>₹{activeBill.totalAmount.toLocaleString()}</Text>
            </View>
          </View>

          {/* Due info */}
          <View style={s.dueRow}>
            <View style={s.dueItem}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.dueText}>Due: <Text style={{ fontWeight: '700', color: COLORS.text }}>{activeBill.dueDate}</Text></Text>
            </View>
            <View style={s.dueItem}>
              <Ionicons name="cash-outline" size={13} color={outstandingDue > 0 ? '#DC2626' : '#059669'} />
              <Text style={s.dueText}>
                Outstanding: <Text style={{ fontWeight: '800', color: outstandingDue > 0 ? '#DC2626' : '#059669' }}>
                  ₹{outstandingDue.toLocaleString()}
                </Text>
              </Text>
            </View>
          </View>

          {/* Pay / Settled */}
          {!isSettled ? (
            <TouchableOpacity style={s.payBtn} onPress={() => setIsPayModal(true)} activeOpacity={0.8}>
              <Ionicons name="card-outline" size={16} color="#fff" />
              <Text style={s.payBtnText}>Pay ₹{outstandingDue.toLocaleString()} Now</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.settledWrap}>
              <View style={s.settledBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={s.settledText}>Fully settled. Thank you!</Text>
              </View>
              <TouchableOpacity style={s.receiptLink} onPress={() => handleReceiptAction(activeBill)}>
                <Ionicons name="receipt-outline" size={13} color="#4F46E5" />
                <Text style={s.receiptLinkText}>View Digital Receipt</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Receipts History ── */}
      <View style={s.sectionHeader}>
        <View style={s.sectionTitleRow}>
          <View style={[s.sectionDot, { backgroundColor: '#4F46E5' }]} />
          <Text style={s.sectionTitle}>Recent Invoices</Text>
        </View>
        <View style={s.countBadge}>
          <Text style={s.countBadgeText}>{historyBills.length}</Text>
        </View>
      </View>

      {historyBills.length === 0 ? (
        <View style={s.emptyBox}>
          <View style={s.emptyIconBox}>
            <Ionicons name="receipt-outline" size={32} color="#A5B4FC" />
          </View>
          <Text style={s.emptyTitle}>No invoices yet</Text>
          <Text style={s.emptySub}>Past maintenance invoices will appear here</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {historyBills.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.historyCard}
              onPress={() => handleReceiptAction(item)}
              activeOpacity={0.7}
            >
              <View style={s.historyIcon}>
                <Ionicons name="document-text" size={18} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={s.historyPeriod}>{item.monthYear}</Text>
                  {item.paymentMethod && (
                    <View style={s.methodPill}>
                      <Text style={s.methodPillText}>{item.paymentMethod}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.historyNum}>{item.billNumber}</Text>
              </View>
              <Text style={s.historyAmount}>₹{item.totalAmount.toLocaleString()}</Text>
              <View style={s.dlBtn}>
                <Ionicons name="download-outline" size={14} color="#4F46E5" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Payment Modal ── */}
      <Modal visible={isPayModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeaderRow}>
              <View>
                <Text style={s.modalTitle}>Clear Maintenance Dues</Text>
                <Text style={s.modalSub}>Select your preferred payment method</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPayModal(false)} disabled={payMutation.isPending}>
                <Ionicons name="close-circle-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginVertical: 14 }}>
              {[
                { id: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', sub: 'Instant settlement via UPI apps', icon: 'phone-portrait-outline' as const, available: true },
                { id: 'WALLET', label: `Advance Wallet (₹${walletBalance.toLocaleString()})`, sub: walletBalance >= outstandingDue ? 'Sufficient balance available' : 'Insufficient balance', icon: 'wallet-outline' as const, available: walletBalance >= outstandingDue },
                { id: 'CARD', label: 'Debit / Credit Card / NetBanking', sub: 'Visa, MasterCard, RuPay & NetBanking', icon: 'card-outline' as const, available: true },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    s.mCard,
                    selectedMethod === m.id && s.mCardActive,
                    !m.available && s.mCardDisabled,
                  ]}
                  onPress={() => m.available && setSelectedMethod(m.id as any)}
                >
                  <View style={[s.mIconBox, { backgroundColor: selectedMethod === m.id ? '#EEF2FF' : '#F8FAFC' }]}>
                    <Ionicons name={m.icon} size={20} color={selectedMethod === m.id ? '#4F46E5' : COLORS.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.mText, selectedMethod === m.id && s.mTextActive]}>{m.label}</Text>
                    <Text style={[s.mSub, !m.available && { color: '#DC2626' }]}>{m.sub}</Text>
                  </View>
                  {selectedMethod === m.id && <Ionicons name="checkmark-circle" size={20} color="#4F46E5" />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>Payable Amount</Text>
              <Text style={s.summaryValue}>₹{outstandingDue.toLocaleString()}</Text>
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setIsPayModal(false)} disabled={payMutation.isPending}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, payMutation.isPending && { opacity: 0.7 }]}
                onPress={() => payMutation.mutate()}
                disabled={payMutation.isPending}
              >
                {payMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Pay ₹{outstandingDue.toLocaleString()}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Receipt Modal ── */}
      <Modal visible={!!receiptModalBill} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.receiptCard}>
            <View style={s.receiptHeader}>
              <View style={s.receiptBadge}>
                <Ionicons name="checkmark-done" size={14} color="#059669" />
                <Text style={s.receiptBadgeText}>Official Receipt</Text>
              </View>
              <TouchableOpacity onPress={() => setReceiptModalBill(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {receiptModalBill && (
              <View style={{ gap: 6 }}>
                <Text style={s.receiptSociety}>Mana Community Housing Society</Text>
                <Text style={s.receiptFlat}>Tower {user?.tower || 'A'} - Unit {user?.flatNumber || '1204'}</Text>
                <View style={s.receiptDivider} />

                {[
                  { k: 'Invoice No', v: receiptModalBill.billNumber },
                  { k: 'Period', v: receiptModalBill.monthYear },
                  { k: 'Payment Mode', v: receiptModalBill.paymentMethod || 'Online Gateway' },
                  { k: 'Status', v: 'SETTLED', highlight: true },
                ].map((row) => (
                  <View key={row.k} style={s.receiptMetaRow}>
                    <Text style={s.receiptKey}>{row.k}</Text>
                    <Text style={[s.receiptVal, row.highlight && { color: '#059669', fontWeight: '800' }]}>{row.v}</Text>
                  </View>
                ))}

                <View style={s.receiptAmtBox}>
                  <Text style={s.receiptAmtLabel}>Total Settled</Text>
                  <Text style={s.receiptAmtValue}>₹{receiptModalBill.totalAmount.toLocaleString()}</Text>
                </View>

                <TouchableOpacity style={s.receiptDoneBtn} onPress={() => setReceiptModalBill(null)}>
                  <Text style={s.receiptDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 32 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.textMuted },

  // Header
  header: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  headerStats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, paddingVertical: 8,
  },
  headerStat: { flex: 1, alignItems: 'center', gap: 2 },
  headerStatValue: { fontSize: 14, fontWeight: '800', color: '#fff' },
  headerStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  // Hub Grid
  hubGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12,
    paddingTop: 14, gap: 8,
  },
  hubItem: {
    width: '22%', flexGrow: 1, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 8,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  hubIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  hubEmoji: { fontSize: 16 },
  hubLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  // Domain Switcher
  switcherRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginTop: 12 },
  switcherActive: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#4F46E5', paddingVertical: 9, borderRadius: RADIUS.md,
  },
  switcherActiveText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  switcherInactive: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#fff', paddingVertical: 9, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  switcherInactiveText: { color: '#4F46E5', fontWeight: '700', fontSize: 12 },

  // ERP Banner
  erpBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, marginTop: 10,
    backgroundColor: '#312E81', borderRadius: RADIUS.lg, padding: 12, ...SHADOWS.sm,
  },
  erpIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  erpTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  erpSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  // Wallet
  walletCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    marginHorizontal: 12, marginTop: 10,
    borderWidth: 1, borderColor: '#E8E8F0', ...SHADOWS.sm,
  },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  walletTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#059669' },
  activeBadgeText: { fontSize: 8, fontWeight: '800', color: '#059669', textTransform: 'uppercase' },
  walletFlat: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  walletAmount: { fontSize: 18, fontWeight: '900', color: '#059669' },

  // Bill Card
  billCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    marginHorizontal: 12, marginTop: 10, gap: 10,
    borderWidth: 1, borderColor: '#E8E8F0', ...SHADOWS.sm,
  },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billPeriod: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  billNumber: { fontSize: 10, fontFamily: 'monospace', color: COLORS.textMuted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusPending: { backgroundColor: '#EEF2FF' },
  textPending: { color: '#4F46E5' },
  statusPaid: { backgroundColor: '#DCFCE7' },
  textPaid: { color: '#059669' },
  statusOverdue: { backgroundColor: '#FEE2E2' },
  textOverdue: { color: '#DC2626' },

  chargeList: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 12, gap: 8 },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chargeItem: { fontSize: 12, color: COLORS.textSecondary },
  chargeAmt: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  totalAmount: { fontSize: 15, fontWeight: '800', color: '#4F46E5' },

  dueRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  dueItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: { fontSize: 11, color: COLORS.textMuted },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4F46E5', paddingVertical: 11, borderRadius: RADIUS.md, ...SHADOWS.sm,
  },
  payBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  settledWrap: { gap: 6 },
  settledBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#ECFDF5', padding: 10, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  settledText: { color: '#059669', fontSize: 12, fontWeight: '700' },
  receiptLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4,
  },
  receiptLinkText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },

  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 12, marginTop: 16, marginBottom: 8,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  countBadge: { backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  countBadgeText: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },

  // Empty
  emptyBox: {
    alignItems: 'center', justifyContent: 'center', padding: 36, marginHorizontal: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#E8E8F0', gap: 8,
  },
  emptyIconBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },

  // History
  historyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12,
    marginHorizontal: 12, borderWidth: 1, borderColor: '#E8E8F0', ...SHADOWS.sm,
  },
  historyIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  historyPeriod: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  historyNum: { fontSize: 10, color: COLORS.textMuted, marginTop: 1, fontFamily: 'monospace' },
  historyAmount: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  methodPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  methodPillText: { fontSize: 8, fontWeight: '700', color: COLORS.textSecondary },
  dlBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },

  // Payment Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 20, ...SHADOWS.md },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  modalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  mCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  mCardActive: { borderColor: '#4F46E5', backgroundColor: '#FAFAFF' },
  mCardDisabled: { opacity: 0.5, backgroundColor: '#FAFAFA' },
  mIconBox: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  mText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  mTextActive: { color: '#4F46E5', fontWeight: '700' },
  mSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  summaryBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 12, marginTop: 4,
  },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  summaryValue: { fontSize: 17, fontWeight: '900', color: '#4F46E5' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 11, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn: {
    flex: 1.4, paddingVertical: 11, borderRadius: RADIUS.md,
    backgroundColor: '#4F46E5', alignItems: 'center', ...SHADOWS.sm,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Receipt Modal
  receiptCard: { width: '100%', backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 20, ...SHADOWS.md },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  receiptBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  receiptBadgeText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  receiptSociety: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  receiptFlat: { fontSize: 11, color: COLORS.textMuted },
  receiptDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  receiptMetaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  receiptKey: { fontSize: 11, color: COLORS.textMuted },
  receiptVal: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  receiptAmtBox: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, padding: 12,
    alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#C7D2FE',
  },
  receiptAmtLabel: { fontSize: 10, color: '#4F46E5', fontWeight: '600' },
  receiptAmtValue: { fontSize: 22, fontWeight: '900', color: '#4F46E5', marginTop: 2 },
  receiptDoneBtn: {
    backgroundColor: '#4F46E5', borderRadius: RADIUS.md,
    paddingVertical: 11, alignItems: 'center', marginTop: 14, ...SHADOWS.sm,
  },
  receiptDoneBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
