import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { eventService } from '@/services/eventService';
import { EventDto, EventType } from '@/types/api';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, FONTS, SPACING } from '@/constants/config';
import { format, parseISO, isToday, isTomorrow, differenceInDays } from 'date-fns';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORIES: { value: EventType | 'ALL'; label: string; emoji: string }[] = [
  { value: 'ALL',       label: 'All',       emoji: '🎯' },
  { value: 'SOCIAL',    label: 'Social',    emoji: '🎉' },
  { value: 'SPORTS',    label: 'Sports',    emoji: '⚽' },
  { value: 'CULTURAL',  label: 'Cultural',  emoji: '🎨' },
  { value: 'WORKSHOP',  label: 'Workshop',  emoji: '🎓' },
  { value: 'RELIGIOUS', label: 'Religious', emoji: '🙏' },
  { value: 'MEETING',   label: 'Meeting',   emoji: '💼' },
  { value: 'COMMUNITY', label: 'Community', emoji: '🏠' },
];

const TYPE_THEME: Record<string, { color: string; bg: string; emoji: string; gradient: [string, string] }> = {
  SPORTS:    { color: '#059669', bg: '#ECFDF5', emoji: '⚽', gradient: ['#059669', '#10B981'] },
  SOCIAL:    { color: '#2563EB', bg: '#EFF6FF', emoji: '🎉', gradient: ['#2563EB', '#3B82F6'] },
  CULTURAL:  { color: '#7C3AED', bg: '#F5F3FF', emoji: '🎨', gradient: ['#7C3AED', '#8B5CF6'] },
  WORKSHOP:  { color: '#4F46E5', bg: '#EEF2FF', emoji: '🎓', gradient: ['#4F46E5', '#6366F1'] },
  RELIGIOUS: { color: '#DC2626', bg: '#FEF2F2', emoji: '🙏', gradient: ['#DC2626', '#EF4444'] },
  MEETING:   { color: '#0891B2', bg: '#ECFEFF', emoji: '💼', gradient: ['#0891B2', '#06B6D4'] },
  COMMUNITY: { color: '#4F46E5', bg: '#EEF2FF', emoji: '🏠', gradient: ['#4F46E5', '#6366F1'] },
};

