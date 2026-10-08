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

const TYPE_THEME: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  SPORTS:    { color: '#059669', bg: '#ECFDF5', icon: 'football-outline' },
  SOCIAL:    { color: '#2563EB', bg: '#EFF6FF', icon: 'people-outline' },
  CULTURAL:  { color: '#7C3AED', bg: '#F5F3FF', icon: 'color-palette-outline' },
  WORKSHOP:  { color: '#4F46E5', bg: '#EEF2FF', icon: 'school-outline' },
  RELIGIOUS: { color: '#DC2626', bg: '#FEF2F2', icon: 'heart-outline' },
  MEETING:   { color: '#0891B2', bg: '#ECFEFF', icon: 'briefcase-outline' },
  COMMUNITY: { color: '#4F46E5', bg: '#EEF2FF', icon: 'home-outline' },
};

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
    if (!dateStr) return { day: '--', mon: '---', weekday: '', daysAway: -1 };
    try {
      const d = parseISO(dateStr);
      return {
        day: format(d, 'dd'),
        mon: format(d, 'MMM').toUpperCase(),
        weekday: format(d, 'EEE'),
        daysAway: differenceInDays(d, new Date()),
      };
    } catch {
      return { day: '--', mon: '---', weekday: '', daysAway: -1 };
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

  const { day, mon, weekday, daysAway } = formatDate(event.startDate);
  const theme = TYPE_THEME[event.type] ?? { color: COLORS.primary, bg: COLORS.primaryLight, icon: 'calendar-outline' as const };
  const isRegistered = event.isRegistered || event.rsvped;
  const dateIsToday = isToday(event.startDate ? parseISO(event.startDate) : new Date(0));
  const dateIsTomorrow = isTomorrow(event.startDate ? parseISO(event.startDate) : new Date(0));
  const attendees = event.registrationCount ?? event.rsvpCount ?? event.attendees ?? 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Left date strip */}
      <LinearGradient
        colors={[theme.color, theme.color + 'CC']}
        style={styles.dateStrip}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateMon}>{mon}</Text>
        {dateIsToday && (
          <View style={styles.todayDot} />
        )}
      </LinearGradient>

      {/* Card body */}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          {/* Type + urgency */}
          <View style={styles.chipRow}>
            <View style={[styles.typeChip, { backgroundColor: theme.bg }]}>
              <Ionicons name={theme.icon} size={10} color={theme.color} />
              <Text style={[styles.typeChipText, { color: theme.color }]}>{event.type}</Text>
            </View>
            {(dateIsToday || dateIsTomorrow) && (
              <View style={[styles.urgencyChip, { backgroundColor: dateIsToday ? '#FEF2F2' : '#FFFBEB' }]}>
                <View style={[styles.urgencyDot, { backgroundColor: dateIsToday ? COLORS.error : COLORS.warning }]} />
                <Text style={[styles.urgencyText, { color: dateIsToday ? COLORS.error : '#92400E' }]}>
                  {dateIsToday ? 'Today' : 'Tomorrow'}
                </Text>
              </View>
            )}
            {!dateIsToday && !dateIsTomorrow && daysAway >= 0 && daysAway <= 7 && (
              <Text style={styles.daysAway}>{weekday}</Text>
            )}
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
        </View>

        {/* Meta */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.cardMeta} numberOfLines={1}>
              {event.venue || event.location || 'TBD'}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.cardMeta}>{formatTime(event.startTime)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.attendeeRow}>
            <View style={styles.attendeeAvatars}>
              {[0, 1, 2].map(i => (
                <View
                  key={i}
                  style={[
                    styles.miniAvatar,
                    { marginLeft: i > 0 ? -6 : 0, backgroundColor: [theme.color, theme.color + '99', theme.color + '66'][i] },
                  ]}
                >
                  <Ionicons name="person" size={8} color="#fff" />
                </View>
              ))}
            </View>
            <Text style={styles.attendeeText}>
              {attendees} {attendees === 1 ? 'person' : 'people'} going
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.rsvpBtn,
              isRegistered ? styles.rsvpBtnRegistered : { borderColor: theme.color },
            ]}
            onPress={(e) => { e.stopPropagation?.(); registerMutation.mutate(); }}
            disabled={registerMutation.isPending}
            activeOpacity={0.7}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator size={12} color={isRegistered ? '#065F46' : theme.color} />
            ) : (
              <>
                {isRegistered && <Ionicons name="checkmark" size={12} color="#065F46" />}
                <Text style={[
                  styles.rsvpBtnText,
                  isRegistered ? styles.rsvpTextRegistered : { color: theme.color },
                ]}>
                  {isRegistered ? 'Going' : 'RSVP'}
                </Text>
              </>
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Hero header */}
      <LinearGradient
        colors={GRADIENTS.hero}
        style={styles.heroHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calendar" size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.heroTitle}>Events</Text>
              <Text style={styles.heroSub}>
                {events.length} upcoming
              </Text>
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
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

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
              <Ionicons
                name={c.icon}
                size={14}
                color={active ? '#fff' : COLORS.textMuted}
              />
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
              <LinearGradient
                colors={[COLORS.primaryLight, '#fff']}
                style={styles.emptyIconCircle}
              >
                <Ionicons name="calendar-outline" size={40} color={COLORS.primary} />
              </LinearGradient>
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
                  <Ionicons name="add-circle" size={18} color="#fff" />
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
  container: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  heroHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    fontFamily: FONTS.displayEB,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginTop: 1,
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
  },

  // Filters
  filterScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 56,
  },
  filterRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.primary,
  },
  filterText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterTextActive: { color: '#fff' },

  // List
  list: { padding: SPACING.md, gap: 12 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  dateStrip: {
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
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
    marginTop: 1,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginTop: 6,
  },

  // Card body
  cardBody: { flex: 1, padding: 12, gap: 6 },
  cardTop: { gap: 4 },
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
  typeChipText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    fontFamily: FONTS.bold,
  },
  urgencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgencyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  urgencyText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontFamily: FONTS.bold,
  },
  daysAway: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
    fontFamily: FONTS.displayBold,
  },

  // Meta
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.border,
  },
  cardMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendeeAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  attendeeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rsvpBtnRegistered: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  rsvpBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: FONTS.bold,
  },
  rsvpTextRegistered: { color: '#065F46' },

  // Loading
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

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
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
    ...SHADOWS.primary,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.displayBold,
  },
});
