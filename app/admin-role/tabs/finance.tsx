import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { ADMIN_COLORS } from '@/constants/adminTheme';
import { adminRoleService, type FinanceEntry } from '@/services/adminService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'all' | 'income' | 'expense' | 'overdue';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expenses' },
  { key: 'overdue', label: 'Overdue' },
];

const CATEGORY_ICONS: Record<string, { icon: IoniconsName; color: string; bg: string }> = {
  'Maintenance Dues': { icon: 'home', color: '#4F46E5', bg: '#EEF2FF' },
  'Security Services': { icon: 'shield', color: '#0891B2', bg: '#CFFAFE' },
  'Housekeeping': { icon: 'sparkles', color: '#7C3AED', bg: '#EDE9FE' },
  'Repairs': { icon: 'construct', color: '#EA580C', bg: '#FFF7ED' },
  'Utilities': { icon: 'flash', color: '#D97706', bg: '#FEF3C7' },
  'Insurance': { icon: 'umbrella', color: '#059669', bg: '#D1FAE5' },
  'Invoice': { icon: 'document-text', color: '#4F46E5', bg: '#EEF2FF' },
  'Receipt': { icon: 'receipt', color: '#059669', bg: '#D1FAE5' },
  'Advance Payment': { icon: 'cash', color: '#059669', bg: '#D1FAE5' },
  'Purchases': { icon: 'cart', color: '#EA580C', bg: '#FFF7ED' },
  'Vendor Payments': { icon: 'briefcase', color: '#D97706', bg: '#FEF3C7' },
  'Budget': { icon: 'pie-chart', color: '#7C3AED', bg: '#EDE9FE' },
};

export default function AdminFinanceScreen() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = async () => {
    const data = await adminRoleService.getFinanceEntries();
    setEntries(data);
  };

  useEffect(() => { loadEntries(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  };

  const filtered = entries.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'income') return e.type === 'INCOME';
    if (filter === 'expense') return e.type === 'EXPENSE';
    return e.status === 'OVERDUE';
  });

  const totalIncome = entries.filter(e => e.type === 'INCOME' && e.status === 'COMPLETED').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = entries.filter(e => e.type === 'EXPENSE' && e.status === 'COMPLETED').reduce((s, e) => s + e.amount, 0);
  const totalOverdue = entries.filter(e => e.status === 'OVERDUE').reduce((s, e) => s + e.amount, 0);

  const renderEntry = ({ item }: { item: FinanceEntry }) => {
    const catMeta = CATEGORY_ICONS[item.category] || { icon: 'cash-outline' as IoniconsName, color: '#6B7280', bg: '#F3F4F6' };
    const isIncome = item.type === 'INCOME';
    const isOverdue = item.status === 'OVERDUE';

    return (
      <View style={[s.card, isOverdue && s.cardOverdue]}>
        <View style={s.cardTop}>
          <View style={[s.entryIcon, { backgroundColor: catMeta.bg }]}>
            <Ionicons name={catMeta.icon} size={20} color={catMeta.color} />
          </View>
          <View style={s.cardBody}>
            <Text style={s.entryCategory}>{item.category}</Text>
            <Text style={s.entryDesc} numberOfLines={1}>{item.description}</Text>
            <View style={s.metaRow}>
              <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
              <Text style={[s.metaText, isOverdue && { color: COLORS.error, fontWeight: '600' }]}>{item.date}</Text>
              <View style={[s.statusDot, {
                backgroundColor: item.status === 'COMPLETED' ? COLORS.success
                  : item.status === 'OVERDUE' ? COLORS.error : '#D97706',
              }]} />
              <Text style={s.metaText}>{item.status}</Text>
            </View>
          </View>
          <Text style={[s.amount, { color: isIncome ? '#059669' : ADMIN_COLORS.accent }]}>
            {isIncome ? '+' : '-'}₹{(item.amount / 1000).toFixed(item.amount >= 100000 ? 0 : 1)}k
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Finance</Text>
      </View>

      {/* Summary */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { borderLeftColor: '#059669' }]}>
          <Text style={s.summaryLabel}>Income</Text>
          <Text style={[s.summaryValue, { color: '#059669' }]}>₹{(totalIncome / 1000).toFixed(0)}k</Text>
        </View>
        <View style={[s.summaryCard, { borderLeftColor: ADMIN_COLORS.accent }]}>
          <Text style={s.summaryLabel}>Expenses</Text>
          <Text style={[s.summaryValue, { color: ADMIN_COLORS.accent }]}>₹{(totalExpenses / 1000).toFixed(0)}k</Text>
        </View>
        <View style={[s.summaryCard, { borderLeftColor: '#D97706' }]}>
          <Text style={s.summaryLabel}>Overdue</Text>
          <Text style={[s.summaryValue, { color: '#D97706' }]}>₹{(totalOverdue / 1000).toFixed(0)}k</Text>
        </View>
      </View>

      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderEntry}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No entries</Text>
            <Text style={s.emptyDesc}>No finance records match this filter</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  summaryRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 4, ...SHADOWS.sm,
  },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  summaryValue: { fontSize: 17, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: ADMIN_COLORS.accent, borderColor: ADMIN_COLORS.accentDark },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardOverdue: { borderColor: COLORS.error, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  entryCategory: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  entryDesc: { fontSize: 12, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
  amount: { fontSize: 16, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
