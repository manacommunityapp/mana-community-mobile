import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import CommunitySavingsCard from '@/components/group-buying/CommunitySavingsCard';
import AlmostUnlockedCard from '@/components/group-buying/AlmostUnlockedCard';
import PricingModelBadge from '@/components/group-buying/PricingModelBadge';
import Countdown from '@/components/group-buying/Countdown';

const CATEGORIES = ['All', 'Grocery', 'Fresh', 'Dairy', 'Home', 'Personal Care', 'Kids', 'Festival', 'Electronics'];

const QUICK_NAV = [
  { icon: 'flame-outline',        label: 'Hot Deals',       color: '#EF4444', route: '/group-buying' },
  { icon: 'sparkles',             label: 'Ask AI',          color: '#6366F1', route: '/group-buying/ask-community' },
  { icon: 'business-outline',     label: 'Tower Groups',    color: '#059669', route: '/group-buying/tower-groups' },
  { icon: 'alert-circle-outline', label: 'Almost Unlocked', color: '#F59E0B', route: '/group-buying/almost-unlocked' },
  { icon: 'sparkles-outline',     label: 'Festival',        color: '#8B5CF6', route: '/group-buying/festival' },
  { icon: 'basket-outline',       label: 'Baskets',         color: '#059669', route: '/group-buying/baskets' },
  { icon: 'refresh-outline',      label: 'Buy Again',       color: '#0EA5E9', route: '/group-buying/buy-again' },
  { icon: 'bulb-outline',         label: 'Demand Board',    color: '#D97706', route: '/group-buying/demand' },
  { icon: 'receipt-outline',      label: 'My Orders',       color: '#6B7280', route: '/group-buying/orders' },
  { icon: 'trophy-outline',       label: 'Savings',         color: '#7C3AED', route: '/group-buying/community-savings' },
] as const;

