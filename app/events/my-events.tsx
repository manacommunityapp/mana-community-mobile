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

const TYPE_CONFIG: Record<string, { color: string; emoji: string }> = {
  SPORTS:    { color: '#059669', emoji: '⚽' },
  SOCIAL:    { color: '#2563EB', emoji: '🎉' },
  CULTURAL:  { color: '#7C3AED', emoji: '🎨' },
  WORKSHOP:  { color: '#4F46E5', emoji: '🎓' },
  RELIGIOUS: { color: '#DC2626', emoji: '🙏' },
  MEETING:   { color: '#0891B2', emoji: '💼' },
  COMMUNITY: { color: '#4F46E5', emoji: '🏠' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; emoji: string }> = {
  UPCOMING:  { label: 'Upcoming',  bg: '#EEF2FF', color: '#4F46E5', emoji: '🔜' },
  ONGOING:   { label: 'Live',      bg: '#ECFDF5', color: '#059669', emoji: '🟢' },
  CANCELLED: { label: 'Cancelled', bg: '#FEF2F2', color: '#DC2626', emoji: '❌' },
  COMPLETED: { label: 'Done',      bg: '#F1F5F9', color: '#64748B', emoji: '✅' },
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
    const cfg = TYPE_CONFIG[item.type] ?? { color: COLORS.primary, emoji: '📅' };
    const statusCfg = STATUS_CONFIG[item.status ?? 'UPCOMING'] ?? STATUS_CONFIG.UPCOMING;
    const { day, mon } = formatShortDate(item.startDate);
    const eventIsToday = item.startDate ? isToday(parseISO(item.startDate)) : false;
    const eventIsPast = item.startDate ? isPast(parseISO(item.startDate)) : false;
    const attendees = item.registrationCount ?? item.attendees ?? 0;

    return (
      <TouchableOpacity
        style={[st.card, eventIsPast && item.status !== 'CANCELLED' && st.cardPast]}
        onPress={() => router.push(`/events/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Mini date block */}
        <View style={[st.miniDate, { backgroundColor: cfg.color + '12' }]}>
          <Text style={st.miniDateEmoji}>{cfg.emoji}</Text>
          <Text style={[st.miniDateDay, { color: cfg.color }]}>{day}</Text>
          <Text style={[st.miniDateMon, { color: cfg.color + 'AA' }]}>{mon}</Text>
          {eventIsToday && <View style={[st.miniTodayDot, { backgroundColor: cfg.color }]} />}
        </View>

        {/* Content */}
        <View style={st.cardContent}>
          <View style={st.cardTopRow}>
            <Text style={[st.cardTitle, eventIsPast && st.cardTitlePast]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>

          <View style={st.cardChipRow}>
            {item.status && (
              <View style={[st.statusBadge, { backgroundColor: statusCfg.bg }]}>
                <Text style={st.statusEmoji}>{statusCfg.emoji}</Text>
                <Text style={[st.statusText, { color: statusCfg.color }]}>
                  {statusCfg.label}
                </Text>
              </View>
            )}
          </View>

          <View style={st.cardMetaRow}>
            {(item.venue || item.location) && (
              <>
                <Text style={st.metaEmoji}>📍</Text>
                <Text style={st.cardMetaText} numberOfLines={1}>{item.venue || item.location}</Text>
                <View style={st.metaDot} />
              </>
            )}
            <Text style={st.metaEmoji}>👥</Text>
            <Text style={st.cardMetaText}>{attendees} going</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.navBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerEmoji}>📋</Text>
          <Text style={st.headerTitle}>My Events</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/events/create')} style={st.navBtnAccent} hitSlop={8}>
          <Ionicons name="add" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={st.tabBar}>
        {(['registered', 'created'] as Tab[]).map(t => {
          const active = tab === t;
          const count = t === 'registered' ? registeredEvents.length : createdEvents.length;
          const tabEmoji = t === 'registered' ? '🎟️' : '✍️';
          return (
            <TouchableOpacity
              key={t}
              style={[st.tab, active && st.tabActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text style={st.tabEmoji}>{tabEmoji}</Text>
              <Text style={[st.tabText, active && st.tabTextActive]}>
                {t === 'registered' ? 'Registered' : 'Created'}
              </Text>
              <View style={[st.tabCount, active && st.tabCountActive]}>
                <Text style={[st.tabCountText, active && st.tabCountTextActive]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={st.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => String(item.id)}
          renderItem={renderEvent}
          contentContainerStyle={st.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={st.empty}>
              <View style={st.emptyCircle}>
                <Text style={st.emptyEmoji}>{tab === 'registered' ? '🎟️' : '✍️'}</Text>
              </View>
              <Text style={st.emptyTitle}>No events yet</Text>
              <Text style={st.emptyDesc}>
                {tab === 'registered'
                  ? "Events you register for will show up here."
                  : "Events you create will appear here."}
              </Text>
              {tab === 'created' && (
                <TouchableOpacity style={st.emptyBtnWrap} onPress={() => router.push('/events/create')}>
                  <LinearGradient
                    colors={['#312E81', '#4F46E5']}
                    style={st.emptyBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={st.emptyBtnEmoji}>✍️</Text>
                    <Text style={st.emptyBtnText}>Create Event</Text>
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

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E8F0',
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E8E8F0',
  },
  navBtnAccent: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E0E7FF',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerEmoji: { fontSize: 18 },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.text,
    fontFamily: FONTS.displayBold, letterSpacing: -0.3,
  },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E8E8F0',
    paddingHorizontal: SPACING.lg,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#312E81' },
  tabEmoji: { fontSize: 14 },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted, fontFamily: FONTS.medium },
  tabTextActive: { color: '#312E81', fontWeight: '600', fontFamily: FONTS.semiBold },
  tabCount: {
    backgroundColor: '#F1F5F9', borderRadius: 10,
    minWidth: 22, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountActive: { backgroundColor: '#EEF2FF' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, fontFamily: FONTS.bold },
  tabCountTextActive: { color: '#312E81' },

  // ── List ──
  list: { padding: SPACING.lg, gap: 10, paddingBottom: 20 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Card ──
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: 12,
    borderWidth: 1, borderColor: '#E8E8F0', ...SHADOWS.sm,
  },
  cardPast: { opacity: 0.55 },
  miniDate: {
    width: 52, paddingVertical: 8, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 1,
  },
  miniDateEmoji: { fontSize: 14, marginBottom: 2 },
  miniDateDay: { fontSize: 20, fontWeight: '800', lineHeight: 24, fontFamily: FONTS.displayEB },
  miniDateMon: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  miniTodayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },

  cardContent: { flex: 1, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1, fontFamily: FONTS.displaySemi },
  cardTitlePast: { color: COLORS.textMuted },

  cardChipRow: { flexDirection: 'row', gap: 6 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 2,
  },
  statusEmoji: { fontSize: 9 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.bold },

  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  metaEmoji: { fontSize: 10 },
  cardMetaText: { fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#E8E8F0' },

  // ── Empty ──
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6, fontFamily: FONTS.displayBold },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, fontFamily: FONTS.regular },
  emptyBtnWrap: { marginTop: 16, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.md },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22, paddingVertical: 12 },
  emptyBtnEmoji: { fontSize: 16 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.displayBold },
});
