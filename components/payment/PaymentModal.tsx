import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Modal, StyleSheet, ActivityIndicator,
  TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { paymentService, CashfreeOrderResponse } from '@/services/paymentService';

// ── Cashfree SDK types ────────────────────────────────────────────────────────
// The SDK is imported dynamically so the app degrades gracefully when the
// native module is not yet linked (e.g. Expo Go or first-time simulator build).
let CFPaymentGatewayService: any = null;
let CFSession: any               = null;
let CFEnvironment: any           = null;

try {
  const pgSdk     = require('react-native-cashfree-pg-sdk');
  const contracts = require('cashfree-pg-api-contract');
  CFPaymentGatewayService = pgSdk.CFPaymentGatewayService;
  CFSession               = contracts.CFSession;
  CFEnvironment           = contracts.CFEnvironment;
} catch {
  // SDK not yet installed — PaymentModal will show an error.
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface PaymentModalProps {
  /** Whether the modal is visible. */
  visible: boolean;
  /** Completed order from the Mana backend (paymentSessionId + appId required). */
  order: CashfreeOrderResponse | null;
  /** Current payment state from usePayment. */
  status: 'idle' | 'creating' | 'checkout' | 'verifying' | 'success' | 'failed';
  /** Error message to display. */
  error: string | null;
  /** Called when the user closes the modal after success or failure. */
  onDismiss: () => void;
  /** Called by the modal after the SDK onVerify fires. */
  onVerify: (manaOrderId: string) => Promise<void>;
}

/**
 * Shared Cashfree payment bottom sheet.
 *
 * Handles three phases:
 * 1. Loading — while the order is being created or verified.
 * 2. Checkout — launches the Cashfree SDK checkout sheet.
 * 3. Result  — shows success or failure with a dismiss button.
 *
 * Install the native SDK before using in a real build:
 * ```
 * npm install react-native-cashfree-pg-sdk cashfree-pg-api-contract
 * npx expo prebuild
 * ```
 */
export function PaymentModal({
  visible,
  order,
  status,
  error,
  onDismiss,
  onVerify,
}: PaymentModalProps) {
  const hasLaunchedCheckout = useRef(false);

  // Launch the Cashfree SDK checkout once the order is ready.
  useEffect(() => {
    if (status !== 'checkout' || !order?.paymentSessionId || !order.appId) return;
    if (hasLaunchedCheckout.current) return;
    hasLaunchedCheckout.current = true;
    launchCashfreeCheckout(order, onVerify);
  }, [status, order, onVerify]);

  // Reset the launch guard whenever the modal closes.
  useEffect(() => {
    if (!visible) {
      hasLaunchedCheckout.current = false;
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={status === 'success' || status === 'failed' ? onDismiss : undefined}
    >
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        {/* ── Loading / Creating ── */}
        {(status === 'creating' || status === 'checkout' || status === 'verifying') && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadingTitle}>
              {status === 'creating'   && 'Preparing payment…'}
              {status === 'checkout'   && 'Opening checkout…'}
              {status === 'verifying'  && 'Confirming payment…'}
            </Text>
            <Text style={s.loadingSub}>
              Please do not close this screen.
            </Text>
          </View>
        )}

        {/* ── Success ── */}
        {status === 'success' && order && (
          <View style={s.center}>
            <LinearGradient
              colors={['#059669', '#10B981']}
              style={s.iconCircle}
            >
              <Ionicons name="checkmark" size={36} color="#fff" />
            </LinearGradient>
            <Text style={s.resultTitle}>Payment Successful</Text>
            <Text style={s.resultSub}>
              ₹{Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} paid
              {order.paymentMethod ? ` via ${order.paymentMethod}` : ''}
            </Text>
            <View style={s.detailCard}>
              <DetailRow label="Order ID"    value={order.manaOrderId} />
              <DetailRow label="Amount"      value={`₹${Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
              <DetailRow label="Status"      value="PAID" valueColor="#059669" />
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={onDismiss} activeOpacity={0.85}>
              <Text style={s.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Failure ── */}
        {status === 'failed' && (
          <View style={s.center}>
            <View style={[s.iconCircle, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="close" size={36} color="#EF4444" />
            </View>
            <Text style={s.resultTitle}>Payment Failed</Text>
            <Text style={s.resultSub}>
              {error ?? 'Your payment could not be completed. No amount has been charged.'}
            </Text>
            <TouchableOpacity style={[s.primaryBtn, s.retryBtn]} onPress={onDismiss} activeOpacity={0.85}>
              <Text style={[s.primaryBtnText, { color: COLORS.primary }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Helper: launch Cashfree SDK checkout ──────────────────────────────────────
async function launchCashfreeCheckout(
  order: CashfreeOrderResponse,
  onVerify: (manaOrderId: string) => Promise<void>,
) {
  if (!CFPaymentGatewayService || !CFSession || !CFEnvironment) {
    // SDK not installed — development fallback message only.
    console.warn(
      '[PaymentModal] react-native-cashfree-pg-sdk not installed. ' +
      'Run: npm install react-native-cashfree-pg-sdk cashfree-pg-api-contract && npx expo prebuild',
    );
    return;
  }

  try {
    const isProd = order.appId && !order.appId.startsWith('TEST');
    const env    = isProd ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX;
    const session = new CFSession(order.paymentSessionId!, order.manaOrderId, env);

    CFPaymentGatewayService.setCallback({
      onVerify: (orderId: string) => {
        onVerify(orderId);
      },
      onError: (error: any, orderId: string) => {
        // Let the parent handle this — call onVerify so the backend can
        // confirm the authoritative status rather than trusting the SDK error.
        onVerify(orderId ?? order.manaOrderId);
      },
    });

    CFPaymentGatewayService.doWebPayment(session);
  } catch (e) {
    console.error('[PaymentModal] Failed to launch Cashfree checkout:', e);
  }
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  resultSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
    maxWidth: 200,
    textAlign: 'right',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});