export default function GroupBuyingHome() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: deals = [], isLoading: loadingDeals, refetch: refetchDeals } = useQuery({
    queryKey: ['group-deals'],
    queryFn: groupBuyingService.getDeals,
  });
  const { data: almostUnlocked = [], refetch: refetchAlmost } = useQuery({
    queryKey: ['almost-unlocked'],
    queryFn: groupBuyingService.getAlmostUnlockedDeals,
  });
  const { data: savings, refetch: refetchSavings } = useQuery({
    queryKey: ['community-savings'],
    queryFn: groupBuyingService.getCommunitySavings,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDeals(), refetchAlmost(), refetchSavings()]);
    setRefreshing(false);
  }, [refetchDeals, refetchAlmost, refetchSavings]);

  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      const catOk = selectedCategory === 'All' || d.category === selectedCategory;
      const searchOk = !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.vendor.toLowerCase().includes(searchQuery.toLowerCase());
      return catOk && searchOk;
    });
  }, [deals, selectedCategory, searchQuery]);

  const trending = filteredDeals.filter(d => d.isTrending);
  const festivalDeals = filteredDeals.filter(d => d.isFestivalDeal);
  const endingSoon = filteredDeals.filter(d => d.isEndingSoon || d.daysLeft <= 1);
  const regularDeals = filteredDeals.filter(d => !d.isTrending && !d.isFestivalDeal);

  function DealRow({ deal }: { deal: (typeof deals)[0] }) {
    const discPct = Math.round(((deal.mrp - deal.currentTierPrice) / deal.mrp) * 100);
    const progress = Math.min(1, deal.committedQty / deal.targetQty);
    return (
      <TouchableOpacity style={s.dealCard} onPress={() => router.push(('/group-buying/deal/' + deal.id) as any)} activeOpacity={0.85}>
        <View style={s.dealCardTop}>
          <View style={s.dealCatBadge}><Text style={s.dealCatText}>{deal.category}</Text></View>
          <View style={s.dealRightBadges}>
            {deal.isTrending && <View style={s.trendBadge}><Text style={s.trendBadgeText}>🔥 Hot</Text></View>}
            {deal.isFestivalDeal && <View style={s.festBadge}><Text style={s.festBadgeText}>🎉</Text></View>}
            {(deal.isEndingSoon || deal.daysLeft <= 1) && <View style={s.urgentBadge}><Text style={s.urgentBadgeText}>⚡ Ends Soon</Text></View>}
          </View>
        </View>
        <Text style={s.dealTitle}>{deal.title}</Text>
        <View style={s.dealVendorRow}>
          <Ionicons name="storefront-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.dealVendorText}>{deal.vendor}</Text>
          {deal.vendorVerified && <Ionicons name="checkmark-circle" size={12} color="#059669" />}
          <Ionicons name="star" size={12} color="#F59E0B" style={{ marginLeft: 6 }} />
          <Text style={s.dealVendorText}>{deal.vendorRating}</Text>
        </View>
        <View style={s.dealPricingRow}>
          <View>
            <Text style={s.dealMrp}>MRP Rs {deal.mrp}</Text>
            <Text style={s.dealCurrentPrice}>Rs {deal.currentTierPrice}</Text>
          </View>
          <View style={s.dealDiscBadge}><Text style={s.dealDiscText}>{discPct}% OFF</Text></View>
          <PricingModelBadge model={deal.pricingModel} />
        </View>
        {deal.priceTiers.length > 1 && deal.nextTierPrice ? (
          <View style={s.nextTierHint}>
            <Ionicons name="trending-down-outline" size={13} color="#059669" />
            <Text style={s.nextTierText}>Next tier: Rs {deal.nextTierPrice} — {deal.nextTierUnitsNeeded} more units needed</Text>
          </View>
        ) : null}
        <View style={s.dealProgress}>
          <View style={s.dealProgressTrack}>
            <View style={[s.dealProgressFill, { width: (Math.round(progress * 100) + '%') as any }]} />
          </View>
          <Text style={s.dealProgressText}>{deal.committedQty}/{deal.targetQty} units · {deal.daysLeft}d left</Text>
        </View>
        <View style={s.dealCardFooter}>
          <Countdown endsAt={deal.dealEndsAt || deal.endDate || new Date().toISOString()} label="Ends in" />
          <View style={s.viewDealBtn}><Text style={s.viewDealBtnText}>View Deal</Text></View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* Hero Banner */}
      <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <View style={s.heroBadge}>
              <Ionicons name="sparkles" size={12} color="#FEF3C7" />
              <Text style={s.heroBadgeText}>COMMUNITY WHOLESALE SAVINGS</Text>
            </View>
            <Text style={s.heroTitle}>Mana Group Buy</Text>
            <Text style={s.heroSub}>Buy Together. Pay Less. Your neighbours are your biggest discount.</Text>
          </View>
          <View style={s.heroIcon}>
            <Ionicons name="people" size={28} color="#fff" />
          </View>
        </View>
        {savings && (
          <View style={s.heroSavingsPill}>
            <Ionicons name="trending-down-outline" size={14} color="#FEF3C7" />
            <Text style={s.heroSavingsText}>Community saved Rs {(savings.totalSavedThisMonth / 1000).toFixed(0)}K this month · {savings.totalOrders} orders</Text>
          </View>
        )}
        <View style={s.heroStats}>
          <View style={s.heroStat}><Text style={s.heroStatNum}>{deals.length}</Text><Text style={s.heroStatLabel}>Active Deals</Text></View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}><Text style={s.heroStatNum}>{almostUnlocked.length}</Text><Text style={s.heroStatLabel}>Almost Unlocked</Text></View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStat}><Text style={s.heroStatNum}>{deals.filter(d => d.isFestivalDeal).length}</Text><Text style={s.heroStatLabel}>Festival</Text></View>
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput style={s.searchInput} placeholder="Search deals, vendors, products..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Nav */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickNavScroll}>
        {QUICK_NAV.map(nav => (
          <TouchableOpacity key={nav.route} style={s.quickNavItem} onPress={() => router.push(nav.route as any)} activeOpacity={0.8}>
            <View style={[s.quickNavIcon, { backgroundColor: nav.color + '18' }]}>
              <Ionicons name={nav.icon as any} size={20} color={nav.color} />
            </View>
            <Text style={s.quickNavLabel}>{nav.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat} style={[s.catChip, selectedCategory === cat && s.catChipActive]} onPress={() => setSelectedCategory(cat)}>
            <Text style={[s.catChipText, selectedCategory === cat && s.catChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Community Savings */}
      {savings && !searchQuery && selectedCategory === 'All' && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Community Savings</Text>
            <TouchableOpacity onPress={() => router.push('/group-buying/community-savings' as any)}>
              <Text style={s.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          <CommunitySavingsCard data={savings} />
        </View>
      )}

      {/* Almost Unlocked Rail */}
      {almostUnlocked.length > 0 && !searchQuery && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>⚡ Almost Unlocked</Text>
            <TouchableOpacity onPress={() => router.push('/group-buying/almost-unlocked' as any)}>
              <Text style={s.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalRail}>
            {almostUnlocked.map(deal => (
              <AlmostUnlockedCard key={deal.id} deal={deal} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Loading */}
      {loadingDeals && !refreshing && (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      )}

      {/* Trending Deals */}
      {!loadingDeals && trending.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔥 Trending Deals</Text>
          {trending.map(deal => <DealRow key={deal.id} deal={deal} />)}
        </View>
      )}

      {/* Festival Deals */}
      {!loadingDeals && festivalDeals.length > 0 && !searchQuery && selectedCategory === 'All' && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>🎉 Festival Deals</Text>
            <TouchableOpacity onPress={() => router.push('/group-buying/festival' as any)}>
              <Text style={s.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          {festivalDeals.map(deal => <DealRow key={deal.id} deal={deal} />)}
        </View>
      )}

      {/* All / Regular Deals */}
      {!loadingDeals && regularDeals.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>All Deals ({regularDeals.length})</Text>
          {regularDeals.map(deal => <DealRow key={deal.id} deal={deal} />)}
        </View>
      )}

      {/* No results */}
      {!loadingDeals && filteredDeals.length === 0 && (
        <View style={s.center}>
          <Ionicons name="cart-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No Deals Found</Text>
          <Text style={s.emptySub}>{searchQuery ? 'Try a different search term.' : 'New deals are added weekly. Check back soon!'}</Text>
        </View>
      )}

      {/* Bottom CTAs */}
      {!searchQuery && (
        <View style={s.bottomCtas}>
          <TouchableOpacity style={s.ctaCard} onPress={() => router.push('/group-buying/baskets' as any)}>
            <Text style={s.ctaEmoji}>📦</Text>
            <View><Text style={s.ctaTitle}>Monthly Baskets</Text><Text style={s.ctaSub}>Recurring family bundles</Text></View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaCard} onPress={() => router.push('/group-buying/demand' as any)}>
            <Text style={s.ctaEmoji}>💡</Text>
            <View><Text style={s.ctaTitle}>Community Demand Board</Text><Text style={s.ctaSub}>Request products at bulk prices</Text></View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaCard} onPress={() => router.push('/group-buying/buy-again' as any)}>
            <Text style={s.ctaEmoji}>🔁</Text>
            <View><Text style={s.ctaTitle}>Buy Again</Text><Text style={s.ctaSub}>Reorder your past purchases</Text></View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  hero: { padding: 20, paddingTop: 24, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: '#FEF3C7', letterSpacing: 0.5 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 18 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroSavingsPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  heroSavingsText: { fontSize: 12, color: '#FEF3C7', fontWeight: '600' },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 10 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  searchRow: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  quickNavScroll: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: 12 },
  quickNavItem: { alignItems: 'center', gap: 6, width: 68 },
  quickNavIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickNavLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  catScroll: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, flexDirection: 'row', gap: 8 },
  catChip: { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  section: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  horizontalRail: { paddingRight: SPACING.md, gap: 12 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  dealCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md },
  dealCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dealCatBadge: { backgroundColor: COLORS.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  dealCatText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  dealRightBadges: { flexDirection: 'row', gap: 5 },
  trendBadge: { backgroundColor: '#FEF3C7', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  trendBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  festBadge: { backgroundColor: '#EDE9FE', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  festBadgeText: { fontSize: 11 },
  urgentBadge: { backgroundColor: '#FEE2E2', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  urgentBadgeText: { fontSize: 10, fontWeight: '700', color: '#991B1B' },
  dealTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  dealVendorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dealVendorText: { fontSize: 12, color: COLORS.textMuted },
  dealPricingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  dealMrp: { fontSize: 12, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  dealCurrentPrice: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  dealDiscBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  dealDiscText: { fontSize: 12, fontWeight: '800', color: '#166534' },
  nextTierHint: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8 },
  nextTierText: { flex: 1, fontSize: 12, color: '#059669', fontWeight: '600' },
  dealProgress: { gap: 5 },
  dealProgressTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  dealProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  dealProgressText: { fontSize: 11, color: COLORS.textMuted },
  dealCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  viewDealBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  viewDealBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  bottomCtas: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg, gap: SPACING.sm },
  ctaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  ctaEmoji: { fontSize: 24 },
  ctaTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  ctaSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});