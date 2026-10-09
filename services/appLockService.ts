import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const APP_LOCK_ENABLED_KEY = 'mana_app_lock_enabled';
const APP_LOCK_PIN_KEY = 'mana_app_lock_pin';
const APP_LOCK_TIMEOUT_KEY = 'mana_app_lock_timeout';

const webStore = {
  getItemAsync: (key: string) => Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItemAsync: (key: string, value: string) => { try { localStorage.setItem(key, value); } catch {} return Promise.resolve(); },
  deleteItemAsync: (key: string) => { try { localStorage.removeItem(key); } catch {} return Promise.resolve(); },
};

const store = Platform.OS === 'web' ? webStore : SecureStore;

export type BiometricType = 'face' | 'fingerprint' | 'iris' | 'none';

export const appLockService = {
  async isAppLockEnabled(): Promise<boolean> {
    try {
      const val = await store.getItemAsync(APP_LOCK_ENABLED_KEY);
      return val === 'true';
    } catch {
      return false;
    }
  },

  async setAppLockEnabled(enabled: boolean): Promise<void> {
    try {
      await store.setItemAsync(APP_LOCK_ENABLED_KEY, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn('Failed to save app lock preference', e);
    }
  },

  async hasPin(): Promise<boolean> {
    try {
      const pin = await store.getItemAsync(APP_LOCK_PIN_KEY);
      return !!pin && pin.length >= 4;
    } catch {
      return false;
    }
  },

  async setPin(pin: string): Promise<boolean> {
    try {
      if (!pin || pin.length < 4) return false;
      await store.setItemAsync(APP_LOCK_PIN_KEY, pin);
      return true;
    } catch {
      return false;
    }
  },

  async removePin(): Promise<void> {
    try {
      await store.deleteItemAsync(APP_LOCK_PIN_KEY);
    } catch {}
  },

  async verifyPin(enteredPin: string): Promise<boolean> {
    try {
      const savedPin = await store.getItemAsync(APP_LOCK_PIN_KEY);
      if (!savedPin) return false;
      return savedPin === enteredPin;
    } catch {
      return false;
    }
  },

  async getLockTimeout(): Promise<number> {
    try {
      const val = await store.getItemAsync(APP_LOCK_TIMEOUT_KEY);
      if (val !== null) {
        return parseInt(val, 10) || 30;
      }
      return 30; // default 30 seconds
    } catch {
      return 30;
    }
  },

  async setLockTimeout(seconds: number): Promise<void> {
    try {
      await store.setItemAsync(APP_LOCK_TIMEOUT_KEY, String(seconds));
    } catch {}
  },

  async getBiometricType(): Promise<BiometricType> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'face';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'fingerprint';
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'iris';
      }
      return 'none';
    } catch {
      return 'none';
    }
  },

  async isBiometricsAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  },

  async authenticateBiometrics(promptMessage = 'Unlock Mana Community'): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Device PIN / Pattern',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || 'Authentication canceled' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Biometric authentication failed' };
    }
  },
};
