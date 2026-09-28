import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { guardService, type PatrolSession, type PatrolCheckpoint, type CheckpointStatus } from '@/services/guardService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const CP_META: Record<CheckpointStatus, { color: string; bg: string; icon: IoniconsName; label: string }> = {
  COMPLETED: { color: COLORS.success, bg: COLORS.successLight, icon: 'checkmark-circle', label: 'Done' },
  PENDING:   { color: COLORS.textMuted, bg: COLORS.surfaceAlt, icon: 'ellipse-outline', label: 'Pending' },
  SKIPPED:   { color: COLORS.warning, bg: COLORS.warningLight, icon: 'play-skip-forward', label: 'Skipped' },
};

export default function GuardPatrolScreen() {
  const [session, setSession] = useState<PatrolSession | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPatrol = async () => {
    const data = await guardService.getPatrolSession();
    setSession(data);
  };

  useEffect(() => { loadPatrol(); }, []);

  useEffect(() => {
    if (!session?.startedAt) return;
    const update = () => {
      const diff = Date.now() - new Date(session.startedAt).getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsed(`${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.startedAt]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatrol();
    setRefreshing(false);
  };

  const handleScan = (cp: PatrolCheckpoint) => {
    Alert.alert('Scan Checkpoint', `Mark "${cp.name}" as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Scan',
        onPress: async () => {
          await guardService.scanCheckpoint(cp.id);
          await loadPatrol();
        },
      },
    ]);
  };

  const checkpoints = session?.checkpoints || [];
  const completed = checkpoints.filter(c => c.status === 'COMPLETED').length;
  const total = checkpoints.length;
  const progress = total > 0 ? completed / total : 0;
  const nextCheckpoint = checkpoints.find(c => c.status === 'PENDING');

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Patrol</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
      >
        {/* Timer card */}
        <View style={s.timerCard}>
          <Text style={s.timerValue}>{elapsed}</Text>
          <Text style={s.timerLabel}>Current Patrol Duration</Text>
          <View style={s.statusRow}>
            <View style={s.activeDot} />
            <Text style={s.activeText}>Active</Text>
          </View>

          {/* Progress bar */}
          <View style={s.progressWrap}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={s.progressText}>{completed}/{total} checkpoints</Text>
          </View>
        </View>

        {/* Next checkpoint highlight */}
        {nextCheckpoint && (
          <TouchableOpacity
            style={s.nextCard}
            activeOpacity={0.8}
            onPress={() => handleScan(nextCheckpoint)}
          >
            <View style={s.nextLeft}>
              <View style={s.nextIcon}>
                <Ionicons name="navigate" size={20} color={GUARD_COLORS.accent} />
              </View>
              <View>
                <Text style={s.nextLabel}>Next Checkpoint</Text>
                <Text style={s.nextName}>{nextCheckpoint.name}</Text>
                <Text style={s.nextLocation}>{nextCheckpoint.location}</Text>
              </View>
            </View>
            <View style={s.scanBtn}>
              <Ionicons name="qr-code" size={16} color="#fff" />
              <Text style={s.scanBtnText}>Scan</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Checkpoint list */}
        <Text style={s.sectionTitle}>Checkpoints</Text>
        {checkpoints.map((cp, i) => {
          const meta = CP_META[cp.status];
          const isNext = cp.id === nextCheckpoint?.id;
          return (
            <View key={cp.id} style={s.cpRow}>
              {/* Timeline line */}
              <View style={s.timeline}>
                <View style={[s.timelineDot, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon} size={14} color={cp.status === 'COMPLETED' ? '#fff' : meta.color} />
                </View>
                {i < checkpoints.length - 1 && (
                  <View style={[s.timelineLine, cp.status === 'COMPLETED' ? { backgroundColor: COLORS.success } : null]} />
                )}
              </View>

              {/* Content */}
              <View style={[s.cpCard, isNext && s.cpCardActive]}>
                <View style={s.cpInfo}>
                  <Text style={[s.cpName, cp.status === 'COMPLETED' && s.cpNameDone]}>{cp.name}</Text>
                  <Text style={s.cpLocation}>{cp.location}</Text>
                  {cp.scannedAt && (
                    <Text style={s.cpTime}>
                      Scanned at {new Date(cp.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
                <View style={[s.cpStatus, { backgroundColor: meta.bg }]}>
                  <Text style={[s.cpStatusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },

  timerCard: {
    backgroundColor: COLORS.surface, margin: 12,
    borderRadius: RADIUS.lg, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  timerValue: {
    fontSize: 42, fontFamily: 'DMSans-Bold', fontWeight: '800', color: GUARD_COLORS.accent, letterSpacing: -2,
  },
  timerLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginTop: 4 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.successLight, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 4, marginTop: 12,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  activeText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  progressWrap: { width: '100%', marginTop: 16, gap: 6 },
  progressBar: {
    height: 8, backgroundColor: COLORS.surfaceAlt,
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: GUARD_COLORS.accent, borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  nextCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 8,
    borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1.5, borderColor: GUARD_COLORS.accent, ...SHADOWS.sm,
  },
  nextLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  nextIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: GUARD_COLORS.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  nextLabel: { fontSize: 10, fontWeight: '700', color: GUARD_COLORS.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  nextName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 1 },
  nextLocation: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  scanBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  sectionTitle: {
    fontSize: 14, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },

  cpRow: { flexDirection: 'row', paddingHorizontal: 12, minHeight: 72 },
  timeline: { width: 32, alignItems: 'center' },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: {
    width: 2, flex: 1, backgroundColor: COLORS.border,
    marginVertical: 2,
  },
  cpCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 12, marginLeft: 8, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cpCardActive: { borderColor: GUARD_COLORS.accent, borderWidth: 1.5, backgroundColor: '#F0FDFA' },
  cpInfo: { flex: 1, gap: 1 },
  cpName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  cpNameDone: { color: COLORS.textMuted },
  cpLocation: { fontSize: 11, color: COLORS.textMuted },
  cpTime: { fontSize: 10, color: COLORS.success, fontWeight: '600', marginTop: 2 },
  cpStatus: { borderRadius: RADIUS.xs, paddingHorizontal: 7, paddingVertical: 3 },
  cpStatusText: { fontSize: 10, fontWeight: '700' },
});
