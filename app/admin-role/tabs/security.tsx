import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { ADMIN_COLORS } from '@/constants/adminTheme';
import { adminRoleService, type SecurityAlert, type SecurityAlertLevel } from '@/services/adminRoleService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'active' | 'resolved';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'resolved', label: 'Resolved' },
];

const LEVEL_META: Record<SecurityAlertLevel, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  INFO:     { label: 'Info',     color: '#2563EB', bg: '#DBEAFE', icon: 'information-circle' },
  WARNING:  { label: 'Warning',  color: '#D97706', bg: '#FEF3C7', icon: 'warning' },
  CRITICAL: { label: 'Critical', color: COLORS.error, bg: COLORS.errorLight, icon: 'alert-circle' },
};

export default function AdminSecurityScreen() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [filter, setFilter] = useState<FilterKey>('active');
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async () => {
    const data = await adminRoleService.getSecurityAlerts();
    setAlerts(data);
  };

  useEffect(() => { loadAlerts(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const filtered = alerts.filter(a => filter === 'active' ? !a.resolved : a.resolved);
  const counts = {
    active: alerts.filter(a => !a.resolved).length,
    resolved: alerts.filter(a => a.resolved).length,
  };

  const handleResolve = (alert: SecurityAlert) => {
    Alert.alert('Resolve Alert', `Mark "${alert.title}" as resolved?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve',
        onPress: async () => {
          await adminRoleService.resolveAlert(alert.id);
          await loadAlerts();
        },
      },
    ]);
  };

  const renderAlert = ({ item }: { item: SecurityAlert }) => {
    const meta = LEVEL_META[item.level];

    return (
      <View style={[s.card, item.level === 'CRITICAL' && !item.resolved && s.cardCritical]}>
        <View style={s.cardTop}>
          <View style={[s.alertIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={s.cardBody}>
            <View style={s.titleRow}>
              <Text style={s.alertTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[s.levelBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.levelText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            <Text style={s.alertDesc} numberOfLines={2}>{item.description}</Text>
            <View style={s.metaRow}>
              <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{item.location}</Text>
              <Text style={s.metaDot}>·</Text>
              <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{formatTimeAgo(item.reportedAt)}</Text>
            </View>
            {item.assignedGuard && (
              <View style={s.assignedRow}>
                <Ionicons name="person-outline" size={11} color={COLORS.textMuted} />
                <Text style={s.assignedText}>Assigned to {item.assignedGuard}</Text>
              </View>
            )}
          </View>
        </View>

        {!item.resolved && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnSuccess]} onPress={() => handleResolve(item)}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={s.actionBtnTextLight}>Mark Resolved</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnOutline]}>
              <Ionicons name="person-add" size={16} color={ADMIN_COLORS.accent} />
              <Text style={s.actionBtnTextOutline}>Assign</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.resolved && (
          <View style={s.resolvedRow}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={s.resolvedText}>Resolved</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Security</Text>
          <Text style={s.headerSub}>{counts.active} active alert{counts.active !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Quick stats */}
      <View style={s.quickStats}>
        <View style={s.quickStatItem}>
          <View style={[s.quickStatDot, { backgroundColor: COLORS.error }]} />
          <Text style={s.quickStatValue}>{alerts.filter(a => a.level === 'CRITICAL' && !a.resolved).length}</Text>
          <Text style={s.quickStatLabel}>Critical</Text>
        </View>
        <View style={s.quickStatItem}>
          <View style={[s.quickStatDot, { backgroundColor: '#D97706' }]} />
          <Text style={s.quickStatValue}>{alerts.filter(a => a.level === 'WARNING' && !a.resolved).length}</Text>
          <Text style={s.quickStatLabel}>Warning</Text>
        </View>
        <View style={s.quickStatItem}>
          <View style={[s.quickStatDot, { backgroundColor: '#2563EB' }]} />
          <Text style={s.quickStatValue}>{alerts.filter(a => a.level === 'INFO' && !a.resolved).length}</Text>
          <Text style={s.quickStatLabel}>Info</Text>
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
        renderItem={renderAlert}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>All clear</Text>
            <Text style={s.emptyDesc}>No {filter} alerts</Text>
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
  quickStats: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4,
  },
  quickStatItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  quickStatDot: { width: 8, height: 8, borderRadius: 4 },
  quickStatValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  quickStatLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
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
  list: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardCritical: { borderColor: COLORS.error, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', gap: 12 },
  alertIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  levelBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 2 },
  levelText: { fontSize: 9, fontWeight: '800' },
  alertDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  metaDot: { fontSize: 11, color: COLORS.textMuted, marginHorizontal: 2 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  assignedText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
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
  actionBtnOutline: { borderWidth: 1.5, borderColor: ADMIN_COLORS.accent },
  actionBtnTextOutline: { fontSize: 13, fontWeight: '700', color: ADMIN_COLORS.accent },
  resolvedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  resolvedText: { fontSize: 12, color: COLORS.success, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
