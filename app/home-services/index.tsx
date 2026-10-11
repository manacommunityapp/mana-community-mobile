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
import { COLORS, SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService } from '@/services/homeServicesService';
import { SubscriptionModal } from '@/components/home-services/SubscriptionModal';

const SCREEN_W = Dimensions.get('window').width;

interface QuickModule {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  emoji: string;
  gradient: [string, string];
  badge?: string;
}

const MODULES: QuickModule[] = [
  {
    id: 'find-help',
    title: 'Find Help',
    subtitle: 'Electricians, Plumbers & More',
    route: '/home-services/find-help',
    emoji: '🔍',
    gradient: ['#4F46E5', '#6366F1'],
    badge: '⚡ Popular',
  },
  {
    id: 'my-help',
    title: 'My Domestic Staff',
    subtitle: 'Maid, Cook, Driver & Nanny',
    route: '/home-services/my-help',
    emoji: '👥',
    gradient: ['#0284C7', '#38BDF8'],
  },
  {
    id: 'bookings',
    title: 'Service Bookings',
    subtitle: 'Track Visits & OTP status',
    route: '/home-services/bookings',
    emoji: '📅',
    gradient: ['#059669', '#34D399'],
  },
  {
    id: 'packages',
    title: 'Salary & Packages',
    subtitle: 'Monthly Staff Retainers',
    route: '/home-services/packages',
    emoji: '💰',
    gradient: ['#D97706', '#FBBF24'],
  },
  {
    id: 'jobs',
    title: 'Community Job Board',
    subtitle: 'Post Help Requirements',
    route: '/home-services/jobs',
    emoji: '📢',
    gradient: ['#7C3AED', '#A78BFA'],
  },
  {
    id: 'provider-deck',
    title: 'Provider Job Deck',
    subtitle: 'PIN Verify & Photo Proof',
    route: '/home-services/provider-deck',
    emoji: '🛠️',
    gradient: ['#0F172A', '#334155'],
    badge: '🔒 Staff',
  },
];

