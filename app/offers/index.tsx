import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { offersService } from '@/services/offersService';
import type {
  CommunityOffer,
  UserOfferClaim,
} from '@/types/offers';

export default function DealsHubScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeClaimModal, setActiveClaimModal] = useState<UserOfferClaim | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['offerCategories'],
    queryFn: offersService.getCategories,
  });

  const {
    data: offers = [],
    isLoading: offersLoading,
    refetch: refetchOffers,
    isRefetching,
  } = useQuery({
    queryKey: ['communityOffers', selectedCategory],
    queryFn: () => offersService.getOffers(selectedCategory === 'ALL' ? undefined : selectedCategory),
  });

  const { data: claims = [], refetch: refetchClaims } = useQuery({
    queryKey: ['myClaims'],
    queryFn: offersService.getMyClaims,
  });

  const { data: marketDays = [], refetch: refetchMarkets } = useQuery({
    queryKey: ['farmersMarketDays'],
    queryFn: offersService.getMarketDays,
  });

  const { data: demandPools = [], refetch: refetchDemand } = useQuery({
    queryKey: ['demandPools'],
    queryFn: offersService.getDemandPools,
  });

  const { data: businesses = [], refetch: refetchBiz } = useQuery({
    queryKey: ['businessPartners'],
    queryFn: () => offersService.getBusinesses(),
  });

  const onRefresh = () => {
    refetchOffers();
    refetchClaims();
    refetchMarkets();
    refetchDemand();
    refetchBiz();
  };

  // ── Mutations ────────────────────────────────────────────────────────
  const claimMutation = useMutation({
    mutationFn: (offerId: string) => offersService.claimOffer(offerId),
    onSuccess: (newClaim) => {
      qc.invalidateQueries({ queryKey: ['myClaims'] });
      qc.invalidateQueries({ queryKey: ['communityOffers'] });
      setActiveClaimModal(newClaim);
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: (marketId: string) => offersService.rsvpMarketDay(marketId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmersMarketDays'] });
    },
  });

  const activeClaimsCount = claims.filter((c) => c.status === 'ACTIVE').length;
  const primaryMarket = marketDays[0];
  const activeDemandPool = demandPools[0];

  // Filter offers by search query
  const filteredOffers = offers.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.title.toLowerCase().includes(q) ||
      o.businessName.toLowerCase().includes(q) ||
      o.categoryName.toLowerCase().includes(q)
    );
  });

  const handleCopyCode = (code: string) => {
    Clipboard.setString(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Hero Savings Banner ──────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Ionicons name="flame" size={13} color="#F59E0B" />
              <Text style={styles.heroPillText}>Mana Resident Advantage</Text>
            </View>
            <View style={styles.savingsBox}>
              <Text style={styles.savingsAmount}>₹2,48,500+</Text>
              <Text style={styles.savingsLabel}>Resident Savings</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Hyperlocal Pricing You Won't Find Online</Text>
          <Text style={styles.heroDesc}>
            Vetted neighborhood partners pass aggregator commission savings directly to our society residents.
          </Text>
        </View>

        {/* ── 4 Key Navigation Hub Quick Actions ────────────────────────── */}
        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
            onPress={() => router.push('/offers/market-days' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.quickTopRow}>
              <View style={[styles.quickIconBox, { backgroundColor: '#059669' }]}>
                <Ionicons name="leaf" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.quickBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.quickBadgeText, { color: '#065F46' }]}>This Sat</Text>
              </View>
            </View>
            <Text style={styles.quickTitle}>Market Days</Text>
            <Text style={styles.quickSub}>Farmers & bakery stalls</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={() => router.push('/offers/demands' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.quickTopRow}>
              <View style={[styles.quickIconBox, { backgroundColor: '#2563EB' }]}>
                <Ionicons name="people" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.quickBadge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.quickBadgeText, { color: '#1E40AF' }]}>Wholesale</Text>
              </View>
            </View>
            <Text style={styles.quickTitle}>Group Buying</Text>
            <Text style={styles.quickSub}>Collective demand pools</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}
            onPress={() => router.push('/offers/partners' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.quickTopRow}>
              <View style={[styles.quickIconBox, { backgroundColor: '#7C3AED' }]}>
                <Ionicons name="storefront" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.quickBadge, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[styles.quickBadgeText, { color: '#6B21A8' }]}>Vetted</Text>
              </View>
            </View>
            <Text style={styles.quickTitle}>Merchant Directory</Text>
            <Text style={styles.quickSub}>Verified local businesses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
            onPress={() => router.push('/offers/my-claims' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.quickTopRow}>
              <View style={[styles.quickIconBox, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="ticket" size={16} color="#FFFFFF" />
              </View>
              {activeClaimsCount > 0 && (
                <View style={[styles.quickBadge, { backgroundColor: '#DC2626' }]}>
                  <Text style={[styles.quickBadgeText, { color: '#FFFFFF' }]}>{activeClaimsCount} Active</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickTitle}>Voucher Wallet</Text>
            <Text style={styles.quickSub}>QR pass & promo codes</Text>
          </TouchableOpacity>
        </View>

        {/* ── Weekend Farmers Market Highlight Banner ──────────────────── */}
        {primaryMarket && (
          <View style={styles.marketBanner}>
            <View style={styles.marketBannerHeader}>
              <View style={styles.marketBadge}>
                <Ionicons name="sparkles" size={12} color="#FDE68A" />
                <Text style={styles.marketBadgeText}>WEEKEND SOCIETY EVENT</Text>
              </View>
              <TouchableOpacity
                style={[styles.marketRsvpBtn, primaryMarket.userRsvp && styles.marketRsvpBtnActive]}
                onPress={() => rsvpMutation.mutate(primaryMarket.id)}
              >
                <Ionicons
                  name={primaryMarket.userRsvp ? 'checkmark' : 'calendar-outline'}
                  size={12}
                  color={primaryMarket.userRsvp ? '#065F46' : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.marketRsvpText,
                    primaryMarket.userRsvp && { color: '#065F46' },
                  ]}
                >
                  {primaryMarket.userRsvp ? 'RSVP Done' : 'RSVP'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.marketBannerTitle}>{primaryMarket.title}</Text>
            <Text style={styles.marketBannerTime}>
              📅 {primaryMarket.date} · ⏰ {primaryMarket.time} · 📍 Clubhouse Lawn
            </Text>

            <View style={styles.marketBannerFooter}>
              <Text style={styles.marketStallsCount}>
                👨‍🌾 {primaryMarket.vendorCount} Confirmed Stalls · {primaryMarket.rsvpCount} Attending
              </Text>
              <TouchableOpacity
                style={styles.viewStallsBtn}
                onPress={() => router.push('/offers/market-days' as any)}
              >
                <Text style={styles.viewStallsBtnText}>View Stalls & Pre-Order →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Active Collective Demand Pool Sneak Peek ────────────────── */}
        {activeDemandPool && (
          <TouchableOpacity
            style={styles.demandTeaserCard}
            onPress={() => router.push('/offers/demands' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.demandTeaserHead}>
              <View style={styles.demandPill}>
                <Text style={styles.demandPillText}>⚡ GROUP BUY CAMPAIGN</Text>
              </View>
              <Text style={styles.demandSavingsTag}>
                Save ₹{(activeDemandPool.regularPrice - activeDemandPool.discountedPrice).toLocaleString('en-IN')}
              </Text>
            </View>

            <Text style={styles.demandTeaserTitle}>{activeDemandPool.title}</Text>
            <Text style={styles.demandTeaserProduct}>📦 {activeDemandPool.targetProduct}</Text>

            <View style={styles.demandProgressRow}>
              <Text style={styles.demandProgressLabel}>
                {activeDemandPool.currentSupporters} of {activeDemandPool.targetCount} committed neighbors
              </Text>
              <Text style={styles.demandProgressVal}>
                ₹{activeDemandPool.discountedPrice.toLocaleString('en-IN')}{' '}
                <Text style={styles.demandRetailStriked}>₹{activeDemandPool.regularPrice}</Text>
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Search Bar & Category Filters ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Resident Offers</Text>
          <Text style={styles.sectionSub}>Exclusive discounts claimable at local checkout</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deals, clinics, salons, car care..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map((c) => {
            const isSel = selectedCategory === c.code;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catPill, isSel && styles.catPillSelected]}
                onPress={() => setSelectedCategory(c.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catPillText, isSel && styles.catPillTextSelected]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Deals Feed ──────────────────────────────────────────────── */}
        {offersLoading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={COLORS.primary} size="large" />
        ) : (
          <View style={styles.dealsList}>
            {filteredOffers.map((offer) => (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerHeader}>
                  <View style={styles.bizInfo}>
                    <Text style={styles.bizName}>{offer.businessName}</Text>
                    <Text style={styles.bizCategory}>
                      {offer.categoryName} · 📍 {offer.distanceKm} km from gate
                    </Text>
                  </View>
                  {offer.discountPercentage && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{offer.discountPercentage}% OFF</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.offerTitle}>{offer.title}</Text>
                {offer.tagline && <Text style={styles.offerTagline}>✨ {offer.tagline}</Text>}
                <Text style={styles.offerDesc}>{offer.description}</Text>

                {/* Price & Claim Row */}
                <View style={styles.priceAndClaimRow}>
                  <View style={styles.priceBox}>
                    {offer.communityPrice !== undefined ? (
                      <>
                        <Text style={styles.communityPriceText}>₹{offer.communityPrice}</Text>
                        {offer.originalPrice && (
                          <Text style={styles.originalPriceText}>₹{offer.originalPrice}</Text>
                        )}
                      </>
                    ) : (
                      <Text style={styles.communityPriceText}>Society Special</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={() => claimMutation.mutate(offer.id)}
                    disabled={claimMutation.isPending}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="ticket-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.claimBtnText}>Claim Voucher</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.offerFooter}>
                  <Text style={styles.offerValidText}>⏳ Valid until {offer.validUntil}</Text>
                  <Text style={styles.offerClaimedText}>🔥 {offer.claimedCount} residents claimed</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Top Verified Merchants Spotlight ────────────────────────── */}
        {businesses.length > 0 && (
          <View style={styles.merchantSpotlightBox}>
            <View style={styles.spotlightHeader}>
              <Text style={styles.spotlightTitle}>Top Local Verified Partners</Text>
              <TouchableOpacity onPress={() => router.push('/offers/partners' as any)}>
                <Text style={styles.viewAllText}>View All Directory →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {businesses.slice(0, 4).map((b) => (
                <View key={b.id} style={styles.spotlightCard}>
                  <View style={styles.spotlightTop}>
                    <Text style={styles.spotlightBizName} numberOfLines={1}>{b.name}</Text>
                    <View style={styles.spotlightRating}>
                      <Ionicons name="star" size={11} color="#D97706" />
                      <Text style={styles.spotlightRatingText}>{b.averageRating}</Text>
                    </View>
                  </View>
                  <Text style={styles.spotlightCat}>{b.categoryName}</Text>
                  <Text style={styles.spotlightDiscount} numberOfLines={2}>
                    🏷️ {b.societyDiscount || 'Resident exclusive rates'}
                  </Text>
                  <Text style={styles.spotlightDist}>📍 {b.distanceKm} km away</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* ── Voucher Claimed Pass Modal ───────────────────────────────── */}
      <Modal visible={!!activeClaimModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Voucher Pass Unlocked!</Text>
                <Text style={styles.modalSubtitle}>Added to your Resident Wallet</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveClaimModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {activeClaimModal && (
              <View style={styles.qrContent}>
                <Text style={styles.qrBizName}>{activeClaimModal.businessName}</Text>
                <Text style={styles.qrOfferTitle}>{activeClaimModal.offerTitle}</Text>

                {/* Simulated QR Code Box */}
                <View style={styles.simulatedQrBox}>
                  <Ionicons name="qr-code" size={140} color="#1E1B4B" />
                  <Text style={styles.qrCodeText}>{activeClaimModal.voucherCode}</Text>
                  {activeClaimModal.counterPin && (
                    <Text style={styles.counterPinText}>Counter PIN: {activeClaimModal.counterPin}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.copyCodeBtn}
                  onPress={() => handleCopyCode(activeClaimModal.voucherCode)}
                >
                  <Ionicons
                    name={copiedCode ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={styles.copyCodeText}>
                    {copiedCode ? 'Promo Code Copied!' : 'Copy Promo Code'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.qrInstructions}>
                  Show this QR pass or mention promo code at the checkout counter to apply your resident discount.
                </Text>

                <TouchableOpacity
                  style={styles.goToWalletBtn}
                  onPress={() => {
                    setActiveClaimModal(null);
                    router.push('/offers/my-claims' as any);
                  }}
                >
                  <Text style={styles.goToWalletBtnText}>View in My Voucher Wallet</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  // ── Hero Banner ───────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#064E3B',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  heroPillText: { fontSize: 10, fontFamily: 'DMSans-Bold', fontWeight: '800', color: '#FDE68A' },
  savingsBox: { alignItems: 'flex-end' },
  savingsAmount: { fontSize: 16, fontWeight: '900', color: '#34D399' },
  savingsLabel: { fontSize: 9, color: '#A7F3D0' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  heroDesc: { fontSize: 12, color: '#D1FAE5', lineHeight: 17 },

  // ── 4 Quick Actions ───────────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.md,
  },
  quickCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  quickTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickIconBox: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  quickBadgeText: { fontSize: 9, fontWeight: '800' },
  quickTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  quickSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },

  // ── Farmers Market Highlight ──────────────────────────────────────
  marketBanner: {
    backgroundColor: '#047857',
    padding: 14,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  marketBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  marketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  marketBadgeText: { fontSize: 9, fontWeight: '800', color: '#FDE68A' },
  marketRsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#065F46',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  marketRsvpBtnActive: { backgroundColor: '#D1FAE5' },
  marketRsvpText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  marketBannerTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  marketBannerTime: { fontSize: 11, color: '#D1FAE5', marginBottom: 8 },
  marketBannerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 8,
  },
  marketStallsCount: { fontSize: 11, color: '#FDE68A', fontWeight: '700' },
  viewStallsBtn: {},
  viewStallsBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', textDecorationLine: 'underline' },

  // ── Demand Teaser ─────────────────────────────────────────────────
  demandTeaserCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  demandTeaserHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  demandPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  demandPillText: { fontSize: 9, fontWeight: '800', color: '#1D4ED8' },
  demandSavingsTag: { fontSize: 11, fontWeight: '900', color: '#059669' },
  demandTeaserTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  demandTeaserProduct: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  demandProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  demandProgressLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  demandProgressVal: { fontSize: 13, fontWeight: '900', color: '#059669' },
  demandRetailStriked: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },

  // ── Section Header ────────────────────────────────────────────────
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  sectionSub: { fontSize: 12, color: COLORS.textMuted },

  // ── Search & Filter ───────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
  catScroll: { flexDirection: 'row', gap: 6, paddingBottom: 14 },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  catPillTextSelected: { color: '#FFFFFF' },

  // ── Deals List ────────────────────────────────────────────────────
  dealsList: { gap: SPACING.md },
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bizInfo: { flex: 1 },
  bizName: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  bizCategory: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  discountBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  discountBadgeText: { fontSize: 11, fontWeight: '900', color: '#DC2626' },
  offerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  offerTagline: { fontSize: 12, fontWeight: '700', color: '#D97706', marginBottom: 6 },
  offerDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 12 },
  priceAndClaimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  priceBox: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  communityPriceText: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  originalPriceText: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  claimBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  offerValidText: { fontSize: 11, color: COLORS.textMuted },
  offerClaimedText: { fontSize: 11, fontWeight: '700', color: '#D97706' },

  // ── Merchant Spotlight ────────────────────────────────────────────
  merchantSpotlightBox: {
    marginTop: SPACING.xl,
  },
  spotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  spotlightTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  viewAllText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  spotlightCard: {
    width: 170,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  spotlightTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  spotlightBizName: { fontSize: 12, fontWeight: '800', color: COLORS.text, flex: 1 },
  spotlightRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  spotlightRatingText: { fontSize: 10, fontWeight: '800', color: '#B45309' },
  spotlightCat: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  spotlightDiscount: { fontSize: 11, fontWeight: '700', color: '#059669', marginBottom: 6 },
  spotlightDist: { fontSize: 10, color: COLORS.textMuted },

  // ── Modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#059669' },
  modalSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  qrContent: { alignItems: 'center', marginTop: 12 },
  qrBizName: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  qrOfferTitle: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  simulatedQrBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 12,
    width: '100%',
  },
  qrCodeText: { fontSize: 16, fontWeight: '900', color: '#1E1B4B', letterSpacing: 2, marginTop: 8 },
  counterPinText: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    marginBottom: 10,
  },
  copyCodeText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  qrInstructions: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
  goToWalletBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 14,
  },
  goToWalletBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
