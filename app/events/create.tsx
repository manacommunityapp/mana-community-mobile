import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, FONTS, SPACING } from '@/constants/config';
import type { CreateEventRequest, EventType, EventLocationType, EventPriceType } from '@/types/api';

const EVENT_TYPES: { value: EventType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'SOCIAL', label: 'Social', icon: 'people', color: '#2563EB' },
  { value: 'SPORTS', label: 'Sports', icon: 'football', color: '#059669' },
  { value: 'CULTURAL', label: 'Cultural', icon: 'color-palette', color: '#7C3AED' },
  { value: 'WORKSHOP', label: 'Workshop', icon: 'school', color: '#4F46E5' },
  { value: 'RELIGIOUS', label: 'Religious', icon: 'heart', color: '#DC2626' },
  { value: 'MEETING', label: 'Meeting', icon: 'briefcase', color: '#0891B2' },
  { value: 'COMMUNITY', label: 'Community', icon: 'home', color: '#4F46E5' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280' },
];

const LOCATION_TYPES: { value: EventLocationType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'PHYSICAL', label: 'In Person', icon: 'location' },
  { value: 'ONLINE', label: 'Online', icon: 'videocam' },
  { value: 'HYBRID', label: 'Hybrid', icon: 'git-merge' },
];

const PRICE_TYPES: { value: EventPriceType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'FREE', label: 'Free', icon: 'gift-outline' },
  { value: 'PAID', label: 'Paid', icon: 'cash-outline' },
];

