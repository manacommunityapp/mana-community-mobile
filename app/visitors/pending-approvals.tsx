import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, RefreshControl, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { visitorApprovalService, PendingApproval } from '@/services/visitorApprovalService';

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  GUEST:    { icon: 'person-outline',    color: COLORS.primary, bg: '#EEF2FF' },
  DELIVERY: { icon: 'cube-outline',      color: '#D97706',      bg: '#FEF3C7' },
  CAB:      { icon: 'car-outline',       color: '#2563EB',      bg: '#DBEAFE' },
  SERVICE:  { icon: 'construct-outline', color: '#059669',      bg: '#D1FAE5' },
  FAMILY:   { icon: 'heart-outline',     color: '#DB2777',      bg: '#FCE7F3' },
  COURIER:  { icon: 'mail-outline',      color: '#0891B2',      bg: '#CFFAFE' },
};

const MOCK_PENDING: PendingApproval[] = [
  {
    id: 101,
    visitorName: 'Swiggy Delivery',
    purpose: 'Food Delivery',
    passType: 'DELIVERY',
    passCode: 'MANA-4471',
    arrivedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    gate: 'Gate 1',
    guardName: 'Ramesh',
    flatNumber: 'Tower A-1204',
  },
  {
    id: 102,
    visitorName: 'Arjun Sharma',
    visitorPhone: '9876543210',
    purpose: 'Guest Visit',
    passType: 'GUEST',
    passCode: 'MANA-8823',
    arrivedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    gate: 'Gate 1',
    guardName: 'Ramesh',
    flatNumber: 'Tower A-1204',
    vehicleNumber: 'KA-04-MN-7788',
  },
];

function waitingTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just arrived';
  if (mins === 1) return '1 min ago';
  return `${mins} mins ago`;
}

