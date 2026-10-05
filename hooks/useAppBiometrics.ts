import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureLog } from '@/security';

const BIOMETRICS_ENABLED_KEY = 'mana_biometrics_enabled';

export function useAppBiometrics() {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function checkSupport() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        const enabledSetting = await AsyncStorage.getItem(BIOMETRICS_ENABLED_KEY);
        
        setIsSupported(hasHardware);
        setIsEnrolled(enrolled);
        setBiometricsEnabled(enabledSetting === 'true');
      } catch (err) {
        secureLog.warn('Biometrics check error', err);
      }
    }
    checkSupport();
  }, []);

  const toggleBiometrics = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable biometric lock for Mana Community',
          cancelLabel: 'Cancel',
          fallbackLabel: 'Use PIN',
        });
        if (!auth.success) return false;
      }
      await AsyncStorage.setItem(BIOMETRICS_ENABLED_KEY, enabled ? 'true' : 'false');
      setBiometricsEnabled(enabled);
      return true;
    } catch {
      return false;
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Mana Community',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use passcode',
      });
      if (auth.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Listen for AppState changes to lock on background
  useEffect(() => {
    let lastBackground = 0;
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        lastBackground = Date.now();
      } else if (nextState === 'active' && biometricsEnabled) {
        // If app was in background for more than 30 seconds, lock
        if (Date.now() - lastBackground > 30_000) {
          setIsLocked(true);
        }
      }
    });

    return () => sub.remove();
  }, [biometricsEnabled]);

  return {
    isSupported,
    isEnrolled,
    biometricsEnabled,
    isLocked,
    toggleBiometrics,
    authenticate,
    unlock: () => setIsLocked(false),
  };
}
