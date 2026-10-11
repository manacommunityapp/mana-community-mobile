import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as ScreenCapture from 'expo-screen-capture';
import { secureLog } from './secureLogger';

export interface DeviceSecurityStatus {
  isDevice: boolean;
  isRootedOrJailbroken: boolean;
  screenProtectionActive: boolean;
  securityViolations: string[];
}

/**
 * Mobile device security utility:
 * - Jailbreak & Root detection checks
 * - Screen capture prevention for sensitive financial/pass screens
 * - Emulator & environment risk assessment
 */
export const deviceSecurity = {
  async inspectDevice(): Promise<DeviceSecurityStatus> {
    const violations: string[] = [];

    // 1. Emulator detection in production
    const isPhysical = Device.isDevice;
    if (!isPhysical && !__DEV__) {
      violations.push('EMULATOR_IN_PRODUCTION');
    }

    // 2. Root / Jailbreak indicators
    const isRooted = await this.checkRootIndicators();
    // In development or when running on an emulator, test-keys/debug builds are normal
    if (isRooted && !__DEV__ && isPhysical) {
      violations.push('ROOT_OR_JAILBREAK_DETECTED');
      secureLog.security('DEVICE_INTEGRITY_COMPROMISED');
    }

    return {
      isDevice: isPhysical,
      isRootedOrJailbroken: isRooted,
      screenProtectionActive: false,
      securityViolations: violations,
    };
  },

  async checkRootIndicators(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    // Check device model / build tags
    if (Platform.OS === 'android') {
      const buildId = Device.osBuildId?.toLowerCase() || '';
      if (buildId.includes('test-keys') || buildId.includes('debug-keys')) {
        return true;
      }
    }

    // Check if rooted using Device API if supported
    if (typeof (Device as any).isRootedExperimentalAsync === 'function') {
      try {
        return await (Device as any).isRootedExperimentalAsync();
      } catch {
        return false;
      }
    }

    return false;
  },

  /**
   * Activates screenshot and screen recording prevention for sensitive screens
   */
  async enableScreenProtection(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    try {
      await ScreenCapture.preventScreenCaptureAsync();
      secureLog.info('[DeviceSecurity] Screen capture protection activated');
      return true;
    } catch (e) {
      secureLog.warn('[DeviceSecurity] Failed to activate screen protection: ' + e);
      return false;
    }
  },

  /**
   * Deactivates screen protection when navigating away from sensitive screens
   */
  async disableScreenProtection(): Promise<boolean> {
    if (Platform.OS === 'web') return true;
    try {
      await ScreenCapture.allowScreenCaptureAsync();
      secureLog.info('[DeviceSecurity] Screen capture protection deactivated');
      return true;
    } catch (e) {
      return false;
    }
  },
};

export default deviceSecurity;
