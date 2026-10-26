import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { appLockService, BiometricType } from '@/services/appLockService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, RADIUS, SPACING, FONTS } from '@/constants/config';

interface BiometricLockModalProps {
  visible: boolean;
  onUnlock: () => void;
}

export const BiometricLockModal: React.FC<BiometricLockModalProps> = ({ visible, onUnlock }) => {
  const { logout } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [hasCustomPin, setHasCustomPin] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [bioAvailable, setBioAvailable] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setPin('');
      setPinError('');
      loadLockState();
    }
  }, [visible]);

  const loadLockState = async () => {
    try {
      const [type, available, customPin] = await Promise.all([
        appLockService.getBiometricType(),
        appLockService.isBiometricsAvailable(),
        appLockService.hasPin(),
      ]);
      setBiometricType(type);
      setBioAvailable(available);
      setHasCustomPin(customPin);

      // Automatically trigger biometric prompt on open
      if (available) {
        setTimeout(() => {
          handleBiometricAuth();
        }, 350);
      }
    } catch (e) {
      console.warn('Failed to initialize lock state', e);
    }
  };

  const handleBiometricAuth = async () => {
    const res = await appLockService.authenticateBiometrics(
      biometricType === 'face'
        ? 'Unlock Mana with Face ID'
        : 'Unlock Mana with Fingerprint'
    );
    if (res.success) {
      onUnlock();
    }
  };

  const handleDigitPress = async (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setPinError('');

    if (newPin.length === 4) {
      // Verify PIN
      const valid = await appLockService.verifyPin(newPin);
      if (valid) {
        setPin('');
        onUnlock();
      } else {
        if (Platform.OS !== 'web') {
          Vibration.vibrate(100);
        }
        setPinError('Incorrect 4-digit PIN');
        setTimeout(() => {
          setPin('');
        }, 400);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setPinError('');
    }
  };

  const handleDeviceFallback = async () => {
    const res = await appLockService.authenticateBiometrics('Enter device passcode or pattern');
    if (res.success) {
      onUnlock();
    }
  };

  const biometricTitle = biometricType === 'face'
    ? 'Face ID'
    : biometricType === 'fingerprint'
    ? 'Fingerprint'
    : 'Biometrics';

  const biometricIcon = biometricType === 'face'
    ? 'scan-outline'
    : 'finger-print-outline';

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent>
      <View style={styles.container}>
        {/* Background gradient accents */}
        <LinearGradient
          colors={['#1E1B4B', '#0F172A', '#020617']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header Icon */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <LinearGradient
              colors={['#4F46E5', '#3730A3']}
              style={styles.iconGradient}
            >
              <Ionicons name={biometricIcon} size={48} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Mana Community Locked</Text>
          <Text style={styles.sub}>
            {hasCustomPin
              ? `Use ${biometricTitle} or enter your 4-digit PIN`
              : `Authenticate with ${biometricTitle} or device screen lock`}
          </Text>
        </View>

        {/* PIN Indicators */}
        <View style={styles.pinSection}>
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    isFilled && styles.dotFilled,
                    pinError ? styles.dotError : null,
                  ]}
                />
              );
            })}
          </View>
          {pinError ? (
            <Text style={styles.errorText}>{pinError}</Text>
          ) : (
            <Text style={styles.hintText}>
              {hasCustomPin ? 'Enter 4-digit App PIN' : 'Enter device passcode or use biometrics below'}
            </Text>
          )}
        </View>

        {/* Numeric Keypad */}
        <View style={styles.keypad}>
          <View style={styles.keypadRow}>
            {['1', '2', '3'].map((n) => (
              <TouchableOpacity
                key={n}
                style={styles.keyBtn}
                onPress={() => handleDigitPress(n)}
                activeOpacity={0.7}
              >
                <Text style={styles.keyDigit}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            {['4', '5', '6'].map((n) => (
              <TouchableOpacity
                key={n}
                style={styles.keyBtn}
                onPress={() => handleDigitPress(n)}
                activeOpacity={0.7}
              >
                <Text style={styles.keyDigit}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            {['7', '8', '9'].map((n) => (
              <TouchableOpacity
                key={n}
                style={styles.keyBtn}
                onPress={() => handleDigitPress(n)}
                activeOpacity={0.7}
              >
                <Text style={styles.keyDigit}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.keypadRow}>
            {/* Biometric trigger button */}
            <TouchableOpacity
              style={[styles.keyBtn, styles.specialKeyBtn]}
              onPress={handleBiometricAuth}
              activeOpacity={0.7}
              disabled={!bioAvailable}
            >
              <Ionicons
                name={biometricIcon}
                size={26}
                color={bioAvailable ? '#818CF8' : '#475569'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keyBtn}
              onPress={() => handleDigitPress('0')}
              activeOpacity={0.7}
            >
              <Text style={styles.keyDigit}>0</Text>
            </TouchableOpacity>

            {/* Backspace button */}
            <TouchableOpacity
              style={[styles.keyBtn, styles.specialKeyBtn]}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="backspace-outline" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Fallback & Logout actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.fallbackBtn}
            onPress={handleDeviceFallback}
            activeOpacity={0.8}
          >
            <Ionicons name="keypad-outline" size={16} color="#94A3B8" />
            <Text style={styles.fallbackText}>Use Phone PIN / Pattern / Passcode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => logout()}
            activeOpacity={0.8}
          >
            <Text style={styles.logoutText}>Log Out / Switch Resident</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 24 : 12,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: FONTS.bold,
  },
  sub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 19,
    fontFamily: FONTS.regular,
  },
  pinSection: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
    transform: [{ scale: 1.15 }],
  },
  dotError: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
    fontFamily: FONTS.medium,
  },
  hintText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: FONTS.regular,
  },
  keypad: {
    width: '100%',
    maxWidth: 290,
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  specialKeyBtn: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyDigit: {
    fontSize: 26,
    fontWeight: '600',
    color: '#F8FAFC',
    fontFamily: FONTS.semiBold,
  },
  footer: {
    alignItems: 'center',
    gap: 12,
    marginBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  fallbackText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
});
