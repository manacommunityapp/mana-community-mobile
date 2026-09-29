import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, BackHandler, Linking,
  TextInput, Modal, Alert, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import {
  homeServicesService,
  HomeHelpWorkerDto,
  HomeServiceBookingDto,
} from '@/services/homeServicesService';

type ServiceCategory =
  | 'ALL'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'CLEANING'
  | 'APPLIANCE'
  | 'CARPENTRY'
  | 'PAINTING'
  | 'MAID'
  | 'PEST_CONTROL';

interface CategoryConfig {
  value: ServiceCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const CATEGORIES: CategoryConfig[] = [
  { value: 'ALL',          label: 'All Services', icon: 'grid-outline',          color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'PLUMBING',     label: 'Plumbing',     icon: 'water-outline',         color: '#0284C7', bg: '#E0F2FE' },
  { value: 'ELECTRICAL',   label: 'Electrical',   icon: 'flash-outline',         color: '#D97706', bg: '#FEF3C7' },
  { value: 'CLEANING',     label: 'Cleaning',     icon: 'sparkles-outline',      color: '#059669', bg: '#D1FAE5' },
  { value: 'APPLIANCE',    label: 'Appliance',    icon: 'tv-outline',            color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'CARPENTRY',    label: 'Carpentry',    icon: 'hammer-outline',        color: '#B45309', bg: '#FEF3C7' },
  { value: 'PAINTING',     label: 'Painting',     icon: 'color-palette-outline', color: '#DB2777', bg: '#FCE7F3' },
  { value: 'MAID',         label: 'Maid & Cook',  icon: 'people-outline',        color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'PEST_CONTROL', label: 'Pest Control', icon: 'bug-outline',           color: '#DC2626', bg: '#FEE2E2' },
];

export default function ServicesScreen({ isTab = false }: { isTab?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PROVIDERS' | 'BOOKINGS'>('PROVIDERS');
  const [refreshing, setRefreshing] = useState(false);

  // Booking modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<HomeHelpWorkerDto | null>(null);
  const [bookIssue, setBookIssue] = useState('');
  const [bookDate, setBookDate] = useState('Today');
  const [bookTimeSlot, setBookTimeSlot] = useState('Morning (9 AM - 12 PM)');

  // ── Queries ─────────────────────────────────────────────────────────────
  const {
    data: providers = [],
    isLoading: loadingProviders,
    refetch: refetchProviders,
  } = useQuery<HomeHelpWorkerDto[]>({
    queryKey: ['home-services-workers', selectedCategory],
    queryFn: () => homeServicesService.getWorkers(selectedCategory),
  });

  const {
    data: bookings = [],
    isLoading: loadingBookings,
    refetch: refetchBookings,
  } = useQuery<HomeServiceBookingDto[]>({
    queryKey: ['home-services-bookings'],
    queryFn: () => homeServicesService.getMyBookings(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProviders(), refetchBookings()]);
    setRefreshing(false);
  }, [refetchProviders, refetchBookings]);

  // ── Mutations ───────────────────────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: (data: Parameters<typeof homeServicesService.bookWorker>[0]) =>
      homeServicesService.bookWorker(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['home-services-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['home-services-workers'] });
      setBookingModalVisible(false);
      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your service request #${res.bookingId} has been submitted for ${selectedProvider?.name}. They will reach out shortly.`,
        [
          { text: 'View Bookings', onPress: () => setActiveTab('BOOKINGS') },
          { text: 'OK' },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert('Booking Failed', err?.message || 'Could not schedule booking. Please try again.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => homeServicesService.cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-services-bookings'] });
      Alert.alert('Booking Cancelled', 'Your service request has been cancelled.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to cancel booking.');
    },
  });

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this service visit request?',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(bookingId),
        },
      ]
    );
  };

  const goHome = useCallback(() => {
    if (isTab) return;
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router, isTab]);

  useFocusEffect(
    useCallback(() => {
      if (isTab) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, isTab])
  );

  const filteredProviders = useMemo(() => {
    let list = providers;
    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p.category?.toUpperCase() === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.speciality?.toLowerCase().includes(q) ||
          p.workingInTowers?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [providers, selectedCategory, searchQuery]);

  const handleOpenBooking = (provider: HomeHelpWorkerDto) => {
    setSelectedProvider(provider);
    setBookIssue('');
    setBookingModalVisible(true);
  };

  const handleConfirmBooking = () => {
    if (!selectedProvider) return;
    bookMutation.mutate({
      workerId: selectedProvider.id,
      providerName: selectedProvider.name,
      phone: selectedProvider.phone,
      category: selectedProvider.category,
      slotDate: bookDate,
      timeSlot: bookTimeSlot,
      requirementsNotes: bookIssue.trim() || `${selectedProvider.category} service visit`,
    });
  };

  const renderProviderCard = ({ item }: { item: HomeHelpWorkerDto }) => {
    const catConfig = CATEGORIES.find((c) => c.value === item.category) || CATEGORIES[0];
    return (
      <View style={[s.card, !item.available && s.cardDimmed]}>
        {/* Top Header Row */}
        <View style={s.cardTop}>
          <View style={[s.providerIconWrap, { backgroundColor: catConfig.bg }]}>
            <Ionicons name={catConfig.icon} size={22} color={catConfig.color} />
          </View>

          <View style={s.cardHeaderInfo}>
            <View style={s.nameBadgeRow}>
              <Text style={s.providerName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified && (
                <View style={s.verifiedPill}>
                  <Ionicons name="checkmark-circle" size={11} color="#059669" />
                  <Text style={s.verifiedText}>VERIFIED</Text>
                </View>
              )}
            </View>

            <Text style={s.specialityText} numberOfLines={2}>
              {item.speciality}
            </Text>
          </View>
        </View>

        {/* Rating, Price & Status Bar */}
        <View style={s.metricsRow}>
          <View style={s.ratingPill}>
            <Ionicons name="star" size={12} color="#D97706" />
            <Text style={s.ratingNum}>{item.rating}</Text>
            <Text style={s.reviewCount}>({item.reviewCount})</Text>
          </View>

          <View style={s.pricePill}>
            <Text style={s.priceText}>{item.priceRange}</Text>
          </View>

          <View style={[s.statusPill, item.available ? s.statusAvailable : s.statusBusy]}>
            <View style={[s.statusDot, item.available ? s.dotGreen : s.dotAmber]} />
            <Text style={[s.statusText, item.available ? s.textGreen : s.textAmber]}>
              {item.statusText}
            </Text>
          </View>
        </View>

        {/* Experience & Flats tag row */}
        <View style={s.tagsRow}>
          <View style={s.tagItem}>
            <Ionicons name="ribbon-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.tagText}>{item.experience}</Text>
          </View>
          <View style={s.tagItem}>
            <Ionicons name="business-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.tagText}>{item.workingInTowers}</Text>
          </View>
          <View style={s.tagItem}>
            <Ionicons name="home-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.tagText}>{item.flatsServed}+ flats served</Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.callBtn}
            onPress={() => Linking.openURL(`tel:${item.phone}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={15} color="#fff" />
            <Text style={s.callBtnText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.chatBtn}
            onPress={() => Linking.openURL(`https://wa.me/${item.phone.replace(/[^0-9]/g, '')}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={COLORS.primary} />
            <Text style={s.chatBtnText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.bookBtn}
            onPress={() => handleOpenBooking(item)}
            activeOpacity={0.8}
          >
            <Text style={s.bookBtnText}>Book Visit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBookingCard = ({ item }: { item: HomeServiceBookingDto }) => {
    const isCancelled = item.status === 'CANCELLED';
    const isCompleted = item.status === 'COMPLETED';
    const isConfirmed = item.status === 'CONFIRMED';

    return (
      <View style={[s.bookingCard, isCancelled && s.bookingCardCancelled]}>
        <View style={s.bookingTop}>
          <View
            style={[
              s.bookingBadgeConfirmed,
              isCancelled && s.bookingBadgeCancelled,
              item.status === 'IN_PROGRESS' && s.bookingBadgeInProgress,
              isCompleted && s.bookingBadgeCompleted,
            ]}
          >
            <Ionicons
              name={
                isCancelled
                  ? 'close-circle'
                  : isCompleted
                  ? 'checkmark-done-circle'
                  : 'checkmark-circle'
              }
              size={13}
              color={
                isCancelled
                  ? COLORS.error
                  : isCompleted
                  ? '#2563EB'
                  : item.status === 'IN_PROGRESS'
                  ? COLORS.primary
                  : '#059669'
              }
            />
            <Text
              style={[
                s.bookingBadgeText,
                isCancelled && { color: COLORS.error },
                isCompleted && { color: '#2563EB' },
                item.status === 'IN_PROGRESS' && { color: COLORS.primary },
              ]}
            >
              {item.status}
            </Text>
          </View>
          <Text style={s.bookingIdText}>{item.id}</Text>
        </View>

        <Text style={s.bookingProvider}>{item.providerName}</Text>
        <Text style={s.bookingIssue}>{item.issue}</Text>

        <View style={s.bookingMetaRow}>
          <View style={s.bookingMetaItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
            <Text style={s.bookingMetaText}>{item.date}</Text>
          </View>
          <View style={s.bookingMetaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.primary} />
            <Text style={s.bookingMetaText}>{item.timeSlot}</Text>
          </View>
        </View>

        <View style={s.bookingActionRow}>
          {!isCancelled && (
            <TouchableOpacity
              style={s.bookingCallBtn}
              onPress={() => Linking.openURL(`tel:${item.phone}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={14} color="#fff" />
              <Text style={s.bookingCallText}>Call Technician</Text>
            </TouchableOpacity>
          )}

          {isConfirmed && (
            <TouchableOpacity
              style={s.bookingCancelBtn}
              onPress={() => handleCancelBooking(item.id)}
              disabled={cancelMutation.isPending}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={14} color={COLORS.error} />
              <Text style={s.bookingCancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Top Header ────────────────────────────────────────────── */}
      <View style={s.header}>
        {!isTab && (
          <TouchableOpacity onPress={goHome} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
        )}
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>Home Services</Text>
          <Text style={s.headerSub}>Verified community technicians & helpers</Text>
        </View>
        <TouchableOpacity
          style={[s.headerIconBtn, activeTab === 'BOOKINGS' && s.headerIconBtnActive]}
          onPress={() => setActiveTab(activeTab === 'PROVIDERS' ? 'BOOKINGS' : 'PROVIDERS')}
          hitSlop={8}
        >
          <Ionicons
            name={activeTab === 'BOOKINGS' ? 'construct' : 'receipt-outline'}
            size={20}
            color={activeTab === 'BOOKINGS' ? COLORS.primary : COLORS.text}
          />
          {bookings.length > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{bookings.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'PROVIDERS' ? (
        <FlatList
          data={filteredProviders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProviderCard}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            <>
              {/* ── Hero Gradient Banner ─────────────────────────────── */}
              <LinearGradient
                colors={['#3730A3', '#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.heroBanner}
              >
                <View style={s.heroContent}>
                  <View style={s.heroBadge}>
                    <Ionicons name="shield-checkmark" size={12} color="#4F46E5" />
                    <Text style={s.heroBadgeText}>SOCIETY VERIFIED TECHS</Text>
                  </View>
                  <Text style={s.heroTitle}>Need quick repairs at home?</Text>
                  <Text style={s.heroSub}>
                    Plumbing, electrical, AC, cleaning & carpentry by trusted on-campus helpers.
                  </Text>
                </View>

                {/* 24x7 On-Duty Hotline Strip */}
                <View style={s.hotlineRow}>
                  <View style={s.hotlineLeft}>
                    <Ionicons name="flash" size={14} color="#FDE047" />
                    <Text style={s.hotlineText}>24x7 Electrician & Plumber on Duty</Text>
                  </View>
                  <TouchableOpacity
                    style={s.hotlineCallBtn}
                    onPress={() => Alert.alert('Emergency Hotline', 'Please contact your society helpdesk for the on-duty technician number.')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={12} color="#1E1B4B" />
                    <Text style={s.hotlineCallText}>Emergency Call</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* ── Search Bar ───────────────────────────────────────── */}
              <View style={s.searchWrap}>
                <View style={s.searchBar}>
                  <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search electrician, plumber, AC repair, maid..."
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* ── Category Chips Carousel ──────────────────── */}
              <View style={s.categoriesSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.categoriesScroll}
                >
                  {CATEGORIES.map((c) => {
                    const active = selectedCategory === c.value;
                    return (
                      <TouchableOpacity
                        key={c.value}
                        style={[
                          s.categoryChip,
                          active && { backgroundColor: c.color, borderColor: c.color },
                        ]}
                        onPress={() => setSelectedCategory(c.value)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={c.icon}
                          size={15}
                          color={active ? '#fff' : c.color}
                        />
                        <Text style={[s.categoryChipText, active && s.categoryChipTextActive]}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── Section Title ─────────────────────────────────────── */}
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>
                  {selectedCategory === 'ALL'
                    ? 'Available Technicians'
                    : `${CATEGORIES.find((c) => c.value === selectedCategory)?.label} Specialists`}
                </Text>
                <Text style={s.sectionCount}>{filteredProviders.length} providers</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            loadingProviders ? (
              <View style={s.emptyState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={s.emptyTitle}>Loading technicians...</Text>
              </View>
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="construct-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>No technicians found</Text>
                <Text style={s.emptySub}>
                  Try adjusting your search query or selecting a different service category.
                </Text>
              </View>
            )
          }
        />
      ) : (
        /* ── My Bookings Tab View ─────────────────────────────────── */
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingCard}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={
            <View style={s.bookingsHeader}>
              <Text style={s.sectionTitle}>My Service Requests</Text>
              <Text style={s.sectionCount}>{bookings.length} requests</Text>
            </View>
          }
          ListEmptyComponent={
            loadingBookings ? (
              <View style={s.emptyState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={s.emptyTitle}>Loading bookings...</Text>
              </View>
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>No service bookings yet</Text>
                <Text style={s.emptySub}>
                  Book a technician from the services directory and your scheduled visits will appear here.
                </Text>
              </View>
            )
          }
        />
      )}

      {/* ── Booking Modal ─────────────────────────────────────────── */}
      <Modal visible={bookingModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Book Service Visit</Text>
                <Text style={s.modalSub}>{selectedProvider?.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setBookingModalVisible(false)}
                style={s.modalCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.modalBody}>
              {/* Preferred Day */}
              <Text style={s.fieldLabel}>PREFERRED DAY</Text>
              <View style={s.pillRow}>
                {['Today', 'Tomorrow', 'This Weekend'].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[s.modalPill, bookDate === day && s.modalPillActive]}
                    onPress={() => setBookDate(day)}
                  >
                    <Text style={[s.modalPillText, bookDate === day && s.modalPillTextActive]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preferred Time Slot */}
              <Text style={[s.fieldLabel, { marginTop: 14 }]}>TIME SLOT</Text>
              <View style={s.slotColumn}>
                {[
                  { slot: 'Morning (9 AM - 12 PM)', icon: 'sunny-outline' },
                  { slot: 'Afternoon (12 PM - 3 PM)', icon: 'partly-sunny-outline' },
                  { slot: 'Evening (3 PM - 7 PM)', icon: 'moon-outline' },
                ].map(({ slot, icon }) => (
                  <TouchableOpacity
                    key={slot}
                    style={[s.slotCard, bookTimeSlot === slot && s.slotCardActive]}
                    onPress={() => setBookTimeSlot(slot)}
                  >
                    <Ionicons
                      name={icon as any}
                      size={16}
                      color={bookTimeSlot === slot ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[s.slotText, bookTimeSlot === slot && s.slotTextActive]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Problem Description */}
              <Text style={[s.fieldLabel, { marginTop: 14 }]}>DESCRIBE ISSUE (OPTIONAL)</Text>
              <TextInput
                style={s.issueInput}
                placeholder="e.g. Bathroom pipe leakage under sink, water pressure issue..."
                placeholderTextColor={COLORS.textMuted}
                value={bookIssue}
                onChangeText={setBookIssue}
                multiline
                numberOfLines={3}
              />

              <View style={s.estimateBox}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                <Text style={s.estimateText}>
                  Standard visiting fee: {selectedProvider?.priceRange}. Direct payment upon completion.
                </Text>
              </View>
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity
                style={[s.modalConfirmBtn, bookMutation.isPending && { opacity: 0.6 }]}
                onPress={handleConfirmBooking}
                disabled={bookMutation.isPending}
                activeOpacity={0.85}
              >
                {bookMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.modalConfirmText}>Confirm Booking Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  headerSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    fontFamily: FONTS.regular,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  headerIconBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryMid,
  },
  headerBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },

  // ── Hero Banner ───────────────────────────────────────────────────
  heroBanner: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: RADIUS.xl,
    padding: 16,
    ...SHADOWS.md,
    gap: 12,
  },
  heroContent: { gap: 4 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    fontFamily: FONTS.bold,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginTop: 2,
    fontFamily: FONTS.displayEB,
  },
  heroSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
    fontFamily: FONTS.regular,
  },
  hotlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  hotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  hotlineText: {
    fontSize: 11,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: '#fff',
  },
  hotlineCallBtn: {
    backgroundColor: '#FDE047',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hotlineCallText: {
    fontSize: 10,
    fontFamily: FONTS.bold, fontWeight: '800',
    color: '#1E1B4B',
  },

  // ── Search Bar ───────────────────────────────────────────────────
  searchWrap: {
    paddingHorizontal: 14,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // ── Categories ────────────────────────────────────────────────────
  categoriesSection: {
    marginTop: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 14,
    gap: 7,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },

  // ── Section Titles ────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
    fontFamily: FONTS.displayBold,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.semiBold,
  },

  // ── Provider Card ─────────────────────────────────────────────────
  listContent: {
    paddingBottom: 30,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 10,
  },
  cardDimmed: {
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  providerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 3,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    letterSpacing: -0.2,
    fontFamily: FONTS.displayBold,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
    fontFamily: FONTS.bold,
  },
  specialityText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },

  // ── Metrics Bar ───────────────────────────────────────────────────
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ratingNum: {
    fontSize: 12,
    fontFamily: FONTS.bold, fontWeight: '800',
    color: '#92400E',
  },
  reviewCount: {
    fontSize: 10,
    color: '#B45309',
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  pricePill: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceText: {
    fontSize: 11,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.primary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 'auto',
  },
  statusAvailable: {
    backgroundColor: '#DCFCE7',
  },
  statusBusy: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: { backgroundColor: '#10B981' },
  dotAmber: { backgroundColor: '#D97706' },
  statusText: { fontSize: 10, fontWeight: '700' },
  textGreen: { color: '#059669' },
  textAmber: { color: COLORS.textMuted },

  // ── Tags Row ──────────────────────────────────────────────────────
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium, fontWeight: '500',
  },

  // ── Card Action Buttons ───────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    ...SHADOWS.sm,
  },
  callBtnText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  chatBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  bookBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: FONTS.bold, fontWeight: '700',
  },

  // ── Booking Cards (My Requests) ───────────────────────────────────
  bookingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 8,
  },
  bookingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookingBadgeConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bookingBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontFamily: FONTS.bold, fontWeight: '800',
  },
  bookingIdText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  bookingProvider: {
    fontSize: 15,
    fontFamily: FONTS.bold, fontWeight: '800',
    color: COLORS.text,
  },
  bookingIssue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 4,
  },
  bookingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bookingMetaText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold, fontWeight: '600',
    color: COLORS.text,
  },
  bookingActionRow: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  bookingCardCancelled: {
    opacity: 0.6,
  },
  bookingBadgeCancelled: {
    backgroundColor: '#FEE2E2',
  },
  bookingBadgeInProgress: {
    backgroundColor: '#EEF2FF',
  },
  bookingBadgeCompleted: {
    backgroundColor: '#DBEAFE',
  },
  bookingCallBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bookingCallText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  bookingCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bookingCancelText: {
    color: COLORS.error,
    fontSize: 12,
    fontFamily: FONTS.bold, fontWeight: '700',
  },

  // ── Empty State ───────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.text,
    marginTop: 6,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Booking Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold, fontWeight: '800',
    color: COLORS.text,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.bold, fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalPill: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingVertical: 9,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  modalPillText: {
    fontSize: 12,
    fontFamily: FONTS.bold, fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modalPillTextActive: {
    color: COLORS.primary,
  },
  slotColumn: {
    gap: 7,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slotCardActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  slotText: {
    fontSize: 12.5,
    fontFamily: FONTS.semiBold, fontWeight: '600',
    color: COLORS.textSecondary,
  },
  slotTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  issueInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 13,
    color: COLORS.text,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  estimateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 14,
  },
  estimateText: {
    fontSize: 11.5,
    color: COLORS.primaryDark,
    flex: 1,
    lineHeight: 16,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 13,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.bold, fontWeight: '800',
  },
});
