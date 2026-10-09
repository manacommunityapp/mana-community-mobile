import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { appLockService, BiometricType } from '@/services/appLockService';

export function useAppBiometrics() {
  const [isSupported, setIsSupported] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const refreshLockConfig = useCallback(async () => {
    try {
      const [available, type, enabled] = await Promise.all([
        appLockService.isBiometricsAvailable(),
        appLockService.getBiometricType(),
        appLockService.isAppLockEnabled(),
      ]);
      setIsSupported(available);
      setBiometricType(type);
      setAppLockEnabled(enabled);
    } catch (err) {
      console.warn('Failed to load lock config', err);
    }
  }, []);

  useEffect(() => {
    refreshLockConfig();
  }, [refreshLockConfig]);

  // Listen for AppState changes to lock on background
  useEffect(() => {
    let lastBackground = 0;
    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        lastBackground = Date.now();
      } else if (nextState === 'active') {
        const enabled = await appLockService.isAppLockEnabled();
        if (enabled && lastBackground > 0) {
          const timeoutSeconds = await appLockService.getLockTimeout();
          const elapsed = (Date.now() - lastBackground) / 1000;
          if (elapsed >= timeoutSeconds) {
            setIsLocked(true);
          }
        }
      }
    });

    return () => sub.remove();
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    const res = await appLockService.authenticateBiometrics('Unlock Mana Community');
    if (res.success) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  return {
    isSupported,
    biometricType,
    appLockEnabled,
    isLocked,
    authenticate,
    unlock: () => setIsLocked(false),
    lock: () => setIsLocked(true),
    refreshLockConfig,
  };
}
