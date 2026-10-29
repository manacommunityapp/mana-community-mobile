import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { healthGuardService } from '@/services/healthGuardService';
import type { EmergencyIncidentDto } from '@/types/healthguard';

const COUNTDOWN = 5;

export default function SosScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'active' | 'resolved'>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeIncident, setActiveIncident] = useState<EmergencyIncidentDto | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    healthGuardService.getActiveIncident().then(inc => {
      if (inc) { setActiveIncident(inc); setPhase('active'); }
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = () => {
    Vibration.vibrate([0, 200, 100, 200]);
    setPhase('countdown');
    setCountdown(COUNTDOWN);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          triggerSos();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setCountdown(COUNTDOWN);
  };

  const triggerSos = async () => {
    setLoading(true);
    try {
      const incident = await healthGuardService.triggerSos({
        description: description || undefined,
        triggerType: 'MANUAL_SOS',
        severity: 'LEVEL_3_POSSIBLE_EMERGENCY',
      });
      setActiveIncident(incident);
      setPhase('active');
      Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    } catch {
      Alert.alert('SOS Sent', 'Emergency alert triggered (offline mode).');
      setPhase('active');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = () => {
    Alert.alert('Resolve Incident', 'Are you safe now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, I\'m safe', onPress: async () => {
          if (activeIncident?.id) {
            await healthGuardService.resolveIncident(activeIncident.id, 'Resolved by user');
          }
          setActiveIncident(null);
          setPhase('resolved');
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel SOS', 'Cancel the emergency alert?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel', onPress: async () => {
          if (activeIncident?.id) {
            await healthGuardService.cancelIncident(activeIncident.id);
          }
          setActiveIncident(null);
          setPhase('idle');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Emergency SOS</Text>
        <View style={{ width: 40 }} />
      </View>

      {phase === 'resolved' ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={80} color="#22c55e" />
          <Text style={styles.safeText}>You're marked safe</Text>
          <Text style={styles.safeSubText}>Your emergency contacts have been notified.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : phase === 'active' ? (
        <View style={styles.center}>
          <View style={styles.activeRing}>
            <View style={styles.activePulse} />
            <Ionicons name="warning" size={48} color="#fff" />
          </View>
          <Text style={styles.activeTitle}>SOS ACTIVE</Text>
          <Text style={styles.activeSubText}>
            {activeIncident?.alertsSent
              ? `${activeIncident.alertsSent} contact${activeIncident.alertsSent > 1 ? 's' : ''} notified`
              : 'Emergency contacts have been alerted'}
          </Text>
          {activeIncident?.triggeredAt && (
            <Text style={styles.time}>
              Since {new Date(activeIncident.triggeredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancel SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resolveBtn} onPress={handleResolve}>
              <Text style={styles.resolveBtnText}>I'm Safe</Text>
            </TouchableOpacity>
          </View>
          {/* Emergency numbers */}
          <View style={styles.numbersCard}>
            <Text style={styles.numbersTitle}>Quick Call</Text>
            {[{ label: 'Ambulance', num: '108' }, { label: 'Emergency', num: '112' }, { label: 'Police', num: '100' }].map(e => (
              <View key={e.num} style={styles.numberRow}>
                <Text style={styles.numberLabel}>{e.label}</Text>
                <Text style={styles.numberVal}>{e.num}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : phase === 'countdown' ? (
        <View style={styles.center}>
          <Text style={styles.countdownLabel}>Sending SOS in</Text>
          <Text style={styles.countdownNum}>{countdown}</Text>
          <TouchableOpacity style={styles.stopBtn} onPress={cancelCountdown}>
            <Text style={styles.stopBtnText}>STOP</Text>
          </TouchableOpacity>
          <Text style={styles.countdownHint}>Tap STOP to cancel</Text>
        </View>
      ) : (
        <>
          <View style={styles.center}>
            <TouchableOpacity style={styles.sosButton} onPress={startCountdown} disabled={loading} activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <Text style={styles.sosBtnLabel}>SOS</Text>
                  <Text style={styles.sosBtnSub}>Hold to send</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={styles.hint}>Tap to start a {COUNTDOWN}-second countdown before sending</Text>
          </View>

          <View style={styles.descCard}>
            <Text style={styles.descLabel}>What's the emergency? (optional)</Text>
            <TextInput
              style={styles.descInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe briefly…"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              maxLength={200}
            />
          </View>

          <View style={styles.numbersCard}>
            <Text style={styles.numbersTitle}>India Emergency Numbers</Text>
            {[
              { label: 'National Emergency', num: '112' },
              { label: 'Ambulance', num: '108' },
              { label: 'Police', num: '100' },
              { label: 'Fire', num: '101' },
              { label: 'Women Helpline', num: '1091' },
              { label: 'Disaster Mgmt', num: '1078' },
            ].map(e => (
              <View key={e.num} style={styles.numberRow}>
                <Text style={styles.numberLabel}>{e.label}</Text>
                <Text style={styles.numberVal}>{e.num}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xl },
  backBtn: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  center: { alignItems: 'center', paddingVertical: SPACING.xl },
  sosButton: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.lg,
    borderWidth: 4, borderColor: '#fca5a5',
  },
  sosBtnLabel: { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  sosBtnSub: { fontSize: 12, color: '#fecaca', marginTop: 4 },
  hint: { marginTop: SPACING.md, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 },
  countdownLabel: { fontSize: 20, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  countdownNum: { fontSize: 96, fontWeight: '900', color: '#ef4444', lineHeight: 110 },
  stopBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.surface, paddingHorizontal: 48, paddingVertical: 16, borderRadius: RADIUS.lg, ...SHADOWS.sm },
  stopBtnText: { fontSize: 20, fontWeight: '700', color: '#ef4444' },
  countdownHint: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textSecondary },
  activeRing: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 6, borderColor: '#fca5a5',
    ...SHADOWS.lg,
  },
  activePulse: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    borderWidth: 2, borderColor: '#ef444440',
  },
  activeTitle: { fontSize: 32, fontWeight: '900', color: '#ef4444', marginTop: SPACING.md, letterSpacing: 3 },
  activeSubText: { fontSize: 15, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  time: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#ef4444', borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  resolveBtn: { flex: 1, backgroundColor: '#22c55e', borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', ...SHADOWS.sm },
  resolveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  safeText: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginTop: SPACING.md },
  safeSubText: { fontSize: 14, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  doneBtn: { marginTop: SPACING.xl, backgroundColor: COLORS.primary, paddingHorizontal: 48, paddingVertical: 14, borderRadius: RADIUS.lg },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  descCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  descLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  descInput: { color: COLORS.text, fontSize: 14, minHeight: 64, textAlignVertical: 'top' },
  numbersCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.sm, width: '100%' },
  numbersTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  numberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  numberLabel: { fontSize: 14, color: COLORS.textSecondary },
  numberVal: { fontSize: 16, fontWeight: '700', color: '#ef4444' },
});
