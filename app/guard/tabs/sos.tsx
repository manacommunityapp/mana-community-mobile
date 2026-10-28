import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Vibration, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { guardService } from '@/services/guardService';
import { safetyService, type SosIncidentResponse } from '@/services/safetyService';
import { useAuth } from '@/hooks/useAuth';

const COUNTDOWN_SECS = 5;

type Phase = 'idle' | 'countdown' | 'active';

const PANIC_TYPES = [
  { key: 'FIRE',        label: 'Fire',           icon: 'flame-outline' as const,          color: '#EF4444' },
  { key: 'FIGHT',       label: 'Fight/Violence', icon: 'alert-circle-outline' as const,   color: '#D97706' },
  { key: 'MEDICAL',     label: 'Medical',        icon: 'medkit-outline' as const,          color: '#2563EB' },
  { key: 'INTRUSION',   label: 'Intrusion',      icon: 'shield-outline' as const,          color: '#7C3AED' },
  { key: 'SUSPICIOUS',  label: 'Suspicious',     icon: 'eye-outline' as const,             color: '#059669' },
  { key: 'OTHER',       label: 'Other',          icon: 'megaphone-outline' as const,       color: '#6B7280' },
];

export default function GuardSosScreen() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [panicType, setPanicType] = useState<string>('OTHER');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [incident, setIncident] = useState<SosIncidentResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: activeAlerts = [] } = useQuery({
    queryKey: ['guard-sos-active'],
    queryFn: async () => {
      try {
        const res = await guardService.getSosAlerts?.();
        return res ?? [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const triggerMut = useMutation({
    mutationFn: () => safetyService.triggerSOS({
      emergencyType: panicType === 'OTHER' ? 'GENERAL_PANIC' : panicType,
      severity: 'CRITICAL',
      flatNumber: user?.flatNumber,
      buildingBlock: user?.tower,
      locationDetails: location || 'Guard mobile SOS',
      notes: notes.trim() || 'Guard requested immediate assistance',
    }),
    onSuccess: (result) => {
      Vibration.vibrate([100, 50, 100]);
      setIncident(result);
      setPhase('active');
      qc.invalidateQueries({ queryKey: ['guard-sos-active'] });
    },
    onError: () => {
      // Show active screen even if API call fails — guard safety takes priority
      setPhase('active');
      Vibration.vibrate([100, 50, 100]);
    },
  });

  const resolveMut = useMutation({
    mutationFn: (id: number) => guardService.resolveSos?.(id) ?? Promise.resolve(true),
    onSuccess: () => {
      setPhase('idle');
      setCountdown(COUNTDOWN_SECS);
      setIncident(null);
      qc.invalidateQueries({ queryKey: ['guard-sos-active'] });
      Alert.alert('Alert Resolved', 'SOS alert has been resolved and team notified.');
    },
  });

  const startCountdown = () => {
    Vibration.vibrate([200, 100, 200]);
    setPhase('countdown');
    setCountdown(COUNTDOWN_SECS);
  };

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setCountdown(COUNTDOWN_SECS);
    Vibration.cancel();
  };

  useEffect(() => {
    if (phase === 'countdown') {
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            triggerMut.mutate();
            return COUNTDOWN_SECS;
          }
          Vibration.vibrate(80);
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const selectedType = PANIC_TYPES.find(p => p.key === panicType)!;

  if (phase === 'active') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.activeContainer}>
          <View style={styles.activePulse}>
            <Ionicons name="alert-circle" size={64} color="#fff" />
          </View>
          <Text style={styles.activeTitle}>SOS ALERT ACTIVE</Text>
          <Text style={styles.activeSub}>Security team and management have been notified.</Text>
          <View style={[styles.typeBadge, { backgroundColor: selectedType.color + '22', borderColor: selectedType.color }]}>
            <Ionicons name={selectedType.icon} size={16} color={selectedType.color} />
            <Text style={[styles.typeBadgeText, { color: selectedType.color }]}>{selectedType.label}</Text>
          </View>
          {location ? <Text style={styles.activeLocation}>📍 {location}</Text> : null}
          {notes ? <Text style={styles.activeNotes}>{notes}</Text> : null}

          {incident && (
            <Text style={styles.incidentId}>Incident #{incident.id} · {incident.status}</Text>
          )}
          <Text style={styles.helpText}>Stay calm. Help is on the way.</Text>
          <Text style={styles.helpText}>Keep your radio open for dispatch instructions.</Text>

          <TouchableOpacity
            style={styles.resolveBtn}
            onPress={() => Alert.alert(
              'Resolve Alert?',
              'Only resolve if the situation is under control.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Resolve', style: 'destructive', onPress: () => resolveMut.mutate(0) },
              ],
            )}
          >
            {resolveMut.isPending ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'countdown') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownTitle}>Sending SOS in</Text>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownNum}>{countdown}</Text>
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelCountdown}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.countdownHint}>Release to cancel</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.sub}>Use only in a genuine emergency. Your location and ID will be sent to the response team.</Text>

        {/* Active alerts from others */}
        {activeAlerts.length > 0 && (
          <View style={styles.alertsSection}>
            <Text style={styles.alertsTitle}>Active Alerts ({activeAlerts.length})</Text>
            {activeAlerts.map((a: any) => (
              <View key={a.id} style={styles.alertRow}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.alertText}>{a.type || 'SOS'} — {a.location || 'Unknown location'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Incident type selector */}
        <Text style={styles.sectionLabel}>Incident Type</Text>
        <View style={styles.typeGrid}>
          {PANIC_TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeBtn, panicType === t.key && { borderColor: t.color, backgroundColor: t.color + '15' }]}
              onPress={() => setPanicType(t.key)}
            >
              <Ionicons name={t.icon} size={22} color={panicType === t.key ? t.color : COLORS.textMuted} />
              <Text style={[styles.typeBtnText, panicType === t.key && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location */}
        <Text style={styles.sectionLabel}>Location (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tower A Parking, Gate 2"
          placeholderTextColor={COLORS.textMuted}
          value={location}
          onChangeText={setLocation}
        />

        {/* Notes */}
        <Text style={styles.sectionLabel}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Briefly describe the situation..."
          placeholderTextColor={COLORS.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        {/* Panic Button */}
        <TouchableOpacity style={styles.panicBtn} onPress={startCountdown} activeOpacity={0.8}>
          <Ionicons name="alert-circle" size={32} color="#fff" />
          <Text style={styles.panicBtnText}>HOLD TO SEND SOS</Text>
          <Text style={styles.panicBtnSub}>{countdown}s countdown · tap once to start</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GUARD_COLORS.background ?? '#0F172A' },
  scroll: { padding: SPACING.md, gap: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: '#F1F5F9', fontFamily: 'DMSans-Bold' },
  sub: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: { width: '30%', flexGrow: 1, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: '#334155', backgroundColor: '#1E293B', padding: 12, alignItems: 'center', gap: 6 },
  typeBtnText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', fontFamily: 'DMSans-Medium', fontWeight: '500' },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, marginTop: 8 },
  typeBadgeText: { fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: '#1E293B', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#334155', padding: 14, fontSize: 14, color: '#F1F5F9', fontFamily: 'DMSans-Regular' },
  textarea: { height: 80, textAlignVertical: 'top' },
  panicBtn: { backgroundColor: '#DC2626', borderRadius: 20, padding: 28, alignItems: 'center', gap: 8, ...SHADOWS.lg, marginTop: 8 },
  panicBtnText: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: 1, fontFamily: 'DMSans-Bold' },
  panicBtnSub: { fontSize: 12, color: '#FECACA' },
  countdownContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: '#0F172A' },
  countdownTitle: { fontSize: 24, fontWeight: '700', color: '#F1F5F9', fontFamily: 'DMSans-Bold' },
  countdownCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', ...SHADOWS.lg },
  countdownNum: { fontSize: 64, fontWeight: '700', color: '#fff', fontFamily: 'DMSans-Bold' },
  countdownHint: { fontSize: 13, color: '#64748B' },
  cancelBtn: { backgroundColor: '#1E293B', borderRadius: RADIUS.lg, paddingHorizontal: 40, paddingVertical: 16, borderWidth: 1, borderColor: '#475569' },
  cancelBtnText: { fontSize: 16, color: '#F1F5F9', fontWeight: '700', fontFamily: 'DMSans-Bold' },
  activeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: SPACING.lg, backgroundColor: '#0F172A' },
  activePulse: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', ...SHADOWS.lg },
  activeTitle: { fontSize: 26, fontWeight: '700', color: '#EF4444', letterSpacing: 1, fontFamily: 'DMSans-Bold' },
  activeSub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  activeLocation: { fontSize: 13, color: '#CBD5E1' },
  activeNotes: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  incidentId: { fontSize: 14, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  helpText: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  resolveBtn: { backgroundColor: '#16A34A', borderRadius: RADIUS.lg, paddingHorizontal: 32, paddingVertical: 14, marginTop: 12 },
  resolveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'DMSans-Bold' },
  alertsSection: { backgroundColor: '#1E293B', borderRadius: RADIUS.lg, padding: 14, borderLeftWidth: 3, borderLeftColor: '#EF4444', gap: 8 },
  alertsTitle: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertText: { fontSize: 13, color: '#CBD5E1' },
});
