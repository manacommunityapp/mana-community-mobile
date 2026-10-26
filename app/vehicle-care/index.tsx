import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { COLORS, FONTS, SHADOWS } from '@/constants/config';
import {
  vehicleCareService,
  ServiceCatalogItem,
  WashPlan,
  VehicleCareBooking,
} from '@/services/vehicleCareService';

const SCREEN_W = Dimensions.get('window').width;

const QUICK_ACTIONS = [
  { id: 'book', label: 'Book a Wash', emoji: '📅', route: '/vehicle-care/book', color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'bookings', label: 'My Bookings', emoji: '🗂️', route: '/vehicle-care/my-bookings', color: '#059669', bg: '#ECFDF5' },
  { id: 'plans', label: 'Wash Plans', emoji: '🔄', route: '/vehicle-care/plans', color: '#D97706', bg: '#FFFBEB' },
  { id: 'vehicles', label: 'My Vehicles', emoji: '🚗', route: '/vehicle-care/vehicles', color: '#7C3AED', bg: '#EDE9FE' },
];

function ServiceCard({ item, onPress }: { item: ServiceCatalogItem; onPress: () => void }) {
  const savings = item.basePrice - item.communityPrice;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.serviceCard}>
      <LinearGradient colors={item.gradientColors} style={styles.serviceGradient}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceEmoji}>{item.emoji}</Text>
          {item.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>⭐ Popular</Text>
            </View>
          )}
        </View>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.servicePriceRow}>
          <View>
            <Text style={styles.communityPrice}>₹{item.communityPrice}</Text>
            <Text style={styles.basePrice}>₹{item.basePrice}</Text>
          </View>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save ₹{savings}</Text>
          </View>
        </View>
        <Text style={styles.duration}>⏱ {item.durationMins} min</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function ActivePlanBanner({ plan }: { plan: WashPlan }) {
  const creditsLeft = plan.creditsTotal - plan.creditsUsed;
  return (
    <LinearGradient colors={['#059669', '#10B981']} style={styles.planBanner}>
      <Ionicons name="refresh-circle" size={24} color="#fff" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.planBannerTitle}>{plan.name}</Text>
        <Text style={styles.planBannerSub}>
          {creditsLeft} wash{creditsLeft !== 1 ? 'es' : ''} remaining • {plan.vehicleDisplay}
        </Text>
      </View>
      <View style={styles.creditsBubble}>
        <Text style={styles.creditsNum}>{creditsLeft}</Text>
        <Text style={styles.creditsLabel}>left</Text>
      </View>
    </LinearGradient>
  );
}

function UpcomingBookingBanner({ booking }: { booking: VehicleCareBooking }) {
  return (
    <LinearGradient colors={['#4F46E5', '#6366F1']} style={styles.upcomingBanner}>
      <Text style={styles.upcomingEmoji}>{booking.serviceEmoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.upcomingTitle}>{booking.serviceName}</Text>
        <Text style={styles.upcomingSub}>
          {booking.date} at {booking.startTime} • {booking.vehicleDisplay.split('•')[0].trim()}
        </Text>
        {booking.technicianName && (
          <Text style={styles.technicianText}>👷 {booking.technicianName}</Text>
        )}
      </View>
      <View style={styles.upcomingStatus}>
        <Text style={styles.upcomingStatusText}>{booking.status}</Text>
      </View>
    </LinearGradient>
  );
}

