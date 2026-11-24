import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { bazaarService, BazaarEvent, BazaarCategory, BazaarStatus } from '@/services/bazaarService';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';

const ACCENT = '#F97316';
const ACCENT_LIGHT = '#FFF7ED';
const ACCENT_BORDER = '#FED7AA';

const CATEGORY_EMOJI: Record<BazaarCategory, string> = {
  FLEA_MARKET: '🛍️',
  FOOD_COURT: '🍜',
  CRAFT_FAIR: '🎨',
  MELA: '🎡',
  GARAGE_SALE: '🏷️',
  OTHER: '🏪',
};

const STATUS_CONFIG: Record<BazaarStatus, { label: string; color: string; bg: string }> = {
  UPCOMING: { label: 'Upcoming', color: '#1D4ED8', bg: '#EFF6FF' },
  OPEN:     { label: 'Open',     color: '#15803D', bg: '#F0FDF4' },
  ONGOING:  { label: 'Live Now', color: '#C2410C', bg: '#FFF7ED' },
  COMPLETED:{ label: 'Done',     color: '#6B7280', bg: '#F3F4F6' },
  CANCELLED:{ label: 'Cancelled',color: '#DC2626', bg: '#FEF2F2' },
};

type FilterKey = 'ALL' | BazaarStatus | BazaarCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL',         label: 'All' },
  { key: 'OPEN',        label: 'Open' },
  { key: 'UPCOMING',    label: 'Upcoming' },
  { key: 'FOOD_COURT',  label: 'Food Court' },
  { key: 'FLEA_MARKET', label: 'Flea Market' },
  { key: 'CRAFT_FAIR',  label: 'Craft Fair' },
  { key: 'MELA',        label: 'Mela' },
];

