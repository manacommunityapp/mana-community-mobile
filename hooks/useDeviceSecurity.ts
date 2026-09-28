import { useEffect } from 'react';
import * as Device from 'expo-device';

export function useDeviceSecurity() {
  useEffect(() => {
    if (__DEV__) return;
    // Warn if production build is running on emulator/simulator.
    // Full root/jailbreak detection requires a native module such as
    // react-native-jail-monkey — add once that dependency is approved.
    if (!Device.isDevice) {
      console.warn('[Security] Production build detected on emulator');
    }
  }, []);
}
