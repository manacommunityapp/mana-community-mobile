import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  BackHandler,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  facilityService,
  FacilityDto,
  FacilityBookingDto,
  FacilityBookingRequest,
} from '@/services/facilityService';

type FacilityType = 'ALL' | 'CLUBHOUSE' | 'TENNIS' | 'BADMINTON' | 'SWIMMING_POOL' | 'PARTY_HALL' | 'GYM';
type TabKey = 'explore' | 'my-bookings';

const CATEGORIES: { value: FacilityType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ALL',           label: 'All Facilities', icon: 'grid-outline' },
  { value: 'CLUBHOUSE',     label: 'Clubhouse',      icon: 'business-outline' },
  { value: 'GYM',           label: 'Gym & Fitness',  icon: 'barbell-outline' },
  { value: 'SWIMMING_POOL', label: 'Swimming Pool',  icon: 'water-outline' },
  { value: 'PARTY_HALL',    label: 'Banquet Hall',   icon: 'musical-notes-outline' },
  { value: 'BADMINTON',     label: 'Badminton',      icon: 'tennisball-outline' },
  { value: 'TENNIS',        label: 'Tennis Court',   icon: 'tennisball-outline' },
];

const DEFAULT_SLOTS = [
  '06:00 AM - 07:00 AM',
  '07:00 AM - 08:00 AM',
  '08:00 AM - 09:00 AM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
  '06:00 PM - 07:00 PM',
  '07:00 PM - 08:00 PM',
  '08:00 PM - 09:00 PM',
];

