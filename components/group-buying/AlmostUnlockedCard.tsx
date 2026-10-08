import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { GroupDealDto } from '@/types/groupBuying';

export default function AlmostUnlockedCard({ deal }: { deal: GroupDealDto }) {
  const router = useRouter();
  const progress = Math.min(1, deal.committedQty / deal.targetQty);
  const needed = deal.nextTierUnitsNeeded ?? (deal.targetQty - deal.committedQty);
  return (
    <TouchableOpacity style={s.card} onPress={() => router.push(`/group-buying/deal/${deal.id}` as any)} activeOpacity={0.8}>
      <View style={s.header}>
        <View style={s.fireBadge}><Text style={s.fireText}>🔥 Almost Unlocked</Text></View>
        {deal.daysLeft <= 1 && <View style={s.urgentBadge}><Text style={s.urgentText}>⚡ Ends soon</Text></View>}
      </View>
      <Text style={s.title} numberOfLines={2}>{deal.title}</Text>
      <View style={s.priceRow}>
        <Text style={s.currentPrice}>₹{deal.nextTierPrice ?? deal.currentTierPrice}</Text>
        <Text style={s.arrow}>←</Text>
        <Text style={s.fromPrice}>₹{deal.currentTierPrice}</Text>
        <Text style={s.vendor}> · {deal.vendor}</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <View style={s.footer}>
        <Text style={s.footerText}><Text style={s.bold}>{deal.committedQty}</Text> / {deal.targetQty} units</Text>
        <Text style={s.needed}>{needed} more to unlock ₹{deal.nextTierPrice}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { width: 220, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1.5, borderColor: '#FDE68A', gap: 8, ...SHADOWS.sm },
  header: { flexDirection: 'row', gap: 6 },
  fireBadge: { backgroundColor: '#FEF3C7', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  fireText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  urgentBadge: { backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#991B1B' },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 19 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  currentPrice: { fontSize: 16, fontWeight: '800', color: '#059669' },
  arrow: { fontSize: 12, color: COLORS.textMuted },
  fromPrice: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  vendor: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  track: { height: 6, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: RADIUS.full },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 12, color: COLORS.textSecondary },
  bold: { fontWeight: '800', color: COLORS.text },
  needed: { fontSize: 11, color: '#059669', fontWeight: '600' },
});
