import { useState, useCallback } from 'react';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { ExpenseClaim, ExpenseItem } from '@/types/hrm';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: COLORS.textSecondary,
  SUBMITTED: COLORS.primary,
  APPROVED: COLORS.success,
  REJECTED: COLORS.error,
  REIMBURSED: '#7C3AED',
};

const CLAIM_TYPES = ['TRAVEL', 'MEAL', 'ACCOMMODATION', 'MEDICAL', 'OTHER'];

function ClaimRow({ item, onSubmit }: { item: ExpenseClaim; onSubmit: (id: number) => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.claimTitle}</Text>
          <Text style={styles.sub}>{item.claimType} · {item.claimDate}</Text>
        </View>
        <Text style={[styles.badge, { color: STATUS_COLORS[item.status] ?? COLORS.text }]}>{item.status}</Text>
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.amount}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
        {item.status === 'DRAFT' && (
          <TouchableOpacity style={styles.btn} onPress={() => onSubmit(item.id)}>
            <Text style={styles.btnText}>Submit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function ExpensesScreen() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ claimTitle: '', claimType: 'TRAVEL', claimDate: new Date().toISOString().slice(0, 10), description: '' });
  const [items, setItems] = useState<Partial<ExpenseItem>[]>([{ description: '', amount: 0 }]);

  const { activeOrgId: orgId, initialize } = useHrmOrg();
  useEffect(() => { initialize(); }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-my-claims', orgId],
    queryFn: () => hrmService.getMyClaims(orgId!),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => hrmService.createExpenseClaim(orgId!, { ...form, items }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hrm-my-claims'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to create claim.'),
  });

  const submitMutation = useMutation({
    mutationFn: (claimId: number) => hrmService.submitExpenseClaim(orgId!, claimId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hrm-my-claims'] }),
    onError: () => Alert.alert('Error', 'Failed to submit claim.'),
  });

  const total = items.reduce((s, i) => s + (i.amount ?? 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title="My Expenses" showBack />
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>New Claim</Text>
      </TouchableOpacity>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={data?.content ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <ClaimRow item={item} onSubmit={id => submitMutation.mutate(id)} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No expense claims yet.</Text>}
        />
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Expense Claim</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <TextInput style={styles.input} placeholder="Claim Title" value={form.claimTitle} onChangeText={v => setForm(f => ({ ...f, claimTitle: v }))} />
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={form.claimDate} onChangeText={v => setForm(f => ({ ...f, claimDate: v }))} />
            <TextInput style={[styles.input, { height: 72 }]} placeholder="Description" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />
            <Text style={styles.sectionLabel}>Line Items</Text>
            {items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <TextInput style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]} placeholder="Description" value={item.description} onChangeText={v => setItems(arr => arr.map((it, j) => j === i ? { ...it, description: v } : it))} />
                <TextInput style={[styles.input, { width: 90, marginBottom: 0 }]} placeholder="₹" keyboardType="numeric" value={item.amount ? String(item.amount) : ''} onChangeText={v => setItems(arr => arr.map((it, j) => j === i ? { ...it, amount: parseFloat(v) || 0 } : it))} />
              </View>
            ))}
            <TouchableOpacity onPress={() => setItems(arr => [...arr, { description: '', amount: 0 }])} style={{ marginBottom: 8 }}>
              <Text style={{ color: COLORS.primary, ...FONTS.medium, fontSize: 13 }}>+ Add Item</Text>
            </TouchableOpacity>
            <Text style={styles.total}>Total: ₹{total.toLocaleString('en-IN')}</Text>
            <TouchableOpacity style={[styles.saveBtn, createMutation.isPending && { opacity: 0.6 }]} onPress={() => createMutation.mutate()} disabled={createMutation.isPending || !form.claimTitle}>
              <Text style={styles.saveBtnText}>Save Claim</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', margin: 16, backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: COLORS.white, ...FONTS.medium, fontSize: 14 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm, gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  sub: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { ...FONTS.medium, fontSize: 11 },
  amount: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xs, paddingHorizontal: 12, paddingVertical: 5 },
  btnText: { color: COLORS.white, ...FONTS.medium, fontSize: 12 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, ...FONTS.regular },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { ...FONTS.semibold, fontSize: 17, color: COLORS.text },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, marginBottom: 10, ...FONTS.regular, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.white },
  sectionLabel: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, marginBottom: 6 },
  itemRow: { flexDirection: 'row', marginBottom: 8 },
  total: { ...FONTS.semibold, fontSize: 14, color: COLORS.text, textAlign: 'right', marginBottom: 16 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', marginBottom: 32 },
  saveBtnText: { color: COLORS.white, ...FONTS.semibold, fontSize: 15 },
});
