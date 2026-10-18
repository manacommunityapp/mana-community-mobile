import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { mobilityPassengerService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityServiceType } from '@/types/mobility';

// ── Feature flags — set to true once backend is ready ─────────────
const ONDEMAND_ENABLED = false;

interface ServiceCard {
  type:        MobilityServiceType;
  icon:        keyof typeof Ionicons.glyphMap;
  label:       string;
  sublabel:    string;
  color:       string;
  bg:          string;
  route:       string;
  enabled:     boolean;
  comingSoon?: boolean;
}

const SERVICES: ServiceCard[] = [
  {
    type:    'CARPOOL',
    icon:    'people',
    label:   'Community Carpool',
    sublabel: 'Share rides with neighbors',
    color:   '#4F46E5',
    bg:      '#EEF2FF',
    route:   '/mobility/carpool',
    enabled: true,
  },
  {
    type:    'GROUP_RIDE',
    icon:    'bus',
    label:   'Group Ride',
    sublabel: 'Scheduled event transport',
    color:   '#059669',
    bg:      '#ECFDF5',
    route:   '/mobility/book?type=GROUP_RIDE',
    enabled: true,
  },
  {
    type:       'BIKE',
    icon:       'bicycle',
    label:      'Bike',
    sublabel:   'Quick two-wheeler rides',
    color:      '#D97706',
    bg:         '#FFFBEB',
    route:      '/mobility/book?type=BIKE',
    enabled:    ONDEMAND_ENABLED,
    comingSoon: !ONDEMAND_ENABLED,
  },
  {
    type:       'AUTO',
    icon:       'car-sport',
    label:      'Auto',
    sublabel:   'Affordable auto-rickshaw',
    color:      '#0891B2',
    bg:         '#ECFEFF',
    route:      '/mobility/book?type=AUTO',
    enabled:    ONDEMAND_ENABLED,
    comingSoon: !ONDEMAND_ENABLED,
  },
  {
    type:       'CAB',
    icon:       'car',
    label:      'Cab',
    sublabel:   'Comfortable AC cab',
    color:      '#7C3AED',
    bg:         '#F5F3FF',
    route:      '/mobility/book?type=CAB',
    enabled:    ONDEMAND_ENABLED,
    comingSoon: !ONDEMAND_ENABLED,
  },
];

const QUICK_LINKS = [
  { icon: 'time-outline' as const,       label: 'History',  route: '/mobility/history' },
  { icon: 'car-outline' as const,        label: 'Drive',    route: '/mobility/driver' },
  { icon: 'shield-checkmark-outline' as const, label: 'Ops', route: '/mobility/ops' },
];

