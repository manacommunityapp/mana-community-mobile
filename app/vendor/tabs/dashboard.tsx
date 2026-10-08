import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import {
  vendorService,
  type VendorDashboardStats,
  type VendorBooking,
  type VendorWorkOrder,
} from '@/services/vendorService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface StatCardProps {
  icon: IoniconsName;
  label: string;
  value: string;
  color: string;
  bg: string;
}

function StatCard({ icon, label, value, color, bg }: StatCardProps) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function VendorDashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [workOrders, setWorkOrders] = useState<VendorWorkOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [s, b, w] = await Promise.all([
      vendorService.getDashboardStats(),
      vendorService.getBookings(),
      vendorService.getWorkOrders(),
    ]);
    setStats(s);
    setBookings(b);
    setWorkOrders(w);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const upcomingBookings = bookings
    .filter(b => b.status === 'PENDING' || b.status === 'CONFIRMED')
    .slice(0, 3);

  const activeOrders = workOrders
    .filter(w => w.status !== 'COMPLETED')
    .slice(0, 3);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VENDOR_COLORS.accent} />}
      >
        {/* Welcome */}
        <View style={s.welcome}>
          <View>
            <Text style={s.greeting}>Welcome back,</Text>
            <Text style={s.userName}>{user?.fullName || user?.name || 'Vendor'}</Text>
          </View>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={14} color={VENDOR_COLORS.accent} />
            <Text style={s.ratingText}>{stats?.rating ?? '–'}</Text>
            <Text style={s.reviewCount}>({stats?.totalReviews ?? 0})</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={s.statsGrid}>
          <StatCard icon="calendar" label="Today's Bookings" value={String(stats?.todayBookings ?? 0)} color={VENDOR_COLORS.accent} bg={VENDOR_COLORS.accentLight} />
          <StatCard icon="time" label="Pending" value={String(stats?.pendingBookings ?? 0)} color="#EA580C" bg="#FFF7ED" />
          <StatCard icon="construct" label="Work Orders" value={String(stats?.activeWorkOrders ?? 0)} color="#7C3AED" bg="#EDE9FE" />
          <StatCard icon="cash" label="This Month" value={`₹${((stats?.monthRevenue ?? 0) / 1000).toFixed(1)}k`} color="#059669" bg="#D1FAE5" />
        </View>

        {/* Group Buying Wholesale Commerce Banner */}
        <TouchableOpacity
          style={s.groupBuyBanner}
          onPress={() => router.push('/vendor/deals' as any)}
          activeOpacity={0.85}
        >
          <View style={s.groupBuyIconWrap}>
            <Ionicons name="cart" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.groupBuyTitleRow}>
              <Text style={s.groupBuyTitle}>Mana Group Buy Portal</Text>
              <View style={s.groupBuyBadge}>
                <Text style={s.groupBuyBadgeText}>WHOLESALE</Text>
              </View>
            </View>
            <Text style={s.groupBuySub}>
              Launch bulk community deals, track MOQ volume progress & print manifests
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={VENDOR_COLORS.accent} />
        </TouchableOpacity>

        {/* Availability toggle */}
        <TouchableOpacity style={s.availCard} activeOpacity={0.8}>
          <View style={s.availLeft}>
            <View style={s.availDot} />
            <View>
              <Text style={s.availTitle}>Available for Bookings</Text>
              <Text style={s.availSub}>You're currently accepting new jobs</Text>
            </View>
          </View>
          <Ionicons name="toggle" size={36} color={COLORS.success} />
        </TouchableOpacity>

        {/* Upcoming bookings */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Upcoming Bookings</Text>
          <TouchableOpacity><Text style={s.seeAll}>See All</Text></TouchableOpacity>
        </View>
        {upcomingBookings.map(b => (
          <View key={b.id} style={s.activityCard}>
            <View style={[s.activityIcon, { backgroundColor: b.status === 'PENDING' ? '#FEF3C7' : '#D1FAE5' }]}>
              <Ionicons
                name={b.status === 'PENDING' ? 'time' : 'checkmark-circle'}
                size={18}
                color={b.status === 'PENDING' ? '#D97706' : '#059669'}
              />
            </View>
            <View style={s.activityBody}>
              <Text style={s.activityTitle} numberOfLines={1}>{b.service}</Text>
              <Text style={s.activityMeta}>{b.customerName} · {b.flat}</Text>
              <Text style={s.activityMeta}>{b.time} · ₹{b.amount}</Text>
            </View>
            <View style={[s.statusChip, { backgroundColor: b.status === 'PENDING' ? '#FEF3C7' : '#D1FAE5' }]}>
              <Text style={[s.statusChipText, { color: b.status === 'PENDING' ? '#D97706' : '#059669' }]}>
                {b.status === 'PENDING' ? 'Pending' : 'Confirmed'}
              </Text>
            </View>
          </View>
        ))}

        {/* Active work orders */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Active Work Orders</Text>
          <TouchableOpacity><Text style={s.seeAll}>See All</Text></TouchableOpacity>
        </View>
        {activeOrders.map(w => {
          const isUrgent = w.priority === 'URGENT' || w.priority === 'HIGH';
          return (
            <View key={w.id} style={[s.activityCard, isUrgent && s.urgentBorder]}>
              <View style={[s.activityIcon, { backgroundColor: isUrgent ? COLORS.errorLight : '#EDE9FE' }]}>
                <Ionicons
                  name={isUrgent ? 'alert-circle' : 'construct'}
                  size={18}
                  color={isUrgent ? COLORS.error : '#7C3AED'}
                />
              </View>
              <View style={s.activityBody}>
                <Text style={s.activityTitle} numberOfLines={1}>{w.title}</Text>
                <Text style={s.activityMeta}>{w.customerName} · {w.flat}</Text>
                <Text style={s.activityMeta}>{w.location} · Due {w.dueDate}</Text>
              </View>
              <View style={[s.priorityChip, { backgroundColor: isUrgent ? COLORS.errorLight : '#F3F4F6' }]}>
                <Text style={[s.priorityChipText, { color: isUrgent ? COLORS.error : '#6B7280' }]}>
                  {w.priority}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  welcome: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  greeting: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: VENDOR_COLORS.accentLight, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: VENDOR_COLORS.accentMid,
  },
  ratingText: { fontSize: 15, fontWeight: '800', color: VENDOR_COLORS.accentDark },
  reviewCount: { fontSize: 11, color: VENDOR_COLORS.accentDark },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 12, marginBottom: 8,
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

  availCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 8,
    borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.success, ...SHADOWS.sm,
  },
  availLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  availTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  availSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2 },
  seeAll: { fontSize: 12, fontWeight: '600', color: VENDOR_COLORS.accent },

  activityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 6,
    borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  urgentBorder: { borderColor: COLORS.error, borderWidth: 1.5 },
  activityIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityBody: { flex: 1, gap: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  activityMeta: { fontSize: 11, color: COLORS.textMuted },

  statusChip: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3 },
  statusChipText: { fontSize: 10, fontWeight: '700' },
  priorityChip: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3 },
  priorityChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  groupBuyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: VENDOR_COLORS.accent,
    ...SHADOWS.sm,
  },
  groupBuyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: VENDOR_COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupBuyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupBuyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  groupBuyBadge: {
    backgroundColor: VENDOR_COLORS.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  groupBuyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: VENDOR_COLORS.accentDark,
  },
  groupBuySub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
});
