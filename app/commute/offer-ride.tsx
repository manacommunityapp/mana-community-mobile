import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commuteService } from '@/services/commuteService';
import { COLORS } from '@/constants/config';
import type { CommuteRideType } from '@/types/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function OfferRideScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rideType, setRideType] = useState<CommuteRideType>('OFFER');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seats, setSeats] = useState('2');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [ladiesOnly, setLadiesOnly] = useState(false);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const createMutation = useMutation({
    mutationFn: commuteService.createRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commute-upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['commute-stats'] });
      queryClient.invalidateQueries({ queryKey: ['commute-my-offers'] });
      router.back();
    },
    onError: () => Alert.alert('Error', 'Failed to create ride. Please try again.'),
  });

  const handleSubmit = () => {
    if (!from.trim() || !to.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }

    const departureTime = `${date.trim()}T${time.trim()}:00`;

    createMutation.mutate({
      fromLocation: from.trim(),
      toLocation: to.trim(),
      departureTime,
      rideType,
      totalSeats: parseInt(seats, 10) || 2,
      free: isFree,
      pricePerSeat: isFree ? undefined : parseFloat(price) || undefined,
      vehicleType: vehicleType.trim() || undefined,
      vehicleNumber: vehicleNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      recurring,
      recurringDays: recurring ? selectedDays.join(',') : undefined,
      ladiesOnly,
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancelBtn}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {rideType === 'OFFER' ? 'Offer a Ride' : 'Request a Ride'}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false}>
          {/* Type toggle */}
          <View style={s.typeRow}>
            <TouchableOpacity
              style={[s.typeBtn, rideType === 'OFFER' && s.typeBtnActive]}
              onPress={() => setRideType('OFFER')}
            >
              <Text style={[s.typeText, rideType === 'OFFER' && s.typeTextActive]}>
                🚗 Offer Ride
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.typeBtn, rideType === 'REQUEST' && s.typeBtnActive]}
              onPress={() => setRideType('REQUEST')}
            >
              <Text style={[s.typeText, rideType === 'REQUEST' && s.typeTextActive]}>
                🙋 Request Ride
              </Text>
            </TouchableOpacity>
          </View>

          {/* Route */}
          <Text style={s.label}>From *</Text>
          <TextInput style={s.input} placeholder="e.g. Mana Community, Tower A" placeholderTextColor={COLORS.textMuted} value={from} onChangeText={setFrom} />

          <Text style={s.label}>To *</Text>
          <TextInput style={s.input} placeholder="e.g. Hitec City, Mindspace" placeholderTextColor={COLORS.textMuted} value={to} onChangeText={setTo} />

          {/* Date & Time */}
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Date * (YYYY-MM-DD)</Text>
              <TextInput style={s.input} placeholder="2026-09-20" placeholderTextColor={COLORS.textMuted} value={date} onChangeText={setDate} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Time * (HH:MM)</Text>
              <TextInput style={s.input} placeholder="08:30" placeholderTextColor={COLORS.textMuted} value={time} onChangeText={setTime} />
            </View>
          </View>

          {/* Seats */}
          <Text style={s.label}>Available Seats</Text>
          <TextInput style={s.input} placeholder="2" placeholderTextColor={COLORS.textMuted} value={seats} onChangeText={setSeats} keyboardType="number-pad" />

          {/* Pricing */}
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Free ride</Text>
            <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: COLORS.primary }} />
          </View>
          {!isFree && (
            <>
              <Text style={s.label}>Price per seat (₹)</Text>
              <TextInput style={s.input} placeholder="50" placeholderTextColor={COLORS.textMuted} value={price} onChangeText={setPrice} keyboardType="numeric" />
            </>
          )}

          {/* Vehicle */}
          {rideType === 'OFFER' && (
            <>
              <Text style={s.label}>Vehicle type</Text>
              <TextInput style={s.input} placeholder="e.g. Sedan, SUV, Hatchback" placeholderTextColor={COLORS.textMuted} value={vehicleType} onChangeText={setVehicleType} />

              <Text style={s.label}>Vehicle number</Text>
              <TextInput style={s.input} placeholder="e.g. TS 09 AB 1234" placeholderTextColor={COLORS.textMuted} value={vehicleNumber} onChangeText={setVehicleNumber} autoCapitalize="characters" />
            </>
          )}

          {/* Recurring */}
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Recurring ride</Text>
            <Switch value={recurring} onValueChange={setRecurring} trackColor={{ true: COLORS.primary }} />
          </View>
          {recurring && (
            <View style={s.daysRow}>
              {DAYS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.dayChip, selectedDays.includes(d) && s.dayChipActive]}
                  onPress={() => toggleDay(d)}
                >
                  <Text style={[s.dayText, selectedDays.includes(d) && s.dayTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Ladies only */}
          <View style={s.switchRow}>
            <Text style={s.switchLabel}>Ladies only</Text>
            <Switch value={ladiesOnly} onValueChange={setLadiesOnly} trackColor={{ true: '#DB2777' }} />
          </View>

          {/* Notes */}
          <Text style={s.label}>Notes</Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Any additional info..."
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, createMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            <Text style={s.submitText}>
              {createMutation.isPending ? 'Creating...' : (rideType === 'OFFER' ? 'Post Ride Offer' : 'Post Ride Request')}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancelBtn:     { fontSize: 15, color: COLORS.error, fontWeight: '600' },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text },
  form:          { padding: 16, gap: 12 },
  typeRow:       { flexDirection: 'row', gap: 10 },
  typeBtn:       { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface },
  typeBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  typeText:      { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  typeTextActive:{ color: COLORS.primary },
  label:         { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  input:         { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  row:           { flexDirection: 'row', gap: 10 },
  switchRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  daysRow:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  dayChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayText:       { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  dayTextActive: { color: '#FFF' },
  submitBtn:     { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitText:    { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
