import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import type { LeaveBalance } from '@/types/hrm';

interface LeaveBalanceCardProps {
  balance: LeaveBalance;
}

export function LeaveBalanceCard({ balance }: LeaveBalanceCardProps) {
  const pct = balance.totalBalance > 0
    ? (balance.usedBalance / balance.totalBalance) * 100
    : 0;

  return (
    <View style={s.card}>
      <Text style={s.typeName} numberOfLines={1}>{balance.leaveTypeName}</Text>
      <View style={s.row}>
        <Text style={s.remaining}>{balance.remainingBalance}</Text>
        <Text style={s.total}>/ {balance.totalBalance}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.min(pct, 100)}%` }]} />
      </View>
      <Text style={s.usedLabel}>{balance.usedBalance} used</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 14,
    width: 140,
    ...SHADOWS.card,
  },
  typeName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
    marginBottom: 6,
  },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  remaining: {
    fontSize: 24,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    fontWeight: '700',
  },
  total: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  barTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  usedLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },
});
