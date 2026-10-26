import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import CommunitySavingsCard from '@/components/group-buying/CommunitySavingsCard';
import AlmostUnlockedCard from '@/components/group-buying/AlmostUnlockedCard';
import PricingModelBadge from '@/components/group-buying/PricingModelBadge';
import Countdown from '@/components/group-buying/Countdown';

const CATEGORIES = [
  { value: 'All',           label: 'All',         icon: 'grid-outline' as const,            color: '#4F46E5', bg: '#EEF2FF' },
  { value: 'Grocery',       label: 'Grocery',      icon: 'cart-outline' as const,            color: '#059669', bg: '#ECFDF5' },
  { value: 'Fresh',         label: 'Fresh',        icon: 'leaf-outline' as const,            color: '#16A34A', bg: '#DCFCE7' },
  { value: 'Dairy',         label: 'Dairy',        icon: 'water-outline' as const,           color: '#0284C7', bg: '#E0F2FE' },
  { value: 'Home',          label: 'Home',         icon: 'home-outline' as const,            color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'Personal Care', label: 'Care',         icon: 'heart-outline' as const,           color: '#DB2777', bg: '#FCE7F3' },
  { value: 'Kids',          label: 'Kids',         icon: 'happy-outline' as const,           color: '#EA580C', bg: '#FFF7ED' },
  { value: 'Festival',      label: 'Festival',     icon: 'gift-outline' as const,            color: '#D97706', bg: '#FEF3C7' },
  { value: 'Electronics',   label: 'Electronics',  icon: 'phone-portrait-outline' as const,  color: '#2563EB', bg: '#EFF6FF' },
];

