import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, FONTS, SPACING } from '@/constants/config';
import type { CreateEventRequest, EventType, EventLocationType, EventPriceType } from '@/types/api';

const { width: SCREEN_W } = Dimensions.get('window');

const EVENT_TYPES: { value: EventType; label: string; emoji: string; color: string; bg: string }[] = [
  { value: 'SOCIAL',    label: 'Social',    emoji: '🎉', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'SPORTS',    label: 'Sports',    emoji: '⚽', color: '#059669', bg: '#ECFDF5' },
  { value: 'CULTURAL',  label: 'Cultural',  emoji: '🎨', color: '#7C3AED', bg: '#F5F3FF' },
  { value: 'WORKSHOP',  label: 'Workshop',  emoji: '🎓', color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'RELIGIOUS', label: 'Religious', emoji: '🙏', color: '#DC2626', bg: '#FEF2F2' },
  { value: 'MEETING',   label: 'Meeting',   emoji: '💼', color: '#0891B2', bg: '#ECFEFF' },
  { value: 'COMMUNITY', label: 'Community', emoji: '🏠', color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'OTHER',     label: 'Other',     emoji: '📌', color: '#6B7280', bg: '#F1F5F9' },
];

const LOCATION_TYPES: { value: EventLocationType; label: string; emoji: string }[] = [
  { value: 'PHYSICAL', label: 'In Person', emoji: '📍' },
  { value: 'ONLINE',   label: 'Online',    emoji: '💻' },
  { value: 'HYBRID',   label: 'Hybrid',    emoji: '🔗' },
];

