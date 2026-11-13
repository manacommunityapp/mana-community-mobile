import { useState, useCallback } from 'react';
import { useHrmOrg } from '@/hooks/useHrmOrg';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { hrmService } from '@/services/hrmService';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { HelpDeskTicket } from '@/types/hrm';

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#D97706',
  IN_PROGRESS: COLORS.primary,
  RESOLVED: COLORS.success,
  CLOSED: COLORS.textSecondary,
};

const CATEGORIES = ['PAYROLL', 'LEAVE', 'IT', 'ATTENDANCE', 'GENERAL'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function TicketCard({ item }: { item: HelpDeskTicket }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.ticketNum}>{item.ticketNumber}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[item.status] ?? COLORS.text }]}>{item.status}</Text>
      </View>
      <Text style={styles.subject}>{item.subject}</Text>
      <Text style={styles.category}>{item.category} · {item.priority}</Text>
      {item.resolution && (
        <View style={styles.resolution}>
          <Text style={styles.resolutionLabel}>Resolution:</Text>
          <Text style={styles.resolutionText}>{item.resolution}</Text>
        </View>
      )}
    </View>
  );
}

export default function HelpDeskScreen() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', category: 'GENERAL', priority: 'MEDIUM' });
  const [catIndex, setCatIndex] = useState(4);
  const [priIndex, setPriIndex] = useState(1);

  const { activeOrgId: orgId, initialize } = useHrmOrg();
  useEffect(() => { initialize(); }, []);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['hrm-my-tickets', orgId],
    queryFn: () => hrmService.getMyTickets(orgId!),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: () => hrmService.createTicket(orgId!, { ...form, category: CATEGORIES[catIndex], priority: PRIORITIES[priIndex] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hrm-my-tickets'] }); setShowModal(false); },
    onError: () => Alert.alert('Error', 'Failed to submit ticket.'),
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title="Help Desk" showBack />
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Raise Ticket</Text>
      </TouchableOpacity>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={data?.content ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <TicketCard item={item} />}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No tickets yet.</Text>}
        />
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Raise Support Ticket</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={COLORS.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <TextInput style={styles.input} placeholder="Subject *" value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} />
            <TextInput style={[styles.input, { height: 100 }]} placeholder="Describe your issue *" value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} multiline />
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIES.map((c, i) => (
                <TouchableOpacity key={c} style={[styles.chip, catIndex === i && styles.chipActive]} onPress={() => setCatIndex(i)}>
                  <Text style={[styles.chipText, catIndex === i && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.fieldLabel}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {PRIORITIES.map((p, i) => (
                <TouchableOpacity key={p} style={[styles.chip, priIndex === i && styles.chipActive]} onPress={() => setPriIndex(i)}>
                  <Text style={[styles.chipText, priIndex === i && styles.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.saveBtn, createMutation.isPending && { opacity: 0.6 }]} onPress={() => createMutation.mutate()} disabled={createMutation.isPending || !form.subject || !form.description}>
              <Text style={styles.saveBtnText}>Submit Ticket</Text>
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
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketNum: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, fontFamily: 'monospace' },
  status: { ...FONTS.medium, fontSize: 11 },
  subject: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  category: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  resolution: { backgroundColor: '#F0FDF4', borderRadius: RADIUS.xs, padding: 8 },
  resolutionLabel: { ...FONTS.semibold, fontSize: 11, color: COLORS.success },
  resolutionText: { ...FONTS.regular, fontSize: 12, color: COLORS.text, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, ...FONTS.regular },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { ...FONTS.semibold, fontSize: 17, color: COLORS.text },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, marginBottom: 10, ...FONTS.regular, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.white },
  fieldLabel: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { ...FONTS.medium, fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', marginBottom: 32 },
  saveBtnText: { color: COLORS.white, ...FONTS.semibold, fontSize: 15 },
});
