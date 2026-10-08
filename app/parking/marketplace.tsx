import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import {
  parkingService,
  ParkingMarketplaceListingDto,
  ParkingMarketplaceBookingDto,
  MarketplacePricingType,
} from '@/services/parkingService';

export default function ParkingMarketplaceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'BROWSE' | 'MY_BOOKINGS'>('BROWSE');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  // Book Modal
  const [selectedListing, setSelectedListing] = useState<ParkingMarketplaceListingDto | null>(null);
  const [bookVehicle, setBookVehicle] = useState('KA-01-AB-1234');
  const [bookStartDate, setBookStartDate] = useState('2026-10-08');
  const [bookEndDate, setBookEndDate] = useState('2026-10-12');
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  // List Slot Modal
  const [listModalVisible, setListModalVisible] = useState(false);
  const [listSpotNumber, setListSpotNumber] = useState('B1-P12');
  const [listLevel, setListLevel] = useState('Basement 1');
  const [listStartDate, setListStartDate] = useState('2026-10-10');
  const [listEndDate, setListEndDate] = useState('2026-10-25');
  const [listPricingType, setListPricingType] = useState<MarketplacePricingType>('DAILY_RATE');
  const [listRateINR, setListRateINR] = useState('80');
  const [listNotes, setListNotes] = useState('Traveling on vacation. Slot is right next to Lift A.');

  const { data: listings = [], isLoading: listingsLoading } = useQuery<ParkingMarketplaceListingDto[]>({
    queryKey: ['parkingMarketplaceListings'],
    queryFn: parkingService.getMarketplaceListings,
  });

  const { data: myBookings = [], isLoading: bookingsLoading } = useQuery<ParkingMarketplaceBookingDto[]>({
    queryKey: ['myMarketplaceBookings'],
    queryFn: parkingService.getMyMarketplaceBookings,
  });

  const bookMutation = useMutation({
    mutationFn: parkingService.bookMarketplaceSlot,
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['parkingMarketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceBookings'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });
      queryClient.invalidateQueries({ queryKey: ['anprLogsQuick'] });
      setBookingModalVisible(false);
      Alert.alert(
        '🎉 Slot Reserved Successfully!',
        'Booking Code: ' + booking.bookingCode + '\n\nVehicle ' + booking.vehicleNumber + ' has been automatically whitelisted in the ANPR Smart Gate for slot ' + booking.spotNumber + '.',
        [{ text: 'Great!', onPress: () => setActiveTab('MY_BOOKINGS') }]
      );
    },
    onError: (err: any) => {
      Alert.alert('Booking Failed', err?.message || 'Could not complete booking.');
    },
  });

  const listMutation = useMutation({
    mutationFn: parkingService.createMarketplaceListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingMarketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['parkingOccupancy'] });
      setListModalVisible(false);
      Alert.alert('✅ Slot Listed', 'Your parking spot is now available on the community marketplace.');
    },
  });

  const filteredListings = listings.filter((l) => {
    if (levelFilter !== 'ALL' && l.level !== levelFilter) return false;
    return true;
  });

  const handleOpenBook = (listing: ParkingMarketplaceListingDto) => {
    setSelectedListing(listing);
    setBookStartDate(listing.startDate);
    setBookEndDate(listing.endDate);
    setBookingModalVisible(true);
  };

  const handleConfirmBook = () => {
    if (!selectedListing || !bookVehicle.trim()) {
      Alert.alert('Missing Info', 'Please enter your vehicle plate number.');
      return;
    }
    bookMutation.mutate({
      listingId: selectedListing.id,
      vehicleNumber: bookVehicle.trim().toUpperCase(),
      startDate: bookStartDate,
      endDate: bookEndDate,
    });
  };

  const handleConfirmList = () => {
    const rate = listPricingType === 'FREE_GOOD_NEIGHBOR' ? 0 : parseFloat(listRateINR) || 50;
    listMutation.mutate({
      spotId: 1,
      spotNumber: listSpotNumber,
      level: listLevel,
      spotType: 'CAR',
      startDate: listStartDate,
      endDate: listEndDate,
      pricingType: listPricingType,
      rateINR: rate,
      notes: listNotes,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header Banner */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.headerTitle}>🅿️ Community Parking Pool</Text>
            <Text style={styles.headerSubtitle}>Rent idle slots or lend your unused basement spot</Text>
          </View>
          <TouchableOpacity style={styles.listBtn} onPress={() => setListModalVisible(true)}>
            <Ionicons name="add-circle" size={18} color="#FFFFFF" />
            <Text style={styles.listBtnText}>List My Slot</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.smartPill}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.smartPillText}>Instant ANPR Gate Whitelisting & Secure Escrow</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'BROWSE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('BROWSE')}
        >
          <Text style={[styles.tabText, activeTab === 'BROWSE' && styles.tabTextActive]}>
            Available Spots ({filteredListings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'MY_BOOKINGS' && styles.tabBtnActive]}
          onPress={() => setActiveTab('MY_BOOKINGS')}
        >
          <Text style={[styles.tabText, activeTab === 'MY_BOOKINGS' && styles.tabTextActive]}>
            My Rentals ({myBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {activeTab === 'BROWSE' && (
          <>
            {/* Level Filters */}
            <View style={styles.filterRow}>
              {['ALL', 'Basement 1', 'Basement 2'].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.filterChip, levelFilter === lvl && styles.filterChipActive]}
                  onPress={() => setLevelFilter(lvl)}
                >
                  <Text style={[styles.filterChipText, levelFilter === lvl && styles.filterChipTextActive]}>
                    {lvl}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {listingsLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : filteredListings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="car-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Available Slots Found</Text>
                <Text style={styles.emptyDesc}>Be the first to list your spare spot for your neighbors!</Text>
              </View>
            ) : (
              filteredListings.map((listing) => (
                <View key={listing.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.spotBadge}>
                      <Ionicons name="car" size={16} color={COLORS.primary} />
                      <Text style={styles.spotBadgeText}>{listing.spotNumber}</Text>
                    </View>
                    <View style={styles.tagRow}>
                      {listing.hasEVCharger && (
                        <View style={styles.evTag}>
                          <Ionicons name="flash" size={12} color="#059669" />
                          <Text style={styles.evTagText}>EV Ready</Text>
                        </View>
                      )}
                      <View style={[styles.priceTag, listing.pricingType === 'FREE_GOOD_NEIGHBOR' && styles.freeTag]}>
                        <Text style={[styles.priceTagText, listing.pricingType === 'FREE_GOOD_NEIGHBOR' && styles.freeTagText]}>
                          {listing.pricingType === 'FREE_GOOD_NEIGHBOR' ? '🤝 FREE (Neighbor)' : '₹' + listing.rateINR + '/day'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.locationText}>📍 {listing.level} • Owner: {listing.ownerName} ({listing.ownerFlat})</Text>
                  <Text style={styles.dateText}>🗓️ Available: {listing.startDate} → {listing.endDate}</Text>
                  {listing.notes && <Text style={styles.notesText}>💬 "{listing.notes}"</Text>}

                  <TouchableOpacity
                    style={[styles.bookBtn, listing.status === 'BOOKED' && styles.bookBtnDisabled]}
                    disabled={listing.status === 'BOOKED'}
                    onPress={() => handleOpenBook(listing)}
                  >
                    <Text style={styles.bookBtnText}>
                      {listing.status === 'BOOKED' ? 'Already Booked' : 'Reserve & Enable Gate Access'}
                    </Text>
                    {listing.status !== 'BOOKED' && <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'MY_BOOKINGS' && (
          <>
            {myBookings.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="time-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Active Slot Rentals</Text>
                <Text style={styles.emptyDesc}>When you rent a neighbor's spot, your booking pass and ANPR gate clearance will show here.</Text>
              </View>
            ) : (
              myBookings.map((bk) => (
                <View key={bk.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.spotBadge}>
                      <Ionicons name="key" size={16} color="#059669" />
                      <Text style={styles.spotBadgeText}>{bk.spotNumber}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusBadgeText}>● {bk.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.locationText}>📍 {bk.level} (Owned by {bk.ownerFlat})</Text>
                  <Text style={styles.dateText}>🗓️ Duration: {bk.startDate} to {bk.endDate} ({bk.totalDays} Days)</Text>
                  <Text style={styles.vehicleText}>🚗 Vehicle Plate: {bk.vehicleNumber}</Text>

                  <View style={styles.anprClearanceBox}>
                    <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.anprClearanceTitle}>ANPR Gate Clearance Active</Text>
                      <Text style={styles.anprClearanceDesc}>Pass Code: {bk.bookingCode} • Gates auto-open on approach</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Book Slot Modal */}
      <Modal visible={bookingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reserve Slot {selectedListing?.spotNumber}</Text>
              <TouchableOpacity onPress={() => setBookingModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {selectedListing?.level} • Owned by {selectedListing?.ownerFlat}
            </Text>

            <Text style={styles.inputLabel}>Your Vehicle Plate Number *</Text>
            <TextInput
              style={styles.input}
              value={bookVehicle}
              onChangeText={setBookVehicle}
              placeholder="e.g. KA-01-AB-1234"
              autoCapitalize="characters"
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>From Date</Text>
                <TextInput style={styles.input} value={bookStartDate} onChangeText={setBookStartDate} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>To Date</Text>
                <TextInput style={styles.input} value={bookEndDate} onChangeText={setBookEndDate} />
              </View>
            </View>

            <View style={styles.costBox}>
              <Text style={styles.costBoxLabel}>Total Pricing</Text>
              <Text style={styles.costBoxVal}>
                {selectedListing?.pricingType === 'FREE_GOOD_NEIGHBOR'
                  ? 'FREE (Good Neighbor)'
                  : '₹' + (selectedListing?.rateINR || 0) + ' / day'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmBook}
              disabled={bookMutation.isPending}
            >
              {bookMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Booking & Whitelist Gate</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* List Slot Modal */}
      <Modal visible={listModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>List My Parking Slot</Text>
              <TouchableOpacity onPress={() => setListModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Slot Number & Level</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={listSpotNumber} onChangeText={setListSpotNumber} />
              <TextInput style={[styles.input, { flex: 1 }]} value={listLevel} onChangeText={setListLevel} />
            </View>

            <Text style={styles.inputLabel}>Availability Window</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput style={[styles.input, { flex: 1 }]} value={listStartDate} onChangeText={setListStartDate} />
              <TextInput style={[styles.input, { flex: 1 }]} value={listEndDate} onChangeText={setListEndDate} />
            </View>

            <Text style={styles.inputLabel}>Pricing Model</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.pricingModeBtn, listPricingType === 'DAILY_RATE' && styles.pricingModeBtnActive]}
                onPress={() => setListPricingType('DAILY_RATE')}
              >
                <Text style={[styles.pricingModeText, listPricingType === 'DAILY_RATE' && styles.pricingModeTextActive]}>
                  💰 Daily Rent (₹)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pricingModeBtn, listPricingType === 'FREE_GOOD_NEIGHBOR' && styles.pricingModeBtnActive]}
                onPress={() => setListPricingType('FREE_GOOD_NEIGHBOR')}
              >
                <Text style={[styles.pricingModeText, listPricingType === 'FREE_GOOD_NEIGHBOR' && styles.pricingModeTextActive]}>
                  🤝 Good Neighbor (Free)
                </Text>
              </TouchableOpacity>
            </View>

            {listPricingType === 'DAILY_RATE' && (
              <>
                <Text style={styles.inputLabel}>Rate Per Day (INR)</Text>
                <TextInput
                  style={styles.input}
                  value={listRateINR}
                  onChangeText={setListRateINR}
                  keyboardType="numeric"
                />
              </>
            )}

            <Text style={styles.inputLabel}>Notes for Neighbors</Text>
            <TextInput
              style={[styles.input, { height: 60 }]}
              value={listNotes}
              onChangeText={setListNotes}
              multiline
            />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmList}
              disabled={listMutation.isPending}
            >
              {listMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Publish to Community Pool</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  listBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  listBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  smartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  smartPillText: { color: '#34D399', fontSize: 11, fontWeight: '600' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  spotBadgeText: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  tagRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  evTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  evTagText: { fontSize: 11, color: '#059669', fontWeight: 'bold' },
  priceTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  priceTagText: { fontSize: 12, fontWeight: 'bold', color: '#B45309' },
  freeTag: { backgroundColor: '#ECFDF5' },
  freeTagText: { color: '#047857' },
  locationText: { fontSize: 13, color: '#334155', marginTop: 10, fontWeight: '500' },
  dateText: { fontSize: 12, color: '#64748B', marginTop: 4 },
  vehicleText: { fontSize: 12, color: '#0F172A', fontWeight: '600', marginTop: 4 },
  notesText: { fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 6 },
  bookBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginTop: 14,
  },
  bookBtnDisabled: { backgroundColor: '#94A3B8' },
  bookBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
  },
  statusBadgeText: { color: '#059669', fontSize: 11, fontWeight: 'bold' },
  anprClearanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: RADIUS.md,
    marginTop: 12,
  },
  anprClearanceTitle: { fontSize: 12, fontWeight: 'bold', color: '#166534' },
  anprClearanceDesc: { fontSize: 11, color: '#15803D', marginTop: 2 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  modalSub: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  costBox: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  costBoxLabel: { fontSize: 13, color: '#475569', fontWeight: '600' },
  costBoxVal: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 6,
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  pricingModeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
  },
  pricingModeBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  pricingModeText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  pricingModeTextActive: { color: COLORS.primary, fontWeight: 'bold' },
});
