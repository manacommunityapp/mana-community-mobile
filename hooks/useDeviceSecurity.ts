import { useEffect } from 'react';
import { deviceSecurity } from '@/security/deviceSecurity';
import { secureLog } from '@/security';

export function useDeviceSecurity() {
  useEffect(() => {
    deviceSecurity.inspectDevice().then((status) => {
      if (status.securityViolations.length > 0) {
        secureLog.security('DEVICE_SECURITY_WARNING', {
          violations: status.securityViolations,
          isRooted: status.isRootedOrJailbroken,
        });
      }
    }).catch(() => {});
  }, []);
}
