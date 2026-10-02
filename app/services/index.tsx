import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, BackHandler, Linking,
  TextInput, Modal, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import {
  homeServicesService,
  HomeHelpWorkerDto,
  HomeServiceBookingDto,
  DomesticStaffDto,
  StaffAttendanceDto,
  ServicePackageDto,
  StaffJobPostDto,
  StaffRole,
  AttendanceStatus,
  CreateJobPostRequest,
} from '@/services/homeServicesService';

type TabKey = 'providers' | 'staff' | 'attendance' | 'packages' | 'jobs' | 'bookings';

type ServiceCategory =
  | 'ALL' | 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'APPLIANCE'
  | 'CARPENTRY' | 'PAINTING' | 'MAID' | 'PEST_CONTROL';

const CATEGORIES: { value: ServiceCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { value: 'ALL',          label: 'All',        icon: 'grid-outline',          color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'PLUMBING',     label: 'Plumbing',   icon: 'water-outline',         color: '#0284C7', bg: '#E0F2FE' },
  { value: 'ELECTRICAL',   label: 'Electrical',  icon: 'flash-outline',        color: '#D97706', bg: '#FEF3C7' },
  { value: 'CLEANING',     label: 'Cleaning',   icon: 'sparkles-outline',      color: '#059669', bg: '#D1FAE5' },
  { value: 'APPLIANCE',    label: 'Appliance',  icon: 'tv-outline',            color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'CARPENTRY',    label: 'Carpentry',  icon: 'hammer-outline',        color: '#B45309', bg: '#FEF3C7' },
  { value: 'PAINTING',     label: 'Painting',   icon: 'color-palette-outline', color: '#DB2777', bg: '#FCE7F3' },
  { value: 'MAID',         label: 'Maid/Cook',  icon: 'people-outline',        color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'PEST_CONTROL', label: 'Pest',       icon: 'bug-outline',           color: '#DC2626', bg: '#FEE2E2' },
];

const ROLE_CONFIG: Record<StaffRole, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  MAID:     { label: 'Maid',     icon: 'sparkles',        color: '#DB2777', bg: '#FCE7F3' },
  COOK:     { label: 'Cook',     icon: 'restaurant',      color: '#EA580C', bg: '#FFF7ED' },
  DRIVER:   { label: 'Driver',   icon: 'car',             color: '#2563EB', bg: '#DBEAFE' },
  NANNY:    { label: 'Nanny',    icon: 'heart',           color: '#E11D48', bg: '#FFE4E6' },
  GARDENER: { label: 'Gardener', icon: 'leaf',            color: '#059669', bg: '#D1FAE5' },
  WATCHMAN: { label: 'Watchman', icon: 'shield',          color: '#0891B2', bg: '#CFFAFE' },
  HELPER:   { label: 'Helper',   icon: 'hand-left',       color: '#7C3AED', bg: '#EDE9FE' },
};

