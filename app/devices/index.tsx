import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Alert,
  Modal, TextInput, ScrollView, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/config';
import {
  smartDeviceService,
  type SmartDevice,
  type DeviceType,
  type VisitorOtpResponse,
} from '@/services/smartDeviceService';

const DEVICE_META: Record<DeviceType, { emoji: string; label: string; action: string }> = {
  FLAT_DOOR:       { emoji: '🔐', label: 'Door Lock',       action: 'Unlock' },
  MAIN_GATE:       { emoji: '🚧', label: 'Main Gate',        action: 'Open' },
  LOBBY_BARRIER:   { emoji: '🏢', label: 'Lobby Barrier',    action: 'Open' },
  PARKING_BARRIER: { emoji: '🚗', label: 'Parking Barrier',  action: 'Open' },
  ELEVATOR:        { emoji: '🛗', label: 'Elevator',         action: 'Call' },
};

const HOLD_DURATION = 3000;

function HoldToConfirmButton({ label, disabled, onConfirmed }: {
  label: string;
  disabled: boolean;
  onConfirmed: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const [holding, setHolding] = useState(false);

  const startHold = () => {
    if (disabled) return;
    setHolding(true);
    animation.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION,
      useNativeDriver: false,
    });
    animation.current.start(({ finished }) => {
      if (finished) {
        setHolding(false);
        progress.setValue(0);
        onConfirmed();
      }
    });
  };

  const endHold = () => {
    animation.current?.stop();
    setHolding(false);
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <TouchableOpacity
      style={[styles.holdBtn, disabled && styles.holdBtnDisabled]}
      onPressIn={startHold}
      onPressOut={endHold}
      activeOpacity={1}
      disabled={disabled}
    >
      <Animated.View style={[styles.holdProgress, { width }]} />
      <Text style={styles.holdBtnText}>
        {holding ? 'Hold…' : label}
      </Text>
    </TouchableOpacity>
  );
}

function OtpModal({ device, onClose }: { device: SmartDevice; onClose: () => void }) {
  const [visitorName, setVisitorName] = useState('');
  const [validMinutes, setValidMinutes] = useState(30);
  const [otpResult, setOtpResult] = useState<VisitorOtpResponse | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const otpMutation = useMutation({
    mutationFn: () => smartDeviceService.issueVisitorOtp(device.id, visitorName, validMinutes),
    onSuccess: (result) => {
      setOtpResult(result);
      setCountdown(validMinutes * 60);
    },
  });

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown > 0]);

  const fmtCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const copyOtp = () => {
    if (otpResult?.otp) {
      Clipboard.setString(otpResult.otp);
    }
  };

  const DURATION_OPTIONS = [15, 30, 60, 120] as const;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.otpModal}>
        <View style={styles.otpHeader}>
          <Text style={styles.otpTitle}>Visitor OTP</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.otpBody}>
          <Text style={styles.otpDeviceName}>{device.deviceName}</Text>

          {!otpResult ? (
            <>
              <Text style={styles.otpLabel}>Visitor Name *</Text>
              <TextInput
                style={styles.otpInput}
                value={visitorName}
                onChangeText={setVisitorName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.otpLabel}>Valid For</Text>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationChip, validMinutes === d && styles.durationChipActive]}
                    onPress={() => setValidMinutes(d)}
                  >
                    <Text style={[styles.durationChipText, validMinutes === d && styles.durationChipTextActive]}>
                      {d < 60 ? `${d}m` : `${d / 60}h`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.generateBtn, (!visitorName.trim() || otpMutation.isPending) && styles.generateBtnDisabled]}
                onPress={() => otpMutation.mutate()}
                disabled={!visitorName.trim() || otpMutation.isPending}
              >
                {otpMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.generateBtnText}>Generate OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.otpDisplay}>
                <Text style={styles.otpCode}>{otpResult.otp}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={copyOtp}>
                  <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.otpVisitorLabel}>For: {otpResult.visitorName}</Text>
              <View style={styles.countdownRow}>
                <Ionicons name="time-outline" size={16} color={countdown > 60 ? COLORS.success : COLORS.error} />
                <Text style={[styles.countdownText, { color: countdown > 60 ? COLORS.success : COLORS.error }]}>
                  {countdown > 0 ? `Expires in ${fmtCountdown(countdown)}` : 'Expired'}
                </Text>
              </View>
              <TouchableOpacity style={styles.generateBtn} onPress={() => { setOtpResult(null); setVisitorName(''); }}>
                <Text style={styles.generateBtnText}>Generate New OTP</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function DeviceRow({ device }: { device: SmartDevice }) {
  const qc = useQueryClient();
  const [showOtp, setShowOtp] = useState(false);
  const meta = DEVICE_META[device.deviceType] ?? { emoji: '🔒', label: 'Device', action: 'Control' };
  const isOnline = device.status === 'ONLINE';

  const controlMutation = useMutation({
    mutationFn: () => smartDeviceService.control(device.id, meta.action === 'Unlock' ? 'UNLOCK' : 'OPEN'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['smart-devices'] });
      Alert.alert(res.success ? 'Success' : 'Failed', res.message || (res.success ? `${device.deviceName} ${meta.action.toLowerCase()}ed` : 'Action failed'));
    },
    onError: () => Alert.alert('Error', 'Could not complete the action. Please try again.'),
  });

  return (
    <View style={[styles.deviceCard, !isOnline && styles.deviceCardOffline]}>
      <View style={styles.deviceIcon}>
        <Text style={styles.deviceEmoji}>{meta.emoji}</Text>
      </View>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{device.deviceName}</Text>
        <View style={styles.deviceStatusRow}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? COLORS.success : COLORS.textMuted }]} />
          <Text style={[styles.deviceStatusText, { color: isOnline ? COLORS.success : COLORS.textMuted }]}>
            {device.status.charAt(0) + device.status.slice(1).toLowerCase()}
          </Text>
          <Text style={styles.deviceLocation}> · {device.location}</Text>
        </View>
      </View>
      <View style={styles.deviceActions}>
        {device.supportsVisitorOtp && (
          <TouchableOpacity style={styles.otpBtn} onPress={() => setShowOtp(true)} disabled={!isOnline}>
            <Ionicons name="key-outline" size={16} color={isOnline ? COLORS.primary : COLORS.textMuted} />
          </TouchableOpacity>
        )}
        <HoldToConfirmButton
          label={meta.action}
          disabled={!isOnline || controlMutation.isPending}
          onConfirmed={() => controlMutation.mutate()}
        />
      </View>
      {showOtp && <OtpModal device={device} onClose={() => setShowOtp(false)} />}
    </View>
  );
}

