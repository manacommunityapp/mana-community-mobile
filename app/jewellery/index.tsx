import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { jewelleryService, JewelleryCategory, JewelleryMaterial } from '@/services/jewelleryService';

type FilterMode = 'ALL' | JewelleryCategory;

const CATEGORIES: { key: FilterMode; label: string; icon: string }[] = [
  { key: 'ALL',          label: 'All',          icon: 'grid-outline' },
  { key: 'EARRINGS',     label: 'Earrings',     icon: 'ear-outline' },
  { key: 'NECKLACE',     label: 'Necklace',     icon: 'ellipse-outline' },
  { key: 'RING',         label: 'Rings',        icon: 'oval-outline' },
  { key: 'BANGLE',       label: 'Bangles',      icon: 'reload-circle-outline' },
  { key: 'MAANG_TIKKA',  label: 'Maang Tikka',  icon: 'star-outline' },
  { key: 'PENDANT',      label: 'Pendant',      icon: 'diamond-outline' },
  { key: 'BRACELET',     label: 'Bracelet',     icon: 'link-outline' },
];

const MATERIAL_CHIPS: { key: JewelleryMaterial | 'ALL'; label: string; color: string }[] = [
  { key: 'ALL',       label: 'All',       color: '#4F46E5' },
  { key: 'GOLD',      label: '🪙 Gold',    color: '#B45309' },
  { key: 'DIAMOND',   label: '💎 Diamond', color: '#0EA5E9' },
  { key: 'SILVER',    label: '🔘 Silver',  color: '#64748B' },
  { key: 'ARTIFICIAL',label: '✨ Fashion', color: '#EC4899' },
  { key: 'GEMSTONE',  label: '💍 Gems',    color: '#7C3AED' },
];

const FESTIVE_COLLECTIONS = [
  { title: 'Bridal Sets',        subtitle: 'Necklace + Earrings + Tikka', color: '#7C3AED', icon: 'heart' },
  { title: 'Diwali Special',     subtitle: 'Gold coins & jewellery gifts', color: '#B45309', icon: 'sparkles' },
  { title: 'New Arrivals',       subtitle: 'Latest designs this season',   color: '#059669', icon: 'star' },
  { title: 'Under ₹5,000',      subtitle: 'Affordable fashion jewellery', color: '#DC2626', icon: 'pricetag' },
];