function BazaarEventCard({ event }: { event: BazaarEvent }) {
  const router = useRouter();
  const status = STATUS_CONFIG[event.status];
  const emoji  = CATEGORY_EMOJI[event.category];
  const isFull = event.availableStalls === 0;

  const displayDate = (() => {
    try {
      const d = new Date(event.date);
      return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return event.date; }
  })();

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(`/bazaar/${event.id}` as any)}
      activeOpacity={0.85}
    >
      {/* Colourful top banner */}
      <View style={s.cardBanner}>
        <Text style={s.cardEmoji}>{emoji}</Text>
        <View style={[s.statusBadge, { backgroundColor: isFull ? '#FEF2F2' : status.bg }]}>
          <Text style={[s.statusText, { color: isFull ? '#DC2626' : status.color }]}>
            {isFull ? 'Full' : status.label}
          </Text>
        </View>
      </View>

      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{event.title}</Text>

        <View style={s.cardRow}>
          <Ionicons name="calendar-outline" size={13} color={THEME.muted} />
          <Text style={s.cardMeta}>{displayDate} · {event.startTime}–{event.endTime}</Text>
        </View>
        <View style={s.cardRow}>
          <Ionicons name="location-outline" size={13} color={THEME.muted} />
          <Text style={s.cardMeta} numberOfLines={1}>{event.venue}</Text>
        </View>

        <View style={s.cardFooter}>
          <View style={s.stallInfo}>
            <Text style={s.stallCount}>
              {event.availableStalls}/{event.totalStalls}
            </Text>
            <Text style={s.stallLabel}> stalls free</Text>
          </View>
          <View style={s.priceChip}>
            <Text style={s.priceText}>₹{event.stallPrice.toLocaleString('en-IN')}/stall</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BazaarScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const statusFilters: BazaarStatus[] = ['UPCOMING', 'OPEN', 'ONGOING', 'COMPLETED', 'CANCELLED'];
  const isStatusFilter = (k: FilterKey): k is BazaarStatus =>
    statusFilters.includes(k as BazaarStatus);

  const { data: events = [], refetch } = useQuery({
    queryKey: ['bazaar-events', filter],
    queryFn: () => bazaarService.getEvents(
      filter !== 'ALL' && isStatusFilter(filter) ? filter : undefined
    ),
    staleTime: 60_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const displayed = events.filter(e => {
    const matchesCategory =
      filter === 'ALL' || isStatusFilter(filter) || e.category === filter;
    const matchesSearch =
      !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.headerTitle}>Community Bazaar</Text>
          <Text style={s.headerSub}>Book a stall, sell &amp; celebrate</Text>
        </View>
        <TouchableOpacity
          style={s.myBookingsBtn}
          onPress={() => router.push('/bazaar/my-bookings' as any)}
        >
          <Ionicons name="receipt-outline" size={18} color={ACCENT} />
          <Text style={s.myBookingsText}>My Bookings</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={THEME.muted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search events or venue..."
          placeholderTextColor={THEME.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={THEME.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={i => i.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterList}
        renderItem={({ item }) => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Event list */}
      <FlatList
        data={displayed}
        keyExtractor={e => e.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🏪</Text>
            <Text style={s.emptyTitle}>No bazaars found</Text>
            <Text style={s.emptyText}>Check back soon for upcoming events</Text>
          </View>
        }
        renderItem={({ item }) => <BazaarEventCard event={item} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: THEME.background },
  header:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  headerLeft:      { flex: 1 },
  headerTitle:     { fontFamily: FONTS.displayBold, fontSize: 22, color: THEME.text },
  headerSub:       { fontFamily: FONTS.displayReg, fontSize: 13, color: THEME.muted, marginTop: 2 },
  myBookingsBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: ACCENT_LIGHT, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.xl, gap: 5, borderWidth: 1, borderColor: ACCENT_BORDER },
  myBookingsText:  { fontFamily: FONTS.displaySemi, fontSize: 12, color: ACCENT },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? 10 : 6, marginBottom: SPACING.sm },
  searchIcon:      { marginRight: 8 },
  searchInput:     { flex: 1, fontFamily: FONTS.displayReg, fontSize: 14, color: THEME.text },
  filterList:      { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, gap: 8 },
  filterChip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.xl, backgroundColor: '#fff', borderWidth: 1, borderColor: THEME.border },
  filterChipActive:{ backgroundColor: ACCENT, borderColor: ACCENT },
  filterChipText:  { fontFamily: FONTS.displaySemi, fontSize: 13, color: THEME.muted },
  filterChipTextActive: { color: '#fff' },
  listContent:     { paddingHorizontal: SPACING.lg, paddingBottom: 32, gap: 14 },
  card:            { backgroundColor: '#fff', borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOWS.sm, borderWidth: 1, borderColor: THEME.border },
  cardBanner:      { backgroundColor: ACCENT_LIGHT, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEmoji:       { fontSize: 36 },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.xl },
  statusText:      { fontFamily: FONTS.displaySemi, fontSize: 11 },
  cardBody:        { padding: SPACING.lg },
  cardTitle:       { fontFamily: FONTS.displayBold, fontSize: 16, color: THEME.text, marginBottom: 8, lineHeight: 22 },
  cardRow:         { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  cardMeta:        { fontFamily: FONTS.displayReg, fontSize: 13, color: THEME.muted, flex: 1 },
  cardFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: THEME.border },
  stallInfo:       { flexDirection: 'row', alignItems: 'baseline' },
  stallCount:      { fontFamily: FONTS.displayBold, fontSize: 16, color: ACCENT },
  stallLabel:      { fontFamily: FONTS.displayReg, fontSize: 13, color: THEME.muted },
  priceChip:       { backgroundColor: ACCENT_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: ACCENT_BORDER },
  priceText:       { fontFamily: FONTS.displaySemi, fontSize: 12, color: ACCENT },
  empty:           { alignItems: 'center', paddingTop: 80 },
  emptyEmoji:      { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontFamily: FONTS.displayBold, fontSize: 18, color: THEME.text, marginBottom: 6 },
  emptyText:       { fontFamily: FONTS.displayReg, fontSize: 14, color: THEME.muted, textAlign: 'center' },
});
