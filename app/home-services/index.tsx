import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Dimensions,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS } from '@/constants/config';
import { homeServicesService } from '@/services/homeServicesService';

const SCREEN_W = Dimensions.get('window').width;

interface QuickModule {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  badge?: string;
}

const MODULES: QuickModule[] = [
  {
    id: 'find-help',
    title: 'Find Help',
    subtitle: 'Electricians, Plumbers & More',
    route: '/home-services/find-help',
    icon: 'search-outline',
    gradient: ['#4F46E5', '#6366F1'],
    badge: 'Popular',
  },
  {
    id: 'my-help',
    title: 'My Domestic Staff',
    subtitle: 'Maid, Cook, Driver & Nanny',
    route: '/home-services/my-help',
    icon: 'people-outline',
    gradient: ['#0284C7', '#38BDF8'],
  },
  {
    id: 'bookings',
    title: 'Service Bookings',
    subtitle: 'Track Visits & OTP status',
    route: '/home-services/bookings',
    icon: 'calendar-outline',
    gradient: ['#059669', '#34D399'],
  },
  {
    id: 'packages',
    title: 'Salary & Packages',
    subtitle: 'Monthly Staff Retainers',
    route: '/home-services/packages',
    icon: 'wallet-outline',
    gradient: ['#D97706', '#FBBF24'],
  },
  {
    id: 'jobs',
    title: 'Community Job Board',
    subtitle: 'Post Help Requirements',
    route: '/home-services/jobs',
    icon: 'megaphone-outline',
    gradient: ['#7C3AED', '#A78BFA'],
  },
];

const CATEGORIES = [
  { code: 'PLUMBING', name: 'Plumber', icon: 'water-outline' as const, color: '#0284C7', bg: '#E0F2FE' },
  { code: 'ELECTRICAL', name: 'Electrician', icon: 'flash-outline' as const, color: '#D97706', bg: '#FEF3C7' },
  { code: 'CLEANING', name: 'Deep Clean', icon: 'sparkles-outline' as const, color: '#059669', bg: '#DCFCE7' },
  { code: 'APPLIANCE', name: 'Appliance', icon: 'tv-outline' as const, color: '#7C3AED', bg: '#EDE9FE' },
  { code: 'CARPENTRY', name: 'Carpentry', icon: 'hammer-outline' as const, color: '#B45309', bg: '#FEF3C7' },
  { code: 'PAINTING', name: 'Painting', icon: 'color-palette-outline' as const, color: '#DB2777', bg: '#FCE7F3' },
  { code: 'MAID', name: 'Maid/Cook', icon: 'person-outline' as const, color: '#4F46E5', bg: '#EEF2FF' },
  { code: 'PEST_CONTROL', name: 'Pest Control', icon: 'bug-outline' as const, color: '#DC2626', bg: '#FEE2E2' },
];

