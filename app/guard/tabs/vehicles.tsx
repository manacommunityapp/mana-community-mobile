import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, RefreshControl, ActivityIndicator, Modal, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { watchlistService, type WatchlistEntry } from '@/services/watchlistService';
import api from '@/services/apiClient';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type EntryDirection = 'ENTRY' | 'EXIT';
type CheckState = 'idle' | 'checking' | 'clear' | 'flagged';

interface VehicleLog {
  id: number;
  plateNumber: string;
  direction: EntryDirection;
  vehicleType?: string;
  driverName?: string;
  flatNumber?: string;
  purpose?: string;
  loggedAt: string;
}

const MOCK_LOGS: VehicleLog[] = [
  { id: 1, plateNumber: 'KA-04-MN-7788', direction: 'ENTRY', vehicleType: 'CAR', driverName: 'Rajesh Kumar', flatNumber: '302', purpose: 'Resident', loggedAt: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 2, plateNumber: 'MH-12-AB-3344', direction: 'ENTRY', vehicleType: 'CAR', driverName: 'Delivery Agent', purpose: 'Delivery', loggedAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 3, plateNumber: 'KA-04-MN-7788', direction: 'EXIT', vehicleType: 'CAR', driverName: 'Rajesh Kumar', flatNumber: '302', loggedAt: new Date(Date.now() - 5 * 60000).toISOString() },
];

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function normalisePlate(raw: string) {
  return raw.toUpperCase().replace(/\s+/g, '-').trim();
}

// ── Segmented tab ─────────────────────────────────────────────────────────────

function SegTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[st.seg, active && st.segActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[st.segText, active && st.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Log row ───────────────────────────────────────────────────────────────────

function LogRow({ item, isLast }: { item: VehicleLog; isLast: boolean }) {
  const isEntry = item.direction === 'ENTRY';
  return (
    <View style={[st.logRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={[st.logDirBadge, { backgroundColor: isEntry ? '#D1FAE5' : '#FEE2E2' }]}>
        <Ionicons
          name={isEntry ? 'enter-outline' : 'exit-outline'}
          size={16}
          color={isEntry ? '#059669' : '#DC2626'}
        />
      </View>
      <View style={st.logBody}>
        <Text style={st.logPlate}>{item.plateNumber}</Text>
        <Text style={st.logSub} numberOfLines={1}>
          {item.driverName ? `${item.driverName}  ·  ` : ''}
          {item.flatNumber ? `Flat ${item.flatNumber}  ·  ` : ''}
          {item.purpose ?? item.vehicleType ?? ''}
        </Text>
      </View>
      <View style={st.logRight}>
        <View style={[st.dirPill, { backgroundColor: isEntry ? '#D1FAE5' : '#FEE2E2' }]}>
          <Text style={[st.dirPillText, { color: isEntry ? '#059669' : '#DC2626' }]}>
            {isEntry ? 'IN' : 'OUT'}
          </Text>
        </View>
        <Text style={st.logTime}>{timeAgo(item.loggedAt)}</Text>
      </View>
    </View>
  );
}

// ── Log entry modal ───────────────────────────────────────────────────────────

interface LogModalProps {
  visible: boolean;
  direction: EntryDirection;
  plate: string;
  checkState: CheckState;
  flaggedEntries: WatchlistEntry[];
  onClose: () => void;
  onSubmit: (data: { driverName: string; flatNumber: string; purpose: string }) => Promise<void>;
}

function LogModal({ visible, direction, plate, checkState, flaggedEntries, onClose, onSubmit }: LogModalProps) {
  const [driverName, setDriverName] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit({ driverName, flatNumber, purpose });
      setDriverName(''); setFlatNumber(''); setPurpose('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={st.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={st.modalSheet}>
          <View style={st.modalHandle} />
          <View style={st.modalHeader}>
            <Ionicons
              name={direction === 'ENTRY' ? 'enter' : 'exit'}
              size={20}
              color={direction === 'ENTRY' ? '#059669' : '#DC2626'}
            />
            <Text style={st.modalTitle}>Log Vehicle {direction === 'ENTRY' ? 'Entry' : 'Exit'}</Text>
          </View>

          {/* Plate display */}
          <View style={[
            st.plateBanner,
            checkState === 'clear' && st.plateBannerClear,
            checkState === 'flagged' && st.plateBannerFlagged,
          ]}>
            <Text style={[
              st.plateBannerText,
              checkState === 'clear' && { color: '#059669' },
              checkState === 'flagged' && { color: '#DC2626' },
            ]}>
              {plate}
            </Text>
            <View style={[
              st.checkBadge,
              checkState === 'clear' && { backgroundColor: '#D1FAE5' },
              checkState === 'flagged' && { backgroundColor: '#FEE2E2' },
            ]}>
              <Ionicons
                name={checkState === 'clear' ? 'checkmark-circle' : checkState === 'flagged' ? 'alert-circle' : 'ellipse-outline'}
                size={14}
                color={checkState === 'clear' ? '#059669' : checkState === 'flagged' ? '#DC2626' : COLORS.textMuted}
              />
              <Text style={[
                st.checkBadgeText,
                checkState === 'clear' && { color: '#059669' },
                checkState === 'flagged' && { color: '#DC2626' },
              ]}>
                {checkState === 'clear' ? 'Clear' : checkState === 'flagged' ? `FLAGGED (${flaggedEntries.length})` : 'Not checked'}
              </Text>
            </View>
          </View>

          {checkState === 'flagged' && flaggedEntries.map(e => (
            <View key={e.id} style={st.flagAlert}>
              <Ionicons name="warning" size={14} color="#DC2626" />
              <Text style={st.flagAlertText} numberOfLines={2}>{e.reason}</Text>
              <View style={[st.sevPill, { backgroundColor: e.severity === 'CRITICAL' ? '#FEE2E2' : '#FFEDD5' }]}>
                <Text style={[st.sevPillText, { color: e.severity === 'CRITICAL' ? '#DC2626' : '#EA580C' }]}>{e.severity}</Text>
              </View>
            </View>
          ))}

          <View style={st.modalFields}>
            <View style={st.field}>
              <Text style={st.fieldLabel}>Driver / Visitor Name</Text>
              <TextInput
                style={st.fieldInput}
                placeholder="Enter name"
                placeholderTextColor={COLORS.textMuted}
                value={driverName}
                onChangeText={setDriverName}
              />
            </View>
            <View style={st.field}>
              <Text style={st.fieldLabel}>Flat Number (if resident)</Text>
              <TextInput
                style={st.fieldInput}
                placeholder="e.g. A-1204"
                placeholderTextColor={COLORS.textMuted}
                value={flatNumber}
                onChangeText={setFlatNumber}
                autoCapitalize="characters"
              />
            </View>
            <View style={st.field}>
              <Text style={st.fieldLabel}>Purpose</Text>
              <TextInput
                style={st.fieldInput}
                placeholder="e.g. Resident, Delivery, Guest"
                placeholderTextColor={COLORS.textMuted}
                value={purpose}
                onChangeText={setPurpose}
              />
            </View>
          </View>

          <View style={st.modalActions}>
            <TouchableOpacity style={st.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={st.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                st.submitBtn,
                direction === 'EXIT' && st.submitBtnExit,
                saving && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={direction === 'ENTRY' ? 'enter' : 'exit'} size={16} color="#fff" />
                  <Text style={st.submitBtnText}>Log {direction === 'ENTRY' ? 'Entry' : 'Exit'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function GuardVehiclesScreen() {
  const [activeTab, setActiveTab] = useState<EntryDirection>('ENTRY');
  const [plate, setPlate] = useState('');
  const [checkState, setCheckState] = useState<CheckState>('idle');
  const [flaggedEntries, setFlaggedEntries] = useState<WatchlistEntry[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>(MOCK_LOGS);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plateInputRef = useRef<any>(null);

  const loadLogs = useCallback(async () => {
    try {
      const res = await api.get<VehicleLog[]>('/vehicles/entry-log');
      if (res.data?.length) setLogs(res.data);
    } catch {
      // keep mock
    }
  }, []);

  useFocusEffect(useCallback(() => { loadLogs(); }, [loadLogs]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  }, [loadLogs]);

  const handleCheck = useCallback(async () => {
    const normalized = normalisePlate(plate);
    if (!normalized) return;
    setPlate(normalized);
    setCheckState('checking');
    try {
      // Check community watchlist/blacklist
      const [watchlistMatches, blacklistMatches] = await Promise.allSettled([
        watchlistService.checkWatchlist(normalized),
        api.get<{ flagged: boolean; reason?: string }[]>('/vehicles/blacklist/check', { params: { plate: normalized } }),
      ]);

      const wlHits = watchlistMatches.status === 'fulfilled' ? watchlistMatches.value : [];
      const blHits = blacklistMatches.status === 'fulfilled' ? (blacklistMatches.value.data ?? []) : [];

      // Combine: convert blacklist hits to WatchlistEntry shape
      const blAsEntries: WatchlistEntry[] = (blHits as { flagged: boolean; reason?: string }[])
        .filter(h => h.flagged)
        .map((h, i) => ({ id: -(i + 1), name: normalized, vehicleNumber: normalized, reason: h.reason ?? 'On vehicle blacklist', severity: 'HIGH', status: 'ACTIVE' }));

      const allFlagged = [...wlHits.filter(e => e.vehicleNumber?.includes(normalized.replace(/-/g, '').toLowerCase()) || e.vehicleNumber === normalized), ...blAsEntries];

      if (allFlagged.length > 0) {
        setFlaggedEntries(allFlagged);
        setCheckState('flagged');
      } else {
        setFlaggedEntries([]);
        setCheckState('clear');
      }
    } catch {
      setFlaggedEntries([]);
      setCheckState('clear');
    }
  }, [plate]);

  const handleLogSubmit = async (data: { driverName: string; flatNumber: string; purpose: string }) => {
    const newLog: VehicleLog = {
      id: Date.now(),
      plateNumber: plate,
      direction: activeTab,
      driverName: data.driverName || undefined,
      flatNumber: data.flatNumber || undefined,
      purpose: data.purpose || undefined,
      loggedAt: new Date().toISOString(),
    };
    try {
      await api.post('/vehicles/entry-log', {
        plateNumber: plate,
        direction: activeTab,
        ...data,
        flagged: checkState === 'flagged',
      });
    } catch {
      // optimistic update below
    }
    setLogs(prev => [newLog, ...prev]);
    setPlate('');
    setCheckState('idle');
    setFlaggedEntries([]);
    setModalVisible(false);
  };

  const filteredLogs = logs.filter(l => l.direction === activeTab).slice(0, 20);

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <View style={st.headerIconWrap}>
            <Ionicons name="car" size={20} color={GUARD_COLORS.accent} />
          </View>
          <View>
            <Text style={st.headerTitle}>Vehicle Gate</Text>
            <Text style={st.headerSub}>Entry / Exit log &amp; blacklist check</Text>
          </View>
        </View>
      </View>

      {/* ── Entry / Exit tab ── */}
      <View style={st.segRow}>
        <SegTab label="Entry" active={activeTab === 'ENTRY'} onPress={() => { setActiveTab('ENTRY'); setCheckState('idle'); }} />
        <SegTab label="Exit"  active={activeTab === 'EXIT'}  onPress={() => { setActiveTab('EXIT');  setCheckState('idle'); }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GUARD_COLORS.accent} />}
        contentContainerStyle={st.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Plate input + check ── */}
        <View style={st.checkCard}>
          <Text style={st.checkCardTitle}>
            <Ionicons name={activeTab === 'ENTRY' ? 'enter-outline' : 'exit-outline'} size={14} /> Vehicle {activeTab === 'ENTRY' ? 'Entry' : 'Exit'} Check
          </Text>
          <View style={st.inputRow}>
            <TextInput
              ref={plateInputRef}
              style={st.plateInput}
              placeholder="KA-04-XX-0000"
              placeholderTextColor={COLORS.textMuted}
              value={plate}
              onChangeText={v => { setPlate(v.toUpperCase()); setCheckState('idle'); }}
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={handleCheck}
            />

            <TouchableOpacity
              style={[st.checkBtn, (!plate.trim() || checkState === 'checking') && { opacity: 0.6 }]}
              onPress={handleCheck}
              disabled={!plate.trim() || checkState === 'checking'}
            >
              {checkState === 'checking' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={st.checkBtnText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Check result banner */}
          {checkState === 'clear' && (
            <View style={st.resultBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={[st.resultText, { color: '#059669' }]}>Plate is clear — not on any blacklist</Text>
            </View>
          )}
          {checkState === 'flagged' && (
            <View style={[st.resultBanner, st.resultBannerFlagged]}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={[st.resultText, { color: '#DC2626' }]}>
                FLAGGED — {flaggedEntries.length} blacklist match{flaggedEntries.length > 1 ? 'es' : ''}
              </Text>
            </View>
          )}
          {flaggedEntries.map(e => (
            <View key={e.id} style={st.flagRow}>
              <Ionicons name="warning-outline" size={13} color="#DC2626" />
              <Text style={st.flagRowText} numberOfLines={2}>{e.reason}</Text>
              <View style={[st.sevPill, { backgroundColor: e.severity === 'CRITICAL' ? '#FEE2E2' : '#FFEDD5' }]}>
                <Text style={[st.sevPillText, { color: e.severity === 'CRITICAL' ? '#DC2626' : '#EA580C' }]}>{e.severity}</Text>
              </View>
            </View>
          ))}

          {/* Action button */}
          {(checkState === 'clear' || checkState === 'flagged') && (
            <TouchableOpacity
              style={[st.logBtn, activeTab === 'EXIT' && st.logBtnExit, checkState === 'flagged' && st.logBtnFlagged]}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name={activeTab === 'ENTRY' ? 'enter' : 'exit'} size={16} color="#fff" />
              <Text style={st.logBtnText}>
                {checkState === 'flagged' ? 'Log Entry with Warning' : `Log ${activeTab === 'ENTRY' ? 'Entry' : 'Exit'}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Recent log ── */}
        <View style={st.sectionRow}>
          <Text style={st.sectionTitle}>Recent {activeTab === 'ENTRY' ? 'Entries' : 'Exits'}</Text>
          <Text style={st.sectionCount}>{filteredLogs.length}</Text>
        </View>

        <View style={st.listCard}>
          {filteredLogs.length === 0 ? (
            <View style={st.emptyRow}>
              <Ionicons name="car-outline" size={24} color={COLORS.textMuted} />
              <Text style={st.emptyText}>No {activeTab === 'ENTRY' ? 'entries' : 'exits'} logged yet</Text>
            </View>
          ) : filteredLogs.map((log, idx) => (
            <LogRow key={log.id} item={log} isLast={idx === filteredLogs.length - 1} />
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <LogModal
        visible={modalVisible}
        direction={activeTab}
        plate={plate}
        checkState={checkState}
        flaggedEntries={flaggedEntries}
        onClose={() => setModalVisible(false)}
        onSubmit={handleLogSubmit}
      />
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconWrap: {
    width: 38, height: 38, borderRadius: RADIUS.md,
    backgroundColor: GUARD_COLORS.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  segRow: {
    flexDirection: 'row', gap: 0,
    marginHorizontal: SPACING.md, marginTop: 14, marginBottom: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg, padding: 4,
    ...SHADOWS.sm,
  },
  seg: {
    flex: 1, paddingVertical: 9, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  segActive: { backgroundColor: COLORS.surface, ...SHADOWS.sm },
  segText: { fontSize: 14, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textMuted },
  segTextActive: { color: GUARD_COLORS.accent },

  checkCard: {
    marginHorizontal: SPACING.md, marginTop: 14,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 16,
    ...SHADOWS.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  checkCardTitle: { fontSize: 13, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  plateInput: {
    flex: 1, height: 46, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, fontSize: 15,
    fontFamily: 'DMSans-Bold', fontWeight: '700',
    color: COLORS.text, backgroundColor: COLORS.background,
    letterSpacing: 1.5,
  },
  checkBtn: {
    height: 46, paddingHorizontal: 18, borderRadius: RADIUS.md,
    backgroundColor: GUARD_COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  checkBtnText: { color: '#fff', fontFamily: 'DMSans-Bold', fontWeight: '700', fontSize: 14 },

  resultBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, padding: 10, borderRadius: RADIUS.md,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
  },
  resultBannerFlagged: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  resultText: { flex: 1, fontSize: 13, fontFamily: 'DMSans-SemiBold', fontWeight: '600' },

  flagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6, paddingHorizontal: 4,
  },
  flagRowText: { flex: 1, fontSize: 12, color: '#DC2626', fontFamily: 'DMSans-Regular' },

  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, height: 46, borderRadius: RADIUS.md,
    backgroundColor: '#059669', ...SHADOWS.sm,
  },
  logBtnExit: { backgroundColor: '#DC2626' },
  logBtnFlagged: { backgroundColor: '#B45309' },
  logBtnText: { color: '#fff', fontFamily: 'DMSans-Bold', fontWeight: '700', fontSize: 14 },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: SPACING.md, marginTop: 20, marginBottom: 8,
  },
  sectionTitle: { fontSize: 15, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text },
  sectionCount: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  listCard: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  logDirBadge: {
    width: 34, height: 34, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  logBody: { flex: 1 },
  logPlate: { fontSize: 14, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text, letterSpacing: 0.5 },
  logSub: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  logRight: { alignItems: 'flex-end', gap: 4 },
  dirPill: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  dirPillText: { fontSize: 11, fontFamily: 'DMSans-Bold', fontWeight: '700' },
  logTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 20, justifyContent: 'center',
  },
  emptyText: { color: COLORS.textMuted, fontSize: 14, fontFamily: 'DMSans-Regular' },

  // ── Modal ──
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...SHADOWS.lg,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  modalTitle: { fontSize: 17, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text },
  plateBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12,
  },
  plateBannerClear: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  plateBannerFlagged: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  plateBannerText: { fontSize: 16, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text, letterSpacing: 1 },
  checkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  checkBadgeText: { fontSize: 11, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textMuted },
  flagAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 8, borderRadius: RADIUS.md,
    backgroundColor: '#FEF2F2', marginBottom: 8,
  },
  flagAlertText: { flex: 1, fontSize: 12, color: '#DC2626', fontFamily: 'DMSans-Regular' },

  modalFields: { gap: 12, marginBottom: 16 },
  field: {},
  fieldLabel: { fontSize: 12, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  fieldInput: {
    height: 44, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 12, fontSize: 14,
    fontFamily: 'DMSans-Regular', color: COLORS.text,
    backgroundColor: COLORS.background,
  },

  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.textSecondary },
  submitBtn: {
    flex: 2, height: 46, borderRadius: RADIUS.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', ...SHADOWS.sm,
  },
  submitBtnExit: { backgroundColor: '#DC2626' },
  submitBtnText: { color: '#fff', fontFamily: 'DMSans-Bold', fontWeight: '700', fontSize: 14 },

  sevPill: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: RADIUS.full,
  },
  sevPillText: { fontSize: 10, fontFamily: 'DMSans-Bold', fontWeight: '700' },
});
