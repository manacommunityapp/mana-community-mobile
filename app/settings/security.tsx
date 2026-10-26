import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/common/Header';
import { appLockService, BiometricType } from '@/services/appLockService';
import { COLORS, SHADOWS, RADIUS, SPACING, FONTS } from '@/constants/config';

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [hasPin, setHasPin] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(30);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinStep, setPinStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [enabled, type, customPin, timeout] = await Promise.all([
        appLockService.isAppLockEnabled(),
        appLockService.getBiometricType(),
        appLockService.hasPin(),
        appLockService.getLockTimeout(),
      ]);
      setAppLockEnabled(enabled);
      setBiometricType(type);
      setHasPin(customPin);
      setLockTimeout(timeout);
    } catch (e) {
      console.warn('Failed to load security settings', e);
    }
  };

  const handleToggleAppLock = async (val: boolean) => {
    if (val) {
      // Require verification before enabling lock
      const auth = await appLockService.authenticateBiometrics('Authenticate to enable App Lock');
      if (auth.success) {
        await appLockService.setAppLockEnabled(true);
        setAppLockEnabled(true);
        Alert.alert('App Lock Activated', 'Mana Community is now protected with biometric and passcode authentication.');
      } else {
        Alert.alert('Authentication Failed', 'Could not verify identity. App lock not enabled.');
      }
    } else {
      // Require verification before disabling lock
      const auth = await appLockService.authenticateBiometrics('Authenticate to disable App Lock');
      if (auth.success) {
        await appLockService.setAppLockEnabled(false);
        setAppLockEnabled(false);
      } else {
        Alert.alert('Authentication Failed', 'Identity verification required to turn off App Lock.');
      }
    }
  };

  const handleOpenPinModal = () => {
    setPinStep('create');
    setFirstPin('');
    setConfirmPin('');
    setPinError('');
    setPinModalVisible(true);
  };

  const handlePinDigit = (digit: string) => {
    if (pinStep === 'create') {
      if (firstPin.length >= 4) return;
      const next = firstPin + digit;
      setFirstPin(next);
      setPinError('');
      if (next.length === 4) {
        setTimeout(() => setPinStep('confirm'), 200);
      }
    } else {
      if (confirmPin.length >= 4) return;
      const next = confirmPin + digit;
      setConfirmPin(next);
      setPinError('');
      if (next.length === 4) {
        if (next === firstPin) {
          appLockService.setPin(next).then(() => {
            setHasPin(true);
            setPinModalVisible(false);
            Alert.alert('PIN Created', 'Your 4-digit App PIN has been set successfully.');
          });
        } else {
          setPinError('PINs do not match. Try again.');
          setTimeout(() => {
            setConfirmPin('');
            setPinStep('create');
            setFirstPin('');
          }, 600);
        }
      }
    }
  };

  const handlePinDelete = () => {
    if (pinStep === 'create') {
      if (firstPin.length > 0) setFirstPin(firstPin.slice(0, -1));
    } else {
      if (confirmPin.length > 0) setConfirmPin(confirmPin.slice(0, -1));
    }
    setPinError('');
  };

  const handleRemovePin = () => {
    Alert.alert(
      'Remove PIN',
      'Are you sure you want to remove your custom 4-digit PIN? You can still use Face ID, Fingerprint, or device lock.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await appLockService.removePin();
            setHasPin(false);
          },
        },
      ]
    );
  };

  const handleSelectTimeout = async (secs: number) => {
    await appLockService.setLockTimeout(secs);
    setLockTimeout(secs);
  };

  const bioLabel = biometricType === 'face'
    ? 'Face ID / Facial Recognition'
    : biometricType === 'fingerprint'
    ? 'Fingerprint / Thumb Lock'
    : 'Device Screen Lock / Pattern';

  const bioIcon = biometricType === 'face'
    ? 'scan-outline'
    : biometricType === 'fingerprint'
    ? 'finger-print-outline'
    : 'lock-closed-outline';

  const currentPinInput = pinStep === 'create' ? firstPin : confirmPin;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="App Lock & Security" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Banner Card */}
        <LinearGradient
          colors={['#1E1B4B', '#312E81', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.bannerIconCircle}>
            <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>Privacy & Biometrics Protection</Text>
          <Text style={styles.heroSub}>
            Protect your messages, personal finances, gate passes, and community activity with device-grade encryption.
          </Text>
        </LinearGradient>

        {/* Section: Main Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>APP PROTECTION</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="lock-closed" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Require App Lock</Text>
                <Text style={styles.rowSub}>Prompt for authentication when launching or returning to Mana</Text>
              </View>
              <Switch
                value={appLockEnabled}
                onValueChange={handleToggleAppLock}
                trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Section: Authentication Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SUPPORTED AUTHENTICATION METHODS</Text>
          <View style={styles.card}>
            {/* Biometric Status */}
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name={bioIcon} size={20} color="#059669" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{bioLabel}</Text>
                <Text style={styles.rowSub}>Supported by device hardware enclave</Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Hardware Ready</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* In-App 4-Digit PIN */}
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="keypad" size={20} color="#D97706" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Custom 4-Digit App PIN</Text>
                <Text style={styles.rowSub}>
                  {hasPin ? 'PIN is configured (••••)' : 'No custom PIN set'}
                </Text>
              </View>
              <TouchableOpacity
                style={hasPin ? styles.editPinBtn : styles.setPinBtn}
                onPress={handleOpenPinModal}
              >
                <Text style={hasPin ? styles.editPinText : styles.setPinText}>
                  {hasPin ? 'Change' : 'Set PIN'}
                </Text>
              </TouchableOpacity>
            </View>

            {hasPin && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.removePinRow}
                  onPress={handleRemovePin}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.removePinText}>Remove 4-Digit PIN</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider} />

            {/* Pattern / Passcode Fallback */}
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
                <Ionicons name="apps" size={20} color="#64748B" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Pattern & OS Passcode</Text>
                <Text style={styles.rowSub}>Device lock screen fallback on Android & iOS</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
          </View>
        </View>

        {/* Section: Auto-Lock Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>AUTO-LOCK TIMEOUT</Text>
          <View style={styles.card}>
            {[
              { label: 'Immediately on exit', seconds: 0 },
              { label: 'After 30 seconds', seconds: 30 },
              { label: 'After 1 minute', seconds: 60 },
              { label: 'After 5 minutes', seconds: 300 },
            ].map((item, idx, arr) => (
              <React.Fragment key={item.seconds}>
                <TouchableOpacity
                  style={styles.timeoutRow}
                  onPress={() => handleSelectTimeout(item.seconds)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeoutLabel}>{item.label}</Text>
                  {lockTimeout === item.seconds ? (
                    <Ionicons name="radio-button-on" size={20} color={COLORS.primary} />
                  ) : (
                    <Ionicons name="radio-button-off" size={20} color="#94A3B8" />
                  )}
                </TouchableOpacity>
                {idx < arr.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Set PIN Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pinStep === 'create' ? 'Create 4-Digit PIN' : 'Confirm Your PIN'}
              </Text>
              <TouchableOpacity
                onPress={() => setPinModalVisible(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {pinStep === 'create'
                ? 'Enter a 4-digit code to unlock Mana Community'
                : 'Re-enter your 4-digit code to confirm'}
            </Text>

            {/* Dots */}
            <View style={styles.modalDots}>
              {[0, 1, 2, 3].map((idx) => (
                <View
                  key={idx}
                  style={[
                    styles.modalDot,
                    currentPinInput.length > idx && styles.modalDotFilled,
                    pinError ? styles.modalDotError : null,
                  ]}
                />
              ))}
            </View>

            {pinError ? (
              <Text style={styles.modalError}>{pinError}</Text>
            ) : null}

            {/* Keypad */}
            <View style={styles.modalKeypad}>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
              ].map((row, rIdx) => (
                <View key={rIdx} style={styles.modalKeyRow}>
                  {row.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={styles.modalKeyBtn}
                      onPress={() => handlePinDigit(d)}
                    >
                      <Text style={styles.modalKeyText}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}

              <View style={styles.modalKeyRow}>
                <View style={[styles.modalKeyBtn, { backgroundColor: 'transparent' }]} />
                <TouchableOpacity
                  style={styles.modalKeyBtn}
                  onPress={() => handlePinDigit('0')}
                >
                  <Text style={styles.modalKeyText}>0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalKeyBtn}
                  onPress={handlePinDelete}
                >
                  <Ionicons name="backspace-outline" size={22} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: SPACING.md,
  },
  heroBanner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  bannerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: FONTS.bold,
  },
  heroSub: {
    fontSize: 13,
    color: '#E0E7FF',
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
    fontFamily: FONTS.bold,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
  rowSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    fontFamily: FONTS.semiBold,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  setPinBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  setPinText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  editPinBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editPinText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  removePinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  removePinText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  timeoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  timeoutLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: FONTS.regular,
  },
  modalDots: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  modalDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  modalDotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalDotError: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  modalError: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
    marginBottom: 8,
  },
  modalKeypad: {
    width: '100%',
    maxWidth: 270,
    gap: 12,
    marginTop: 8,
  },
  modalKeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalKeyBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeyText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
});
