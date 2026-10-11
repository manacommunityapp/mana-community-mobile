import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsService, TripDto } from '@/services/tripsService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';

const CATEGORIES = [
  { key: 'TREKKING', label: 'Trekking & Trails', emoji: '⛰️' },
  { key: 'PILGRIMAGE', label: 'Spiritual Yatra', emoji: '🛕' },
  { key: 'OUTING', label: 'Day Outing', emoji: '🧭' },
  { key: 'CAMPING', label: 'Camping', emoji: '⛺' },
  { key: 'WELLNESS', label: 'Wellness & Yoga', emoji: '🌿' },
];

export default function HostTripScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [step, setStep] = useState(1);

  // Step 1: Basics
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('OUTING');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departurePoint, setDeparturePoint] = useState('Society Main Gate Bus Bay');
  const [pricePerPerson, setPricePerPerson] = useState('1500');
  const [totalSeats, setTotalSeats] = useState('25');

  // Step 2: Transport & Stay
  const [transportType, setTransportType] = useState('AC Luxury Coach');
  const [hotelName, setHotelName] = useState('');
  const [roomTypes, setRoomTypes] = useState('Twin Sharing, Family Suite');

  // Step 3: Highlights & Inclusions
  const [highlights, setHighlights] = useState('Scenic Trail, Group Bonfire, Buffet Lunch');
  const [includes, setIncludes] = useState('Coach Transport, Meals, Guide Charges');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.phone || '+91 98450 12345');

  const createTripMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<TripDto> = {
        title: title || `${destination} Community Getaway`,
        category,
        destination,
        departureDate: departureDate || new Date(Date.now() + 14 * 86400000).toISOString(),
        departurePoint,
        duration: 'Weekend Getaway',
        totalSeats: Number(totalSeats) || 20,
        bookedSeats: 1,
        pricePerPerson: Number(pricePerPerson) || 1000,
        host: user?.name || user?.fullName || 'Community Host',
        hostFlat: user?.flatNumber || 'Tower A',
        hostPhone: emergencyPhone,
        transport: transportType,
        highlights: highlights.split(',').map((s) => s.trim()).filter(Boolean),
        includes: includes.split(',').map((s) => s.trim()).filter(Boolean),
        accommodationDetails: {
          hotelName: hotelName || 'Curated Resort / Homestay',
          hotelAddress: destination,
          roomTypes: roomTypes.split(',').map((s) => s.trim()).filter(Boolean),
        },
        emergencyMarshal: {
          name: user?.name || user?.fullName || 'Host Marshal',
          phone: emergencyPhone,
          firstAidCertified: true,
        },
        status: 'UPCOMING',
      };
      return await tripsService.createTrip(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      Alert.alert('Trip Published! 🎉', 'Your trip is now live for community residents to book.', [
        { text: 'View Trips', onPress: () => router.replace('/trips') },
      ]);
    },
    onError: () => Alert.alert('Error', 'Could not create trip. Please try again.'),
  });

  const handleNext = () => {
    if (step === 1) {
      if (!destination.trim() || !title.trim()) {
        Alert.alert('Required Fields', 'Please enter a trip title and destination.');
        return;
      }
    }
    setStep(step + 1);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Host a Community Trip</Text>
          <Text style={s.headerSub}>Step {step} of 3</Text>
        </View>
      </View>

      {/* Progress Strip */}
      <View style={s.progressStrip}>
        <View style={[s.progressBar, { width: `${(step / 3) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Basics */}
        {step === 1 && (
          <View style={s.stepWrap}>
            <Text style={s.sectionHead}>1. Trip Overview</Text>

            <Text style={s.label}>Category</Text>
            <View style={s.catRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[s.catPill, category === c.key && s.catPillActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={s.catEmoji}>{c.emoji}</Text>
                  <Text style={[s.catText, category === c.key && s.catTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Trip Title *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Monsoon Nature Trail & Waterfalls"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={s.label}>Destination *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Coorg, Karnataka"
              placeholderTextColor={COLORS.textMuted}
              value={destination}
              onChangeText={setDestination}
            />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Departure Date</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                  value={departureDate}
                  onChangeText={setDepartureDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Fare / Seat (₹)</Text>
                <TextInput
                  style={s.input}
                  keyboardType="number-pad"
                  placeholder="1500"
                  placeholderTextColor={COLORS.textMuted}
                  value={pricePerPerson}
                  onChangeText={setPricePerPerson}
                />
              </View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Total Bus Seats</Text>
                <TextInput
                  style={s.input}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor={COLORS.textMuted}
                  value={totalSeats}
                  onChangeText={setTotalSeats}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Pickup Bay</Text>
                <TextInput
                  style={s.input}
                  placeholder="Main Gate Bus Bay"
                  placeholderTextColor={COLORS.textMuted}
                  value={departurePoint}
                  onChangeText={setDeparturePoint}
                />
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Transport & Stay */}
        {step === 2 && (
          <View style={s.stepWrap}>
            <Text style={s.sectionHead}>2. Transport & Accommodation</Text>

            <Text style={s.label}>Vehicle / Transport Mode</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. AC Volvo Luxury Coach (35-Seater)"
              placeholderTextColor={COLORS.textMuted}
              value={transportType}
              onChangeText={setTransportType}
            />

            <Text style={s.label}>Hotel / Resort / Homestay Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Rainforest Valley Resort"
              placeholderTextColor={COLORS.textMuted}
              value={hotelName}
              onChangeText={setHotelName}
            />

            <Text style={s.label}>Room Configurations Available</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Twin Sharing, Family 4-Bed, Private Cottage"
              placeholderTextColor={COLORS.textMuted}
              value={roomTypes}
              onChangeText={setRoomTypes}
            />
          </View>
        )}

        {/* Step 3: Highlights & Confirmation */}
        {step === 3 && (
          <View style={s.stepWrap}>
            <Text style={s.sectionHead}>3. Inclusions & Host Safety</Text>

            <Text style={s.label}>Key Highlights (comma-separated)</Text>
            <TextInput
              style={[s.input, { height: 60 }]}
              multiline
              placeholder="e.g. Campfire night, guided trail, waterfall visit"
              placeholderTextColor={COLORS.textMuted}
              value={highlights}
              onChangeText={setHighlights}
            />

            <Text style={s.label}>Fare Includes (comma-separated)</Text>
            <TextInput
              style={[s.input, { height: 60 }]}
              multiline
              placeholder="e.g. AC Bus, Buffet Meals, Stay, Forest Entry Pass"
              placeholderTextColor={COLORS.textMuted}
              value={includes}
              onChangeText={setIncludes}
            />

            <Text style={s.label}>Host / Emergency Contact Phone *</Text>
            <TextInput
              style={s.input}
              keyboardType="phone-pad"
              placeholder="+91 98450 12345"
              placeholderTextColor={COLORS.textMuted}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
            />
          </View>
        )}

        {/* Bottom Buttons */}
        <View style={s.btnRow}>
          {step > 1 && (
            <TouchableOpacity style={s.prevBtn} onPress={() => setStep(step - 1)}>
              <Text style={s.prevBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < 3 ? (
            <TouchableOpacity style={s.nextBtn} onPress={handleNext}>
              <Text style={s.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.nextBtn, createTripMutation.isPending && { opacity: 0.6 }]}
              disabled={createTripMutation.isPending}
              onPress={() => createTripMutation.mutate()}
            >
              {createTripMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={s.nextBtnText}>Publish Trip</Text>
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  progressStrip: {
    height: 3,
    backgroundColor: '#E2E8F0',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  stepWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    gap: 10,
    ...SHADOWS.sm,
  },
  sectionHead: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  catEmoji: {
    fontSize: 13,
  },
  catText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  catTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  prevBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  prevBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
  },
});
