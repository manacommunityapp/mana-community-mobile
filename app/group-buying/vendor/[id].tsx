import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { vendorService } from '@/services/vendorService';
import { groupBuyingService } from '@/services/groupBuyingService';
import DealCard from '@/components/group-buying/DealCard';
import type { VendorProfile, VendorProduct } from '@/types/vendor';
import type { GroupDealDto } from '@/types/groupBuying';

export default function VendorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'DEALS' | 'PRODUCTS' | 'ABOUT'>('DEALS');

  const { data: vendor, isLoading: loadingVendor, isError, refetch } = useQuery({
    queryKey: ['vendor-profile', id],
    queryFn: () => vendorService.getVendorProfile(id as string),
    enabled: !!id,
  });

  const { data: allDeals = [] } = useQuery({
    queryKey: ['group-deals'],
    queryFn: () => groupBuyingService.getDeals(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['vendor-products', id],
    queryFn: () => vendorService.getVendorProducts(id as string),
    enabled: !!id,
  });

  const vendorDeals = useMemo(() => {
    return allDeals.filter(d => d.vendorId === id || d.vendor === vendor?.businessName);
  }, [allDeals, id, vendor]);

  if (loadingVendor) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading vendor profile...</Text>
      </View>
    );
  }

  if (isError || !vendor) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={s.errorTitle}>Vendor Not Found</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: vendor.businessName,
          headerShadowVisible: false,
        }}
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Vendor Profile Header */}
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.headerCard}
        >
          <View style={s.headerTop}>
            <View style={s.avatarWrap}>
              <Text style={s.avatarText}>{vendor.businessName.charAt(0)}</Text>
            </View>
            <View style={s.headerInfo}>
              <View style={s.nameRow}>
                <Text style={s.businessName}>{vendor.businessName}</Text>
                {vendor.isVerified && (
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                )}
              </View>
              {vendor.city && (
                <View style={s.locationRow}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={s.locationText}>{vendor.city} ? Member since {vendor.memberSince}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Verification Badges */}
          <View style={s.badgesRow}>
            {vendor.isGSTVerified && (
              <View style={s.badgeItem}>
                <Ionicons name="checkmark-done" size={12} color="#059669" />
                <Text style={s.badgeText}>GST Verified</Text>
              </View>
            )}
            {vendor.isFSSAIVerified && (
              <View style={s.badgeItem}>
                <Ionicons name="shield-checkmark" size={12} color="#059669" />
                <Text style={s.badgeText}>FSSAI Food Safety</Text>
              </View>
            )}
            {vendor.isCommunityApproved && (
              <View style={[s.badgeItem, s.badgeCommunity]}>
                <Ionicons name="ribbon" size={12} color="#7C3AED" />
                <Text style={[s.badgeText, { color: '#7C3AED' }]}>Community Approved</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Trust & Quality Scorecard Matrix */}
        <View style={s.trustCard}>
          <Text style={s.trustHeading}>COMMUNITY TRUST & RELIABILITY</Text>
          <View style={s.trustGrid}>
            <View style={s.trustItem}>
              <View style={s.trustMetricRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={s.trustMetricNum}>{vendor.rating}</Text>
              </View>
              <Text style={s.trustMetricLabel}>Overall Rating</Text>
            </View>

            <View style={s.trustDivider} />

            <View style={s.trustItem}>
              <Text style={s.trustMetricNum}>{vendor.totalOrders}</Text>
              <Text style={s.trustMetricLabel}>Orders Filled</Text>
            </View>

            <View style={s.trustDivider} />

            <View style={s.trustItem}>
              <Text style={[s.trustMetricNum, { color: '#059669' }]}>{vendor.fulfillmentRate}%</Text>
              <Text style={s.trustMetricLabel}>Fulfillment Rate</Text>
            </View>
          </View>

          <View style={s.trustSubRow}>
            <View style={s.trustPill}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
              <Text style={s.trustPillText}>{vendor.onTimeRate}% On-Time Delivery</Text>
            </View>
            <View style={s.trustPill}>
              <Ionicons name="shield-outline" size={14} color="#059669" />
              <Text style={s.trustPillText}>{vendor.disputeRate}% Dispute Rate</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tabItem, activeTab === 'DEALS' && s.tabItemActive]}
            onPress={() => setActiveTab('DEALS')}
          >
            <Ionicons
              name="flame"
              size={16}
              color={activeTab === 'DEALS' ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[s.tabLabel, activeTab === 'DEALS' && s.tabLabelActive]}>
              Active Deals ({vendorDeals.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabItem, activeTab === 'PRODUCTS' && s.tabItemActive]}
            onPress={() => setActiveTab('PRODUCTS')}
          >
            <Ionicons
              name="cube"
              size={16}
              color={activeTab === 'PRODUCTS' ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[s.tabLabel, activeTab === 'PRODUCTS' && s.tabLabelActive]}>
              Products ({products.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.tabItem, activeTab === 'ABOUT' && s.tabItemActive]}
            onPress={() => setActiveTab('ABOUT')}
          >
            <Ionicons
              name="information-circle"
              size={16}
              color={activeTab === 'ABOUT' ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[s.tabLabel, activeTab === 'ABOUT' && s.tabLabelActive]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Contents */}
        {activeTab === 'DEALS' && (
          <View style={s.tabContent}>
            {vendorDeals.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="pricetags-outline" size={36} color={COLORS.textMuted} />
                <Text style={s.emptyText}>No active group deals from this vendor right now.</Text>
              </View>
            ) : (
              vendorDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} />
              ))
            )}
          </View>
        )}

        {activeTab === 'PRODUCTS' && (
          <View style={s.tabContent}>
            {products.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="cube-outline" size={36} color={COLORS.textMuted} />
                <Text style={s.emptyText}>No products catalogued yet.</Text>
              </View>
            ) : (
              products.map(prod => (
                <View key={prod.id} style={s.productCard}>
                  <View style={s.prodIconWrap}>
                    <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
                  </View>
                  <View style={s.prodInfo}>
                    <Text style={s.prodName}>{prod.name}</Text>
                    <Text style={s.prodPackSize}>{prod.packSize} ? SKU: {prod.sku}</Text>
                    {prod.description ? (
                      <Text style={s.prodDesc} numberOfLines={2}>{prod.description}</Text>
                    ) : null}
                    <View style={s.prodPricingRow}>
                      <Text style={s.prodSellingPrice}>?{prod.sellingPrice}</Text>
                      <Text style={s.prodMrp}>MRP ?{prod.mrp}</Text>
                      <Text style={s.prodMoq}>MOQ: {prod.minOrderQty} units</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'ABOUT' && (
          <View style={s.tabContent}>
            <View style={s.aboutCard}>
              <Text style={s.aboutTitle}>Business Overview</Text>
              <Text style={s.aboutText}>
                {vendor.description || 'Verified wholesale vendor supplying closed residential communities directly with factory/farm-fresh commodities.'}
              </Text>

              <View style={s.aboutDivider} />

              <Text style={s.aboutTitle}>Categories Sourced</Text>
              <View style={s.catPillsRow}>
                {vendor.categories.map((cat, idx) => (
                  <View key={idx} style={s.catPill}>
                    <Text style={s.catPillText}>{cat}</Text>
                  </View>
                ))}
              </View>

              <View style={s.aboutDivider} />

              <Text style={s.aboutTitle}>Community Guarantee</Text>
              <View style={s.guaranteeRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={s.guaranteeText}>Pre-vetted trade license & FSSAI certified</Text>
              </View>
              <View style={s.guaranteeRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={s.guaranteeText}>Direct clubhouse delivery and bulk packing</Text>
              </View>
              <View style={s.guaranteeRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={s.guaranteeText}>100% money-back guarantee on damaged items</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  headerCard: {
    padding: 20,
    gap: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  badgeCommunity: {
    backgroundColor: '#F3E8FF',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  trustCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  trustHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  trustGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
  },
  trustItem: {
    alignItems: 'center',
    gap: 2,
  },
  trustMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustMetricNum: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  trustMetricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  trustDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  trustSubRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  trustPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  tabItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  tabContent: {
    marginHorizontal: 14,
    marginTop: 12,
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  prodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodInfo: {
    flex: 1,
    gap: 3,
  },
  prodName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  prodPackSize: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  prodDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  prodPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  prodSellingPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  prodMrp: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  prodMoq: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },
  aboutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.sm,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  aboutText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  catPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catPill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  catPillText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guaranteeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
