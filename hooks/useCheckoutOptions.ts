import { useState, useEffect } from 'react';
import {
  paymentConfigService,
  CheckoutOptions,
} from '@/services/paymentConfigService';

export function useCheckoutOptions() {
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentConfigService
      .getCheckoutOptions()
      .then(setOptions)
      .catch(() => setError('Failed to load payment options'))
      .finally(() => setLoading(false));
  }, []);

  return { options, loading, error };
}
