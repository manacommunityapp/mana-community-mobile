import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { visitorApprovalService, type PendingApproval, type WalkInRequest } from '@/services/visitorApprovalService';

type VisitorType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE';
type Phase = 'form' | 'waiting' | 'approved' | 'denied' | 'timeout';

const TYPE_CONFIG: Record<VisitorType, {
  label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; defaultPurpose: string;
}> = {
  GUEST:    { label: 'Guest',        icon: 'person-outline',    color: COLORS.primary, bg: '#EEF2FF', defaultPurpose: 'Guest Visit' },
  DELIVERY: { label: 'Delivery',     icon: 'cube-outline',      color: '#D97706',      bg: '#FEF3C7', defaultPurpose: 'Package Delivery' },
  CAB:      { label: 'Cab / Taxi',   icon: 'car-outline',       color: '#2563EB',      bg: '#DBEAFE', defaultPurpose: 'Cab Pickup / Drop' },
  SERVICE:  { label: 'Service Tech', icon: 'construct-outline', color: '#059669',      bg: '#D1FAE5', defaultPurpose: 'Home Service' },
};

const TIMEOUT_SECS = 120;
const POLL_INTERVAL_MS = 4000;

export default function GuardWalkInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ flatNumber?: string }>();

  const [phase, setPhase] = useState<Phase>('form');
  const [visitorType, setVisitorType] = useState<VisitorType>('GUEST');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [flatNumber, setFlatNumber] = useState(params.flatNumber ?? '');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [approvalResult, setApprovalResult] = useState<PendingApproval | null>(null);
  const [countdown, setCountdown] = useState(TIMEOUT_SECS);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startPolling = useCallback((id: number) => {
    setCountdown(TIMEOUT_SECS);

    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          stopPolling();
          setPhase('timeout');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      const result = await visitorApprovalService.pollApprovalStatus(id);
      if (!result) return;
      if (result.approvalStatus === 'APPROVED') {
        stopPolling();
        setApprovalResult(result);
        setPhase('approved');
        Vibration.vibrate([100, 60, 100]);
      } else if (result.approvalStatus === 'DENIED') {
        stopPolling();
        setApprovalResult(result);
        setPhase('denied');
        Vibration.vibrate(300);
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const handleSubmit = async () => {
    if (!visitorName.trim()) { Alert.alert('Name required', 'Enter the visitor\'s name.'); return; }
    if (!flatNumber.trim()) { Alert.alert('Flat required', 'Enter the resident\'s flat number.'); return; }

    const req: WalkInRequest = {
      visitorName: visitorName.trim(),
      visitorPhone: visitorPhone.trim() || undefined,
      purpose: purpose.trim() || TYPE_CONFIG[visitorType].defaultPurpose,
      passType: visitorType,
      vehicleNumber: vehicleNumber.trim() || undefined,
      flatNumber: flatNumber.trim().toUpperCase(),
      gate: 'Main Gate',
    };

    setSubmitting(true);
    try {
      const pending = await visitorApprovalService.createWalkInRequest(req);
      setPendingId(pending.id);
      setPhase('waiting');
      startPolling(pending.id);
    } catch (err: any) {
      Alert.alert('Could not send request', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!pendingId) return;
    try {
      await visitorApprovalService.approve(pendingId);
      Alert.alert('Visitor Checked In', `${visitorName} has been checked in.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      router.back();
    }
  };

  const resetForm = () => {
    stopPolling();
    setPhase('form');
    setVisitorName('');
    setVisitorPhone('');
    setVehicleNumber('');
    setPurpose('');
    setFlatNumber(params.flatNumber ?? '');
    setPendingId(null);
    setApprovalResult(null);
    setCountdown(TIMEOUT_SECS);
  };

  // ── APPROVED ──────────────────────────────────────────────────────
  if (phase === 'approved') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.resultContainer}>
          <View style={[s.resultIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="checkmark-circle" size={64} color="#059669" />
          </View>
          <Text style={[s.resultTitle, { color: '#059669' }]}>Entry Approved</Text>
          <Text style={s.resultSub}>
            The resident has approved entry for{' '}
            <Text style={{ fontWeight: '800' }}>{visitorName}</Text>
          </Text>
          {approvalResult?.passCode && (
            <View style={s.passCodeBox}>
              <Ionicons name="key-outline" size={14} color={COLORS.primary} />
              <Text style={s.passCodeText}>{approvalResult.passCode}</Text>
            </View>
          )}
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#059669' }]} onPress={handleCheckIn}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={s.primaryBtnText}>Check In Visitor</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => router.back()}>
            <Text style={s.secondaryBtnText}>Back to Visitor Log</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── DENIED ────────────────────────────────────────────────────────
  if (phase === 'denied') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.resultContainer}>
          <View style={[s.resultIcon, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle" size={64} color="#DC2626" />
          </View>
          <Text style={[s.resultTitle, { color: '#DC2626' }]}>Entry Denied</Text>
          <Text style={s.resultSub}>
            The resident has denied entry for{' '}
            <Text style={{ fontWeight: '800' }}>{visitorName}</Text>
          </Text>
          {approvalResult?.denialReason ? (
            <View style={s.reasonBox}>
              <Text style={s.reasonLabel}>Reason from resident</Text>
              <Text style={s.reasonText}>{approvalResult.denialReason}</Text>
            </View>
          ) : null}
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#DC2626' }]} onPress={() => router.back()}>
            <Text style={s.primaryBtnText}>Return to Gate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={resetForm}>
            <Text style={s.secondaryBtnText}>Try Another Flat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── TIMEOUT ───────────────────────────────────────────────────────
  if (phase === 'timeout') {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.resultContainer}>
          <View style={[s.resultIcon, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time" size={64} color="#D97706" />
          </View>
          <Text style={[s.resultTitle, { color: '#D97706' }]}>No Response</Text>
          <Text style={s.resultSub}>
            The resident did not respond within {TIMEOUT_SECS} seconds.
          </Text>
          <View style={s.timeoutOptions}>
            <Text style={s.timeoutOptionsLabel}>What would you like to do?</Text>
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: '#D97706' }]}
              onPress={() => Alert.alert('Call Resident', `Call the resident at flat ${flatNumber} to confirm entry manually.`)}
            >
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={s.primaryBtnText}>Call Resident</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: COLORS.textMuted }]} onPress={resetForm}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={s.primaryBtnText}>Send Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => router.back()}>
              <Text style={s.secondaryBtnText}>Cancel — Turn Away Visitor</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── WAITING ───────────────────────────────────────────────────────
  if (phase === 'waiting') {
    const progressPct = countdown / TIMEOUT_SECS;
    const isUrgent = countdown <= 30;
    return (
      <SafeAreaView style={s.container}>
        <View style={s.waitHeader}>
          <TouchableOpacity onPress={() => { stopPolling(); router.back(); }}>
            <Ionicons name="arrow-back" size={22} color={GUARD_COLORS.accent} />
          </TouchableOpacity>
          <Text style={s.waitHeaderTitle}>Awaiting Resident</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={s.waitContainer}>
          <View style={[s.waitAvatar, { backgroundColor: TYPE_CONFIG[visitorType].bg }]}>
            <Ionicons name={TYPE_CONFIG[visitorType].icon} size={36} color={TYPE_CONFIG[visitorType].color} />
          </View>
          <Text style={s.waitName}>{visitorName}</Text>
          <Text style={s.waitPurpose}>{purpose || TYPE_CONFIG[visitorType].defaultPurpose}</Text>
          <View style={s.waitFlatRow}>
            <Ionicons name="home-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.waitFlat}>Flat {flatNumber}</Text>
          </View>

          <View style={s.pulseWrap}>
            <ActivityIndicator size="large" color={isUrgent ? '#DC2626' : GUARD_COLORS.accent} />
          </View>

          <Text style={[s.waitStatus, isUrgent && { color: '#DC2626' }]}>
            Waiting for resident approval…
          </Text>
          <Text style={s.waitHint}>
            A notification has been sent to the resident's phone.
          </Text>

          {/* Countdown bar */}
          <View style={s.countdownWrap}>
            <View style={s.countdownBar}>
              <View style={[
                s.countdownFill,
                { width: `${progressPct * 100}%`, backgroundColor: isUrgent ? '#DC2626' : GUARD_COLORS.accent },
              ]} />
            </View>
            <Text style={[s.countdownText, isUrgent && { color: '#DC2626' }]}>
              {countdown}s remaining
            </Text>
          </View>

          <TouchableOpacity
            style={s.cancelWait}
            onPress={() => Alert.alert(
              'Cancel Request?',
              'This will cancel the approval request. The visitor will not be allowed in.',
              [
                { text: 'Keep Waiting', style: 'cancel' },
                { text: 'Cancel Request', style: 'destructive', onPress: () => { stopPolling(); router.back(); } },
              ]
            )}
          >
            <Text style={s.cancelWaitText}>Cancel request</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────
  const config = TYPE_CONFIG[visitorType];
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.formHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.formHeaderTitle}>Walk-in Visitor</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
        <Text style={s.formDesc}>
          Register a walk-in visitor. A notification will be sent to the resident for approval before entry.
        </Text>

        {/* Visitor type selector */}
        <Text style={s.label}>Visitor Type</Text>
        <View style={s.typeRow}>
          {(Object.keys(TYPE_CONFIG) as VisitorType[]).map(t => {
            const tc = TYPE_CONFIG[t];
            const active = visitorType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[s.typeChip, active && { borderColor: tc.color, backgroundColor: tc.bg }]}
                onPress={() => {
                  setVisitorType(t);
                  if (!purpose) setPurpose(tc.defaultPurpose);
                  else setPurpose(tc.defaultPurpose);
                }}
              >
                <Ionicons name={tc.icon} size={18} color={active ? tc.color : COLORS.textMuted} />
                <Text style={[s.typeChipText, active && { color: tc.color, fontWeight: '700' }]}>{tc.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={s.label}>Visitor Name *</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Ravi Kumar"
          placeholderTextColor={COLORS.textMuted}
          value={visitorName}
          onChangeText={setVisitorName}
          autoCapitalize="words"
        />

        <Text style={s.label}>Resident's Flat Number *</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. A-1204 or Tower B-502"
          placeholderTextColor={COLORS.textMuted}
          value={flatNumber}
          onChangeText={setFlatNumber}
          autoCapitalize="characters"
        />

        <Text style={s.label}>Purpose</Text>
        <TextInput
          style={s.input}
          placeholder={config.defaultPurpose}
          placeholderTextColor={COLORS.textMuted}
          value={purpose}
          onChangeText={setPurpose}
          autoCapitalize="sentences"
        />

        <Text style={s.label}>Vehicle Number (Optional)</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. KA-01-AB-1234"
          placeholderTextColor={COLORS.textMuted}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          autoCapitalize="characters"
        />

        <Text style={s.label}>Visitor Phone (Optional)</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. 9876543210"
          placeholderTextColor={COLORS.textMuted}
          value={visitorPhone}
          onChangeText={setVisitorPhone}
          keyboardType="phone-pad"
        />

        <View style={s.infoBox}>
          <Ionicons name="notifications-outline" size={16} color={COLORS.primary} />
          <Text style={s.infoText}>
            The resident at flat <Text style={{ fontWeight: '700' }}>{flatNumber || '—'}</Text> will receive a push notification to Allow or Deny this visitor.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, (!visitorName.trim() || !flatNumber.trim()) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !visitorName.trim() || !flatNumber.trim()}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={20} color="#fff" />
              <Text style={s.submitBtnText}>Send Approval Request</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Form header
  formHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  formHeaderTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  formScroll: { padding: SPACING.lg, gap: 8, paddingBottom: 40 },
  formDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 6 },

  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1,
    borderColor: COLORS.border, padding: 13, fontSize: 15, color: COLORS.text,
  },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 9,
  },
  typeChipText: { fontSize: 13, color: COLORS.textMuted },

  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, padding: 12, marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.lg, padding: 16, marginTop: 8,
    ...SHADOWS.md,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Waiting
  waitHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  waitHeaderTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  waitContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 10 },
  waitAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  waitName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  waitPurpose: { fontSize: 14, color: COLORS.textMuted },
  waitFlatRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  waitFlat: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  pulseWrap: { marginVertical: 16 },
  waitStatus: { fontSize: 16, fontWeight: '700', color: GUARD_COLORS.accent, textAlign: 'center' },
  waitHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
  countdownWrap: { width: '100%', gap: 6, marginTop: 8 },
  countdownBar: { width: '100%', height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  countdownFill: { height: 6, borderRadius: 3 },
  countdownText: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  cancelWait: { marginTop: 8, padding: 10 },
  cancelWaitText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },

  // Result screens
  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 12 },
  resultIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 26, fontWeight: '800' },
  resultSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  passCodeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8,
  },
  passCodeText: { fontSize: 15, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  reasonBox: {
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: 12, width: '100%',
    borderLeftWidth: 3, borderLeftColor: '#DC2626',
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#DC2626', marginBottom: 4, textTransform: 'uppercase' },
  reasonText: { fontSize: 13, color: '#7F1D1D' },
  timeoutOptions: { width: '100%', gap: 10, marginTop: 8 },
  timeoutOptionsLabel: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 4 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: RADIUS.lg, padding: 15, width: '100%', ...SHADOWS.sm,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  secondaryBtn: { alignItems: 'center', padding: 12, width: '100%' },
  secondaryBtnText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
});
