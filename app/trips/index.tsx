import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';

interface Trip {
  id: string;
  title: string;
  category: string;
  destination: string;
  departureDate: string;
  departurePoint: string;
  totalSeats: number;
  bookedSeats: number;
  pricePerPerson: number;
  host: string;
  hostFlat: string;
  transport: string;
}

const SAMPLE_TRIPS: Trip[] = [
  {
    id: 'TRP-1',
    title: 'Kedarnath Spiritual Yatra',
    category: 'Pilgrimage',
    destination: 'Kedarnath, Uttarakhand',
    departureDate: 'Oct 25, 2026',
    departurePoint: 'Main Gate Society Bus Bay',
    totalSeats: 35,
    bookedSeats: 22,
    pricePerPerson: 18500,
    host: 'Suresh Iyer',
    hostFlat: 'A-401',
    transport: 'AC Luxury Coach',
  },
  {
    id: 'TRP-2',
    title: 'Coorg Coffee Plantation & Trek',
    category: 'Trekking',
    destination: 'Coorg, Karnataka',
    departureDate: 'Nov 12, 2026',
    departurePoint: 'Clubhouse Parking',
    totalSeats: 20,
    bookedSeats: 16,
    pricePerPerson: 4200,
    host: 'Ananya Sharma',
    hostFlat: 'B-204',
    transport: 'Tempo Traveller',
  },
  {
    id: 'TRP-3',
    title: 'Pawna Lake Stargazing Camp',
    category: 'Camping',
    destination: 'Pawna Lake, Maharashtra',
    departureDate: 'Nov 28, 2026',
    departurePoint: 'Society Gate 2',
    totalSeats: 25,
    bookedSeats: 10,
    pricePerPerson: 2800,
    host: 'Rahul Deshmukh',
    hostFlat: 'C-102',
    transport: 'Shared Carpool / Mini Bus',
  },
];

