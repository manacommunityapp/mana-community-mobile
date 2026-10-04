import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';

export default function BuyAgain() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['buy-again'],
    queryFn: groupBuyingService.getBuyAgainSuggestions,
  });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
      <View style={s.heroBanner}>
        <Text style={s.heroTitle}>🔁 Buy Again</Text>
        <Text style={s.heroSub}>Products you've bought before at community prices.</Text>
      </View>
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : suggestions.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="refresh-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No past purchases yet</Text>
          <Text style={s.emptySub}>Once you join deals, your reorder list appears here.</Text>
        </View>
      ) : (
        suggestions.map(item => (
          <View key={item.dealId} style={[s.card, !item.isAvailable && s.cardUnavailable]}>
            <View style={s.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.categoryText}>{item.category}</Text>
                <Text style={s.itemTitle}>{item.title}</Text>
                <Text style={s.lastBought}>Last bought: {item.lastPurchasedAt} · Rs {item.lastPrice}/unit</Text>
              </View>
              <View style={s.priceCol}>
                {item.currentPrice ? (
                  <>
                    <Text style={s.currentPrice}>Rs {item.currentPrice}</Text>
                    {item.currentPrice < item.lastPrice && (
                      <Text style={s.priceDown}>Rs {item.lastPrice - item.currentPrice} cheaper!</Text>
                    )}
                    {item.currentPrice > item.lastPrice && (
                      <Text style={s.priceUp}>Rs {item.currentPrice - item.lastPrice} higher</Text>
                    )}
                  </>
                ) : (
                  <Text style={s.naText}>N/A</Text>
                )}
              </View>
            </View>
            {item.isAvailable ? (
              <TouchableOpacity style={s.reorderBtn} onPress={() => router.push(('/group-buying/deal/' + item.dealId) as any)} activeOpacity={0.85}>
                <Ionicons name="refresh-outline" size={15} color="#fff" />
                <Text style={s.reorderBtnText}>View Deal</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.unavailableRow}>
                <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                <Text style={s.unavailableText}>No active deal right now. We'll notify you when it's available!</Text>
              </View>
            )}
          </View>
        ))
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  heroBanner: { backgroundColor: '#EDE9FE', borderRadius: RADIUS.xl, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#C4B5FD' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#4C1D95' },
  heroSub: { fontSize: 13, color: '#6D28D9', textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardUnavailable: { opacity: 0.65 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  categoryText: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  lastBought: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  priceCol: { alignItems: 'flex-end' },
  currentPrice: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  priceDown: { fontSize: 11, fontWeight: '700', color: '#059669' },
  priceUp: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  naText: { fontSize: 14, color: COLORS.textMuted },
  reorderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 10 },
  reorderBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  unavailableRow: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm, padding: 10 },
  unavailableText: { flex: 1, fontSize: 12, color: COLORS.textMuted },
});