const PRICE_TYPES: { value: EventPriceType; label: string; emoji: string }[] = [
  { value: 'FREE', label: 'Free',  emoji: '🎁' },
  { value: 'PAID', label: 'Paid',  emoji: '💳' },
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
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.navBtn} hitSlop={8}>
          <Ionicons name="close" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerEmoji}>✍️</Text>
          <Text style={st.headerTitle}>Create Event</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          {/* Step 1: Basic info */}
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <LinearGradient
                colors={GRADIENTS.primary}
                style={st.stepBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={st.stepNum}>1</Text>
              </LinearGradient>
              <Text style={st.sectionTitle}>Basic Information</Text>
            </View>

            <View style={st.field}>
              <Text style={st.label}>Event Title <Text style={st.required}>*</Text></Text>
              <View style={st.inputWithIcon}>
                <Text style={st.inputEmoji}>📝</Text>
                <TextInput
                  style={st.inputInner}
                  placeholder="What's your event called?"
                  placeholderTextColor={COLORS.textMuted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
              <Text style={s.sectionTitle}>Basic Information</Text>
            </View>

            <View style={st.field}>
              <Text style={st.label}>Event Type</Text>
              <View style={st.typeGrid}>
                {EVENT_TYPES.map(t => {
                  const active = type === t.value;
                  return (
                    <TouchableOpacity
                      key={t.value}
                      style={[
                        st.typeCard,
                        active && { borderColor: t.color, backgroundColor: t.bg },
                      ]}
                      onPress={() => setType(t.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        st.typeIconWrap,
                        { backgroundColor: active ? t.color + '18' : '#F1F5F9' },
                      ]}>
                        <Text style={st.typeEmoji}>{t.emoji}</Text>
                      </View>
                      <Text style={[st.typeLabel, active && { color: t.color, fontWeight: '700' }]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={st.field}>
              <Text style={st.label}>Category <Text style={st.optional}>(optional)</Text></Text>
              <View style={st.inputWithIcon}>
                <Text style={st.inputEmoji}>🏷️</Text>
                <TextInput
                  style={st.inputInner}
                  placeholder="e.g. Cricket, Workshop, Festival"
                  placeholderTextColor={COLORS.textMuted}
                  value={category}
                  onChangeText={setCategory}
                />
              </View>
            </View>

            <View style={st.field}>
              <Text style={st.label}>Description</Text>
              <TextInput
                style={[st.input, st.textArea]}
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
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <LinearGradient
                colors={['#059669', '#10B981']}
                style={st.stepBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={st.stepNum}>2</Text>
              </LinearGradient>
              <Text style={st.sectionTitle}>Date & Time</Text>
            </View>

            <View style={st.row}>
              <View style={st.halfField}>
                <Text style={st.subLabel}>Start Date <Text style={st.required}>*</Text></Text>
                <View style={st.inputWithIcon}>
                  <Text style={st.inputEmoji}>📅</Text>
                  <TextInput
                    style={st.inputInner}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </View>
              </View>
              <View style={st.halfField}>
                <Text style={st.subLabel}>Start Time <Text style={st.required}>*</Text></Text>
                <View style={st.inputWithIcon}>
                  <Text style={st.inputEmoji}>🕐</Text>
                  <TextInput
                    style={st.inputInner}
                    placeholder="HH:MM"
                    placeholderTextColor={COLORS.textMuted}
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
              </View>
            </View>
            <View style={st.row}>
              <View style={st.halfField}>
                <Text style={st.subLabel}>End Date</Text>
                <View style={st.inputWithIcon}>
                  <Text style={st.inputEmoji}>📅</Text>
                  <TextInput
                    style={st.inputInner}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </View>
              </View>
              <View style={st.halfField}>
                <Text style={st.subLabel}>End Time</Text>
                <View style={st.inputWithIcon}>
                  <Text style={st.inputEmoji}>🕐</Text>
                  <TextInput
                    style={st.inputInner}
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
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <LinearGradient
                colors={['#DC2626', '#EF4444']}
                style={st.stepBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={st.stepNum}>3</Text>
              </LinearGradient>
              <Text style={st.sectionTitle}>Location</Text>
            </View>

            <View style={st.field}>
              <View style={st.segmentRow}>
                {LOCATION_TYPES.map(l => {
                  const active = locationType === l.value;
                  return (
                    <TouchableOpacity
                      key={l.value}
                      style={[st.segment, active && st.segmentActive]}
                      onPress={() => setLocationType(l.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={st.segmentEmoji}>{l.emoji}</Text>
                      <Text style={[st.segmentText, active && st.segmentTextActive]}>{l.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={st.field}>
              <Text style={st.label}>Venue</Text>
              <View style={st.inputWithIcon}>
                <Text style={st.inputEmoji}>{locationType === 'ONLINE' ? '💻' : '🏢'}</Text>
                <TextInput
                  style={st.inputInner}
                  placeholder={locationType === 'ONLINE' ? 'Meeting link' : 'Enter venue name'}
                  placeholderTextColor={COLORS.textMuted}
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>
            </View>
            {locationType !== 'ONLINE' && (
              <View style={st.field}>
                <Text style={st.label}>City</Text>
                <View style={st.inputWithIcon}>
                  <Text style={st.inputEmoji}>🌆</Text>
                  <TextInput
                    style={st.inputInner}
                    placeholder="City"
                    placeholderTextColor={COLORS.textMuted}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Step 4: Pricing & Capacity */}
          <View style={st.sectionCard}>
            <View style={st.sectionHeader}>
              <LinearGradient
                colors={['#7C3AED', '#8B5CF6']}
                style={st.stepBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={st.stepNum}>4</Text>
              </LinearGradient>
              <Text style={st.sectionTitle}>Pricing & Capacity</Text>
            </View>

            <View style={st.field}>
              <View style={st.segmentRow}>
                {PRICE_TYPES.map(p => {
                  const active = priceType === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[st.segment, active && st.segmentActive]}
                      onPress={() => setPriceType(p.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={st.segmentEmoji}>{p.emoji}</Text>
                      <Text style={[st.segmentText, active && st.segmentTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {priceType === 'PAID' && (
                <View style={[st.inputWithIcon, { marginTop: 10 }]}>
                  <Text style={st.inputEmoji}>💰</Text>
                  <TextInput
                    style={st.inputInner}
                    placeholder="Price per person"
                    placeholderTextColor={COLORS.textMuted}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            <View style={st.field}>
              <Text style={st.label}>Max Attendees <Text style={st.optional}>(optional)</Text></Text>
              <View style={st.inputWithIcon}>
                <Text style={st.inputEmoji}>👥</Text>
                <TextInput
                  style={st.inputInner}
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
          <View style={st.sectionCard}>
            <View style={st.field}>
              <Text style={st.label}>📝 Additional Notes <Text style={st.optional}>(optional)</Text></Text>
              <TextInput
                style={[st.input, st.textArea]}
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
            style={st.submitWrap}
            onPress={handleCreate}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={createMutation.isPending ? ['#9CA3AF', '#9CA3AF'] : ['#312E81', '#4F46E5']}
              style={st.submitBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={st.submitEmoji}>🚀</Text>
                  <Text style={st.submitBtnText}>Create Event</Text>
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

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E8F0',
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E8E8F0',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerEmoji: { fontSize: 18 },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: COLORS.text,
    fontFamily: FONTS.displayBold, letterSpacing: -0.3,
  },
  scroll: { padding: SPACING.lg, gap: 12 },

  // ── Section cards ──
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  stepBadge: {
    width: 28, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: 14, fontWeight: '800', color: '#fff', fontFamily: FONTS.displayEB },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold },

  // ── Fields ──
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6, fontFamily: FONTS.semiBold },
  subLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontWeight: '500', fontFamily: FONTS.medium },
  required: { color: COLORS.error, fontWeight: '600' },
  optional: { color: COLORS.textMuted, fontWeight: '400', fontSize: 12 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E8E8F0',
    borderRadius: RADIUS.md, padding: 12, fontSize: 15, color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E8E8F0',
    borderRadius: RADIUS.md, paddingHorizontal: 12,
  },
  inputEmoji: { fontSize: 16 },
  inputInner: {
    flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.text, fontFamily: FONTS.regular,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  halfField: { flex: 1 },

  // ── Type grid ──
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: (SCREEN_W - 32 - 24) / 4,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#E8E8F0',
    backgroundColor: '#fff',
  },
  typeIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  typeEmoji: { fontSize: 18 },
  typeLabel: { fontSize: 11, fontWeight: '500', color: COLORS.textMuted, fontFamily: FONTS.medium },

  // ── Segments ──
  segmentRow: {
    flexDirection: 'row', gap: 0,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    padding: 3,
  },
  segment: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: RADIUS.sm,
  },
  segmentActive: { backgroundColor: '#312E81', ...SHADOWS.sm },
  segmentEmoji: { fontSize: 14 },
  segmentText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted, fontFamily: FONTS.medium },
  segmentTextActive: { color: '#fff', fontWeight: '600' },

  // ── Submit ──
  submitWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16,
  },
  submitEmoji: { fontSize: 18 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: FONTS.displayBold },
});
