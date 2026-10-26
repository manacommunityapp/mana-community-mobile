import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { sportsTrainerService } from '@/services/sportsTrainerService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function BookSlotScreen() {
  const router = useRouter();
  const { slotId, trainerName } = useLocalSearchParams<{ slotId: string; trainerName?: string }>();
  const { user } = useAuth();
  const communityId = (user as any)?.communityId ?? (user as any)?.community?.id;
  const queryClient = useQueryClient();

  const [tower, setTower]           = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [booked, setBooked]         = useState(false);

  // Fetch slot info from cached trainer slots
  const cachedSlots = queryClient.getQueriesData<any>({ queryKey: ['trainer-slots'] });
  const slot = cachedSlots
    .flatMap(([, data]: any) => (Array.isArray(data) ? data : []))
    .find((s: any) => String(s.id) === slotId);

  const mutation = useMutation({
    mutationFn: () =>
      sportsTrainerService.bookSlot(Number(slotId), {
        userName: `${(user as any)?.firstName ?? ''} ${(user as any)?.lastName ?? ''}`.trim() || 'Resident',
        tower:    tower || undefined,
        flatNumber: flatNumber || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-slots'] });
      queryClient.invalidateQueries({ queryKey: ['my-trainer-bookings'] });
      setBooked(true);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Could not complete booking. Please try again.';
      Alert.alert('Booking Failed', msg);
    },
  });

  const inputCls = [s.input];

  if (booked) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.successBox}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
          </View>
          <Text style={s.successTitle}>Booked!</Text>
          <Text style={s.successSub}>Your session with {trainerName ?? 'the trainer'} is confirmed.</Text>
          {slot && (
            <View style={s.confirmCard}>
              <Row icon="calendar-outline" label="Date"  value={formatDate(slot.slotDate)} />
              <Row icon="time-outline"     label="Time"  value={`${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`} />
              {slot.venueName && <Row icon="location-outline" label="Venue" value={slot.venueName} />}
              {slot.price > 0 && <Row icon="cash-outline" label="Amount" value={`₹${slot.price}`} />}
            </View>
          )}
          <TouchableOpacity style={s.doneBtn} onPress={() => router.push('/sports/trainers')} activeOpacity={0.85}>
            <Text style={s.doneBtnText}>Back to Trainers</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Slot summary */}
        {slot && (
          <View style={s.summaryCard}>
            <Text style={s.summaryTrainer}>{trainerName ?? 'Trainer'}</Text>
            <View style={s.summaryRow}>
              <Ionicons name="barbell-outline" size={14} color={COLORS.primary} />
              <Text style={s.summaryMeta}>{slot.sport}</Text>
            </View>
            <View style={s.divider} />
            <Row icon="calendar-outline" label="Date"    value={formatDate(slot.slotDate)} />
            <Row icon="time-outline"     label="Time"    value={`${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`} />
            {slot.venueName && <Row icon="location-outline" label="Venue"   value={slot.venueName} />}
            <Row
              icon={slot.slotType === 'GROUP' ? 'people-outline' : 'person-outline'}
              label="Type"
              value={slot.slotType === 'GROUP' ? `Group · ${slot.maxCapacity - slot.bookedCount} spots left` : '1-on-1'}
            />
            {slot.price > 0 && <Row icon="cash-outline" label="Price"   value={`₹${slot.price}`} />}
          </View>
        )}

        {/* Optional details */}
        <View style={s.formSection}>
          <Text style={s.formTitle}>Your Details (optional)</Text>
          <Text style={s.formSub}>Help the trainer identify you on arrival</Text>
          <View style={s.inputRow}>
            <TextInput
              style={[...inputCls, { flex: 1 }]}
              placeholder="Tower"
              placeholderTextColor={COLORS.textMuted}
              value={tower}
              onChangeText={setTower}
            />
            <TextInput
              style={[...inputCls, { flex: 1 }]}
              placeholder="Flat No."
              placeholderTextColor={COLORS.textMuted}
              value={flatNumber}
              onChangeText={setFlatNumber}
            />
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.confirmBtn, mutation.isPending && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={s.confirmBtnText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={r.row}>
      <Ionicons name={icon as any} size={14} color={COLORS.primary} style={r.icon} />
      <Text style={r.label}>{label}</Text>
      <Text style={r.value}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSlate,
  },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: COLORS.text },
  summaryCard:   {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 18, borderWidth: 1, borderColor: COLORS.borderSlate, ...SHADOWS.sm,
  },
  summaryTrainer:{ fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  summaryRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  summaryMeta:   { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  divider:       { height: 1, backgroundColor: COLORS.borderSlate, marginVertical: 10 },
  formSection:   {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 18, borderWidth: 1, borderColor: COLORS.borderSlate, ...SHADOWS.sm, gap: 10,
  },
  formTitle:     { fontSize: 14, fontWeight: '700', color: COLORS.text },
  formSub:       { fontSize: 12, color: COLORS.textMuted, marginTop: -6 },
  inputRow:      { flexDirection: 'row', gap: 10 },
  input:         {
    backgroundColor: COLORS.backgroundAlt, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.borderSlate,
  },
  footer:        { padding: 20, paddingBottom: 28 },
  confirmBtn:    {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    paddingVertical: 16, ...SHADOWS.md,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Success state
  successBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  successIcon:   { marginBottom: 4 },
  successTitle:  { fontSize: 24, fontWeight: '800', color: COLORS.text },
  successSub:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  confirmCard:   {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 18, borderWidth: 1, borderColor: COLORS.borderSlate, ...SHADOWS.sm,
    marginTop: 8,
  },
  doneBtn:       {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    paddingHorizontal: 32, paddingVertical: 14, marginTop: 8,
  },
  doneBtnText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});

const r = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  icon:  { width: 18 },
  label: { fontSize: 12, color: COLORS.textMuted, width: 56 },
  value: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '600' },
});
