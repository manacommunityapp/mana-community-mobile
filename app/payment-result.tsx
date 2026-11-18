import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { PaymentStatusBadge } from '@/components/payment/PaymentStatusBadge';

export default function PaymentResultScreen() {
  const {
    status,
    orderId,
    gateway,
    grossAmount,
    message,
  } = useLocalSearchParams<{
    status: string;
    orderId?: string;
    gateway?: string;
    grossAmount?: string;
    message?: string;
  }>();
  const router = useRouter();

  const isSuccess  = status === 'SUCCESS' || status === 'PAID';
  const isPending  = status === 'PENDING' || status === 'INITIATED';
  const isFailed   = status === 'FAILED';

  const icon: any = isSuccess ? 'checkmark-circle' : isPending ? 'time-outline' : 'close-circle';
  const iconColor = isSuccess ? '#16A34A' : isPending ? '#B45309' : '#DC2626';

  return (
    <>
      <Stack.Screen options={{ title: 'Payment Result', headerShown: true }} />
      <View style={s.container}>
        <View style={s.card}>
          <Ionicons name={icon} size={64} color={iconColor} />

          <PaymentStatusBadge status={status} style={s.badge} />

          <Text style={s.title}>
            {isSuccess  ? 'Payment Successful!'  :
             isPending  ? 'Payment Pending'       :
             isFailed   ? 'Payment Failed'        :
             'Payment ' + status}
          </Text>

          {grossAmount && Number(grossAmount) > 0 ? (
            <Text style={s.amount}>₹{Number(grossAmount).toLocaleString()}</Text>
          ) : null}

          {gateway ? (
            <Text style={s.sub}>via {gateway}</Text>
          ) : null}

          {isPending ? (
            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#B45309" />
              <Text style={s.infoText}>
                Your payment is being processed. You will receive a confirmation shortly.
              </Text>
            </View>
          ) : null}

          {message ? (
            <Text style={[s.sub, isFailed && { color: '#DC2626' }]}>{message}</Text>
          ) : null}

          {orderId ? (
            <Text style={s.orderIdText}>Order #{orderId}</Text>
          ) : null}
        </View>

        <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
          <Text style={s.doneBtnText}>Done</Text>
        </TouchableOpacity>

        {isSuccess ? (
          <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/')}>
            <Text style={s.homeBtnText}>Go to Home</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: COLORS.background,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  badge: {
    transform: [{ scale: 1.2 }],
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 6,
  },
  amount: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
  },
  sub: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  orderIdText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  homeBtn: {
    width: '100%',
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 14,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeBtnText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