const HUB_ACTIONS = [
  { emoji: '🔥', label: 'Hot Deals',    color: '#EF4444', bg: '#FEF2F2', route: '/group-buying' },
  { emoji: '✨', label: 'Ask AI',       color: '#6366F1', bg: '#EEF2FF', route: '/group-buying/ask-community' },
  { emoji: '🏢', label: 'Tower Groups', color: '#059669', bg: '#ECFDF5', route: '/group-buying/tower-groups' },
  { emoji: '⚡', label: 'Almost There', color: '#F59E0B', bg: '#FFFBEB', route: '/group-buying/almost-unlocked' },
  { emoji: '🎉', label: 'Festival',     color: '#8B5CF6', bg: '#F5F3FF', route: '/group-buying/festival' },
  { emoji: '📦', label: 'Baskets',      color: '#059669', bg: '#ECFDF5', route: '/group-buying/baskets' },
  { emoji: '🔁', label: 'Buy Again',    color: '#0EA5E9', bg: '#F0F9FF', route: '/group-buying/buy-again' },
  { emoji: '💡', label: 'Demand',       color: '#D97706', bg: '#FFFBEB', route: '/group-buying/demand' },
  { emoji: '📋', label: 'My Orders',    color: '#6B7280', bg: '#F3F4F6', route: '/group-buying/orders' },
  { emoji: '🏆', label: 'Savings',      color: '#7C3AED', bg: '#F5F3FF', route: '/group-buying/community-savings' },
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

  function DealCard({ deal }: { deal: (typeof deals)[0] }) {
    const discPct = Math.round(((deal.mrp - deal.currentTierPrice) / deal.mrp) * 100);
    const progress = Math.min(1, deal.committedQty / deal.targetQty);
    const catCfg = CATEGORIES.find(c => c.value === deal.category) || CATEGORIES[0];

    return (
      <TouchableOpacity
        style={s.dealCard}
        onPress={() => router.push(('/group-buying/deal/' + deal.id) as any)}
        activeOpacity={0.85}
      >
        {/* Top: Category + badges */}
        <View style={s.dealTopRow}>
          <View style={[s.dealCatPill, { backgroundColor: catCfg.bg }]}>
            <Ionicons name={catCfg.icon} size={11} color={catCfg.color} />
            <Text style={[s.dealCatText, { color: catCfg.color }]}>{deal.category}</Text>
          </View>
          <View style={s.dealBadges}>
            {deal.isTrending && (
              <View style={s.hotBadge}><Text style={s.hotBadgeText}>🔥 Hot</Text></View>
            )}
            {deal.isFestivalDeal && (
              <View style={s.festBadge}><Text style={s.festBadgeText}>🎉 Fest</Text></View>
            )}
            {(deal.isEndingSoon || deal.daysLeft <= 1) && (
              <View style={s.urgentBadge}><Text style={s.urgentBadgeText}>⚡ Ends Soon</Text></View>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={s.dealTitle} numberOfLines={2}>{deal.title}</Text>

        {/* Vendor row */}
        <View style={s.vendorRow}>
          <View style={[s.vendorAvatar, { backgroundColor: catCfg.bg }]}>
            <Ionicons name="storefront" size={12} color={catCfg.color} />
          </View>
          <Text style={s.vendorName} numberOfLines={1}>{deal.vendor}</Text>
          {deal.vendorVerified && <Ionicons name="checkmark-circle" size={13} color="#059669" />}
          <View style={s.ratingChip}>
            <Ionicons name="star" size={10} color="#F59E0B" />
            <Text style={s.ratingVal}>{deal.vendorRating}</Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={s.priceBlock}>
          <View style={{ flex: 1 }}>
            <Text style={s.mrpText}>MRP ₹{deal.mrp}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={s.currentPrice}>₹{deal.currentTierPrice}</Text>
              <PricingModelBadge model={deal.pricingModel} />
            </View>
          </View>
          <View style={s.discBadge}>
            <Ionicons name="arrow-down" size={11} color="#166534" />
            <Text style={s.discText}>{discPct}%</Text>
          </View>
        </View>

        {/* Next tier hint */}
        {deal.priceTiers.length > 1 && deal.nextTierPrice ? (
          <View style={s.nextTier}>
            <Ionicons name="trending-down" size={13} color="#059669" />
            <Text style={s.nextTierText}>
              Next: ₹{deal.nextTierPrice} — {deal.nextTierUnitsNeeded} more units needed
            </Text>
          </View>
        ) : null}

        {/* Progress */}
        <View style={s.progressBlock}>
          <View style={s.progressTrack}>
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.progressFill, { width: (Math.round(progress * 100) + '%') as any }]}
            />
          </View>
          <View style={s.progressMeta}>
            <Text style={s.progressLeft}>{deal.committedQty}/{deal.targetQty} units joined</Text>
            <Text style={s.progressRight}>{deal.daysLeft}d left</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.dealFooter}>
          <Countdown endsAt={deal.dealEndsAt || deal.endDate || new Date().toISOString()} label="Ends in" />
          <TouchableOpacity style={s.joinBtn}>
            <Text style={s.joinBtnText}>Join Deal</Text>
            <Ionicons name="arrow-forward" size={13} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor="#4F46E5" />
      }
    >
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={['#312E81', '#4F46E5', '#6366F1']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTopRow}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs/feed')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>👜  Group Buy</Text>
            <Text style={s.headerSub}>Buy Together · Pay Less · Save More</Text>
          </View>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => router.push('/group-buying/orders' as any)}
          >
            <Ionicons name="receipt-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Savings highlight pill */}
        {savings && (
          <View style={s.savingsPill}>
            <Ionicons name="trending-down" size={13} color="#FEF3C7" />
            <Text style={s.savingsText}>
              Community saved ₹{(savings.totalSavedThisMonth / 1000).toFixed(0)}K this month · {savings.totalOrders} orders
            </Text>
          </View>
        )}

        {/* Stats strip */}
        <View style={s.headerStats}>
          {[
            { label: 'Active Deals', value: String(deals.length || '0'), icon: 'pricetag' as const },
            { label: 'Almost Done', value: String(almostUnlocked.length || '0'), icon: 'flash' as const },
            { label: 'Festival', value: String(deals.filter(d => d.isFestivalDeal).length || '0'), icon: 'gift' as const },
          ].map((st) => (
            <View key={st.label} style={s.headerStat}>
              <Ionicons name={st.icon} size={13} color="rgba(255,255,255,0.8)" />
              <Text style={s.headerStatValue}>{st.value}</Text>
              <Text style={s.headerStatLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search deals, vendors, products..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Hub Actions Grid (5 per row, 2 rows) ── */}
      <View style={s.hubGrid}>
        {HUB_ACTIONS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={s.hubItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <View style={[s.hubIcon, { backgroundColor: item.bg }]}>
              <Text style={s.hubEmoji}>{item.emoji}</Text>
            </View>
            <Text style={s.hubLabel} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Category Filter Grid ── */}
      <View style={s.catGrid}>
        {CATEGORIES.map((c) => {
          const active = selectedCategory === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              style={[s.catItem, active && { borderColor: c.color, borderWidth: 2 }]}
              onPress={() => setSelectedCategory(c.value)}
              activeOpacity={0.75}
            >
              <View style={[s.catIcon, { backgroundColor: active ? c.color : c.bg }]}>
                <Ionicons name={c.icon} size={16} color={active ? '#fff' : c.color} />
              </View>
              <Text style={[s.catLabel, active && { color: c.color, fontWeight: '800' }]} numberOfLines={1}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Community Savings ── */}
      {savings && !searchQuery && selectedCategory === 'All' && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>💰 Community Savings</Text>
            <TouchableOpacity onPress={() => router.push('/group-buying/community-savings' as any)}>
              <Text style={s.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          <CommunitySavingsCard data={savings} />
        </View>
      )}

      {/* ── Almost Unlocked Rail ── */}
      {almostUnlocked.length > 0 && !searchQuery && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={s.sectionTitle}>Almost Unlocked</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{almostUnlocked.length}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/group-buying/almost-unlocked' as any)}>
              <Text style={s.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hRail}>
            {almostUnlocked.map(deal => (
              <AlmostUnlockedCard key={deal.id} deal={deal} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Loading */}
      {loadingDeals && !refreshing && (
        <View style={s.center}><ActivityIndicator size="large" color="#4F46E5" /></View>
      )}

      {/* ── Trending Deals ── */}
      {!loadingDeals && trending.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionDot, { backgroundColor: '#EF4444' }]} />
            <Text style={s.sectionTitle}>Trending Deals</Text>
            <View style={[s.countBadge, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[s.countBadgeText, { color: '#EF4444' }]}>{trending.length}</Text>
            </View>
          </View>
          {trending.map(deal => <DealCard key={deal.id} deal={deal} />)}
        </View>
      )}

      {/* ── Ending Soon ── */}
      {!loadingDeals && endingSoon.length > 0 && !searchQuery && selectedCategory === 'All' && (
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionDot, { backgroundColor: '#DC2626' }]} />
            <Text style={s.sectionTitle}>Ending Soon</Text>
          </View>
          {endingSoon.map(deal => <DealCard key={deal.id} deal={deal} />)}
        </View>
      )}

      {/* ── Festival Deals ── */}
      {!loadingDeals && festivalDeals.length > 0 && !searchQuery && selectedCategory === 'All' && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleRow}>
              <View style={[s.sectionDot, { backgroundColor: '#8B5CF6' }]} />
              <Text style={s.sectionTitle}>Festival Deals</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/group-buying/festival' as any)}>
              <Text style={s.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          {festivalDeals.map(deal => <DealCard key={deal.id} deal={deal} />)}
        </View>
      )}

      {/* ── All Deals ── */}
      {!loadingDeals && regularDeals.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <View style={[s.sectionDot, { backgroundColor: '#4F46E5' }]} />
            <Text style={s.sectionTitle}>All Deals</Text>
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{regularDeals.length}</Text>
            </View>
          </View>
          {regularDeals.map(deal => <DealCard key={deal.id} deal={deal} />)}
        </View>
      )}

      {/* No results */}
      {!loadingDeals && filteredDeals.length === 0 && (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="cart-outline" size={40} color="#A5B4FC" />
          </View>
          <Text style={s.emptyTitle}>No Deals Found</Text>
          <Text style={s.emptySub}>
            {searchQuery ? 'Try a different search term.' : 'New deals are added weekly. Check back soon!'}
          </Text>
        </View>
      )}

      {/* ── Bottom CTAs ── */}
      {!searchQuery && (
        <View style={s.bottomCtas}>
          {[
            { emoji: '📦', title: 'Monthly Baskets', sub: 'Recurring family bundles at wholesale prices', route: '/group-buying/baskets', accent: '#059669' },
            { emoji: '💡', title: 'Community Demand Board', sub: 'Request products at bulk prices together', route: '/group-buying/demand', accent: '#D97706' },
            { emoji: '🔁', title: 'Buy Again', sub: 'Reorder your past purchases instantly', route: '/group-buying/buy-again', accent: '#0EA5E9' },
          ].map((cta) => (
            <TouchableOpacity
              key={cta.route}
              style={s.ctaCard}
              onPress={() => router.push(cta.route as any)}
              activeOpacity={0.8}
            >
              <View style={[s.ctaIconBox, { backgroundColor: cta.accent + '15' }]}>
                <Text style={s.ctaEmoji}>{cta.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.ctaTitle}>{cta.title}</Text>
                <Text style={s.ctaSub}>{cta.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 36 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 32 },

  // Header
  header: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, gap: 10 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  savingsPill: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start',
  },
  savingsText: { fontSize: 11, color: '#FEF3C7', fontWeight: '600' },
  headerStats: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, paddingVertical: 8,
  },
  headerStat: { flex: 1, alignItems: 'center', gap: 2 },
  headerStatValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  // Search
  searchWrap: { paddingHorizontal: 12, paddingTop: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, paddingVertical: 0 },

  // Hub Grid
  hubGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12,
    paddingTop: 14, gap: 8,
  },
  hubItem: {
    width: '18%', flexGrow: 1, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 8,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  hubIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  hubEmoji: { fontSize: 16 },
  hubLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  // Category Grid
  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7,
    paddingHorizontal: 12, paddingTop: 12,
  },
  catItem: {
    width: '20%', flexGrow: 1, alignItems: 'center', gap: 3,
    backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 7,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  catIcon: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 9, fontWeight: '600', color: COLORS.textMuted, textAlign: 'center' },

  // Section
  section: { paddingHorizontal: 12, paddingTop: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  seeAll: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  countBadge: {
    backgroundColor: '#EEF2FF', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  countBadgeText: { fontSize: 10, fontWeight: '800', color: '#4F46E5' },
  hRail: { paddingRight: 12, gap: 10 },

  // Deal Card
  dealCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    gap: 8, borderWidth: 1, borderColor: '#E8E8F0', ...SHADOWS.sm,
  },
  dealTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dealCatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  dealCatText: { fontSize: 10, fontWeight: '700' },
  dealBadges: { flexDirection: 'row', gap: 4 },
  hotBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  hotBadgeText: { fontSize: 9, fontWeight: '700', color: '#92400E' },
  festBadge: { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  festBadgeText: { fontSize: 9, fontWeight: '700', color: '#6D28D9' },
  urgentBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  urgentBadgeText: { fontSize: 9, fontWeight: '700', color: '#991B1B' },
  dealTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vendorAvatar: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  vendorName: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  ratingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  ratingVal: { fontSize: 10, fontWeight: '700', color: '#D97706' },
  priceBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mrpText: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  currentPrice: { fontSize: 22, fontWeight: '900', color: '#4F46E5' },
  discBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#DCFCE7', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  discText: { fontSize: 13, fontWeight: '900', color: '#166534' },
  nextTier: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  nextTierText: { flex: 1, fontSize: 11, color: '#059669', fontWeight: '600' },
  progressBlock: { gap: 4 },
  progressTrack: {
    height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLeft: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  progressRight: { fontSize: 10, color: '#4F46E5', fontWeight: '700' },
  dealFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8,
  },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#4F46E5', borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 7, ...SHADOWS.sm,
  },
  joinBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Empty
  center: { alignItems: 'center', justifyContent: 'center', padding: 48, gap: 10 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  // Bottom CTAs
  bottomCtas: { paddingHorizontal: 12, marginTop: 16, gap: 8 },
  ctaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#E8E8F0', ...SHADOWS.sm,
  },
  ctaIconBox: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaEmoji: { fontSize: 20 },
  ctaTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  ctaSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
});
