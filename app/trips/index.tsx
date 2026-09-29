import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { tripsService, TripDto, TripBookingDto } from '@/services/tripsService';

export default function TripsScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<TripDto | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [activeBoardingPass, setActiveBoardingPass] = useState<TripBookingDto | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── 1. Live Trips Query ──────────────────────────────────────────
  const {
    data: trips = [],
    isLoading: loadingTrips,
    refetch: refetchTrips,
  } = useQuery({
    queryKey: ['trips', selectedCategory],
    queryFn: () => tripsService.getTrips(selectedCategory === 'ALL' ? undefined : selectedCategory),
  });

  // ── 2. Live Bookings Query ────────────────────────────────────────
  const {
    data: bookings = [],
    isLoading: loadingBookings,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['my-trip-bookings'],
    queryFn: () => tripsService.getMyBookings(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchTrips(), refetchBookings()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTrips, refetchBookings]);

  // ── 3. Book Trip Mutation ─────────────────────────────────────────
  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrip) throw new Error('No trip selected');
      const paxList = Array.from({ length: passengers }).map((_, i) => ({
        id: `pax-${i + 1}`,
        name: i === 0 ? (user?.name || user?.fullName || 'Primary Resident') : `Co-Passenger ${i + 1}`,
        age: 30,
        gender: 'Other',
        emergencyPhone: user?.phone || '9876543210',
      }));

      return await tripsService.bookTrip(selectedTrip.id, {
        passengers: paxList,
        selectedPickupPoint: selectedTrip.departurePoint,
        paymentMethod: 'UPI',
      });
    },
    onSuccess: (newBooking) => {
      setSelectedTrip(null);
      setPassengers(1);
      setActiveBoardingPass(newBooking);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['my-trip-bookings'] });
      Alert.alert('🎟️ Booking Confirmed', 'Your digital boarding pass has been issued!');
    },
    onError: (err: any) => {
      Alert.alert('Booking Error', err?.message || 'Could not complete trip reservation. Please try again.');
    },
  });

  // ── 4. Cancel Booking Mutation ───────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await tripsService.cancelBooking(bookingId);
    },
    onSuccess: () => {
      setActiveBoardingPass(null);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['my-trip-bookings'] });
      Alert.alert('Booking Cancelled', 'Your reservation has been cancelled and seats released.');
    },
    onError: (err: any) => {
      Alert.alert('Cancellation Error', err?.message || 'Could not cancel booking.');
    },
  });

  const categories = ['ALL', 'Pilgrimage', 'Trekking', 'Camping', 'Beach & Coastal'];

  const filteredTrips = trips.filter((t) => {
    const matchesCat = selectedCategory === 'ALL' || t.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Hero Banner ── */}
      <LinearGradient colors={GRADIENTS.hero} style={styles.heroBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Ionicons name="compass" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>Community Expeditions</Text>
          </View>
          <Text style={styles.heroTitle}>Travel Together, Save Together</Text>
          <Text style={styles.heroSubtitle}>
            Resident-curated weekend treks, spiritual yatras, and family getaways with doorstep society bus pickup.
          </Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{trips.length}</Text>
              <Text style={styles.heroStatLabel}>Upcoming Trips</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>65+</Text>
              <Text style={styles.heroStatLabel}>Residents Joined</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>100%</Text>
              <Text style={styles.heroStatLabel}>Verified Hosts</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Search Bar ── */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search destination, yatra, trek..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
        {categories.map((c) => {
          const isActive = selectedCategory === c;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setSelectedCategory(c)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Active Bookings & Boarding Passes ── */}
      {bookings.length > 0 && (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Boarding Passes ({bookings.length})</Text>
            <Text style={styles.sectionSub}>Tap pass to show bus marshal</Text>
          </View>

          {bookings.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.passCard}
              onPress={() => setActiveBoardingPass(b)}
              activeOpacity={0.88}
            >
              <View style={styles.passTop}>
                <View style={styles.passTag}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={styles.passTagText}>CONFIRMED BOARDING</Text>
                </View>
                <Text style={styles.passId}>{b.id}</Text>
              </View>

              <Text style={styles.passTitle}>{b.tripTitle || (b as any).title}</Text>
              <Text style={styles.passDest}>📍 {b.destination}</Text>

              <View style={styles.passDetailsGrid}>
                <View style={styles.passDetailItem}>
                  <Text style={styles.passDetailLabel}>DEPARTURE</Text>
                  <Text style={styles.passDetailValue}>{b.departureDate || (b as any).date}</Text>
                </View>
                <View style={styles.passDetailItem}>
                  <Text style={styles.passDetailLabel}>SEATS</Text>
                  <Text style={styles.passDetailValue}>{b.participantCount || (b as any).seats} Pax</Text>
                </View>
                <View style={styles.passDetailItem}>
                  <Text style={styles.passDetailLabel}>TOTAL FARE</Text>
                  <Text style={[styles.passDetailValue, { color: COLORS.primary }]}>
                    ₹{(b.totalAmount || (b as any).total || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.passFooter}>
                <View style={styles.passHost}>
                  <Ionicons name="person-circle-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.passHostText}>Host: {b.host || 'Community Host'}</Text>
                </View>
                <View style={styles.passBtn}>
                  <Ionicons name="qr-code" size={14} color="#FFFFFF" />
                  <Text style={styles.passBtnText}>Digital Pass</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Upcoming Trips Grid ── */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Community Getaways</Text>
          <Text style={styles.sectionSub}>{filteredTrips.length} active departures</Text>
        </View>

        {loadingTrips && trips.length === 0 ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 8, fontSize: 13, color: COLORS.textMuted }}>Discovering upcoming community trips...</Text>
          </View>
        ) : filteredTrips.length === 0 ? (
          <View style={{ padding: SPACING.xl, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border }}>
            <Ionicons name="compass-outline" size={40} color={COLORS.textMuted} />
            <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '700', color: COLORS.text }}>No trips found</Text>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Try clearing your search query or selecting a different category.</Text>
          </View>
        ) : (
          <View style={{ gap: SPACING.md }}>
            {filteredTrips.map((trip) => {
              const seatsLeft = trip.totalSeats - trip.bookedSeats;
              const progressPercent = Math.min(100, Math.round((trip.bookedSeats / trip.totalSeats) * 100));

              return (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripCardHeader}>
                    <View style={styles.catPill}>
                      <Text style={styles.catPillText}>{trip.category.toUpperCase()}</Text>
                    </View>
                    <View style={styles.transportPill}>
                      <Ionicons name="bus-outline" size={13} color={COLORS.primary} />
                      <Text style={styles.transportPillText}>{trip.transport}</Text>
                    </View>
                  </View>

                  <Text style={styles.tripCardTitle}>{trip.title}</Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
                    <Text style={styles.destinationName}>{trip.destination}</Text>
                    <Text style={styles.durationDot}>•</Text>
                    <Text style={styles.durationText}>{trip.duration || 'Weekend Getaway'}</Text>
                  </View>

                  {/* Highlights */}
                  <View style={styles.highlightsWrap}>
                    {(trip.highlights || trip.includes || []).map((h, i) => (
                      <View key={i} style={styles.highlightChip}>
                        <Ionicons name="sparkles" size={10} color={COLORS.primary} />
                        <Text style={styles.highlightText}>{h}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Logistics Info Box */}
                  <View style={styles.logisticsBox}>
                    <View style={styles.logisticsRow}>
                      <View style={styles.logisticsCol}>
                        <Text style={styles.logisticsLabel}>Departure Date</Text>
                        <Text style={styles.logisticsVal}>{trip.departureDate}</Text>
                      </View>
                      <View style={styles.logisticsCol}>
                        <Text style={styles.logisticsLabel}>Pickup Location</Text>
                        <Text style={styles.logisticsVal} numberOfLines={1}>{trip.departurePoint}</Text>
                      </View>
                    </View>

                    {/* Seat Progress Bar */}
                    <View style={styles.seatProgressWrap}>
                      <View style={styles.seatLabelRow}>
                        <Text style={styles.seatStatusText}>
                          {seatsLeft <= 5 ? `🔥 Only ${seatsLeft} seats left!` : `${seatsLeft} seats available`}
                        </Text>
                        <Text style={styles.seatCountText}>{trip.bookedSeats}/{trip.totalSeats} booked</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${progressPercent}%`,
                              backgroundColor: seatsLeft <= 5 ? '#EF4444' : COLORS.primary,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Card Footer */}
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.priceMeta}>FARE PER SEAT</Text>
                      <Text style={styles.priceNum}>₹{trip.pricePerPerson.toLocaleString()}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.bookNowBtn}
                      onPress={() => {
                        setSelectedTrip(trip);
                        setPassengers(1);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.bookNowText}>Book Seats</Text>
                      <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* ── Booking Modal ── */}
      <Modal visible={!!selectedTrip} transparent animationType="slide" onRequestClose={() => setSelectedTrip(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reserve Seats</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{selectedTrip?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTrip(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedTrip && (
              <View style={styles.modalBody}>
                <View style={styles.modalTripBrief}>
                  <Text style={styles.briefDest}>📍 {selectedTrip.destination}</Text>
                  <Text style={styles.briefDate}>🗓️ {selectedTrip.departureDate} • {selectedTrip.duration || 'Weekend'}</Text>
                  <Text style={styles.briefPickup}>🚏 {selectedTrip.departurePoint}</Text>
                </View>

                {/* Passenger Stepper */}
                <View style={styles.stepperContainer}>
                  <View>
                    <Text style={styles.stepperLabel}>Number of Passengers</Text>
                    <Text style={styles.stepperSub}>₹{selectedTrip.pricePerPerson.toLocaleString()} per seat</Text>
                  </View>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={[styles.stepBtn, passengers <= 1 && styles.stepBtnDisabled]}
                      onPress={() => setPassengers(Math.max(1, passengers - 1))}
                      disabled={passengers <= 1 || bookMutation.isPending}
                    >
                      <Ionicons name="remove" size={18} color={passengers <= 1 ? COLORS.textMuted : COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.stepCount}>{passengers}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setPassengers(Math.min(selectedTrip.totalSeats - selectedTrip.bookedSeats, passengers + 1))}
                      disabled={passengers >= (selectedTrip.totalSeats - selectedTrip.bookedSeats) || bookMutation.isPending}
                    >
                      <Ionicons name="add" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Cost Breakdown */}
                <View style={styles.fareBreakdown}>
                  <View style={styles.fareRow}>
                    <Text style={styles.fareItemLabel}>Base Fare ({passengers} × ₹{selectedTrip.pricePerPerson.toLocaleString()})</Text>
                    <Text style={styles.fareItemVal}>₹{(selectedTrip.pricePerPerson * passengers).toLocaleString()}</Text>
                  </View>
                  <View style={styles.fareRow}>
                    <Text style={styles.fareItemLabel}>Community Subsidy / Bus Discount</Text>
                    <Text style={[styles.fareItemVal, { color: '#059669' }]}>Included</Text>
                  </View>
                  <View style={styles.fareDivider} />
                  <View style={styles.fareTotalRow}>
                    <Text style={styles.fareTotalLabel}>Total Amount Payable</Text>
                    <Text style={styles.fareTotalVal}>₹{(selectedTrip.pricePerPerson * passengers).toLocaleString()}</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelActionBtn}
                    onPress={() => setSelectedTrip(null)}
                    disabled={bookMutation.isPending}
                  >
                    <Text style={styles.cancelActionText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmActionBtn, bookMutation.isPending && { opacity: 0.7 }]}
                    onPress={() => bookMutation.mutate()}
                    disabled={bookMutation.isPending}
                  >
                    {bookMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.confirmActionText}>Confirm & Issue Pass</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Digital Boarding Pass QR Modal ── */}
      <Modal visible={!!activeBoardingPass} transparent animationType="fade" onRequestClose={() => setActiveBoardingPass(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.ticketContainer}>
            {/* Ticket Header */}
            <LinearGradient colors={GRADIENTS.hero} style={styles.ticketHeader}>
              <View style={styles.ticketHeaderTop}>
                <Text style={styles.ticketBrand}>MANA COMMUNITY EXPEDITIONS</Text>
                <View style={styles.ticketPassTag}>
                  <Text style={styles.ticketPassTagText}>BOARDING PASS</Text>
                </View>
              </View>
              <Text style={styles.ticketTitle}>{activeBoardingPass?.tripTitle || (activeBoardingPass as any)?.title}</Text>
              <Text style={styles.ticketDest}>📍 {activeBoardingPass?.destination}</Text>
            </LinearGradient>

            {/* Perforated Separator */}
            <View style={styles.perforatedLine}>
              <View style={styles.cutoutLeft} />
              <View style={styles.dashedLine} />
              <View style={styles.cutoutRight} />
            </View>

            {/* Ticket Body */}
            <View style={styles.ticketBody}>
              <View style={styles.ticketInfoGrid}>
                <View style={styles.ticketInfoItem}>
                  <Text style={styles.ticketInfoLabel}>PASSENGER</Text>
                  <Text style={styles.ticketInfoVal}>{user?.name || user?.fullName || 'Resident Member'}</Text>
                </View>
                <View style={styles.ticketInfoItem}>
                  <Text style={styles.ticketInfoLabel}>FLAT / UNIT</Text>
                  <Text style={styles.ticketInfoVal}>{user?.flatNumber || 'Unit A-12'}</Text>
                </View>
                <View style={styles.ticketInfoItem}>
                  <Text style={styles.ticketInfoLabel}>DEPARTURE DATE</Text>
                  <Text style={styles.ticketInfoVal}>{activeBoardingPass?.departureDate || (activeBoardingPass as any)?.date}</Text>
                </View>
                <View style={styles.ticketInfoItem}>
                  <Text style={styles.ticketInfoLabel}>SEATS BOOKED</Text>
                  <Text style={styles.ticketInfoVal}>{activeBoardingPass?.participantCount || (activeBoardingPass as any)?.seats} Person(s)</Text>
                </View>
              </View>

              <View style={styles.pickupBanner}>
                <Ionicons name="pin" size={14} color={COLORS.primary} />
                <Text style={styles.pickupBannerText}>
                  Pickup Point: {activeBoardingPass?.selectedPickupPoint || (activeBoardingPass as any)?.pickup}
                </Text>
              </View>

              {/* QR Code Presentation */}
              <View style={styles.qrSection}>
                <Ionicons name="qr-code" size={140} color="#1E1B4B" />
                <Text style={styles.qrCodeString}>{activeBoardingPass?.boardingPassQR || (activeBoardingPass as any)?.qr}</Text>
                <Text style={styles.qrScanHint}>Show QR to bus marshal at departure point for instant check-in</Text>
              </View>

              <TouchableOpacity
                style={styles.closeTicketBtn}
                onPress={() => setActiveBoardingPass(null)}
              >
                <Text style={styles.closeTicketText}>Done & Return</Text>
              </TouchableOpacity>

              {activeBoardingPass && (
                <TouchableOpacity
                  style={{ marginTop: 10, alignItems: 'center', paddingVertical: 6 }}
                  onPress={() => {
                    Alert.alert(
                      'Cancel Reservation',
                      'Are you sure you want to cancel this trip reservation? Seats will be returned to the community.',
                      [
                        { text: 'Keep Reservation', style: 'cancel' },
                        {
                          text: 'Cancel Booking',
                          style: 'destructive',
                          onPress: () => cancelMutation.mutate(activeBoardingPass.id),
                        },
                      ],
                    );
                  }}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Cancel Reservation</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 48,
  },
  heroBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroContent: {
    gap: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 18,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    padding: 0,
  },
  chipScroll: {
    marginBottom: SPACING.lg,
  },
  chipScrollContent: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionWrap: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  passCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  passTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  passTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  passTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  passId: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: COLORS.primary,
  },
  passTitle: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
    color: COLORS.text,
  },
  passDest: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  passDetailsGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 10,
  },
  passDetailItem: {
    flex: 1,
  },
  passDetailLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  passDetailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  passFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passHost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  passHostText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  passBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  passBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  tripCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  transportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  transportPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tripCardTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  destinationName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  durationDot: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  durationText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  highlightsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 10,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  highlightText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  logisticsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  logisticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logisticsCol: {
    flex: 1,
  },
  logisticsLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  logisticsVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  seatProgressWrap: {
    gap: 4,
  },
  seatLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seatStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  seatCountText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceMeta: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceNum: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: COLORS.text,
  },
  bookNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  bookNowText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    maxWidth: 260,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    gap: SPACING.md,
  },
  modalTripBrief: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  briefDest: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  briefDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  briefPickup: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  stepperSub: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 2,
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepCount: {
    fontSize: 15,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: 10,
  },
  fareBreakdown: {
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 6,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fareItemLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fareItemVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  fareDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  fareTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareTotalLabel: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: COLORS.text,
  },
  fareTotalVal: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmActionBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActionText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  ticketHeader: {
    padding: SPACING.lg,
    gap: 4,
  },
  ticketHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketBrand: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.8,
  },
  ticketPassTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ticketPassTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  ticketTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ticketDest: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  perforatedLine: {
    height: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cutoutLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    marginLeft: -10,
  },
  dashedLine: {
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  cutoutRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    marginRight: -10,
  },
  ticketBody: {
    padding: SPACING.lg,
    paddingTop: 4,
    gap: SPACING.md,
  },
  ticketInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ticketInfoItem: {
    width: '46%',
  },
  ticketInfoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.4,
  },
  ticketInfoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  pickupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  pickupBannerText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    flex: 1,
  },
  qrSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  qrCodeString: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  qrScanHint: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  closeTicketBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 4,
  },
  closeTicketText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