export default function PendingApprovalsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState<PendingApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: raw, isLoading, refetch } = useQuery<PendingApproval[]>({
    queryKey: ['visitors', 'pending-approvals'],
    queryFn: () => visitorApprovalService.getPendingApprovals(),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const pending = (raw && raw.length > 0) ? raw : MOCK_PENDING;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const approveMutation = useMutation({
    mutationFn: (id: number) => visitorApprovalService.approve(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      Alert.alert('✅ Entry Approved', 'Security gate has been notified to allow entry.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      visitorApprovalService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setRejectModal(null);
      setRejectReason('');
      Alert.alert('❌ Entry Denied', 'Security gate has been instructed to deny entry.');
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const handleApprove = (item: PendingApproval) => {
    Alert.alert(
      'Allow Entry?',
      `Allow ${item.visitorName} into the society?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Allow Entry', style: 'default', onPress: () => approveMutation.mutate(item.id) },
      ]
    );
  };

  const handleRejectSubmit = () => {
    if (!rejectModal) return;
    rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason.trim() || undefined });
  };

  const renderItem = ({ item }: { item: PendingApproval }) => {
    const typeMeta = TYPE_META[item.passType?.toUpperCase()] || TYPE_META.GUEST;
    const waitMins = Math.floor((Date.now() - new Date(item.arrivedAt).getTime()) / 60000);
    const isUrgent = waitMins >= 5;

    return (
      <View style={[s.card, isUrgent && s.cardUrgent]}>
        {isUrgent && (
          <View style={s.urgentBanner}>
            <Ionicons name="time-outline" size={12} color="#B45309" />
            <Text style={s.urgentText}>Waiting {waitMins} mins — please respond</Text>
          </View>
        )}

        <View style={s.cardBody}>
          <View style={[s.typeIcon, { backgroundColor: typeMeta.bg }]}>
            <Ionicons name={typeMeta.icon} size={24} color={typeMeta.color} />
          </View>

          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.visitorName}>{item.visitorName}</Text>
            <Text style={s.purpose}>{item.purpose}</Text>

            <View style={s.metaRow}>
              {item.vehicleNumber && (
                <View style={s.metaChip}>
                  <Ionicons name="car-outline" size={11} color={COLORS.primary} />
                  <Text style={s.metaChipText}>{item.vehicleNumber}</Text>
                </View>
              )}
              <View style={s.metaChip}>
                <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
                <Text style={s.metaChipText}>{waitingTime(item.arrivedAt)}</Text>
              </View>
              {item.gate && (
                <View style={s.metaChip}>
                  <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                  <Text style={s.metaChipText}>{item.gate}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={s.passRow}>
          <View style={s.passPill}>
            <Ionicons name="key-outline" size={12} color={COLORS.primary} />
            <Text style={s.passPillText}>{item.passCode}</Text>
          </View>
          {item.guardName && (
            <Text style={s.guardText}>Guard: {item.guardName}</Text>
          )}
        </View>

        {/* Approve / Deny action row */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.denyBtn}
            onPress={() => setRejectModal(item)}
            disabled={approveMutation.isPending}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
            <Text style={s.denyBtnText}>Deny Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.approveBtn, approveMutation.isPending && { opacity: 0.7 }]}
            onPress={() => handleApprove(item)}
            disabled={approveMutation.isPending}
            activeOpacity={0.8}
          >
            {approveMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.approveBtnText}>Allow Entry</Text>
              </>
            )}
          </TouchableOpacity>
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
          <Text style={s.headerTitle}>Pending Approvals</Text>
          <Text style={s.headerSub}>Visitors waiting at gate for your approval</Text>
        </View>
        {pending.length > 0 && (
          <View style={s.badgeCount}>
            <Text style={s.badgeCountText}>{pending.length}</Text>
          </View>
        )}
      </View>

      {pending.length > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="notifications" size={16} color="#D97706" />
          <Text style={s.alertText}>
            {pending.length} {pending.length === 1 ? 'person' : 'people'} waiting at the gate
          </Text>
        </View>
      )}

      <FlatList
        data={pending}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={s.empty}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            <View style={s.empty}>
              <Ionicons name="checkmark-circle-outline" size={56} color="#059669" />
              <Text style={s.emptyTitle}>No one waiting</Text>
              <Text style={s.emptySub}>All visitors have been processed. You'll be notified when someone arrives.</Text>
            </View>
          )
        }
      />

      {/* Reject reason modal */}
      <Modal visible={!!rejectModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.rejectModal}>
            <Text style={s.rejectTitle}>Deny Entry</Text>
            <Text style={s.rejectSub}>
              Deny entry for{' '}
              <Text style={{ fontWeight: '800' }}>{rejectModal?.visitorName}</Text>?
            </Text>

            <Text style={s.label}>Reason (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Not expected, wrong flat number..."
              multiline
              numberOfLines={3}
              placeholderTextColor={COLORS.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={s.rejectActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setRejectModal(null); setRejectReason(''); }}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmDenyBtn, rejectMutation.isPending && { opacity: 0.7 }]}
                onPress={handleRejectSubmit}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.confirmDenyText}>Deny Entry</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  badgeCount: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  badgeCountText: { color: '#fff', fontSize: 13, fontWeight: '900', fontFamily: 'Outfit-Bold' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#FDE68A' },
  alertText: { flex: 1, fontSize: 13, color: '#B45309', fontFamily: 'DMSans-Medium', fontWeight: '600' },

  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.md },
  cardUrgent: { borderColor: '#FDE68A', borderWidth: 2 },
  urgentBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF3C7', paddingHorizontal: SPACING.md, paddingVertical: 6 },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#B45309', fontFamily: 'Outfit-Bold' },

  cardBody: { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.lg },
  typeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  visitorName: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', letterSpacing: -0.2 },
  purpose: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: SPACING.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  metaChipText: { fontSize: 10, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },

  passRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  passPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  passPillText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },
  guardText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  actionRow: {
    flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: 'rgba(99,102,241,0.1)',
  },
  denyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
  },
  denyBtnText: { fontSize: 14, fontWeight: '700', color: '#DC2626', fontFamily: 'Outfit-Bold' },
  approveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: '#059669', ...SHADOWS.sm,
  },
  approveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  empty: { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, fontFamily: 'DMSans-Regular', lineHeight: 19 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  rejectModal: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, ...SHADOWS.md },
  rejectTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginBottom: 4 },
  rejectSub: { fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', marginBottom: SPACING.md },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4, marginTop: 4, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', textAlignVertical: 'top' },
  rejectActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmDenyBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#DC2626', alignItems: 'center', ...SHADOWS.sm },
  confirmDenyText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
});
