import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';
import { visitorService, type VisitorDto } from '@/services/visitorService';
import { useAuth } from '@/hooks/useAuth';

type Mode = 'scanner' | 'manual';

interface ScanRecord {
  code: string;
  visitorName: string;
  action: string;
  time: Date;
  ok: boolean;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  EXPECTED:    { label: 'Expected',    color: '#D97706', bg: '#FEF3C7', icon: 'time' },
  APPROVED:    { label: 'Approved',    color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' },
  CHECKED_IN:  { label: 'Inside Gate', color: '#2563EB', bg: '#DBEAFE', icon: 'enter' },
  CHECKED_OUT: { label: 'Departed',    color: '#6B7280', bg: '#F3F4F6', icon: 'exit-outline' },
  DENIED:      { label: 'Denied',      color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
  REJECTED:    { label: 'Rejected',    color: '#DC2626', bg: '#FEE2E2', icon: 'ban' },
  EXPIRED:     { label: 'Expired',     color: '#9CA3AF', bg: '#F3F4F6', icon: 'hourglass' },
};

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  GUEST:    'person',
  DELIVERY: 'cube',
  CAB:      'car',
  SERVICE:  'construct',
  FAMILY:   'heart',
  COURIER:  'mail',
  VENDOR:   'storefront',
};

function fmt(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GuardScanScreen() {
  const user = useAuth(s => s.user);
  const guardName = user?.name ?? 'Guard';

  const [mode, setMode] = useState<Mode>('scanner');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<VisitorDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [history, setHistory] = useState<ScanRecord[]>([]);

  // Prevent double-scans: ignore same QR code for 3 seconds
  const lastScanned = useRef<{ code: string; at: number } | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const pushHistory = useCallback((rec: ScanRecord) => {
    setHistory(prev => [rec, ...prev].slice(0, 6));
  }, []);

  const lookup = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    // Cooldown: same code within 3s → skip
    const now = Date.now();
    if (lastScanned.current?.code === trimmed && now - lastScanned.current.at < 3000) return;
    lastScanned.current = { code: trimmed, at: now };

    setLoading(true);
    setResult(null);
    try {
      const data = await visitorService.verifyPass(trimmed);
      setResult(data);
      Vibration.vibrate(80);
    } catch (err: any) {
      Vibration.vibrate([80, 60, 80]);
      Alert.alert('Pass not found', err?.message || 'No visitor pass matches this code.');
      pushHistory({ code: trimmed, visitorName: '—', action: 'Not found', time: new Date(), ok: false });
    } finally {
      setLoading(false);
    }
  }, [pushHistory]);

  const handleManualVerify = () => lookup(manualCode);

