import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { ADMIN_COLORS } from '@/constants/adminTheme';
import { adminRoleService, type AdminApproval, type ApprovalType, type ApprovalStatus } from '@/services/adminRoleService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'pending' | 'approved' | 'rejected';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const FILTER_STATUS: Record<FilterKey, ApprovalStatus> = {
  pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED',
};

const TYPE_META: Record<ApprovalType, { icon: IoniconsName; color: string; bg: string; label: string }> = {
  MEMBER: { icon: 'person-add', color: '#4F46E5', bg: '#EEF2FF', label: 'Member' },
  VENDOR: { icon: 'briefcase', color: '#D97706', bg: '#FEF3C7', label: 'Vendor' },
  POST:   { icon: 'chatbox-ellipses', color: '#7C3AED', bg: '#EDE9FE', label: 'Post' },
  EVENT:  { icon: 'calendar', color: '#059669', bg: '#D1FAE5', label: 'Event' },
};

const STATUS_META: Record<ApprovalStatus, { color: string; bg: string }> = {
  PENDING:  { color: '#D97706', bg: '#FEF3C7' },
  APPROVED: { color: '#059669', bg: '#D1FAE5' },
  REJECTED: { color: COLORS.error, bg: COLORS.errorLight },
};

export default function AdminApprovalsScreen() {
  const [approvals, setApprovals] = useState<AdminApproval[]>([]);
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [refreshing, setRefreshing] = useState(false);

  const loadApprovals = async () => {
    const data = await adminRoleService.getApprovals();
    setApprovals(data);
  };

  useEffect(() => { loadApprovals(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApprovals();
    setRefreshing(false);
  };

  const filtered = approvals.filter(a => a.status === FILTER_STATUS[filter]);
  const counts: Record<FilterKey, number> = {
    pending: approvals.filter(a => a.status === 'PENDING').length,
    approved: approvals.filter(a => a.status === 'APPROVED').length,
    rejected: approvals.filter(a => a.status === 'REJECTED').length,
  };

  const handleAction = (item: AdminApproval, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? 'Approve' : 'Reject';
    Alert.alert(label, `${label} "${item.title}" from ${item.submittedBy}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: action === 'reject' ? 'destructive' : 'default',
        onPress: async () => {
          if (action === 'approve') await adminRoleService.approveItem(item.id);
          else await adminRoleService.rejectItem(item.id);
          await loadApprovals();
        },
      },
    ]);
  };

  const renderApproval = ({ item }: { item: AdminApproval }) => {
    const typeMeta = TYPE_META[item.type];
    const statusMeta = STATUS_META[item.status];

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={[s.typeIcon, { backgroundColor: typeMeta.bg }]}>
            <Ionicons name={typeMeta.icon} size={20} color={typeMeta.color} />
          </View>
          <View style={s.cardBody}>
            <View style={s.titleRow}>
              <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[s.typeBadge, { backgroundColor: typeMeta.bg }]}>
                <Text style={[s.typeBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
              </View>
            </View>
            <Text style={s.submitter}>{item.submittedBy} · {item.flat}</Text>
            <Text style={s.details} numberOfLines={2}>{item.details}</Text>
            <View style={s.metaRow}>
              <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{formatTimeAgo(item.submittedAt)}</Text>
            </View>
          </View>
        </View>

        {item.status === 'PENDING' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnSuccess]} onPress={() => handleAction(item, 'approve')}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={s.actionBtnTextLight}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => handleAction(item, 'reject')}>
              <Ionicons name="close" size={16} color={COLORS.error} />
              <Text style={s.actionBtnTextDanger}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status !== 'PENDING' && (
          <View style={s.statusRow}>
            <View style={[s.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Ionicons
                name={item.status === 'APPROVED' ? 'checkmark-circle' : 'close-circle'}
                size={12}
                color={statusMeta.color}
              />
              <Text style={[s.statusText, { color: statusMeta.color }]}>{item.status}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Approvals</Text>
          <Text style={s.headerSub}>{counts.pending} pending review</Text>
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
            {counts[f.key] > 0 && (
              <View style={[s.filterCount, filter === f.key && s.filterCountActive]}>
                <Text style={[s.filterCountText, filter === f.key && s.filterCountTextActive]}>
                  {counts[f.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderApproval}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>All clear</Text>
            <Text style={s.emptyDesc}>No {filter} items</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: ADMIN_COLORS.accent, borderColor: ADMIN_COLORS.accentDark },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  filterCount: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.border, paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterCountText: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  filterCountTextActive: { color: '#fff' },
  list: { padding: 12, gap: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  typeIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  typeBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 2 },
  typeBadgeText: { fontSize: 9, fontWeight: '800' },
  submitter: { fontSize: 12, color: COLORS.textMuted },
  details: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  actions: {
    flexDirection: 'row', gap: 8,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  actionBtnSuccess: { backgroundColor: COLORS.success },
  actionBtnTextLight: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnDanger: { backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: COLORS.error },
  actionBtnTextDanger: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  statusRow: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
