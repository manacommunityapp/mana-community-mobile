import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, BackHandler, StatusBar,
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
  iconBg:      string;
  route:       string;
  enabled:     boolean;
  comingSoon?: boolean;
}

const SERVICES: ServiceCard[] = [
  {
    type:     'CARPOOL',
    icon:     'people',
    label:    'Community Carpool',
    sublabel: 'Share rides with neighbors',
    color:    '#4F46E5',
    bg:       '#EEF2FF',
    iconBg:   '#E0E7FF',
    route:    '/mobility/carpool',
    enabled:  true,
  },
  {
    type:     'CARPOOL',
    icon:     'airplane',
    label:    'Airport Rides',
    sublabel: 'Share airport trips with neighbours',
    color:    '#2563EB',
    bg:       '#EFF6FF',
    iconBg:   '#DBEAFE',
    route:    '/mobility/airport-rides',
    enabled:  true,
  },
  {
    type:     'GROUP_RIDE',
    icon:     'bus',
    label:    'Group Ride',
    sublabel: 'Scheduled event transport',
    color:    '#059669',
    bg:       '#ECFDF5',
    iconBg:   '#D1FAE5',
    route:    '/mobility/book?type=GROUP_RIDE',
    enabled:  true,
  },
  {
    type:       'BIKE',
    icon:       'bicycle',
    label:      'Bike',
    sublabel:   'Fastest solo rides',
    color:      '#D97706',
    bg:         '#FFFBEB',
    iconBg:     '#FEF3C7',
    route:      '/mobility/book?type=BIKE',
    enabled:    ONDEMAND_ENABLED,
    comingSoon: !ONDEMAND_ENABLED,
  },
  {
    type:       'AUTO',
    icon:       'car-sport',
    label:      'Auto',
    sublabel:   'Quick & pocket-friendly',
    color:      '#0891B2',
    bg:         '#ECFEFF',
    iconBg:     '#CFFAFE',
    route:      '/mobility/book?type=AUTO',
    enabled:    ONDEMAND_ENABLED,
    comingSoon: !ONDEMAND_ENABLED,
  },
  {
    type:       'CAB',
    icon:       'car',
    label:      'Cab',
    sublabel:   'Comfortable AC ride',
    color:      '#7C3AED',
    bg:         '#F5F3FF',
    iconBg:     '#EDE9FE',
    route:      '/mobility/book?type=CAB',
    enabled:    ONDEMAND_ENABLED,
    comingSoon: !ONDEMAND_ENABLED,
  },
];