export default function MobilityHubScreen() {
  const router = useRouter();

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goHome(); return true; });
      return () => sub.remove();
    }, [goHome]),
  );

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['mobility-stats'],
    queryFn:  mobilityPassengerService.getStats,
  });

  const { data: activeTrip, isLoading: loadingActive, refetch, isRefetching } = useQuery({
    queryKey: ['mobility-active-trip'],
    queryFn:  mobilityPassengerService.getActiveTrip,
    refetchInterval: 15_000,
  });

  const loading = loadingStats || loadingActive;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#1E3A5F', '#2563EB', '#3B82F6']} style={s.header}>
        <TouchableOpacity onPress={goHome} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Mana Mobility</Text>
          <Text style={s.headerSubtitle}>Your community transport hub</Text>
        </View>
        <TouchableOpacity
          style={s.historyBtn}
          onPress={() => router.push('/mobility/history' as any)}
          hitSlop={8}
        >
          <Ionicons name="time-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Active trip banner */}
        {activeTrip && (
          <TouchableOpacity
            style={s.activeBanner}
            onPress={() => router.push(`/mobility/track/${activeTrip.id}` as any)}
            activeOpacity={0.85}
          >
            <View style={s.activeBannerLeft}>
              <View style={s.activeDot} />
              <View>
                <Text style={s.activeBannerTitle}>Trip in progress</Text>
                <Text style={s.activeBannerSub} numberOfLines={1}>{activeTrip.destination.address}</Text>
              </View>
            </View>
            <View style={s.trackBtn}>
              <Text style={s.trackBtnText}>Track</Text>
              <Ionicons name="chevron-forward" size={13} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Stats */}
        {stats && !loadingStats && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={s.statNum}>{stats.completedTrips}</Text>
              <Text style={s.statLabel}>Trips</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="wallet" size={18} color="#4F46E5" />
              <Text style={s.statNum}>₹{stats.totalSpent.toFixed(0)}</Text>
              <Text style={s.statLabel}>Spent</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="close-circle" size={18} color="#EF4444" />
              <Text style={s.statNum}>{stats.cancelledTrips}</Text>
              <Text style={s.statLabel}>Cancelled</Text>
            </View>
          </View>
        )}

        {/* Services */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Choose your ride</Text>
          <View style={s.servicesGrid}>
            {SERVICES.map((svc) => (
              <TouchableOpacity
                key={svc.type}
                style={[s.svcCard, { backgroundColor: svc.bg }, !svc.enabled && s.svcCardDisabled]}
                onPress={() => svc.enabled && router.push(svc.route as any)}
                activeOpacity={svc.enabled ? 0.8 : 1}
              >
                <View style={[s.svcIconCircle, { backgroundColor: svc.color + '22' }]}>
                  <Ionicons name={svc.icon} size={22} color={svc.color} />
                </View>
                <Text style={[s.svcLabel, { color: svc.color }]}>{svc.label}</Text>
                <Text style={s.svcSublabel}>{svc.sublabel}</Text>
                {svc.comingSoon && (
                  <View style={s.soonBadge}>
                    <Text style={s.soonText}>Soon</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick links */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick links</Text>
          <View style={s.quickRow}>
            {QUICK_LINKS.map((q) => (
              <TouchableOpacity
                key={q.label}
                style={s.quickChip}
                onPress={() => router.push(q.route as any)}
                activeOpacity={0.8}
              >
                <Ionicons name={q.icon} size={16} color={COLORS.primary} />
                <Text style={s.quickChipLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Compliance notice */}
        {ONDEMAND_ENABLED === false && (
          <View style={s.noticeCard}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
            <Text style={s.noticeText}>
              On-demand rides (Bike, Auto, Cab) will be available after regulatory approvals. Community
              Carpool and Group Rides are active now.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },

  header:           {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 14, gap: 12,
  },
  backBtn:          {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  historyBtn:       {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter:     { flex: 1 },
  headerTitle:      { fontSize: 18, fontFamily: FONTS.displayBold, color: '#fff', letterSpacing: -0.3 },
  headerSubtitle:   { fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 1, fontFamily: FONTS.medium },

  scroll:           { padding: 14, gap: 16 },

  activeBanner:     {
    backgroundColor: '#0F172A', borderRadius: RADIUS.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...SHADOWS.md,
  },
  activeBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  activeDot:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  activeBannerTitle:{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  activeBannerSub:  { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: FONTS.regular, marginTop: 2 },
  trackBtn:         {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2563EB', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  trackBtnText:     { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

  statsRow:         { flexDirection: 'row', gap: 10 },
  statCard:         {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  statNum:          { fontSize: 18, fontFamily: FONTS.displayBold, color: COLORS.text },
  statLabel:        { fontSize: 10.5, color: COLORS.textMuted, fontFamily: FONTS.semiBold },

  section:          { gap: 10 },
  sectionTitle:     { fontSize: 16, fontFamily: FONTS.displayBold, color: COLORS.text },

  servicesGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  svcCard:          {
    width: '47%', borderRadius: RADIUS.lg, padding: 14, gap: 6,
    borderWidth: 1, borderColor: COLORS.border, position: 'relative',
    ...SHADOWS.sm,
  },
  svcCardDisabled:  { opacity: 0.65 },
  svcIconCircle:    {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  svcLabel:         { fontSize: 14, fontFamily: FONTS.bold },
  svcSublabel:      { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular },
  soonBadge:        {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: COLORS.warning + '22', borderRadius: RADIUS.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  soonText:         { fontSize: 9, color: COLORS.warning, fontFamily: FONTS.bold },

  quickRow:         { flexDirection: 'row', gap: 10 },
  quickChip:        {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
    justifyContent: 'center',
  },
  quickChipLabel:   { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.primary },

  noticeCard:       {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    borderWidth: 1, borderColor: COLORS.border,
  },
  noticeText:       { flex: 1, fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.regular, lineHeight: 18 },
});
