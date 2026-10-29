import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { useAuth } from '@/hooks/useAuth';
import {
  guardService,
  type PatrolSession,
  type PatrolCheckpoint,
  type CheckpointStatus,
} from '@/services/guardService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const CP_META: Record<CheckpointStatus, {
  color: string; bg: string; border: string; icon: IoniconsName; label: string;
}> = {
  COMPLETED: { color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', icon: 'checkmark-circle', label: 'Done'    },
  PENDING:   { color: COLORS.textMuted, bg: COLORS.surfaceAlt, border: COLORS.border, icon: 'ellipse-outline', label: 'Pending' },
  SKIPPED:   { color: '#D97706', bg: '#FEF3C7', border: '#FCD34D', icon: 'play-skip-forward', label: 'Skipped' },
};

function pad(n: number) { return String(n).padStart(2, '0'); }

function elapsedStr(startedAt: string): string {
  const diff = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ─────────────── No-session empty state ───────────────

interface EmptyPatrolProps {
  starting: boolean;
  onStart: () => void;
}

function EmptyPatrol({ starting, onStart }: EmptyPatrolProps) {
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyIconBox}>
        <Ionicons name="shield-outline" size={52} color={GUARD_COLORS.accent} />
      </View>
      <Text style={s.emptyTitle}>No Active Patrol</Text>
      <Text style={s.emptyDesc}>
        Start a patrol round to begin scanning checkpoints and logging your route.
      </Text>
      <TouchableOpacity
        style={[s.startPatrolBtn, starting && { opacity: 0.7 }]}
        onPress={onStart}
        disabled={starting}
      >
        {starting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="play-circle" size={18} color="#fff" />
            <Text style={s.startPatrolBtnText}>Start Patrol Round</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─────────────── Checkpoint row ───────────────

interface CheckpointRowProps {
  cp: PatrolCheckpoint;
  isNext: boolean;
  isLast: boolean;
  scanningId: number | null;
  onScan: (cp: PatrolCheckpoint) => void;
  onSkip: (cp: PatrolCheckpoint) => void;
  scanError?: string;
}

function CheckpointRow({ cp, isNext, isLast, scanningId, onScan, onSkip, scanError }: CheckpointRowProps) {
  const meta = CP_META[cp.status];
  const loading = scanningId === cp.id;
  const canAct = cp.status === 'PENDING';

  return (
    <View style={s.cpRow}>
      {/* Timeline */}
      <View style={s.timeline}>
        <View style={[s.timelineDot, { backgroundColor: meta.bg, borderColor: meta.border, borderWidth: 1.5 }]}>
          {loading ? (
            <ActivityIndicator size="small" color={GUARD_COLORS.accent} />
          ) : (
            <Ionicons
              name={meta.icon}
              size={14}
              color={cp.status === 'COMPLETED' ? meta.color : meta.color}
            />
          )}
        </View>
        {!isLast && (
          <View style={[s.timelineLine, cp.status === 'COMPLETED' && { backgroundColor: '#6EE7B7' }]} />
        )}
      </View>

      {/* Card */}
      <View style={[s.cpCard, isNext && s.cpCardNext, cp.status === 'COMPLETED' && s.cpCardDone]}>
        <View style={s.cpInfo}>
          <View style={s.cpTitleRow}>
            <Text style={[s.cpName, cp.status === 'COMPLETED' && s.cpNameDone]} numberOfLines={1}>
              {cp.name}
            </Text>
            {isNext && (
              <View style={s.nextPill}>
                <Text style={s.nextPillText}>NEXT</Text>
              </View>
            )}
          </View>
          <Text style={s.cpLocation}>{cp.location}</Text>
          {cp.scannedAt && (
            <Text style={s.cpTime}>
              {cp.status === 'COMPLETED' ? '✓ ' : '⏭ '}
              {new Date(cp.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Text>
          )}
          {scanError ? <Text style={s.cpScanError}>{scanError}</Text> : null}
        </View>

        {canAct ? (
          <View style={s.cpActions}>
            <TouchableOpacity
              style={s.skipBtn}
              onPress={() => onSkip(cp)}
              disabled={!!scanningId}
            >
              <Ionicons name="play-skip-forward-outline" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.scanBtn, isNext && s.scanBtnPrimary, !!scanningId && { opacity: 0.5 }]}
              onPress={() => onScan(cp)}
              disabled={!!scanningId}
            >
              <Ionicons name="qr-code-outline" size={14} color={isNext ? '#fff' : GUARD_COLORS.accent} />
              <Text style={[s.scanBtnText, isNext && s.scanBtnTextPrimary]}>Scan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[s.statusChip, { backgroundColor: meta.bg, borderColor: meta.border, borderWidth: 1 }]}>
            <Text style={[s.statusChipText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────── Main Screen ───────────────

export default function GuardPatrolScreen() {
  const { user } = useAuth();
  const [session, setSession] = useState<PatrolSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [scanningId, setScanningId] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState('00:00:00');
  const [startError, setStartError] = useState('');
  const [confirmEndVisible, setConfirmEndVisible] = useState(false);
  const [endError, setEndError] = useState('');
  const [confirmSkip, setConfirmSkip] = useState<PatrolCheckpoint | null>(null);
  const [scanErrors, setScanErrors] = useState<Map<number, string>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPatrol = useCallback(async () => {
    const data = await guardService.getPatrolSession();
    const hasSession = data.startedAt && !data.endedAt && data.checkpoints.length > 0;
    setSession(hasSession ? data : null);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadPatrol(); }, [loadPatrol]));

  // Live elapsed timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!session?.startedAt) { setElapsed('00:00:00'); return; }
    const tick = () => setElapsed(elapsedStr(session.startedAt));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.startedAt]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatrol();
    setRefreshing(false);
  };

  const handleStart = async () => {
    setStartError('');
    setStarting(true);
    try {
      const data = await guardService.startPatrolSession();
      setSession(data);
    } catch {
      setStartError('Could not start patrol session. Try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = () => {
    if (!session) return;
    setEndError('');
    setConfirmEndVisible(true);
  };

  const doEndPatrol = async () => {
    if (!session) return;
    setConfirmEndVisible(false);
    setEnding(true);
    try {
      await guardService.endPatrolSession(session.id);
      setSession(null);
    } catch {
      setEndError('Could not end patrol session. Try again.');
    } finally {
      setEnding(false);
    }
  };

  const handleScan = async (cp: PatrolCheckpoint) => {
    setScanErrors(prev => { const m = new Map(prev); m.delete(cp.id); return m; });
    setScanningId(cp.id);
    setSession(prev => prev ? {
      ...prev,
      checkpoints: prev.checkpoints.map(c =>
        c.id === cp.id ? { ...c, status: 'COMPLETED', scannedAt: new Date().toISOString() } : c
      ),
    } : prev);
    try {
      await guardService.scanCheckpoint(cp.id);
    } catch {
      setSession(prev => prev ? {
        ...prev,
        checkpoints: prev.checkpoints.map(c =>
          c.id === cp.id ? { ...c, status: 'PENDING', scannedAt: undefined } : c
        ),
      } : prev);
      setScanErrors(prev => new Map(prev).set(cp.id, 'Scan failed. Try again.'));
    } finally {
      setScanningId(null);
    }
  };

  const handleSkip = (cp: PatrolCheckpoint) => { setConfirmSkip(cp); };

  const doSkip = async () => {
    const cp = confirmSkip;
    if (!cp) return;
    setConfirmSkip(null);
    setScanErrors(prev => { const m = new Map(prev); m.delete(cp.id); return m; });
    setScanningId(cp.id);
    setSession(prev => prev ? {
      ...prev,
      checkpoints: prev.checkpoints.map(c =>
        c.id === cp.id ? { ...c, status: 'SKIPPED', scannedAt: new Date().toISOString() } : c
      ),
    } : prev);
    try {
      await guardService.skipCheckpoint(cp.id);
    } catch {
      setSession(prev => prev ? {
        ...prev,
        checkpoints: prev.checkpoints.map(c =>
          c.id === cp.id ? { ...c, status: 'PENDING', scannedAt: undefined } : c
        ),
      } : prev);
      setScanErrors(prev => new Map(prev).set(cp.id, 'Could not skip checkpoint.'));
    } finally {
      setScanningId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Patrol</Text>
        </View>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={GUARD_COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Patrol</Text>
        </View>
        {startError ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
            <Text style={s.errorBannerText}>{startError}</Text>
          </View>
        ) : null}
        <EmptyPatrol starting={starting} onStart={handleStart} />
      </SafeAreaView>
    );
  }

  const checkpoints = session.checkpoints;
  const completed = checkpoints.filter(c => c.status === 'COMPLETED').length;
  const skipped = checkpoints.filter(c => c.status === 'SKIPPED').length;
  const total = checkpoints.length;
  const progress = total > 0 ? (completed + skipped) / total : 0;
  const nextCp = checkpoints.find(c => c.status === 'PENDING');
  const allDone = checkpoints.every(c => c.status !== 'PENDING');

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Patrol</Text>
        <TouchableOpacity
          style={[s.endBtn, ending && { opacity: 0.6 }]}
          onPress={handleEnd}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={COLORS.error} />
          ) : (
            <>
              <Ionicons name="stop-circle-outline" size={14} color={COLORS.error} />
              <Text style={s.endBtnText}>End Patrol</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />
        }
      >
        {endError ? (
          <View style={s.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color={COLORS.error} />
            <Text style={s.errorBannerText}>{endError}</Text>
          </View>
        ) : null}

        {/* Timer + progress card */}
        <View style={s.timerCard}>
          <View style={s.timerRow}>
            <View style={s.timerLeft}>
              <Text style={s.timerLabel}>Patrol Duration</Text>
              <Text style={s.timerValue}>{elapsed}</Text>
              {session.guardName ? (
                <Text style={s.guardNameText}>{session.guardName}</Text>
              ) : null}
            </View>
            <View style={s.timerRight}>
              {allDone ? (
                <View style={[s.statusPill, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  <Text style={[s.statusPillText, { color: '#059669' }]}>Complete</Text>
                </View>
              ) : (
                <View style={[s.statusPill, { backgroundColor: GUARD_COLORS.accentLight }]}>
                  <View style={s.activeDot} />
                  <Text style={[s.statusPillText, { color: GUARD_COLORS.accentDark }]}>Active</Text>
                </View>
              )}
              <Text style={s.statsText}>{completed}/{total} done{skipped > 0 ? ` · ${skipped} skipped` : ''}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
              {skipped > 0 && (
                <View style={[
                  s.progressSkipped,
                  { width: `${(skipped / total) * 100}%`, left: `${(completed / total) * 100}%` },
                ]} />
              )}
            </View>
            <Text style={s.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>

        {/* Next checkpoint highlight */}
        {nextCp && (
          <TouchableOpacity
            style={s.nextCard}
            activeOpacity={0.85}
            onPress={() => handleScan(nextCp)}
            disabled={!!scanningId}
          >
            <View style={s.nextLeft}>
              <View style={s.nextIconBox}>
                <Ionicons name="navigate" size={22} color={GUARD_COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.nextLabel}>NEXT CHECKPOINT</Text>
                <Text style={s.nextName}>{nextCp.name}</Text>
                <Text style={s.nextLocation}>{nextCp.location}</Text>
              </View>
            </View>
            {scanningId === nextCp.id ? (
              <ActivityIndicator color={GUARD_COLORS.accent} />
            ) : (
              <View style={s.nextScanBtn}>
                <Ionicons name="qr-code" size={18} color="#fff" />
                <Text style={s.nextScanBtnText}>Scan</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* All done banner */}
        {allDone && (
          <View style={s.allDoneBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={s.allDoneText}>All checkpoints completed! Tap "End Patrol" to finish.</Text>
          </View>
        )}

        {/* Checkpoint list */}
        <Text style={s.sectionTitle}>Checkpoints ({total})</Text>
        <View style={s.cpList}>
          {checkpoints
            .sort((a, b) => a.order - b.order)
            .map((cp, i) => (
              <CheckpointRow
                key={cp.id}
                cp={cp}
                isNext={cp.id === nextCp?.id}
                isLast={i === checkpoints.length - 1}
                scanningId={scanningId}
                onScan={handleScan}
                onSkip={handleSkip}
                scanError={scanErrors.get(cp.id)}
              />
            ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* End patrol confirm */}
      <Modal
        visible={confirmEndVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmEndVisible(false)}
      >
        <TouchableOpacity style={s.modalOverlay} onPress={() => setConfirmEndVisible(false)} activeOpacity={1} />
        <View style={s.confirmSheet}>
          <View style={s.sheetHandle} />
          <Text style={s.confirmTitle}>End Patrol</Text>
          <Text style={s.confirmMsg}>
            {session && session.checkpoints.filter(c => c.status === 'PENDING').length > 0
              ? `${session.checkpoints.filter(c => c.status === 'PENDING').length} checkpoint(s) still pending. End patrol anyway?`
              : 'Mark this patrol round as complete?'}
          </Text>
          <TouchableOpacity style={s.confirmDangerBtn} onPress={doEndPatrol}>
            <Text style={s.confirmDangerBtnText}>End Patrol</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmEndVisible(false)}>
            <Text style={s.confirmCancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Skip checkpoint confirm */}
      <Modal
        visible={confirmSkip !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmSkip(null)}
      >
        <TouchableOpacity style={s.modalOverlay} onPress={() => setConfirmSkip(null)} activeOpacity={1} />
        <View style={s.confirmSheet}>
          <View style={s.sheetHandle} />
          <Text style={s.confirmTitle}>Skip Checkpoint</Text>
          <Text style={s.confirmMsg}>Skip "{confirmSkip?.name}"?</Text>
          <TouchableOpacity style={s.confirmDangerBtn} onPress={doSkip}>
            <Text style={s.confirmDangerBtnText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmSkip(null)}>
            <Text style={s.confirmCancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  endBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.error },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Empty state
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIconBox: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: GUARD_COLORS.accentLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc: {
    fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 28,
  },
  startPatrolBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: GUARD_COLORS.accent, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: RADIUS.full, ...SHADOWS.md,
  },
  startPatrolBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Timer card
  timerCard: {
    backgroundColor: COLORS.surface, margin: 12,
    borderRadius: RADIUS.xl, padding: 18,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  timerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  timerLeft: { gap: 2 },
  timerLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  timerValue: { fontSize: 38, fontWeight: '800', color: GUARD_COLORS.accent, letterSpacing: -1, fontFamily: 'monospace' },
  guardNameText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  timerRight: { alignItems: 'flex-end', gap: 6 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: GUARD_COLORS.accent },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  statsText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },

  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, height: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 4, overflow: 'hidden', position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: GUARD_COLORS.accent, borderRadius: 4 },
  progressSkipped: { position: 'absolute', top: 0, bottom: 0, backgroundColor: '#FCD34D', borderRadius: 4 },
  progressPct: { fontSize: 12, fontWeight: '700', color: GUARD_COLORS.accent, minWidth: 36, textAlign: 'right' },

  // Next checkpoint card
  nextCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 6,
    borderRadius: RADIUS.xl, padding: 16,
    borderWidth: 1.5, borderColor: GUARD_COLORS.accent, ...SHADOWS.sm,
  },
  nextLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  nextIconBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: GUARD_COLORS.accentLight, alignItems: 'center', justifyContent: 'center',
  },
  nextLabel: { fontSize: 9, fontWeight: '800', color: GUARD_COLORS.accent, letterSpacing: 0.8 },
  nextName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  nextLocation: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  nextScanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, ...SHADOWS.sm,
  },
  nextScanBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // All done banner
  allDoneBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECFDF5', marginHorizontal: 12, marginBottom: 6,
    padding: 12, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#6EE7B7',
  },
  allDoneText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#065F46', lineHeight: 18 },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  cpList: { paddingHorizontal: 12, paddingTop: 4 },

  // Checkpoint row
  cpRow: { flexDirection: 'row', minHeight: 68 },
  timeline: { width: 30, alignItems: 'center' },
  timelineDot: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: {
    width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 2,
  },
  cpCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 12, marginLeft: 8, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cpCardNext: {
    borderColor: GUARD_COLORS.accent, borderWidth: 1.5,
    backgroundColor: '#F0FDFE',
  },
  cpCardDone: { backgroundColor: COLORS.surfaceAlt },
  cpInfo: { flex: 1, gap: 2, marginRight: 8 },
  cpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cpName: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  cpNameDone: { color: COLORS.textMuted },
  nextPill: {
    backgroundColor: GUARD_COLORS.accentLight, borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  nextPillText: { fontSize: 8, fontWeight: '800', color: GUARD_COLORS.accentDark, letterSpacing: 0.5 },
  cpLocation: { fontSize: 11, color: COLORS.textMuted },
  cpTime: { fontSize: 10, color: '#059669', fontWeight: '600', marginTop: 1 },

  cpActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  skipBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm,
    backgroundColor: GUARD_COLORS.accentLight, borderWidth: 1, borderColor: GUARD_COLORS.accent,
  },
  scanBtnPrimary: { backgroundColor: GUARD_COLORS.accent },
  scanBtnText: { fontSize: 11, fontWeight: '700', color: GUARD_COLORS.accent },
  scanBtnTextPrimary: { color: '#fff' },

  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs },
  statusChipText: { fontSize: 10, fontWeight: '700' },

  cpScanError: { fontSize: 11, color: COLORS.error, marginTop: 3, fontWeight: '600' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: COLORS.errorLight, borderRadius: RADIUS.md,
    margin: SPACING.md, marginBottom: 0,
    padding: 10, borderWidth: 1, borderColor: COLORS.error + '40',
  },
  errorBannerText: { flex: 1, fontSize: 13, color: COLORS.error, lineHeight: 18 },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  confirmSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: 32, gap: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 8,
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  confirmMsg: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  confirmDangerBtn: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.lg, paddingVertical: 14,
    alignItems: 'center',
  },
  confirmDangerBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  confirmCancelBtn: {
    borderRadius: RADIUS.lg, paddingVertical: 14,
    alignItems: 'center', backgroundColor: '#F1F5F9',
  },
  confirmCancelBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
});