const CATEGORIES = [
  { code: 'PLUMBING', name: 'Plumber', emoji: '🔧', color: '#0284C7', bg: '#E0F2FE' },
  { code: 'ELECTRICAL', name: 'Electrician', emoji: '⚡', color: '#D97706', bg: '#FEF3C7' },
  { code: 'CLEANING', name: 'Deep Clean', emoji: '✨', color: '#059669', bg: '#DCFCE7' },
  { code: 'APPLIANCE', name: 'Appliance', emoji: '📺', color: '#7C3AED', bg: '#EDE9FE' },
  { code: 'CARPENTRY', name: 'Carpentry', emoji: '🪚', color: '#B45309', bg: '#FEF3C7' },
  { code: 'PAINTING', name: 'Painting', emoji: '🎨', color: '#DB2777', bg: '#FCE7F3' },
  { code: 'MAID', name: 'Maid/Cook', emoji: '👩‍🍳', color: '#4F46E5', bg: '#EEF2FF' },
  { code: 'PEST_CONTROL', name: 'Pest Control', emoji: '🐛', color: '#DC2626', bg: '#FEE2E2' },
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

  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [subscriptionPreset, setSubscriptionPreset] = useState<'CAR_WASH' | 'IRONING' | 'MAID'>('CAR_WASH');

  const activeBooking = useMemo(() => {
    return bookings.find(b => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS');
  }, [bookings]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4F46E5', '#6366F1']}
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
            <Text style={styles.headerTitle}>🏠 Home Services</Text>
            <Text style={styles.headerSubtitle}>Verified staff & on-demand experts</Text>
          </View>
          <TouchableOpacity
            style={styles.postJobBtn}
            onPress={() => router.push('/home-services/jobs')}
          >
            <Text style={styles.postJobBtnText}>➕ Post</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <View style={styles.statEmojiHalo}>
              <Text style={styles.statEmoji}>🚪</Text>
            </View>
            <Text style={styles.statNumber}>{attSummary?.checkedIn ?? 0}</Text>
            <Text style={styles.statLabel}>In Gate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statEmojiHalo}>
              <Text style={styles.statEmoji}>✅</Text>
            </View>
            <Text style={styles.statNumber}>{workers.length}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.statEmojiHalo}>
              <Text style={styles.statEmoji}>📋</Text>
            </View>
            <Text style={[styles.statNumber, activeBooking ? { color: '#34D399' } : undefined]}>
              {bookings.length}
            </Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {activeBooking && (
          <TouchableOpacity
            style={styles.activeBookingCard}
            onPress={() => router.push('/home-services/bookings')}
            activeOpacity={0.8}
          >
            <View style={styles.activeBookingAccent} />
            <View style={styles.activeBookingInner}>
              <View style={styles.activeBookingBadge}>
                <Text style={styles.activeBookingBadgeEmoji}>🟢</Text>
                <Text style={styles.activeBookingBadgeText}>Active Visit</Text>
              </View>
              <Text style={styles.activeBookingTitle}>{activeBooking.providerName}</Text>
              <Text style={styles.activeBookingSlot}>
                📅 {activeBooking.date} • 🕐 {activeBooking.timeSlot}
              </Text>
              {activeBooking.completionOtp && (
                <View style={styles.otpPill}>
                  <Text style={styles.otpLabel}>🔑 OTP:</Text>
                  <Text style={styles.otpVal}>{activeBooking.completionOtp}</Text>
                </View>
              )}
            </View>
            <View style={styles.activeBookingArrow}>
              <Ionicons name="chevron-forward" size={18} color="#4F46E5" />
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionHeader}>🧭 Service Hub</Text>
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
                  <Text style={styles.moduleEmoji}>{mod.emoji}</Text>
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

        <View style={styles.catHeaderRow}>
          <Text style={styles.sectionHeader}>🏷️ Top Categories</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => router.push('/home-services/find-help')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
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
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
              </View>
              <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.catHeaderRow}>
          <Text style={styles.sectionHeader}>⭐ Featured Pros</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => router.push('/home-services/find-help')}
          >
            <Text style={styles.viewAllText}>Browse 20+</Text>
            <Ionicons name="chevron-forward" size={14} color="#4F46E5" />
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
              <View style={styles.featuredCardAccent} />
              <View style={styles.featuredAvatar}>
                <Text style={styles.featuredAvatarText}>{w.name.charAt(0)}</Text>
              </View>
              <Text style={styles.featuredName} numberOfLines={1}>{w.name}</Text>
              <Text style={styles.featuredSpeciality} numberOfLines={1}>{w.speciality || w.category}</Text>
              <View style={styles.featuredRating}>
                <Text style={styles.featuredRatingStar}>⭐</Text>
                <Text style={styles.featuredRatingText}>{w.rating}</Text>
                <Text style={styles.featuredExpText}>• {w.experience || 'Verified'}</Text>
              </View>
              {w.verified && (
                <View style={styles.featuredVerified}>
                  <Text style={styles.featuredVerifiedText}>✅ Verified</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.catHeaderRow}>
          <Text style={styles.sectionHeader}>🔄 Doorstep Subscriptions</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
          <TouchableOpacity
            style={styles.subCard}
            onPress={() => {
              setSubscriptionPreset('CAR_WASH');
              setSubscriptionModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['#1E1B4B', '#312E81']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subCardGradient}
            >
              <Text style={styles.subCardEmoji}>🚗</Text>
              <Text style={styles.subCardTitle}>Doorstep Car Wash</Text>
              <Text style={styles.subCardDesc}>6 days/wk basement clean</Text>
              <View style={styles.subCardPriceRow}>
                <Text style={styles.subCardPrice}>₹899</Text>
                <Text style={styles.subCardPer}>/mo</Text>
              </View>
              <View style={styles.subCardBadge}>
                <Text style={styles.subCardBadgeText}>🛡️ Replace Guarantee</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subCard}
            onPress={() => {
              setSubscriptionPreset('IRONING');
              setSubscriptionModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['#3B0764', '#581C87']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subCardGradient}
            >
              <Text style={styles.subCardEmoji}>👔</Text>
              <Text style={styles.subCardTitle}>Daily Steam Iron</Text>
              <Text style={styles.subCardDesc}>Doorstep pickup & delivery</Text>
              <View style={styles.subCardPriceRow}>
                <Text style={styles.subCardPrice}>₹799</Text>
                <Text style={styles.subCardPer}>/mo</Text>
              </View>
              <View style={styles.subCardBadge}>
                <Text style={styles.subCardBadgeText}>⏰ Morning Pickup</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subCard}
            onPress={() => {
              setSubscriptionPreset('MAID');
              setSubscriptionModalVisible(true);
            }}
          >
            <LinearGradient
              colors={['#064E3B', '#047857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.subCardGradient}
            >
              <Text style={styles.subCardEmoji}>🧹</Text>
              <Text style={styles.subCardTitle}>House Maid Plan</Text>
              <Text style={styles.subCardDesc}>Daily cleaning & mopping</Text>
              <View style={styles.subCardPriceRow}>
                <Text style={styles.subCardPrice}>₹3,500</Text>
                <Text style={styles.subCardPer}>/mo</Text>
              </View>
              <View style={styles.subCardBadge}>
                <Text style={styles.subCardBadgeText}>👩‍🍳 Cook Add-on</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        <View style={{ height: 20 }} />
      </ScrollView>

      <SubscriptionModal
        visible={subscriptionModalVisible}
        initialType={subscriptionPreset}
        onClose={() => setSubscriptionModalVisible(false)}
        onSuccess={() => refetchBookings()}
      />
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONTS.displayEB,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#C7D2FE',
    marginTop: 2,
  },
  postJobBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  postJobBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.bold,
  },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statEmojiHalo: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  statEmoji: { fontSize: 14 },
  statNumber: {
    fontSize: 20,
    fontFamily: FONTS.displayEB,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#C7D2FE',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  activeBookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  activeBookingAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#10B981',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  activeBookingInner: { flex: 1, padding: 14 },
  activeBookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeBookingBadgeEmoji: { fontSize: 10, marginRight: 4 },
  activeBookingBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  activeBookingTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: '#0F172A',
  },
  activeBookingSlot: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#64748B',
    marginTop: 3,
  },
  activeBookingArrow: {
    paddingRight: 14,
  },
  otpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  otpLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: '#4F46E5',
    marginRight: 4,
  },
  otpVal: {
    fontSize: 13,
    fontFamily: FONTS.displayEB,
    color: '#312E81',
    letterSpacing: 2,
  },

  sectionHeader: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: '#0F172A',
    marginBottom: 12,
  },

  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  moduleCard: {
    width: (SCREEN_W - 42) / 2,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  moduleGradient: {
    padding: 14,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  moduleIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleEmoji: { fontSize: 20 },
  moduleBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  moduleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: FONTS.bold,
  },
  moduleTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
  },
  moduleSubtitle: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  catHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  viewAllText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#4F46E5',
    marginRight: 2,
  },

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
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  catIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  catEmoji: { fontSize: 22 },
  catName: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: '#334155',
  },

  featuredRow: { paddingBottom: 12 },
  featuredCard: {
    width: 148,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  featuredCardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  featuredAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredAvatarText: {
    fontSize: 20,
    fontFamily: FONTS.displayEB,
    color: '#4F46E5',
  },
  featuredName: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#0F172A',
    textAlign: 'center',
  },
  featuredSpeciality: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  featuredRatingStar: { fontSize: 12 },
  featuredRatingText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#0F172A',
    marginLeft: 3,
  },
  featuredExpText: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: '#94A3B8',
    marginLeft: 4,
  },
  featuredVerified: {
    marginTop: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  featuredVerifiedText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#059669',
  },

  subCard: {
    width: 160,
    borderRadius: 18,
    marginRight: 10,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  subCardGradient: {
    padding: 14,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  subCardEmoji: { fontSize: 28, marginBottom: 6 },
  subCardTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: '#FFFFFF',
  },
  subCardDesc: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  subCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  subCardPrice: {
    fontSize: 18,
    fontFamily: FONTS.displayEB,
    color: '#34D399',
  },
  subCardPer: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#A7F3D0',
    marginLeft: 2,
  },
  subCardBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  subCardBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});
