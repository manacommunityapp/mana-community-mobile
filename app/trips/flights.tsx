import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';
import {
  flightService,
  FlightOption,
  FlightSearchResponse,
  FlightFareQuoteResponse,
  PassengerInfo,
} from '@/services/flightService';

// ── Step enum ────────────────────────────────────────────────────────────────

type Step = 'SEARCH' | 'RESULTS' | 'FARE_CONFIRM' | 'PASSENGER' | 'CONFIRMED';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTime(iso: string): string {
  if (!iso) return '--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return iso.slice(11, 16) || '--';
  }
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function FlightsScreen() {
  const params = useLocalSearchParams<{
    origin?: string;
    destination?: string;
    date?: string;
    adults?: string;
  }>();
  const router = useRouter();

  // Search form state
  const [origin, setOrigin] = useState(params.origin?.toUpperCase() || 'BLR');
  const [destination, setDestination] = useState(params.destination?.toUpperCase() || 'DEL');
  const [date, setDate] = useState(params.date || new Date().toISOString().slice(0, 10));
  const [adults, setAdults] = useState(parseInt(params.adults || '1', 10));

  // Multi-step state
  const [step, setStep] = useState<Step>('SEARCH');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<FlightSearchResponse | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [fareQuote, setFareQuote] = useState<FlightFareQuoteResponse | null>(null);
  const [passenger, setPassenger] = useState<PassengerInfo>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'MALE',
    passengerType: 'ADULT',
  });
  const [confirmedPnr, setConfirmedPnr] = useState('');

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (origin.length !== 3 || destination.length !== 3) {
      Alert.alert('Invalid', 'Please enter valid 3-letter IATA airport codes.');
      return;
    }
    setLoading(true);
    try {
      const result = await flightService.search({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departureDate: date,
        adults,
      });
      setSearchResult(result);
      setStep('RESULTS');
    } catch (e: any) {
      Alert.alert('Search Failed', e?.message || 'Unable to fetch flights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [origin, destination, date, adults]);

  const handleSelectFlight = useCallback(async (flight: FlightOption) => {
    if (!searchResult) return;
    setSelectedFlight(flight);
    setLoading(true);
    try {
      const quote = await flightService.fareQuote(searchResult.searchId, flight.optionId);
      setFareQuote(quote);
      setStep('FARE_CONFIRM');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not re-validate fare. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchResult]);

  const handleConfirmFare = useCallback(() => {
    if (!fareQuote?.available) {
      Alert.alert('Unavailable', 'This flight is no longer available. Please search again.');
      setStep('SEARCH');
      return;
    }
    setStep('PASSENGER');
  }, [fareQuote]);

  const handleBookFlight = useCallback(async () => {
    if (!searchResult || !selectedFlight || !fareQuote) return;
    if (!passenger.firstName.trim() || !passenger.lastName.trim() || !passenger.dateOfBirth.trim()) {
      Alert.alert('Missing Info', 'Please fill all required passenger details.');
      return;
    }
    setLoading(true);
    try {
      const bookResp = await flightService.book({
        searchId: searchResult.searchId,
        optionId: selectedFlight.optionId,
        passengers: [passenger],
      });
      if (bookResp.status === 'FAILED') {
        Alert.alert('Booking Failed', 'Could not hold the booking. Please try again.');
        return;
      }
      // In production: open Razorpay with bookResp.paymentRef, then call issueTicket.
      // For now we show a confirmation with the PNR.
      setConfirmedPnr(bookResp.airlinePnr || bookResp.bookingId);
      setStep('CONFIRMED');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchResult, selectedFlight, fareQuote, passenger]);

  // ── Render steps ──────────────────────────────────────────────────────────

  if (step === 'SEARCH') return <SearchForm {...{ origin, setOrigin, destination, setDestination, date, setDate, adults, setAdults, loading, handleSearch }} />;
  if (step === 'RESULTS') return <ResultsList flights={searchResult?.flights || []} loading={loading} onSelect={handleSelectFlight} onBack={() => setStep('SEARCH')} />;
  if (step === 'FARE_CONFIRM') return <FareConfirmView flight={selectedFlight!} quote={fareQuote} loading={loading} onConfirm={handleConfirmFare} onBack={() => setStep('RESULTS')} />;
  if (step === 'PASSENGER') return <PassengerForm passenger={passenger} setPassenger={setPassenger} fare={fareQuote?.currentTotalFare || 0} loading={loading} onBook={handleBookFlight} onBack={() => setStep('FARE_CONFIRM')} />;
  if (step === 'CONFIRMED') return <ConfirmationView pnr={confirmedPnr} onDone={() => router.back()} />;
  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SearchForm({ origin, setOrigin, destination, setDestination, date, setDate, adults, setAdults, loading, handleSearch }: any) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.searchContainer}>
        <Text style={styles.heading}>✈ Search Flights</Text>

        <Text style={styles.label}>From (IATA code)</Text>
        <TextInput
          style={styles.input}
          value={origin}
          onChangeText={v => setOrigin(v.toUpperCase())}
          placeholder="e.g. BLR"
          maxLength={3}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>To (IATA code)</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={v => setDestination(v.toUpperCase())}
          placeholder="e.g. GOI"
          maxLength={3}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="2026-11-15"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Passengers (Adults)</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity style={styles.counterBtn} onPress={() => setAdults((a: number) => Math.max(1, a - 1))}>
            <Text style={styles.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{adults}</Text>
          <TouchableOpacity style={styles.counterBtn} onPress={() => setAdults((a: number) => Math.min(9, a + 1))}>
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Search Flights</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ResultsList({ flights, loading, onSelect, onBack }: { flights: FlightOption[]; loading: boolean; onSelect: (f: FlightOption) => void; onBack: () => void }) {
  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Re-validating fare…</Text></View>;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        <Text style={styles.backBtnText}>Modify Search</Text>
      </TouchableOpacity>

      {flights.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No flights found. Try different dates or airports.</Text>
        </View>
      ) : (
        <FlatList
          data={flights}
          keyExtractor={f => f.optionId}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => <FlightCard flight={item} onSelect={onSelect} />}
        />
      )}
    </View>
  );
}

function FlightCard({ flight, onSelect }: { flight: FlightOption; onSelect: (f: FlightOption) => void }) {
  const seg = flight.segments[0];
  const lastSeg = flight.segments[flight.segments.length - 1];
  return (
    <TouchableOpacity style={styles.flightCard} onPress={() => onSelect(flight)}>
      <View style={styles.flightCardHeader}>
        <Text style={styles.airlineName}>{seg?.airlineName || seg?.airlineCode}</Text>
        <Text style={styles.flightNum}>{seg?.flightNumber}</Text>
        {flight.stops === 0 && <View style={styles.directBadge}><Text style={styles.directBadgeText}>Direct</Text></View>}
      </View>

      <View style={styles.flightTimingRow}>
        <View style={styles.flightTimingCol}>
          <Text style={styles.flightTimeText}>{formatTime(seg?.originTime)}</Text>
          <Text style={styles.flightCodeText}>{seg?.originCode}</Text>
        </View>
        <View style={styles.flightMiddle}>
          <Text style={styles.durationText}>{formatDuration(flight.totalDurationMinutes || flight.segments.reduce((a, s) => a + s.durationMinutes, 0))}</Text>
          <View style={styles.flightLine}><View style={styles.flightDot} /><View style={styles.flightDash} /><View style={styles.flightDot} /></View>
          {flight.stops > 0 && <Text style={styles.stopsText}>{flight.stops} stop{flight.stops > 1 ? 's' : ''}</Text>}
        </View>
        <View style={[styles.flightTimingCol, { alignItems: 'flex-end' }]}>
          <Text style={styles.flightTimeText}>{formatTime(lastSeg?.destinationTime)}</Text>
          <Text style={styles.flightCodeText}>{lastSeg?.destinationCode}</Text>
        </View>
      </View>

      <View style={styles.flightCardFooter}>
        <Text style={styles.fareText}>₹{(flight.fare?.totalFare || 0).toLocaleString('en-IN')}<Text style={styles.fareSubText}>/adult</Text></Text>
        <View style={styles.selectBtn}><Text style={styles.selectBtnText}>Select →</Text></View>
      </View>
    </TouchableOpacity>
  );
}

function FareConfirmView({ flight, quote, loading, onConfirm, onBack }: any) {
  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Checking live fare…</Text></View>;

  const seg = flight?.segments?.[0];
  const lastSeg = flight?.segments?.[flight.segments.length - 1];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
        <Text style={styles.backBtnText}>Back to Results</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Confirm Fare</Text>

      <View style={styles.fareCard}>
        <Text style={styles.fareCardTitle}>{seg?.airlineName} {seg?.flightNumber}</Text>
        <Text style={styles.fareCardRoute}>{seg?.originCode} → {lastSeg?.destinationCode}</Text>
        <Text style={styles.fareCardDate}>{formatDate(seg?.originTime)}</Text>

        {quote?.priceChanged && (
          <View style={styles.priceChangedBanner}>
            <Ionicons name="alert-circle" size={15} color="#B45309" />
            <Text style={styles.priceChangedText}>
              Fare updated: ₹{quote.previousTotalFare?.toLocaleString('en-IN')} → ₹{quote.currentTotalFare?.toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        <View style={styles.fareSummaryRow}>
          <Text style={styles.fareSummaryLabel}>Current fare (per adult)</Text>
          <Text style={styles.fareSummaryValue}>₹{(quote?.currentTotalFare || 0).toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.fareSummaryRow}>
          <Text style={styles.fareSummaryLabel}>Seats available</Text>
          <Text style={styles.fareSummaryValue}>{quote?.seatsAvailable ?? '—'}</Text>
        </View>
        {quote?.refundable !== undefined && (
          <View style={styles.fareSummaryRow}>
            <Text style={styles.fareSummaryLabel}>Refundable</Text>
            <Text style={styles.fareSummaryValue}>{quote?.refundable ? 'Yes' : 'No'}</Text>
          </View>
        )}
      </View>

      {!quote?.available && (
        <Text style={styles.unavailableText}>This flight is no longer available. Please go back and choose another.</Text>
      )}

      <TouchableOpacity
        style={[styles.primaryBtn, !quote?.available && styles.disabledBtn]}
        onPress={onConfirm}
        disabled={!quote?.available}
      >
        <Text style={styles.primaryBtnText}>Continue to Passenger Details</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PassengerForm({ passenger, setPassenger, fare, loading, onBook, onBack }: any) {
  const update = (key: keyof PassengerInfo, val: any) =>
    setPassenger((prev: PassengerInfo) => ({ ...prev, [key]: val }));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Passenger Details</Text>

        <Text style={styles.label}>First Name *</Text>
        <TextInput style={styles.input} value={passenger.firstName} onChangeText={v => update('firstName', v)} placeholder="As on ID" />

        <Text style={styles.label}>Last Name *</Text>
        <TextInput style={styles.input} value={passenger.lastName} onChangeText={v => update('lastName', v)} placeholder="As on ID" />

        <Text style={styles.label}>Date of Birth * (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={passenger.dateOfBirth} onChangeText={v => update('dateOfBirth', v)} placeholder="1990-01-15" keyboardType="numeric" />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          {(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, passenger.gender === g && styles.genderBtnActive]}
              onPress={() => update('gender', g)}
            >
              <Text style={[styles.genderBtnText, passenger.gender === g && styles.genderBtnActiveText]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Meal Preference</Text>
        <View style={styles.genderRow}>
          {(['VEG', 'NON_VEG', 'JAIN'] as const).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.genderBtn, passenger.mealPreference === m && styles.genderBtnActive]}
              onPress={() => update('mealPreference', m)}
            >
              <Text style={[styles.genderBtnText, passenger.mealPreference === m && styles.genderBtnActiveText]}>{m.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.fareSummaryCard}>
          <Text style={styles.fareSummaryCardLabel}>Total to Pay</Text>
          <Text style={styles.fareSummaryCardValue}>₹{fare.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={onBook} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Hold & Proceed to Payment</Text>}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Payment is processed via Razorpay. Tickets are issued only after successful payment. Prices include all taxes.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ConfirmationView({ pnr, onDone }: { pnr: string; onDone: () => void }) {
  return (
    <View style={[styles.container, styles.centered]}>
      <Ionicons name="checkmark-circle" size={72} color="#16A34A" />
      <Text style={styles.confirmedTitle}>Booking Held!</Text>
      <Text style={styles.confirmedSubtitle}>Your PNR</Text>
      <Text style={styles.pnrText}>{pnr}</Text>
      <Text style={styles.confirmedNote}>Complete payment to issue your e-ticket. Check your email for booking details.</Text>
      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 32, width: '80%' }]} onPress={onDone}>
        <Text style={styles.primaryBtnText}>Back to Trips</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  searchContainer: { padding: 20 },
  heading: { fontSize: 20, fontFamily: 'DMSans-Bold', color: '#0F172A', marginBottom: 20 },
  label: { fontSize: 13, color: '#64748B', marginBottom: 4, marginTop: 12, fontFamily: 'DMSans-Medium' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0F172A',
    fontFamily: 'DMSans-Regular',
  },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  counterValue: { fontSize: 18, fontFamily: 'DMSans-Bold', color: '#0F172A', minWidth: 24, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans-Bold' },
  disabledBtn: { opacity: 0.5 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 8 },
  backBtnText: { color: COLORS.primary, fontFamily: 'DMSans-Medium', fontSize: 14 },
  loadingText: { marginTop: 12, color: '#64748B', fontFamily: 'DMSans-Regular' },
  emptyText: { color: '#64748B', textAlign: 'center', fontFamily: 'DMSans-Regular', fontSize: 15 },

  flightCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  flightCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  airlineName: { fontSize: 14, fontFamily: 'DMSans-Bold', color: '#0F172A', flex: 1 },
  flightNum: { fontSize: 12, color: '#64748B', fontFamily: 'DMSans-Regular' },
  directBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  directBadgeText: { fontSize: 10, color: '#16A34A', fontFamily: 'DMSans-Bold' },
  flightTimingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  flightTimingCol: { alignItems: 'flex-start', minWidth: 56 },
  flightTimeText: { fontSize: 20, fontFamily: 'DMSans-Bold', color: '#0F172A' },
  flightCodeText: { fontSize: 12, color: '#64748B', fontFamily: 'DMSans-Regular' },
  flightMiddle: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  durationText: { fontSize: 11, color: '#64748B', marginBottom: 4, fontFamily: 'DMSans-Regular' },
  flightLine: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  flightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8' },
  flightDash: { flex: 1, height: 1, backgroundColor: '#CBD5E1' },
  stopsText: { fontSize: 10, color: '#EF4444', marginTop: 2, fontFamily: 'DMSans-Regular' },
  flightCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fareText: { fontSize: 18, fontFamily: 'DMSans-Bold', color: '#0F172A' },
  fareSubText: { fontSize: 12, fontFamily: 'DMSans-Regular', color: '#64748B' },
  selectBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  selectBtnText: { color: '#fff', fontFamily: 'DMSans-Bold', fontSize: 13 },

  fareCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  fareCardTitle: { fontSize: 16, fontFamily: 'DMSans-Bold', color: '#0F172A' },
  fareCardRoute: { fontSize: 20, fontFamily: 'DMSans-Bold', color: COLORS.primary, marginTop: 4 },
  fareCardDate: { fontSize: 13, color: '#64748B', marginTop: 2, marginBottom: 12, fontFamily: 'DMSans-Regular' },
  priceChangedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  priceChangedText: { fontSize: 12, color: '#B45309', fontFamily: 'DMSans-Medium', flex: 1 },
  fareSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fareSummaryLabel: { fontSize: 13, color: '#64748B', fontFamily: 'DMSans-Regular' },
  fareSummaryValue: { fontSize: 13, color: '#0F172A', fontFamily: 'DMSans-Bold' },
  unavailableText: { color: '#EF4444', textAlign: 'center', marginBottom: 16, fontFamily: 'DMSans-Regular' },

  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  genderBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  genderBtnText: { fontSize: 12, fontFamily: 'DMSans-Medium', color: '#64748B' },
  genderBtnActiveText: { color: COLORS.primary },
  fareSummaryCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  fareSummaryCardLabel: { fontSize: 14, color: '#0284C7', fontFamily: 'DMSans-Medium' },
  fareSummaryCardValue: { fontSize: 18, color: '#0284C7', fontFamily: 'DMSans-Bold' },
  disclaimer: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 16, lineHeight: 16, fontFamily: 'DMSans-Regular' },

  confirmedTitle: { fontSize: 24, fontFamily: 'DMSans-Bold', color: '#0F172A', marginTop: 16 },
  confirmedSubtitle: { fontSize: 13, color: '#64748B', fontFamily: 'DMSans-Regular', marginTop: 8 },
  pnrText: { fontSize: 28, fontFamily: 'DMSans-Bold', color: COLORS.primary, letterSpacing: 3, marginTop: 4 },
  confirmedNote: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 16, lineHeight: 20, fontFamily: 'DMSans-Regular' },
});
