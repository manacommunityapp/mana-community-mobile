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
import { watchlistService, WatchlistEntry, WatchlistSeverity, AddWatchlistRequest } from '@/services/watchlistService';

const SEVERITY_META: Record<WatchlistSeverity, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  LOW:      { label: 'Low',      color: '#D97706', bg: '#FEF3C7', icon: 'alert-circle-outline' },
  MEDIUM:   { label: 'Medium',   color: '#EA580C', bg: '#FFEDD5', icon: 'warning-outline' },
  HIGH:     { label: 'High',     color: '#DC2626', bg: '#FEE2E2', icon: 'alert-outline' },
  CRITICAL: { label: 'Critical', color: '#7F1D1D', bg: '#FEE2E2', icon: 'skull-outline' },
};

const SEVERITIES: WatchlistSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const MOCK_WATCHLIST: WatchlistEntry[] = [
  { id: 1, name: 'Unknown Salesperson', reason: 'Aggressive cold-calling, refused to leave', severity: 'MEDIUM', status: 'ACTIVE', reportedBy: 'Tower A, Flat 802', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), alertCount: 3 },
  { id: 2, name: 'Suspicious Vehicle KA-05-XY-9999', vehicleNumber: 'KA-05-XY-9999', reason: 'Loitering near children\'s park multiple times', severity: 'HIGH', status: 'ACTIVE', reportedBy: 'Security Guard', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), alertCount: 1 },
];

