import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, Modal, Alert, ActivityIndicator,
  RefreshControl, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS } from '@/constants/config';
import { budgetService, BudgetAllocation } from '@/services/budgetService';

const CATEGORIES = [
  { value: 'CapEx_Asset', label: 'CapEx (Capital Assets)', icon: 'cube-outline' as const, color: '#4F46E5' },
  { value: 'OpEx_Maintenance', label: 'OpEx (Maintenance & AMCs)', icon: 'construct-outline' as const, color: '#D97706' },
  { value: 'SECURITY', label: 'Security Services', icon: 'shield-checkmark-outline' as const, color: '#0284C7' },
  { value: 'CLEANING', label: 'Housekeeping & Sanitation', icon: 'sparkles-outline' as const, color: '#059669' },
  { value: 'FESTIVAL', label: 'Festival Celebrations', icon: 'color-wand-outline' as const, color: '#DB2777' },
  { value: 'SPORTS', label: 'Sports & Amenities', icon: 'football-outline' as const, color: '#7C3AED' },
  { value: 'OpEx_Consumable', label: 'Supplies & Consumables', icon: 'cart-outline' as const, color: '#64748B' },
  { value: 'OpEx_Other', label: 'Other Operational Expenses', icon: 'receipt-outline' as const, color: '#EA580C' },
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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => budgetService.deleteAllocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['society-budget-screen'] });
      Alert.alert('Removed', 'Budget allocation removed.');
    },
  });

  // KPI Calculations
  const totalAllocated = budgets.reduce((sum, b) => sum + (b.allocatedAmount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spentAmount || 0), 0);
  const remaining = totalAllocated - totalSpent;
  const utilizationPct = totalAllocated > 0 ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100)) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Society Budget & Funds</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* FY Selector Strip */}
      <View style={styles.fyStrip}>
        {['FY 2026-27', 'FY 2025-26', 'FY 2024-25'].map(year => (
          <TouchableOpacity
            key={year}
            style={[styles.fyChip, fy === year && styles.fyChipActive]}
            onPress={() => setFy(year)}
          >
            <Text style={[styles.fyText, fy === year && styles.fyTextActive]}>{year}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Master Treasury Budget Card */}
      <View style={styles.masterCard}>
        <Text style={styles.masterLabel}>TOTAL {fy} CAPITAL & OPEX BUDGET</Text>
        <Text style={styles.masterAmount}>₹{(totalAllocated / 100000).toFixed(2)} Lakhs</Text>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${utilizationPct}%` }]} />
        </View>

        <View style={styles.masterStatsRow}>
          <View>
            <Text style={styles.subStatLabel}>Utilized ({utilizationPct}%)</Text>
            <Text style={styles.subStatVal}>₹{(totalSpent / 100000).toFixed(2)} L</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.subStatLabel}>Reserve Balance</Text>
            <Text style={[styles.subStatVal, { color: '#34D399' }]}>₹{(remaining / 100000).toFixed(2)} L</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={budgets}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#4F46E5']} />}
        renderItem={({ item }) => {
          const cfg = CATEGORIES.find(c => c.value === item.category) || CATEGORIES[0];
          const pct = item.allocatedAmount > 0 ? Math.min(100, Math.round((item.spentAmount / item.allocatedAmount) * 100)) : 0;
          const isOverBudget = item.spentAmount > item.allocatedAmount;

          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: `${cfg.color}15` }]}>
                  <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.catTitle}>{cfg.label}</Text>
                  {item.notes && <Text style={styles.catNotes}>{item.notes}</Text>}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Delete Allocation', `Remove budget allocation for ${cfg.label}?`, [
                      { text: 'Cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) }
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.budgetNumsRow}>
                <View>
                  <Text style={styles.numLabel}>Allocated</Text>
                  <Text style={styles.numVal}>₹{item.allocatedAmount.toLocaleString('en-IN')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.numLabel}>Spent ({pct}%)</Text>
                  <Text style={[styles.numVal, isOverBudget && { color: '#DC2626' }]}>
                    ₹{item.spentAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.cardProgressBarTrack}>
                <View style={[
                  styles.cardProgressBar,
                  { width: `${pct}%`, backgroundColor: isOverBudget ? '#DC2626' : cfg.color }
                ]} />
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No budget allocations for {fy}</Text>
            <Text style={styles.emptySub}>Tap + to allocate funds for society categories</Text>
          </View>
        }
      />

      {/* Allocate Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Allocate Society Budget</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Select Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.catPill, category === c.value && styles.catPillActive]}
                  onPress={() => setCategory(c.value)}
                >
                  <Text style={[styles.catPillText, category === c.value && styles.catPillTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Allocated Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.label}>Allocation Notes / Justification</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Annual lift and generator maintenance contract..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => {
                const num = parseFloat(amount);
                if (isNaN(num) || num <= 0) {
                  Alert.alert('Required', 'Please enter a valid amount.');
                  return;
                }
                allocateMutation.mutate({
                  financialYear: fy,
                  category,
                  amount: num,
                  notes: notes.trim() || undefined,
                });
              }}
              disabled={allocateMutation.isPending}
            >
              {allocateMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Confirm Allocation</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  fyStrip: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  fyChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  fyChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  fyText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  fyTextActive: { color: '#FFFFFF', fontWeight: '700' },
  masterCard: { marginHorizontal: 16, backgroundColor: '#1E1B4B', borderRadius: 18, padding: 18, marginBottom: 12 },
  masterLabel: { fontSize: 10, color: '#A5B4FC', fontWeight: '700', letterSpacing: 0.5 },
  masterAmount: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginVertical: 4 },
  progressContainer: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginVertical: 8, overflow: 'hidden' },
  progressBar: { height: 6, backgroundColor: '#38BDF8', borderRadius: 3 },
  masterStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  subStatLabel: { fontSize: 10, color: '#C7D2FE' },
  subStatVal: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', marginTop: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  catTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  catNotes: { fontSize: 11, color: '#64748B', marginTop: 1 },
  budgetNumsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  numLabel: { fontSize: 10, color: '#64748B' },
  numVal: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 1 },
  cardProgressBarTrack: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  cardProgressBar: { height: 5, borderRadius: 3 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  label: { fontSize: 11, fontWeight: '700', color: '#334155', marginBottom: 4 },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9' },
  catPillActive: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#4F46E5' },
  catPillText: { fontSize: 11, color: '#64748B' },
  catPillTextActive: { color: '#4F46E5', fontWeight: '700' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: '#0F172A', marginBottom: 10 },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8, fontSize: 12, color: '#0F172A', height: 60, textAlignVertical: 'top', marginBottom: 14 },
  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