const QUICK_ACTIONS = [
  { label: 'Create',     emoji: '✍️', bg: '#EEF2FF', color: '#4F46E5', route: '/events/create' },
  { label: 'My Events',  emoji: '📋', bg: '#ECFDF5', color: '#059669', route: '/events/my-events' },
  { label: 'Calendar',   emoji: '🗓️', bg: '#FEF3C7', color: '#D97706', route: '/events/calendar' },
  { label: 'Passes',     emoji: '🎟️', bg: '#FCE7F3', color: '#DB2777', route: '/events/passes' },
];

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
    if (!dateStr) return { day: '--', mon: '---', weekday: '' };
    try {
      const d = parseISO(dateStr);
      return {
        day: format(d, 'dd'),
        mon: format(d, 'MMM').toUpperCase(),
        weekday: format(d, 'EEE'),
      };
    } catch {
      return { day: '--', mon: '---', weekday: '' };
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

  const { day, mon, weekday } = formatDate(event.startDate);
  const theme = TYPE_THEME[event.type] ?? { color: COLORS.primary, bg: COLORS.primaryLight, emoji: '📅', gradient: GRADIENTS.primary as unknown as [string, string] };
  const isRegistered = event.isRegistered || event.rsvped;
  const dateIsToday = event.startDate ? isToday(parseISO(event.startDate)) : false;
  const dateIsTomorrow = event.startDate ? isTomorrow(parseISO(event.startDate)) : false;
  const daysAway = event.startDate ? differenceInDays(parseISO(event.startDate), new Date()) : -1;
  const attendees = event.registrationCount ?? event.rsvpCount ?? event.attendees ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Left date strip */}
      <LinearGradient
        colors={theme.gradient}
        style={styles.dateStrip}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text style={styles.dateStripEmoji}>{theme.emoji}</Text>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMon}>{mon}</Text>
        {dateIsToday && <View style={styles.todayDot} />}
      </LinearGradient>

      {/* Card body */}
      <View style={styles.cardBody}>
        {/* Top row: chips */}
        <View style={styles.chipRow}>
          <View style={[styles.typeChip, { backgroundColor: theme.bg }]}>
            <Text style={styles.typeChipEmoji}>{theme.emoji}</Text>
            <Text style={[styles.typeChipText, { color: theme.color }]}>{event.type}</Text>
          </View>
          {dateIsToday && (
            <View style={styles.urgencyChipToday}>
              <View style={styles.livePulse} />
              <Text style={styles.urgencyTextToday}>Today</Text>
            </View>
          )}
          {dateIsTomorrow && (
            <View style={styles.urgencyChipTomorrow}>
              <Text style={styles.urgencyTextTomorrow}>Tomorrow</Text>
            </View>
          )}
          {!dateIsToday && !dateIsTomorrow && daysAway >= 0 && daysAway <= 7 && (
            <Text style={styles.daysAway}>{weekday} · {daysAway}d</Text>
          )}
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>

        {/* Meta */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaEmoji}>📍</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {event.venue || event.location || 'TBD'}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaEmoji}>🕐</Text>
            <Text style={styles.cardMeta}>{formatTime(event.startTime)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.attendeeRow}>
            <View style={styles.attendeeBubble}>
              <Text style={styles.attendeeBubbleText}>👥 {attendees}</Text>
            </View>
            <Text style={styles.attendeeLabel}>going</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.rsvpBtn,
              isRegistered
                ? styles.rsvpBtnRegistered
                : { backgroundColor: theme.color },
            ]}
            onPress={(e) => { e.stopPropagation?.(); registerMutation.mutate(); }}
            disabled={registerMutation.isPending}
            activeOpacity={0.7}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator size={12} color={isRegistered ? '#065F46' : '#fff'} />
            ) : isRegistered ? (
              <>
                <Text style={styles.rsvpTextRegistered}>✓ Going</Text>
              </>
            ) : (
              <Text style={styles.rsvpBtnText}>RSVP</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<EventType | 'ALL'>('ALL');

  const { data: events = [], isLoading, refetch, isRefetching } = useQuery<EventDto[]>({
    queryKey: ['events'],
    queryFn: () => eventService.getUpcomingEvents(),
  });

  const filtered = filter === 'ALL' ? events : events.filter(e => e.type === filter);

  const todayCount = events.filter(e => e.startDate && isToday(parseISO(e.startDate))).length;
  const thisWeekCount = events.filter(e => {
    if (!e.startDate) return false;
    const d = differenceInDays(parseISO(e.startDate), new Date());
    return d >= 0 && d <= 7;
  }).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#312E81', '#4F46E5', '#6366F1']}
        style={styles.heroHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconWrap}>
              <Text style={styles.heroEmoji}>📅</Text>
            </View>
            <View>
              <Text style={styles.heroTitle}>Events</Text>
              <Text style={styles.heroSub}>{events.length} upcoming</Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => router.push('/events/my-events')}
              hitSlop={8}
            >
              <Ionicons name="bookmark-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroBtnAccent}
              onPress={() => router.push('/events/create')}
              hitSlop={8}
            >
              <Ionicons name="add" size={20} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🔴</Text>
            <Text style={styles.statValue}>{todayCount}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>📆</Text>
            <Text style={styles.statValue}>{thisWeekCount}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statEmoji}>🎫</Text>
            <Text style={styles.statValue}>{events.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={styles.quickCard}
            onPress={() => router.push(a.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
              <Text style={styles.quickEmoji}>{a.emoji}</Text>
            </View>
            <Text style={styles.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {CATEGORIES.map(c => {
          const active = filter === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(c.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.filterEmoji}>{c.emoji}</Text>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => String(e.id)}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/events/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyEmoji}>📅</Text>
              </View>
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptyText}>
                {filter !== 'ALL'
                  ? 'Try a different category or check back later.'
                  : 'Events will appear here once created by your community.'}
              </Text>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => router.push('/events/create')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={GRADIENTS.primary}
                  style={styles.createBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.createBtnEmoji}>✍️</Text>
                  <Text style={styles.createBtnText}>Create Event</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // ── Hero Header ──
  heroHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 20 },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: FONTS.displayEB,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 1,
    fontFamily: FONTS.medium,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtnAccent: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },

  // ── Stats Strip ──
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statEmoji: { fontSize: 13 },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.displayEB,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // ── Quick Actions ──
  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  quickIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickEmoji: { fontSize: 16 },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.medium,
  },

  // ── Filter Pills ──
  filterScroll: {
    maxHeight: 50,
  },
  filterRow: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 7,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: RADIUS.full,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  filterChipActive: {
    backgroundColor: '#312E81',
    borderColor: '#312E81',
    ...SHADOWS.sm,
  },
  filterEmoji: { fontSize: 13 },
  filterText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterTextActive: { color: '#fff' },

  // ── List ──
  list: { padding: 14, gap: 12, paddingBottom: 20 },

  // ── Event Card ──
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.card,
  },
  dateStrip: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  dateStripEmoji: { fontSize: 16, marginBottom: 2 },
  dateDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 28,
    fontFamily: FONTS.displayEB,
  },
  dateMon: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginTop: 4,
  },

  // ── Card Body ──
  cardBody: { flex: 1, padding: 12, gap: 6 },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeChipEmoji: { fontSize: 10 },
  typeChipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: FONTS.bold,
  },
  urgencyChipToday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  urgencyTextToday: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
    fontFamily: FONTS.bold,
  },
  urgencyChipTomorrow: {
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgencyTextTomorrow: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
    fontFamily: FONTS.bold,
  },
  daysAway: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
    fontFamily: FONTS.displayBold,
  },

  // ── Meta ──
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaEmoji: { fontSize: 10 },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#E8E8F0',
  },
  cardMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },

  // ── Card Footer ──
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  attendeeBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  attendeeBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  attendeeLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rsvpBtnRegistered: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rsvpBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
    fontFamily: FONTS.bold,
  },
  rsvpTextRegistered: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    fontFamily: FONTS.bold,
  },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },

  // ── Empty ──
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONTS.regular,
  },
  createBtn: {
    marginTop: 8,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  createBtnEmoji: { fontSize: 16 },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.displayBold,
  },
});
