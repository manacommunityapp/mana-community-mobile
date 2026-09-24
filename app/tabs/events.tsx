import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { eventService } from '@/services/eventService';
import { EventDto, EventType } from '@/types/api';
import { Header } from '@/components/common/Header';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES: { value: EventType | 'ALL'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ALL',       label: 'All',       icon: 'grid-outline' },
  { value: 'SOCIAL',    label: 'Social',    icon: 'people-outline' },
  { value: 'SPORTS',    label: 'Sports',    icon: 'football-outline' },
  { value: 'CULTURAL',  label: 'Cultural',  icon: 'color-palette-outline' },
  { value: 'WORKSHOP',  label: 'Workshop',  icon: 'school-outline' },
  { value: 'RELIGIOUS', label: 'Religious', icon: 'heart-outline' },
  { value: 'MEETING',   label: 'Meeting',   icon: 'briefcase-outline' },
  { value: 'COMMUNITY', label: 'Community', icon: 'home-outline' },
];

// ── Event type colors ─────────────────────────────────────────────────────────
const EVENT_COLORS: Record<string, { badge: string; bg: string }> = {
  SPORTS:    { badge: '#059669', bg: '#D1FAE5' },
  SOCIAL:    { badge: '#2563EB', bg: '#DBEAFE' },
  CULTURAL:  { badge: '#7C3AED', bg: '#EDE9FE' },
  WORKSHOP:  { badge: '#D97706', bg: '#FEF3C7' },
  RELIGIOUS: { badge: '#DC2626', bg: '#FEE2E2' },
  MEETING:   { badge: '#0891B2', bg: '#CFFAFE' },
  COMMUNITY: { badge: '#4F46E5', bg: '#EEF2FF' },
};

// ── EventCard ─────────────────────────────────────────────────────────────────
function EventCard({ event, onPress }: { event: EventDto; onPress: () => void }) {
  const qc = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: () =>
      event.isRegistered
        ? eventService.unregister(event.id)
        : eventService.register(event.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return { day: '--', mon: '---', isToday: false, isTomorrow: false };
    try {
      const d = parseISO(dateStr);
      return {
        day: format(d, 'dd'),
        mon: format(d, 'MMM').toUpperCase(),
        isToday: isToday(d),
        isTomorrow: isTomorrow(d),
      };
    } catch {
      return { day: '--', mon: '---', isToday: false, isTomorrow: false };
    }
  }, []);

  const formatTime = useCallback((timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${hour % 12 || 12}:${m} ${ampm}`;
    } catch {
      return timeStr || '';
    }
  }, []);

  const { day, mon, isToday: dateIsToday, isTomorrow: dateIsTomorrow } = formatDate(event.startDate);
  const typeColors = EVENT_COLORS[event.type] ?? { badge: COLORS.primary, bg: COLORS.primaryLight };
  const isRegistered = event.isRegistered || event.rsvped;

  return (
    <TouchableOpacity
      style={[styles.card, dateIsToday && styles.cardToday]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Today / Tomorrow badge */}
      {(dateIsToday || dateIsTomorrow) && (
        <View style={[styles.urgencyBadge, { backgroundColor: dateIsToday ? COLORS.error : COLORS.warning }]}>
          <Text style={styles.urgencyText}>{dateIsToday ? 'TODAY' : 'TMR'}</Text>
        </View>
      )}

      {/* Date box */}
      <View style={[styles.dateBox, { backgroundColor: typeColors.bg }]}>
        <Text style={[styles.dateDay, { color: typeColors.badge }]}>{day}</Text>
        <Text style={[styles.dateMon, { color: typeColors.badge }]}>{mon}</Text>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Type chip */}
        <View style={[styles.typeChip, { backgroundColor: typeColors.bg }]}>
          <Text style={[styles.typeChipText, { color: typeColors.badge }]}>
            {event.type}
          </Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.cardMeta} numberOfLines={1}>
            {event.venue || event.location || 'TBD'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
          <Text style={styles.cardMeta}>{formatTime(event.startTime)}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.goingRow}>
            <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.rsvpCount}>
              {event.registrationCount ?? event.rsvpCount ?? event.attendees ?? 0} going
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.rsvpBtn, isRegistered && styles.rsvpBtnActive]}
            onPress={(e) => { e.stopPropagation?.(); registerMutation.mutate(); }}
            disabled={registerMutation.isPending}
            activeOpacity={0.7}
          >
            {isRegistered && <Ionicons name="checkmark" size={13} color="#fff" />}
            <Text style={[styles.rsvpBtnText, isRegistered && styles.rsvpBtnTextActive]}>
              {isRegistered ? 'Going' : 'Register'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── EventsScreen ──────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');

  const { data: events = [], isLoading, refetch, isRefetching } = useQuery<EventDto[]>({
    queryKey: ['events'],
    queryFn: () => eventService.getUpcomingEvents(),
  });

  const filtered = filter === 'ALL' ? events : events.filter(e => e.type === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Events"
        actions={[
          { icon: 'bookmark-outline', onPress: () => router.push('/events/my-events') },
          { icon: 'add-circle-outline', onPress: () => router.push('/events/create') },
        ]}
      />

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[styles.filterChip, filter === c.value && styles.filterChipActive]}
            onPress={() => setFilter(c.value)}
          >
            <Ionicons
              name={c.icon}
              size={13}
              color={filter === c.value ? '#fff' : COLORS.textMuted}
            />
            <Text style={[styles.filterText, filter === c.value && styles.filterTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => String(e.id)}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/events/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="calendar-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptyText}>
                {filter !== 'ALL' ? 'No events in this category.' : 'Events will appear here when created.'}
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/events/create')}>
                <Ionicons name="add-circle" size={17} color="#fff" />
                <Text style={styles.createBtnText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // ── Filters ──────────────────────────────────────────────────
  filterScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 54,
  },
  filterRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  // ── List ─────────────────────────────────────────────────────
  list: { padding: 12, gap: 10 },
  // ── Card ─────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  cardToday: {
    borderColor: COLORS.warning,
    borderWidth: 1.5,
  },
  urgencyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  dateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 58,
    borderRadius: RADIUS.md,
    flexShrink: 0,
  },
  dateDay: { fontSize: 22, fontWeight: '800' },
  dateMon: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  // ── Card body ────────────────────────────────────────────────
  cardBody: { flex: 1, gap: 4 },
  typeChip: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginBottom: 2,
  },
  typeChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  goingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rsvpCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rsvpBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rsvpBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  rsvpBtnTextActive: { color: '#fff' },
  // ── Empty ────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 6,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
