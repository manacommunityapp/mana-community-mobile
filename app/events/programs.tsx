import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventProgramService } from '@/services/eventProgramService';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import type { EventProgramResponse } from '@/types/events';

export default function EventProgramsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const eventId = Number(id);

  const [selectedProgram, setSelectedProgram] = useState<EventProgramResponse | null>(null);
  const [headCount, setHeadCount] = useState('1');
  const [participantName, setParticipantName] = useState('');

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
    onBeforeBack: () => {
      if (selectedProgram) {
        setSelectedProgram(null);
        return true;
      }
    },
  });

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ['event-programs', eventId],
    queryFn: () => eventProgramService.getByEvent(eventId),
    enabled: !!eventId,
  });

  const registerMutation = useMutation({
    mutationFn: (progId: number) =>
      eventProgramService.registerActivity(progId, {
        headCount: parseInt(headCount) || 1,
        primaryName: participantName.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-programs', eventId] });
      setSelectedProgram(null);
      setParticipantName('');
      setHeadCount('1');
      Alert.alert('Registered!', 'You are registered for this activity.');
    },
    onError: (err: any) => {
      Alert.alert('Registration Failed', err?.message || 'Could not complete registration.');
    },
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Event Schedule & Activities</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : programs.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No Programs Scheduled</Text>
          <Text style={s.emptySubtitle}>The itinerary for this event will be published soon.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {programs.map((prog, index) => (
            <View key={prog.id} style={s.programCard}>
              <View style={s.timelineIndicator}>
                <View style={s.timelineDot} />
                {index < programs.length - 1 && <View style={s.timelineLine} />}
              </View>

              <View style={s.cardContent}>
                <View style={s.timeRow}>
                  <Text style={s.timeText}>
                    {prog.startTime || 'TBD'} {prog.duration ? `(${prog.duration})` : ''}
                  </Text>
                  {prog.dayLabel && <Text style={s.dayBadge}>{prog.dayLabel}</Text>}
                </View>

                <Text style={s.progTitle}>{prog.title}</Text>

                {prog.venue && (
                  <View style={s.metaRow}>
                    <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                    <Text style={s.metaText}>{prog.venue}</Text>
                  </View>
                )}

                {prog.performer && (
                  <View style={s.metaRow}>
                    <Ionicons name="mic-outline" size={13} color={COLORS.primary} />
                    <Text style={s.metaText}>{prog.performer}</Text>
                  </View>
                )}

                {prog.requiresRegistration && (
                  <View style={s.actionRow}>
                    <View style={s.spotsBadge}>
                      <Text style={s.spotsText}>
                        {prog.spotsLeft != null ? `${prog.spotsLeft} spots left` : 'Registration Open'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.joinBtn}
                      onPress={() => setSelectedProgram(prog)}
                    >
                      <Text style={s.joinBtnText}>Join Activity</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Registration Modal */}
      <Modal visible={!!selectedProgram} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Join {selectedProgram?.title}</Text>
            <Text style={s.modalSubtitle}>Confirm your registration details</Text>

            <Text style={s.inputLabel}>Participant Name (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="Your name"
              value={participantName}
              onChangeText={setParticipantName}
            />

            <Text style={s.inputLabel}>Number of Attendees</Text>
            <TextInput
              style={s.input}
              keyboardType="number-pad"
              value={headCount}
              onChangeText={setHeadCount}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setSelectedProgram(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.confirmBtn}
                onPress={() => selectedProgram && registerMutation.mutate(selectedProgram.id)}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  list: { padding: 16 },
  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  programCard: { flexDirection: 'row', marginBottom: 16 },
  timelineIndicator: { width: 24, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  cardContent: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 14, marginLeft: 8, ...SHADOWS.sm,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  timeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  dayBadge: { fontSize: 10, fontWeight: '700', color: '#fff', backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  progTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  metaText: { fontSize: 12, color: COLORS.textMuted },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  spotsBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  spotsText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  joinBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.sm },
  joinBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 20, ...SHADOWS.lg },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 10, fontSize: 14, backgroundColor: '#F9FAFB' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.text, fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm, backgroundColor: COLORS.primary },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
});
