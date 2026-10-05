import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';

export default function FestivalBuyingScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>('DIWALI');

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['festival-campaigns'],
    queryFn: () => groupBuyingService.getFestivalCampaigns(),
  });

  const { data: allDeals = [] } = useQuery({
    queryKey: ['festival-deals'],
    queryFn: () => groupBuyingService.getDeals(),
  });

  const campaign = campaigns[0];
  const categories = campaign?.categories || [];
  const featuredFestivalDeals = allDeals.filter(d => d.isFestivalDeal || (d.category && d.category.toUpperCase().includes('FESTIVAL'))).slice(0, 5);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
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
            {categories.map((cat: any, idx: number) => {
              const catName = typeof cat === 'string' ? cat : (cat.name || '');
              const catEmoji = typeof cat === 'object' && cat.emoji ? cat.emoji : '🎉';
              const catDeals = typeof cat === 'object' && cat.dealsCount ? cat.dealsCount : 0;
              const catKey = typeof cat === 'string' ? cat : (cat.id || String(idx));
              return (
                <TouchableOpacity
                  key={catKey}
                  style={s.festCard}
                  onPress={() => router.push(('/group-buying?cat=' + catName) as any)}
                  activeOpacity={0.85}
                >
                  <Text style={s.festEmoji}>{catEmoji}</Text>
                  <Text style={s.festName}>{catName}</Text>
                  <Text style={s.festDeals}>{catDeals} deals</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {featuredFestivalDeals.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Featured Festival Deals</Text>
              {featuredFestivalDeals.map(deal => (
                <TouchableOpacity
                  key={deal.id}
                  style={s.dealCard}
                  onPress={() => router.push(('/group-buying/deal/' + deal.id) as any)}
                  activeOpacity={0.85}
                >
                  <View style={s.dealTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.dealTitle}>{deal.title}</Text>
                      <Text style={s.dealVendor}>{deal.vendor}</Text>
                    </View>
                    <View style={s.dealPriceCol}>
                      <Text style={s.dealPrice}>₹{deal.currentTierPrice}</Text>
                      <Text style={s.dealMrp}>₹{deal.mrp}</Text>
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
  content: { padding: SPACING.md },
  center: { padding: 40, alignItems: 'center' },
  hero: { borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.lg },
  heroEmoji: { fontSize: 40, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.md },
  festGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  festCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', ...SHADOWS.sm },
  festEmoji: { fontSize: 32, marginBottom: 4 },
  festName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  festDeals: { fontSize: 12, color: COLORS.textMuted },
  dealCard: { backgroundColor: '#fff', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOWS.sm },
  dealTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  dealTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  dealVendor: { fontSize: 12, color: COLORS.textMuted },
  dealPriceCol: { alignItems: 'flex-end' },
  dealPrice: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  dealMrp: { fontSize: 12, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  dealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: SPACING.xs },
  dealProgress: { fontSize: 12, color: COLORS.textMuted },
  viewBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  viewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});