  const handleCheckIn = async () => {
    if (!result) return;
    setActionLoading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      let photo: string | undefined;
      if (permission.granted) {
        const captured = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.55, allowsEditing: false });
        if (!captured.canceled && captured.assets[0]) {
          const asset = captured.assets[0];
          photo = asset.base64
            ? `data:image/jpeg;base64,${asset.base64}`
            : asset.uri;
        }
      }
      const updated = await visitorService.checkIn(result.id, 'Main Gate', guardName, photo);
      setResult(updated);
      pushHistory({ code: result.passCode, visitorName: result.visitorName, action: 'Checked In', time: new Date(), ok: true });
      Vibration.vibrate([80, 60, 80, 60, 120]);
    } catch (err: any) {
      Alert.alert('Check-in failed', err?.message || 'Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!result) return;
    setActionLoading(true);
    try {
      const updated = await visitorService.checkOut(result.id, 'Main Gate', guardName);
      setResult(updated);
      pushHistory({ code: result.passCode, visitorName: result.visitorName, action: 'Checked Out', time: new Date(), ok: true });
      Vibration.vibrate(120);
    } catch (err: any) {
      Alert.alert('Check-out failed', err?.message || 'Try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!result) return;
    Alert.alert('Deny Entry', `Turn away ${result.visitorName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deny', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            const updated = await visitorService.denyEntry(result.id);
            setResult(updated);
            pushHistory({ code: result.passCode, visitorName: result.visitorName, action: 'Denied', time: new Date(), ok: false });
          } catch (err: any) {
            Alert.alert('Failed', err?.message || 'Try again.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const resetScan = () => {
    setResult(null);
    setManualCode('');
    lastScanned.current = null;
  };

  const statusMeta = result ? (STATUS_META[result.status] ?? STATUS_META.EXPECTED) : null;
  const typeIcon = result ? (TYPE_ICON[result.passType?.toUpperCase()] ?? 'person') : 'person';

  // Derive allowed actions from status
  const canCheckIn = result && (result.status === 'EXPECTED' || result.status === 'APPROVED');
  const canCheckOut = result && result.status === 'CHECKED_IN';
  const canDeny = result && (result.status === 'EXPECTED' || result.status === 'APPROVED');
  const isTerminal = result && ['CHECKED_OUT', 'DENIED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(result.status);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Gate Scanner</Text>
          <Text style={s.headerSub}>Scan visitor QR pass or enter code manually</Text>
        </View>
        {result && (
          <TouchableOpacity style={s.clearBtn} onPress={resetScan} hitSlop={8}>
            <Ionicons name="refresh" size={18} color={GUARD_COLORS.accent} />
            <Text style={s.clearBtnText}>New Scan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mode toggle */}
      <View style={s.toggle}>
        <TouchableOpacity
          style={[s.toggleBtn, mode === 'scanner' && s.toggleBtnActive]}
          onPress={() => setMode('scanner')}
        >
          <Ionicons name="qr-code" size={15} color={mode === 'scanner' ? '#fff' : COLORS.textMuted} />
          <Text style={[s.toggleText, mode === 'scanner' && s.toggleTextActive]}>Camera Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, mode === 'manual' && s.toggleBtnActive]}
          onPress={() => setMode('manual')}
        >
          <Ionicons name="keypad" size={15} color={mode === 'manual' ? '#fff' : COLORS.textMuted} />
          <Text style={[s.toggleText, mode === 'manual' && s.toggleTextActive]}>Manual Entry</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Camera scanner */}
          {mode === 'scanner' && !result && (
            <View style={s.cameraBlock}>
              {permission?.granted ? (
                <View style={s.cameraWrap}>
                  <CameraView
                    style={s.camera}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => !loading && lookup(data)}
                  />
                  {/* Frame overlay */}
                  <View style={s.frameOverlay} pointerEvents="none">
                    <View style={s.frameBorder}>
                      <View style={[s.corner, s.cornerTL]} />
                      <View style={[s.corner, s.cornerTR]} />
                      <View style={[s.corner, s.cornerBL]} />
                      <View style={[s.corner, s.cornerBR]} />
                    </View>
                    <Text style={s.frameHint}>Align QR code inside the frame</Text>
                  </View>
                  {loading && (
                    <View style={s.cameraLoading}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={s.cameraLoadingText}>Looking up pass…</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={s.permissionBlock}>
                  <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
                  <Text style={s.permissionTitle}>Camera access needed</Text>
                  <Text style={s.permissionSub}>Allow camera access to scan visitor QR passes</Text>
                  <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
                    <Text style={s.permissionBtnText}>Allow Camera</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Manual entry */}
          {mode === 'manual' && !result && (
            <View style={s.manualBlock}>
              <Text style={s.manualLabel}>Pass Code or OTP</Text>
              <TextInput
                style={s.manualInput}
                placeholder="MANA-1234"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                value={manualCode}
                onChangeText={setManualCode}
                onSubmitEditing={handleManualVerify}
                returnKeyType="search"
              />
              <TouchableOpacity
                style={[s.verifyBtn, (!manualCode.trim() || loading) && { opacity: 0.5 }]}
                onPress={handleManualVerify}
                disabled={!manualCode.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="search" size={16} color="#fff" />
                      <Text style={s.verifyBtnText}>Verify Pass</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Result card */}
          {result && statusMeta && (
            <View style={[s.resultCard, { borderColor: statusMeta.color + '40' }]}>
              {/* Status banner */}
              <View style={[s.statusBanner, { backgroundColor: statusMeta.bg }]}>
                <Ionicons name={statusMeta.icon} size={16} color={statusMeta.color} />
                <Text style={[s.statusBannerText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                <Text style={s.passCodeChip}>{result.passCode}</Text>
              </View>

              {/* Visitor identity */}
              <View style={s.visitorRow}>
                <View style={[s.visitorAvatar, { backgroundColor: statusMeta.bg }]}>
                  <Ionicons name={typeIcon} size={26} color={statusMeta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.visitorName}>{result.visitorName}</Text>
                  <Text style={s.visitorType}>{result.passType} · {result.purpose}</Text>
                </View>
              </View>

              {/* Details grid */}
              <View style={s.detailGrid}>
                {result.flatNumber && (
                  <DetailCell icon="home-outline" label="Flat" value={result.flatNumber} />
                )}
                {result.vehicleNumber && (
                  <DetailCell icon="car-outline" label="Vehicle" value={result.vehicleNumber} />
                )}
                {result.residentName && (
                  <DetailCell icon="person-circle-outline" label="Resident" value={result.residentName} />
                )}
                {result.expectedAt && (
                  <DetailCell icon="time-outline" label="Expected"
                    value={new Date(result.expectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                )}
                {result.checkedInAt && (
                  <DetailCell icon="enter-outline" label="Entered"
                    value={new Date(result.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                )}
                {result.gateIn && (
                  <DetailCell icon="location-outline" label="Gate" value={result.gateIn} />
                )}
              </View>

              {/* Terminal states — info only */}
              {isTerminal && (
                <View style={s.terminalNote}>
                  <Ionicons name="information-circle-outline" size={15} color={COLORS.textMuted} />
                  <Text style={s.terminalNoteText}>
                    {result.status === 'CHECKED_OUT' && 'Visitor has already departed.'}
                    {(result.status === 'DENIED' || result.status === 'REJECTED') && 'This pass has been denied. No entry allowed.'}
                    {result.status === 'EXPIRED' && 'Pass has expired.'}
                  </Text>
                </View>
              )}

              {/* Actions */}
              {(canCheckIn || canCheckOut || canDeny) && (
                <View style={s.actionRow}>
                  {canDeny && (
                    <TouchableOpacity
                      style={s.denyBtn}
                      onPress={handleDeny}
                      disabled={actionLoading}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="close-circle" size={18} color="#DC2626" />
                      <Text style={s.denyBtnText}>Deny</Text>
                    </TouchableOpacity>
                  )}
                  {canCheckIn && (
                    <TouchableOpacity
                      style={[s.checkInBtn, actionLoading && { opacity: 0.7 }]}
                      onPress={handleCheckIn}
                      disabled={actionLoading}
                      activeOpacity={0.85}
                    >
                      {actionLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Ionicons name="camera" size={18} color="#fff" />
                            <Text style={s.checkInBtnText}>Check In + Photo</Text>
                          </>
                      }
                    </TouchableOpacity>
                  )}
                  {canCheckOut && (
                    <TouchableOpacity
                      style={[s.checkOutBtn, actionLoading && { opacity: 0.7 }]}
                      onPress={handleCheckOut}
                      disabled={actionLoading}
                      activeOpacity={0.85}
                    >
                      {actionLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Ionicons name="exit-outline" size={18} color={GUARD_COLORS.accent} />
                            <Text style={s.checkOutBtnText}>Check Out</Text>
                          </>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Session scan history */}
          {history.length > 0 && (
            <View style={s.historyBlock}>
              <Text style={s.historyTitle}>This Session</Text>
              {history.map((rec, i) => (
                <View key={i} style={s.historyRow}>
                  <View style={[s.historyDot, { backgroundColor: rec.ok ? '#059669' : '#DC2626' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyName} numberOfLines={1}>{rec.visitorName}</Text>
                    <Text style={s.historyCode}>{rec.code}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.historyAction, { color: rec.ok ? '#059669' : '#DC2626' }]}>{rec.action}</Text>
                    <Text style={s.historyTime}>{fmt(rec.time)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailCell({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={s.detailCell}>
      <Ionicons name={icon} size={13} color={COLORS.textMuted} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: GUARD_COLORS.accentLight, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: GUARD_COLORS.accent },

  toggle: {
    flexDirection: 'row', gap: 0,
    backgroundColor: COLORS.surfaceAlt, margin: SPACING.md,
    borderRadius: RADIUS.lg, padding: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: RADIUS.md,
  },
  toggleBtnActive: { backgroundColor: GUARD_COLORS.accent, ...SHADOWS.sm },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  toggleTextActive: { color: '#fff', fontWeight: '700' },

  scroll: { padding: SPACING.md, gap: SPACING.md },

  // Camera
  cameraBlock: { gap: SPACING.sm },
  cameraWrap: { borderRadius: RADIUS.xl, overflow: 'hidden', height: 300, position: 'relative' },
  camera: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  frameOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  frameBorder: {
    width: 200, height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: '#fff', borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  frameHint: {
    color: '#fff', fontSize: 12, fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
  },
  cameraLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  cameraLoadingText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Permission
  permissionBlock: {
    height: 260, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  permissionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  permissionSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  permissionBtn: {
    marginTop: 8, backgroundColor: GUARD_COLORS.accent,
    borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 24, ...SHADOWS.sm,
  },
  permissionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Manual entry
  manualBlock: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, gap: 10,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  manualLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  manualInput: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 13,
    fontSize: 17, fontWeight: '700', color: COLORS.text,
    fontFamily: 'monospace', letterSpacing: 2, textAlign: 'center',
    backgroundColor: '#F8FAFC',
  },
  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: GUARD_COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: 13, ...SHADOWS.sm,
  },
  verifyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Result card
  resultCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    overflow: 'hidden', borderWidth: 1.5,
    ...SHADOWS.md,
  },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
  },
  statusBannerText: { flex: 1, fontSize: 13, fontWeight: '800' },
  passCodeChip: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    fontFamily: 'monospace', letterSpacing: 1.5,
  },
  visitorRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  visitorAvatar: {
    width: 54, height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center',
  },
  visitorName: { fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  visitorType: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  detailGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, gap: 8,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm,
  },
  detailCell: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.sm,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  detailLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  detailValue: { fontSize: 11, fontWeight: '700', color: COLORS.text, maxWidth: 100 },
  terminalNote: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
  },
  terminalNoteText: { flex: 1, fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  actionRow: {
    flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  denyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 13, borderRadius: RADIUS.md,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
  },
  denyBtnText: { fontSize: 14, fontWeight: '800', color: '#DC2626' },
  checkInBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: RADIUS.md, backgroundColor: '#059669', ...SHADOWS.sm,
  },
  checkInBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  checkOutBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: GUARD_COLORS.accent,
  },
  checkOutBtnText: { fontSize: 14, fontWeight: '800', color: GUARD_COLORS.accent },

  // History
  historyBlock: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, gap: 10,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  historyTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  historyCode: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 1 },
  historyAction: { fontSize: 12, fontWeight: '700' },
  historyTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
});