export default function WatchlistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [addError, setAddError] = useState('');
  const [resolveConfirmEntry, setResolveConfirmEntry] = useState<WatchlistEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<AddWatchlistRequest>({
    name: '', vehicleNumber: '', phone: '', reason: '', severity: 'MEDIUM', notes: '',
  });

  const { data: rawList, isLoading, refetch } = useQuery<WatchlistEntry[]>({
    queryKey: ['security', 'watchlist'],
    queryFn: () => watchlistService.getCommunityWatchlist(),
    staleTime: 60_000,
  });

  const list = (rawList && rawList.length > 0) ? rawList : MOCK_WATCHLIST;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const addMutation = useMutation({
    mutationFn: (req: AddWatchlistRequest) => watchlistService.addToWatchlist(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security', 'watchlist'] });
      setAddModal(false);
      setAddError('');
      setForm({ name: '', vehicleNumber: '', phone: '', reason: '', severity: 'MEDIUM', notes: '' });
    },
    onError: (err: any) => setAddError(err?.message || 'Failed to report. Try again.'),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => watchlistService.resolveWatchlistEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['security', 'watchlist'] }),
  });

  const handleAdd = () => {
    if (!form.name.trim()) { setAddError('Please enter a name or description.'); return; }
    if (!form.reason.trim()) { setAddError('Please describe the reason for reporting.'); return; }
    setAddError('');
    addMutation.mutate({ ...form, name: form.name.trim(), reason: form.reason.trim() });
  };

  const confirmResolve = (entry: WatchlistEntry) => {
    setResolveConfirmEntry(entry);
  };

  const renderItem = ({ item }: { item: WatchlistEntry }) => {
    const sev = SEVERITY_META[item.severity];
    const isActive = item.status === 'ACTIVE';
    return (
      <View style={[s.card, { borderLeftColor: sev.color, borderLeftWidth: 4 }]}>
        <View style={s.cardHeader}>
          <View style={[s.sevIcon, { backgroundColor: sev.bg }]}>
            <Ionicons name={sev.icon} size={20} color={sev.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.entryName} numberOfLines={1}>{item.name}</Text>
            {item.vehicleNumber && (
              <View style={s.vehicleChip}>
                <Ionicons name="car-outline" size={11} color={COLORS.primary} />
                <Text style={s.vehicleText}>{item.vehicleNumber}</Text>
              </View>
            )}
          </View>
          <View style={[s.sevBadge, { backgroundColor: sev.bg }]}>
            <Text style={[s.sevText, { color: sev.color }]}>{sev.label}</Text>
          </View>
        </View>

        <Text style={s.reasonText} numberOfLines={2}>{item.reason}</Text>

        <View style={s.metaRow}>
          {item.reportedBy && (
            <View style={s.metaChip}>
              <Ionicons name="person-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{item.reportedBy}</Text>
            </View>
          )}
          {item.alertCount !== undefined && item.alertCount > 0 && (
            <View style={[s.metaChip, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="notifications-outline" size={11} color="#DC2626" />
              <Text style={[s.metaText, { color: '#DC2626' }]}>{item.alertCount} alerts</Text>
            </View>
          )}
        </View>

        {isActive && (
          <TouchableOpacity onPress={() => confirmResolve(item)} style={s.resolveBtn}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
            <Text style={s.resolveBtnText}>Mark Resolved</Text>
          </TouchableOpacity>
        )}
        {!isActive && (
          <View style={s.resolvedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={s.resolvedText}>Resolved</Text>
          </View>
        )}
      </View>
    );
  };

  const activeCount = list.filter(e => e.status === 'ACTIVE').length;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Community Watchlist</Text>
          <Text style={s.headerSub}>Society-wide flagged persons & vehicles</Text>
        </View>
        <TouchableOpacity onPress={() => setAddModal(true)} style={s.addBtn} activeOpacity={0.8}>
          <Ionicons name="flag-outline" size={16} color="#fff" />
          <Text style={s.addBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      {activeCount > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="warning" size={16} color="#DC2626" />
          <Text style={s.alertText}>{activeCount} active {activeCount === 1 ? 'alert' : 'alerts'} — guards have been notified.</Text>
        </View>
      )}

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
              <Ionicons name="shield-checkmark-outline" size={48} color="#059669" />
              <Text style={s.emptyTitle}>Society is safe</Text>
              <Text style={s.emptySub}>No flagged persons or vehicles. Report suspicious activity below.</Text>
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
                  <Text style={s.modalTitle}>Report to Watchlist</Text>
                  <Text style={s.modalSub}>Alert security and community about this person</Text>
                </View>
                <TouchableOpacity onPress={() => setAddModal(false)}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Severity Level</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: SPACING.sm }}>
                {SEVERITIES.map(sv => {
                  const m = SEVERITY_META[sv];
                  const sel = form.severity === sv;
                  return (
                    <TouchableOpacity
                      key={sv}
                      style={[s.sevChip, sel && { backgroundColor: m.color, borderColor: m.color }]}
                      onPress={() => setForm(f => ({ ...f, severity: sv }))}
                    >
                      <Text style={[s.sevChipText, sel && { color: '#fff' }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.label}>Name / Description *</Text>
              <TextInput style={s.input} placeholder="e.g. Tall man in red jacket, Unknown salesperson" placeholderTextColor={COLORS.textMuted} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />

              <Text style={s.label}>Reason for Reporting *</Text>
              <TextInput
                style={[s.input, { height: 72, textAlignVertical: 'top' }]}
                placeholder="Describe what happened or why this person is flagged..."
                multiline
                placeholderTextColor={COLORS.textMuted}
                value={form.reason}
                onChangeText={v => setForm(f => ({ ...f, reason: v }))}
              />

              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Vehicle No</Text>
                  <TextInput style={s.input} placeholder="Optional" autoCapitalize="characters" placeholderTextColor={COLORS.textMuted} value={form.vehicleNumber} onChangeText={v => setForm(f => ({ ...f, vehicleNumber: v }))} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Phone No</Text>
                  <TextInput style={s.input} placeholder="Optional" keyboardType="phone-pad" placeholderTextColor={COLORS.textMuted} value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} />
                </View>
              </View>

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
                <TouchableOpacity
                  style={[s.reportBtn, addMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleAdd}
                  disabled={addMutation.isPending}
                >
                  {addMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="flag" size={15} color="#fff" />
                      <Text style={s.reportBtnText}>Submit Report</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Resolve confirm bottom sheet */}
      <Modal visible={!!resolveConfirmEntry} transparent animationType="slide" onRequestClose={() => setResolveConfirmEntry(null)}>
        <TouchableOpacity style={s.resolveOverlay} onPress={() => setResolveConfirmEntry(null)} activeOpacity={1} />
        <View style={s.resolveSheet}>
          <View style={s.resolveHandle} />
          <Text style={s.resolveTitle}>Mark Resolved?</Text>
          <Text style={s.resolveSub}>
            Mark <Text style={{ fontWeight: '800' }}>{resolveConfirmEntry?.name}</Text> as resolved? This removes the active alert.
          </Text>
          <TouchableOpacity
            style={[s.resolveConfirmBtn, resolveMutation.isPending && { opacity: 0.7 }]}
            onPress={() => { if (resolveConfirmEntry) { resolveMutation.mutate(resolveConfirmEntry.id); setResolveConfirmEntry(null); } }}
            disabled={resolveMutation.isPending}
          >
            {resolveMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.resolveConfirmText}>Mark Resolved</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.resolveCancelBtn} onPress={() => setResolveConfirmEntry(null)}>
            <Text style={s.resolveCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(220,38,38,0.12)' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, ...SHADOWS.sm },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEE2E2', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#FECACA' },
  alertText: { flex: 1, fontSize: 13, color: '#DC2626', fontFamily: 'DMSans-Medium', fontWeight: '600' },
  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(220,38,38,0.15)', ...SHADOWS.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  sevIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  entryName: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  vehicleChip: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  vehicleText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sevText: { fontSize: 11, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  reasonText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', marginBottom: SPACING.sm, lineHeight: 18 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  metaText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  resolveBtnText: { fontSize: 12, fontWeight: '700', color: '#059669', fontFamily: 'Outfit-Bold' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  resolvedText: { fontSize: 12, fontWeight: '700', color: '#059669', fontFamily: 'Outfit-Bold' },
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
  sevChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  sevChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  reportBtn: { flex: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#DC2626', ...SHADOWS.sm },
  reportBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  inlineErrorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontFamily: 'DMSans-Regular' },
  resolveOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  resolveSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 36, gap: 12 },
  resolveHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 8 },
  resolveTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center', fontFamily: 'Outfit-Bold' },
  resolveSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: 'DMSans-Regular' },
  resolveConfirmBtn: { backgroundColor: '#059669', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  resolveConfirmText: { fontSize: 15, fontWeight: '800', color: '#fff', fontFamily: 'Outfit-Bold' },
  resolveCancelBtn: { backgroundColor: '#F1F5F9', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  resolveCancelText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
});