export default function HomeServicesHubScreen() {
  const router = useRouter();

  const { data: workers = [], isLoading, refetch } = useQuery({
    queryKey: ['home-services-hub-workers'],
    queryFn: () => homeServicesService.getWorkers(),
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ['home-services-hub-bookings'],
    queryFn: () => homeServicesService.getMyBookings(),
  });

  const { data: attSummary } = useQuery({
    queryKey: ['home-services-hub-att-summary'],
    queryFn: () => homeServicesService.getAttendanceSummary(),
  });

  const onRefresh = useCallback(async () => {
    await Promise.allSettled([refetch(), refetchBookings()]);
  }, [refetch, refetchBookings]);

  const activeBooking = useMemo(() => {
    return bookings.find(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS');
  }, [bookings]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Header Banner */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs/feed')}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Home Services Hub</Text>
            <Text style={styles.headerSubtitle}>Verified domestic staff & on-demand experts</Text>
          </View>
          <TouchableOpacity
            style={styles.postJobBtn}
            onPress={() => router.push('/home-services/jobs')}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.postJobBtnText}>Post Need</Text>
          </TouchableOpacity>
        </View>

        {/* Attendance & Staff Quick Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{attSummary?.checkedIn ?? 0}</Text>
            <Text style={styles.statLabel}>Staff In Gate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{workers.length}</Text>
            <Text style={styles.statLabel}>Verified Pros</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: activeBooking ? '#34D399' : '#FFFFFF' }]}>
              {bookings.length}
            </Text>
            <Text style={styles.statLabel}>My Bookings</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Booking Banner */}
        {activeBooking && (
          <TouchableOpacity
            style={styles.activeBookingCard}
            onPress={() => router.push('/home-services/bookings')}
            activeOpacity={0.8}
          >
            <View style={styles.activeBookingBadge}>
              <Ionicons name="time" size={14} color="#059669" />
              <Text style={styles.activeBookingBadgeText}>Active Visit</Text>
            </View>
            <Text style={styles.activeBookingTitle}>{activeBooking.providerName}</Text>
            <Text style={styles.activeBookingSlot}>
              {activeBooking.date} • {activeBooking.timeSlot}
            </Text>
            {activeBooking.completionOtp && (
              <View style={styles.otpPill}>
                <Text style={styles.otpLabel}>Completion OTP:</Text>
                <Text style={styles.otpVal}>{activeBooking.completionOtp}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Modules Grid */}
        <Text style={styles.sectionHeader}>Service Hub Navigation</Text>
        <View style={styles.modulesGrid}>
          {MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.id}
              style={styles.moduleCard}
              onPress={() => router.push(mod.route as any)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={mod.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moduleGradient}
              >
                <View style={styles.moduleIconBox}>
                  <Ionicons name={mod.icon} size={22} color="#FFFFFF" />
                </View>
                {mod.badge && (
                  <View style={styles.moduleBadge}>
                    <Text style={styles.moduleBadgeText}>{mod.badge}</Text>
                  </View>
                )}
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                <Text style={styles.moduleSubtitle}>{mod.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Categories */}
        <View style={styles.catHeaderRow}>
          <Text style={styles.sectionHeader}>Top Categories</Text>
          <TouchableOpacity onPress={() => router.push('/home-services/find-help')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.code}
              style={styles.catBox}
              onPress={() => router.push({ pathname: '/home-services/find-help', params: { category: cat.code } } as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.catIconWrap, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={22} color={cat.color} />
              </View>
              <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Top Rated Specialists */}
        <View style={styles.catHeaderRow}>
          <Text style={styles.sectionHeader}>Featured Professionals</Text>
          <TouchableOpacity onPress={() => router.push('/home-services/find-help')}>
            <Text style={styles.viewAllText}>Browse 20+</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
          {workers.slice(0, 5).map((w) => (
            <TouchableOpacity
              key={String(w.id)}
              style={styles.featuredCard}
              onPress={() => router.push({ pathname: '/home-services/find-help', params: { category: w.category } } as any)}
              activeOpacity={0.8}
            >
              <View style={styles.featuredAvatar}>
                <Text style={styles.featuredAvatarText}>{w.name.charAt(0)}</Text>
              </View>
              <Text style={styles.featuredName} numberOfLines={1}>{w.name}</Text>
              <Text style={styles.featuredSpeciality} numberOfLines={1}>{w.speciality || w.category}</Text>
              <View style={styles.featuredRating}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.featuredRatingText}>{w.rating}</Text>
                <Text style={styles.featuredExpText}>• {w.experience || 'Verified'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#E0E7FF', marginTop: 2 },
  postJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  postJobBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: '#C7D2FE', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  activeBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  activeBookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  activeBookingBadgeText: { color: '#059669', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  activeBookingTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  activeBookingSlot: { fontSize: 13, color: '#64748B', marginTop: 2 },
  otpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  otpLabel: { fontSize: 11, color: '#4F46E5', fontWeight: '600', marginRight: 4 },
  otpVal: { fontSize: 12, color: '#312E81', fontWeight: '800', letterSpacing: 1 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  moduleCard: {
    width: (SCREEN_W - 42) / 2,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  moduleGradient: { padding: 14, minHeight: 115, justifyContent: 'space-between' },
  moduleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  moduleBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  moduleTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  moduleSubtitle: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  catHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  viewAllText: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  catBox: {
    width: (SCREEN_W - 56) / 4,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  catName: { fontSize: 11, fontWeight: '600', color: '#334155' },
  featuredRow: { paddingBottom: 10 },
  featuredCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  featuredAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredAvatarText: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  featuredName: { fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  featuredSpeciality: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 2 },
  featuredRating: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  featuredRatingText: { fontSize: 11, fontWeight: '700', color: '#0F172A', marginLeft: 3 },
  featuredExpText: { fontSize: 10, color: '#94A3B8', marginLeft: 4 },
});
