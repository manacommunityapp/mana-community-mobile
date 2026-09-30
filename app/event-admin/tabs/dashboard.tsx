import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { EVENT_ADMIN_COLORS } from '@/constants/eventAdminTheme';
import {
  eventAdminService,
  type EventAdminDashboardStats,
  type EventSummary,
} from '@/services/eventAdminService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface StatCardProps {
  icon: IoniconsName;
  label: string;
  value: string;
  color: string;
  bg: string;
  sub?: string;
}

function StatCard({ icon, label, value, color, bg, sub }: StatCardProps) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

export default function EventAdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EventAdminDashboardStats | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [st, ev] = await Promise.all([
      eventAdminService.getDashboardStats(),
      eventAdminService.getEvents(),
    ]);
    setStats(st);
    setEvents(ev.slice(0, 5));
  };

  useEffect(() => { load(); }, []);

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

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EVENT_ADMIN_COLORS.accent} />}
      >
        <View style={s.welcome}>
          <View>
            <Text style={s.greeting}>Events Dashboard</Text>
            <Text style={s.userName}>{user?.communityName || 'Community'}</Text>
          </View>
          <View style={s.roleBadge}>
            <Ionicons name="calendar" size={14} color={EVENT_ADMIN_COLORS.accent} />
            <Text style={s.roleText}>EVENT ADMIN</Text>
          </View>
        </View>

        <View style={s.statsGrid}>
          <StatCard icon="calendar" label="Total Events" value={String(stats?.totalEvents ?? 0)} color={EVENT_ADMIN_COLORS.accent} bg={EVENT_ADMIN_COLORS.accentLight} sub={`${stats?.publishedEvents ?? 0} published`} />
          <StatCard icon="time" label="Upcoming" value={String(stats?.upcomingEvents ?? 0)} color="#4F46E5" bg="#EEF2FF" sub="scheduled" />
          <StatCard icon="ticket" label="Registrations" value={String(stats?.totalRegistrations ?? 0)} color="#D97706" bg="#FEF3C7" sub="total" />
          <StatCard icon="location" label="Venues" value={String(stats?.totalVenues ?? 0)} color="#059669" bg="#D1FAE5" sub="available" />
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Events</Text>
          <TouchableOpacity><Text style={s.seeAll}>See All</Text></TouchableOpacity>
        </View>
        {events.map(ev => {
          const meta = statusMeta[ev.status] || statusMeta.DRAFT;
          const icon = typeIcons[ev.type] || 'calendar-outline';
          return (
            <View key={ev.id} style={s.eventCard}>
              <View style={[s.eventIcon, { backgroundColor: EVENT_ADMIN_COLORS.accentLight }]}>
                <Ionicons name={icon} size={18} color={EVENT_ADMIN_COLORS.accent} />
              </View>
              <View style={s.eventBody}>
                <Text style={s.eventTitle} numberOfLines={1}>{ev.title}</Text>
                <Text style={s.eventMeta}>
                  {formatDate(ev.startDate)} · {ev.venue || 'TBD'}
                </Text>
                <Text style={s.eventMeta}>
                  {ev.registrationCount}{ev.maxAttendees ? `/${ev.maxAttendees}` : ''} registered · {ev.priceType}
                </Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
                <Text style={[s.statusText, { color: meta.color }]}>{ev.status}</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  welcome: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: EVENT_ADMIN_COLORS.accentLight, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: EVENT_ADMIN_COLORS.accentMid,
  },
  roleText: { fontSize: 11, fontWeight: '800', color: EVENT_ADMIN_COLORS.accentDark },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 12, marginBottom: 4,
  },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },
  statSub: { fontSize: 10, color: COLORS.textMuted },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2 },
  seeAll: { fontSize: 12, fontWeight: '600', color: EVENT_ADMIN_COLORS.accent },

  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 6,
    borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventBody: { flex: 1, gap: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  eventMeta: { fontSize: 11, color: COLORS.textMuted },
  statusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 9, fontWeight: '800' },
});