export default function FacilitiesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('explore');
  const [filter, setFilter] = useState<FacilityType>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  // Booking Modal State
  const [selectedFacility, setSelectedFacility] = useState<FacilityDto | null>(null);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number>(1);

  // Digital Pass Modal State
  const [bookingPass, setBookingPass] = useState<FacilityBookingDto | null>(null);

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (bookingPass) {
          setBookingPass(null);
          return true;
        }
        if (selectedFacility) {
          setSelectedFacility(null);
          return true;
        }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, bookingPass, selectedFacility])
  );

  // Generate the next 5 days
  const upcomingDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      days.push({
        offset: i,
        isoDate: iso,
        dayName: i === 0 ? 'Today' : (i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' })),
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      });
    }
    return days;
  }, []);

  const activeDate = upcomingDays[selectedDayOffset]?.isoDate || upcomingDays[0].isoDate;

  // ── 1. Fetch Facilities ───────────────────────────────────────────────────
  const {
    data: facilities = [],
    isLoading: loadingFacilities,
    refetch: refetchFacilities,
  } = useQuery<FacilityDto[]>({
    queryKey: ['facilities', 'list'],
    queryFn: () => facilityService.getFacilities(),
    staleTime: 60_000,
  });

  // ── 2. Fetch My Bookings ──────────────────────────────────────────────────
  const {
    data: myBookings = [],
    isLoading: loadingBookings,
    refetch: refetchBookings,
  } = useQuery<FacilityBookingDto[]>({
    queryKey: ['facilities', 'my-bookings'],
    queryFn: () => facilityService.getMyBookings(),
    staleTime: 30_000,
  });

  // ── 3. Fetch Available Slots for Selected Facility & Date ─────────────────
  const {
    data: liveSlots = [],
    isLoading: loadingSlots,
  } = useQuery<string[]>({
    queryKey: ['facilities', selectedFacility?.id, 'slots', activeDate],
    queryFn: () =>
      selectedFacility ? facilityService.getAvailableSlots(selectedFacility.id, activeDate) : Promise.resolve([]),
    enabled: !!selectedFacility,
    staleTime: 10_000,
  });

  const slotsToDisplay = liveSlots && liveSlots.length > 0 ? liveSlots : DEFAULT_SLOTS;

  // ── Pull-to-Refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetchFacilities(), refetchBookings()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFacilities, refetchBookings]);

  // ── 4. Book Slot Mutation ─────────────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: (req: FacilityBookingRequest) => facilityService.bookSlot(req),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      const currentFacility = selectedFacility;
      const currentDay = upcomingDays[selectedDayOffset];

      const confirmedPass: FacilityBookingDto = {
        id: res?.id || `BK-${Date.now()}`,
        facilityId: currentFacility?.id || 'fac',
        facilityName: currentFacility?.name || 'Community Amenity',
        date: currentDay.fullDate,
        startTime: selectedSlot?.split(' - ')[0] || '06:00 AM',
        endTime: selectedSlot?.split(' - ')[1] || '07:00 AM',
        guestCount,
        totalAmount: currentFacility ? currentFacility.hourlyRate : 0,
        status: 'CONFIRMED',
        bookingRef: res?.bookingRef || `FAC-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: new Date().toISOString(),
      };

      setSelectedFacility(null);
      setSelectedSlot(null);
      setBookingPass(confirmedPass);
      Alert.alert('🎉 Reservation Confirmed', 'Your amenity booking pass is ready.');
    },
    onError: (err: any) => {
      Alert.alert('Booking Error', err?.message || 'Could not complete slot reservation.');
    },
  });

  const handleConfirmBooking = () => {
    if (!selectedFacility || !selectedSlot) {
      Alert.alert('Slot Required', 'Please select an available time slot.');
      return;
    }
    const [start, end] = selectedSlot.split(' - ');
    bookMutation.mutate({
      facilityId: selectedFacility.id,
      date: activeDate,
      startTime: start || '06:00 AM',
      endTime: end || '07:00 AM',
      guestCount,
    });
  };

  const handleSharePass = async (booking: FacilityBookingDto) => {
    try {
      await Share.share({
        message: `🏢 *Mana Facility Reservation Pass*\nFacility: ${booking.facilityName}\nDate: ${booking.date}\nTime: ${booking.startTime} - ${booking.endTime}\nRef No: ${booking.bookingRef || booking.id}\nResidents: Tower ${user?.tower || 'A'} - Flat ${user?.flatNumber || '1204'}\nShow this digital pass at the entrance.`,
      });
    } catch {
      // dismissed
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'ALL') return facilities;
    return facilities.filter((f) => f.type === filter);
  }, [facilities, filter]);

  const isInitialLoading = (loadingFacilities || loadingBookings) && !refreshing && facilities.length === 0;

  const renderFacility = ({ item }: { item: FacilityDto }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardIconBox}>
          <Ionicons
            name={CATEGORIES.find((c) => c.value === item.type)?.icon || 'business-outline'}
            size={24}
            color={COLORS.primary}
          />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={s.cardMetaRow}>
            <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.cardTimingText}>{item.openTime || '06:00 AM'} - {item.closeTime || '10:00 PM'}</Text>
          </View>
        </View>
        <View style={s.capacityBadge}>
          <Ionicons name="people-outline" size={12} color={COLORS.primary} />
          <Text style={s.capacityBadgeText}>Max {item.capacity || 20}</Text>
        </View>
      </View>

      {item.rules && (
        <View style={s.rulesBox}>
          <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
          <Text style={s.rulesText} numberOfLines={2}>{item.rules}</Text>
        </View>
      )}

      {/* Info Badges & Booking Footer */}
      <View style={s.cardFooter}>
        <View>
          <Text style={s.pricingLabel}>Usage Fee</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            {item.hourlyRate === 0 ? (
              <Text style={s.freePrice}>Complimentary</Text>
            ) : (
              <>
                <Text style={s.cardPrice}>₹{item.hourlyRate}</Text>
                <Text style={s.cardPriceUnit}>/hr</Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={s.bookSlotBtn}
          onPress={() => {
            setSelectedFacility(item);
            setSelectedSlot(null);
            setGuestCount(1);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
          <Text style={s.bookSlotBtnText}>Book Slot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Screen Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Facility & Amenity Booking</Text>
          <Text style={s.headerSub}>Book clubhouse, sports courts & spaces</Text>
        </View>
        <TouchableOpacity
          onPress={() => setActiveTab(activeTab === 'explore' ? 'my-bookings' : 'explore')}
          style={s.headerPassBtn}
        >
          <Ionicons
            name={activeTab === 'explore' ? 'ticket-outline' : 'grid-outline'}
            size={20}
            color={COLORS.primary}
          />
          {myBookings.length > 0 && activeTab === 'explore' && (
            <View style={s.passBadgeCount}>
              <Text style={s.passBadgeCountText}>{myBookings.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Segmented Navigation Tabs ── */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tabItem, activeTab === 'explore' && s.tabItemActive]}
          onPress={() => setActiveTab('explore')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="grid"
            size={16}
            color={activeTab === 'explore' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[s.tabText, activeTab === 'explore' && s.tabTextActive]}>
            Explore Amenities ({facilities.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabItem, activeTab === 'my-bookings' && s.tabItemActive]}
          onPress={() => setActiveTab('my-bookings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="ticket"
            size={16}
            color={activeTab === 'my-bookings' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[s.tabText, activeTab === 'my-bookings' && s.tabTextActive]}>
            My Passes ({myBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Filters ── */}
      {activeTab === 'explore' && (
        <View style={s.categoryBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.categoryScroll}
          >
            {CATEGORIES.map((c) => {
              const active = filter === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[s.categoryChip, active && s.categoryChipActive]}
                  onPress={() => setFilter(c.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={c.icon}
                    size={14}
                    color={active ? '#FFFFFF' : COLORS.textSecondary}
                  />
                  <Text style={[s.categoryChipText, active && s.categoryChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Loading Spinner ── */}
      {isInitialLoading && (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Loading society facilities...</Text>
        </View>
      )}

      {/* ── TAB 1: EXPLORE FACILITIES ── */}
      {activeTab === 'explore' && !isInitialLoading && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFacility}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="business-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No facilities found</Text>
              <Text style={s.emptySub}>Amenities and spaces will be listed once configured by society admin.</Text>
            </View>
          }
        />
      )}

      {/* ── TAB 2: MY BOOKINGS ── */}
      {activeTab === 'my-bookings' && !isInitialLoading && (
        <ScrollView
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {myBookings.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Active Reservations</Text>
              <Text style={s.emptySub}>Book a clubhouse slot or sports court to generate your digital entry pass.</Text>
              <TouchableOpacity
                style={s.browseBtn}
                onPress={() => setActiveTab('explore')}
              >
                <Text style={s.browseBtnText}>Explore Facilities</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myBookings.map((b) => (
              <View key={b.id} style={s.bookingCard}>
                <View style={s.bookingHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bookingRefText}>REF: {b.bookingRef || b.id}</Text>
                    <Text style={s.bookingFacilityName}>{b.facilityName || 'Facility Reservation'}</Text>
                  </View>
                  <View style={s.confirmedBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={s.confirmedBadgeText}>CONFIRMED</Text>
                  </View>
                </View>

                <View style={s.bookingDetailRow}>
                  <View style={s.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
                    <Text style={s.bookingDetailText}>{b.date}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                    <Text style={s.bookingDetailText}>{b.startTime} - {b.endTime}</Text>
                  </View>
                </View>

                <View style={s.bookingFooter}>
                  <TouchableOpacity
                    style={s.viewPassBtn}
                    onPress={() => setBookingPass(b)}
                  >
                    <Ionicons name="qr-code-outline" size={15} color={COLORS.primary} />
                    <Text style={s.viewPassBtnText}>Show Entry Pass</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.sharePassBtn}
                    onPress={() => handleSharePass(b)}
                  >
                    <Ionicons name="share-social-outline" size={15} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ── MODAL 1: INTERACTIVE SLOT BOOKING ── */}
      <Modal visible={!!selectedFacility} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle} numberOfLines={1}>{selectedFacility?.name}</Text>
                <Text style={s.modalSubtitle}>
                  {selectedFacility?.openTime || '06:00 AM'} - {selectedFacility?.closeTime || '10:00 PM'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedFacility(null);
                  setSelectedSlot(null);
                }}
                disabled={bookMutation.isPending}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 1. Date Selector */}
            <Text style={s.sectionHeader}>1. Select Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.dateTabsRow}
            >
              {upcomingDays.map((d) => {
                const active = selectedDayOffset === d.offset;
                return (
                  <TouchableOpacity
                    key={d.offset}
                    style={[s.dateTab, active && s.dateTabActive]}
                    onPress={() => {
                      setSelectedDayOffset(d.offset);
                      setSelectedSlot(null);
                    }}
                  >
                    <Text style={[s.dateTabDay, active && s.dateTabDayActive]}>{d.dayName}</Text>
                    <Text style={[s.dateTabDate, active && s.dateTabDateActive]}>{d.dateStr}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2. Slot Selector */}
            <Text style={s.sectionHeader}>2. Select Time Slot</Text>
            {loadingSlots ? (
              <View style={{ padding: SPACING.md, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>Checking available slots...</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                <View style={s.slotGrid}>
                  {slotsToDisplay.map((slotStr, index) => {
                    const isSelected = selectedSlot === slotStr;
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[s.slotBtn, isSelected && s.slotBtnSelected]}
                        onPress={() => setSelectedSlot(slotStr)}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'time-outline'}
                          size={15}
                          color={isSelected ? '#FFFFFF' : COLORS.primary}
                        />
                        <Text style={[s.slotBtnText, isSelected && s.slotBtnTextSelected]}>
                          {slotStr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* 3. Guest Count Stepper */}
            <View style={s.guestStepperRow}>
              <View>
                <Text style={s.guestLabel}>Attending Guests</Text>
                <Text style={s.guestSub}>Max capacity: {selectedFacility?.capacity || 20}</Text>
              </View>
              <View style={s.stepperControls}>
                <TouchableOpacity
                  style={s.stepperBtn}
                  onPress={() => setGuestCount(Math.max(1, guestCount - 1))}
                >
                  <Ionicons name="remove" size={16} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={s.stepperVal}>{guestCount}</Text>
                <TouchableOpacity
                  style={s.stepperBtn}
                  onPress={() => setGuestCount(Math.min(selectedFacility?.capacity || 20, guestCount + 1))}
                >
                  <Ionicons name="add" size={16} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Price Summary */}
            <View style={s.summaryBox}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Total Payable</Text>
                <Text style={s.summaryValue}>
                  {selectedFacility?.hourlyRate === 0 ? 'Complimentary' : `₹${selectedFacility?.hourlyRate}`}
                </Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Resident Unit</Text>
                <Text style={s.summaryUnitText}>Tower {user?.tower || 'A'} - #{user?.flatNumber || '1204'}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => {
                  setSelectedFacility(null);
                  setSelectedSlot(null);
                }}
                disabled={bookMutation.isPending}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, (!selectedSlot || bookMutation.isPending) && { opacity: 0.6 }]}
                disabled={!selectedSlot || bookMutation.isPending}
                onPress={handleConfirmBooking}
              >
                {bookMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: DIGITAL ENTRY PASS MODAL ── */}
      <Modal visible={!!bookingPass} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.passCard}>
            <View style={s.passHeader}>
              <View style={s.passSuccessBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={s.passSuccessText}>Reservation Verified</Text>
              </View>
              <TouchableOpacity onPress={() => setBookingPass(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {bookingPass && (
              <View style={s.passBody}>
                <Text style={s.passFacilityName}>{bookingPass.facilityName}</Text>
                <Text style={s.passRefText}>Pass Reference: {bookingPass.bookingRef || bookingPass.id}</Text>

                <View style={s.passDivider} />

                <View style={s.passRow}>
                  <Text style={s.passLabel}>Date:</Text>
                  <Text style={s.passVal}>{bookingPass.date}</Text>
                </View>

                <View style={s.passRow}>
                  <Text style={s.passLabel}>Time Slot:</Text>
                  <Text style={s.passVal}>{bookingPass.startTime} - {bookingPass.endTime}</Text>
                </View>

                <View style={s.passRow}>
                  <Text style={s.passLabel}>Guests:</Text>
                  <Text style={s.passVal}>{bookingPass.guestCount || 1} Person(s)</Text>
                </View>

                <View style={s.passRow}>
                  <Text style={s.passLabel}>Resident:</Text>
                  <Text style={s.passVal}>Tower {user?.tower || 'A'} &bull; Unit {user?.flatNumber || '1204'}</Text>
                </View>

                {/* QR Graphics Pass */}
                <View style={s.passAccessBox}>
                  <Ionicons name="qr-code-outline" size={70} color={COLORS.primary} />
                  <Text style={s.passCodeText}>{bookingPass.bookingRef || bookingPass.id}</Text>
                  <Text style={s.passAccessNote}>Show this digital pass at the facility entrance</Text>
                </View>

                <View style={s.passActionsRow}>
                  <TouchableOpacity
                    style={s.sharePassActionBtn}
                    onPress={() => handleSharePass(bookingPass)}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                    <Text style={s.sharePassActionText}>Share Pass</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.passDoneBtn}
                    onPress={() => setBookingPass(null)}
                  >
                    <Text style={s.passDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.12)',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  headerPassBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  passBadgeCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passBadgeCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabItemActive: { backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  categoryBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.1)',
  },
  categoryScroll: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium', fontWeight: '600' },
  categoryChipTextActive: { color: '#FFFFFF', fontFamily: 'Outfit-Bold', fontWeight: '700' },

  centerContainer: { padding: SPACING.xl, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardTimingText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  capacityBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  rulesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  rulesText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', flex: 1 },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  pricingLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  freePrice: { fontSize: 14, fontWeight: '800', color: '#059669', fontFamily: 'Outfit-Bold' },
  cardPrice: { fontSize: 18, fontWeight: '900', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  cardPriceUnit: { fontSize: 11, color: COLORS.textMuted, marginLeft: 2, fontFamily: 'DMSans-Regular' },

  bookSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  bookSlotBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 8 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 30 },
  browseBtn: {
    marginTop: SPACING.md,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  browseBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingRefText: { fontSize: 10, fontFamily: 'monospace', fontWeight: '800', color: COLORS.textMuted },
  bookingFacilityName: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 1 },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confirmedBadgeText: { fontSize: 9, fontWeight: '800', color: '#059669', fontFamily: 'Outfit-Bold' },

  bookingDetailRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginVertical: SPACING.sm,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookingDetailText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },

  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  viewPassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  viewPassBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  sharePassBtn: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  modalCloseBtn: { padding: 4 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    marginVertical: 4,
    textTransform: 'uppercase',
  },
  dateTabsRow: { gap: 8, paddingBottom: 6 },
  dateTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  dateTabActive: { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  dateTabDay: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  dateTabDayActive: { color: COLORS.primary, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  dateTabDate: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 1, fontFamily: 'Outfit-Bold' },
  dateTabDateActive: { color: COLORS.primary },

  slotGrid: { gap: 6, marginVertical: 4 },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotBtnSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  slotBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium' },
  slotBtnTextSelected: { color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  guestStepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: 6,
  },
  guestLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  guestSub: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: { fontSize: 14, fontWeight: '800', color: COLORS.text, minWidth: 16, textAlign: 'center' },

  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: 6,
    gap: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  summaryValue: { fontSize: 14, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  summaryUnitText: { fontSize: 11, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium' },

  modalActionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  passCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  passSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passSuccessText: { fontSize: 10, fontWeight: '800', color: '#059669', fontFamily: 'Outfit-Bold' },
  passBody: { gap: 4 },
  passFacilityName: { fontSize: 17, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  passRefText: { fontSize: 11, fontFamily: 'monospace', color: COLORS.textMuted },
  passDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  passRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 },
  passLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  passVal: { fontSize: 11, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  passAccessBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  passCodeText: { fontSize: 13, fontFamily: 'monospace', fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  passAccessNote: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular' },
  passActionsRow: { flexDirection: 'row', gap: SPACING.md, marginTop: 4 },
  sharePassActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  sharePassActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  passDoneBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  passDoneBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },
});