export default function JewelleryHomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<FilterMode>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<JewelleryMaterial | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const { data: featured = [], isLoading: loadingFeatured, refetch: refetchFeatured } = useQuery({
    queryKey: ['jewellery-featured'],
    queryFn: jewelleryService.getFeaturedProducts,
  });

  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ['jewellery-vendors'],
    queryFn: jewelleryService.getNearbyVendors,
  });

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['jewellery-products', selectedCategory, selectedMaterial, search],
    queryFn: () => jewelleryService.getProducts({
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      material: selectedMaterial !== 'ALL' ? selectedMaterial : undefined,
      search: search || undefined,
    }),
  });

  const isLoading = loadingFeatured || loadingVendors;

  const handleRefresh = () => {
    refetchFeatured();
    refetchProducts();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
    >
      {/* Hero Banner */}
      <LinearGradient colors={['#78350F', '#B45309', '#D97706']} style={styles.banner}>
        <View style={styles.bannerBadge}>
          <Ionicons name="diamond" size={12} color="#FCD34D" />
          <Text style={styles.bannerBadgeText}>Mana Jewellery Hub</Text>
        </View>
        <Text style={styles.bannerTitle}>Discover & Try On{'\n'}Jewellery Virtually</Text>
        <Text style={styles.bannerSub}>Earrings · Necklaces · Rings · Bridal Sets</Text>
        <View style={styles.bannerActions}>
          <TouchableOpacity
            style={styles.tryOnBtn}
            onPress={() => router.push('/jewellery/try-on')}
          >
            <Ionicons name="camera" size={14} color="#FFFFFF" />
            <Text style={styles.tryOnBtnText}>Virtual Try-On</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.wishlistBtn}
            onPress={() => router.push('/jewellery/wishlist')}
          >
            <Ionicons name="heart-outline" size={14} color="#FCD34D" />
            <Text style={styles.wishlistBtnText}>Wishlist</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Search jewellery by design, occasion..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.apptBtn}
          onPress={() => router.push('/jewellery/appointments')}
        >
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Festive Collections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collections</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 10 }}>
          {FESTIVE_COLLECTIONS.map((col) => (
            <TouchableOpacity
              key={col.title}
              style={[styles.collectionCard, { backgroundColor: col.color }]}
              onPress={() => {
                if (col.title === 'Bridal Sets') {
                  setSelectedCategory('NECKLACE');
                  setSearch('bridal');
                } else if (col.title === 'Diwali Special') {
                  setSelectedMaterial('GOLD');
                  setSearch('diwali');
                } else if (col.title === 'Under ₹5,000') {
                  setSelectedMaterial('ARTIFICIAL');
                  setSearch('');
                } else {
                  setSelectedCategory('ALL');
                  setSelectedMaterial('ALL');
                  setSearch('');
                }
              }}
            >
              <Ionicons name={col.icon as any} size={20} color="#FFFFFF" />
              <Text style={styles.collectionTitle}>{col.title}</Text>
              <Text style={styles.collectionSub}>{col.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Material Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.materialStrip}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 8 }}
      >
        {MATERIAL_CHIPS.map((chip) => {
          const active = selectedMaterial === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setSelectedMaterial(chip.key as JewelleryMaterial | 'ALL')}
              style={[styles.materialChip, active && { backgroundColor: chip.color, borderColor: chip.color }]}
            >
              <Text style={[styles.materialChipText, active && { color: '#FFFFFF' }]}>{chip.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Icons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryStrip}
        contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 14 }}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              style={styles.catItem}
            >
              <View style={[styles.catIcon, active && { backgroundColor: COLORS.primary }]}>
                <Ionicons name={cat.icon as any} size={18} color={active ? '#FFFFFF' : COLORS.primary} />
              </View>
              <Text style={[styles.catLabel, active && { color: COLORS.primary, fontWeight: '700' }]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Nearby Verified Jewellers */}
      {vendors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verified Jewellers Nearby</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 12 }}>
            {vendors.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.vendorCard}
                onPress={() => router.push({ pathname: '/jewellery/vendor/[vendorId]', params: { vendorId: v.id } })}
              >
                <View style={styles.vendorAvatar}>
                  {v.imageUrl ? (
                    <Image source={{ uri: v.imageUrl }} style={styles.vendorAvatarImg} />
                  ) : (
                    <Ionicons name="storefront" size={24} color={COLORS.primary} />
                  )}
                  {v.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark" size={8} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={styles.vendorName} numberOfLines={1}>{v.shopName}</Text>
                <View style={styles.vendorRating}>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={styles.vendorRatingText}>{v.rating.toFixed(1)}</Text>
                </View>
                {v.distance && <Text style={styles.vendorDist}>{v.distance}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Products Grid */}
      <View style={[styles.section, { paddingHorizontal: SPACING.md }]}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {selectedCategory !== 'ALL'
              ? CATEGORIES.find((c) => c.key === selectedCategory)?.label
              : selectedMaterial !== 'ALL'
              ? MATERIAL_CHIPS.find((m) => m.key === selectedMaterial)?.label + ' Jewellery'
              : 'All Jewellery'}
          </Text>
          <Text style={styles.countText}>{products.length} items</Text>
        </View>

        {loadingProducts ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : products.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="diamond-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyText}>Try a different category or search term.</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => router.push(`/jewellery/${product.id}`)}
              >
                <View style={styles.productImageWrap}>
                  {product.imageUrls?.[0] ? (
                    <Image source={{ uri: product.imageUrls[0] }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons name="diamond-outline" size={32} color="#C7D2FE" />
                    </View>
                  )}
                  {product.tryOnAssetUrl && (
                    <View style={styles.tryOnBadge}>
                      <Ionicons name="camera" size={8} color="#FFFFFF" />
                      <Text style={styles.tryOnBadgeText}>Try On</Text>
                    </View>
                  )}
                  {product.isWishlisted && (
                    <View style={styles.heartBadge}>
                      <Ionicons name="heart" size={12} color="#EF4444" />
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.productVendor} numberOfLines={1}>{product.vendorName}</Text>
                  {product.purity && <Text style={styles.productPurity}>{product.purity}</Text>}
                  <Text style={styles.productPrice}>₹{product.totalPrice.toLocaleString('en-IN')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Bottom padding */}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F0' },
  banner: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: SPACING.md },
  bannerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 8,
  },
  bannerBadgeText: { color: '#FEF3C7', fontSize: 10, fontWeight: '700' },
  bannerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 4 },
  bannerSub: { color: '#FDE68A', fontSize: 12, marginBottom: 14 },
  bannerActions: { flexDirection: 'row', gap: 10 },
  tryOnBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  tryOnBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  wishlistBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#FCD34D', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  wishlistBtnText: { color: '#FCD34D', fontSize: 13, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: SPACING.md, paddingVertical: 12, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  apptBtn: {
    backgroundColor: COLORS.primaryLight, padding: 10,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primaryMid,
  },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', paddingHorizontal: SPACING.md, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 0 },
  countText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  collectionCard: {
    width: 140, borderRadius: RADIUS.lg, padding: 14,
    ...SHADOWS.sm,
  },
  collectionTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginTop: 8 },
  collectionSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 },
  materialStrip: { backgroundColor: '#FFFFFF', paddingVertical: 10 },
  materialChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  materialChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  categoryStrip: { backgroundColor: '#FFFFFF', paddingVertical: 12, marginTop: 1 },
  catItem: { alignItems: 'center', gap: 4, width: 64 },
  catIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 10, fontWeight: '600', color: '#334155', textAlign: 'center' },
  vendorCard: {
    width: 90, alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  vendorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  vendorAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  vendorName: { fontSize: 10, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  vendorRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  vendorRatingText: { fontSize: 10, color: '#64748B' },
  vendorDist: { fontSize: 9, color: '#94A3B8' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  productCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', ...SHADOWS.sm,
  },
  productImageWrap: { position: 'relative', height: 160 },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productImagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF9EC',
  },
  tryOnBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tryOnBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  heartBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, ...SHADOWS.sm,
  },
  productInfo: { padding: 10 },
  productName: { fontSize: 12, fontWeight: '700', color: '#0F172A', lineHeight: 16 },
  productVendor: { fontSize: 10, color: '#64748B', marginTop: 2 },
  productPurity: { fontSize: 10, color: '#B45309', fontWeight: '600', marginTop: 2 },
  productPrice: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginTop: 8 },
  emptyText: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' },
});
