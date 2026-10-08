import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventVolunteerService } from '@/services/eventVolunteerService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';

const ROLES = ['Crowd Management', 'Food & Catering', 'Stage & Sound', 'Security & Safety', 'Helpdesk / Info', 'Decoration'];
const SHIFTS = ['Morning (8 AM - 12 PM)', 'Afternoon (12 PM - 4 PM)', 'Evening (4 PM - 8 PM)', 'Night (8 PM - 11 PM)'];

export default function EventVolunteersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const eventId = Number(id);

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
  });

  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [selectedShift, setSelectedShift] = useState(SHIFTS[0]);
  const [zone, setZone] = useState('');

  const { data: volunteers = [], isLoading } = useQuery({
    queryKey: ['event-volunteers', eventId],
    queryFn: () => eventVolunteerService.getAll(eventId),
    enabled: !!eventId,
  });

  const isAlreadyVolunteering = volunteers.some((v) => v.userId === user?.id);

  const signupMutation = useMutation({
    mutationFn: () =>
      eventVolunteerService.create({
        eventId,
        userId: user?.id || 1,
        role: selectedRole,
        shift: selectedShift,
        zone: zone.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-volunteers', eventId] });
      Alert.alert('🎉 Welcome to the Team!', 'Thank you for volunteering for this event.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not sign up as volunteer.');
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (volId: number) => eventVolunteerService.checkIn(volId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-volunteers', eventId] });
      Alert.alert('Checked In', 'Your attendance as volunteer has been recorded.');
    },
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Volunteer Hub</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Banner */}
        <View style={s.banner}>
          <Text style={s.bannerTitle}>🤝 Join the Volunteer Team</Text>
          <Text style={s.bannerSub}>Help make our community event a memorable success!</Text>
        </View>

        {!isAlreadyVolunteering && (
          <View style={s.formCard}>
            <Text style={s.formTitle}>Volunteer Sign Up</Text>

            <Text style={s.inputLabel}>Select Your Role</Text>
            <View style={s.pillsWrap}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[s.rolePill, selectedRole === r && s.rolePillActive]}
                  onPress={() => setSelectedRole(r)}
                >
                  <Text style={[s.rolePillText, selectedRole === r && s.rolePillTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>Select Preferred Shift</Text>
            <View style={s.pillsWrap}>
              {SHIFTS.map((sh) => (
                <TouchableOpacity
                  key={sh}
                  style={[s.shiftPill, selectedShift === sh && s.shiftPillActive]}
                  onPress={() => setSelectedShift(sh)}
                >
                  <Text style={[s.shiftPillText, selectedShift === sh && s.shiftPillTextActive]}>{sh}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.inputLabel}>Assigned Zone / Area (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Main Stage, Gate 2, Food Court"
              value={zone}
              onChangeText={setZone}
            />

            <TouchableOpacity
              style={s.submitBtn}
              onPress={() => signupMutation.mutate()}
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.submitBtnText}>Sign Up as Volunteer</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Team List */}
        <View style={s.teamCard}>
          <Text style={s.teamTitle}>Active Volunteers ({volunteers.length})</Text>

          {isLoading ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.primary} />
          ) : volunteers.length === 0 ? (
            <Text style={s.emptyText}>No volunteers yet. Be the first to join!</Text>
          ) : (
            volunteers.map((v) => (
              <View key={v.id} style={s.volRow}>
                <View style={s.volAvatar}>
                  <Text style={s.volAvatarText}>
                    {v.userName ? v.userName.charAt(0).toUpperCase() : 'V'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.volName}>{v.userName}</Text>
                  <Text style={s.volRole}>{v.role || 'Volunteer'} · {v.shift || 'General'}</Text>
                  {v.zone && <Text style={s.volZone}>📍 {v.zone}</Text>}
                </View>

                {v.userId === user?.id && !v.checkInTime && (
                  <TouchableOpacity
                    style={s.checkInBtn}
                    onPress={() => checkInMutation.mutate(v.id)}
                    disabled={checkInMutation.isPending}
                  >
                    <Text style={s.checkInBtnText}>Check In</Text>
                  </TouchableOpacity>
                )}

                {v.checkInTime && (
                  <View style={s.checkedBadge}>
                    <Text style={s.checkedText}>Checked In</Text>
                  </View>
                )}
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
  banner: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  bannerTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary },
  bannerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  formCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, ...SHADOWS.sm,
  },
  formTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 10 },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rolePill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F9FAFB',
  },
  rolePillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rolePillText: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  rolePillTextActive: { color: '#fff' },
  shiftPill: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F9FAFB',
  },
  shiftPillActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  shiftPillText: { fontSize: 11, fontWeight: '600', color: COLORS.text },
  shiftPillTextActive: { color: '#fff' },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 13, backgroundColor: '#F9FAFB' },
  submitBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', marginTop: 16 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  teamCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, ...SHADOWS.sm },
  teamTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, marginBottom: 12 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginVertical: 14 },
  volRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  volAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  volAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#1D4ED8' },
  volName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  volRole: { fontSize: 11, color: COLORS.textMuted },
  volZone: { fontSize: 11, color: COLORS.primary, marginTop: 1 },
  checkInBtn: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  checkInBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  checkedBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  checkedText: { color: '#065F46', fontSize: 10, fontWeight: '700' },
});
