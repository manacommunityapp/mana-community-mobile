import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  personalFinanceService,
  PersonalGoalDto,
  CreatePersonalGoalDto,
} from '@/services/personalFinanceService';

const GOAL_ICONS = [
  'shield-checkmark',
  'airplane',
  'home',
  'car-sport',
  'school',
  'heart',
  'gift',
  'trending-up',
];

const GOAL_COLORS = [
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#6366F1',
  '#14B8A6',
  '#EF4444',
];

function formatCurrency(amount: number): string {
  return '₹' + Math.abs(amount).toLocaleString('en-IN');
}

export default function PersonalFinanceGoals() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<PersonalGoalDto | null>(null);

  // Form states for creating goal
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('2027-04-01');
  const [selectedIcon, setSelectedIcon] = useState('shield-checkmark');
  const [selectedColor, setSelectedColor] = useState('#10B981');
  const [notes, setNotes] = useState('');

  // Form states for deposit
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('acc-1');

  const {
    data: goals = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['personal-finance-goals'],
    queryFn: personalFinanceService.getGoals,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['personal-finance-accounts'],
    queryFn: personalFinanceService.getAccounts,
  });

  const createGoalMutation = useMutation({
    mutationFn: (dto: CreatePersonalGoalDto) => personalFinanceService.createGoal(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-goals'] });
      setModalVisible(false);
      resetForm();
      Alert.alert('Goal Created', 'Your new savings target is now active!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to create goal');
    },
  });

  const depositMutation = useMutation({
    mutationFn: ({ id, amount, accountId, note }: { id: string; amount: number; accountId: string; note: string }) =>
      personalFinanceService.contributeToGoal(id, { amount, accountId, notes: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-finance-goals'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['personal-finance-dashboard'] });
      setDepositModalVisible(false);
      setDepositAmount('');
      setDepositNote('');
      Alert.alert('Deposit Added', 'Savings contribution recorded successfully!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to deposit savings');
    },
  });

  const resetForm = () => {
    setName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate('2027-04-01');
    setSelectedIcon('shield-checkmark');
    setSelectedColor('#10B981');
    setNotes('');
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleSaveGoal = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a goal title');
      return;
    }
    const numTarget = parseFloat(targetAmount);
    if (!numTarget || numTarget <= 0) {
      Alert.alert('Required', 'Please enter a valid target amount');
      return;
    }

    createGoalMutation.mutate({
      name: name.trim(),
      targetAmount: numTarget,
      currentAmount: parseFloat(currentAmount) || 0,
      targetDate,
      icon: selectedIcon,
      color: selectedColor,
      notes: notes.trim() || undefined,
    });
  };

  const handleDeposit = () => {
    if (!selectedGoal) return;
    const numAmt = parseFloat(depositAmount);
    if (!numAmt || numAmt <= 0) {
      Alert.alert('Required', 'Please enter a valid deposit amount');
      return;
    }

    depositMutation.mutate({
      id: selectedGoal.id,
      amount: numAmt,
      accountId: depositAccountId,
      note: depositNote.trim() || 'Savings deposit',
    });
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading savings goals...</Text>
      </View>
    );
  }

  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Summary Card ── */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.summaryLabel}>Total Savings in Goals</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(totalSaved)}</Text>
            <Text style={styles.summarySub}>Target: {formatCurrency(totalTarget)} ({overallPct}% achieved)</Text>
          </View>
          <View style={[styles.progressBadge, { backgroundColor: '#10B981' + '22' }]}>
            <Ionicons name="trophy" size={24} color="#10B981" />
          </View>
        </View>

        <View style={styles.overallTrack}>
          <View style={[styles.overallFill, { width: `${Math.min(overallPct, 100)}%` as any }]} />
        </View>
      </View>

      {/* ── Section Header ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Active Savings Targets ({goals.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>New Goal</Text>
        </TouchableOpacity>
      </View>

      {/* ── Goals List ── */}
      {goals.map((goal) => {
        const pct = Math.min(goal.percentAchieved, 100);
        return (
          <View key={goal.id} style={styles.goalCard}>
            <View style={styles.goalCardHeader}>
              <View style={[styles.goalIconWrap, { backgroundColor: (goal.color || '#10B981') + '22' }]}>
                <Ionicons name={(goal.icon || 'flag') as any} size={22} color={goal.color || '#10B981'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalTargetDate}>
                  Target: {goal.targetDate || 'No date'} • {goal.monthsRemaining} mos remaining
                </Text>
              </View>
              <View style={styles.pctBadge}>
                <Text style={[styles.pctBadgeText, { color: goal.color || '#10B981' }]}>{goal.percentAchieved}%</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: goal.color || '#10B981' }]} />
            </View>

            {/* Amounts Row */}
            <View style={styles.amountsRow}>
              <View>
                <Text style={styles.amountLabel}>Saved</Text>
                <Text style={[styles.amountValue, { color: goal.color || '#10B981' }]}>{formatCurrency(goal.currentAmount)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amountLabel}>Remaining</Text>
                <Text style={styles.amountValue}>{formatCurrency(goal.remainingAmount)}</Text>
              </View>
            </View>

            {/* Required Monthly Pace */}
            {!goal.isCompleted && (
              <View style={styles.paceBox}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
                <Text style={styles.paceText}>
                  Save <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{formatCurrency(goal.requiredMonthlySavings)}/mo</Text> to reach goal on time
                </Text>
              </View>
            )}

            {/* Deposit Action */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.depositBtn, { backgroundColor: goal.color || '#10B981' }]}
                onPress={() => {
                  setSelectedGoal(goal);
                  setDepositModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.depositBtnText}>Deposit Savings</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* ── Create Goal Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎯 Create Savings Goal</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Goal Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dream Home Downpayment"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Target Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500000"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={targetAmount}
                onChangeText={setTargetAmount}
              />

              <Text style={styles.inputLabel}>Already Saved (₹, optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={currentAmount}
                onChangeText={setCurrentAmount}
              />

              <Text style={styles.inputLabel}>Target Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2027-04-01"
                placeholderTextColor="#94A3B8"
                value={targetDate}
                onChangeText={setTargetDate}
              />

              <Text style={styles.inputLabel}>Choose Icon</Text>
              <View style={styles.iconGrid}>
                {GOAL_ICONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconChip, selectedIcon === ic && styles.iconChipActive]}
                    onPress={() => setSelectedIcon(ic)}
                  >
                    <Ionicons name={ic as any} size={20} color={selectedIcon === ic ? '#FFFFFF' : '#475569'} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Choose Color</Text>
              <View style={styles.colorGrid}>
                {GOAL_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorChip, { backgroundColor: c }, selectedColor === c && styles.colorChipActive]}
                    onPress={() => setSelectedColor(c)}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                placeholder="e.g. Fixed deposit maturing next year"
                placeholderTextColor="#94A3B8"
                multiline
                value={notes}
                onChangeText={setNotes}
              />

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveGoal}
                disabled={createGoalMutation.isPending}
              >
                {createGoalMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Target</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Deposit Modal ── */}
      <Modal visible={depositModalVisible} animationType="slide" transparent onRequestClose={() => setDepositModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Deposit to {selectedGoal?.name}</Text>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount to Deposit (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5000"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
            />

            <Text style={styles.inputLabel}>Deduct from Account</Text>
            <View style={styles.accountPickerRow}>
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.accountChip, depositAccountId === acc.id && styles.accountChipActive]}
                  onPress={() => setDepositAccountId(acc.id)}
                >
                  <Text style={[styles.accountChipText, depositAccountId === acc.id && { color: '#FFFFFF' }]}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Deposit Note</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Bonus allocation"
              placeholderTextColor="#94A3B8"
              value={depositNote}
              onChangeText={setDepositNote}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: selectedGoal?.color || '#10B981' }]}
              onPress={handleDeposit}
              disabled={depositMutation.isPending}
            >
              {depositMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Confirm Deposit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: SPACING.md, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  summaryLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  summaryAmount: { fontSize: 28, fontWeight: 'bold', color: '#1E293B', marginTop: 4 },
  summarySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  progressBadge: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  overallTrack: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  overallFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  goalCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.sm },
  goalIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  goalName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  goalTargetDate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  pctBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, backgroundColor: '#F1F5F9' },
  pctBadgeText: { fontSize: 13, fontWeight: 'bold' },
  barTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginVertical: SPACING.sm, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  amountLabel: { fontSize: 11, color: '#94A3B8' },
  amountValue: { fontSize: 14, fontWeight: 'bold', color: '#1E293B', marginTop: 2 },
  paceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  paceText: { fontSize: 12, color: '#1E40AF', flex: 1 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  depositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  depositBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: SPACING.sm, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: SPACING.xs,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  iconChip: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  iconChipActive: { backgroundColor: COLORS.primary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 },
  colorChip: { width: 32, height: 32, borderRadius: 16 },
  colorChipActive: { borderWidth: 3, borderColor: '#1E293B' },
  accountPickerRow: { gap: 6, marginVertical: 6 },
  accountChip: { padding: 10, borderRadius: RADIUS.md, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  accountChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  accountChipText: { fontSize: 13, color: '#334155' },
  saveBtn: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
