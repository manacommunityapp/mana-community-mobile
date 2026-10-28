import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Vibration, ActivityIndicator, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { guardService } from '@/services/guardService';
import { safetyService, type SosIncidentResponse } from '@/services/safetyService';
import { useAuth } from '@/hooks/useAuth';

// ─────────────── Constants ───────────────

const COUNTDOWN_SECS = 5;
const DARK_BG  = '#0B1120';
const DARK_CARD = '#131C2E';
const DARK_BORDER = '#1E2D45';
const DARK_TEXT = '#F1F5F9';
const DARK_MUTED = '#64748B';
const DARK_SUB = '#94A3B8';

type Phase = 'idle' | 'countdown' | 'active';
type IoniconsName = keyof typeof Ionicons.glyphMap;

const PANIC_TYPES: { key: string; label: string; icon: IoniconsName; color: string }[] = [
  { key: 'FIRE',       label: 'Fire',            icon: 'flame-outline',        color: '#EF4444' },
  { key: 'FIGHT',      label: 'Fight/Violence',  icon: 'alert-circle-outline', color: '#D97706' },
  { key: 'MEDICAL',    label: 'Medical',         icon: 'medkit-outline',       color: '#3B82F6' },
  { key: 'INTRUSION',  label: 'Intrusion',       icon: 'shield-outline',       color: '#7C3AED' },
  { key: 'SUSPICIOUS', label: 'Suspicious',      icon: 'eye-outline',          color: '#059669' },
  { key: 'OTHER',      label: 'Other',           icon: 'megaphone-outline',    color: '#6B7280' },
];

const LOCATION_CHIPS = [
  'Main Gate', 'Back Gate', 'Parking', 'Tower A', 'Tower B',
  'Clubhouse', 'Pool Area', 'Lobby', 'Terrace', 'Basement',
];

// ─────────────── Pulse animation hook ───────────────

function usePulse(running: boolean) {
  const scale = useRef(new Animated.Value(1)).current;
  const anim  = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => {
    if (running) {
      anim.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.12, duration: 600, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,    duration: 600, useNativeDriver: true }),
        ])
      );
      anim.current.start();
    } else {
      anim.current?.stop();
      scale.setValue(1);
    }
    return () => { anim.current?.stop(); };
  }, [running]);
  return scale;
}

// ─────────────── Countdown phase screen ───────────────

interface CountdownScreenProps {
  countdown: number;
  panicType: string;
  onCancel: () => void;
}

