import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PaymentOrderStatus } from '../../services/unifiedPaymentService';

type Status = PaymentOrderStatus | 'PAID' | 'UNPAID' | 'FREE' | string;

interface Config {
  label: string;
  bg: string;
  text: string;
  strikethrough?: boolean;
}

const CONFIG: Record<string, Config> = {
  INITIATED:          { label: 'Initiated',       bg: '#F1F5F9', text: '#475569' },
  PENDING:            { label: 'Pending',         bg: '#FEF3C7', text: '#B45309' },
  SUCCESS:            { label: 'Paid',            bg: '#DCFCE7', text: '#16A34A' },
  PAID:               { label: 'Paid',            bg: '#DCFCE7', text: '#16A34A' },
  FAILED:             { label: 'Failed',          bg: '#FEE2E2', text: '#DC2626' },
  REFUND_PENDING:     { label: 'Refund Pending',  bg: '#FFEDD5', text: '#EA580C' },
  REFUNDED:           { label: 'Refunded',        bg: '#DBEAFE', text: '#2563EB' },
  PARTIALLY_REFUNDED: { label: 'Partial Refund',  bg: '#DBEAFE', text: '#2563EB' },
  VOIDED:             { label: 'Voided',          bg: '#F3F4F6', text: '#9CA3AF', strikethrough: true },
  EXPIRED:            { label: 'Expired',         bg: '#F3F4F6', text: '#9CA3AF', strikethrough: true },
  UNPAID:             { label: 'Unpaid',          bg: '#FEF2F2', text: '#EF4444' },
  FREE:               { label: 'Free',            bg: '#CCFBF1', text: '#0D9488' },
};

interface Props {
  status: Status;
  style?: object;
}

export function PaymentStatusBadge({ status, style }: Props) {
  const cfg: Config = CONFIG[status] ?? { label: String(status), bg: '#F3F4F6', text: '#6B7280' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, style]}>
      <Text style={[styles.label, { color: cfg.text }, cfg.strikethrough && styles.strikethrough]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
});

export default PaymentStatusBadge;
