import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, TextInput, Linking,
  ActivityIndicator, Animated, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import {
  visitorService,
  type VisitorDto,
  type VisitorAnalyticsDto,
} from '@/services/visitorService';

// ─────────────── Types ───────────────

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'all' | 'expected' | 'in' | 'out' | 'denied';
type ActionType = 'checkIn' | 'checkOut' | 'deny';

// ─────────────── Constants ───────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  EXPECTED:    { label: 'Expected',  color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' },
  CHECKED_IN:  { label: 'Inside',    color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' },
  CHECKED_OUT: { label: 'Left',      color: '#6B7280', bg: '#F3F4F6', icon: 'exit-outline' },
  DENIED:      { label: 'Denied',    color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle' },
  REJECTED:    { label: 'Rejected',  color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle' },
  EXPIRED:     { label: 'Expired',   color: '#6B7280', bg: '#F3F4F6', icon: 'alert-circle-outline' },
  CANCELLED:   { label: 'Cancelled', color: '#6B7280', bg: '#F3F4F6', icon: 'close-outline' },
};

const PURPOSE_ICONS: Record<string, IoniconsName> = {
  delivery: 'cube-outline',
  package: 'cube-outline',
  food: 'fast-food-outline',
  cab: 'car-outline',
  taxi: 'car-outline',
  guest: 'people-outline',
  plumber: 'construct-outline',
  electrician: 'flash-outline',
  service: 'construct-outline',
  maid: 'home-outline',
  cook: 'restaurant-outline',
  courier: 'bicycle-outline',
};

function purposeIcon(purpose: string): IoniconsName {
  const lower = purpose.toLowerCase();
  for (const [key, icon] of Object.entries(PURPOSE_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return 'person-outline';
}

const DENY_REASONS = [
  'No valid ID', 'Not on expected list', 'Resident unavailable',
  'Suspicious behaviour', 'Access hours violation', 'Other',
];

// ─────────────── Helpers ───────────────

function timeAgo(iso?: string) {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function dwellStr(from?: string, to?: string) {
  if (!from) return '';
  const mins = Math.floor(((to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ─────────────── VisitorCard ───────────────

interface CardProps {
  item: VisitorDto;
  loadingAction: ActionType | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onDenyPress: () => void;
}

function VisitorCard({ item, loadingAction, onCheckIn, onCheckOut, onDenyPress }: CardProps) {
  const meta = STATUS_META[item.status] ?? STATUS_META['EXPECTED'];
  const isExpected = item.status === 'EXPECTED';
  const isIn = item.status === 'CHECKED_IN';

  return (
    <View style={c.card}>
      {/* Top row */}
      <View style={c.cardTop}>
        <View style={[c.icon, { backgroundColor: meta.bg }]}>
          <Ionicons name={purposeIcon(item.purpose)} size={20} color={meta.color} />
        </View>

        <View style={c.info}>
          <View style={c.nameRow}>
            <Text style={c.name} numberOfLines={1}>{item.visitorName}</Text>
            {isExpected && !!item.residentId && (
              <View style={c.approvedBadge}>
                <Ionicons name="shield-checkmark" size={9} color={COLORS.success} />
                <Text style={c.approvedText}>Pre-approved</Text>
              </View>
            )}
          </View>
          <Text style={c.purpose} numberOfLines={1}>{item.purpose}</Text>

          <View style={c.metaRow}>
            {item.flatNumber && (
              <View style={c.metaChip}>
                <Ionicons name="home-outline" size={10} color={COLORS.textMuted} />
                <Text style={c.metaText}>{item.flatNumber}</Text>
              </View>
            )}
            {item.residentName && item.residentId && (
              <View style={c.metaChip}>
                <Ionicons name="person-outline" size={10} color={COLORS.textMuted} />
                <Text style={c.metaText}>{item.residentName}</Text>
              </View>
            )}
            {item.vehicleNumber && (
              <View style={c.metaChip}>
                <Ionicons name="car-outline" size={10} color={COLORS.textMuted} />
                <Text style={c.metaText}>{item.vehicleNumber}</Text>
              </View>
            )}
            {item.visitorPhone && (
              <TouchableOpacity
                style={c.metaChip}
                onPress={() => Linking.openURL(`tel:${item.visitorPhone}`)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="call-outline" size={10} color={GUARD_COLORS.accent} />
                <Text style={[c.metaText, { color: GUARD_COLORS.accent }]}>{item.visitorPhone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Pass code chip */}
          {item.passCode && (
            <View style={c.passCodeWrap}>
              <Ionicons name="qr-code-outline" size={10} color={COLORS.textMuted} />
              <Text style={c.passCodeText}>{item.passCode}</Text>
            </View>
          )}
        </View>

        <View style={c.right}>
          <View style={[c.statusPill, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[c.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {isIn ? (
            <Text style={c.dwellText}>{dwellStr(item.checkedInAt)}</Text>
          ) : isExpected && item.expectedAt ? (
            <Text style={c.timeText}>{fmtTime(item.expectedAt)}</Text>
          ) : item.checkedOutAt ? (
            <Text style={c.timeText}>{fmtTime(item.checkedOutAt)}</Text>
          ) : null}
        </View>
      </View>

      {/* Timeline row */}
      {(item.checkedInAt || item.checkedOutAt) && (
        <View style={c.timeline}>
          {item.checkedInAt && (
            <View style={c.timelineChip}>
              <Ionicons name="enter-outline" size={11} color={COLORS.textMuted} />
              <Text style={c.timelineText}>In {fmtTime(item.checkedInAt)}</Text>
            </View>
          )}
          {item.checkedOutAt && (
            <View style={c.timelineChip}>
              <Ionicons name="exit-outline" size={11} color={COLORS.textMuted} />
              <Text style={c.timelineText}>Out {fmtTime(item.checkedOutAt)}</Text>
            </View>
          )}
          {item.checkedInAt && item.checkedOutAt && (
            <View style={c.timelineChip}>
              <Ionicons name="timer-outline" size={11} color={COLORS.textMuted} />
              <Text style={c.timelineText}>{dwellStr(item.checkedInAt, item.checkedOutAt)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      {isExpected && (
        <View style={c.actions}>
          <TouchableOpacity
            style={[c.actionBtn, c.actionCheckIn, loadingAction === 'checkIn' && { opacity: 0.7 }]}
            onPress={onCheckIn}
            disabled={!!loadingAction}
          >
            {loadingAction === 'checkIn'
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="checkmark" size={15} color="#fff" /><Text style={c.actionTextPrimary}>Check In</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[c.actionBtn, c.actionDeny, loadingAction === 'deny' && { opacity: 0.7 }]}
            onPress={onDenyPress}
            disabled={!!loadingAction}
          >
            {loadingAction === 'deny'
              ? <ActivityIndicator size="small" color={COLORS.error} />
              : <><Ionicons name="close" size={15} color={COLORS.error} /><Text style={c.actionTextDanger}>Deny</Text></>
            }
          </TouchableOpacity>
        </View>
      )}
      {isIn && (
        <View style={c.actions}>
          <TouchableOpacity
            style={[c.actionBtn, c.actionCheckOut, loadingAction === 'checkOut' && { opacity: 0.7 }]}
            onPress={onCheckOut}
            disabled={!!loadingAction}
          >
            {loadingAction === 'checkOut'
              ? <ActivityIndicator size="small" color={GUARD_COLORS.accent} />
              : <><Ionicons name="exit-outline" size={15} color={GUARD_COLORS.accent} /><Text style={c.actionTextOutline}>Check Out</Text></>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─────────────── Main Screen ───────────────

export default function GuardVisitorsScreen() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<VisitorDto[]>([]);
  const [analytics, setAnalytics] = useState<VisitorAnalyticsDto | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  // Per-card, per-action loading: Map<visitorId, ActionType>
  const [actionLoading, setActionLoading] = useState<Map<number, ActionType>>(new Map());
  // Deny confirmation sheet
  const [denyTarget, setDenyTarget] = useState<VisitorDto | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [denying, setDenying] = useState(false);

  const searchAnim = useRef(new Animated.Value(0)).current;

  const setAction = (id: number, action: ActionType | null) => {
    setActionLoading(prev => {
      const next = new Map(prev);
      if (action === null) next.delete(id);
      else next.set(id, action);
      return next;
    });
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [vRes, aRes] = await Promise.allSettled([
      visitorService.getTodaysPasses(),
      visitorService.getAnalytics(),
    ]);
    if (vRes.status === 'fulfilled') setVisitors(vRes.value);
    if (aRes.status === 'fulfilled') setAnalytics(aRes.value);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  // Animated search toggle
  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
      Animated.timing(searchAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => setShowSearch(false));
    } else {
      setShowSearch(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    }
  };

  const counts = useMemo(() => ({
    all: visitors.length,
    expected: visitors.filter(v => v.status === 'EXPECTED').length,
    in: visitors.filter(v => v.status === 'CHECKED_IN').length,
    out: visitors.filter(v => v.status === 'CHECKED_OUT').length,
    denied: visitors.filter(v => v.status === 'DENIED' || v.status === 'REJECTED').length,
  }), [visitors]);

  const filtered = useMemo(() => {
    let list = visitors.filter(v => {
      if (filter === 'all') return true;
      if (filter === 'denied') return v.status === 'DENIED' || v.status === 'REJECTED';
      const map: Record<FilterKey, string> = { all: '', expected: 'EXPECTED', in: 'CHECKED_IN', out: 'CHECKED_OUT', denied: '' };
      return v.status === map[filter];
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.visitorName.toLowerCase().includes(q) ||
        v.purpose.toLowerCase().includes(q) ||
        (v.flatNumber ?? '').toLowerCase().includes(q) ||
        (v.vehicleNumber ?? '').toLowerCase().includes(q) ||
        (v.visitorPhone ?? '').includes(q) ||
        (v.passCode ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [visitors, filter, search]);

  const handleCheckIn = async (v: VisitorDto) => {
    setAction(v.id, 'checkIn');
    // Optimistic update
    setVisitors(prev => prev.map(x =>
      x.id === v.id ? { ...x, status: 'CHECKED_IN', checkedInAt: new Date().toISOString() } : x
    ));
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      let photo: string | undefined;
      if (perm.granted) {
        const captured = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.55, allowsEditing: false });
        if (!captured.canceled && captured.assets[0]?.base64) {
          photo = `data:image/jpeg;base64,${captured.assets[0].base64}`;
        }
      }
      await visitorService.checkIn(v.id, 'Main Gate', undefined, photo);
      loadData(true);
    } catch {
      // Rollback optimistic update
      setVisitors(prev => prev.map(x => x.id === v.id ? { ...x, status: v.status, checkedInAt: v.checkedInAt } : x));
    } finally {
      setAction(v.id, null);
    }
  };

  const handleCheckOut = async (v: VisitorDto) => {
    setAction(v.id, 'checkOut');
    // Optimistic update
    setVisitors(prev => prev.map(x =>
      x.id === v.id ? { ...x, status: 'CHECKED_OUT', checkedOutAt: new Date().toISOString() } : x
    ));
    try {
      await visitorService.checkOut(v.id);
      loadData(true);
    } catch {
      setVisitors(prev => prev.map(x => x.id === v.id ? { ...x, status: v.status, checkedOutAt: v.checkedOutAt } : x));
    } finally {
      setAction(v.id, null);
    }
  };

  const handleDenyConfirm = async () => {
    if (!denyTarget) return;
    setDenying(true);
    setAction(denyTarget.id, 'deny');
    const target = denyTarget;
    setDenyTarget(null);
    // Optimistic update
    setVisitors(prev => prev.map(x => x.id === target.id ? { ...x, status: 'DENIED' } : x));
    try {
      await visitorService.denyEntry(target.id);
      loadData(true);
    } catch {
      setVisitors(prev => prev.map(x => x.id === target.id ? { ...x, status: target.status } : x));
    } finally {
      setDenying(false);
      setAction(target.id, null);
      setDenyReason('');
    }
  };

  const searchHeight = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 52] });

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all',      label: 'All' },
    { key: 'expected', label: 'Expected' },
    { key: 'in',       label: 'Inside' },
    { key: 'out',      label: 'Left' },
    { key: 'denied',   label: 'Denied' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Visitor Log</Text>
          <Text style={s.headerSub}>
            {loading ? 'Loading…' : `${visitors.length} passes today`}
          </Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={toggleSearch}>
            <Ionicons name={showSearch ? 'close' : 'search'} size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.headerBtn, { backgroundColor: GUARD_COLORS.accentLight }]}
            onPress={() => router.push('/guard/walk-in')}
          >
            <Ionicons name="add" size={20} color={GUARD_COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar (animated slide-down) */}
      <Animated.View style={[s.searchWrap, { height: searchHeight, overflow: 'hidden' }]}>
        <View style={s.searchInner}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, flat, pass code…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Analytics strip */}
      {analytics && !loading && (
        <View style={s.analyticsStrip}>
          {[
            { val: analytics.totalToday ?? counts.all,      label: 'Total',    color: GUARD_COLORS.accent },
            { val: analytics.currentlyInside ?? counts.in,  label: 'Inside',   color: COLORS.success },
            { val: analytics.pendingExpected ?? counts.expected, label: 'Expected', color: COLORS.warning },
            { val: analytics.deniedToday ?? counts.denied,  label: 'Denied',   color: COLORS.error },
          ].map((cell, i) => (
            <View key={cell.label} style={{ flexDirection: 'row', flex: 1 }}>
              {i > 0 && <View style={s.analyticsDivider} />}
              <View style={s.analyticsCell}>
                <Text style={[s.analyticsVal, { color: cell.color }]}>{cell.val}</Text>
                <Text style={s.analyticsLabel}>{cell.label}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Filter chips */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
            {counts[f.key] > 0 && (
              <View style={[s.filterBadge, filter === f.key && s.filterBadgeActive]}>
                <Text style={[s.filterBadgeText, filter === f.key && s.filterBadgeTextActive]}>
                  {counts[f.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Visitor list */}
      {loading ? (
        <View style={s.loaderWrap}><ActivityIndicator size="large" color={GUARD_COLORS.accent} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <VisitorCard
              item={item}
              loadingAction={actionLoading.get(item.id) ?? null}
              onCheckIn={() => handleCheckIn(item)}
              onCheckOut={() => handleCheckOut(item)}
              onDenyPress={() => { setDenyTarget(item); setDenyReason(''); }}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>
                {search
                  ? 'No results'
                  : filter === 'all'
                    ? 'No visitors today'
                    : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} visitors`}
              </Text>
              <Text style={s.emptySub}>
                {search ? `No match for "${search}"` : 'Pull down to refresh'}
              </Text>
              {filter === 'all' && !search && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/guard/walk-in')}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={s.emptyBtnText}>Add Walk-In</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Deny confirmation modal */}
      <Modal visible={!!denyTarget} transparent animationType="slide" onRequestClose={() => setDenyTarget(null)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={s.backdropTouch} onPress={() => setDenyTarget(null)} />
          <View style={s.denySheet}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Deny Entry</Text>
                {denyTarget && (
                  <Text style={s.sheetSub}>{denyTarget.visitorName} · {denyTarget.flatNumber ?? denyTarget.purpose}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setDenyTarget(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.denyBody}>
              <Text style={s.denyLabel}>Reason (optional)</Text>
              <View style={s.denyChips}>
                {DENY_REASONS.map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[s.denyChip, denyReason === r && s.denyChipActive]}
                    onPress={() => setDenyReason(denyReason === r ? '' : r)}
                  >
                    <Text style={[s.denyChipText, denyReason === r && s.denyChipTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={s.denyInput}
                placeholder="Or type a custom reason…"
                placeholderTextColor={COLORS.textMuted}
                value={DENY_REASONS.includes(denyReason) ? '' : denyReason}
                onChangeText={setDenyReason}
              />

              <View style={s.denyActions}>
                <TouchableOpacity style={s.denyCancelBtn} onPress={() => setDenyTarget(null)}>
                  <Text style={s.denyCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.denyConfirmBtn, denying && { opacity: 0.6 }]}
                  onPress={handleDenyConfirm}
                  disabled={denying}
                >
                  {denying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={16} color="#fff" />
                      <Text style={s.denyConfirmText}>Deny Entry</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────── Styles ───────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 6 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchInner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.md, marginVertical: 8,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },

  analyticsStrip: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 10,
  },
  analyticsCell: { flex: 1, alignItems: 'center', gap: 2 },
  analyticsVal: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  analyticsLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  analyticsDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },

  filterRow: {
    flexDirection: 'row', gap: 6, paddingHorizontal: SPACING.md, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: GUARD_COLORS.accent, borderColor: GUARD_COLORS.accentDark },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  filterBadge: {
    backgroundColor: COLORS.border, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  filterBadgeText: { fontSize: 9, fontWeight: '900', color: COLORS.textMuted },
  filterBadgeTextActive: { color: '#fff' },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 32 },

  empty: { alignItems: 'center', paddingTop: 64, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  emptySub: { fontSize: 13, color: COLORS.textMuted },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: 10, paddingHorizontal: 20, ...SHADOWS.sm,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Deny confirmation modal
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  denySheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...SHADOWS.floating,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  sheetSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  denyBody: { padding: SPACING.lg, gap: 14 },
  denyLabel: {
    fontSize: 11, fontWeight: '800', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  denyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  denyChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  denyChipActive: { backgroundColor: COLORS.errorLight, borderColor: COLORS.error },
  denyChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  denyChipTextActive: { color: COLORS.error, fontWeight: '700' },
  denyInput: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 13, color: COLORS.text,
  },
  denyActions: { flexDirection: 'row', gap: SPACING.md, paddingBottom: 8 },
  denyCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  denyCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  denyConfirmBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.error, ...SHADOWS.sm,
  },
  denyConfirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  approvedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.successLight, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  approvedText: { fontSize: 9, fontWeight: '700', color: COLORS.success },
  purpose: { fontSize: 12, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  passCodeWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 2, alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.border,
  },
  passCodeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },

  right: { alignItems: 'flex-end', gap: 4 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  dwellText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  timeText: { fontSize: 11, color: COLORS.textMuted },

  timeline: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  timelineChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  timelineText: { fontSize: 11, color: COLORS.textMuted },

  actions: {
    flexDirection: 'row', gap: 8,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  actionCheckIn: { backgroundColor: COLORS.success },
  actionTextPrimary: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionDeny: { backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: COLORS.error },
  actionTextDanger: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  actionCheckOut: { borderWidth: 1.5, borderColor: GUARD_COLORS.accent },
  actionTextOutline: { fontSize: 13, fontWeight: '700', color: GUARD_COLORS.accent },
});
