import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, FONTS, SPACING } from '@/constants/config';
import type { EventDto } from '@/types/api';
import { format, parseISO, isToday, isPast } from 'date-fns';

type Tab = 'registered' | 'created';

const TYPE_COLORS: Record<string, string> = {
  SPORTS: '#059669', SOCIAL: '#2563EB', CULTURAL: '#7C3AED',
  WORKSHOP: '#4F46E5', RELIGIOUS: '#DC2626', MEETING: '#0891B2', COMMUNITY: '#4F46E5',
};

export default function MyEventsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('registered');

  const { data: myEvents = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: eventService.getMyEvents,
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: eventService.getAllEvents,
  });

  const registeredEvents = allEvents.filter(e => e.isRegistered);
  const createdEvents = myEvents;
  const events = tab === 'registered' ? registeredEvents : createdEvents;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try { return format(parseISO(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return { day: '--', mon: '---' };
    try {
      const d = parseISO(dateStr);
      return { day: format(d, 'dd'), mon: format(d, 'MMM').toUpperCase() };
    } catch {
      return { day: '--', mon: '---' };
    }
  };

  const renderEvent = ({ item }: { item: EventDto }) => {
    const color = TYPE_COLORS[item.type] ?? COLORS.primary;
    const { day, mon } = formatShortDate(item.startDate);
    const eventIsToday = item.startDate ? isToday(parseISO(item.startDate)) : false;
    const eventIsPast = item.startDate ? isPast(parseISO(item.startDate)) : false;

    return (
      <TouchableOpacity
        style={[s.card, eventIsPast && item.status !== 'CANCELLED' && s.cardPast]}
        onPress={() => router.push(`/events/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Mini date */}
        <View style={[s.miniDate, { backgroundColor: color + '14' }]}>
          <Text style={[s.miniDateDay, { color }]}>{day}</Text>
          <Text style={[s.miniDateMon, { color: color + 'AA' }]}>{mon}</Text>
          {eventIsToday && <View style={[s.miniTodayDot, { backgroundColor: color }]} />}
        </View>

        {/* Content */}
        <View style={s.cardContent}>
          <View style={s.cardTopRow}>
            <Text style={[s.cardTitle, eventIsPast && s.cardTitlePast]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.status && (
              <View style={[
                s.statusBadge,
                item.status === 'CANCELLED' && { backgroundColor: '#FEF2F2' },
                item.status === 'ONGOING' && { backgroundColor: '#ECFDF5' },
                item.status === 'COMPLETED' && { backgroundColor: COLORS.surfaceAlt },
              ]}>
                <Text style={[
                  s.statusText,
                  item.status === 'CANCELLED' && { color: COLORS.error },
                  item.status === 'ONGOING' && { color: '#059669' },
                  item.status === 'COMPLETED' && { color: COLORS.textMuted },
                ]}>
                  {item.status === 'UPCOMING' ? 'Upcoming' : item.status === 'ONGOING' ? 'Live' : item.status === 'CANCELLED' ? 'Cancelled' : item.status === 'COMPLETED' ? 'Done' : item.status}
                </Text>
              </View>
            )}
          </View>
          <View style={s.cardMetaRow}>
            {(item.venue || item.location) && (
              <>
                <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                <Text style={s.cardMetaText} numberOfLines={1}>{item.venue || item.location}</Text>
                <View style={s.metaDot} />
              </>
            )}
            <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.cardMetaText}>{item.registrationCount ?? item.attendees ?? 0} going</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Events</Text>
        <TouchableOpacity onPress={() => router.push('/events/create')} style={s.navBtn} hitSlop={8}>
          <Ionicons name="add" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {(['registered', 'created'] as Tab[]).map(t => {
          const active = tab === t;
          const count = t === 'registered' ? registeredEvents.length : createdEvents.length;
          return (
            <TouchableOpacity
              key={t}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t === 'registered' ? 'checkmark-circle-outline' : 'create-outline'}
                size={16}
                color={active ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[s.tabText, active && s.tabTextActive]}>
                {t === 'registered' ? 'Registered' : 'Created'}
              </Text>
              <View style={[s.tabCount, active && s.tabCountActive]}>
                <Text style={[s.tabCountText, active && s.tabCountTextActive]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => String(item.id)}
          renderItem={renderEvent}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <LinearGradient colors={[COLORS.primaryLight, '#fff']} style={s.emptyCircle}>
                <Ionicons name={tab === 'registered' ? 'ticket-outline' : 'create-outline'} size={36} color={COLORS.primary} />
              </LinearGradient>
              <Text style={s.emptyTitle}>No events yet</Text>
              <Text style={s.emptyDesc}>
                {tab === 'registered'
                  ? "Events you register for will show up here."
                  : "Events you create will appear here."}
              </Text>
              {tab === 'created' && (
                <TouchableOpacity style={s.emptyBtnWrap} onPress={() => router.push('/events/create')}>
                  <LinearGradient colors={GRADIENTS.primary} style={s.emptyBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={s.emptyBtnText}>Create Event</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.text,
    fontFamily: FONTS.displayBold, letterSpacing: -0.3,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted, fontFamily: FONTS.medium },
  tabTextActive: { color: COLORS.primary, fontWeight: '600', fontFamily: FONTS.semiBold },
  tabCount: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountActive: { backgroundColor: COLORS.primaryLight },
  tabCountText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, fontFamily: FONTS.bold },
  tabCountTextActive: { color: COLORS.primary },

  // List
  list: { padding: SPACING.lg, gap: 10 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardPast: { opacity: 0.6 },
  miniDate: {
    width: 48, height: 52, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  miniDateDay: { fontSize: 20, fontWeight: '800', lineHeight: 24, fontFamily: FONTS.displayEB },
  miniDateMon: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  miniTodayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },

  cardContent: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1, fontFamily: FONTS.displaySemi },
  cardTitlePast: { color: COLORS.textMuted },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  cardMetaText: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.border },

  statusBadge: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.bold },

  // Empty
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6, fontFamily: FONTS.displayBold },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.regular },
  emptyBtnWrap: { marginTop: 16, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.primary },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.displayBold },
});
