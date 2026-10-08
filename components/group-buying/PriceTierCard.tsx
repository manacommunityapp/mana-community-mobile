import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { PriceTier } from '@/types/groupBuying';

interface Props { tiers: PriceTier[]; mrp: number; }

export default function PriceTierCard({ tiers, mrp }: Props) {
  return (
    <View style={s.card}>
      <Text style={s.heading}>Pricing Tiers</Text>
      {tiers.map((tier, i) => (
        <View key={tier.id ?? i} style={[s.row, tier.isCurrentTier && s.rowCurrent, tier.isNextTier && s.rowNext]}>
          <View style={s.left}>
            {tier.isCurrentTier && <View style={s.currentDot} />}
            {tier.isNextTier && <Ionicons name="lock-open-outline" size={13} color="#059669" style={{ marginRight: 4 }} />}
            <Text style={[s.label, tier.isCurrentTier && s.labelCurrent]}>{tier.label}</Text>
          </View>
          <View style={s.right}>
            <Text style={[s.price, tier.isCurrentTier && s.priceCurrent]}>₹{tier.price}</Text>
            <Text style={s.savings}>Save ₹{mrp - tier.price}</Text>
          </View>
          {tier.isCurrentTier && <View style={s.activeBadge}><Text style={s.activeBadgeText}>ACTIVE</Text></View>}
          {tier.isNextTier && tier.unitsToUnlock && tier.unitsToUnlock > 0 && (
            <View style={s.unlockBadge}>
              <Text style={s.unlockBadgeText}>🔥 {tier.unitsToUnlock} more</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8, ...SHADOWS.sm },
  heading: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  rowCurrent: { backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: COLORS.primary },
  rowNext: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  right: { alignItems: 'flex-end', marginRight: 8 },
  currentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginRight: 6 },
  label: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  labelCurrent: { color: COLORS.primary, fontWeight: '700' },
  price: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  priceCurrent: { color: COLORS.primary, fontSize: 16 },
  savings: { fontSize: 11, color: COLORS.textMuted },
  activeBadge: { backgroundColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  activeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  unlockBadge: { backgroundColor: '#DCFCE7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  unlockBadgeText: { color: '#166534', fontSize: 10, fontWeight: '700' },
});