const ATT_STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  CHECKED_IN:  { label: 'In',          color: '#059669', bg: '#D1FAE5', icon: 'enter-outline' },
  CHECKED_OUT: { label: 'Out',         color: '#2563EB', bg: '#DBEAFE', icon: 'exit-outline' },
  ABSENT:      { label: 'Absent',      color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
  ON_LEAVE:    { label: 'Leave',       color: '#D97706', bg: '#FEF3C7', icon: 'calendar' },
  NOT_MARKED:  { label: 'Not Marked',  color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle' },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PAID:    { label: 'Paid',    color: '#059669', bg: '#D1FAE5' },
  DUE:     { label: 'Due',     color: '#D97706', bg: '#FEF3C7' },
  OVERDUE: { label: 'Overdue', color: '#DC2626', bg: '#FEE2E2' },
};

export default function ServicesScreen({ isTab = false }: { isTab?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('providers');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('ALL');
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Booking modal
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<HomeHelpWorkerDto | null>(null);
  const [bookIssue, setBookIssue] = useState('');
  const [bookDate, setBookDate] = useState('Today');
  const [bookTimeSlot, setBookTimeSlot] = useState('Morning (9 AM - 12 PM)');

  // Job post modal
  const [jobModalVisible, setJobModalVisible] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobRole, setJobRole] = useState<StaffRole>('MAID');
  const [jobDesc, setJobDesc] = useState('');
  const [jobSalary, setJobSalary] = useState('');
  const [jobShift, setJobShift] = useState('');

  const goHome = useCallback(() => {
    if (isTab) return;
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router, isTab]);

  useFocusEffect(
    useCallback(() => {
      if (isTab) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (bookingModalVisible) { setBookingModalVisible(false); return true; }
        if (jobModalVisible) { setJobModalVisible(false); return true; }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, isTab, bookingModalVisible, jobModalVisible])
  );

  // ── Queries ───────────────────────────────────────────────────

  const { data: providers = [], isLoading: loadingProviders, refetch: refetchProviders } = useQuery({
    queryKey: ['home-services-workers', selectedCategory],
    queryFn: () => homeServicesService.getWorkers(selectedCategory),
  });

  const { data: bookings = [], isLoading: loadingBookings, refetch: refetchBookings } = useQuery({
    queryKey: ['home-services-bookings'],
    queryFn: () => homeServicesService.getMyBookings(),
  });

  const { data: domesticStaff = [], isLoading: loadingStaff, refetch: refetchStaff } = useQuery({
    queryKey: ['domestic-staff', selectedRole],
    queryFn: () => homeServicesService.getDomesticStaff(selectedRole || undefined),
    staleTime: 60_000,
  });

  const { data: attendance = [], isLoading: loadingAtt, refetch: refetchAtt } = useQuery({
    queryKey: ['staff-attendance'],
    queryFn: () => homeServicesService.getStaffAttendance(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const { data: attSummary, refetch: refetchAttSummary } = useQuery({
    queryKey: ['staff-attendance-summary'],
    queryFn: () => homeServicesService.getAttendanceSummary(),
    staleTime: 15_000,
  });

  const { data: packages = [], isLoading: loadingPkg, refetch: refetchPkg } = useQuery({
    queryKey: ['service-packages'],
    queryFn: () => homeServicesService.getServicePackages(),
    staleTime: 60_000,
  });

  const { data: jobPosts = [], isLoading: loadingJobs, refetch: refetchJobs } = useQuery({
    queryKey: ['staff-jobs'],
    queryFn: () => homeServicesService.getJobPosts(),
    staleTime: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────

  const bookMutation = useMutation({
    mutationFn: (data: Parameters<typeof homeServicesService.bookWorker>[0]) => homeServicesService.bookWorker(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['home-services-bookings'] });
      setBookingModalVisible(false);
      Alert.alert('Booking Confirmed', `Request #${res.bookingId} submitted.`, [
        { text: 'View Bookings', onPress: () => setActiveTab('bookings') },
        { text: 'OK' },
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not schedule booking.'),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => homeServicesService.cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-services-bookings'] });
      Alert.alert('Cancelled', 'Service request cancelled.');
    },
  });

  const jobMutation = useMutation({
    mutationFn: () => homeServicesService.createJobPost({
      title: jobTitle.trim(),
      role: jobRole,
      description: jobDesc.trim(),
      salaryRange: jobSalary.trim(),
      shiftPreference: jobShift.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-jobs'] });
      setJobModalVisible(false);
      setJobTitle(''); setJobDesc(''); setJobSalary(''); setJobShift('');
      Alert.alert('Posted', 'Your job requirement is live on the board.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not post job.'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchProviders(), refetchBookings(), refetchStaff(), refetchAtt(),
      refetchAttSummary(), refetchPkg(), refetchJobs(),
    ]);
    setRefreshing(false);
  }, [refetchProviders, refetchBookings, refetchStaff, refetchAtt, refetchAttSummary, refetchPkg, refetchJobs]);

  const filteredProviders = useMemo(() => {
    let list = providers;
    if (selectedCategory !== 'ALL') list = list.filter((p) => p.category?.toUpperCase() === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
        p.name?.toLowerCase().includes(q) || p.speciality?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [providers, selectedCategory, searchQuery]);

  const pkgStats = useMemo(() => ({
    totalMonthly: packages.reduce((sum, p) => sum + p.monthlySalary, 0),
    overdue: packages.filter((p) => p.paymentStatus === 'OVERDUE').length,
    due: packages.filter((p) => p.paymentStatus === 'DUE').length,
  }), [packages]);

  const isLoading =
    (activeTab === 'providers' && loadingProviders) ||
    (activeTab === 'bookings' && loadingBookings) ||
    (activeTab === 'staff' && loadingStaff) ||
    (activeTab === 'attendance' && loadingAtt) ||
    (activeTab === 'packages' && loadingPkg) ||
    (activeTab === 'jobs' && loadingJobs);

  const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'providers',  label: 'Services',    icon: 'construct-outline' },
    { key: 'staff',      label: 'My Staff',    icon: 'people-outline' },
    { key: 'attendance', label: 'Attendance',  icon: 'finger-print-outline' },
    { key: 'packages',   label: 'Salary',      icon: 'wallet-outline' },
    { key: 'jobs',       label: 'Job Board',   icon: 'megaphone-outline' },
    { key: 'bookings',   label: 'Bookings',    icon: 'receipt-outline' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        {!isTab && (
          <TouchableOpacity onPress={goHome} style={s.headerBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Domestic Help & Home Services</Text>
          <Text style={s.headerSub}>Staff Directory, Attendance & Service Catalog</Text>
        </View>
        <TouchableOpacity style={s.headerBtn} onPress={() => setJobModalVisible(true)}>
          <Ionicons name="add-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Tab Bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? '#FFFFFF' : COLORS.textMuted} />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && !refreshing && (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      {/* ════════════════ SERVICES TAB ════════════════ */}
      {activeTab === 'providers' && !isLoading && (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <>
              <View style={s.searchBar}>
                <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search plumber, electrician, maid..."
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: SPACING.sm }}>
                {CATEGORIES.map((c) => {
                  const active = selectedCategory === c.value;
                  return (
                    <TouchableOpacity
                      key={c.value}
                      style={[s.chip, active && { backgroundColor: c.color, borderColor: c.color }]}
                      onPress={() => setSelectedCategory(c.value)}
                    >
                      <Ionicons name={c.icon} size={13} color={active ? '#FFFFFF' : c.color} />
                      <Text style={[s.chipText, active && { color: '#FFFFFF' }]}>{c.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={s.sectionRow}>
                <Text style={s.sectionTitle}>{filteredProviders.length} Providers</Text>
              </View>
            </>
          }
          renderItem={({ item }) => {
            const catCfg = CATEGORIES.find((c) => c.value === item.category) || CATEGORIES[0];
            return (
              <View style={[s.card, !item.available && { opacity: 0.7 }]}>
                <View style={s.cardHeader}>
                  <View style={[s.iconBox, { backgroundColor: catCfg.bg }]}>
                    <Ionicons name={catCfg.icon} size={20} color={catCfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
                      {item.verified && (
                        <View style={[s.badge, { backgroundColor: '#D1FAE5' }]}>
                          <Ionicons name="checkmark-circle" size={9} color="#059669" />
                          <Text style={[s.badgeText, { color: '#059669' }]}>VERIFIED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.meta} numberOfLines={1}>{item.speciality}</Text>
                  </View>
                </View>

                <View style={s.metricsRow}>
                  <View style={[s.badge, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="star" size={10} color="#D97706" />
                    <Text style={[s.badgeText, { color: '#92400E' }]}>{item.rating} ({item.reviewCount})</Text>
                  </View>
                  {item.priceRange && (
                    <View style={[s.badge, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[s.badgeText, { color: COLORS.primary }]}>{item.priceRange}</Text>
                    </View>
                  )}
                  <View style={[s.badge, { backgroundColor: item.available ? '#D1FAE5' : '#F3F4F6', marginLeft: 'auto' }]}>
                    <Text style={[s.badgeText, { color: item.available ? '#059669' : COLORS.textMuted }]}>
                      {item.statusText || (item.available ? 'Available' : 'Busy')}
                    </Text>
                  </View>
                </View>

                <View style={s.tagsRow}>
                  {item.experience && (
                    <View style={s.tag}><Ionicons name="ribbon-outline" size={11} color={COLORS.textMuted} /><Text style={s.tagText}>{item.experience}</Text></View>
                  )}
                  {item.workingInTowers && (
                    <View style={s.tag}><Ionicons name="business-outline" size={11} color={COLORS.textMuted} /><Text style={s.tagText}>{item.workingInTowers}</Text></View>
                  )}
                </View>

                <View style={s.actionRow}>
                  <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                    <Ionicons name="call" size={14} color="#FFFFFF" /><Text style={s.primaryBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.secondaryBtn}
                    onPress={() => { setSelectedProvider(item); setBookIssue(''); setBookingModalVisible(true); }}
                  >
                    <Text style={s.secondaryBtnText}>Book Visit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="construct-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No providers found</Text>
            </View>
          }
        />
      )}

      {/* ════════════════ MY STAFF TAB ════════════════ */}
      {activeTab === 'staff' && !isLoading && (
        <FlatList
          data={domesticStaff}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: SPACING.sm }}>
                <TouchableOpacity
                  style={[s.chip, !selectedRole && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                  onPress={() => setSelectedRole(null)}
                >
                  <Text style={[s.chipText, !selectedRole && { color: '#FFFFFF' }]}>All Staff</Text>
                </TouchableOpacity>
                {(['MAID', 'COOK', 'DRIVER', 'NANNY', 'GARDENER'] as StaffRole[]).map((role) => {
                  const rcfg = ROLE_CONFIG[role];
                  const active = selectedRole === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[s.chip, active && { backgroundColor: rcfg.color, borderColor: rcfg.color }]}
                      onPress={() => setSelectedRole(active ? null : role)}
                    >
                      <Ionicons name={rcfg.icon} size={13} color={active ? '#FFFFFF' : rcfg.color} />
                      <Text style={[s.chipText, active && { color: '#FFFFFF' }]}>{rcfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={s.sectionTitle}>Verified Staff Directory</Text>
            </>
          }
          renderItem={({ item: staff }) => {
            const rcfg = ROLE_CONFIG[staff.role] || ROLE_CONFIG.HELPER;
            return (
              <View style={[s.card, staff.status === 'ON_LEAVE' && { opacity: 0.7 }]}>
                <View style={s.cardHeader}>
                  <View style={[s.iconBox, { backgroundColor: rcfg.bg }]}>
                    <Ionicons name={rcfg.icon} size={20} color={rcfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.cardTitle}>{staff.name}</Text>
                      <View style={[s.badge, { backgroundColor: rcfg.bg }]}>
                        <Text style={[s.badgeText, { color: rcfg.color }]}>{rcfg.label}</Text>
                      </View>
                    </View>
                    <Text style={s.meta}>{staff.shiftTime} • {staff.workingTowers}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.salaryText}>₹{staff.monthlySalary.toLocaleString()}</Text>
                    <Text style={s.salaryLabel}>/month</Text>
                  </View>
                </View>

                {/* Verification badges */}
                <View style={s.verifyRow}>
                  {[
                    { done: staff.verified, label: 'ID Verified' },
                    { done: staff.policeVerified, label: 'Police' },
                    { done: staff.aadhaarOnFile, label: 'Aadhaar' },
                  ].map((v) => (
                    <View key={v.label} style={s.verifyItem}>
                      <Ionicons
                        name={v.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={12}
                        color={v.done ? '#059669' : COLORS.textMuted}
                      />
                      <Text style={[s.verifyText, v.done && { color: '#059669' }]}>{v.label}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.staffMetaRow}>
                  <View style={s.tag}>
                    <Ionicons name="star" size={11} color="#D97706" />
                    <Text style={s.tagText}>{staff.rating} ({staff.reviewCount})</Text>
                  </View>
                  <View style={s.tag}>
                    <Ionicons name="ribbon-outline" size={11} color={COLORS.textMuted} />
                    <Text style={s.tagText}>{staff.experience}</Text>
                  </View>
                  <View style={s.tag}>
                    <Ionicons name="home-outline" size={11} color={COLORS.textMuted} />
                    <Text style={s.tagText}>{staff.workingFlats.length} flats</Text>
                  </View>
                </View>

                <View style={s.actionRow}>
                  <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(`tel:${staff.phone}`)}>
                    <Ionicons name="call" size={14} color="#FFFFFF" /><Text style={s.primaryBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.secondaryBtn} onPress={() => setActiveTab('attendance')}>
                    <Ionicons name="finger-print-outline" size={14} color={COLORS.primary} />
                    <Text style={s.secondaryBtnText}>Attendance</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Staff Found</Text>
              <Text style={s.emptySub}>Your domestic staff will appear here once registered.</Text>
            </View>
          }
        />
      )}

      {/* ════════════════ ATTENDANCE TAB ════════════════ */}
      {activeTab === 'attendance' && !isLoading && (
        <FlatList
          data={attendance}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <>
              <Text style={s.sectionTitle}>Today's Gate Entry/Exit Log</Text>
              {attSummary && (
                <View style={s.attStatsBar}>
                  {[
                    { label: 'Total',  value: attSummary.totalStaff, color: COLORS.primary },
                    { label: 'In',     value: attSummary.checkedIn,  color: '#059669' },
                    { label: 'Out',    value: attSummary.checkedOut, color: '#2563EB' },
                    { label: 'Leave',  value: attSummary.onLeave,   color: '#D97706' },
                    { label: 'Absent', value: attSummary.absent,    color: '#DC2626' },
                  ].map((st) => (
                    <View key={st.label} style={s.attStatItem}>
                      <Text style={[s.attStatValue, { color: st.color }]}>{st.value}</Text>
                      <Text style={s.attStatLabel}>{st.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          }
          renderItem={({ item: att }) => {
            const aCfg = ATT_STATUS_CONFIG[att.status];
            const rCfg = ROLE_CONFIG[att.role] || ROLE_CONFIG.HELPER;
            return (
              <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: aCfg.color }]}>
                <View style={s.cardHeader}>
                  <View style={[s.iconBox, { backgroundColor: rCfg.bg }]}>
                    <Ionicons name={rCfg.icon} size={18} color={rCfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={s.cardTitle}>{att.staffName}</Text>
                    <Text style={s.meta}>{rCfg.label}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: aCfg.bg }]}>
                    <Ionicons name={aCfg.icon} size={10} color={aCfg.color} />
                    <Text style={[s.badgeText, { color: aCfg.color }]}>{aCfg.label}</Text>
                  </View>
                </View>

                {(att.checkInTime || att.checkOutTime) && (
                  <View style={s.attTimeRow}>
                    {att.checkInTime && (
                      <View style={s.attTimeItem}>
                        <Ionicons name="enter-outline" size={13} color="#059669" />
                        <Text style={s.attTimeText}>In: {att.checkInTime}</Text>
                        {att.checkInGate && <Text style={s.attGateText}>({att.checkInGate})</Text>}
                      </View>
                    )}
                    {att.checkOutTime && (
                      <View style={s.attTimeItem}>
                        <Ionicons name="exit-outline" size={13} color="#2563EB" />
                        <Text style={s.attTimeText}>Out: {att.checkOutTime}</Text>
                        {att.checkOutGate && <Text style={s.attGateText}>({att.checkOutGate})</Text>}
                      </View>
                    )}
                  </View>
                )}

                {att.markedBy && (
                  <Text style={s.markedByText}>Marked by: {att.markedBy}</Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="finger-print-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Attendance Records</Text>
              <Text style={s.emptySub}>Staff gate entry/exit will be tracked by security guards.</Text>
            </View>
          }
        />
      )}

      {/* ════════════════ SALARY / PACKAGES TAB ════════════════ */}
      {activeTab === 'packages' && !isLoading && (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <>
              <View style={s.salaryStatsCard}>
                <View style={s.salaryStatsRow}>
                  <View style={s.salaryStatItem}>
                    <Text style={s.salaryStatLabel}>MONTHLY TOTAL</Text>
                    <Text style={s.salaryStatValue}>₹{pkgStats.totalMonthly.toLocaleString()}</Text>
                  </View>
                  <View style={s.salaryStatItem}>
                    <Text style={s.salaryStatLabel}>OVERDUE</Text>
                    <Text style={[s.salaryStatValue, { color: '#DC2626' }]}>{pkgStats.overdue}</Text>
                  </View>
                  <View style={s.salaryStatItem}>
                    <Text style={s.salaryStatLabel}>DUE SOON</Text>
                    <Text style={[s.salaryStatValue, { color: '#D97706' }]}>{pkgStats.due}</Text>
                  </View>
                </View>
              </View>
              <Text style={[s.sectionTitle, { marginTop: SPACING.sm }]}>Staff Packages & Payments</Text>
            </>
          }
          renderItem={({ item: pkg }) => {
            const rCfg = ROLE_CONFIG[pkg.role] || ROLE_CONFIG.HELPER;
            const pCfg = PAYMENT_CONFIG[pkg.paymentStatus] || PAYMENT_CONFIG.DUE;
            return (
              <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: pCfg.color }]}>
                <View style={s.cardHeader}>
                  <View style={[s.iconBox, { backgroundColor: rCfg.bg }]}>
                    <Ionicons name={rCfg.icon} size={18} color={rCfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={s.cardTitle}>{pkg.staffName}</Text>
                    <Text style={s.meta}>{rCfg.label} • {pkg.flatNumber}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.salaryText}>₹{pkg.monthlySalary.toLocaleString()}</Text>
                    <View style={[s.badge, { backgroundColor: pCfg.bg }]}>
                      <Text style={[s.badgeText, { color: pCfg.color }]}>{pCfg.label}</Text>
                    </View>
                  </View>
                </View>

                <View style={s.servicesWrap}>
                  {pkg.services.map((svc) => (
                    <View key={svc} style={s.serviceChip}>
                      <Text style={s.serviceChipText}>{svc}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.pkgMetaRow}>
                  {pkg.lastPaidDate && (
                    <View style={s.tag}>
                      <Ionicons name="checkmark-circle-outline" size={11} color="#059669" />
                      <Text style={s.tagText}>Paid: {pkg.lastPaidDate}</Text>
                    </View>
                  )}
                  <View style={s.tag}>
                    <Ionicons name="calendar-outline" size={11} color={pCfg.color} />
                    <Text style={[s.tagText, { color: pCfg.color }]}>Next: {pkg.nextDueDate}</Text>
                  </View>
                </View>

                {pkg.paymentStatus !== 'PAID' && (
                  <TouchableOpacity
                    style={[s.primaryBtn, { alignSelf: 'flex-end', paddingHorizontal: 16 }]}
                    onPress={() => Alert.alert('Pay Salary', `Mark ₹${pkg.monthlySalary.toLocaleString()} as paid for ${pkg.staffName}?`, [
                      { text: 'Cancel' },
                      { text: 'Mark Paid' },
                    ])}
                  >
                    <Ionicons name="wallet-outline" size={14} color="#FFFFFF" />
                    <Text style={s.primaryBtnText}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Packages</Text>
              <Text style={s.emptySub}>Your staff salary packages will appear here.</Text>
            </View>
          }
        />
      )}

      {/* ════════════════ JOB BOARD TAB ════════════════ */}
      {activeTab === 'jobs' && !isLoading && (
        <FlatList
          data={jobPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View style={[s.sectionRow, { marginBottom: SPACING.sm }]}>
              <View>
                <Text style={s.sectionTitle}>Staff Job Requirements</Text>
                <Text style={s.sectionSub}>Post what you need, find verified help</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => setJobModalVisible(true)}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={s.addBtnText}>Post Job</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: job }) => {
            const rCfg = ROLE_CONFIG[job.role] || ROLE_CONFIG.HELPER;
            const statusColor = job.status === 'OPEN' ? '#059669' : job.status === 'FILLED' ? '#2563EB' : '#6B7280';
            const statusBg = job.status === 'OPEN' ? '#D1FAE5' : job.status === 'FILLED' ? '#DBEAFE' : '#F3F4F6';
            return (
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={[s.iconBox, { backgroundColor: rCfg.bg }]}>
                    <Ionicons name={rCfg.icon} size={18} color={rCfg.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={s.cardTitle}>{job.title}</Text>
                    <Text style={s.meta}>{job.tower || ''} {job.flatNumber} • {job.postedBy}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: statusBg }]}>
                    <Text style={[s.badgeText, { color: statusColor }]}>{job.status}</Text>
                  </View>
                </View>

                <Text style={s.jobDesc} numberOfLines={2}>{job.description}</Text>

                <View style={s.jobDetailsRow}>
                  <View style={s.tag}>
                    <Ionicons name="wallet-outline" size={11} color="#059669" />
                    <Text style={[s.tagText, { color: '#059669', fontWeight: '700' }]}>{job.salaryRange}</Text>
                  </View>
                  <View style={s.tag}>
                    <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
                    <Text style={s.tagText}>{job.shiftPreference}</Text>
                  </View>
                  <View style={s.tag}>
                    <Ionicons name="people-outline" size={11} color={COLORS.primary} />
                    <Text style={[s.tagText, { color: COLORS.primary }]}>{job.applicantCount} applicants</Text>
                  </View>
                </View>

                {job.requirements && job.requirements.length > 0 && (
                  <View style={s.servicesWrap}>
                    {job.requirements.map((req) => (
                      <View key={req} style={s.serviceChip}>
                        <Text style={s.serviceChipText}>{req}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={s.postedDate}>Posted {job.postedAt}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="megaphone-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Job Posts</Text>
              <Text style={s.emptySub}>Post a requirement to find verified domestic help.</Text>
              <TouchableOpacity style={[s.addBtn, { marginTop: SPACING.md }]} onPress={() => setJobModalVisible(true)}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={s.addBtnText}>Post Job</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ════════════════ BOOKINGS TAB ════════════════ */}
      {activeTab === 'bookings' && !isLoading && (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={<Text style={s.sectionTitle}>My Service Bookings ({bookings.length})</Text>}
          renderItem={({ item: bk }) => {
            const isCancelled = bk.status === 'CANCELLED';
            const statusColor = isCancelled ? '#DC2626' : bk.status === 'COMPLETED' ? '#2563EB' : bk.status === 'IN_PROGRESS' ? COLORS.primary : '#059669';
            const statusBg = isCancelled ? '#FEE2E2' : bk.status === 'COMPLETED' ? '#DBEAFE' : bk.status === 'IN_PROGRESS' ? '#EEF2FF' : '#D1FAE5';
            return (
              <View style={[s.card, isCancelled && { opacity: 0.6 }]}>
                <View style={s.cardHeader}>
                  <View style={[s.badge, { backgroundColor: statusBg }]}>
                    <Text style={[s.badgeText, { color: statusColor }]}>{bk.status}</Text>
                  </View>
                  <Text style={[s.meta, { marginLeft: 'auto' }]}>{bk.id}</Text>
                </View>
                <Text style={s.cardTitle}>{bk.providerName}</Text>
                <Text style={s.meta}>{bk.issue}</Text>
                <View style={s.metricsRow}>
                  <View style={s.tag}><Ionicons name="calendar-outline" size={11} color={COLORS.primary} /><Text style={s.tagText}>{bk.date}</Text></View>
                  <View style={s.tag}><Ionicons name="time-outline" size={11} color={COLORS.primary} /><Text style={s.tagText}>{bk.timeSlot}</Text></View>
                </View>
                {bk.status === 'CONFIRMED' && (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(`tel:${bk.phone}`)}>
                      <Ionicons name="call" size={14} color="#FFFFFF" /><Text style={s.primaryBtnText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.secondaryBtn, { borderColor: '#FCA5A5' }]}
                      onPress={() => Alert.alert('Cancel', 'Cancel this booking?', [
                        { text: 'Keep' },
                        { text: 'Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(bk.id) },
                      ])}
                    >
                      <Text style={[s.secondaryBtnText, { color: '#DC2626' }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Bookings</Text>
            </View>
          }
        />
      )}

      {/* ── Booking Modal ── */}
      <Modal visible={bookingModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Book Service Visit</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedProvider && <Text style={s.meta}>{selectedProvider.name} • {selectedProvider.category}</Text>}

            <Text style={s.fieldLabel}>Preferred Day</Text>
            <View style={s.choiceRow}>
              {['Today', 'Tomorrow', 'Weekend'].map((d) => (
                <TouchableOpacity key={d} style={[s.choiceChip, bookDate === d && s.choiceChipActive]} onPress={() => setBookDate(d)}>
                  <Text style={[s.choiceChipText, bookDate === d && s.choiceChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Time Slot</Text>
            {['Morning (9 AM - 12 PM)', 'Afternoon (12 PM - 3 PM)', 'Evening (3 PM - 7 PM)'].map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[s.slotItem, bookTimeSlot === slot && s.slotItemActive]}
                onPress={() => setBookTimeSlot(slot)}
              >
                <Text style={[s.slotItemText, bookTimeSlot === slot && s.slotItemTextActive]}>{slot}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.fieldLabel}>Describe Issue (Optional)</Text>
            <TextInput
              style={[s.fieldInput, { height: 60, textAlignVertical: 'top' }]}
              placeholder="e.g. Bathroom pipe leak..."
              placeholderTextColor={COLORS.textMuted}
              value={bookIssue}
              onChangeText={setBookIssue}
              multiline
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setBookingModalVisible(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, bookMutation.isPending && { opacity: 0.6 }]}
                disabled={bookMutation.isPending}
                onPress={() => {
                  if (!selectedProvider) return;
                  bookMutation.mutate({
                    workerId: selectedProvider.id,
                    providerName: selectedProvider.name,
                    phone: selectedProvider.phone,
                    category: selectedProvider.category,
                    slotDate: bookDate,
                    timeSlot: bookTimeSlot,
                    requirementsNotes: bookIssue.trim() || `${selectedProvider.category} service`,
                  });
                }}
              >
                {bookMutation.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.confirmBtnText}>Confirm Booking</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Job Post Modal ── */}
      <Modal visible={jobModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Post Job Requirement</Text>
                <TouchableOpacity onPress={() => setJobModalVisible(false)}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={s.fieldLabel}>Title *</Text>
              <TextInput style={s.fieldInput} value={jobTitle} onChangeText={setJobTitle} placeholder="e.g. Full-time Maid Needed" placeholderTextColor={COLORS.textMuted} />

              <Text style={s.fieldLabel}>Role</Text>
              <View style={[s.choiceRow, { flexWrap: 'wrap' }]}>
                {(['MAID', 'COOK', 'DRIVER', 'NANNY', 'GARDENER', 'HELPER'] as StaffRole[]).map((r) => {
                  const rcfg = ROLE_CONFIG[r];
                  return (
                    <TouchableOpacity key={r} style={[s.choiceChip, { minWidth: 70 }, jobRole === r && { backgroundColor: rcfg.color, borderColor: rcfg.color }]} onPress={() => setJobRole(r)}>
                      <Ionicons name={rcfg.icon} size={12} color={jobRole === r ? '#FFFFFF' : rcfg.color} />
                      <Text style={[s.choiceChipText, jobRole === r && { color: '#FFFFFF' }]}>{rcfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.fieldLabel}>Description *</Text>
              <TextInput style={[s.fieldInput, { height: 70, textAlignVertical: 'top' }]} value={jobDesc} onChangeText={setJobDesc} placeholder="Describe what you need..." placeholderTextColor={COLORS.textMuted} multiline />

              <Text style={s.fieldLabel}>Salary Range</Text>
              <TextInput style={s.fieldInput} value={jobSalary} onChangeText={setJobSalary} placeholder="e.g. ₹3,500 - ₹4,500/mo" placeholderTextColor={COLORS.textMuted} />

              <Text style={s.fieldLabel}>Shift Preference</Text>
              <TextInput style={s.fieldInput} value={jobShift} onChangeText={setJobShift} placeholder="e.g. Morning (7 AM - 11 AM)" placeholderTextColor={COLORS.textMuted} />

              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setJobModalVisible(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmBtn, jobMutation.isPending && { opacity: 0.6 }]}
                  disabled={jobMutation.isPending}
                  onPress={() => {
                    if (!jobTitle.trim()) { Alert.alert('Required', 'Enter job title.'); return; }
                    if (!jobDesc.trim()) { Alert.alert('Required', 'Enter description.'); return; }
                    jobMutation.mutate();
                  }}
                >
                  {jobMutation.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.confirmBtnText}>Post Job</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: SPACING.md, paddingBottom: 40, gap: SPACING.sm },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: '#4F46E5',
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'DMSans-Regular' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.full,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border,
  },
  tabItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800', fontFamily: 'Outfit-Bold' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, paddingVertical: 0, fontFamily: 'DMSans-Regular' },

  // Chips
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  // Section
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
  },
  addBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  // Card
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  meta: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  iconBox: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  metricsRow: { flexDirection: 'row', gap: 6, marginTop: SPACING.sm, flexWrap: 'wrap' },
  tagsRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.sm, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  actionRow: {
    flexDirection: 'row', gap: 8, marginTop: SPACING.sm,
    paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 9, ...SHADOWS.sm,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, paddingVertical: 9,
    borderWidth: 1, borderColor: COLORS.border,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  // Staff
  salaryText: { fontSize: 15, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  salaryLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  verifyRow: { flexDirection: 'row', gap: 12, marginTop: SPACING.sm },
  verifyItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifyText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  staffMetaRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.xs },

  // Attendance
  attStatsBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
    marginTop: SPACING.sm, ...SHADOWS.sm,
  },
  attStatItem: { flex: 1, alignItems: 'center' },
  attStatValue: { fontSize: 18, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  attStatLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  attTimeRow: { flexDirection: 'row', gap: 16, marginTop: SPACING.sm },
  attTimeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attTimeText: { fontSize: 11, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans-Bold' },
  attGateText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  markedByText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: SPACING.xs },

  // Packages / Salary
  salaryStatsCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.sm,
  },
  salaryStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  salaryStatItem: { alignItems: 'center' },
  salaryStatLabel: { fontSize: 8, fontWeight: '800', color: COLORS.textMuted, fontFamily: 'Outfit-Bold' },
  salaryStatValue: { fontSize: 18, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 2 },
  servicesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: SPACING.sm },
  serviceChip: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm,
  },
  serviceChipText: { fontSize: 10, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  pkgMetaRow: { flexDirection: 'row', gap: 12, marginTop: SPACING.sm },

  // Jobs
  jobDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginTop: SPACING.xs, fontFamily: 'DMSans-Regular' },
  jobDetailsRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.sm, flexWrap: 'wrap' },
  postedDate: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: SPACING.sm },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 8 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 30 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, maxHeight: '85%', ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: SPACING.sm, marginBottom: 4 },
  fieldInput: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular',
  },
  choiceRow: { flexDirection: 'row', gap: 6 },
  choiceChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 7, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F8FAFC',
  },
  choiceChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  choiceChipText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  choiceChipTextActive: { color: '#FFFFFF', fontWeight: '800' },

  slotItem: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F8FAFC', marginBottom: 4,
  },
  slotItemActive: { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  slotItemText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  slotItemTextActive: { color: COLORS.primary, fontWeight: '700' },

  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: {
    flex: 1.4, paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
