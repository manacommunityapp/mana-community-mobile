import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  jewelleryService,
  JewelleryProduct,
  JewelleryCategory,
} from '@/services/jewelleryService';

const CATEGORY_TABS: { key: 'ALL' | JewelleryCategory; label: string }[] = [
  { key: 'ALL',        label: 'All' },
  { key: 'EARRINGS',   label: 'Earrings' },
  { key: 'NECKLACE',   label: 'Necklace' },
  { key: 'RING',       label: 'Rings' },
  { key: 'BANGLE',     label: 'Bangles' },
  { key: 'MAANG_TIKKA',label: 'Maang Tikka' },
  { key: 'PENDANT',    label: 'Pendant' },
];

const SPECIALTY_ICONS: Record<string, string> = {
  'Bridal':     'heart',
  'Gold':       'ellipse',
  'Diamond':    'diamond',
  'Silver':     'oval',
  'Temple':     'business',
  'Antique':    'time',
  'Custom':     'construct',
};

export default function VendorStorefrontScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();

  const [activeCategory, setActiveCategory] = useState<'ALL' | JewelleryCategory>('ALL');
  const [tryOnOnly, setTryOnOnly] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────
  const { data: vendor, isLoading: vendorLoading } = useQuery({
    queryKey: ['jewellery-vendor', vendorId],
    queryFn: () => jewelleryService.getVendorById(vendorId!),
    enabled: !!vendorId,
  });

  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ['jewellery-vendor-products', vendorId],
    queryFn: () => jewelleryService.getVendorProducts(vendorId!),
    enabled: !!vendorId,
  });

  const wishlistMutation = useMutation({
    mutationFn: (product: JewelleryProduct) =>
      product.isWishlisted
        ? jewelleryService.removeFromWishlist(product.id)
        : jewelleryService.addToWishlist(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-vendor-products', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['jewellery-wishlist'] });
    },
    onError: () => Alert.alert('Error', 'Failed to update wishlist.'),
  });

  // ── Derived ────────────────────────────────────────────────────
  const filteredProducts = allProducts.filter((p) => {
    const categoryMatch = activeCategory === 'ALL' || p.category === activeCategory;
    const tryOnMatch = !tryOnOnly || !!p.tryOnAssetUrl;
    return categoryMatch && tryOnMatch;
  });

  const tryOnCount = allProducts.filter((p) => p.tryOnAssetUrl).length;
  const specialties = vendor?.specialties ?? [];

  // ── Handlers ───────────────────────────────────────────────────
  const handleCall = () => {
    if (vendor?.phoneNumber) {
      Linking.openURL(`tel:${vendor.phoneNumber}`);
    }
  };

  const handleWhatsApp = () => {
    if (vendor?.phoneNumber) {
      Linking.openURL(`https://wa.me/91${vendor.phoneNumber.replace(/\D/g, '')}`);
    }
  };

  const handleBookConsultation = () => {
    router.push({ pathname: '/jewellery/appointments', params: { vendorId } });
  };

  // ── Loading / error states ─────────────────────────────────────
  if (vendorLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
        <Text style={styles.notFoundText}>Jeweller not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Store Header ──────────────────────────────────────── */}
        <LinearGradient colors={['#78350F', '#B45309']} style={styles.headerGradient}>
          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.navBack}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {vendor.imageUrl ? (
                <Image source={{ uri: vendor.imageUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="storefront" size={36} color="#B45309" />
                </View>
              )}
              {vendor.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
            </View>

            {/* Store name + trust marks */}
            <View style={styles.headerInfo}>
              <Text style={styles.shopName}>{vendor.shopName}</Text>
              <Text style={styles.ownerName}>by {vendor.ownerName}</Text>

              {/* BIS Badge */}
              {vendor.isVerified && (
                <View style={styles.bisBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#059669" />
                  <Text style={styles.bisBadgeText}>BIS Hallmark Verified</Text>
                </View>
              )}

              {/* Rating + hours */}
              <View style={styles.metaRow}>
                <View style={styles.ratingChip}>
                  <Ionicons name="star" size={11} color="#FCD34D" />
                  <Text style={styles.ratingText}>
                    {vendor.rating?.toFixed(1) ?? '—'}
                  </Text>
                  {vendor.reviewCount > 0 && (
                    <Text style={styles.reviewCount}>({vendor.reviewCount})</Text>
                  )}
                </View>
                {vendor.distance && (
                  <View style={styles.distChip}>
                    <Ionicons name="location-outline" size={11} color="#FDE68A" />
                    <Text style={styles.distText}>{vendor.distance}</Text>
                  </View>
                )}
                {vendor.openHours && (
                  <View style={styles.distChip}>
                    <Ionicons name="time-outline" size={11} color="#FDE68A" />
                    <Text style={styles.distText}>{vendor.openHours}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick action buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.qaBtn} onPress={handleCall}>
              <Ionicons name="call-outline" size={16} color="#FFFFFF" />
              <Text style={styles.qaBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaBtn} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              <Text style={styles.qaBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.qaBtn, styles.qaBtnAccent]}
              onPress={handleBookConsultation}
            >
              <Ionicons name="calendar-outline" size={16} color="#B45309" />
              <Text style={[styles.qaBtnText, { color: '#B45309' }]}>Book Visit</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Specialties ───────────────────────────────────────── */}
        {specialties.length > 0 && (
          <View style={styles.specialtiesWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 8 }}>
              {specialties.map((s) => (
                <View key={s} style={styles.specialtyChip}>
                  <Ionicons
                    name={(SPECIALTY_ICONS[s] ?? 'diamond-outline') as any}
                    size={12}
                    color={COLORS.primary}
                  />
                  <Text style={styles.specialtyText}>{s}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Address ───────────────────────────────────────────── */}
        <View style={styles.addressCard}>
          <Ionicons name="location" size={16} color="#B45309" />
          <Text style={styles.addressText}>{vendor.address}</Text>
        </View>

        {/* ── Stats strip ───────────────────────────────────────── */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{allProducts.length}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tryOnCount}</Text>
            <Text style={styles.statLabel}>Try-On Ready</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{vendor.rating?.toFixed(1) ?? '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* ── Catalogue header ──────────────────────────────────── */}
        <View style={styles.catalogueHeader}>
          <Text style={styles.sectionTitle}>Catalogue</Text>

          {/* Try-On filter toggle */}
          {tryOnCount > 0 && (
            <TouchableOpacity
              style={[styles.tryOnToggle, tryOnOnly && styles.tryOnToggleActive]}
              onPress={() => setTryOnOnly((v) => !v)}
            >
              <Ionicons
                name="camera-outline"
                size={12}
                color={tryOnOnly ? '#FFFFFF' : COLORS.primary}
              />
              <Text style={[styles.tryOnToggleText, tryOnOnly && { color: '#FFFFFF' }]}>
                Try-On Only
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Category tabs ─────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabStrip}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 8 }}
        >
          {CATEGORY_TABS.map((tab) => {
            const active = activeCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveCategory(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Product grid ──────────────────────────────────────── */}
        {productsLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="diamond-outline" size={40} color="#C7D2FE" />
            <Text style={styles.emptyTitle}>
              {tryOnOnly ? 'No Try-On Items Yet' : 'No Products Found'}
            </Text>
            {tryOnOnly && (
              <TouchableOpacity onPress={() => setTryOnOnly(false)}>
                <Text style={styles.emptyLink}>View all products instead</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => router.push(`/jewellery/${product.id}`)}
              >
                {/* Product image */}
                <View style={styles.productImageWrap}>
                  {product.imageUrls?.[0] ? (
                    <Image source={{ uri: product.imageUrls[0] }} style={styles.productImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="diamond-outline" size={28} color="#C7D2FE" />
                    </View>
                  )}

                  {/* Badges */}
                  {product.tryOnAssetUrl && (
                    <View style={styles.tryOnBadge}>
                      <Ionicons name="camera" size={8} color="#FFFFFF" />
                      <Text style={styles.tryOnBadgeText}>Try On</Text>
                    </View>
                  )}
                  {product.huid && (
                    <View style={styles.huidBadge}>
                      <Ionicons name="shield-checkmark" size={8} color="#92400E" />
                      <Text style={styles.huidBadgeText}>HUID</Text>
                    </View>
                  )}

                  {/* Wishlist icon */}
                  <TouchableOpacity
                    style={styles.heartBtn}
                    onPress={() => wishlistMutation.mutate(product)}
                  >
                    <Ionicons
                      name={product.isWishlisted ? 'heart' : 'heart-outline'}
                      size={14}
                      color={product.isWishlisted ? '#EF4444' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Product info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  {product.purity && (
                    <Text style={styles.productPurity}>{product.purity}</Text>
                  )}
                  <Text style={styles.productPrice}>
                    ₹{product.totalPrice.toLocaleString('en-IN')}
                  </Text>
                  {product.stockQuantity > 0 && product.stockQuantity <= 3 && (
                    <Text style={styles.lowStock}>Only {product.stockQuantity} left</Text>
                  )}
                  {product.status === 'OUT_OF_STOCK' && (
                    <Text style={styles.outOfStock}>Out of Stock</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Sticky CTA ─────────────────────────────────────────── */}
      <View style={styles.stickyBar}>
        <TouchableOpacity style={styles.stickyConsult} onPress={handleBookConsultation}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={styles.stickyConsultText}>Book Consultation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stickyTryOn}
          onPress={() => router.push('/jewellery/try-on')}
        >
          <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
          <Text style={styles.stickyTryOnText}>Virtual Try-On</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#FDF8F0' },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText:     { fontSize: 15, color: '#64748B' },
  backBtn:          { marginTop: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md },
  backBtnText:      { color: '#FFFFFF', fontWeight: '700' },

  // Header
  headerGradient:   { paddingTop: 52, paddingBottom: 16, paddingHorizontal: SPACING.md },
  navBack:          { marginBottom: 12 },
  headerContent:    { flexDirection: 'row', gap: 14, marginBottom: 16 },
  avatarWrap:       { position: 'relative' },
  avatar:           { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#FCD34D' },
  avatarPlaceholder:{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FCD34D' },
  verifiedBadge:    { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  headerInfo:       { flex: 1, gap: 4 },
  shopName:         { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  ownerName:        { fontSize: 12, color: '#FDE68A' },
  bisBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginTop: 2 },
  bisBadgeText:     { fontSize: 10, fontWeight: '700', color: '#059669' },
  metaRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  ratingChip:       { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  ratingText:       { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  reviewCount:      { fontSize: 10, color: '#FDE68A' },
  distChip:         { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distText:         { fontSize: 10, color: '#FDE68A' },

  // Quick actions
  quickActions:     { flexDirection: 'row', gap: 8, marginTop: 4 },
  qaBtn:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 9, borderRadius: RADIUS.md },
  qaBtnText:        { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  qaBtnAccent:      { backgroundColor: '#FEF3C7' },

  // Specialties
  specialtiesWrap:  { paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F1F5F9' },
  specialtyChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  specialtyText:    { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // Address
  addressCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#FDE68A' },
  addressText:      { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 18 },

  // Stats
  statsStrip:       { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F1F5F9', marginBottom: 4 },
  statItem:         { flex: 1, alignItems: 'center' },
  statValue:        { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  statLabel:        { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2 },
  statDivider:      { width: 1, backgroundColor: '#E2E8F0' },

  // Catalogue header
  catalogueHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  sectionTitle:     { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  tryOnToggle:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  tryOnToggleActive:{ backgroundColor: COLORS.primary },
  tryOnToggleText:  { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // Category tabs
  tabStrip:         { backgroundColor: '#FFFFFF', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#F1F5F9', marginBottom: 8 },
  tab:              { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  tabActive:        { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText:          { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabTextActive:    { color: '#FFFFFF' },

  // Product grid
  productGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: SPACING.md },
  productCard:      { width: '47%', backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', ...SHADOWS.sm },
  productImageWrap: { position: 'relative', height: 150 },
  productImage:     { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF9EC' },
  tryOnBadge:       { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.full },
  tryOnBadgeText:   { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  huidBadge:        { position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.full },
  huidBadgeText:    { color: '#92400E', fontSize: 8, fontWeight: '800' },
  heartBtn:         { position: 'absolute', top: 6, right: 6, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 5, ...SHADOWS.sm },
  productInfo:      { padding: 10 },
  productName:      { fontSize: 12, fontWeight: '700', color: '#0F172A', lineHeight: 16, marginBottom: 2 },
  productPurity:    { fontSize: 10, color: '#B45309', fontWeight: '600', marginBottom: 2 },
  productPrice:     { fontSize: 13, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  lowStock:         { fontSize: 9, color: '#D97706', fontWeight: '700', marginTop: 2 },
  outOfStock:       { fontSize: 9, color: '#DC2626', fontWeight: '700', marginTop: 2 },

  // Empty
  emptyWrap:        { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle:       { fontSize: 14, fontWeight: '700', color: '#334155' },
  emptyLink:        { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 4 },

  // Sticky bar
  stickyBar:        { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.md, paddingVertical: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  stickyConsult:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.md },
  stickyConsultText:{ color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  stickyTryOn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.md },
  stickyTryOnText:  { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
