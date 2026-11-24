import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Modal, TextInput, ActivityIndicator, ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { whitelistService, WhitelistEntry, WhitelistCategory, AddWhitelistRequest } from '@/services/whitelistService';

const CATEGORY_META: Record<WhitelistCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  FAMILY:         { label: 'Family',         icon: 'heart-outline',       color: '#DB2777', bg: '#FCE7F3' },
  FRIEND:         { label: 'Friend',         icon: 'people-outline',      color: COLORS.primary, bg: '#EEF2FF' },
  DRIVER:         { label: 'Driver',         icon: 'car-outline',         color: '#2563EB', bg: '#DBEAFE' },
  DOMESTIC_HELP:  { label: 'Domestic Help',  icon: 'home-outline',        color: '#7C3AED', bg: '#F5F3FF' },
  DELIVERY_AGENT: { label: 'Delivery',       icon: 'cube-outline',        color: '#D97706', bg: '#FEF3C7' },
  OTHER:          { label: 'Other',          icon: 'person-outline',      color: '#6B7280', bg: '#F3F4F6' },
};

const CATEGORIES: WhitelistCategory[] = ['FAMILY', 'FRIEND', 'DRIVER', 'DOMESTIC_HELP', 'DELIVERY_AGENT', 'OTHER'];


