import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, BackHandler, Linking,
  TextInput, Modal, Alert, ActivityIndicator,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/config';
import { GROWW_THEME } from '@/constants/theme';
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

const SCREEN_W = Dimensions.get('window').width;

type TabKey = 'providers' | 'staff' | 'attendance' | 'packages' | 'jobs' | 'bookings';

type ServiceCategory =
  | 'ALL' | 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'APPLIANCE'
  | 'CARPENTRY' | 'PAINTING' | 'MAID' | 'PEST_CONTROL';

const CATEGORIES: { value: ServiceCategory; label: string; emoji: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { value: 'ALL',          label: 'All',        emoji: '🏠', icon: 'grid-outline',          color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'PLUMBING',     label: 'Plumbing',   emoji: '🔧', icon: 'water-outline',         color: '#0284C7', bg: '#E0F2FE' },
  { value: 'ELECTRICAL',   label: 'Electrical',  emoji: '⚡', icon: 'flash-outline',        color: '#D97706', bg: '#FEF3C7' },
  { value: 'CLEANING',     label: 'Cleaning',   emoji: '✨', icon: 'sparkles-outline',      color: '#059669', bg: '#DCFCE7' },
  { value: 'APPLIANCE',    label: 'Appliance',  emoji: '📺', icon: 'tv-outline',            color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'CARPENTRY',    label: 'Carpentry',  emoji: '🪚', icon: 'hammer-outline',        color: '#B45309', bg: '#FEF3C7' },
  { value: 'PAINTING',     label: 'Painting',   emoji: '🎨', icon: 'color-palette-outline', color: '#DB2777', bg: '#FCE7F3' },
  { value: 'MAID',         label: 'Maid/Cook',  emoji: '👩‍🍳', icon: 'people-outline',        color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'PEST_CONTROL', label: 'Pest',       emoji: '🐛', icon: 'bug-outline',           color: '#DC2626', bg: '#FEE2E2' },
];

const ROLE_CONFIG: Record<StaffRole, { label: string; emoji: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  MAID:     { label: 'Maid',     emoji: '🧹', icon: 'sparkles',        color: '#DB2777', bg: '#FCE7F3' },
  COOK:     { label: 'Cook',     emoji: '👨‍🍳', icon: 'restaurant',      color: '#EA580C', bg: '#FFF7ED' },
  DRIVER:   { label: 'Driver',   emoji: '🚗', icon: 'car',             color: '#2563EB', bg: '#DBEAFE' },
  NANNY:    { label: 'Nanny',    emoji: '👶', icon: 'heart',           color: '#E11D48', bg: '#FFE4E6' },
  GARDENER: { label: 'Gardener', emoji: '🌿', icon: 'leaf',            color: '#059669', bg: '#DCFCE7' },
  WATCHMAN: { label: 'Watchman', emoji: '🛡️', icon: 'shield',          color: '#0891B2', bg: '#CFFAFE' },
  HELPER:   { label: 'Helper',   emoji: '🤝', icon: 'hand-left',       color: '#7C3AED', bg: '#EDE9FE' },
};

const ATT_STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  CHECKED_IN:  { label: 'In',          color: '#059669', bg: '#DCFCE7', icon: 'enter-outline' },
  CHECKED_OUT: { label: 'Out',         color: '#2563EB', bg: '#DBEAFE', icon: 'exit-outline' },
  ABSENT:      { label: 'Absent',      color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
  ON_LEAVE:    { label: 'Leave',       color: '#D97706', bg: '#FEF3C7', icon: 'calendar' },
  NOT_MARKED:  { label: 'Not Marked',  color: '#6B7280', bg: '#F1F5F9', icon: 'help-circle' },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  PAID:    { label: 'Paid',    color: '#059669', bg: '#DCFCE7', emoji: '✅' },
  DUE:     { label: 'Due',     color: '#D97706', bg: '#FEF3C7', emoji: '⏳' },
  OVERDUE: { label: 'Overdue', color: '#DC2626', bg: '#FEE2E2', emoji: '🔴' },
};