export default function VehicleCareHubScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: catalog = [], refetch: refetchCatalog } = useQuery({
    queryKey: ['vc-catalog'],
    queryFn: vehicleCareService.getServiceCatalog,
  });

  const { data: plans = [], refetch: refetchPlans } = useQuery({
    queryKey: ['vc-my-plans'],
    queryFn: vehicleCareService.getMyPlans,
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ['vc-my-bookings'],
    queryFn: vehicleCareService.getMyBookings,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchCatalog(), refetchPlans(), refetchBookings()]);
    setRefreshing(false);
  }, [refetchCatalog, refetchPlans, refetchBookings]);

  const activePlan = plans.find(p => p.status === 'ACTIVE');
  const upcomingBooking = bookings.find(
    b => b.status === 'CONFIRMED' || b.status === 'ASSIGNED' || b.status === 'EN_ROUTE' || b.status === 'ARRIVED' || b.status === 'IN_PROGRESS',
  );
  const popularServices = catalog.filter(s => s.popular);
  const otherServices = catalog.filter(s => !s.popular);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />

      {/* Header */}
      <LinearGradient colors={['#1E1B4B', '#312E81', '#4F46E5']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Vehicle Care</Text>
          <Text style={styles.headerSub}>Powered by Washcaro • Doorstep service</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/vehicle-care/vendor')} style={styles.vendorBtn}>
          <Ionicons name="briefcase-outline" size={20} color="#C7D2FE" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Partner badge */}
        <View style={styles.partnerRow}>
          <View style={styles.partnerBadge}>
            <Text style={styles.partnerEmoji}>✅</Text>
            <Text style={styles.partnerText}>Verified Partner: Washcaro</Text>
          </View>
          <View style={styles.partnerBadge}>
            <Text style={styles.partnerEmoji}>🏠</Text>
            <Text style={styles.partnerText}>Doorstep service</Text>
          </View>
        </View>

        {/* Upcoming booking banner */}
        {upcomingBooking && (
          <TouchableOpacity onPress={() => router.push('/vehicle-care/my-bookings')} activeOpacity={0.88}>
            <UpcomingBookingBanner booking={upcomingBooking} />
          </TouchableOpacity>
        )}

        {/* Active plan banner */}
        {activePlan && (
          <TouchableOpacity onPress={() => router.push('/vehicle-care/plans')} activeOpacity={0.88}>
            <ActivePlanBanner plan={activePlan} />
          </TouchableOpacity>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.id}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
              style={[styles.quickCard, { backgroundColor: action.bg }]}
            >
              <Text style={styles.quickEmoji}>{action.emoji}</Text>
              <Text style={[styles.quickLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Popular services */}
        {popularServices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Popular Services</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
              {popularServices.map(svc => (
                <ServiceCard
                  key={svc.id}
                  item={svc}
                  onPress={() => router.push({ pathname: '/vehicle-care/book', params: { serviceId: svc.id } })}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* All services */}
        <Text style={styles.sectionTitle}>All Services</Text>
        {(otherServices.length > 0 ? otherServices : catalog).map(svc => (
          <TouchableOpacity
            key={svc.id}
            onPress={() => router.push({ pathname: '/vehicle-care/book', params: { serviceId: svc.id } })}
            activeOpacity={0.85}
            style={styles.listCard}
          >
            <View style={[styles.listIconBox, { backgroundColor: svc.gradientColors[0] + '22' }]}>
              <Text style={{ fontSize: 24 }}>{svc.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listName}>{svc.name}</Text>
              <Text style={styles.listDesc} numberOfLines={1}>{svc.description}</Text>
              <Text style={styles.listDuration}>⏱ {svc.durationMins} min</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.listPrice}>₹{svc.communityPrice}</Text>
              <Text style={styles.listMrp}>₹{svc.basePrice}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Community offer */}
        <LinearGradient colors={['#1E1B4B', '#4F46E5']} style={styles.communityCard}>
          <Text style={styles.communityTitle}>🏘️ Community Wash Days</Text>
          <Text style={styles.communitySub}>
            Bulk apartment bookings get negotiated rates. Gather neighbours and save more!
          </Text>
          <TouchableOpacity style={styles.communityBtn} activeOpacity={0.85}>
            <Text style={styles.communityBtnText}>Express Interest</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: '#fff' },
  headerSub: { fontFamily: FONTS.regular, fontSize: 12, color: '#C7D2FE', marginTop: 2 },
  vendorBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
  scroll: { paddingTop: 12, paddingBottom: 24 },

  partnerRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12, flexWrap: 'wrap' },
  partnerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, gap: 5, ...SHADOWS.card },
  partnerEmoji: { fontSize: 12 },
  partnerText: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#374151' },

  upcomingBanner: { marginHorizontal: 16, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10, ...SHADOWS.card },
  upcomingEmoji: { fontSize: 28 },
  upcomingTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff' },
  upcomingSub: { fontFamily: FONTS.regular, fontSize: 12, color: '#C7D2FE', marginTop: 2 },
  technicianText: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#A5B4FC', marginTop: 2 },
  upcomingStatus: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  upcomingStatusText: { fontFamily: FONTS.bold, fontSize: 10, color: '#fff' },

  planBanner: { marginHorizontal: 16, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 0, ...SHADOWS.card },
  planBannerTitle: { fontFamily: FONTS.bold, fontSize: 14, color: '#fff', marginLeft: 10 },
  planBannerSub: { fontFamily: FONTS.regular, fontSize: 12, color: '#A7F3D0', marginTop: 2, marginLeft: 10 },
  creditsBubble: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12, padding: 8, alignItems: 'center', minWidth: 44 },
  creditsNum: { fontFamily: FONTS.bold, fontSize: 20, color: '#fff' },
  creditsLabel: { fontFamily: FONTS.semiBold, fontSize: 10, color: '#D1FAE5' },

  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: '#0F172A', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  quickCard: { width: (SCREEN_W - 42) / 2, borderRadius: 14, padding: 14, alignItems: 'center', gap: 6, ...SHADOWS.card },
  quickEmoji: { fontSize: 26 },
  quickLabel: { fontFamily: FONTS.semiBold, fontSize: 13 },

  serviceCard: { width: SCREEN_W * 0.62, borderRadius: 18, overflow: 'hidden', ...SHADOWS.floating },
  serviceGradient: { padding: 18, minHeight: 200 },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  serviceEmoji: { fontSize: 32 },
  popularBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  popularText: { fontFamily: FONTS.semiBold, fontSize: 10, color: '#fff' },
  serviceName: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff', marginBottom: 4 },
  serviceDesc: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 12 },
  servicePriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  communityPrice: { fontFamily: FONTS.bold, fontSize: 20, color: '#fff' },
  basePrice: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through' },
  savingsBadge: { backgroundColor: 'rgba(16,185,129,0.25)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  savingsText: { fontFamily: FONTS.semiBold, fontSize: 11, color: '#A7F3D0' },
  duration: { fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14, gap: 12, ...SHADOWS.card },
  listIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  listName: { fontFamily: FONTS.bold, fontSize: 15, color: '#0F172A' },
  listDesc: { fontFamily: FONTS.regular, fontSize: 12, color: '#64748B', marginTop: 2 },
  listDuration: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', marginTop: 2 },
  listPrice: { fontFamily: FONTS.bold, fontSize: 16, color: '#4F46E5' },
  listMrp: { fontFamily: FONTS.regular, fontSize: 11, color: '#94A3B8', textDecorationLine: 'line-through' },

  communityCard: { marginHorizontal: 16, marginTop: 20, borderRadius: 18, padding: 20, ...SHADOWS.floating },
  communityTitle: { fontFamily: FONTS.bold, fontSize: 17, color: '#fff', marginBottom: 6 },
  communitySub: { fontFamily: FONTS.regular, fontSize: 13, color: '#C7D2FE', marginBottom: 14, lineHeight: 20 },
  communityBtn: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  communityBtnText: { fontFamily: FONTS.semiBold, fontSize: 14, color: '#fff' },
});
