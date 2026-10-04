import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventDonationService } from '@/services/eventDonationService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export default function EventDonationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const eventId = Number(id);

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
  });

  const [amount, setAmount] = useState('1000');
  const [donorName, setDonorName] = useState(user?.fullName || user?.name || '');
  const [flatNumber, setFlatNumber] = useState('');
  const [note, setNote] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ['event-donations', eventId],
    queryFn: () => eventDonationService.getAll(eventId),
    enabled: !!eventId,
  });

  const totalRaised = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

  const donateMutation = useMutation({
    mutationFn: () =>
      eventDonationService.create({
        eventId,
        donorName: anonymous ? 'Anonymous Donor' : (donorName.trim() || 'Community Member'),
        amount: parseFloat(amount) || 0,
        flatNumber: flatNumber.trim() || undefined,
        note: note.trim() || undefined,
        anonymous,
        paymentMethod: 'UPI',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-donations', eventId] });
      setNote('');
      Alert.alert('🙏 Thank You!', 'Your donation has been recorded successfully.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not process donation.');
    },
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Donations & Contributions</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Total Raised Banner */}
        <View style={s.statsCard}>
          <Text style={s.statsLabel}>TOTAL FUNDS RAISED</Text>
          <Text style={s.statsAmount}>₹{totalRaised.toLocaleString('en-IN')}</Text>
          <Text style={s.statsSub}>{donations.length} community contributions</Text>
        </View>

        {/* Donate Card */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>Make a Contribution</Text>
          <Text style={s.formSub}>Support our community event and activities</Text>

          {/* Quick Amount Pills */}
          <View style={s.pillsRow}>
            {QUICK_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[s.pill, amount === String(amt) && s.pillActive]}
                onPress={() => setAmount(String(amt))}
              >
                <Text style={[s.pillText, amount === String(amt) && s.pillTextActive]}>
                  ₹{amt.toLocaleString('en-IN')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.inputLabel}>Custom Amount (₹)</Text>
          <TextInput
            style={s.input}
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
          />

          {!anonymous && (
            <>
              <Text style={s.inputLabel}>Donor Name</Text>
              <TextInput
                style={s.input}
                value={donorName}
                onChangeText={setDonorName}
                placeholder="Your Name"
              />

              <Text style={s.inputLabel}>Flat / Unit Number</Text>
              <TextInput
                style={s.input}
                value={flatNumber}
                onChangeText={setFlatNumber}
                placeholder="e.g. Tower A - 402"
              />
            </>
          )}

          <Text style={s.inputLabel}>Message / Note (Optional)</Text>
          <TextInput
            style={s.input}
            value={note}
            onChangeText={setNote}
            placeholder="Blessings or wishes..."
          />

          <View style={s.anonRow}>
            <View>
              <Text style={s.anonTitle}>Donate Anonymously</Text>
              <Text style={s.anonSub}>Hide your name from public donor wall</Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ true: COLORS.primary, false: COLORS.border }}
            />
          </View>

          <TouchableOpacity
            style={s.donateBtn}
            onPress={() => donateMutation.mutate()}
            disabled={donateMutation.isPending || !amount}
          >
            {donateMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.donateBtnText}>Contribute ₹{parseFloat(amount || '0').toLocaleString('en-IN')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Donor Wall */}
        <View style={s.wallSection}>
          <Text style={s.wallTitle}>🌟 Community Donor Wall</Text>
          {isLoading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.primary} />
          ) : donations.length === 0 ? (
            <Text style={s.wallEmpty}>Be the first to contribute to this event!</Text>
          ) : (
            donations.map((d) => (
              <View key={d.id} style={s.donorRow}>
                <View style={s.donorAvatar}>
                  <Text style={s.donorAvatarText}>
                    {d.anonymous ? '👤' : (d.donorName ? d.donorName.charAt(0).toUpperCase() : '🙏')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.donorName}>{d.anonymous ? 'Anonymous Member' : d.donorName}</Text>
                  {d.flatNumber && <Text style={s.donorFlat}>{d.flatNumber}</Text>}
                  {d.note && <Text style={s.donorNote}>"{d.note}"</Text>}
                </View>
                <Text style={s.donorAmount}>₹{d.amount.toLocaleString('en-IN')}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: COLORS.text },
  content: { padding: 16 },
  statsCard: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: 20, alignItems: 'center', marginBottom: 16, ...SHADOWS.md,
  },
  statsLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
  statsAmount: { fontSize: 32, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: '#fff', marginVertical: 4 },
  statsSub: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  formCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 18, marginBottom: 16, ...SHADOWS.sm,
  },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  formSub: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F9FAFB',
  },
  pillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  pillTextActive: { color: '#fff' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 14, backgroundColor: '#F9FAFB' },
  anonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  anonTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  anonSub: { fontSize: 11, color: COLORS.textMuted },
  donateBtn: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', marginTop: 14 },
  donateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  wallSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, ...SHADOWS.sm },
  wallTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  wallEmpty: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginVertical: 14 },
  donorRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  donorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  donorAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#D97706' },
  donorName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  donorFlat: { fontSize: 11, color: COLORS.textMuted },
  donorNote: { fontSize: 11, fontStyle: 'italic', color: COLORS.textSecondary, marginTop: 2 },
  donorAmount: { fontSize: 14, fontWeight: '700', color: '#10B981' },
});
