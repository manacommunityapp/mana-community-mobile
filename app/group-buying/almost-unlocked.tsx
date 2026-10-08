import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import AlmostUnlockedCard from '@/components/group-buying/AlmostUnlockedCard';
import Countdown from '@/components/group-buying/Countdown';

export default function AlmostUnlocked() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: deals = [], isLoading, refetch } = useQuery({
    queryKey: ['almost-unlocked'],
    queryFn: groupBuyingService.getAlmostUnlockedDeals,
  });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
      <View style={s.heroBanner}>
        <Ionicons name="flame" size={32} color="#F59E0B" />
        <Text style={s.heroTitle}>Almost Unlocked!</Text>
        <Text style={s.heroSub}>These deals are just a few units away from the next price tier. Invite neighbours and save more together.</Text>
      </View>
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : deals.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#059669" />
          <Text style={s.emptyTitle}>All Tiers Unlocked!</Text>
          <Text style={s.emptySub}>No deals are near their next price threshold right now. Check back soon.</Text>
        </View>
      ) : (
        <View style={s.dealsList}>
          {deals.map(deal => (
            <View key={deal.id} style={s.dealWrap}>
              <AlmostUnlockedCard deal={deal} />
              <View style={s.timerRow}>
                <Countdown endsAt={deal.dealEndsAt || deal.endDate || new Date().toISOString()} />
              </View>
              {deal.nextTierUnitsNeeded && (
                <View style={s.urgencyBox}>
                  <Text style={s.urgencyText}>🎯 Just {deal.nextTierUnitsNeeded} more units to unlock ₹{deal.nextTierPrice} for everyone!</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md },
  heroBanner: { backgroundColor: '#FEF3C7', borderRadius: RADIUS.xl, padding: 20, alignItems: 'center', gap: 8, marginBottom: SPACING.lg, borderWidth: 1, borderColor: '#FDE68A' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#92400E' },
  heroSub: { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 18 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  dealsList: { gap: SPACING.lg },
  dealWrap: { gap: 8 },
  timerRow: { paddingHorizontal: 4 },
  urgencyBox: { backgroundColor: '#DCFCE7', borderRadius: RADIUS.md, padding: 10, borderWidth: 1, borderColor: '#86EFAC' },
  urgencyText: { fontSize: 13, fontWeight: '600', color: '#166534', textAlign: 'center' },
});