export default function CreateEventScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('SOCIAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationType, setLocationType] = useState<EventLocationType>('PHYSICAL');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [priceType, setPriceType] = useState<EventPriceType>('FREE');
  const [price, setPrice] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: CreateEventRequest) => eventService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      Alert.alert('Success', 'Event created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert('Error', 'Failed to create event. Please try again.'),
  });

  const handleCreate = () => {
    if (!title.trim()) return Alert.alert('Required', 'Please enter an event title.');
    if (!startDate.trim()) return Alert.alert('Required', 'Please enter a start date (YYYY-MM-DD).');
    if (!startTime.trim()) return Alert.alert('Required', 'Please enter a start time (HH:MM).');

    const data: CreateEventRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      startDate: startDate.trim(),
      endDate: endDate.trim() || startDate.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim() || undefined,
      locationType,
      venue: venue.trim() || undefined,
      city: city.trim() || undefined,
      priceType,
      price: priceType === 'PAID' && price ? parseFloat(price) : undefined,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
      notes: notes.trim() || undefined,
      category: category.trim() || undefined,
    };

    createMutation.mutate(data);
  };

  const selectedType = EVENT_TYPES.find(t => t.value === type);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBtn} hitSlop={8}>
          <Ionicons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Event</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Step 1: Basic info */}
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.stepBadge, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={[s.stepNum, { color: COLORS.primary }]}>1</Text>
              </View>
              <Text style={s.sectionTitle}>Basic Information</Text>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Event Title <Text style={s.required}>*</Text></Text>
              <TextInput
                style={s.input}
                placeholder="What's your event called?"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Event Type</Text>
              <View style={s.typeGrid}>
                {EVENT_TYPES.map(t => {
                  const active = type === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      style={[s.typeCard, active && { borderColor: t.color, backgroundColor: t.color + '0A' }]}
                      onPress={() => setType(t.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.typeIconWrap, { backgroundColor: active ? t.color + '18' : COLORS.surfaceAlt }]}>
                        <Ionicons name={t.icon} size={18} color={active ? t.color : COLORS.textMuted} />
                      </View>
                      <Text style={[s.typeLabel, active && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Category <Text style={s.optional}>(optional)</Text></Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Cricket, Workshop, Festival"
                placeholderTextColor={COLORS.textMuted}
                value={category}
                onChangeText={setCategory}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Description</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Tell people what this event is about..."
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Step 2: Date & Time */}
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.stepBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[s.stepNum, { color: '#059669' }]}>2</Text>
              </View>
              <Text style={s.sectionTitle}>Date & Time</Text>
            </View>

            <View style={s.row}>
              <View style={s.halfField}>
                <Text style={s.subLabel}>Start Date <Text style={s.required}>*</Text></Text>
                <View style={s.inputWithIcon}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={s.inputInner}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>
              </View>
              <View style={s.halfField}>
                <Text style={s.subLabel}>Start Time <Text style={s.required}>*</Text></Text>
                <View style={s.inputWithIcon}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={s.inputInner}
                    placeholder="HH:MM"
                    placeholderTextColor={COLORS.textMuted}
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
              </View>
            </View>
            <View style={s.row}>
              <View style={s.halfField}>
                <Text style={s.subLabel}>End Date</Text>
                <View style={s.inputWithIcon}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={s.inputInner}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>
              </View>
              <View style={s.halfField}>
                <Text style={s.subLabel}>End Time</Text>
                <View style={s.inputWithIcon}>
                  <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
                  <TextInput
                    style={s.inputInner}
                    placeholder="HH:MM"
                    placeholderTextColor={COLORS.textMuted}
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Step 3: Location */}
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.stepBadge, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[s.stepNum, { color: '#DC2626' }]}>3</Text>
              </View>
              <Text style={s.sectionTitle}>Location</Text>
            </View>

            <View style={s.field}>
              <View style={s.segmentRow}>
                {LOCATION_TYPES.map(l => {
                  const active = locationType === l.value;
                  return (
                    <TouchableOpacity
                      key={l.value}
                      style={[s.segment, active && s.segmentActive]}
                      onPress={() => setLocationType(l.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={l.icon} size={15} color={active ? '#fff' : COLORS.textMuted} />
                      <Text style={[s.segmentText, active && s.segmentTextActive]}>{l.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Venue</Text>
              <TextInput
                style={s.input}
                placeholder={locationType === 'ONLINE' ? 'Meeting link' : 'Enter venue name'}
                placeholderTextColor={COLORS.textMuted}
                value={venue}
                onChangeText={setVenue}
              />
            </View>
            {locationType !== 'ONLINE' && (
              <View style={s.field}>
                <Text style={s.label}>City</Text>
                <TextInput
                  style={s.input}
                  placeholder="City"
                  placeholderTextColor={COLORS.textMuted}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            )}
          </View>

          {/* Step 4: Pricing & Capacity */}
          <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.stepBadge, { backgroundColor: '#F5F3FF' }]}>
                <Text style={[s.stepNum, { color: '#7C3AED' }]}>4</Text>
              </View>
              <Text style={s.sectionTitle}>Pricing & Capacity</Text>
            </View>

            <View style={s.field}>
              <View style={s.segmentRow}>
                {PRICE_TYPES.map(p => {
                  const active = priceType === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[s.segment, active && s.segmentActive]}
                      onPress={() => setPriceType(p.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={p.icon} size={15} color={active ? '#fff' : COLORS.textMuted} />
                      <Text style={[s.segmentText, active && s.segmentTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {priceType === 'PAID' && (
                <View style={[s.inputWithIcon, { marginTop: 10 }]}>
                  <Text style={{ fontSize: 16, color: COLORS.textMuted, fontWeight: '600' }}>₹</Text>
                  <TextInput
                    style={s.inputInner}
                    placeholder="Price per person"
                    placeholderTextColor={COLORS.textMuted}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            <View style={s.field}>
              <Text style={s.label}>Max Attendees <Text style={s.optional}>(optional)</Text></Text>
              <View style={s.inputWithIcon}>
                <Ionicons name="people-outline" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={s.inputInner}
                  placeholder="Leave empty for unlimited"
                  placeholderTextColor={COLORS.textMuted}
                  value={maxAttendees}
                  onChangeText={setMaxAttendees}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={s.sectionCard}>
            <View style={s.field}>
              <Text style={s.label}>Additional Notes <Text style={s.optional}>(optional)</Text></Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Any additional information..."
                placeholderTextColor={COLORS.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={s.submitWrap}
            onPress={handleCreate}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={createMutation.isPending ? ['#9CA3AF', '#9CA3AF'] : GRADIENTS.primary}
              style={s.submitBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={s.submitBtnText}>Create Event</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.text,
    fontFamily: FONTS.displayBold, letterSpacing: -0.3,
  },
  scroll: { padding: SPACING.lg, gap: 12 },

  // Section cards
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 13, fontWeight: '800', fontFamily: FONTS.displayEB },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold },

  // Fields
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, fontFamily: FONTS.semiBold },
  subLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontWeight: '500', fontFamily: FONTS.medium },
  required: { color: COLORS.error, fontWeight: '600' },
  optional: { color: COLORS.textMuted, fontWeight: '400', fontSize: 12 },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, fontSize: 15, color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: 12,
  },
  inputInner: {
    flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text, fontFamily: FONTS.regular,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  halfField: { flex: 1 },

  // Type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: '23%',
    minWidth: 70,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  typeIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  typeLabel: { fontSize: 11, fontWeight: '500', color: COLORS.textMuted, fontFamily: FONTS.medium },

  // Segments
  segmentRow: {
    flexDirection: 'row', gap: 0,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 3,
  },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: RADIUS.sm,
  },
  segmentActive: { backgroundColor: COLORS.primary, ...SHADOWS.primary },
  segmentText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted, fontFamily: FONTS.medium },
  segmentTextActive: { color: '#fff', fontWeight: '600' },

  // Submit
  submitWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.primary,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: FONTS.displayBold },
});