export default function TripsScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [bookings, setBookings] = useState<Array<{ id: string; title: string; seats: number; total: number; qr: string }>>([
    { id: 'BKG-771', title: 'Kedarnath Spiritual Yatra', seats: 2, total: 37000, qr: 'BP-KEDARNATH-A1204-2PAX' },
  ]);
  const [qrPass, setQrPass] = useState<string | null>(null);

  const categories = ['ALL', 'Pilgrimage', 'Trekking', 'Camping', 'Outing'];

  const filteredTrips = SAMPLE_TRIPS.filter((t) => {
    if (selectedCategory === 'ALL') return true;
    return t.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleConfirmBook = () => {
    if (!selectedTrip) return;
    setIsBooking(true);
    setTimeout(() => {
      setIsBooking(false);
      const newBooking = {
        id: `BKG-${Math.floor(100 + Math.random() * 900)}`,
        title: selectedTrip.title,
        seats: passengers,
        total: selectedTrip.pricePerPerson * passengers,
        qr: `BP-${selectedTrip.id}-${user?.flatNumber || 'UNIT'}-${passengers}PAX`,
      };
      setBookings([newBooking, ...bookings]);
      setSelectedTrip(null);
      setPassengers(1);
      Alert.alert('🎟️ Booking Confirmed', 'Your digital boarding pass has been issued!');
    }, 800);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Category Chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, selectedCategory === c && styles.chipActive]}
            onPress={() => setSelectedCategory(c)}
          >
            <Text style={[styles.chipText, selectedCategory === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── My Active Bookings (if any) ── */}
      {bookings.length > 0 && (
        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={styles.sectionTitle}>My Trip Bookings ({bookings.length})</Text>
          {bookings.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingId}>{b.id}</Text>
                <View style={styles.passBadge}>
                  <Text style={styles.passBadgeText}>CONFIRMED</Text>
                </View>
              </View>
              <Text style={styles.bookingTitle}>{b.title}</Text>
              <View style={styles.bookingRow}>
                <Text style={styles.bookingSeats}>Seats: {b.seats} Person(s)</Text>
                <Text style={styles.bookingTotal}>₹{b.total.toLocaleString()}</Text>
              </View>
              <TouchableOpacity
                style={styles.bpButton}
                onPress={() => setQrPass(b.qr)}
              >
                <Ionicons name="qr-code-outline" size={16} color="#2563EB" />
                <Text style={styles.bpButtonText}>Digital Boarding Pass</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ── Trips Grid ── */}
      <Text style={styles.sectionTitle}>Upcoming Community Getaways</Text>
      <View style={{ gap: SPACING.lg }}>
        {filteredTrips.map((trip) => {
          const seatsLeft = trip.totalSeats - trip.bookedSeats;
          return (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{trip.category}</Text>
                </View>
                <Text style={styles.transportText}>🚌 {trip.transport}</Text>
              </View>

              <Text style={styles.tripTitle}>{trip.title}</Text>
              <Text style={styles.destinationText}>📍 {trip.destination}</Text>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Departure:</Text>
                  <Text style={styles.infoValue}>{trip.departureDate}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pickup Point:</Text>
                  <Text style={styles.infoValue}>{trip.departurePoint}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Seats Available:</Text>
                  <Text style={[styles.infoValue, { color: seatsLeft <= 5 ? '#DC2626' : '#059669', fontWeight: '800' }]}>
                    {seatsLeft} / {trip.totalSeats}
                  </Text>
                </View>
              </View>

              <View style={styles.priceFooter}>
                <View>
                  <Text style={styles.priceLabel}>Price per seat</Text>
                  <Text style={styles.priceValue}>₹{trip.pricePerPerson.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => {
                    setSelectedTrip(trip);
                    setPassengers(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bookBtnText}>Book Seats →</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Booking Modal ── */}
      <Modal visible={!!selectedTrip} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book Trip Seats</Text>
            <Text style={styles.modalSubtitle}>{selectedTrip?.title}</Text>

            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Number of Passengers:</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setPassengers(Math.max(1, passengers - 1))}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{passengers}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setPassengers(passengers + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Fare:</Text>
              <Text style={styles.totalValue}>
                ₹{((selectedTrip?.pricePerPerson || 0) * passengers).toLocaleString()}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSelectedTrip(null)}
                disabled={isBooking}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmBook}
                disabled={isBooking}
              >
                {isBooking ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Boarding Pass QR Modal ── */}
      <Modal visible={!!qrPass} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <Ionicons name="qr-code" size={130} color="#1E3A8A" />
            <Text style={styles.qrPassText}>{qrPass}</Text>
            <Text style={styles.qrHint}>Show this digital pass to the bus marshal at departure.</Text>
            <TouchableOpacity
              style={[styles.cancelBtn, { width: '100%', marginTop: SPACING.lg }]}
              onPress={() => setQrPass(null)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  chipScroll: { flexDirection: 'row', marginBottom: SPACING.lg },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  bookingCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: SPACING.sm,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  bookingId: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700', color: '#1E40AF' },
  passBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  passBadgeText: { fontSize: 9, fontWeight: '800', color: '#1E40AF' },
  bookingTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  bookingRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  bookingSeats: { fontSize: 12, color: COLORS.textSecondary },
  bookingTotal: { fontSize: 13, fontWeight: '800', color: '#2563EB' },
  bpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    marginTop: 4,
    gap: 4,
  },
  bpButtonText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  tripCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  categoryText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  transportText: { fontSize: 11, color: COLORS.textMuted },
  tripTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: SPACING.xs },
  destinationText: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginTop: 2 },
  infoBox: { backgroundColor: '#F9FAFB', padding: SPACING.md, borderRadius: RADIUS.md, marginVertical: SPACING.md, gap: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 11, color: COLORS.textMuted },
  infoValue: { fontSize: 11, color: COLORS.text, fontWeight: '600' },
  priceFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  priceLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase' },
  priceValue: { fontSize: 18, fontWeight: '800', color: '#1E3A8A' },
  bookBtn: { backgroundColor: '#2563EB', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  bookBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.md },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: SPACING.md },
  qtyLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  qtyValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md, marginBottom: SPACING.lg },
  totalLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#2563EB' },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#2563EB', alignItems: 'center' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  qrPassText: { fontSize: 13, fontFamily: 'monospace', fontWeight: '800', color: COLORS.text, marginTop: SPACING.md },
  qrHint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs },
});
