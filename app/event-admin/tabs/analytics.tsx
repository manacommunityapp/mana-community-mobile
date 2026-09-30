import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { EVENT_ADMIN_COLORS } from '@/constants/eventAdminTheme';
import { eventAdminService, type EventAnalyticsData } from '@/services/eventAdminService';

export default function EventAnalyticsScreen() {
  const [data, setData] = useState<EventAnalyticsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const d = await eventAdminService.getAnalytics();
    setData(d);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!data) return <View style={s.container} />;

  const maxTypeCount = Math.max(...data.eventsByType.map(d => d.count), 1);
  const maxRegCount = Math.max(...data.registrationsByMonth.map(d => d.count), 1);

  const barColors = ['#7C3AED', '#A78BFA', '#4F46E5', '#D97706', '#059669', '#DC2626'];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EVENT_ADMIN_COLORS.accent} />}
      >
        <View style={s.header}>
          <Text style={s.headerTitle}>Analytics</Text>
          <Text style={s.headerSub}>Events overview</Text>
        </View>

        <View style={s.attendanceCard}>
          <Text style={s.attendanceLabel}>Attendance Rate</Text>
          <Text style={s.attendanceValue}>{data.attendanceRate}%</Text>
          <View style={s.attendanceBar}>
            <View style={[s.attendanceFill, { width: `${data.attendanceRate}%` }]} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Events by Type</Text>
          {data.eventsByType.map((item, i) => (
            <View key={item.type} style={s.barRow}>
              <Text style={s.barLabel}>{item.type}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${(item.count / maxTypeCount) * 100}%`, backgroundColor: barColors[i % barColors.length] }]} />
              </View>
              <Text style={s.barValue}>{item.count}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Registrations Trend</Text>
          <View style={s.chartRow}>
            {data.registrationsByMonth.map(item => (
              <View key={item.month} style={s.chartCol}>
                <View style={s.chartBarWrap}>
                  <View style={[s.chartBar, { height: `${(item.count / maxRegCount) * 100}%` }]} />
                </View>
                <Text style={s.chartLabel}>{item.month}</Text>
                <Text style={s.chartValue}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Top Events by Registrations</Text>
          {data.topEvents.map((ev, i) => (
            <View key={ev.name} style={s.topRow}>
              <Text style={s.rankText}>#{i + 1}</Text>
              <Text style={s.topName} numberOfLines={1}>{ev.name}</Text>
              <Text style={s.topValue}>{ev.registrations}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Venue Utilization</Text>
          {data.venueUtilization.map((v, i) => (
            <View key={v.venue} style={s.barRow}>
              <Text style={s.barLabel}>{v.venue}</Text>
              <View style={s.barTrack}>
                <View style={[s.barFill, {
                  width: `${(v.bookings / Math.max(...data.venueUtilization.map(x => x.bookings), 1)) * 100}%`,
                  backgroundColor: barColors[i % barColors.length],
                }]} />
              </View>
              <Text style={s.barValue}>{v.bookings}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  attendanceCard: {
    backgroundColor: EVENT_ADMIN_COLORS.heroBg, marginHorizontal: 12, marginBottom: 10,
    borderRadius: RADIUS.lg, padding: 20, alignItems: 'center',
  },
  attendanceLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  attendanceValue: { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -2, marginVertical: 4 },
  attendanceBar: {
    width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4, overflow: 'hidden', marginTop: 4,
  },
  attendanceFill: { height: 8, backgroundColor: '#fff', borderRadius: 4 },

  section: {
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 10,
    borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  barLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, width: 90 },
  barTrack: { flex: 1, height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { fontSize: 12, fontWeight: '800', color: COLORS.text, width: 24, textAlign: 'right' },

  chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  chartCol: { alignItems: 'center', flex: 1 },
  chartBarWrap: { width: 24, height: 90, justifyContent: 'flex-end' },
  chartBar: { width: 24, backgroundColor: EVENT_ADMIN_COLORS.accent, borderRadius: 4 },
  chartLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginTop: 4 },
  chartValue: { fontSize: 10, fontWeight: '700', color: COLORS.text },

  topRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rankText: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, width: 26 },
  topName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  topValue: { fontSize: 14, fontWeight: '800', color: EVENT_ADMIN_COLORS.accent },
});