export default function ServicesScreen({ isTab = false }: { isTab?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('providers');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('ALL');
  const [selectedRole, setSelectedRole] = useState<StaffRole | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<HomeHelpWorkerDto | null>(null);
  const [bookIssue, setBookIssue] = useState('');
  const [bookDate, setBookDate] = useState('Today');
  const [bookTimeSlot, setBookTimeSlot] = useState('Morning (9 AM - 12 PM)');

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

  const TABS: { key: TabKey; label: string; emoji: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'providers',  label: 'Services',   emoji: '🛠️', icon: 'construct-outline' },
    { key: 'staff',      label: 'My Staff',   emoji: '👥', icon: 'people-outline' },
    { key: 'attendance', label: 'Attendance', emoji: '📋', icon: 'finger-print-outline' },
    { key: 'packages',   label: 'Salary',     emoji: '💰', icon: 'wallet-outline' },
    { key: 'jobs',       label: 'Job Board',  emoji: '📢', icon: 'megaphone-outline' },
    { key: 'bookings',   label: 'Bookings',   emoji: '🗓️', icon: 'receipt-outline' },
  ];

  const CAT_ITEM_W = (SCREEN_W - 32 - 24) / 5;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Groww Clean Header ── */}
      <View style={s.cleanHeader}>
        <View style={s.headerRow}>
          {!isTab && (
            <TouchableOpacity onPress={goHome} style={s.headerBackBtn} hitSlop={8}>
              <Ionicons name="arrow-back" size={18} color={GROWW_THEME.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>🏠 Home Services</Text>
            <Text style={s.headerSub}>Staff · Attendance · Bookings</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              style={[s.headerIconBtn, isSearchOpen && s.headerIconBtnActive]}
              onPress={() => {
                setIsSearchOpen((prev) => !prev);
                if (isSearchOpen) setSearchQuery('');
              }}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Text style={{ fontSize: 16 }}>{isSearchOpen ? '✕' : '🔍'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.headerActionBtn} onPress={() => setJobModalVisible(true)} activeOpacity={0.7}>
              <Text style={{ fontSize: 13 }}>📝</Text>
              <Text style={s.headerActionText}>Post Job</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Strip */}
        <View style={s.statsStrip}>
          {[
            { label: 'Providers', value: String(providers.length || '20+'), emoji: '🛠️' },
            { label: 'My Staff',  value: String(domesticStaff.length || '0'), emoji: '👥' },
            { label: 'Bookings',  value: String(bookings.length || '0'), emoji: '🗓️' },
            { label: 'Job Posts', value: String(jobPosts.length || '0'), emoji: '📢' },
          ].map((st, i, arr) => (
            <View key={st.label} style={{ flexDirection: 'row', flex: 1 }}>
              <View style={s.statItem}>
                <View style={s.statEmojiHalo}>
                  <Text style={s.statEmoji}>{st.emoji}</Text>
                </View>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={s.statDivider} />}
            </View>
          ))}
        </View>

        {/* Search */}
        {isSearchOpen && (
          <View style={s.headerSearchWrap}>
            <Text style={{ fontSize: 14 }}>🔍</Text>
            <TextInput
              style={s.headerSearchInput}
              placeholder="Search plumber, electrician, maid, staff…"
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* ── Tab Bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabPill, active && s.tabPillActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              {active && <View style={s.tabDot} />}
              <Text style={s.tabEmoji}>{tab.emoji}</Text>
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading && !refreshing && (
        <View style={s.centerBox}>
          <View style={s.loadingCircle}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
          <Text style={s.loadingText}>Loading…</Text>
        </View>
      )}

      {/* ════════════════ SERVICES TAB ════════════════ */}
      {activeTab === 'providers' && !isLoading && (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
          ListHeaderComponent={
            <>
              {/* Category Icon Grid */}
              <View style={s.catSection}>
                <View style={s.sectionHeaderRow}>
                  <Text style={{ fontSize: 14 }}>📂</Text>
                  <Text style={s.sectionTitle}>Categories</Text>
                  <Text style={s.sectionSubRight}>{CATEGORIES.length} types</Text>
                </View>
                <View style={s.catGrid}>
                  {CATEGORIES.map((c) => {
                    const active = selectedCategory === c.value;
                    return (
                      <TouchableOpacity
                        key={c.value}
                        style={[s.catItem, { width: CAT_ITEM_W }, active && { backgroundColor: c.bg, borderColor: c.color, borderWidth: 1.5 }]}
                        onPress={() => setSelectedCategory(c.value)}
                        activeOpacity={0.7}
                      >
                        <View style={[s.catIconBox, { backgroundColor: active ? c.color : c.bg }]}>
                          <Text style={s.catEmoji}>{c.emoji}</Text>
                        </View>
                        <Text style={[s.catLabel, active && { color: c.color, fontWeight: '800', fontFamily: FONTS.semiBold }]} numberOfLines={1}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Providers Section Header */}
              <View style={s.sectionHeaderRow}>
                <Text style={{ fontSize: 14 }}>⭐</Text>
                <Text style={s.sectionTitle}>
                  {selectedCategory === 'ALL' ? 'All Providers' : (CATEGORIES.find(c => c.value === selectedCategory)?.label || 'Providers')}
                </Text>
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{filteredProviders.length}</Text>
                </View>
                <Text style={s.sectionSubRight}>Verified & rated ✓</Text>
              </View>
            </>
          }
          renderItem={({ item }) => {
            const catCfg = CATEGORIES.find((c) => c.value === item.category) || CATEGORIES[0];
            return (
              <View style={[s.card, !item.available && { opacity: 0.6 }]}>
                <View style={[s.cardAccent, { backgroundColor: catCfg.color }]} />
                <View style={s.cardTopRow}>
                  <View style={[s.providerAvatar, { backgroundColor: catCfg.bg, borderWidth: 2, borderColor: catCfg.color + '30' }]}>
                    <Text style={s.providerAvatarEmoji}>{catCfg.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                      {item.verified && (
                        <View style={s.verifiedTag}>
                          <Ionicons name="checkmark-circle" size={12} color="#059669" />
                          <Text style={s.verifiedTagText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.cardSpeciality} numberOfLines={1}>{item.speciality}</Text>
                    <View style={s.pillRow}>
                      <View style={s.ratingPill}>
                        <Text style={{ fontSize: 10 }}>⭐</Text>
                        <Text style={s.ratingText}>{item.rating}</Text>
                        <Text style={s.ratingCount}>({item.reviewCount})</Text>
                      </View>
                      {item.priceRange && (
                        <View style={s.pricePill}>
                          <Text style={{ fontSize: 9 }}>💰</Text>
                          <Text style={s.priceText}>{item.priceRange}</Text>
                        </View>
                      )}
                      {item.experience && (
                        <View style={s.expPill}>
                          <Text style={{ fontSize: 9 }}>📅</Text>
                          <Text style={s.expText}>{item.experience}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={[s.availWrap, { backgroundColor: item.available ? '#DCFCE7' : '#FEF3C7' }]}>
                    <View style={[s.availDot, { backgroundColor: item.available ? '#059669' : '#F59E0B' }]} />
                    <Text style={[s.availText, { color: item.available ? '#059669' : '#D97706' }]}>
                      {item.available ? 'Free' : 'Busy'}
                    </Text>
                  </View>
                </View>

                <View style={s.cardActions}>
                  <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${item.phone}`)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 13 }}>📞</Text>
                    <Text style={s.callBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.bookBtn}
                    onPress={() => { setSelectedProvider(item); setBookIssue(''); setBookingModalVisible(true); }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bookBtnGrad}>
                      <Text style={{ fontSize: 13 }}>📅</Text>
                      <Text style={s.bookBtnText}>Book Visit</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}><Text style={{ fontSize: 36 }}>🔍</Text></View>
              <Text style={s.emptyTitle}>No providers found</Text>
              <Text style={s.emptySub}>Try a different category or search term</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
          ListHeaderComponent={
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.roleChips}>
                <TouchableOpacity
                  style={[s.roleChip, !selectedRole && s.roleChipActive]}
                  onPress={() => setSelectedRole(null)}
                >
                  <Text style={s.roleChipEmoji}>👥</Text>
                  <Text style={[s.roleChipText, !selectedRole && s.roleChipTextActive]}>All Staff</Text>
                </TouchableOpacity>
                {(['MAID', 'COOK', 'DRIVER', 'NANNY', 'GARDENER'] as StaffRole[]).map((role) => {
                  const rcfg = ROLE_CONFIG[role];
                  const active = selectedRole === role;
                  return (
                    <TouchableOpacity
                      key={role}
                      style={[s.roleChip, active && { backgroundColor: rcfg.bg, borderColor: rcfg.color }]}
                      onPress={() => setSelectedRole(active ? null : role)}
                    >
                      <Text style={s.roleChipEmoji}>{rcfg.emoji}</Text>
                      <Text style={[s.roleChipText, active && { color: rcfg.color, fontWeight: '700' }]}>{rcfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={s.sectionHeaderRow}>
                <Text style={{ fontSize: 14 }}>✅</Text>
                <Text style={s.sectionTitle}>Verified Staff Directory</Text>
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{domesticStaff.length}</Text>
                </View>
              </View>
            </>
          }
          renderItem={({ item: staff }) => {
            const rcfg = ROLE_CONFIG[staff.role] || ROLE_CONFIG.HELPER;
            return (
              <View style={[s.card, staff.status === 'ON_LEAVE' && { opacity: 0.6 }]}>
                <View style={[s.cardAccent, { backgroundColor: rcfg.color }]} />
                <View style={s.cardTopRow}>
                  <View style={[s.staffAvatar, { backgroundColor: rcfg.bg, borderWidth: 2, borderColor: rcfg.color + '30' }]}>
                    <Text style={{ fontSize: 20 }}>{rcfg.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.cardName}>{staff.name}</Text>
                      <View style={[s.roleBadge, { backgroundColor: rcfg.bg, borderWidth: 1, borderColor: rcfg.color + '40' }]}>
                        <Text style={[s.roleBadgeText, { color: rcfg.color }]}>{rcfg.label}</Text>
                      </View>
                    </View>
                    <Text style={s.cardSpeciality}>🕐 {staff.shiftTime} · 🏢 {staff.workingTowers}</Text>
                  </View>
                  <View style={s.salaryCol}>
                    <Text style={s.salaryValue}>₹{staff.monthlySalary.toLocaleString()}</Text>
                    <Text style={s.salaryUnit}>/month</Text>
                  </View>
                </View>

                <View style={s.verifyRow}>
                  {[
                    { done: staff.verified, label: 'ID Verified', emoji: '🪪' },
                    { done: staff.policeVerified, label: 'Police', emoji: '👮' },
                    { done: staff.aadhaarOnFile, label: 'Aadhaar', emoji: '🆔' },
                  ].map((v) => (
                    <View key={v.label} style={[s.verifyChip, v.done && s.verifyChipDone]}>
                      <Text style={{ fontSize: 10 }}>{v.emoji}</Text>
                      <Text style={[s.verifyChipText, v.done && { color: '#059669', fontWeight: '700' }]}>{v.label}</Text>
                      {v.done && <Text style={{ fontSize: 9 }}>✓</Text>}
                    </View>
                  ))}
                </View>

                <View style={s.staffMeta}>
                  <View style={s.metaTag}>
                    <Text style={{ fontSize: 11 }}>⭐</Text>
                    <Text style={s.metaTagText}>{staff.rating} ({staff.reviewCount})</Text>
                  </View>
                  <View style={s.metaTag}>
                    <Text style={{ fontSize: 11 }}>🏅</Text>
                    <Text style={s.metaTagText}>{staff.experience}</Text>
                  </View>
                  <View style={s.metaTag}>
                    <Text style={{ fontSize: 11 }}>🏠</Text>
                    <Text style={s.metaTagText}>{staff.workingFlats.length} flats</Text>
                  </View>
                </View>

                <View style={s.cardActions}>
                  <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(`tel:${staff.phone}`)} activeOpacity={0.7}>
                    <Text style={{ fontSize: 13 }}>📞</Text>
                    <Text style={s.primaryBtnText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.outlineBtn} onPress={() => setActiveTab('attendance')} activeOpacity={0.7}>
                    <Ionicons name="finger-print-outline" size={14} color="#4F46E5" />
                    <Text style={s.outlineBtnText}>Attendance</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}><Text style={{ fontSize: 36 }}>👥</Text></View>
              <Text style={s.emptyTitle}>No Staff Found</Text>
              <Text style={s.emptySub}>Your domestic staff will appear here once registered</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
          ListHeaderComponent={
            <>
              <View style={s.sectionHeaderRow}>
                <Text style={{ fontSize: 14 }}>📋</Text>
                <Text style={s.sectionTitle}>Today's Gate Log</Text>
                <Text style={s.sectionSubRight}>Live updates 🟢</Text>
              </View>
              {attSummary && (
                <View style={s.attStatsCard}>
                  {[
                    { label: 'Total',  value: attSummary.totalStaff, color: '#4F46E5', emoji: '👥' },
                    { label: 'In',     value: attSummary.checkedIn,  color: '#059669', emoji: '✅' },
                    { label: 'Out',    value: attSummary.checkedOut, color: '#2563EB', emoji: '🚪' },
                    { label: 'Leave',  value: attSummary.onLeave,   color: '#D97706', emoji: '📅' },
                    { label: 'Absent', value: attSummary.absent,    color: '#DC2626', emoji: '❌' },
                  ].map((st, i, arr) => (
                    <View key={st.label} style={{ flexDirection: 'row', flex: 1 }}>
                      <View style={s.attStatItem}>
                        <Text style={{ fontSize: 16 }}>{st.emoji}</Text>
                        <Text style={[s.attStatValue, { color: st.color }]}>{st.value}</Text>
                        <Text style={s.attStatLabel}>{st.label}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={s.attStatDivider} />}
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
                <View style={s.cardTopRow}>
                  <View style={[s.staffAvatar, { backgroundColor: rCfg.bg, borderWidth: 2, borderColor: rCfg.color + '30' }]}>
                    <Text style={{ fontSize: 18 }}>{rCfg.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{att.staffName}</Text>
                    <Text style={s.cardSpeciality}>{rCfg.emoji} {rCfg.label}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: aCfg.bg, borderWidth: 1, borderColor: aCfg.color + '30' }]}>
                    <Ionicons name={aCfg.icon} size={11} color={aCfg.color} />
                    <Text style={[s.statusBadgeText, { color: aCfg.color }]}>{aCfg.label}</Text>
                  </View>
                </View>

                {(att.checkInTime || att.checkOutTime) && (
                  <View style={s.timeRow}>
                    {att.checkInTime && (
                      <View style={[s.timeChip, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={{ fontSize: 11 }}>🟢</Text>
                        <Text style={s.timeText}>In: {att.checkInTime}</Text>
                        {att.checkInGate && <Text style={s.gateText}>({att.checkInGate})</Text>}
                      </View>
                    )}
                    {att.checkOutTime && (
                      <View style={[s.timeChip, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={{ fontSize: 11 }}>🔵</Text>
                        <Text style={s.timeText}>Out: {att.checkOutTime}</Text>
                        {att.checkOutGate && <Text style={s.gateText}>({att.checkOutGate})</Text>}
                      </View>
                    )}
                  </View>
                )}

                {att.markedBy && (
                  <Text style={s.markedBy}>👤 Marked by: {att.markedBy}</Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}><Text style={{ fontSize: 36 }}>📋</Text></View>
              <Text style={s.emptyTitle}>No Attendance Records</Text>
              <Text style={s.emptySub}>Staff gate entry/exit will be tracked by security</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
          ListHeaderComponent={
            <>
              <View style={s.salaryBanner}>
                <LinearGradient colors={['#1E1B4B', '#312E81', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.salaryBannerGrad}>
                  <View style={s.salaryBannerItem}>
                    <Text style={{ fontSize: 18 }}>💰</Text>
                    <Text style={s.salaryBannerLabel}>MONTHLY TOTAL</Text>
                    <Text style={s.salaryBannerValue}>₹{pkgStats.totalMonthly.toLocaleString()}</Text>
                  </View>
                  <View style={s.salaryBannerDivider} />
                  <View style={s.salaryBannerItem}>
                    <Text style={{ fontSize: 18 }}>🔴</Text>
                    <Text style={s.salaryBannerLabel}>OVERDUE</Text>
                    <Text style={[s.salaryBannerValue, { color: '#FCA5A5' }]}>{pkgStats.overdue}</Text>
                  </View>
                  <View style={s.salaryBannerDivider} />
                  <View style={s.salaryBannerItem}>
                    <Text style={{ fontSize: 18 }}>⏳</Text>
                    <Text style={s.salaryBannerLabel}>DUE SOON</Text>
                    <Text style={[s.salaryBannerValue, { color: '#FDE68A' }]}>{pkgStats.due}</Text>
                  </View>
                </LinearGradient>
              </View>
              <View style={[s.sectionHeaderRow, { marginTop: 12 }]}>
                <Text style={{ fontSize: 14 }}>💳</Text>
                <Text style={s.sectionTitle}>Staff Packages & Payments</Text>
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{packages.length}</Text>
                </View>
              </View>
            </>
          }
          renderItem={({ item: pkg }) => {
            const rCfg = ROLE_CONFIG[pkg.role] || ROLE_CONFIG.HELPER;
            const pCfg = PAYMENT_CONFIG[pkg.paymentStatus] || PAYMENT_CONFIG.DUE;
            return (
              <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: pCfg.color }]}>
                <View style={s.cardTopRow}>
                  <View style={[s.staffAvatar, { backgroundColor: rCfg.bg, borderWidth: 2, borderColor: rCfg.color + '30' }]}>
                    <Text style={{ fontSize: 18 }}>{rCfg.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{pkg.staffName}</Text>
                    <Text style={s.cardSpeciality}>{rCfg.emoji} {rCfg.label} · 🏠 {pkg.flatNumber}</Text>
                  </View>
                  <View style={s.salaryCol}>
                    <Text style={s.salaryValue}>₹{pkg.monthlySalary.toLocaleString()}</Text>
                    <View style={[s.statusBadge, { backgroundColor: pCfg.bg, borderWidth: 1, borderColor: pCfg.color + '30' }]}>
                      <Text style={{ fontSize: 9 }}>{pCfg.emoji}</Text>
                      <Text style={[s.statusBadgeText, { color: pCfg.color }]}>{pCfg.label}</Text>
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

                <View style={s.pkgMeta}>
                  {pkg.lastPaidDate && (
                    <View style={s.metaTag}>
                      <Text style={{ fontSize: 10 }}>✅</Text>
                      <Text style={s.metaTagText}>Paid: {pkg.lastPaidDate}</Text>
                    </View>
                  )}
                  <View style={s.metaTag}>
                    <Text style={{ fontSize: 10 }}>{pCfg.emoji}</Text>
                    <Text style={[s.metaTagText, { color: pCfg.color, fontWeight: '700' }]}>Next: {pkg.nextDueDate}</Text>
                  </View>
                </View>

                {pkg.paymentStatus !== 'PAID' && (
                  <TouchableOpacity
                    style={s.payBtn}
                    onPress={() => Alert.alert('Pay Salary', `Mark ₹${pkg.monthlySalary.toLocaleString()} as paid for ${pkg.staffName}?`, [
                      { text: 'Cancel' },
                      { text: 'Mark Paid' },
                    ])}
                    activeOpacity={0.7}
                  >
                    <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.payBtnGrad}>
                      <Text style={{ fontSize: 12 }}>💸</Text>
                      <Text style={s.payBtnText}>Mark Paid</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}><Text style={{ fontSize: 36 }}>💰</Text></View>
              <Text style={s.emptyTitle}>No Packages</Text>
              <Text style={s.emptySub}>Your staff salary packages will appear here</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
          ListHeaderComponent={
            <View style={s.jobsHeaderRow}>
              <View>
                <View style={s.sectionHeaderRow}>
                  <Text style={{ fontSize: 14 }}>📢</Text>
                  <Text style={s.sectionTitle}>Staff Job Requirements</Text>
                </View>
                <Text style={s.sectionSub}>Post what you need, find verified help ✨</Text>
              </View>
              <TouchableOpacity style={s.postJobBtn} onPress={() => setJobModalVisible(true)} activeOpacity={0.7}>
                <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.postJobBtnGrad}>
                  <Text style={{ fontSize: 13 }}>➕</Text>
                  <Text style={s.postJobBtnText}>Post Job</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: job }) => {
            const rCfg = ROLE_CONFIG[job.role] || ROLE_CONFIG.HELPER;
            const statusColor = job.status === 'OPEN' ? '#059669' : job.status === 'FILLED' ? '#2563EB' : '#6B7280';
            const statusBg = job.status === 'OPEN' ? '#DCFCE7' : job.status === 'FILLED' ? '#DBEAFE' : '#F1F5F9';
            const statusEmoji = job.status === 'OPEN' ? '🟢' : job.status === 'FILLED' ? '🔵' : '⚪';
            return (
              <View style={s.card}>
                <View style={[s.cardAccent, { backgroundColor: rCfg.color }]} />
                <View style={s.cardTopRow}>
                  <View style={[s.staffAvatar, { backgroundColor: rCfg.bg, borderWidth: 2, borderColor: rCfg.color + '30' }]}>
                    <Text style={{ fontSize: 18 }}>{rCfg.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{job.title}</Text>
                    <Text style={s.cardSpeciality}>🏢 {job.tower || ''} {job.flatNumber} · 👤 {job.postedBy}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: statusBg, borderWidth: 1, borderColor: statusColor + '30' }]}>
                    <Text style={{ fontSize: 9 }}>{statusEmoji}</Text>
                    <Text style={[s.statusBadgeText, { color: statusColor }]}>{job.status}</Text>
                  </View>
                </View>

                <Text style={s.jobDesc} numberOfLines={2}>{job.description}</Text>

                <View style={s.jobDetails}>
                  <View style={[s.metaTag, s.jobDetailChip]}>
                    <Text style={{ fontSize: 11 }}>💰</Text>
                    <Text style={[s.metaTagText, { color: '#059669', fontWeight: '700' }]}>{job.salaryRange}</Text>
                  </View>
                  <View style={[s.metaTag, s.jobDetailChip]}>
                    <Text style={{ fontSize: 11 }}>⏰</Text>
                    <Text style={s.metaTagText}>{job.shiftPreference}</Text>
                  </View>
                  <View style={[s.metaTag, s.jobDetailChip]}>
                    <Text style={{ fontSize: 11 }}>👥</Text>
                    <Text style={[s.metaTagText, { color: '#4F46E5', fontWeight: '700' }]}>{job.applicantCount} applicants</Text>
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

                <Text style={s.postedDate}>🕐 Posted {job.postedAt}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}><Text style={{ fontSize: 36 }}>📢</Text></View>
              <Text style={s.emptyTitle}>No Job Posts</Text>
              <Text style={s.emptySub}>Post a requirement to find verified domestic help</Text>
              <TouchableOpacity style={[s.postJobBtn, { marginTop: 12 }]} onPress={() => setJobModalVisible(true)}>
                <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.postJobBtnGrad}>
                  <Text style={{ fontSize: 13 }}>➕</Text>
                  <Text style={s.postJobBtnText}>Post Job</Text>
                </LinearGradient>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />}
          ListHeaderComponent={
            <View style={s.sectionHeaderRow}>
              <Text style={{ fontSize: 14 }}>🗓️</Text>
              <Text style={s.sectionTitle}>My Service Bookings</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{bookings.length}</Text>
              </View>
            </View>
          }
          renderItem={({ item: bk }) => {
            const isCancelled = bk.status === 'CANCELLED';
            const statusColor = isCancelled ? '#DC2626' : bk.status === 'COMPLETED' ? '#2563EB' : bk.status === 'IN_PROGRESS' ? '#4F46E5' : '#059669';
            const statusBg = isCancelled ? '#FEE2E2' : bk.status === 'COMPLETED' ? '#DBEAFE' : bk.status === 'IN_PROGRESS' ? '#EEF2FF' : '#DCFCE7';
            const statusEmoji = isCancelled ? '❌' : bk.status === 'COMPLETED' ? '✅' : bk.status === 'IN_PROGRESS' ? '🔄' : '📋';
            return (
              <View style={[s.card, { borderTopWidth: 3, borderTopColor: statusColor }, isCancelled && { opacity: 0.55 }]}>
                <View style={s.cardTopRow}>
                  <View style={[s.statusBadge, { backgroundColor: statusBg, borderWidth: 1, borderColor: statusColor + '30' }]}>
                    <Text style={{ fontSize: 10 }}>{statusEmoji}</Text>
                    <Text style={[s.statusBadgeText, { color: statusColor }]}>{bk.status}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <Text style={s.bookingId}>#{bk.id}</Text>
                </View>
                <Text style={s.cardName}>👤 {bk.providerName}</Text>
                <Text style={s.cardSpeciality}>🔧 {bk.issue}</Text>
                <View style={s.bookingMeta}>
                  <View style={[s.metaTag, s.bookingMetaChip]}>
                    <Text style={{ fontSize: 11 }}>📅</Text>
                    <Text style={s.metaTagText}>{bk.date}</Text>
                  </View>
                  <View style={[s.metaTag, s.bookingMetaChip]}>
                    <Text style={{ fontSize: 11 }}>🕐</Text>
                    <Text style={s.metaTagText}>{bk.timeSlot}</Text>
                  </View>
                </View>
                {bk.status === 'CONFIRMED' && (
                  <View style={s.cardActions}>
                    <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(`tel:${bk.phone}`)} activeOpacity={0.7}>
                      <Text style={{ fontSize: 13 }}>📞</Text>
                      <Text style={s.primaryBtnText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.outlineBtn, { borderColor: '#FCA5A5' }]}
                      onPress={() => Alert.alert('Cancel', 'Cancel this booking?', [
                        { text: 'Keep' },
                        { text: 'Cancel', style: 'destructive', onPress: () => cancelMutation.mutate(bk.id) },
                      ])}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 12 }}>❌</Text>
                      <Text style={[s.outlineBtnText, { color: '#DC2626' }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <View style={s.emptyIconCircle}><Text style={{ fontSize: 36 }}>🗓️</Text></View>
              <Text style={s.emptyTitle}>No Bookings</Text>
              <Text style={s.emptySub}>Book a service provider to get started</Text>
              <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setActiveTab('providers')} activeOpacity={0.7}>
                <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.emptyCta}>
                  <Text style={{ fontSize: 13 }}>🛠️</Text>
                  <Text style={s.emptyCtaText}>Browse Services</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── Booking Modal ── */}
      <Modal visible={bookingModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalAccent} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>📅 Book Service Visit</Text>
                {selectedProvider && <Text style={s.modalSub}>{selectedProvider.name} · {selectedProvider.category}</Text>}
              </View>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)} style={s.modalClose}>
                <Text style={{ fontSize: 14 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>📆 Preferred Day</Text>
            <View style={s.choiceRow}>
              {['Today', 'Tomorrow', 'Weekend'].map((d) => (
                <TouchableOpacity key={d} style={[s.choiceChip, bookDate === d && s.choiceChipActive]} onPress={() => setBookDate(d)}>
                  <Text style={[s.choiceChipText, bookDate === d && s.choiceChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>🕐 Time Slot</Text>
            {['Morning (9 AM - 12 PM)', 'Afternoon (12 PM - 3 PM)', 'Evening (3 PM - 7 PM)'].map((slot) => (
              <TouchableOpacity
                key={slot}
                style={[s.slotItem, bookTimeSlot === slot && s.slotItemActive]}
                onPress={() => setBookTimeSlot(slot)}
              >
                <Text style={[s.slotItemText, bookTimeSlot === slot && s.slotItemTextActive]}>{slot}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.fieldLabel}>📝 Describe Issue (Optional)</Text>
            <TextInput
              style={[s.fieldInput, { height: 60, textAlignVertical: 'top' }]}
              placeholder="e.g. Bathroom pipe leak…"
              placeholderTextColor="#94A3B8"
              value={bookIssue}
              onChangeText={setBookIssue}
              multiline
            />

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setBookingModalVisible(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirmBtn, bookMutation.isPending && { opacity: 0.6 }]}
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
                {bookMutation.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                  <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalConfirmGrad}>
                    <Text style={s.modalConfirmText}>✅ Confirm Booking</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Job Post Modal ── */}
      <Modal visible={jobModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalAccent, { backgroundColor: '#7C3AED' }]} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>📢 Post Job Requirement</Text>
                <TouchableOpacity onPress={() => setJobModalVisible(false)} style={s.modalClose}>
                  <Text style={{ fontSize: 14 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={s.fieldLabel}>✏️ Title *</Text>
              <TextInput style={s.fieldInput} value={jobTitle} onChangeText={setJobTitle} placeholder="e.g. Full-time Maid Needed" placeholderTextColor="#94A3B8" />

              <Text style={s.fieldLabel}>👤 Role</Text>
              <View style={[s.choiceRow, { flexWrap: 'wrap' }]}>
                {(['MAID', 'COOK', 'DRIVER', 'NANNY', 'GARDENER', 'HELPER'] as StaffRole[]).map((r) => {
                  const rcfg = ROLE_CONFIG[r];
                  return (
                    <TouchableOpacity key={r} style={[s.choiceChip, { minWidth: 70 }, jobRole === r && { backgroundColor: rcfg.bg, borderColor: rcfg.color }]} onPress={() => setJobRole(r)}>
                      <Text style={{ fontSize: 12 }}>{rcfg.emoji}</Text>
                      <Text style={[s.choiceChipText, jobRole === r && { color: rcfg.color, fontWeight: '700' }]}>{rcfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.fieldLabel}>📋 Description *</Text>
              <TextInput style={[s.fieldInput, { height: 70, textAlignVertical: 'top' }]} value={jobDesc} onChangeText={setJobDesc} placeholder="Describe what you need…" placeholderTextColor="#94A3B8" multiline />

              <Text style={s.fieldLabel}>💰 Salary Range</Text>
              <TextInput style={s.fieldInput} value={jobSalary} onChangeText={setJobSalary} placeholder="e.g. ₹3,500 – ₹4,500/mo" placeholderTextColor="#94A3B8" />

              <Text style={s.fieldLabel}>⏰ Shift Preference</Text>
              <TextInput style={s.fieldInput} value={jobShift} onChangeText={setJobShift} placeholder="e.g. Morning (7 AM – 11 AM)" placeholderTextColor="#94A3B8" />

              <View style={s.modalBtnRow}>
                <TouchableOpacity style={s.modalCancelBtn} onPress={() => setJobModalVisible(false)}>
                  <Text style={s.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalConfirmBtn, jobMutation.isPending && { opacity: 0.6 }]}
                  disabled={jobMutation.isPending}
                  onPress={() => {
                    if (!jobTitle.trim()) { Alert.alert('Required', 'Enter job title.'); return; }
                    if (!jobDesc.trim()) { Alert.alert('Required', 'Enter description.'); return; }
                    jobMutation.mutate();
                  }}
                >
                  {jobMutation.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                    <LinearGradient colors={['#4F46E5', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.modalConfirmGrad}>
                      <Text style={s.modalConfirmText}>📢 Post Job</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GROWW_THEME.background },
  listContent: { padding: 16, paddingBottom: 40, gap: 12 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.medium },

  // ── Gradient Header ──────────────────────────────────────────
  cleanHeader: {
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: GROWW_THEME.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: GROWW_THEME.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GROWW_THEME.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: GROWW_THEME.textPrimary,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  headerSub: {
    fontSize: 11,
    color: GROWW_THEME.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: GROWW_THEME.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GROWW_THEME.border,
  },
  headerIconBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: '#FFFFFF',
  },
  headerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
    ...SHADOWS.sm,
  },
  headerSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: GROWW_THEME.brandDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: FONTS.semiBold,
  },

  // ── Stats Strip ──────────────────────────────────────────────
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: GROWW_THEME.surfaceMuted,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: GROWW_THEME.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statEmojiHalo: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statEmoji: { fontSize: 14 },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    fontFamily: FONTS.medium,
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  // ── Tab Bar ──────────────────────────────────────────────────
  tabBar: {
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    ...SHADOWS.sm,
  },
  tabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4F46E5',
  },
  tabEmoji: { fontSize: 13 },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
    fontFamily: FONTS.semiBold,
  },

  // ── Category Grid ────────────────────────────────────────────
  catSection: { marginBottom: 10 },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  catItem: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: { fontSize: 20 },
  catLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: FONTS.medium,
  },

  // ── Section Header ───────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 20,
    fontFamily: FONTS.regular,
  },
  sectionSubRight: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 'auto',
    fontFamily: FONTS.regular,
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    fontFamily: FONTS.semiBold,
  },

  // ── Cards ────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    gap: 10,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerAvatarEmoji: { fontSize: 24 },
  staffAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  verifiedTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    fontFamily: FONTS.semiBold,
  },
  verifiedBadge: { marginTop: 1 },
  cardSpeciality: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: '#D97706', fontFamily: FONTS.semiBold },
  ratingCount: { fontSize: 9, color: '#B45309' },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  priceText: { fontSize: 10, fontWeight: '700', color: '#4F46E5', fontFamily: FONTS.semiBold },
  expPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', fontFamily: FONTS.medium },
  availWrap: {
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 9, fontWeight: '800', fontFamily: FONTS.semiBold },

  // Card Actions
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callBtnText: { color: '#059669', fontSize: 12, fontWeight: '700', fontFamily: FONTS.semiBold },
  bookBtn: { flex: 2, borderRadius: RADIUS.md, overflow: 'hidden' },
  bookBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  bookBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: FONTS.semiBold },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#4F46E5',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: FONTS.semiBold },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  outlineBtnText: { color: '#4F46E5', fontSize: 12, fontWeight: '700', fontFamily: FONTS.semiBold },
  payBtn: {
    alignSelf: 'flex-end',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  payBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  payBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: FONTS.semiBold },

  // Role badges
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.semiBold },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: FONTS.semiBold },

  // Staff verify
  verifyRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  verifyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verifyChipDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  verifyChipText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },

  // Meta tags
  staffMeta: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTagText: { fontSize: 10.5, color: COLORS.textMuted, fontFamily: FONTS.regular },
  salaryCol: { alignItems: 'flex-end', gap: 3 },
  salaryValue: { fontSize: 16, fontWeight: '900', color: '#312E81', fontFamily: FONTS.displayBold },
  salaryUnit: { fontSize: 9, color: COLORS.textMuted, fontFamily: FONTS.regular },

  // Attendance
  attStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  attStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  attStatDivider: { width: 1, height: 36, backgroundColor: '#E8E8F0', alignSelf: 'center' },
  attStatValue: { fontSize: 20, fontWeight: '900', fontFamily: FONTS.displayBold },
  attStatLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: FONTS.medium, fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: { fontSize: 11, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.semiBold },
  gateText: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.regular },
  markedBy: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.regular },

  // Salary banner
  salaryBanner: { borderRadius: 18, overflow: 'hidden', marginBottom: 4 },
  salaryBannerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  salaryBannerItem: { flex: 1, alignItems: 'center', gap: 4 },
  salaryBannerLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, fontFamily: FONTS.medium },
  salaryBannerValue: { fontSize: 19, fontWeight: '900', color: '#FFFFFF', fontFamily: FONTS.displayBold },
  salaryBannerDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.12)' },
  servicesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  serviceChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceChipText: { fontSize: 10, color: COLORS.textSecondary, fontFamily: FONTS.medium, fontWeight: '600' },
  pkgMeta: { flexDirection: 'row', gap: 14 },

  // Jobs
  jobsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  postJobBtn: { borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.sm },
  postJobBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  postJobBtnText: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: FONTS.semiBold },
  jobDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, fontFamily: FONTS.regular },
  jobDetails: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  jobDetailChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  postedDate: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.regular },

  // Bookings
  bookingId: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.medium, fontWeight: '600' },
  bookingMeta: { flexDirection: 'row', gap: 10, marginTop: 4 },
  bookingMetaChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },

  // Role chips
  roleChips: { gap: 7, marginBottom: 10 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  roleChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    ...SHADOWS.sm,
  },
  roleChipEmoji: { fontSize: 14 },
  roleChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, fontFamily: FONTS.medium },
  roleChipTextActive: { color: '#4F46E5', fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.displayBold },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 40, fontFamily: FONTS.regular, lineHeight: 18 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  emptyCtaText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.semiBold },

  // ── Modals ───────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    maxHeight: '88%',
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#4F46E5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.displayBold },
  modalSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 3, fontFamily: FONTS.regular },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
    fontFamily: FONTS.semiBold,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  choiceRow: { flexDirection: 'row', gap: 6 },
  choiceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    backgroundColor: '#F8FAFC',
  },
  choiceChipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5', borderWidth: 1.5 },
  choiceChipText: { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.medium },
  choiceChipTextActive: { color: '#4F46E5', fontWeight: '700' },
  slotItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 5,
  },
  slotItemActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5', borderWidth: 1.5 },
  slotItemText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  slotItemTextActive: { color: '#4F46E5', fontWeight: '700' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  modalCancelText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONTS.medium },
  modalConfirmBtn: {
    flex: 1.5,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  modalConfirmGrad: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: { fontSize: 13, fontWeight: '800', color: '#fff', fontFamily: FONTS.semiBold },
});
