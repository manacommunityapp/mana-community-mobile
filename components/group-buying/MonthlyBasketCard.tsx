import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { MonthlyBasket } from '@/types/groupBuying';

interface Props { basket: MonthlyBasket; onJoin: () => void; }

export default function MonthlyBasketCard({ basket, onJoin }: Props) {
  const progress = Math.min(1, basket.committedFamilies / basket.targetFamilies);
  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.badgeRow}>
          {basket.isRecurring && <View style={s.recurBadge}><Text style={s.recurText}>🔁 Monthly</Text></View>}
          <View style={s.saveBadge}><Text style={s.saveText}>Save {basket.savingsPct}%</Text></View>
        </View>
        <Text style={s.title}>{basket.name}</Text>
        {basket.tagline && <Text style={s.tagline}>{basket.tagline}</Text>}
      </View>
      <View style={s.items}>
        {basket.items.slice(0, 4).map((item, i) => (
          <View key={i} style={s.itemRow}>
            <Text style={s.itemName}>{item.name}</Text>
            <Text style={s.itemPrice}>₹{item.groupPrice}</Text>
          </View>
        ))}
        {basket.items.length > 4 && <Text style={s.more}>+{basket.items.length - 4} more items</Text>}
      </View>
      <View style={s.pricing}>
        <View>
          <Text style={s.groupPrice}>₹{basket.groupPrice.toLocaleString()}</Text>
          <Text style={s.mrp}>MRP ₹{(basket.mrpTotal ?? basket.groupPrice ?? 0).toLocaleString()}</Text>
        </View>
        <View style={s.savingsBox}>
          <Text style={s.savingsLabel}>You Save</Text>
          <Text style={s.savingsAmt}>₹{basket.savings}</Text>
        </View>
      </View>
      <View style={s.progress}>
        <View style={s.track}><View style={[s.fill, { width: `${Math.round(progress * 100)}%` }]} /></View>
        <Text style={s.progText}>{basket.committedFamilies} / {basket.targetFamilies} families committed · Cutoff: {basket.cutoffDate}</Text>
      </View>
      <TouchableOpacity style={s.joinBtn} onPress={onJoin} activeOpacity={0.8}>
        <Ionicons name="basket-outline" size={16} color="#fff" />
        <Text style={s.joinBtnText}>Join Basket · Delivery {basket.nextDeliveryDate}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, ...SHADOWS.md },
  header: { gap: 4 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  recurBadge: { backgroundColor: '#EDE9FE', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  recurText: { fontSize: 11, fontWeight: '700', color: '#6D28D9' },
  saveBadge: { backgroundColor: '#DCFCE7', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  saveText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  tagline: { fontSize: 13, color: COLORS.textMuted },
  items: { gap: 5, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontSize: 13, color: COLORS.textSecondary },
  itemPrice: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  more: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  pricing: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  groupPrice: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  mrp: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  savingsBox: { backgroundColor: '#DCFCE7', borderRadius: 8, padding: 8, alignItems: 'center' },
  savingsLabel: { fontSize: 11, color: '#166534' },
  savingsAmt: { fontSize: 16, fontWeight: '800', color: '#166534' },
  progress: { gap: 5 },
  track: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progText: { fontSize: 11, color: COLORS.textMuted },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13 },
  joinBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
