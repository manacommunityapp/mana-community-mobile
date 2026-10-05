import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { personalFinanceService, PersonalBillDto } from '@/services/personalFinanceService';

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export default function BillsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAID' | 'ALL'>('UPCOMING');
  const [showAddModal, setShowAddModal] = useState(false);
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState('2026-10-15');
  const [isAutoPay, setIsAutoPay] = useState(false);

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['personal-finance-bills'],
    queryFn: personalFinanceService.getBills,
  });

  const markPaidMutation = useMutation({
    mutationFn: personalFinanceService.markBillPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-bills'] });
      Alert.alert('Bill Paid', 'Bill marked as paid and expense recorded.');
    },
  });

  const createBillMutation = useMutation({
    mutationFn: (newBill: any) => personalFinanceService.createBill(newBill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-bills'] });
      setShowAddModal(false);
      setBillName('');
      setBillAmount('');
      Alert.alert('Bill Created', 'Reminder scheduled.');
    },
  });

  const filteredBills = bills.filter(b => {
    if (activeTab === 'UPCOMING') return !b.isPaid;
    if (activeTab === 'PAID') return b.isPaid;
    return true;
  });

  const totalUpcoming = bills.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Bills & Reminders',
          headerBackTitle: 'My Money',
        }}
      />
      <View style={s.container}>
        {/* Total Due Banner */}
        <View style={s.totalBanner}>
          <View>
            <Text style={s.totalLabel}>Upcoming Due This Month</Text>
            <Text style={s.totalAmount}>{formatCurrency(totalUpcoming)}</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={s.addBtnText}>Add Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={s.tabRow}>
          {(['UPCOMING', 'PAID', 'ALL'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[s.tabItem, activeTab === tab && s.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab === 'UPCOMING' ? `Upcoming (${bills.filter(b => !b.isPaid).length})` : tab === 'PAID' ? 'Paid History' : 'All Bills'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          <ScrollView contentContainerStyle={s.listContent}>
            {filteredBills.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color="#10B981" />
                <Text style={s.emptyTitle}>All caught up!</Text>
                <Text style={s.emptySub}>No unpaid bills found in this category.</Text>
              </View>
            ) : (
              filteredBills.map(bill => (
                <View key={bill.id} style={[s.billCard, bill.isPaid && s.billCardPaid]}>
                  <View style={s.billHeader}>
                    <View style={s.billIconWrap}>
                      <Ionicons name={(bill.categoryIcon || 'receipt-outline') as any} size={20} color={bill.isPaid ? '#10B981' : '#D97706'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.billTitle}>{bill.name}</Text>
                      <View style={s.badgeRow}>
                        <Text style={s.dueDateText}>Due: {bill.dueDate}</Text>
                        {bill.isAutoPay && (
                          <View style={s.autoPayPill}>
                            <Ionicons name="refresh" size={10} color="#6366F1" />
                            <Text style={s.autoPayText}>Auto-Pay</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.billPrice}>{formatCurrency(bill.amount)}</Text>
                      {bill.isPaid ? (
                        <View style={s.paidBadge}>
                          <Ionicons name="checkmark-circle" size={12} color="#059669" />
                          <Text style={s.paidBadgeText}>PAID</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={s.payBtn}
                          disabled={markPaidMutation.isPending}
                          onPress={() => markPaidMutation.mutate(bill.id)}
                        >
                          <Text style={s.payBtnText}>Mark Paid</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* Add Bill Modal */}
        <Modal visible={showAddModal} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Bill / Reminder</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Bill Name / Biller *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Broadband, BESCOM, Society Maintenance"
                placeholderTextColor="#94A3B8"
                value={billName}
                onChangeText={setBillName}
              />

              <Text style={s.label}>Amount (₹) *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 1500"
                placeholderTextColor="#94A3B8"
                value={billAmount}
                onChangeText={setBillAmount}
                keyboardType="numeric"
              />

              <Text style={s.label}>Due Date (YYYY-MM-DD)</Text>
              <TextInput
                style={s.input}
                placeholder="2026-10-15"
                placeholderTextColor="#94A3B8"
                value={billDueDate}
                onChangeText={setBillDueDate}
              />

              <TouchableOpacity
                style={s.checkboxRow}
                onPress={() => setIsAutoPay(!isAutoPay)}
              >
                <Ionicons
                  name={isAutoPay ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={s.checkboxLabel}>Auto-pay enabled with bank</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.submitBtn, (!billName || !billAmount) && { opacity: 0.5 }]}
                disabled={!billName || !billAmount || createBillMutation.isPending}
                onPress={() => {
                  createBillMutation.mutate({
                    name: billName.trim(),
                    amount: parseFloat(billAmount),
                    dueDate: billDueDate,
                    isAutoPay,
                    categoryIcon: 'receipt-outline',
                  });
                }}
              >
                <Text style={s.submitBtnText}>Schedule Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  totalBanner: {
    backgroundColor: '#1E293B',
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 12, color: '#94A3B8' },
  totalAmount: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  tabRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  listContent: { padding: 16, gap: 12 },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  billCardPaid: { opacity: 0.75, backgroundColor: '#F8FAFC' },
  billHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  billIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  billTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dueDateText: { fontSize: 12, color: '#64748B' },
  autoPayPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  autoPayText: { fontSize: 10, color: '#6366F1', fontWeight: '700' },
  billPrice: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  payBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  payBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  paidBadgeText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1E293B', marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  checkboxLabel: { fontSize: 13, color: '#334155' },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
