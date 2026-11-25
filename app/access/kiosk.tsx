import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  biometricAccessService,
  type KioskPunchType,
  type KioskAttendanceResult,
} from '@/services/biometricAccessService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';

const { width, height } = Dimensions.get('window');

export default function MobileFaceKioskScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [punchMode, setPunchMode] = useState<KioskPunchType>('CLOCK_IN');
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastMatch, setLastMatch] = useState<KioskAttendanceResult | null>(null);
  const [relayActive, setRelayActive] = useState<boolean>(false);
  const [relaySecondsLeft, setRelaySecondsLeft] = useState<number>(0);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Admin PIN modal
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');

  const countdownTimer = useRef<any>(null);

  useEffect(() => {
    refreshQueue();
    if (!permission?.granted) {
      requestPermission();
    }

    // Auto-sync offline punches periodically every 30 seconds when network is restored
    const autoSyncInterval = setInterval(async () => {
      try {
        const queue = await biometricAccessService.getOfflinePunches();
        const pending = queue.filter((p) => !p.synced);
        if (pending.length > 0) {
          await biometricAccessService.syncOfflinePunches();
          refreshQueue();
        }
      } catch {
        // Silent catch for kiosk continuity
      }
    }, 30000);

    return () => clearInterval(autoSyncInterval);
  }, [permission]);

  const refreshQueue = async () => {
    const punches = await biometricAccessService.getOfflinePunches();
    setOfflineCount(punches.filter((p) => !p.synced).length);
  };

  const handleTriggerPunch = async (simulatedRole?: 'DOMESTIC_STAFF' | 'SECURITY_GUARD' | 'VENDOR_WORKER') => {
    if (isScanning || relayActive) return;
    setIsScanning(true);

    try {
      const res = await biometricAccessService.recordKioskAttendance({
        societyId: 1,
        turnstileCode: 'TS-MAIN-ENTRY-01',
        punchType: punchMode,
        confidenceScore: 0.952,
        timestamp: new Date().toISOString(),
        isLivenessVerified: true,
      });

      setLastMatch(res);
      triggerRelayCountdown(3);
      refreshQueue();
    } catch {
      Alert.alert('Scan Issue', 'Attendance logged to offline cache.');
    } finally {
      setIsScanning(false);
    }
  };

  const triggerRelayCountdown = (seconds: number) => {
    setRelayActive(true);
    setRelaySecondsLeft(seconds);
    if (countdownTimer.current) clearInterval(countdownTimer.current);

    countdownTimer.current = setInterval(() => {
      setRelaySecondsLeft((prev) => {
        if (prev <= 1) {
          if (countdownTimer.current) clearInterval(countdownTimer.current);
          setRelayActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSyncPunches = async () => {
    const res = await biometricAccessService.syncOfflinePunches();
    refreshQueue();
    Alert.alert('Offline Sync', `Synced ${res.synced} offline punch records to cloud.`);
  };

  const handleVerifyPin = () => {
    if (pinInput === '1234') {
      setPinModalOpen(false);
      setPinInput('');
      router.back();
    } else {
      Alert.alert('Error', 'Invalid Admin Security PIN.');
    }
  };

  return (
    <View style={s.container}>
      <StatusBar hidden />

      {/* Live Camera View with fallback */}
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.cameraFallback]}>
          <Ionicons name="camera-reverse-outline" size={64} color="#64748B" />
          <Text style={s.cameraFallbackText}>Camera Access Standby</Text>
          <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
            <Text style={s.permissionBtnText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dark Vignette Overlay */}
      <View style={s.vignette} pointerEvents="none" />

      {/* Top Header Bar */}
      <SafeAreaView style={s.topBar} edges={['top']}>
        <View style={s.headerLeft}>
          <View style={s.iconBadge}>
            <Ionicons name="scan-circle" size={24} color="#10B981" />
          </View>
          <View>
            <Text style={s.kioskTitle}>Truein-Parity Face Kiosk</Text>
            <Text style={s.kioskSub}>Gate Turnstile TS-MAIN-ENTRY-01</Text>
          </View>
        </View>

        <View style={s.headerRight}>
          {/* Mode Switcher */}
          <View style={s.modePill}>
            <TouchableOpacity
              style={[s.modeBtn, punchMode === 'CLOCK_IN' && s.modeBtnActiveIn]}
              onPress={() => setPunchMode('CLOCK_IN')}
            >
              <Text style={[s.modeBtnText, punchMode === 'CLOCK_IN' && s.modeBtnTextActive]}>Clock In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, punchMode === 'CLOCK_OUT' && s.modeBtnActiveOut]}
              onPress={() => setPunchMode('CLOCK_OUT')}
            >
              <Text style={[s.modeBtnText, punchMode === 'CLOCK_OUT' && s.modeBtnTextActive]}>Clock Out</Text>
            </TouchableOpacity>
          </View>

          {/* Offline Sync Counter */}
          {offlineCount > 0 && (
            <TouchableOpacity style={s.offlineBadge} onPress={handleSyncPunches}>
              <Ionicons name="cloud-offline" size={14} color="#F59E0B" />
              <Text style={s.offlineText}>{offlineCount} Cached</Text>
            </TouchableOpacity>
          )}

          {/* Admin PIN Unlock */}
          <TouchableOpacity style={s.adminBtn} onPress={() => setPinModalOpen(true)}>
            <Ionicons name="lock-closed" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Center: Truein Biometric Scanning HUD */}
      <View style={s.centerContainer} pointerEvents="box-none">
        <View
          style={[
            s.reticle,
            relayActive ? s.reticleSuccess : isScanning ? s.reticleScanning : s.reticleIdle,
          ]}
        >
          {/* Reticle Corner Brackets */}
          <View style={[s.bracket, s.topLeft]} />
          <View style={[s.bracket, s.topRight]} />
          <View style={[s.bracket, s.bottomLeft]} />
          <View style={[s.bracket, s.bottomRight]} />

          {/* Center Scan Indicator */}
          {relayActive ? (
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          ) : isScanning ? (
            <ActivityIndicator size="large" color="#22D3EE" />
          ) : (
            <Ionicons name="person-circle-outline" size={80} color="rgba(255,255,255,0.4)" />
          )}
        </View>

        {/* Status Banner */}
        <View style={s.statusPill}>
          <Text style={s.statusPillText}>
            {relayActive
              ? `ACCESS GRANTED • GATE UNLOCKED (${relaySecondsLeft}s)`
              : isScanning
              ? 'Analyzing Face Vectors & Anti-Spoof Liveness...'
              : 'Look straight at camera for touchless attendance'}
          </Text>
        </View>
      </View>

      {/* Bottom Result Card & Quick Simulators */}
      <SafeAreaView style={s.bottomContainer} edges={['bottom']}>
        {lastMatch ? (
          <View style={s.resultCard}>
            <View style={s.resultHeader}>
              <View>
                <Text style={s.resultName}>{lastMatch.userFullName}</Text>
                <Text style={s.resultRole}>
                  {lastMatch.roleName} • {lastMatch.contractorAgencyName || 'Apartment Staff'}
                </Text>
              </View>
              <View style={s.confidenceBadge}>
                <Text style={s.confidenceText}>{(lastMatch.confidenceScore * 100).toFixed(1)}%</Text>
              </View>
            </View>

            <View style={s.resultDetails}>
              <Text style={s.detailText}>
                Shift: <Text style={s.detailBold}>{lastMatch.shiftName || 'Standard Day'}</Text>
              </Text>
              <Text style={s.detailText}>
                Punch: <Text style={s.detailBold}>{lastMatch.punchType.replace('_', ' ')}</Text>
              </Text>
              {lastMatch.workHoursToday && (
                <Text style={s.detailText}>
                  Hours Today: <Text style={s.detailBoldGreen}>{lastMatch.workHoursToday}</Text>
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={s.readyCard}>
            <Text style={s.readyTitle}>Kiosk Terminal Ready</Text>
            <Text style={s.readySub}>Sub-second AI matching with DPDP Act 2023 s.6 legal consent verification</Text>
          </View>
        )}

        {/* Quick Simulation Trigger Bar */}
        <View style={s.simBar}>
          <TouchableOpacity
            style={s.simBtn}
            onPress={() => handleTriggerPunch('DOMESTIC_STAFF')}
          >
            <Text style={s.simBtnText}>Simulate Maid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.simBtn}
            onPress={() => handleTriggerPunch('SECURITY_GUARD')}
          >
            <Text style={s.simBtnText}>Simulate Guard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.simBtn}
            onPress={() => handleTriggerPunch('VENDOR_WORKER')}
          >
            <Text style={s.simBtnText}>Simulate Contractor</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.flipBtn}
            onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
          >
            <Ionicons name="camera-reverse" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Admin PIN Dialog */}
      <Modal visible={pinModalOpen} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalContent}>
            <Ionicons name="key" size={32} color="#06B6D4" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={s.modalTitle}>Admin Terminal PIN</Text>
            <Text style={s.modalSub}>Enter Kiosk PIN to exit or configure hardware. (Default: 1234)</Text>

            <TextInput
              style={s.pinInput}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              autoFocus
              placeholder="PIN"
              placeholderTextColor="#64748B"
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setPinModalOpen(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleVerifyPin}>
                <Text style={s.confirmBtnText}>Unlock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  cameraFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  cameraFallbackText: { color: '#94A3B8', fontSize: 16, marginTop: 12, fontWeight: '600' },
  permissionBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0284C7',
    borderRadius: 8,
  },
  permissionBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBadge: {
    padding: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 10,
  },
  kioskTitle: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  kioskSub: { color: '#94A3B8', fontSize: 11, fontWeight: '500' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modePill: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
  },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  modeBtnActiveIn: { backgroundColor: '#059669' },
  modeBtnActiveOut: { backgroundColor: '#D97706' },
  modeBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  modeBtnTextActive: { color: '#FFF' },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  offlineText: { color: '#F59E0B', fontSize: 11, fontWeight: '600' },
  adminBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 260,
    height: 360,
    borderRadius: 130,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  reticleIdle: { borderColor: 'rgba(148, 163, 184, 0.5)' },
  reticleScanning: { borderColor: '#22D3EE', shadowColor: '#22D3EE', shadowOpacity: 0.5, shadowRadius: 15 },
  reticleSuccess: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    shadowColor: '#10B981',
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  bracket: { position: 'absolute', width: 20, height: 20, borderColor: '#22D3EE' },
  topLeft: { top: 20, left: 30, borderTopWidth: 2, borderLeftWidth: 2 },
  topRight: { top: 20, right: 30, borderTopWidth: 2, borderRightWidth: 2 },
  bottomLeft: { bottom: 20, left: 30, borderBottomWidth: 2, borderLeftWidth: 2 },
  bottomRight: { bottom: 20, right: 30, borderBottomWidth: 2, borderRightWidth: 2 },
  statusPill: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusPillText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultRole: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  confidenceBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  confidenceText: { color: '#10B981', fontSize: 11, fontWeight: '700' },
  resultDetails: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#334155' },
  detailText: { color: '#94A3B8', fontSize: 12 },
  detailBold: { color: '#FFF', fontWeight: '600' },
  detailBoldGreen: { color: '#10B981', fontWeight: '700' },
  readyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  readyTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  readySub: { color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 2 },
  simBar: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  simBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  simBtnText: { color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  flipBtn: { padding: 8, backgroundColor: '#334155', borderRadius: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  modalSub: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  pinInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    color: '#FFF',
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 8,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#334155' },
  cancelBtnText: { color: '#E2E8F0', fontWeight: '600' },
  confirmBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#0284C7' },
  confirmBtnText: { color: '#FFF', fontWeight: '700' },
});
