import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { paymentService, CashfreeCreateOrderRequest, CashfreeOrderResponse } from '@/services/paymentService';

export type PaymentStatus = 'idle' | 'creating' | 'checkout' | 'verifying' | 'success' | 'failed';

export interface UsePaymentResult {
  status: PaymentStatus;
  order: CashfreeOrderResponse | null;
  error: string | null;
  startPayment: (req: CashfreeCreateOrderRequest) => Promise<CashfreeOrderResponse | null>;
  reset: () => void;
}

/**
 * Manages the full Cashfree payment lifecycle:
 * 1. Create order (backend → Cashfree)
 * 2. Launch checkout (Cashfree SDK)
 * 3. Verify status (backend → Cashfree)
 *
 * The SDK integration is handled by the PaymentModal component.
 * This hook manages state and the create + verify API calls.
 */
export function usePayment(): UsePaymentResult {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [order, setOrder]   = useState<CashfreeOrderResponse | null>(null);
  const [error, setError]   = useState<string | null>(null);

  // Resolve promise used to hand the result back to the caller.
  const resolveRef = useRef<((r: CashfreeOrderResponse | null) => void) | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setOrder(null);
    setError(null);
  }, []);

  const startPayment = useCallback(
    async (req: CashfreeCreateOrderRequest): Promise<CashfreeOrderResponse | null> => {
      try {
        setStatus('creating');
        setError(null);

        const created = await paymentService.createOrder(req);
        setOrder(created);
        setStatus('checkout');
        return created;

      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? 'Payment could not be initiated.';
        setError(msg);
        setStatus('failed');
        Alert.alert('Payment Error', msg);
        return null;
      }
    },
    [],
  );

  /**
   * Called by PaymentModal after the SDK's onVerify fires.
   * Re-queries the backend to confirm authoritative status.
   */
  const handleVerify = useCallback(async (manaOrderId: string) => {
    try {
      setStatus('verifying');
      const verified = await paymentService.verifyPayment(manaOrderId);
      setOrder(verified);
      setStatus(verified.status === 'PAID' ? 'success' : 'failed');
      if (verified.status !== 'PAID') {
        setError(verified.failureReason ?? 'Payment could not be confirmed.');
      }
      resolveRef.current?.(verified.status === 'PAID' ? verified : null);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Verification failed.';
      setError(msg);
      setStatus('failed');
      resolveRef.current?.(null);
    }
  }, []);

  // Attach handleVerify to the hook result so PaymentModal can call it.
  (startPayment as any)._handleVerify = handleVerify;

  return { status, order, error, startPayment, reset };
}