function CountdownScreen({ countdown, panicType, onCancel }: CountdownScreenProps) {
  const scale = usePulse(true);
  const type = PANIC_TYPES.find(p => p.key === panicType)!;

  return (
    <SafeAreaView style={cd.container}>
      <View style={cd.wrap}>
        <Text style={cd.title}>Sending SOS in</Text>
        <Animated.View style={[cd.ring, { transform: [{ scale }], borderColor: type.color }]}>
          <View style={[cd.innerCircle, { backgroundColor: type.color }]}>
            <Text style={cd.num}>{countdown}</Text>
          </View>
        </Animated.View>
        <View style={[cd.typeBadge, { borderColor: type.color }]}>
          <Ionicons name={type.icon} size={14} color={type.color} />
          <Text style={[cd.typeBadgeText, { color: type.color }]}>{type.label}</Text>
        </View>
        <Text style={cd.hint}>Tap cancel to abort</Text>
        <TouchableOpacity style={cd.cancelBtn} onPress={onCancel}>
          <Text style={cd.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────── Active SOS phase screen ───────────────

interface ActiveSosScreenProps {
  incident: SosIncidentResponse | null;
  panicType: string;
  location: string;
  notes: string;
  resolving: boolean;
  onResolve: () => void;
}

function ActiveSosScreen({ incident, panicType, location, notes, resolving, onResolve }: ActiveSosScreenProps) {
  const scale = usePulse(true);
  const type = PANIC_TYPES.find(p => p.key === panicType)!;

  return (
    <SafeAreaView style={[ac.container, { backgroundColor: DARK_BG }]}>
      <View style={ac.wrap}>
        <Animated.View style={[ac.outerRing, { transform: [{ scale }] }]}>
          <View style={ac.innerRing}>
            <Ionicons name="alert-circle" size={52} color="#fff" />
          </View>
        </Animated.View>

        <Text style={ac.title}>SOS ALERT ACTIVE</Text>
        <Text style={ac.sub}>Security team and management have been notified.</Text>

        <View style={[ac.typeBadge, { borderColor: type.color, backgroundColor: type.color + '22' }]}>
          <Ionicons name={type.icon} size={14} color={type.color} />
          <Text style={[ac.typeBadgeText, { color: type.color }]}>{type.label}</Text>
        </View>

        {!!location && (
          <View style={ac.metaRow}>
            <Ionicons name="location-outline" size={13} color={DARK_MUTED} />
            <Text style={ac.metaText}>{location}</Text>
          </View>
        )}
        {!!notes && (
          <Text style={ac.notesText}>{notes}</Text>
        )}

        {incident && (
          <View style={ac.idBox}>
            <Text style={ac.idLabel}>INCIDENT</Text>
            <Text style={ac.idValue}>#{incident.id} · {incident.status}</Text>
          </View>
        )}

        <View style={ac.helpBox}>
          <Ionicons name="radio-outline" size={14} color={DARK_MUTED} />
          <Text style={ac.helpText}>Stay calm. Keep your radio open for dispatch instructions.</Text>
        </View>

        <TouchableOpacity
          style={[ac.resolveBtn, resolving && { opacity: 0.6 }]}
          onPress={onResolve}
          disabled={resolving}
        >
          {resolving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={ac.resolveBtnText}>Mark as Resolved</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────── Main Screen ───────────────

export default function GuardSosScreen() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [panicType, setPanicType] = useState('OTHER');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [incident, setIncident] = useState<SosIncidentResponse | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<SosIncidentResponse[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [resolving, setResolving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    const [alertsRes] = await Promise.allSettled([safetyService.getActiveAlerts()]);
    if (alertsRes.status === 'fulfilled') setActiveAlerts(alertsRes.value);
    setLoadingAlerts(false);
  }, []);

  useFocusEffect(useCallback(() => { loadAlerts(); }, [loadAlerts]));

  // Countdown tick
  useEffect(() => {
    if (phase !== 'countdown') return;
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          fireAlert();
          return COUNTDOWN_SECS;
        }
        Vibration.vibrate(80);
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const fireAlert = async () => {
    setTriggering(true);
    Vibration.vibrate([200, 100, 200, 100, 200]);
    try {
      const result = await safetyService.triggerSOS({
        emergencyType: panicType === 'OTHER' ? 'GENERAL_PANIC' : (panicType as any),
        severity: 'CRITICAL',
        flatNumber: user?.flatNumber,
        buildingBlock: user?.tower,
        locationDetails: location.trim() || 'Guard mobile SOS',
        notes: notes.trim() || 'Guard requested immediate assistance',
      });
      setIncident(result);
    } catch {
      // Always show active screen — guard safety takes priority over API errors
    } finally {
      setTriggering(false);
      setPhase('active');
      loadAlerts();
    }
  };

  const startCountdown = () => {
    Vibration.vibrate([100, 50, 100]);
    setPhase('countdown');
    setCountdown(COUNTDOWN_SECS);
  };

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    setCountdown(COUNTDOWN_SECS);
    Vibration.cancel();
  };

  const handleResolve = () => {
    Alert.alert(
      'Resolve Alert?',
      'Only resolve if the situation is fully under control.',
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Resolve',
          style: 'destructive',
          onPress: async () => {
            setResolving(true);
            try {
              if (incident?.id) {
                await safetyService.resolveAlert(incident.id, 'Resolved by guard on scene');
              }
            } catch {}
            setResolving(false);
            setPhase('idle');
            setCountdown(COUNTDOWN_SECS);
            setIncident(null);
            loadAlerts();
            Alert.alert('Resolved', 'Alert marked as resolved. Team has been notified.');
          },
        },
      ]
    );
  };

  if (phase === 'countdown') {
    return <CountdownScreen countdown={countdown} panicType={panicType} onCancel={cancelCountdown} />;
  }

  if (phase === 'active') {
    return (
      <ActiveSosScreen
        incident={incident}
        panicType={panicType}
        location={location}
        notes={notes}
        resolving={resolving}
        onResolve={handleResolve}
      />
    );
  }

  const selectedType = PANIC_TYPES.find(p => p.key === panicType)!;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.headerRow}>
            <View>
              <Text style={s.title}>Emergency SOS</Text>
              <Text style={s.sub}>For genuine emergencies only — alerts the response team immediately.</Text>
            </View>
          </View>

          {/* Active alerts banner */}
          {activeAlerts.length > 0 && (
            <View style={s.alertsBanner}>
              <View style={s.alertsBannerHeader}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={s.alertsBannerTitle}>Active Alerts ({activeAlerts.length})</Text>
              </View>
              {activeAlerts.slice(0, 3).map(a => (
                <View key={a.id} style={s.alertRow}>
                  <View style={s.alertDot} />
                  <Text style={s.alertRowText} numberOfLines={1}>
                    {a.emergencyType?.replace(/_/g, ' ') ?? 'SOS'} · {a.locationDetails ?? 'Unknown'}
                  </Text>
                  <Text style={s.alertTimeText}>
                    {new Date(a.triggeredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </View>
              ))}
              {activeAlerts.length > 3 && (
                <Text style={s.alertMoreText}>+{activeAlerts.length - 3} more active alerts</Text>
              )}
            </View>
          )}

          {/* Incident type */}
          <Text style={s.sectionLabel}>Incident Type</Text>
          <View style={s.typeGrid}>
            {PANIC_TYPES.map(t => {
              const sel = panicType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[s.typeBtn, sel && { borderColor: t.color, backgroundColor: t.color + '18' }]}
                  onPress={() => setPanicType(t.key)}
                >
                  <Ionicons name={t.icon} size={22} color={sel ? t.color : DARK_MUTED} />
                  <Text style={[s.typeBtnText, sel && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Location chips */}
          <Text style={s.sectionLabel}>Location</Text>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
          >
            {LOCATION_CHIPS.map(loc => {
              const sel = location === loc;
              return (
                <TouchableOpacity
                  key={loc}
                  style={[s.locChip, sel && s.locChipActive]}
                  onPress={() => setLocation(sel ? '' : loc)}
                >
                  <Text style={[s.locChipText, sel && s.locChipTextActive]}>{loc}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TextInput
            style={s.input}
            placeholder="Or type exact location..."
            placeholderTextColor={DARK_MUTED}
            value={LOCATION_CHIPS.includes(location) ? '' : location}
            onChangeText={setLocation}
          />

          {/* Notes */}
          <Text style={s.sectionLabel}>Notes (Optional)</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Briefly describe the situation..."
            placeholderTextColor={DARK_MUTED}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* SOS button */}
          <TouchableOpacity
            style={[s.sosBtn, { borderColor: selectedType.color }]}
            onPress={startCountdown}
            activeOpacity={0.85}
          >
            <View style={[s.sosBtnInner, { backgroundColor: selectedType.color }]}>
              <Ionicons name="alert-circle" size={36} color="#fff" />
              <Text style={s.sosBtnLabel}>SEND SOS</Text>
              <Text style={s.sosBtnSub}>{COUNTDOWN_SECS}s countdown · tap to start</Text>
            </View>
          </TouchableOpacity>

          {/* Disclaimer */}
          <View style={s.disclaimerBox}>
            <Ionicons name="information-circle-outline" size={14} color={DARK_MUTED} />
            <Text style={s.disclaimerText}>
              Sending a false SOS is a disciplinary offence. Use only in real emergencies.
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────── Countdown styles ───────────────
const cd = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 },
  title: { fontSize: 22, fontWeight: '700', color: DARK_TEXT },
  ring: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
  },
  innerCircle: {
    width: 128, height: 128, borderRadius: 64,
    alignItems: 'center', justifyContent: 'center',
  },
  num: { fontSize: 64, fontWeight: '800', color: '#fff', fontFamily: 'monospace' },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  typeBadgeText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 13, color: DARK_MUTED },
  cancelBtn: {
    backgroundColor: DARK_CARD, borderRadius: RADIUS.lg,
    paddingHorizontal: 44, paddingVertical: 14,
    borderWidth: 1, borderColor: DARK_BORDER,
  },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: DARK_TEXT },
});

// ─────────────── Active SOS styles ───────────────
const ac = StyleSheet.create({
  container: { flex: 1 },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  outerRing: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(220,38,38,0.2)', alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  innerRing: {
    width: 108, height: 108, borderRadius: 54,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.lg,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#EF4444', letterSpacing: 1.5 },
  sub: { fontSize: 13, color: DARK_SUB, textAlign: 'center', lineHeight: 19 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: DARK_SUB },
  notesText: { fontSize: 13, color: DARK_MUTED, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  idBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: DARK_CARD, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: DARK_BORDER,
  },
  idLabel: { fontSize: 10, fontWeight: '800', color: DARK_MUTED, letterSpacing: 0.8 },
  idValue: { fontSize: 13, fontWeight: '700', color: DARK_TEXT },
  helpBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: DARK_CARD, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: DARK_BORDER, maxWidth: 300,
  },
  helpText: { flex: 1, fontSize: 12, color: DARK_MUTED, lineHeight: 17 },
  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#16A34A', borderRadius: RADIUS.lg,
    paddingHorizontal: 28, paddingVertical: 14, marginTop: 8,
    ...SHADOWS.md,
  },
  resolveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ─────────────── Idle screen styles ───────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_BG },
  scroll: { padding: 16, gap: 16 },

  headerRow: { gap: 4 },
  title: { fontSize: 22, fontWeight: '800', color: DARK_TEXT, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: DARK_SUB, lineHeight: 18 },

  // Active alerts banner
  alertsBanner: {
    backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    gap: 8,
  },
  alertsBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alertsBannerTitle: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  alertRowText: { flex: 1, fontSize: 12, color: DARK_SUB },
  alertTimeText: { fontSize: 11, color: DARK_MUTED },
  alertMoreText: { fontSize: 11, color: DARK_MUTED, marginTop: 2 },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: DARK_MUTED,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  // Incident type grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    width: '30%', flexGrow: 1, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: DARK_BORDER, backgroundColor: DARK_CARD,
    padding: 12, alignItems: 'center', gap: 6,
  },
  typeBtnText: {
    fontSize: 11, color: DARK_MUTED, textAlign: 'center', fontWeight: '500',
  },

  // Location
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  locChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: DARK_CARD, borderWidth: 1, borderColor: DARK_BORDER,
  },
  locChipActive: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#EF4444' },
  locChipText: { fontSize: 12, fontWeight: '600', color: DARK_MUTED },
  locChipTextActive: { color: '#FCA5A5', fontWeight: '700' },

  input: {
    backgroundColor: DARK_CARD, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: DARK_BORDER,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: DARK_TEXT,
  },
  textarea: { height: 80, textAlignVertical: 'top' },

  // SOS button
  sosBtn: {
    borderRadius: 20, borderWidth: 2, padding: 3,
    ...SHADOWS.lg,
  },
  sosBtnInner: {
    borderRadius: 17, padding: 28, alignItems: 'center', gap: 6,
  },
  sosBtnLabel: {
    fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 2,
  },
  sosBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  disclaimerBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: DARK_CARD, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: DARK_BORDER,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: DARK_MUTED, lineHeight: 17 },
});
