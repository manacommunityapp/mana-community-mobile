import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';

interface BillCharge {
  item: string;
  amount: number;
}

interface MaintenanceBill {
  id: string;
  billNumber: string;
  period: string;
  charges: BillCharge[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING';
}

const CURRENT_BILL: MaintenanceBill = {
  id: 'b-101',
  billNumber: 'BILL-2026-10-A1204',
  period: 'October 2026',
  charges: [
    { item: 'Society Maintenance Fee', amount: 3500 },
    { item: 'Water Consumption Charges', amount: 450 },
    { item: 'Power Backup & DG Surcharge', amount: 800 },
    { item: 'Covered Parking Slot 1', amount: 500 },
    { item: 'Clubhouse & Gym Membership', amount: 300 },
  ],
  totalAmount: 5550,
  paidAmount: 0,
  dueAmount: 5550,
  dueDate: 'Oct 15, 2026',
  status: 'PENDING',
};

export default function MaintenanceDuesScreen() {
  const { user } = useAuth();
  const [bill, setBill] = useState<MaintenanceBill>(CURRENT_BILL);
  const [walletBalance, setWalletBalance] = useState(2500);
  const [isPayModal, setIsPayModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'WALLET' | 'CARD'>('UPI');
  const [isPaying, setIsPaying] = useState(false);

  const handlePay = () => {
    setIsPaying(true);
    setTimeout(() => {
      setIsPaying(false);
      setBill({
        ...bill,
        paidAmount: bill.totalAmount,
        dueAmount: 0,
        status: 'PAID',
      });
      if (selectedMethod === 'WALLET') {
        setWalletBalance(Math.max(0, walletBalance - bill.dueAmount));
      }
      setIsPayModal(false);
      Alert.alert('✅ Payment Cleared', 'Your maintenance payment of ₹5,550 has been recorded. Digital receipt is ready.');
    }, 1000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Advance Wallet Card ── */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <View style={styles.walletIcon}>
            <Ionicons name="wallet-outline" size={24} color="#047857" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.walletTitle}>Advance Wallet Balance</Text>
            <Text style={styles.walletSubtitle}>Tower {user?.tower || 'A'} &bull; Flat {user?.flatNumber || '1204'}</Text>
          </View>
          <Text style={styles.walletAmount}>₹{walletBalance.toLocaleString()}</Text>
        </View>
      </View>

      {/* ── Active Statement Card ── */}
      <View style={styles.billCard}>
        <View style={styles.billHeader}>
          <View>
            <Text style={styles.billPeriod}>{bill.period} Statement</Text>
            <Text style={styles.billNumber}>{bill.billNumber}</Text>
          </View>
          <View style={[styles.statusBadge, bill.status === 'PAID' ? styles.statusPaid : styles.statusPending]}>
            <Text style={[styles.statusText, bill.status === 'PAID' ? styles.textPaid : styles.textPending]}>
              {bill.status}
            </Text>
          </View>
        </View>

        {/* Breakdown Items */}
        <View style={styles.chargeList}>
          {bill.charges.map((c, i) => (
            <View key={i} style={styles.chargeRow}>
              <Text style={styles.chargeItem}>{c.item}</Text>
              <Text style={styles.chargeAmount}>₹{c.amount.toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable Demand</Text>
            <Text style={styles.totalAmount}>₹{bill.totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.dueRow}>
          <Text style={styles.dueLabel}>Due Date: <Text style={{ fontWeight: '700', color: COLORS.text }}>{bill.dueDate}</Text></Text>
          <Text style={styles.outstandingLabel}>
            Outstanding: <Text style={styles.outstandingValue}>₹{bill.dueAmount.toLocaleString()}</Text>
          </Text>
        </View>

        {bill.dueAmount > 0 ? (
          <TouchableOpacity
            style={styles.payBtn}
            onPress={() => setIsPayModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={18} color="#FFFFFF" />
            <Text style={styles.payBtnText}>Pay ₹{bill.dueAmount.toLocaleString()} Now</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.clearedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#047857" />
            <Text style={styles.clearedText}>Bill is fully settled. Thank you!</Text>
          </View>
        )}
      </View>

      {/* ── Receipts History ── */}
      <Text style={styles.sectionTitle}>Recent Invoices & Receipts</Text>
      <View style={{ gap: SPACING.sm }}>
        {[
          { num: 'BILL-2026-09-A1204', period: 'September 2026', amount: 5550, status: 'PAID' },
          { num: 'BILL-2026-08-A1204', period: 'August 2026', amount: 5550, status: 'PAID' },
          { num: 'BILL-2026-07-A1204', period: 'July 2026', amount: 5550, status: 'PAID' },
        ].map((item, idx) => (
          <View key={idx} style={styles.historyCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyPeriod}>{item.period}</Text>
              <Text style={styles.historyNum}>{item.num}</Text>
            </View>
            <Text style={styles.historyAmount}>₹{item.amount.toLocaleString()}</Text>
            <TouchableOpacity
              style={styles.receiptBtn}
              onPress={() => Alert.alert('GST Receipt', `Downloaded receipt for ${item.period}`)}
            >
              <Ionicons name="download-outline" size={16} color="#047857" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* ── Payment Modal ── */}
      <Modal visible={isPayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Clear Maintenance Dues</Text>
            <Text style={styles.modalSubtitle}>Select your preferred payment method:</Text>

            <View style={{ gap: SPACING.sm, marginVertical: SPACING.md }}>
              {[
                { id: 'UPI', label: 'UPI (GPay / PhonePe / Paytm)', icon: 'phone-portrait-outline' },
                { id: 'WALLET', label: `Advance Wallet (₹${walletBalance})`, icon: 'wallet-outline' },
                { id: 'CARD', label: 'Debit / Credit Card', icon: 'card-outline' },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.methodCard, selectedMethod === m.id && styles.methodCardActive]}
                  onPress={() => setSelectedMethod(m.id as any)}
                >
                  <Ionicons name={m.icon as any} size={20} color={selectedMethod === m.id ? '#047857' : COLORS.textMuted} />
                  <Text style={[styles.methodText, selectedMethod === m.id && styles.methodTextActive]}>
                    {m.label}
                  </Text>
                  {selectedMethod === m.id && (
                    <Ionicons name="checkmark-circle" size={18} color="#047857" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsPayModal(false)}
                disabled={isPaying}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmPayBtn}
                onPress={handlePay}
                disabled={isPaying}
              >
                {isPaying ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmPayText}>Pay ₹{bill.dueAmount.toLocaleString()}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
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
  statusPending: { backgroundColor: '#FEF3C7' },
  textPending: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  statusPaid: { backgroundColor: '#D1FAE5' },
  textPaid: { fontSize: 10, fontWeight: '800', color: '#047857' },
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
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
  historyPeriod: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  historyNum: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace' },
  historyAmount: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginRight: SPACING.md },
  receiptBtn: { padding: SPACING.sm, backgroundColor: '#ECFDF5', borderRadius: RADIUS.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
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
  methodText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  methodTextActive: { color: '#047857', fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  confirmPayBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#047857', alignItems: 'center' },
  confirmPayText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
