import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import {
  vendorService,
  type VendorWorkOrder,
  type WorkOrderStatus,
  type WorkOrderPriority,
} from '@/services/vendorService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'active' | 'on_hold' | 'completed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
];

const STATUS_META: Record<WorkOrderStatus, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  ASSIGNED:    { label: 'Assigned',    color: '#2563EB', bg: '#DBEAFE', icon: 'arrow-forward-circle' },
  IN_PROGRESS: { label: 'In Progress', color: '#7C3AED', bg: '#EDE9FE', icon: 'play-circle' },
  ON_HOLD:     { label: 'On Hold',     color: '#D97706', bg: '#FEF3C7', icon: 'pause-circle' },
  COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#D1FAE5', icon: 'checkmark-done-circle' },
};

const PRIORITY_META: Record<WorkOrderPriority, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  LOW:    { label: 'Low',    color: '#6B7280', bg: '#F3F4F6', icon: 'arrow-down' },
  MEDIUM: { label: 'Medium', color: '#D97706', bg: '#FEF3C7', icon: 'remove' },
  HIGH:   { label: 'High',   color: '#EA580C', bg: '#FFF7ED', icon: 'arrow-up' },
  URGENT: { label: 'Urgent', color: COLORS.error, bg: COLORS.errorLight, icon: 'alert-circle' },
};

export default function VendorWorkOrdersScreen() {
  const [orders, setOrders] = useState<VendorWorkOrder[]>([]);
  const [filter, setFilter] = useState<FilterKey>('active');
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    const data = await vendorService.getWorkOrders();
    setOrders(data);
  };

  useEffect(() => { loadOrders(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const filtered = orders.filter(o => {
    if (filter === 'active') return o.status === 'ASSIGNED' || o.status === 'IN_PROGRESS';
    if (filter === 'on_hold') return o.status === 'ON_HOLD';
    return o.status === 'COMPLETED';
  });

  const counts = {
    active: orders.filter(o => o.status === 'ASSIGNED' || o.status === 'IN_PROGRESS').length,
    on_hold: orders.filter(o => o.status === 'ON_HOLD').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  };

  const handleStatusChange = (order: VendorWorkOrder, newStatus: WorkOrderStatus) => {
    const statusLabel = STATUS_META[newStatus].label;
    Alert.alert('Update Status', `Mark "${order.title}" as ${statusLabel}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await vendorService.updateWorkOrderStatus(order.id, newStatus);
          await loadOrders();
        },
      },
    ]);
  };

  const renderOrder = ({ item }: { item: VendorWorkOrder }) => {
    const statusMeta = STATUS_META[item.status];
    const priorityMeta = PRIORITY_META[item.priority];
    const isUrgent = item.priority === 'URGENT' || item.priority === 'HIGH';

    return (
      <View style={[s.card, isUrgent && s.cardUrgent]}>
        <View style={s.cardTop}>
          <View style={[s.orderIcon, { backgroundColor: priorityMeta.bg }]}>
            <Ionicons name="construct" size={20} color={priorityMeta.color} />
          </View>
          <View style={s.cardBody}>
            <Text style={s.orderTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.orderDesc} numberOfLines={2}>{item.description}</Text>
            <View style={s.metaRow}>
              <Ionicons name="person-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{item.customerName} · {item.flat}</Text>
            </View>
            <View style={s.metaRow}>
              <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{item.location}</Text>
              <Text style={s.metaDot}>·</Text>
              <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>Due {item.dueDate}</Text>
            </View>
          </View>
        </View>

        <View style={s.cardFooter}>
          <View style={s.badgeRow}>
            <View style={[s.priorityBadge, { backgroundColor: priorityMeta.bg }]}>
              <Ionicons name={priorityMeta.icon} size={10} color={priorityMeta.color} />
              <Text style={[s.badgeText, { color: priorityMeta.color }]}>{priorityMeta.label}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: statusMeta.bg }]}>
              <Ionicons name={statusMeta.icon} size={10} color={statusMeta.color} />
              <Text style={[s.badgeText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>
          </View>
        </View>

        {item.status === 'ASSIGNED' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => handleStatusChange(item, 'IN_PROGRESS')}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={s.actionBtnTextLight}>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnOutline]} onPress={() => handleStatusChange(item, 'ON_HOLD')}>
              <Ionicons name="pause" size={16} color={VENDOR_COLORS.accent} />
              <Text style={s.actionBtnTextOutline}>Hold</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'IN_PROGRESS' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnSuccess]} onPress={() => handleStatusChange(item, 'COMPLETED')}>
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={s.actionBtnTextLight}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnOutline]} onPress={() => handleStatusChange(item, 'ON_HOLD')}>
              <Ionicons name="pause" size={16} color={VENDOR_COLORS.accent} />
              <Text style={s.actionBtnTextOutline}>Hold</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'ON_HOLD' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => handleStatusChange(item, 'IN_PROGRESS')}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={s.actionBtnTextLight}>Resume</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Work Orders</Text>
          <Text style={s.headerSub}>{counts.active} active</Text>
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
        renderItem={renderOrder}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VENDOR_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="construct-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No work orders</Text>
            <Text style={s.emptyDesc}>No orders match this filter</Text>
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
  filterChipActive: { backgroundColor: VENDOR_COLORS.accent, borderColor: VENDOR_COLORS.accentDark },
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
  cardUrgent: { borderColor: COLORS.error, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  orderIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  orderTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  orderDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  metaDot: { fontSize: 11, color: COLORS.textMuted, marginHorizontal: 2 },
  cardFooter: {
    paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  badgeRow: { flexDirection: 'row', gap: 6 },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 3,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: {
    flexDirection: 'row', gap: 8,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  actionBtnPrimary: { backgroundColor: VENDOR_COLORS.accent },
  actionBtnSuccess: { backgroundColor: COLORS.success },
  actionBtnOutline: { borderWidth: 1.5, borderColor: VENDOR_COLORS.accent },
  actionBtnTextLight: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnTextOutline: { fontSize: 13, fontWeight: '700', color: VENDOR_COLORS.accent },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
