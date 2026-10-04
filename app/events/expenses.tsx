import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventExpenseService } from '@/services/eventExpenseService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

const CATEGORIES = ['Venue & Stage', 'Sound & Lights', 'Catering / Food', 'Prizes & Trophies', 'Decorations', 'Security & Permissions', 'Miscellaneous'];

export default function EventExpensesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const eventId = Number(id);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [showAdd, setShowAdd] = useState(false);

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
    onBeforeBack: () => {
      if (showAdd) {
        setShowAdd(false);
        return true;
      }
    },
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['event-expenses', eventId],
    queryFn: () => eventExpenseService.getAll(eventId),
    enabled: !!eventId,
  });

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const addMutation = useMutation({
    mutationFn: () =>
      eventExpenseService.create({
        eventId,
        description: description.trim(),
        amount: parseFloat(amount) || 0,
        vendorName: vendorName.trim() || undefined,
        category,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-expenses', eventId] });
      setDescription('');
      setAmount('');
      setVendorName('');
      setShowAdd(false);
      Alert.alert('Expense Logged', 'Event expense has been added.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not record expense.');
    },
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Budget & Expenses</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={s.addBtn}>
          <Ionicons name={showAdd ? 'close' : 'add'} size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Total Spent Card */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>TOTAL EXPENDITURE</Text>
          <Text style={s.totalAmount}>₹{totalSpent.toLocaleString('en-IN')}</Text>
          <Text style={s.totalSub}>{expenses.length} expense items recorded</Text>
        </View>

        {/* Add Expense Form */}
        {showAdd && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>Record New Expense</Text>

            <Text style={s.inputLabel}>Expense Description</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Stage floral arrangement"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={s.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={s.inputLabel}>Vendor / Payee Name (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Dream Decorators"
              value={vendorName}
              onChangeText={setVendorName}
            />

            <Text style={s.inputLabel}>Category</Text>
            <View style={s.pillsWrap}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.pill, category === cat && s.pillActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[s.pillText, category === cat && s.pillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={s.saveBtn}
              onPress={() => addMutation.mutate()}
              disabled={addMutation.isPending || !description.trim() || !amount}
            >
              {addMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.saveBtnText}>Save Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Expenses List */}
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : expenses.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No Expenses Logged</Text>
            <Text style={s.emptySub}>Keep track of vendor payments, catering, and equipment bills.</Text>
          </View>
        ) : (
          expenses.map((e) => (
            <View key={e.id} style={s.expenseRow}>
              <View style={s.catIcon}>
                <Ionicons name="cash-outline" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.expDesc}>{e.description}</Text>
                <Text style={s.expMeta}>
                  {e.category || 'General'} {e.vendorName ? `· ${e.vendorName}` : ''}
                </Text>
              </View>
              <Text style={s.expAmount}>₹{e.amount.toLocaleString('en-IN')}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: COLORS.text },
  addBtn: { padding: 4 },
  content: { padding: 16 },
  totalCard: {
    backgroundColor: '#1E293B', borderRadius: RADIUS.lg,
    padding: 20, alignItems: 'center', marginBottom: 16, ...SHADOWS.md,
  },
  totalLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  totalAmount: { fontSize: 30, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: '#fff', marginVertical: 4 },
  totalSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  formCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, ...SHADOWS.sm,
  },
  formTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 13, backgroundColor: '#F9FAFB' },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F9FAFB',
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  pillTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 11, borderRadius: RADIUS.sm, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 10 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 10, gap: 10, ...SHADOWS.sm,
  },
  catIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  expDesc: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  expMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  expAmount: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
