import { useState, useEffect, useCallback } from 'react';
import { ConsentPurposeCode, privacyService } from '@/services/privacyService';

export function useConsent(purpose: ConsentPurposeCode) {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const records = await privacyService.getConsents();
      const record = records.find(r => r.purposeCode === purpose);
      setHasConsent(record?.action === 'GRANTED');
    } catch {
      setHasConsent(false);
    } finally {
      setIsLoading(false);
    }
  }, [purpose]);

  useEffect(() => { load(); }, [load]);

  const grant = useCallback(async () => {
    await privacyService.grantConsent(purpose);
    setHasConsent(true);
  }, [purpose]);

  const revoke = useCallback(async () => {
    await privacyService.revokeConsent(purpose);
    setHasConsent(false);
  }, [purpose]);

  return { hasConsent, isLoading, grant, revoke, reload: load };
}
