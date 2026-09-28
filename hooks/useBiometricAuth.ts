import * as LocalAuthentication from 'expo-local-authentication';
import { tokenStore } from '@/services/apiClient';

export interface BiometricCapability {
  available: boolean;
  hasStoredSession: boolean;
  label: string;
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const [hasHardware, isEnrolled, token, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    tokenStore.getAccess(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  const available = hasHardware && isEnrolled;
  const hasFaceId = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

  return {
    available,
    hasStoredSession: !!token,
    label: hasFaceId ? 'Sign in with Face ID' : 'Sign in with Fingerprint',
  };
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to Mana Community',
    fallbackLabel: 'Use password',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}
