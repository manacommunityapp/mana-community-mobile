import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { guardService, type GuardVisitor, type VisitorStatus } from '@/services/guardService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'all' | 'expected' | 'in' | 'out' | 'denied';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expected', label: 'Expected' },
  { key: 'in', label: 'Inside' },
  { key: 'out', label: 'Left' },
  { key: 'denied', label: 'Denied' },
];

const STATUS_META: Record<VisitorStatus, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  EXPECTED:    { label: 'Expected',  color: '#D97706', bg: '#FEF3C7', icon: 'time' },
  CHECKED_IN:  { label: 'Inside',    color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' },
  CHECKED_OUT: { label: 'Left',      color: '#6B7280', bg: '#F3F4F6', icon: 'exit-outline' },
  DENIED:      { label: 'Denied',    color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle' },
};

const FILTER_STATUS: Record<FilterKey, VisitorStatus | null> = {
  all: null,
  expected: 'EXPECTED',
  in: 'CHECKED_IN',
  out: 'CHECKED_OUT',
  denied: 'DENIED',
};

export default function GuardVisitorsScreen() {
  const [visitors, setVisitors] = useState<GuardVisitor[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadVisitors = async () => {
    const data = await guardService.getVisitors();
    setVisitors(data);
  };

  useEffect(() => { loadVisitors(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVisitors();
    setRefreshing(false);
  };

  const filtered = filter === 'all'
    ? visitors
    : visitors.filter(v => v.status === FILTER_STATUS[filter]);

  const handleAction = (visitor: GuardVisitor, action: 'check-in' | 'check-out' | 'deny') => {
    const actionLabel = action === 'check-in' ? 'Check In' : action === 'check-out' ? 'Check Out' : 'Deny Entry';
    Alert.alert(actionLabel, `${actionLabel} ${visitor.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: actionLabel,
        style: action === 'deny' ? 'destructive' : 'default',
        onPress: async () => {
          if (action === 'check-in') await guardService.checkInVisitor(visitor.id);
          else if (action === 'check-out') await guardService.checkOutVisitor(visitor.id);
          else await guardService.denyVisitor(visitor.id);
          await loadVisitors();
        },
      },
    ]);
  };

  const renderVisitor = ({ item }: { item: GuardVisitor }) => {
    const meta = STATUS_META[item.status];
    const isDelivery = item.purpose.toLowerCase().includes('delivery');

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={[s.visitorIcon, { backgroundColor: meta.bg }]}>
            <Ionicons
              name={isDelivery ? 'cube' : item.preApproved ? 'shield-checkmark' : 'person'}
              size={20}
              color={meta.color}
            />
          </View>
          <View style={s.visitorInfo}>
            <View style={s.nameRow}>
              <Text style={s.visitorName} numberOfLines={1}>{item.name}</Text>
              {item.preApproved && (
                <View style={s.preApprovedBadge}>
                  <Ionicons name="checkmark-circle" size={10} color={COLORS.success} />
                  <Text style={s.preApprovedText}>Pre-approved</Text>
                </View>
              )}
            </View>
            <Text style={s.visitorPurpose} numberOfLines={1}>{item.purpose}</Text>
            <View style={s.metaRow}>
              <Ionicons name="home-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{item.flat}</Text>
              {item.vehicleNumber && (
                <>
                  <Ionicons name="car-outline" size={11} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                  <Text style={s.metaText}>{item.vehicleNumber}</Text>
                </>
              )}
              {item.phone && (
                <>
                  <Ionicons name="call-outline" size={11} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                  <Text style={s.metaText}>{item.phone}</Text>
                </>
              )}
            </View>
          </View>
          <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Action buttons */}
        {item.status === 'EXPECTED' && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnPrimary]}
              onPress={() => handleAction(item, 'check-in')}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={s.actionBtnTextPrimary}>Check In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnDanger]}
              onPress={() => handleAction(item, 'deny')}
            >
              <Ionicons name="close" size={16} color={COLORS.error} />
              <Text style={s.actionBtnTextDanger}>Deny</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'CHECKED_IN' && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, s.actionBtnOutline]}
              onPress={() => handleAction(item, 'check-out')}
            >
              <Ionicons name="exit-outline" size={16} color={GUARD_COLORS.accent} />
              <Text style={s.actionBtnTextOutline}>Check Out</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Visitor Log</Text>
          <Text style={s.headerSub}>{visitors.length} total today</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn}>
            <Ionicons name="search" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={s.headerBtn}>
            <Ionicons name="add" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderVisitor}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No visitors</Text>
            <Text style={s.emptyDesc}>No visitors match this filter</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
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
  headerActions: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  list: { padding: 12, gap: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  visitorIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  visitorInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  visitorName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  preApprovedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: COLORS.successLight, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  preApprovedText: { fontSize: 9, fontWeight: '700', color: COLORS.success },
  visitorPurpose: { fontSize: 12, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  actions: {
    flexDirection: 'row', gap: 8,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  actionBtnPrimary: { backgroundColor: COLORS.success },
  actionBtnTextPrimary: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnDanger: { backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: COLORS.error },
  actionBtnTextDanger: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  actionBtnOutline: { borderWidth: 1.5, borderColor: GUARD_COLORS.accent },
  actionBtnTextOutline: { fontSize: 13, fontWeight: '700', color: GUARD_COLORS.accent },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
