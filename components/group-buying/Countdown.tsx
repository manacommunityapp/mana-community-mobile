import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/config';

interface Props { endsAt: string; label?: string; }

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function Countdown({ endsAt, label = 'Deal ends in' }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
    setRemaining(calc());
    const t = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const isUrgent = remaining < 86400;

  return (
    <View style={[styles.row, isUrgent && styles.rowUrgent]}>
      <Ionicons name="time-outline" size={14} color={isUrgent ? '#DC2626' : COLORS.textMuted} />
      <Text style={[styles.label, isUrgent && styles.labelUrgent]}>{label}:</Text>
      {d > 0 && <Text style={[styles.chip, isUrgent && styles.chipUrgent]}>{d}d</Text>}
      <Text style={[styles.chip, isUrgent && styles.chipUrgent]}>{pad(h)}h</Text>
      <Text style={[styles.chip, isUrgent && styles.chipUrgent]}>{pad(m)}m</Text>
      <Text style={[styles.chip, isUrgent && styles.chipUrgent]}>{pad(s)}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowUrgent: {},
  label: { fontSize: 12, color: COLORS.textMuted, marginRight: 2 },
  labelUrgent: { color: '#DC2626', fontWeight: '600' },
  chip: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  chipUrgent: { color: '#DC2626' },
});
