import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';

export default function FestivalDeals() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data: categories = [], isLoading: loadingCats, refetch: refetchCats } = useQuery({
    queryKey: ['festival-categories'],
    queryFn: groupBuyingService.getFestivalCategories,
  });
  const { data: featuredFestivalDeals = [], isLoading: loadingDeals, refetch: refetchDeals } = useQuery({
    queryKey: ['festival-deals'],
    queryFn: groupBuyingService.getFestivalDeals,
  });
  const onRefresh = useCallback(async () => { setRefreshing(true); await Promise.all([refetchCats(), refetchDeals()]); setRefreshing(false); }, [refetchCats, refetchDeals]);
  const isLoading = loadingCats || loadingDeals;
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
      <LinearGradient colors={['#7C3AED','#C026D3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <Text style={s.heroEmoji}>🎊</Text>
        <Text style={s.heroTitle}>Festival Bulk Buying</Text>
        <Text style={s.heroSub}>Special community prices for every festival. Buy together, celebrate together.</Text>
      </LinearGradient>
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          <Text style={s.sectionTitle}>Festivals</Text>
          <View style={s.festGrid}>
            {categories.map(cat => (
              <TouchableOpacity key={cat.id} style={s.festCard} onPress={() => router.push(('/group-buying?cat=' + cat.name) as any)} activeOpacity={0.85}>
                <Text style={s.festEmoji}>{cat.emoji}</Text>
                <Text style={s.festName}>{cat.name}</Text>
                <Text style={s.festDeals}>{cat.dealsCount} deals</Text>
              </TouchableOpacity>
            ))}
          </View>
          {featuredFestivalDeals.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Featured Festival Deals</Text>
              {featuredFestivalDeals.map(deal => (
                <TouchableOpacity key={deal.id} style={s.dealCard} onPress={() => router.push(('/group-buying/deal/' + deal.id) as any)} activeOpacity={0.85}>
                  <View style={s.dealTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dealTitle}>{deal.title}</Text>
                      <Text style={s.dealVendor}>{deal.vendor}</Text>
                    </View>
                    <View style={s.dealPriceCol}>
                      <Text style={s.dealPrice}>Rs {deal.currentTierPrice}</Text>
                      <Text style={s.dealMrp}>Rs {deal.mrp}</Text>
                    </View>
                  </View>
                  <View style={s.dealFooter}>
                    <Text style={s.dealProgress}>{deal.committedQty} / {deal.targetQty} units · {deal.daysLeft}d left</Text>
                    <View style={s.viewBtn}><Text style={s.viewBtnText}>View Deal</Text></View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32, gap: SPACING.md },
  hero: { padding: 28, alignItems: 'center', gap: 8 },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, paddingHorizontal: SPACING.md },
  festGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: 10 },
  festCard: { width: '30%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  festEmoji: { fontSize: 28 },
  festName: { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  festDeals: { fontSize: 11, color: COLORS.textMuted },
  dealCard: { marginHorizontal: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  dealTop: { flexDirection: 'row', gap: 10 },
  dealTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  dealVendor: { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  dealPriceCol: { alignItems: 'flex-end' },
  dealPrice: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  dealMrp: { fontSize: 12, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  dealProgress: { fontSize: 12, color: COLORS.textMuted },
  viewBtn: { backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});