import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { useCheckoutOptions } from '@/hooks/useCheckoutOptions';
import PaymentGatewaySelector from '@/components/payment/PaymentGatewaySelector';
import { PaymentStatusBadge } from '@/components/payment/PaymentStatusBadge';
import { unifiedPaymentService, type PaymentOrder } from '@/services/unifiedPaymentService';
import { tripsService } from '@/services/tripsService';

let CFPaymentGatewayService: any = null;
let CFSession: any               = null;
let CFEnvironment: any           = null;
try {
  const sdk       = require('react-native-cashfree-pg-sdk');
  const contracts = require('cashfree-pg-api-contract');
  CFPaymentGatewayService = sdk.CFPaymentGatewayService;
  CFSession               = contracts.CFSession;
  CFEnvironment           = contracts.CFEnvironment;
} catch {}

type FlowState = 'idle' | 'creating' | 'sdk' | 'verifying' | 'done';

export default function TripsCheckoutScreen() {
  const {
    id,
    tripTitle: titleParam,
    destination: destParam,
    departureDate: dateParam,
    participants: participantsParam,
    amount: amountParam,
  } = useLocalSearchParams<{
    id: string;
    tripTitle?: string;
    destination?: string;
    departureDate?: string;
    participants?: string;
    amount?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();
  const communityId = user?.communityId ?? 0;

  const { options, loading: optionsLoading } = useCheckoutOptions();
  const [selectedGateway, setSelectedGateway] = useState('');
  const [selectedManualMode, setSelectedManualMode] = useState<string | undefined>();
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [tripTitle, setTripTitle] = useState(titleParam ?? 'Trip Booking');
  const [destination, setDestination] = useState(destParam ?? '');
  const [departureDate, setDepartureDate] = useState(dateParam ?? '');
  const [participants, setParticipants] = useState(participantsParam ? Number(participantsParam) : 1);
  const [displayAmount, setDisplayAmount] = useState(amountParam ? Number(amountParam) : 0);

  useEffect(() => {
    if (options?.defaultGateway && !selectedGateway) setSelectedGateway(options.defaultGateway);
  }, [options]);

  useEffect(() => {
    if (!titleParam || !amountParam) {
      tripsService.getMyBookings().then(bookings => {
        const found = bookings.find(b => String(b.id) === id);
        if (found) {
          setTripTitle(found.tripTitle);
          setDestination(found.destination);
          setDepartureDate(found.departureDate);
          setParticipants(found.participantCount);
          if (found.totalAmount) setDisplayAmount(found.totalAmount);
        }
      }).catch(() => {});
    }
  }, [id]);

  const launchCFSDK = useCallback((paymentOrder: PaymentOrder) => {
    if (!CFPaymentGatewayService || !CFSession || !CFEnvironment) {
      Alert.alert('Payment Error', 'Payment SDK is not available.');
      setFlowState('idle');
      return;
    }
    try {
      const session = new CFSession(paymentOrder.gatewayOrderId, 'undefined', CFEnvironment.PRODUCTION);
      CFPaymentGatewayService.setCallback({
        onVerify: async (_cfOrderId: string) => {
          setFlowState('verifying');
          try {
            const verified = await unifiedPaymentService.verifyPayment(paymentOrder.id);
            setOrder(verified);
          } catch {}
          setFlowState('done');
        },
        onError: (error: any) => {
          Alert.alert('Payment Failed', error?.message ?? 'Gateway error.');
          setFlowState('idle');
        },
      });
      CFPaymentGatewayService.doPayment(session);
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message ?? 'Could not launch payment gateway.');
      setFlowState('idle');
    }
  }, []);

  const handlePay = async () => {
    if (!selectedGateway || flowState !== 'idle') return;
    setFlowState('creating');
    try {
      const created = await unifiedPaymentService.createOrder({
        referenceType: 'TRIP_SETTLEMENT',
        referenceId: Number(id),
        gateway: selectedGateway as any,
        communityId,
        amount: displayAmount,
      });
      setOrder(created);

      if (selectedGateway === 'MANA_PAY') {
        setFlowState('done');
      } else if (selectedGateway === 'MANUAL') {
        setFlowState('done');
      } else {
        setFlowState('sdk');
        launchCFSDK(created);
      }
    } catch (err: any) {
      setFlowState('idle');
      Alert.alert('Payment Error', err?.response?.data?.message ?? err?.message ?? 'Please try again.');
    }
  };

  const departureDateDisplay = departureDate
    ? new Date(departureDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  if (optionsLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (flowState === 'done' && order) {
    return (
      <>
        <Stack.Screen options={{ title: 'Payment Result' }} />
        <View style={s.resultContainer}>
          <PaymentStatusBadge status={order.status} style={s.resultBadge} />
          <Text style={s.resultTitle}>
            {order.status === 'SUCCESS' ? 'Booking Confirmed!' :
             order.status === 'PENDING' || order.status === 'INITIATED' ? 'Payment Pending' :
             'Payment ' + order.status}
          </Text>
          {order.status === 'SUCCESS' && (
            <Text style={s.resultSub}>
              ₹{order.grossAmount.toLocaleString()} paid via {order.gateway}
            </Text>
          )}
          {order.status === 'PENDING' && selectedGateway === 'MANUAL' && (
            <Text style={s.resultSub}>Awaiting offline payment confirmation from trip host.</Text>
          )}
          {order.failureReason ? <Text style={s.resultError}>{order.failureReason}</Text> : null}
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Trip Booking Payment', headerBackTitle: 'Back' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Trip Summary */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="bus-outline" size={22} color={COLORS.primary} />
            <Text style={s.cardTitle} numberOfLines={2}>{tripTitle}</Text>
          </View>
          <View style={s.divider} />
          {destination ? (
            <View style={s.infoRow}>
              <Ionicons name="location-outline" size={15} color={COLORS.textMuted} />
              <Text style={s.infoText}>{destination}</Text>
            </View>
          ) : null}
          {departureDateDisplay ? (
            <View style={s.infoRow}>
              <Ionicons name="calendar-outline" size={15} color={COLORS.textMuted} />
              <Text style={s.infoText}>{departureDateDisplay}</Text>
            </View>
          ) : null}
          {participants > 1 && (
            <View style={s.infoRow}>
              <Ionicons name="people-outline" size={15} color={COLORS.textMuted} />
              <Text style={s.infoText}>{participants} passengers</Text>
            </View>
          )}
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Total Trip Fee</Text>
            <Text style={s.amountValue}>
              {displayAmount > 0 ? `₹${displayAmount.toLocaleString()}` : '—'}
            </Text>
          </View>
          {options && options.convenienceFeePercent > 0 && (
            <Text style={s.feeNote}>+ {options.convenienceFeePercent}% convenience fee (confirmed by server)</Text>
          )}
        </View>

        {/* Gateway Selector */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Choose Payment Method</Text>
          {options ? (
            <PaymentGatewaySelector
              options={options}
              selectedGateway={selectedGateway}
              selectedManualMode={selectedManualMode}
              onChange={(gw, mode) => { setSelectedGateway(gw); setSelectedManualMode(mode); }}
            />
          ) : (
            <PaymentGatewaySelector loading={true} />
          )}
        </View>

        <TouchableOpacity
          style={[s.payBtn, (!selectedGateway || flowState !== 'idle') && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={!selectedGateway || flowState !== 'idle'}
          activeOpacity={0.85}
        >
          {flowState === 'creating' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={s.payBtnText}>
                Confirm Booking{displayAmount > 0 ? ` · ₹${displayAmount.toLocaleString()}` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {flowState === 'verifying' && (
          <View style={s.verifyingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={s.verifyingText}>Verifying payment…</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: SPACING.md, gap: 14 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16,
    gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:    { fontSize: 16, fontWeight: '800', color: COLORS.text, flex: 1 },
  divider:      { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText:     { fontSize: 13, color: COLORS.textSecondary },
  amountRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel:  { fontSize: 14, color: COLORS.textMuted },
  amountValue:  { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  feeNote:      { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.xl,
    paddingVertical: 16, ...SHADOWS.md,
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText:   { color: '#fff', fontSize: 16, fontWeight: '800' },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  verifyingText: { fontSize: 13, color: COLORS.textMuted },
  resultContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16, backgroundColor: COLORS.background,
  },
  resultBadge:  { transform: [{ scale: 1.3 }] },
  resultTitle:  { fontSize: 22, fontWeight: '900', color: COLORS.text, textAlign: 'center', marginTop: 8 },
  resultSub:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  resultError:  { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  doneBtn: {
    marginTop: 16, backgroundColor: COLORS.primary,
    paddingHorizontal: 48, paddingVertical: 14, borderRadius: RADIUS.xl, ...SHADOWS.sm,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
