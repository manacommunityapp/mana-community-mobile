import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { insuranceService } from '@/services/insuranceService';
import { sortCatalogue, categoryFromParam, categoryLabel } from '@/constants/insurance';
import { useInsuranceShortlist, MAX_SHORTLIST } from '@/hooks/useInsuranceShortlist';
import { FONTS, COLORS, SHADOWS } from '@/constants/config';
import type { CatalogueItem } from '@/types/insurance';

type SortKey = 'NAME' | 'INSURER';

export default function CatalogueScreen() {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const cat = categoryFromParam(category);
  const [sort, setSort] = useState<SortKey>('NAME');
  const [searchQuery, setSearchQuery] = useState('');
  const { items: shortlist, toggle, has } = useInsuranceShortlist();

  const q = useQuery({
    queryKey: ['ins-catalogue', cat],
    queryFn: () => insuranceService.catalogue(cat!),
    enabled: !!cat,
    staleTime: 120_000,
  });

  const sorted = useMemo(() => {
    let list = q.data ? sortCatalogue(q.data, sort) : [];
    if (searchQuery.trim()) {
      const qry = searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.name.toLowerCase().includes(qry) ||
        item.insurerName.toLowerCase().includes(qry) ||
        (item.partnerDisclosure && item.partnerDisclosure.toLowerCase().includes(qry))
      );
    }
    return list;
  }, [q.data, sort, searchQuery]);

  const title = cat ? categoryLabel(cat) : 'Insurance Products';

  return (
    <View style={s.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={s.topNavTitleBox}>
          <Text style={s.topNavTitle}>{title}</Text>
          <Text style={s.topNavSubtitle}>Pre-Negotiated Mana Resident Rates</Text>
        </View>

        {shortlist.length >= 2 && (
          <TouchableOpacity
            style={s.compareNavBtn}
            onPress={() => router.push('/insurance/compare' as any)}
          >
            <Ionicons name="git-compare" size={14} color="#FFFFFF" />
            <Text style={s.compareNavText}>Compare ({shortlist.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Community Group Discount Pill Strip ────────────────── */}
      <View style={s.discountStrip}>
        <Ionicons name="sparkles" size={14} color="#D97706" />
        <Text style={s.discountStripText}>
          <Text style={{ fontFamily: FONTS.bold, color: '#92400E' }}>Community Shield:</Text> Plans listed below qualify for pre-negotiated society group premium discounts.
        </Text>
      </View>

      {/* ── Search & Filter Controls ───────────────────────────── */}
      <View style={s.controlsRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search plans or insurer..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Chips */}
        <View style={s.sortChipsRow}>
          {(['NAME', 'INSURER'] as SortKey[]).map((k) => (
            <TouchableOpacity
              key={k}
              style={[s.sortChip, sort === k && s.sortChipActive]}
              onPress={() => setSort(k)}
            >
              <Text style={[s.sortChipText, sort === k && s.sortChipTextActive]}>
                {k === 'NAME' ? 'By Name' : 'By Insurer'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Products List ──────────────────────────────────────── */}
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {q.isLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={s.loadingText}>Fetching certified IRDAI products…</Text>
          </View>
        ) : q.isError ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyTitle}>Unable to load catalogue</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => q.refetch()}>
              <Text style={s.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : sorted.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
            <Text style={s.emptyTitle}>No matching plans found</Text>
            <Text style={s.emptySubtitle}>Try searching for another insurer or clear your search query.</Text>
          </View>
        ) : (
          sorted.map((item) => {
            const isShortlisted = has(item.productVersionId);
            const isMaxed = !isShortlisted && shortlist.length >= MAX_SHORTLIST;

            return (
              <View key={item.productVersionId} style={s.productCard}>
                <View style={s.cardTopRow}>
                  <View style={s.insurerIconBox}>
                    <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.productName}>{item.name}</Text>
                    <Text style={s.insurerName}>{item.insurerName}</Text>
                  </View>
                  <View style={s.irdaiBadge}>
                    <Text style={s.irdaiBadgeText}>IRDAI #{item.irdaiRegistrationNo || '146'}</Text>
                  </View>
                </View>

                {item.partnerDisclosure && (
                  <View style={s.perkTagBox}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={s.perkTagText}>{item.partnerDisclosure}</Text>
                  </View>
                )}

                <View style={s.docLinksRow}>
                  {item.brochureUrl && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(item.brochureUrl!)}
                      style={s.docLinkChip}
                    >
                      <Ionicons name="document-text-outline" size={12} color={COLORS.primary} />
                      <Text style={s.docLinkText}>Brochure PDF</Text>
                    </TouchableOpacity>
                  )}
                  {item.policyWordingUrl && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(item.policyWordingUrl!)}
                      style={s.docLinkChip}
                    >
                      <Ionicons name="newspaper-outline" size={12} color={COLORS.primary} />
                      <Text style={s.docLinkText}>Policy Wording</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={s.cardActionRow}>
                  <TouchableOpacity
                    style={[
                      s.compareToggleBtn,
                      isShortlisted && s.compareToggleBtnActive,
                      isMaxed && { opacity: 0.5 },
                    ]}
                    onPress={() => toggle(item)}
                    disabled={isMaxed}
                  >
                    <Ionicons
                      name={isShortlisted ? 'checkmark-circle' : 'git-compare-outline'}
                      size={15}
                      color={isShortlisted ? '#059669' : COLORS.textSecondary}
                    />
                    <Text style={[s.compareToggleText, isShortlisted && { color: '#059669', fontFamily: FONTS.bold }]}>
                      {isShortlisted ? 'Added to Compare' : 'Add to Compare'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.quoteCtaBtn}
                    onPress={() => Alert.alert('Quote Request', `Requesting society pre-negotiated quote for ${item.name}.`)}
                  >
                    <Text style={s.quoteCtaText}>Get Society Quote →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={s.disclosureFooter}>
          <Text style={s.disclosureFooterText}>
            Mana Community helps you discover and compare insurance plans. All policies are underwritten, sold and serviced directly by the insurer named on the product.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sticky Bottom Compare Floating Action ─────────────── */}
      {shortlist.length >= 2 && (
        <View style={s.stickyCompareBar}>
          <View>
            <Text style={s.stickyCompareTitle}>{shortlist.length} Products Shortlisted</Text>
            <Text style={s.stickyCompareSub}>Compare side-by-side features & inclusions</Text>
          </View>
          <TouchableOpacity
            style={s.stickyCompareBtn}
            onPress={() => router.push('/insurance/compare' as any)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.stickyCompareGradient}
            >
              <Text style={s.stickyCompareBtnText}>Compare Now</Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundAlt,
  },
  topNavTitleBox: {
    flex: 1,
  },
  topNavTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  topNavSubtitle: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  compareNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  compareNavText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  discountStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  discountStripText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#92400E',
    lineHeight: 15,
  },
  controlsRow: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  sortChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.backgroundAlt,
  },
  sortChipActive: {
    backgroundColor: COLORS.primaryLight,
  },
  sortChipText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  sortChipTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  insurerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  insurerName: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  irdaiBadge: {
    backgroundColor: COLORS.backgroundAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  irdaiBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  perkTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
  },
  perkTagText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#065F46',
  },
  docLinksRow: {
    flexDirection: 'row',
    gap: 8,
  },
  docLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  docLinkText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
  },
  compareToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundAlt,
  },
  compareToggleBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  compareToggleText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  quoteCtaBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 9,
    borderRadius: 8,
  },
  quoteCtaText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  disclosureFooter: {
    padding: 12,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 10,
  },
  disclosureFooterText: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    lineHeight: 14,
  },
  stickyCompareBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  stickyCompareTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  stickyCompareSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  stickyCompareBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  stickyCompareGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stickyCompareBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});