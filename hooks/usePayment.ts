import { useCallback, useRef, useState } from 'react';
import { paymentService, PaymentOrderUnknownError, type CashfreeCreateOrderRequest, type CashfreeOrderResponse, type PaymentIdentity } from '@/services/paymentService';
import { useAuth } from '@/hooks/useAuth';

export type PaymentStatus = 'idle' | 'creating' | 'checkout' | 'verifying' | 'checking' | 'unknown' | 'success' | 'failed';

export interface UsePaymentResult {
  status: PaymentStatus;
  order: CashfreeOrderResponse | null;
  error: string | null;
  canRetry: boolean;
  startPayment: (req: CashfreeCreateOrderRequest) => Promise<CashfreeOrderResponse | null>;
  checkStatus: () => Promise<void>;
  retry: () => Promise<void>;
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
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [order, setOrder]   = useState<CashfreeOrderResponse | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const requestRef = useRef<CashfreeCreateOrderRequest | null>(null);
  const identityRef = useRef<PaymentIdentity | null>(null);

  // Resolve promise used to hand the result back to the caller.
  const resolveRef = useRef<((r: CashfreeOrderResponse | null) => void) | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setOrder(null);
    setError(null);
    setCanRetry(false);
    requestRef.current = null;
    identityRef.current = null;
  }, []);

  const activeIdentity = useCallback((): PaymentIdentity | null => {
    const userId = Number(user?.id);
    return Number.isFinite(userId) && userId > 0
      ? { userId, communityId: user?.communityId ?? null }
      : null;
  }, [user?.id, user?.communityId]);

  const startPayment = useCallback(
    async (req: CashfreeCreateOrderRequest): Promise<CashfreeOrderResponse | null> => {
      const identity = activeIdentity();
      if (!identity) {
        setError('Sign in again before starting a payment.');
        setStatus('failed');
        setCanRetry(false);
        return null;
      }
      requestRef.current = req;
      identityRef.current = identity;
      try {
        setStatus('creating');
        setError(null);
        setCanRetry(false);

        const created = await paymentService.createOrder(req, identity);
        setOrder(created);
        if (created.status === 'PAID') {
          setStatus('success');
        } else if (created.status === 'FAILED' || created.status === 'EXPIRED') {
          setStatus('failed');
          setCanRetry(true);
          setError(`The server reports this order as ${created.status}. You may start a new attempt.`);
        } else if (created.paymentSessionId && created.appId) {
          setStatus('checkout');
        } else {
          setStatus('unknown');
          setError(`The server found order ${created.manaOrderId} with status ${created.status}. No second order was created. Check Payment History before continuing.`);
        }
        return created;
      } catch (e: any) {
        const msg = e instanceof PaymentOrderUnknownError
          ? e.message
          : e?.response?.data?.message ?? e?.message ?? 'Payment could not be initiated.';
        setError(msg);
        setStatus(e instanceof PaymentOrderUnknownError ? 'unknown' : 'failed');
        setCanRetry(false);
        return null;
      }
    },
    [activeIdentity],
  );

  const checkStatus = useCallback(async () => {
    const req = requestRef.current;
    const identity = identityRef.current ?? activeIdentity();
    if (!identity) {
      setError('Sign in again to check this payment.');
      setStatus('unknown');
      return;
    }
    try {
      setStatus('checking');
      setCanRetry(false);
      if (order?.manaOrderId) {
        const verified = await paymentService.verifyPayment(order.manaOrderId);
        setOrder(verified);
        if (verified.status === 'PAID') {
          if (req) await paymentService.clearPendingAttempt(req, identity);
          setStatus('success');
          setError(null);
        } else if (verified.status === 'FAILED' || verified.status === 'EXPIRED') {
          if (req) await paymentService.clearPendingAttempt(req, identity);
          setStatus('failed');
          setCanRetry(true);
          setError(`The server reports this order as ${verified.status}. You may start a new attempt.`);
        } else {
          setStatus('unknown');
          setError(`The server reports order ${verified.manaOrderId} as ${verified.status}. No new order was created.`);
        }
        return;
      }
      if (!req) throw new PaymentOrderUnknownError();
      const result = await paymentService.checkPendingOrder(req, identity);
      if (result.status === 'UNKNOWN') {
        setStatus('unknown');
        setError('The server could not confirm this order. Do not start another attempt yet. Check again when connected.');
      } else if (result.status === 'NOT_FOUND') {
        setStatus('unknown');
        setCanRetry(true);
        setError('No matching order was found in your account. You can retry; the same idempotency key will be reused.');
      } else {
        setOrder(result.order);
        if (result.order.status === 'PAID') {
          setStatus('success');
          setError(null);
        } else if (result.order.status === 'FAILED' || result.order.status === 'EXPIRED') {
          setStatus('failed');
          setCanRetry(true);
          setError(`The server reports this order as ${result.order.status}. You may start a new attempt.`);
        } else {
          setStatus('unknown');
          setError(`The server found order ${result.order.manaOrderId} with status ${result.order.status}. No second order was created.`);
        }
      }
    } catch (e: any) {
      setStatus('unknown');
      setCanRetry(false);
      setError(e?.message ?? 'Payment status is still unknown. Check again when connected.');
    }
  }, [activeIdentity, order?.manaOrderId]);

  const retry = useCallback(async () => {
    if (!canRetry || !requestRef.current) return;
    await startPayment(requestRef.current);
  }, [canRetry, startPayment]);

  /**
   * Called by PaymentModal after the SDK's onVerify fires.
   * Re-queries the backend to confirm authoritative status.
   */
  const handleVerify = useCallback(async (manaOrderId: string) => {
    try {
      setStatus('verifying');
      const verified = await paymentService.verifyPayment(manaOrderId);
      setOrder(verified);
      if (verified.status === 'PAID') {
        if (requestRef.current && identityRef.current) {
          await paymentService.clearPendingAttempt(requestRef.current, identityRef.current);
        }
        setStatus('success');
        setError(null);
      } else if (verified.status === 'FAILED' || verified.status === 'EXPIRED') {
        if (requestRef.current && identityRef.current) {
          await paymentService.clearPendingAttempt(requestRef.current, identityRef.current);
        }
        setStatus('failed');
        setCanRetry(true);
        setError(verified.failureReason ?? `The server reports this order as ${verified.status}.`);
      } else {
        setStatus('unknown');
        setCanRetry(false);
        setError(`The server reports this order as ${verified.status}. Payment is not confirmed yet.`);
      }
      resolveRef.current?.(verified.status === 'PAID' ? verified : null);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Verification failed.';
      setStatus('unknown');
      setCanRetry(false);
      setError(`${msg} Payment status is unconfirmed. Check status before starting another payment.`);
      resolveRef.current?.(null);
    }
  }, []);

  // Attach handleVerify to the hook result so PaymentModal can call it.
  (startPayment as any)._handleVerify = handleVerify;

  return { status, order, error, canRetry, startPayment, checkStatus, retry, reset };
}
