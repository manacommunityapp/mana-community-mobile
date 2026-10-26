import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS, FONTS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { maintenanceDuesService } from '@/services/maintenanceDuesService';
import { homeServicesService } from '@/services/homeServicesService';
import { visitorService } from '@/services/visitorService';
import { facilityService } from '@/services/facilityService';

type FilterType = 'ALL' | 'PAYMENTS' | 'VISITORS' | 'SERVICES' | 'FACILITIES';

interface ActivityItem {
  id: string;
  type: FilterType;
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  amount?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

export default function ActivityLogScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const { data: bills = [], refetch: refetchBills, isLoading: loadingBills } = useQuery({
    queryKey: ['activity-bills'],
    queryFn: () => maintenanceDuesService.getPaymentHistory(),
  });

  const { data: visitors = [], refetch: refetchVisitors, isLoading: loadingVisitors } = useQuery({
    queryKey: ['activity-visitors'],
    queryFn: () => visitorService.getMyVisitors(),
  });

  const { data: homeBookings = [], refetch: refetchHome, isLoading: loadingHome } = useQuery({
    queryKey: ['activity-home-services'],
    queryFn: () => homeServicesService.getMyBookings(),
  });

  const { data: facilityBookings = [], refetch: refetchFacility, isLoading: loadingFacility } = useQuery({
    queryKey: ['activity-facilities'],
    queryFn: () => facilityService.getMyBookings(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refetchBills(),
        refetchVisitors(),
        refetchHome(),
        refetchFacility(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchBills, refetchVisitors, refetchHome, refetchFacility]);

  const allItems: ActivityItem[] = useMemo(() => {
    const list: ActivityItem[] = [];

    // 1. Maintenance
    bills.forEach((b) => {
      list.push({
        id: `bill-${b.id}`,
        type: 'PAYMENTS',
        title: `Maintenance: ${b.monthYear || 'Monthly Dues'}`,
        subtitle: `Due Date: ${b.dueDate ? new Date(b.dueDate).toLocaleDateString() : 'N/A'}`,
        timestamp: b.paidAt || b.dueDate || new Date().toISOString(),
        status: b.status,
        amount: `₹${(b.totalAmount || 0).toLocaleString('en-IN')}`,
        icon: 'card-outline',
        color: '#4F46E5',
        bg: '#EEF2FF',
      });
    });

    // 2. Visitors
    visitors.forEach((v) => {
      list.push({
        id: `vis-${v.id}`,
        type: 'VISITORS',
        title: `Visitor: ${v.visitorName || 'Guest'}`,
        subtitle: `Pass: ${v.purpose || v.passType || 'Entry'}`,
        timestamp: v.checkedInAt || v.createdAt || new Date().toISOString(),
        status: String(v.status || 'EXPECTED'),
        icon: 'shield-checkmark-outline',
        color: '#0891B2',
        bg: '#CFFAFE',
      });
    });

    // 3. Home Services
    homeBookings.forEach((h) => {
      list.push({
        id: `home-${h.id}`,
        type: 'SERVICES',
        title: `Service: ${h.category || 'Home Repair'}`,
        subtitle: `Provider: ${h.providerName || 'Assigned Staff'} · ${h.timeSlot || ''}`,
        timestamp: h.date || h.createdAt || new Date().toISOString(),
        status: h.status,
        icon: 'construct-outline',
        color: '#DB2777',
        bg: '#FCE7F3',
      });
    });

    // 4. Facility
    facilityBookings.forEach((f) => {
      list.push({
        id: `fac-${f.id}`,
        type: 'FACILITIES',
        title: `Facility: ${f.facilityName}`,
        subtitle: `Slot: ${f.startTime} - ${f.endTime}`,
        timestamp: f.date || new Date().toISOString(),
        status: f.status,
        icon: 'fitness-outline',
        color: '#059669',
        bg: '#DCFCE7',
      });
    });

    // Sort by timestamp desc
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [bills, visitors, homeBookings, facilityBookings]);

  const filteredItems = useMemo(() => {
    if (filter === 'ALL') return allItems;
    return allItems.filter((i) => i.type === filter);
  }, [allItems, filter]);

  const isLoading = loadingBills || loadingVisitors || loadingHome || loadingFacility;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Groww Clean Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Log</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: 'ALL', label: 'All Activity' },
            { key: 'PAYMENTS', label: 'Payments' },
            { key: 'VISITORS', label: 'Visitors' },
            { key: 'SERVICES', label: 'Services' },
            { key: 'FACILITIES', label: 'Amenities' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key as FilterType)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading && allItems.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={THEME.brandDark} size="large" />
          <Text style={styles.loadingText}>Fetching recent activity...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[THEME.brandDark]}
              tintColor={THEME.brandDark}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.activityCard}>
              <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.rowTop}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  {item.amount && <Text style={styles.itemAmount}>{item.amount}</Text>}
                </View>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                <View style={styles.rowBottom}>
                  <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <View style={[styles.statusPill, {
                    backgroundColor:
                      item.status === 'PAID' || item.status === 'CONFIRMED' || item.status === 'APPROVED'
                        ? '#DCFCE7'
                        : item.status === 'PENDING'
                        ? '#FEF3C7'
                        : '#F1F5F9'
                  }]}>
                    <Text style={[styles.statusText, {
                      color:
                        item.status === 'PAID' || item.status === 'CONFIRMED' || item.status === 'APPROVED'
                          ? '#059669'
                          : item.status === 'PENDING'
                          ? '#D97706'
                          : '#64748B'
                    }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 36 }}>📋</Text>
              <Text style={styles.emptyTitle}>No Activity Recorded</Text>
              <Text style={styles.emptySub}>
                Your recent payments, passes, and reservations will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  filterWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: THEME.brandDark,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 40,
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginRight: 8,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  itemSubtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 11,
    color: THEME.textSecondary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: THEME.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
});
