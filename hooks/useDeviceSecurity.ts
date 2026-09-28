import { useEffect } from 'react';
import * as Device from 'expo-device';
import { secureLog } from '@/security';

export function useDeviceSecurity() {
  useEffect(() => {
    if (__DEV__) return;
    if (!Device.isDevice) {
      secureLog.security('EMULATOR_DETECTED_IN_PRODUCTION');
    }
  }, []);
}