export default function SmartDevicesScreen() {
  const router = useRouter();
  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ['smart-devices'],
    queryFn: smartDeviceService.getMyDevices,
    refetchInterval: 30_000,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Smart Devices</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.holdHint}>
        <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.holdHintText}>Hold the button for 3 seconds to unlock</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={devices}
          keyExtractor={d => String(d.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <DeviceRow device={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="lock-closed-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No devices accessible to you.</Text>
              <Text style={styles.emptySubtext}>Contact your society management to get access.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: COLORS.text },
  refreshBtn: { padding: 4 },
  holdHint: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: COLORS.warningLight, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8,
  },
  holdHintText: { fontSize: 12, color: COLORS.warningDark, marginLeft: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  deviceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 10, ...SHADOWS.sm,
  },
  deviceCardOffline: { opacity: 0.6 },
  deviceIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.backgroundAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  deviceEmoji: { fontSize: 22 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  deviceStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 4 },
  deviceStatusText: { fontSize: 12, fontWeight: '600' },
  deviceLocation: { fontSize: 12, color: COLORS.textMuted },
  deviceActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  otpBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.borderSlate,
    alignItems: 'center', justifyContent: 'center',
  },
  holdBtn: {
    overflow: 'hidden', borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, minWidth: 70,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center',
  },
  holdBtnDisabled: { backgroundColor: COLORS.backgroundAlt },
  holdProgress: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  holdBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  otpModal: { flex: 1, backgroundColor: COLORS.background },
  otpHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderSlate,
  },
  otpTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  otpBody: { padding: 24 },
  otpDeviceName: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 20 },
  otpLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
  otpInput: {
    borderWidth: 1, borderColor: COLORS.borderSlate, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderSlate, backgroundColor: COLORS.surface,
  },
  durationChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  durationChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  durationChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  generateBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  otpDisplay: {
    alignItems: 'center', backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.xl, padding: 28, marginTop: 16,
  },
  otpCode: { fontSize: 42, fontWeight: '900', color: COLORS.primary, letterSpacing: 8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  copyBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600', marginLeft: 4 },
  otpVisitorLabel: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 12 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  countdownText: { fontSize: 14, fontWeight: '600', marginLeft: 4 },
});
