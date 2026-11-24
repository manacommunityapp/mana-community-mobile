import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
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

/**
 * Length-independent equality. A plain `===` on strings short-circuits on the
 * first differing character and on a length mismatch, which leaks information
 * about the stored secret through timing. This compares every position of the
 * longer input and folds the length difference into the same accumulator, so
 * the work done does not depend on where (or whether) the inputs diverge.
 */
function constantTimeEquals(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    // charCodeAt past the end yields NaN; `|| 0` normalises it to a real code.
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Stored PIN format: `v1:<salt-hex>:<digest-hex>` where the digest is
 * SHA-256(salt-hex + pin). The PIN itself is never written to storage, which
 * matters most on web, where `webStore` above falls back to `localStorage`.
 *
 * A 4-digit PIN only has 10^4 possibilities, so a salted single-pass SHA-256
 * does not make it meaningfully expensive to crack offline — the salt stops a
 * precomputed/rainbow lookup and stops the literal PIN sitting in storage, and
 * the real protection remains the device keystore plus biometrics.
 */
const PIN_FORMAT_PREFIX = 'v1';
const SALT_BYTES = 16;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function derivePinDigest(saltHex: string, pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${saltHex}${pin}`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return digest.toLowerCase();
}

/**
 * Parses a stored record. Returns null for anything that is not in the v1
 * format — in particular a legacy plaintext PIN written by an older build.
 * Migration strategy: INVALIDATE. A legacy value is treated as "no PIN set",
 * so the user is asked to set one again rather than having a plaintext secret
 * accepted even once more.
 */
function parseStoredPin(stored: string | null): { saltHex: string; digest: string } | null {
  if (!stored) return null;
  const parts = stored.split(':');
  if (parts.length !== 3) return null;
  const [version, saltHex, digest] = parts;
  if (version !== PIN_FORMAT_PREFIX) return null;
  if (!/^[0-9a-f]+$/.test(saltHex) || !/^[0-9a-f]{64}$/.test(digest)) return null;
  return { saltHex, digest };
}

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
      const stored = await store.getItemAsync(APP_LOCK_PIN_KEY);
      // A legacy plaintext PIN does not parse, so it reads as "no PIN set"
      // and the user is prompted to set a new one.
      return parseStoredPin(stored) !== null;
    } catch {
      return false;
    }
  },

  async setPin(pin: string): Promise<boolean> {
    try {
      if (!pin || pin.length < 4) return false;
      const saltBytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
      const saltHex = toHex(saltBytes);
      const digest = await derivePinDigest(saltHex, pin);
      await store.setItemAsync(APP_LOCK_PIN_KEY, `${PIN_FORMAT_PREFIX}:${saltHex}:${digest}`);
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
      const stored = await store.getItemAsync(APP_LOCK_PIN_KEY);
      const record = parseStoredPin(stored);
      if (!record) {
        // No PIN, or a legacy plaintext record. Invalidate it so the next
        // `hasPin()` reports false and the user is forced to set a new PIN.
        if (stored) await store.deleteItemAsync(APP_LOCK_PIN_KEY);
        return false;
      }
      const candidate = await derivePinDigest(record.saltHex, enteredPin);
      return constantTimeEquals(record.digest, candidate);
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
