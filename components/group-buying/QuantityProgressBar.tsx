import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '@/constants/config';

interface Props {
  committedQty: number;
  targetQty: number;
  nextTierUnitsNeeded?: number;
  moqLabel?: string;
}

export default function QuantityProgressBar({ committedQty, targetQty, nextTierUnitsNeeded, moqLabel }: Props) {
  const progress = Math.min(1, committedQty / (targetQty || 1));
  const pct = Math.round(progress * 100);
  const barColor = pct >= 90 ? '#059669' : pct >= 60 ? COLORS.primary : '#F59E0B';
  return (
    <View style={s.wrap}>
      <View style={s.labelRow}>
        <Text style={s.left}>
          <Text style={s.bold}>{committedQty}</Text> / {targetQty} {moqLabel ?? 'units committed'}
        </Text>
        <Text style={s.right}>{pct}% reached</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      {nextTierUnitsNeeded && nextTierUnitsNeeded > 0 && (
        <Text style={s.hint}>🔥 {nextTierUnitsNeeded} more units to unlock next price tier</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  left: { fontSize: 13, color: COLORS.textSecondary },
  bold: { fontWeight: '800', color: COLORS.text },
  right: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  track: { height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.full },
  hint: { fontSize: 12, color: '#059669', fontWeight: '600' },
});