function formatLastVisit(iso?: string): string {
  if (!iso) return 'Never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function WhitelistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [addError, setAddError] = useState('');
  const [removeConfirmEntry, setRemoveConfirmEntry] = useState<WhitelistEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<AddWhitelistRequest>({ visitorName: '', category: 'FAMILY', visitorPhone: '', vehicleNumber: '', notes: '' });

  const { data: rawList, isLoading, refetch } = useQuery<WhitelistEntry[]>({
    queryKey: ['visitors', 'whitelist'],
    queryFn: () => whitelistService.getMyWhitelist(),
    staleTime: 30_000,
  });

  const list = rawList ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const addMutation = useMutation({
    mutationFn: (req: AddWhitelistRequest) => whitelistService.addToWhitelist(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors', 'whitelist'] });
      setAddModal(false);
      setAddError('');
      setForm({ visitorName: '', category: 'FAMILY', visitorPhone: '', vehicleNumber: '', notes: '' });
    },
    onError: (err: any) => setAddError(err?.message || 'Failed to add. Try again.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => whitelistService.removeFromWhitelist(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors', 'whitelist'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      whitelistService.toggleWhitelistStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['visitors', 'whitelist'] }),
  });

  const handleAdd = () => {
    if (!form.visitorName.trim()) { setAddError('Please enter a name.'); return; }
    setAddError('');
    addMutation.mutate({ ...form, visitorName: form.visitorName.trim() });
  };

  const confirmRemove = (entry: WhitelistEntry) => {
    setRemoveConfirmEntry(entry);
  };

  const renderItem = ({ item }: { item: WhitelistEntry }) => {
    const meta = CATEGORY_META[item.category] || CATEGORY_META.OTHER;
    return (
      <View style={[s.card, !item.isActive && s.cardDisabled]}>
        <View style={s.cardRow}>
          <View style={[s.catIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.entryName}>{item.visitorName}</Text>
            <Text style={[s.catLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleMutation.mutate({ id: item.id, isActive: !item.isActive })}
            style={[s.toggleBtn, { backgroundColor: item.isActive ? '#D1FAE5' : '#F1F5F9' }]}
          >
            <Ionicons name={item.isActive ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={item.isActive ? '#059669' : '#94A3B8'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmRemove(item)} style={s.removeBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={s.cardFooter}>
          {item.vehicleNumber && (
            <View style={s.metaChip}>
              <Ionicons name="car-outline" size={11} color={COLORS.primary} />
              <Text style={s.metaChipText}>{item.vehicleNumber}</Text>
            </View>
          )}
          {item.visitCount !== undefined && (
            <View style={s.metaChip}>
              <Ionicons name="repeat-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaChipText}>{item.visitCount} visits</Text>
            </View>
          )}
          <View style={s.metaChip}>
            <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
            <Text style={s.metaChipText}>Last: {formatLastVisit(item.lastVisit)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Frequent Visitors</Text>
          <Text style={s.headerSub}>Whitelist for fast-track entry</Text>
        </View>
        <TouchableOpacity onPress={() => setAddModal(true)} style={s.addBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={s.infoBanner}>
        <Ionicons name="information-circle-outline" size={15} color="#2563EB" />
        <Text style={s.infoText}>Whitelisted visitors get fast-track entry — no resident approval needed each time.</Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={s.empty}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            <View style={s.empty}>
              <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No frequent visitors</Text>
              <Text style={s.emptySub}>Add family, friends, or regular service providers</Text>
            </View>
          )
        }
      />

      <Modal visible={addModal} transparent animationType="slide">
        <View style={s.overlay}>
          <ScrollView contentContainerStyle={s.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <View>
                  <Text style={s.modalTitle}>Add to Whitelist</Text>
                  <Text style={s.modalSub}>Allow fast-track entry for this person</Text>
                </View>
                <TouchableOpacity onPress={() => setAddModal(false)}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {CATEGORIES.map(c => {
                    const m = CATEGORY_META[c];
                    const sel = form.category === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[s.catChip, sel && { backgroundColor: m.color, borderColor: m.color }]}
                        onPress={() => setForm(f => ({ ...f, category: c }))}
                      >
                        <Ionicons name={m.icon} size={13} color={sel ? '#fff' : m.color} />
                        <Text style={[s.catChipText, sel && { color: '#fff' }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={s.label}>Name *</Text>
              <TextInput style={s.input} placeholder="e.g. Priya (Sister), Swiggy" placeholderTextColor={COLORS.textMuted} value={form.visitorName} onChangeText={v => setForm(f => ({ ...f, visitorName: v }))} />

              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Phone</Text>
                  <TextInput style={s.input} placeholder="Optional" keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted} value={form.visitorPhone} onChangeText={v => setForm(f => ({ ...f, visitorPhone: v }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Vehicle No</Text>
                  <TextInput style={s.input} placeholder="Optional" autoCapitalize="characters" placeholderTextColor={COLORS.textMuted} value={form.vehicleNumber} onChangeText={v => setForm(f => ({ ...f, vehicleNumber: v }))} />
                </View>
              </View>

              <Text style={s.label}>Notes</Text>
              <TextInput style={s.input} placeholder="e.g. Mon-Sat mornings" placeholderTextColor={COLORS.textMuted} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />

              {addError ? (
                <View style={s.inlineError}>
                  <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
                  <Text style={s.inlineErrorText}>{addError}</Text>
                </View>
              ) : null}
              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setAddModal(false); setAddError(''); }}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.confirmBtn, addMutation.isPending && { opacity: 0.7 }]} onPress={handleAdd} disabled={addMutation.isPending}>
                  {addMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.confirmText}>Add to Whitelist</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Remove confirm bottom sheet */}
      <Modal visible={!!removeConfirmEntry} transparent animationType="slide" onRequestClose={() => setRemoveConfirmEntry(null)}>
        <TouchableOpacity style={s.removeOverlay} onPress={() => setRemoveConfirmEntry(null)} activeOpacity={1} />
        <View style={s.removeSheet}>
          <View style={s.removeHandle} />
          <Text style={s.removeTitle}>Remove from Whitelist?</Text>
          <Text style={s.removeSub}>
            Remove <Text style={{ fontWeight: '800' }}>{removeConfirmEntry?.visitorName}</Text>? They will need manual approval on next visit.
          </Text>
          <TouchableOpacity
            style={[s.removeConfirmBtn, removeMutation.isPending && { opacity: 0.7 }]}
            onPress={() => { if (removeConfirmEntry) { removeMutation.mutate(removeConfirmEntry.id); setRemoveConfirmEntry(null); } }}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.removeConfirmText}>Remove</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.removeCancelBtn} onPress={() => setRemoveConfirmEntry(null)}>
            <Text style={s.removeCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, ...SHADOWS.sm },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DBEAFE', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  infoText: { flex: 1, fontSize: 12, color: '#1E40AF', fontFamily: 'DMSans-Regular' },
  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99,102,241,0.12)', ...SHADOWS.md },
  cardDisabled: { opacity: 0.55 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  catIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  entryName: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  catLabel: { fontSize: 12, fontWeight: '600', fontFamily: 'DMSans-Medium', marginTop: 1 },
  toggleBtn: { padding: 8, borderRadius: RADIUS.sm, marginRight: 4 },
  removeBtn: { padding: 8 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  metaChipText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  empty: { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, fontFamily: 'DMSans-Regular' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4, marginTop: 10, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.md, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  catChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  inlineErrorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontFamily: 'DMSans-Regular' },
  removeOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  removeSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 36, gap: 12 },
  removeHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 8 },
  removeTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center', fontFamily: 'Outfit-Bold' },
  removeSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans-Regular' },
  removeConfirmBtn: { backgroundColor: '#EF4444', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  removeConfirmText: { fontSize: 15, fontWeight: '800', color: '#fff', fontFamily: 'Outfit-Bold' },
  removeCancelBtn: { backgroundColor: '#F1F5F9', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  removeCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
});
