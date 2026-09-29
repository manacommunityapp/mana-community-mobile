import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  maintenanceDuesService,
  MaintenanceBillDto,
  PaymentVerificationRequest,
} from '@/services/maintenanceDuesService';

export default function MaintenanceDuesScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [isPayModal, setIsPayModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'WALLET' | 'CARD'>('UPI');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [receiptModalBill, setReceiptModalBill] = useState<MaintenanceBillDto | null>(null);

  // ── 1. Live Pending Bills Query ──────────────────────────────────────────
  const {
    data: pendingBills = [],
    isLoading: loadingPending,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['maintenance-bills-pending'],
    queryFn: maintenanceDuesService.getPendingBills,
  });

  // ── 2. Live Payment History Query ────────────────────────────────────────
  const {
    data: historyBills = [],
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['maintenance-bills-history'],
    queryFn: maintenanceDuesService.getPaymentHistory,
  });

  // ── 3. Live Wallet Balance Query ─────────────────────────────────────────
  const {
    data: walletData,
    isLoading: loadingWallet,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: maintenanceDuesService.getWalletBalance,
  });

  const walletBalance = walletData?.balance ?? 0;

  // Active bill to display in statement card
  const activeBill = useMemo(() => {
    if (selectedBillId) {
      const match = pendingBills.find(b => b.id === selectedBillId);
      if (match) return match;
    }
    if (pendingBills.length > 0) {
      return pendingBills[0];
    }
    if (historyBills.length > 0) {
      return historyBills[0];
    }
    return null;
  }, [pendingBills, historyBills, selectedBillId]);

  // Breakdown charges (dynamic line items)
  const chargesList = useMemo(() => {
    if (!activeBill) return [];
    if (activeBill.charges && activeBill.charges.length > 0) {
      return activeBill.charges;
    }
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

  // ── Pull-to-Refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPending(), refetchHistory(), refetchWallet()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPending, refetchHistory, refetchWallet]);

  // ── Payment Mutation ──────────────────────────────────────────────────────
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

      // Step 1: Initiate payment order with payment gateway
      const order = await maintenanceDuesService.initiatePayment(activeBill.id);

      // Step 2: Verification callback with gateway payment reference
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
      Linking.openURL(b.receiptUrl).catch(() => {
        setReceiptModalBill(b);
      });
    } else {
      setReceiptModalBill(b);
    }
  };

  const isInitialLoading = (loadingPending || loadingHistory || loadingWallet) && !refreshing;

  if (isInitialLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading maintenance accounts & dues...</Text>
      </View>
    );
  }

  const outstandingDue = activeBill ? (activeBill.dueAmount ?? (activeBill.status === 'PAID' ? 0 : activeBill.totalAmount)) : 0;
  const isSettled = !activeBill || activeBill.status === 'PAID' || outstandingDue === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Advance Wallet Card ── */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <View style={styles.walletIcon}>
            <Ionicons name="wallet-outline" size={24} color="#047857" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.walletTitle}>Advance Wallet Balance</Text>
              <View style={styles.walletBadge}>
                <Text style={styles.walletBadgeText}>Active</Text>
              </View>
            </View>
            <Text style={styles.walletSubtitle}>
              Tower {user?.tower || 'A'} &bull; Flat {user?.flatNumber || '1204'}
            </Text>
          </View>
          <Text style={styles.walletAmount}>₹{walletBalance.toLocaleString()}</Text>
        </View>
      </View>

      {/* ── Active Statement Card ── */}
      {activeBill && (
        <View style={styles.billCard}>
          <View style={styles.billHeader}>
            <View>
              <Text style={styles.billPeriod}>{activeBill.monthYear} Statement</Text>
              <Text style={styles.billNumber}>{activeBill.billNumber}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              activeBill.status === 'PAID' ? styles.statusPaid : (activeBill.status === 'OVERDUE' ? styles.statusOverdue : styles.statusPending)
            ]}>
              <Text style={[
                styles.statusText,
                activeBill.status === 'PAID' ? styles.textPaid : (activeBill.status === 'OVERDUE' ? styles.textOverdue : styles.textPending)
              ]}>
                {activeBill.status}
              </Text>
            </View>
          </View>

          {/* Breakdown Items */}
          <View style={styles.chargeList}>
            {chargesList.map((c, i) => (
              <View key={i} style={styles.chargeRow}>
                <Text style={styles.chargeItem}>{c.item}</Text>
                <Text style={styles.chargeAmount}>₹{c.amount.toLocaleString()}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Payable Demand</Text>
              <Text style={styles.totalAmount}>₹{activeBill.totalAmount.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.dueRow}>
            <Text style={styles.dueLabel}>
              Due Date: <Text style={{ fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text }}>{activeBill.dueDate}</Text>
            </Text>
            <Text style={styles.outstandingLabel}>
              Outstanding: <Text style={outstandingDue > 0 ? styles.outstandingValue : styles.clearedValue}>₹{outstandingDue.toLocaleString()}</Text>
            </Text>
          </View>

          {!isSettled ? (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => setIsPayModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="card-outline" size={18} color="#FFFFFF" />
              <Text style={styles.payBtnText}>Pay ₹{outstandingDue.toLocaleString()} Now</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.clearedBannerWrap}>
              <View style={styles.clearedBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#047857" />
                <Text style={styles.clearedText}>Bill is fully settled. Thank you!</Text>
              </View>
              <TouchableOpacity
                style={styles.viewReceiptLink}
                onPress={() => handleReceiptAction(activeBill)}
              >
                <Ionicons name="receipt-outline" size={15} color="#047857" />
                <Text style={styles.viewReceiptLinkText}>View Digital Receipt</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Receipts History ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Invoices & Receipts</Text>
        <Text style={styles.sectionSubCount}>{historyBills.length} records</Text>
      </View>

      <View style={{ gap: SPACING.sm }}>
        {historyBills.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="receipt-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyHistoryText}>No past maintenance invoices found</Text>
          </View>
        ) : (
          historyBills.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.historyCard}
              onPress={() => handleReceiptAction(item)}
              activeOpacity={0.7}
            >
              <View style={styles.historyIconWrap}>
                <Ionicons name="document-text-outline" size={20} color="#047857" />
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.historyPeriod}>{item.monthYear}</Text>
                  {item.paymentMethod && (
                    <View style={styles.methodBadge}>
                      <Text style={styles.methodBadgeText}>{item.paymentMethod}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.historyNum}>{item.billNumber}</Text>
              </View>
              <Text style={styles.historyAmount}>₹{item.totalAmount.toLocaleString()}</Text>
              <TouchableOpacity
                style={styles.receiptBtn}
                onPress={() => handleReceiptAction(item)}
              >
                <Ionicons name="download-outline" size={16} color="#047857" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* ── Payment Modal ── */}
      <Modal visible={isPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Clear Maintenance Dues</Text>
                <Text style={styles.modalSubtitle}>Select your preferred payment method:</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPayModal(false)} disabled={payMutation.isPending}>
                <Ionicons name="close-circle-outline" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: SPACING.sm, marginVertical: SPACING.md }}>
              {[
                {
                  id: 'UPI',
                  label: 'UPI (GPay / PhonePe / Paytm)',
                  sub: 'Instant settlement via UPI apps',
                  icon: 'phone-portrait-outline',
                  available: true,
                },
                {
                  id: 'WALLET',
                  label: `Advance Wallet (₹${walletBalance.toLocaleString()})`,
                  sub: walletBalance >= outstandingDue ? 'Sufficient balance available' : 'Insufficient balance',
                  icon: 'wallet-outline',
                  available: walletBalance >= outstandingDue,
                },
                {
                  id: 'CARD',
                  label: 'Debit / Credit Card / NetBanking',
                  sub: 'Visa, MasterCard, RuPay & NetBanking',
                  icon: 'card-outline',
                  available: true,
                },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.methodCard,
                    selectedMethod === m.id && styles.methodCardActive,
                    !m.available && styles.methodCardDisabled,
                  ]}
                  onPress={() => setSelectedMethod(m.id as any)}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={22}
                    color={selectedMethod === m.id ? '#047857' : (m.available ? COLORS.textSecondary : COLORS.textMuted)}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.methodText, selectedMethod === m.id && styles.methodTextActive]}>
                      {m.label}
                    </Text>
                    <Text style={[styles.methodSub, !m.available && { color: '#DC2626' }]}>
                      {m.sub}
                    </Text>
                  </View>
                  {selectedMethod === m.id && (
                    <Ionicons name="checkmark-circle" size={20} color="#047857" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalSummaryBox}>
              <Text style={styles.modalSummaryLabel}>Payable Amount</Text>
              <Text style={styles.modalSummaryValue}>₹{outstandingDue.toLocaleString()}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsPayModal(false)}
                disabled={payMutation.isPending}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmPayBtn, payMutation.isPending && { opacity: 0.7 }]}
                onPress={() => payMutation.mutate()}
                disabled={payMutation.isPending}
              >
                {payMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmPayText}>Pay ₹{outstandingDue.toLocaleString()}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Digital Tax Receipt Viewer Modal ── */}
      <Modal visible={!!receiptModalBill} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.receiptModalCard}>
            <View style={styles.receiptModalHeader}>
              <View style={styles.receiptBadge}>
                <Ionicons name="checkmark-done" size={16} color="#047857" />
                <Text style={styles.receiptBadgeText}>Official Maintenance Receipt</Text>
              </View>
              <TouchableOpacity onPress={() => setReceiptModalBill(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {receiptModalBill && (
              <View style={styles.receiptBody}>
                <Text style={styles.receiptSocietyName}>Mana Community Housing Society</Text>
                <Text style={styles.receiptFlatDetail}>Tower {user?.tower || 'A'} - Unit {user?.flatNumber || '1204'}</Text>
                <View style={styles.receiptDivider} />

                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaKey}>Invoice No:</Text>
                  <Text style={styles.receiptMetaVal}>{receiptModalBill.billNumber}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaKey}>Period:</Text>
                  <Text style={styles.receiptMetaVal}>{receiptModalBill.monthYear}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaKey}>Payment Mode:</Text>
                  <Text style={styles.receiptMetaVal}>{receiptModalBill.paymentMethod || 'Online Gateway'}</Text>
                </View>
                <View style={styles.receiptMetaRow}>
                  <Text style={styles.receiptMetaKey}>Status:</Text>
                  <Text style={[styles.receiptMetaVal, { color: '#047857', fontWeight: '800' }]}>SETTLED</Text>
                </View>

                <View style={styles.receiptAmountBox}>
                  <Text style={styles.receiptAmountLabel}>Total Settled Amount</Text>
                  <Text style={styles.receiptAmountValue}>₹{receiptModalBill.totalAmount.toLocaleString()}</Text>
                </View>

                <TouchableOpacity
                  style={styles.receiptDoneBtn}
                  onPress={() => setReceiptModalBill(null)}
                >
                  <Text style={styles.receiptDoneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: SPACING.xl },
  loadingText: { marginTop: SPACING.md, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  walletCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.lg,
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  walletIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  walletTitle: { fontSize: 13, fontWeight: '800', color: '#065F46' },
  walletBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  walletBadgeText: { fontSize: 9, fontWeight: '800', color: '#047857', textTransform: 'uppercase' },
  walletSubtitle: { fontSize: 11, color: '#047857', marginTop: 2 },
  walletAmount: { fontSize: 18, fontWeight: '900', color: '#047857' },

  billCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  billPeriod: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  billNumber: { fontSize: 11, fontFamily: 'monospace', color: COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusPending: { backgroundColor: '#EEF2FF' },
  textPending: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },
  statusPaid: { backgroundColor: '#D1FAE5' },
  textPaid: { fontSize: 10, fontWeight: '800', color: '#047857' },
  statusOverdue: { backgroundColor: '#FEE2E2' },
  textOverdue: { fontSize: 10, fontWeight: '800', color: '#DC2626' },

  chargeList: { backgroundColor: '#F9FAFB', borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.sm },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chargeItem: { fontSize: 12, color: COLORS.textSecondary },
  chargeAmount: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, marginTop: 4 },
  totalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  totalAmount: { fontSize: 14, fontWeight: '800', color: '#047857' },

  dueRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: SPACING.md },
  dueLabel: { fontSize: 12, color: COLORS.textMuted },
  outstandingLabel: { fontSize: 12, color: COLORS.textMuted },
  outstandingValue: { fontSize: 15, fontWeight: '800', color: '#DC2626' },
  clearedValue: { fontSize: 15, fontWeight: '800', color: '#047857' },

  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  clearedBannerWrap: { gap: SPACING.sm },
  clearedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  clearedText: { color: '#047857', fontSize: 13, fontWeight: '700' },
  viewReceiptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    gap: 4,
  },
  viewReceiptLinkText: { fontSize: 12, fontWeight: '700', color: '#047857' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sectionSubCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },

  emptyHistory: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  emptyHistoryText: { fontSize: 13, color: COLORS.textMuted },

  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  historyPeriod: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  historyNum: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace' },
  historyAmount: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginRight: SPACING.sm },
  methodBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  methodBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted },
  receiptBtn: { padding: SPACING.sm, backgroundColor: '#ECFDF5', borderRadius: RADIUS.sm },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  methodCardActive: { borderColor: '#047857', backgroundColor: '#ECFDF5' },
  methodCardDisabled: { opacity: 0.6, borderColor: '#F3F4F6', backgroundColor: '#FAFAFA' },
  methodText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  methodTextActive: { color: '#047857', fontWeight: '700' },
  methodSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  modalSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
  },
  modalSummaryLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  modalSummaryValue: { fontSize: 17, fontWeight: '900', color: '#047857' },

  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  confirmPayBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#047857', alignItems: 'center' },
  confirmPayText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  receiptModalCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  receiptModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  receiptBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  receiptBadgeText: { fontSize: 11, fontWeight: '800', color: '#047857' },
  receiptBody: { gap: SPACING.xs },
  receiptSocietyName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  receiptFlatDetail: { fontSize: 12, color: COLORS.textMuted },
  receiptDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  receiptMetaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  receiptMetaKey: { fontSize: 12, color: COLORS.textMuted },
  receiptMetaVal: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  receiptAmountBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  receiptAmountLabel: { fontSize: 11, color: '#047857', fontWeight: '600' },
  receiptAmountValue: { fontSize: 22, fontWeight: '900', color: '#047857', marginTop: 2 },
  receiptDoneBtn: {
    backgroundColor: '#047857',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  receiptDoneBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
