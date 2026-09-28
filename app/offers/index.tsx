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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { offersService } from '@/services/offersService';
import type {
  CommunityOffer,
  CommerceCategory,
  UserOfferClaim,
  CommunityDemandPool,
  BusinessPartner,
} from '@/types/offers';

type TabType = 'DEALS' | 'CLAIMS' | 'DEMAND' | 'DIRECTORY';

export default function OffersScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('DEALS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeClaimModal, setActiveClaimModal] = useState<UserOfferClaim | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['offerCategories'],
    queryFn: offersService.getCategories,
  });

  const { data: offers = [], isLoading: offersLoading, refetch: refetchOffers, isRefetching } = useQuery({
    queryKey: ['communityOffers', selectedCategory],
    queryFn: () => offersService.getOffers(selectedCategory === 'ALL' ? undefined : selectedCategory),
  });

  const { data: claims = [], isLoading: claimsLoading, refetch: refetchClaims } = useQuery({
    queryKey: ['myClaims'],
    queryFn: offersService.getMyClaims,
  });

  const { data: demandPools = [], isLoading: demandLoading, refetch: refetchDemand } = useQuery({
    queryKey: ['demandPools'],
    queryFn: offersService.getDemandPools,
  });

  const { data: businesses = [], isLoading: bizLoading, refetch: refetchBiz } = useQuery({
    queryKey: ['businessPartners'],
    queryFn: offersService.getBusinesses,
  });

  const isLoading = offersLoading || claimsLoading || demandLoading || bizLoading;

  const onRefresh = () => {
    refetchOffers();
    refetchClaims();
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

  const supportDemandMutation = useMutation({
    mutationFn: (poolId: string) => offersService.supportDemandPool(poolId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demandPools'] });
      Alert.alert('Joined Group Pool!', 'Your participation has been added. When target is reached, bulk discount will unlock.');
    },
  });

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
              <Ionicons name="flame" size={12} color="#D97706" />
              <Text style={styles.heroPillText}>Mana Community Advantage</Text>
            </View>
            <View style={styles.savingsBox}>
              <Text style={styles.savingsAmount}>₹1,84,500+</Text>
              <Text style={styles.savingsLabel}>Community Savings</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Hyperlocal Pricing You Won't Find Online</Text>
          <Text style={styles.heroDesc}>
            Verified neighborhood businesses give lower rates directly to our residents by skipping delivery aggregators.
          </Text>
        </View>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
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

        {/* ── Category Filter Pills ───────────────────────────────────── */}
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

        {/* ── Navigation Tab Bar ──────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {[
            { key: 'DEALS', label: 'All Deals', icon: 'pricetag-outline' },
            { key: 'CLAIMS', label: 'My Vouchers', icon: 'ticket-outline' },
            { key: 'DEMAND', label: 'Group Buying', icon: 'people-outline' },
            { key: 'DIRECTORY', label: 'Directory', icon: 'storefront-outline' },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key as TabType)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon as any} size={15} color={isActive ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <>
            {/* ── TAB 1: ALL DEALS ────────────────────────────────────── */}
            {activeTab === 'DEALS' && (
              <View style={styles.tabContent}>
                {filteredOffers.map((offer) => (
                  <View key={offer.id} style={styles.offerCard}>
                    <View style={styles.offerHeader}>
                      <View style={styles.bizInfo}>
                        <Text style={styles.bizName}>{offer.businessName}</Text>
                        <Text style={styles.bizCategory}>
                          {offer.categoryName} · 📍 {offer.distanceKm} km away
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
                        {offer.communityPrice ? (
                          <>
                            <Text style={styles.communityPriceText}>₹{offer.communityPrice}</Text>
                            {offer.originalPrice && (
                              <Text style={styles.originalPriceText}>₹{offer.originalPrice}</Text>
                            )}
                          </>
                        ) : (
                          <Text style={styles.communityPriceText}>Special Offer</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.claimBtn}
                        onPress={() => claimMutation.mutate(offer.id)}
                        disabled={claimMutation.isPending}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="ticket-outline" size={16} color="#fff" />
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

            {/* ── TAB 2: MY VOUCHERS / CLAIMS ─────────────────────────── */}
            {activeTab === 'CLAIMS' && (
              <View style={styles.tabContent}>
                {claims.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="ticket-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No Claimed Vouchers Yet</Text>
                    <Text style={styles.emptySub}>Browse community deals and claim vouchers to redeem at stores.</Text>
                  </View>
                ) : (
                  claims.map((c) => (
                    <View key={c.id} style={styles.voucherCard}>
                      <View style={styles.voucherTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.voucherBiz}>{c.businessName}</Text>
                          <Text style={styles.voucherTitle}>{c.offerTitle}</Text>
                          <Text style={styles.voucherDiscount}>{c.discountSummary}</Text>
                        </View>
                        <View style={styles.voucherStatusBadge}>
                          <Text style={styles.voucherStatusText}>{c.status}</Text>
                        </View>
                      </View>

                      {/* Code Box */}
                      <View style={styles.voucherCodeBox}>
                        <View>
                          <Text style={styles.voucherCodeLabel}>PROMO CODE AT COUNTER</Text>
                          <Text style={styles.voucherCode}>{c.voucherCode}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.showQrBtn}
                          onPress={() => setActiveClaimModal(c)}
                        >
                          <Ionicons name="qr-code-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.showQrBtnText}>Show QR</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.voucherValidUntil}>📅 Valid until {c.validUntil}</Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 3: GROUP DEMAND POOLS ────────────────────────────── */}
            {activeTab === 'DEMAND' && (
              <View style={styles.tabContent}>
                <View style={styles.demandHeader}>
                  <Text style={styles.demandHeading}>Collective Resident Demand</Text>
                  <Text style={styles.demandSub}>
                    When enough neighbors commit, wholesale bulk discounts unlock automatically!
                  </Text>
                </View>

                {demandPools.map((dp) => {
                  const pct = Math.min((dp.currentSupporters / dp.targetCount) * 100, 100);
                  const isLockedIn = dp.status === 'LOCKED_IN';
                  return (
                    <View key={dp.id} style={styles.demandCard}>
                      <View style={styles.demandTopRow}>
                        <View style={styles.demandCatPill}>
                          <Text style={styles.demandCatText}>{dp.category}</Text>
                        </View>
                        <View style={[styles.demandStatusPill, isLockedIn && { backgroundColor: '#D1FAE5' }]}>
                          <Text style={[styles.demandStatusText, isLockedIn && { color: '#065F46' }]}>
                            {isLockedIn ? '✅ DISCOUNT UNLOCKED' : '⚡ GATHERING SUPPORT'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.demandTitle}>{dp.title}</Text>
                      <Text style={styles.demandProduct}>📦 {dp.targetProduct}</Text>

                      <View style={styles.demandPriceRow}>
                        <View>
                          <Text style={styles.demandPriceLabel}>GROUP PRICE</Text>
                          <Text style={styles.demandPriceVal}>₹{dp.discountedPrice}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.demandPriceLabel}>REGULAR RETAIL</Text>
                          <Text style={styles.demandRetailVal}>₹{dp.regularPrice}</Text>
                        </View>
                      </View>

                      {/* Progress */}
                      <View style={styles.demandProgressBox}>
                        <View style={styles.demandProgressHead}>
                          <Text style={styles.demandProgressText}>
                            {dp.currentSupporters} of {dp.targetCount} Neighbors Committed
                          </Text>
                          <Text style={styles.demandProgressPct}>{Math.round(pct)}%</Text>
                        </View>
                        <View style={styles.demandProgressBarBg}>
                          <View style={[styles.demandProgressBarFill, { width: `${pct}%` }]} />
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.joinDemandBtn, dp.userSupported && styles.joinDemandBtnActive]}
                        onPress={() => supportDemandMutation.mutate(dp.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={dp.userSupported ? 'checkmark-circle' : 'hand-right-outline'}
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.joinDemandBtnText}>
                          {dp.userSupported ? 'You Have Committed' : 'Join Group Buy Demand'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── TAB 4: DIRECTORY ────────────────────────────────────── */}
            {activeTab === 'DIRECTORY' && (
              <View style={styles.tabContent}>
                {businesses.map((biz) => (
                  <View key={biz.id} style={styles.bizCard}>
                    <View style={styles.bizHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.bizNameRow}>
                          <Text style={styles.bizCardName}>{biz.name}</Text>
                          {biz.isVerified && (
                            <Ionicons name="checkmark-circle" size={16} color="#059669" />
                          )}
                        </View>
                        <Text style={styles.bizCardCat}>{biz.categoryName} · {biz.tagline}</Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#D97706" />
                        <Text style={styles.ratingText}>{biz.averageRating}</Text>
                      </View>
                    </View>

                    <Text style={styles.bizAddress}>📍 {biz.address} ({biz.distanceKm} km)</Text>

                    <View style={styles.bizActionRow}>
                      <TouchableOpacity
                        style={styles.bizCallBtn}
                        onPress={() => Alert.alert('Contact Merchant', `Calling ${biz.phone}...`)}
                      >
                        <Ionicons name="call-outline" size={15} color={COLORS.primary} />
                        <Text style={styles.bizCallText}>Call Partner</Text>
                      </TouchableOpacity>
                      <View style={styles.dealCountBadge}>
                        <Ionicons name="pricetag-outline" size={14} color="#059669" />
                        <Text style={styles.dealCountText}>{biz.activeDealsCount} Active Deals</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── QR Claim Modal ──────────────────────────────────────────── */}
      <Modal visible={!!activeClaimModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Voucher Pass</Text>
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
                </View>

                <Text style={styles.qrInstructions}>
                  Show this QR code or promo code at the checkout counter to apply your resident discount.
                </Text>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setActiveClaimModal(null)}
                >
                  <Text style={styles.closeModalBtnText}>Done</Text>
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
    marginBottom: 10,
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
  heroPillText: { fontSize: 10, fontWeight: '800', color: '#FDE68A' },
  savingsBox: { alignItems: 'flex-end' },
  savingsAmount: { fontSize: 16, fontWeight: '900', color: '#34D399' },
  savingsLabel: { fontSize: 9, color: '#A7F3D0' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroDesc: { fontSize: 12, color: '#D1FAE5', lineHeight: 17 },

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
  catScroll: { flexDirection: 'row', gap: 6, paddingBottom: 12 },
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
  catPillTextSelected: { color: '#fff' },

  // ── Tab Bar ───────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.primary, fontWeight: '800' },

  tabContent: { gap: SPACING.md },

  // ── Offer Card ────────────────────────────────────────────────────
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
  claimBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  offerValidText: { fontSize: 11, color: COLORS.textMuted },
  offerClaimedText: { fontSize: 11, fontWeight: '700', color: '#D97706' },

  // ── Voucher Card ──────────────────────────────────────────────────
  voucherCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    ...SHADOWS.sm,
  },
  voucherTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  voucherBiz: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  voucherTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  voucherDiscount: { fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 2 },
  voucherStatusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  voucherStatusText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  voucherCodeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 8,
  },
  voucherCodeLabel: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  voucherCode: { fontSize: 16, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  showQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  showQrBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  voucherValidUntil: { fontSize: 11, color: COLORS.textMuted },

  // ── Demand Card ───────────────────────────────────────────────────
  demandHeader: { marginBottom: 6 },
  demandHeading: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  demandSub: { fontSize: 12, color: COLORS.textMuted },
  demandCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  demandTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  demandCatPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  demandCatText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  demandStatusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  demandStatusText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  demandTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  demandProduct: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  demandPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  demandPriceLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  demandPriceVal: { fontSize: 16, fontWeight: '900', color: '#059669' },
  demandRetailVal: { fontSize: 14, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  demandProgressBox: { marginBottom: 12 },
  demandProgressHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  demandProgressText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  demandProgressPct: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  demandProgressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  demandProgressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  joinDemandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  joinDemandBtnActive: { backgroundColor: '#047857' },
  joinDemandBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // ── Directory Card ────────────────────────────────────────────────
  bizCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  bizHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bizNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bizCardName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  bizCardCat: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  bizAddress: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  bizActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  bizCallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bizCallText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  dealCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dealCountText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  // ── Empty State ───────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // ── Modal Styles ──────────────────────────────────────────────────
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
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
    marginVertical: 14,
  },
  qrCodeText: { fontSize: 16, fontWeight: '900', color: '#1E1B4B', letterSpacing: 2, marginTop: 8 },
  qrInstructions: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
  closeModalBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