const QUICK_ACTIONS = [
  {
    icon: 'time' as const,
    label: 'Trip History',
    sublabel: 'View past rides',
    color: '#3B82F6',
    bg: '#EFF6FF',
    route: '/mobility/history',
  },
  {
    icon: 'car-sport' as const,
    label: 'Driver Mode',
    sublabel: 'Earn with community',
    color: '#059669',
    bg: '#ECFDF5',
    route: '/mobility/driver',
  },
  {
    icon: 'people' as const,
    label: 'Carpool Hub',
    sublabel: 'Find & offer rides',
    color: '#4F46E5',
    bg: '#EEF2FF',
    route: '/mobility/carpool',
  },
  {
    icon: 'shield-checkmark' as const,
    label: 'Ops Portal',
    sublabel: 'Admin dispatch',
    color: '#D97706',
    bg: '#FFFBEB',
    route: '/mobility/ops',
  },
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

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── Hero Header ────────────────────────────────────────── */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.heroTop}>
          <TouchableOpacity onPress={goHome} hitSlop={12} style={s.heroIconBtn} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={s.heroCenter}>
            <View style={s.titleBadge}>
              <Ionicons name="navigate" size={13} color="#60A5FA" />
              <Text style={s.titleBadgeText}>Mana Transit</Text>
            </View>
            <Text style={s.heroTitle}>Mana Mobility</Text>
          </View>
          <TouchableOpacity
            style={s.heroIconBtn}
            onPress={() => router.push('/mobility/history' as any)}
            hitSlop={12}
            accessibilityLabel="Trip History"
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 1-Tap Booking Search Launcher */}
        <TouchableOpacity
          style={s.searchLauncher}
          onPress={() => router.push('/mobility/book' as any)}
          activeOpacity={0.9}
        >
          <View style={s.searchIconWrap}>
            <Ionicons name="search" size={18} color="#2563EB" />
          </View>
          <View style={s.searchPlaceholderWrap}>
            <Text style={s.searchPlaceholderTitle}>Where are you heading?</Text>
            <Text style={s.searchPlaceholderSub}>Book or share a ride in your community</Text>
          </View>
          <View style={s.searchGoChip}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ── Active Trip Banner ───────────────────────────────── */}
        {activeTrip && (
          <TouchableOpacity
            style={s.activeBanner}
            onPress={() => router.push(`/mobility/track/${activeTrip.id}` as any)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#1E293B', '#0F172A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.activeBannerInner}
            >
              <View style={s.activeDotRing}>
                <View style={s.activeDot} />
              </View>
              <View style={s.activeInfo}>
                <View style={s.activeTitleRow}>
                  <Text style={s.activeBannerTitle}>Ride in Progress</Text>
                  <View style={s.liveChip}>
                    <Text style={s.liveChipText}>LIVE</Text>
                  </View>
                </View>
                <Text style={s.activeBannerSub} numberOfLines={1}>
                  {activeTrip.destination.address || 'En route to destination'}
                </Text>
              </View>
              <View style={s.trackBtn}>
                <Text style={s.trackBtnText}>Track</Text>
                <Ionicons name="chevron-forward" size={13} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Stats Bar ────────────────────────────────────────── */}
        {stats && !loadingStats && (
          <View style={s.statsCard}>
            <View style={s.statCol}>
              <View style={[s.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-done" size={16} color="#059669" />
              </View>
              <Text style={s.statNum}>{stats.completedTrips ?? 0}</Text>
              <Text style={s.statLabel}>Completed</Text>
            </View>

            <View style={s.statDivider} />

            <View style={s.statCol}>
              <View style={[s.statIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="wallet-outline" size={16} color="#4F46E5" />
              </View>
              <Text style={s.statNum}>₹{(Number(stats.totalSpent) || 0).toFixed(0)}</Text>
              <Text style={s.statLabel}>Total Spent</Text>
            </View>

            <View style={s.statDivider} />

            <View style={s.statCol}>
              <View style={[s.statIconWrap, { backgroundColor: '#FEF2F2' }]}>
                <Ionicons name="close" size={16} color="#EF4444" />
              </View>
              <Text style={s.statNum}>{stats.cancelledTrips ?? 0}</Text>
              <Text style={s.statLabel}>Cancelled</Text>
            </View>
          </View>
        )}

        {/* ── Services Grid ────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Choose Your Ride</Text>
            <Text style={s.sectionSubtitle}>Reliable, verified community transport</Text>
          </View>

          <View style={s.servicesGrid}>
            {SERVICES.map((svc) => (
              <TouchableOpacity
                key={svc.type}
                style={[
                  s.svcCard,
                  { backgroundColor: svc.bg },
                  !svc.enabled && s.svcCardDisabled,
                ]}
                onPress={() => svc.enabled && router.push(svc.route as any)}
                activeOpacity={svc.enabled ? 0.8 : 1}
              >
                {svc.comingSoon && (
                  <View style={s.soonBadge}>
                    <Text style={s.soonText}>SOON</Text>
                  </View>
                )}

                <View style={[s.svcIconCircle, { backgroundColor: svc.iconBg }]}>
                  <Ionicons name={svc.icon} size={24} color={svc.color} />
                </View>

                <View style={s.svcMeta}>
                  <Text style={[s.svcLabel, { color: svc.color }]}>{svc.label}</Text>
                  <Text style={s.svcSublabel} numberOfLines={2}>{svc.sublabel}</Text>
                </View>

                <View style={s.svcBottom}>
                  <Text style={[s.svcActionText, { color: svc.color }]}>
                    {svc.enabled ? 'Book now' : 'Waitlist'}
                  </Text>
                  <Ionicons
                    name={svc.enabled ? 'arrow-forward-circle' : 'time-outline'}
                    size={16}
                    color={svc.color}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Quick Action Shortcuts ───────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Shortcuts</Text>
          <View style={s.quickGrid}>
            {QUICK_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={s.quickCard}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.82}
              >
                <View style={[s.quickIconWrap, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={s.quickTextWrap}>
                  <Text style={s.quickTitle}>{item.label}</Text>
                  <Text style={s.quickSub}>{item.sublabel}</Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Community Safety & Compliance ───────────────────── */}
        <View style={s.safetyCard}>
          <View style={s.safetyIconWrap}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
          </View>
          <View style={s.safetyTextWrap}>
            <Text style={s.safetyTitle}>Verified Community Transport</Text>
            <Text style={s.safetyDesc}>
              Carpools and group rides are restricted to verified residents. On-demand rides will activate upon regional fleet approvals.
            </Text>
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Hero Header ─────────────────────────────────────────────
  hero: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroCenter: {
    alignItems: 'center',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: 3,
  },
  titleBadgeText: {
    fontSize: 10.5,
    fontFamily: FONTS.semiBold,
    color: '#93C5FD',
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontSize: 19,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  // ── 1-Tap Search Launcher ──────────────────────────────────
  searchLauncher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    ...SHADOWS.card,
  },
  searchIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholderWrap: {
    flex: 1,
  },
  searchPlaceholderTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  searchPlaceholderSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  searchGoChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    padding: 16,
    gap: 16,
  },

  // ── Active Banner ──────────────────────────────────────────
  activeBanner: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  activeBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.xl,
  },
  activeDotRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  activeInfo: {
    flex: 1,
  },
  activeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeBannerTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  liveChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveChipText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#34D399',
    letterSpacing: 0.5,
  },
  activeBannerSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  trackBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },

  // ── Stats Bar ──────────────────────────────────────────────
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statNum: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },

  // ── Section ────────────────────────────────────────────────
  section: {
    gap: 12,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },

  // ── Services Grid ──────────────────────────────────────────
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  svcCard: {
    width: '48%',
    borderRadius: RADIUS.xl,
    padding: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    position: 'relative',
    ...SHADOWS.sm,
  },
  svcCardDisabled: {
    opacity: 0.72,
  },
  soonBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  soonText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#D97706',
    letterSpacing: 0.5,
  },
  svcIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svcMeta: {
    gap: 3,
    minHeight: 44,
  },
  svcLabel: {
    fontSize: 14.5,
    fontFamily: FONTS.bold,
  },
  svcSublabel: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  svcBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  svcActionText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
  },

  // ── Quick Grid ─────────────────────────────────────────────
  quickGrid: {
    gap: 10,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextWrap: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  quickSub: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 1,
  },

  // ── Safety Card ────────────────────────────────────
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  safetyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  safetyTextWrap: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#166534',
  },
  safetyDesc: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    color: '#15803D',
    lineHeight: 17,
    marginTop: 2,
  },
});
