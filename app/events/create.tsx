import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import type { CreateEventRequest, EventType, EventLocationType, EventPriceType } from '@/types/api';

const EVENT_TYPES: { value: EventType; label: string; icon: string }[] = [
  { value: 'SOCIAL', label: 'Social', icon: 'people' },
  { value: 'SPORTS', label: 'Sports', icon: 'football' },
  { value: 'CULTURAL', label: 'Cultural', icon: 'color-palette' },
  { value: 'WORKSHOP', label: 'Workshop', icon: 'school' },
  { value: 'RELIGIOUS', label: 'Religious', icon: 'heart' },
  { value: 'MEETING', label: 'Meeting', icon: 'briefcase' },
  { value: 'COMMUNITY', label: 'Community', icon: 'home' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

const LOCATION_TYPES: { value: EventLocationType; label: string }[] = [
  { value: 'PHYSICAL', label: 'In Person' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const PRICE_TYPES: { value: EventPriceType; label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'PAID', label: 'Paid' },
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

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Event</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={s.field}>
            <Text style={s.label}>Event Title *</Text>
            <TextInput
              style={s.input}
              placeholder="Enter event title"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Type */}
          <View style={s.field}>
            <Text style={s.label}>Event Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chipRow}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[s.chip, type === t.value && s.chipActive]}
                    onPress={() => setType(t.value)}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={16}
                      color={type === t.value ? '#fff' : COLORS.textMuted}
                    />
                    <Text style={[s.chipText, type === t.value && s.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Category */}
          <View style={s.field}>
            <Text style={s.label}>Category (optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Cricket, Workshop, Festival"
              placeholderTextColor={COLORS.textMuted}
              value={category}
              onChangeText={setCategory}
            />
          </View>

          {/* Description */}
          <View style={s.field}>
            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Describe your event..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Date & Time */}
          <View style={s.field}>
            <Text style={s.label}>Date & Time *</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.subLabel}>Start Date</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.subLabel}>Start Time</Text>
                <TextInput
                  style={s.input}
                  placeholder="HH:MM"
                  placeholderTextColor={COLORS.textMuted}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
            </View>
            <View style={[s.row, { marginTop: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.subLabel}>End Date</Text>
                <TextInput
                  style={s.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textMuted}
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.subLabel}>End Time</Text>
                <TextInput
                  style={s.input}
                  placeholder="HH:MM"
                  placeholderTextColor={COLORS.textMuted}
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>
          </View>

          {/* Location Type */}
          <View style={s.field}>
            <Text style={s.label}>Location Type</Text>
            <View style={s.chipRow}>
              {LOCATION_TYPES.map(l => (
                <TouchableOpacity
                  key={l.value}
                  style={[s.chip, locationType === l.value && s.chipActive]}
                  onPress={() => setLocationType(l.value)}
                >
                  <Text style={[s.chipText, locationType === l.value && s.chipTextActive]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Venue & City */}
          <View style={s.field}>
            <Text style={s.label}>Venue</Text>
            <TextInput
              style={s.input}
              placeholder="Enter venue name or link"
              placeholderTextColor={COLORS.textMuted}
              value={venue}
              onChangeText={setVenue}
            />
          </View>
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

          {/* Pricing */}
          <View style={s.field}>
            <Text style={s.label}>Pricing</Text>
            <View style={s.chipRow}>
              {PRICE_TYPES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[s.chip, priceType === p.value && s.chipActive]}
                  onPress={() => setPriceType(p.value)}
                >
                  <Text style={[s.chipText, priceType === p.value && s.chipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {priceType === 'PAID' && (
              <TextInput
                style={[s.input, { marginTop: 8 }]}
                placeholder="Price (e.g. 100)"
                placeholderTextColor={COLORS.textMuted}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            )}
          </View>

          {/* Max Attendees */}
          <View style={s.field}>
            <Text style={s.label}>Max Attendees (optional)</Text>
            <TextInput
              style={s.input}
              placeholder="Leave empty for unlimited"
              placeholderTextColor={COLORS.textMuted}
              value={maxAttendees}
              onChangeText={setMaxAttendees}
              keyboardType="numeric"
            />
          </View>

          {/* Notes */}
          <View style={s.field}>
            <Text style={s.label}>Notes (optional)</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Any additional notes..."
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, createMutation.isPending && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={s.submitBtnText}>Create Event</Text>
              </>
            )}
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
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  scroll: { padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  subLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, fontSize: 15, color: COLORS.text,
  },
  textArea: { minHeight: 80 },
  row: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },
  chipTextActive: { color: '#fff' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14,
    marginTop: 8, ...SHADOWS.md,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
