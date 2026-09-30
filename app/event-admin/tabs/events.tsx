import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { EVENT_ADMIN_COLORS } from '@/constants/eventAdminTheme';
import { eventAdminService, type EventSummary } from '@/services/eventAdminService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const FILTERS = ['All', 'PUBLISHED', 'DRAFT', 'COMPLETED', 'CANCELLED'] as const;

export default function EventsListScreen() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await eventAdminService.getEvents(
      undefined,
      filter === 'All' ? undefined : filter,
    );
    setEvents(data);
  };

  useEffect(() => { load(); }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusMeta: Record<string, { color: string; bg: string }> = {
    PUBLISHED: { color: EVENT_ADMIN_COLORS.accent, bg: EVENT_ADMIN_COLORS.accentLight },
    DRAFT: { color: '#D97706', bg: '#FEF3C7' },
    COMPLETED: { color: COLORS.textMuted, bg: COLORS.surfaceAlt },
    CANCELLED: { color: '#DC2626', bg: '#FEE2E2' },
  };

  const typeIcons: Record<string, IoniconsName> = {
    CULTURAL: 'color-palette',
    SOCIAL: 'people',
    SPORTS: 'football',
    RELIGIOUS: 'heart',
    MEETING: 'briefcase',
    WORKSHOP: 'school',
    COMMUNITY: 'home',
    OTHER: 'ellipsis-horizontal',
  };

  const renderItem = ({ item }: { item: EventSummary }) => {
    const meta = statusMeta[item.status] || statusMeta.DRAFT;
    const icon = typeIcons[item.type] || 'calendar-outline';
    const progress = item.maxAttendees ? item.registrationCount / item.maxAttendees : 0;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.typeBadge, { backgroundColor: EVENT_ADMIN_COLORS.accentLight }]}>
            <Ionicons name={icon} size={12} color={EVENT_ADMIN_COLORS.accent} />
            <Text style={[s.typeText, { color: EVENT_ADMIN_COLORS.accentDark }]}>{formatType(item.type)}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[s.statusText, { color: meta.color }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={s.cardTitle}>{item.title}</Text>
        <View style={s.cardDetails}>
          <View style={s.detailItem}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.detailText}>{formatDate(item.startDate)}</Text>
          </View>
          {item.venue && (
            <View style={s.detailItem}>
              <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
              <Text style={s.detailText}>{item.venue}</Text>
            </View>
          )}
          <View style={s.detailItem}>
            <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.detailText}>{item.organizer || 'Organizer'}</Text>
          </View>
        </View>
        {item.maxAttendees && (
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>{item.registrationCount}/{item.maxAttendees} registered</Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
          </View>
        )}
        <View style={s.cardFooter}>
          <View style={[s.priceBadge, { backgroundColor: item.priceType === 'PAID' ? '#FEF3C7' : '#D1FAE5' }]}>
            <Ionicons name={item.priceType === 'PAID' ? 'cash-outline' : 'gift-outline'} size={10} color={item.priceType === 'PAID' ? '#D97706' : '#059669'} />
            <Text style={[s.priceText, { color: item.priceType === 'PAID' ? '#D97706' : '#059669' }]}>{item.priceType}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Events</Text>
        <Text style={s.headerSub}>{events.length} total</Text>
      </View>
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={f => f}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        )}
      />
      <FlatList
        data={events}
        keyExtractor={e => String(e.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EVENT_ADMIN_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
            <Text style={s.emptyText}>No events found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: EVENT_ADMIN_COLORS.accent,
    borderColor: EVENT_ADMIN_COLORS.accent,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: 12, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3,
  },
  typeText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 9, fontWeight: '800' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  cardDetails: { gap: 3, marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: COLORS.textMuted },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  progressLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, width: 110 },
  progressBar: { flex: 1, height: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: EVENT_ADMIN_COLORS.accent, borderRadius: 3 },
  cardFooter: { flexDirection: 'row' },
  priceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3,
  },
  priceText: { fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
