import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, Image, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import {
  jewelleryService,
  JewelleryCategory,
  JewelleryMaterial,
  FitProfile,
} from '@/services/jewelleryService';

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
  { key: 'ALL',       label: 'All',        color: '#4F46E5' },
  { key: 'GOLD',      label: '🪙 Gold',    color: '#B45309' },
  { key: 'DIAMOND',   label: '💎 Diamond', color: '#0EA5E9' },
  { key: 'SILVER',    label: '🔘 Silver',  color: '#64748B' },
  { key: 'ARTIFICIAL',label: '✨ Fashion', color: '#EC4899' },
  { key: 'GEMSTONE',  label: '💍 Gems',    color: '#7C3AED' },
];

const FESTIVE_COLLECTIONS = [
  { title: 'Bridal Sets',    subtitle: 'Necklace + Earrings + Tikka', color: '#7C3AED', icon: 'heart' },
  { title: 'Diwali Special', subtitle: 'Gold coins & jewellery gifts', color: '#B45309', icon: 'sparkles' },
  { title: 'New Arrivals',   subtitle: 'Latest designs this season',   color: '#059669', icon: 'star' },
  { title: 'Under ₹5,000',   subtitle: 'Affordable fashion jewellery', color: '#DC2626', icon: 'pricetag' },
];

const FACE_SHAPES: {
  key: FitProfile['faceShape'];
  label: string;
  desc: string;
  tip: string;
}[] = [
  {
    key: 'oval',
    label: 'Oval',
    desc: 'Balanced forehead & softly rounded jawline',
    tip: 'Best with: 10–60mm drops, studs, hoops & 14–28" necklaces',
  },
  {
    key: 'round',
    label: 'Round',
    desc: 'Full cheeks with equal face width & length',
    tip: 'Best with: Elongated drops (30–70mm) & longer 18–30" necklaces',
  },
  {
    key: 'square',
    label: 'Square',
    desc: 'Strong jawline with broad forehead',
    tip: 'Best with: Medium curves/hoops (15–40mm) & 16–24" necklaces',
  },
  {
    key: 'heart',
    label: 'Heart',
    desc: 'Wider forehead tapering to a pointed chin',
    tip: 'Best with: Chandelier/teardrop earrings (20–50mm) & 14–20" chokers',
  },
  {
    key: 'oblong',
    label: 'Oblong',
    desc: 'Longer face shape with sleek cheekbones',
    tip: 'Best with: Clustered studs/short drops (5–30mm) & 14–18" necklaces',
  },
];

export default function JewelleryHomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<FilterMode>('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState<JewelleryMaterial | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fitModalVisible, setFitModalVisible] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: featured = [], isLoading: loadingFeatured, refetch: refetchFeatured } = useQuery({
    queryKey: ['jewellery-featured'],
    queryFn: jewelleryService.getFeaturedProducts,
  });

  const { data: vendors = [], isLoading: loadingVendors, refetch: refetchVendors } = useQuery({
    queryKey: ['jewellery-vendors'],
    queryFn: jewelleryService.getNearbyVendors,
  });

  const { data: products = [], isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['jewellery-products', selectedCategory, selectedMaterial, debouncedSearch],
    queryFn: () =>
      jewelleryService.getProducts({
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        material: selectedMaterial !== 'ALL' ? selectedMaterial : undefined,
        search: debouncedSearch || undefined,
      }),
  });

  const { data: fitProfile } = useQuery({
    queryKey: ['jewellery-fit-profile'],
    queryFn: jewelleryService.getFitProfile,
  });

  const recCategory = selectedCategory === 'NECKLACE' ? 'NECKLACE' : 'EARRINGS';

  const { data: recommendations = [], refetch: refetchRecs } = useQuery({
    queryKey: ['jewellery-recommendations', recCategory, fitProfile?.faceShape],
    queryFn: () => jewelleryService.getRecommendations(recCategory, 6),
  });

  const saveFitMutation = useMutation({
    mutationFn: (faceShape: FitProfile['faceShape']) =>
      jewelleryService.saveFitProfile({ faceShape, confidence: 0.9 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-fit-profile'] });
      queryClient.invalidateQueries({ queryKey: ['jewellery-recommendations'] });
      setFitModalVisible(false);
    },
    onError: () => Alert.alert('Error', 'Could not save your fit profile. Please try again.'),
  });

  const deleteFitMutation = useMutation({
    mutationFn: () => jewelleryService.deleteFitProfile(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-fit-profile'] });
      queryClient.invalidateQueries({ queryKey: ['jewellery-recommendations'] });
      setFitModalVisible(false);
    },
  });

  const isLoading = loadingFeatured || loadingVendors;

  const handleRefresh = () => {
    refetchFeatured();
    refetchVendors();
    refetchProducts();
    refetchRecs();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Hero Banner */}
        <LinearGradient colors={['#78350F', '#B45309', '#D97706']} style={styles.banner}>
          <View style={styles.bannerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.bannerBadge}>
              <Ionicons name="diamond" size={12} color="#FCD34D" />
              <Text style={styles.bannerBadgeText}>Mana Jewellery Hub</Text>
            </View>
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
            <TouchableOpacity
              style={styles.fitBtn}
              onPress={() => setFitModalVisible(true)}
            >
              <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />
              <Text style={styles.tryOnBtnText}>
                {fitProfile?.faceShape ? `Fit: ${fitProfile.faceShape}` : 'Fit Profile'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tryOnBtn}
              onPress={() => router.push('/jewellery/merchant')}
            >
              <Ionicons name="storefront-outline" size={14} color="#FFFFFF" />
              <Text style={styles.tryOnBtnText}>Jeweller Console</Text>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 10 }}
          >
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
                <Text style={[styles.catLabel, active && { color: COLORS.primary, fontWeight: '700' }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured Highlights Carousel */}
        {featured.length > 0 && selectedCategory === 'ALL' && selectedMaterial === 'ALL' && !debouncedSearch && (
          <View style={styles.section}>
            <View style={[styles.sectionRow, { paddingHorizontal: SPACING.md, marginBottom: 8 }]}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>
                Featured Masterpieces
              </Text>
              <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700' }}>BIS Hallmarked</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 12 }}
            >
              {featured.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.featuredCard}
                  onPress={() => router.push(`/jewellery/${item.id}`)}
                >
                  {item.imageUrls?.[0] ? (
                    <Image source={{ uri: item.imageUrls[0] }} style={styles.featuredImg} />
                  ) : (
                    <View style={styles.featuredImgPlaceholder}>
                      <Ionicons name="diamond" size={24} color="#D97706" />
                    </View>
                  )}
                  <View style={styles.featuredInfo}>
                    <Text style={styles.featuredName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.featuredVendor} numberOfLines={1}>{item.vendorName}</Text>
                    <Text style={styles.featuredPrice}>₹{item.totalPrice.toLocaleString('en-IN')}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Nearby Verified Jewellers */}
        {vendors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verified Jewellers Nearby</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 12 }}
            >
              {vendors.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.vendorCard}
                  onPress={() =>
                    router.push({ pathname: '/jewellery/vendor/[vendorId]', params: { vendorId: v.id } })
                  }
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

        {/* Fit Profile Prompt Banner (when not configured) */}
        {!fitProfile && (
          <TouchableOpacity
            style={styles.fitPromptCard}
            onPress={() => setFitModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.fitPromptIcon}>
              <Ionicons name="sparkles" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fitPromptTitle}>Personalize "For You" Fit Recommendations</Text>
              <Text style={styles.fitPromptSub}>
                Select your face shape to discover earring drop-lengths & necklace styles tailored to your proportions.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7C3AED" />
          </TouchableOpacity>
        )}

        {/* Recommended For You (Fit Profile matching) */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={[styles.sectionRow, { paddingHorizontal: SPACING.md, marginBottom: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={16} color="#7C3AED" />
                <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginBottom: 0 }]}>
                  For You ({fitProfile?.faceShape?.toUpperCase()} Fit)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFitModalVisible(true)}>
                <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700' }}>Edit Fit</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: 12 }}
            >
              {recommendations.map((item) => (
                <TouchableOpacity
                  key={item.productId}
                  style={styles.recCard}
                  onPress={() => router.push(`/jewellery/${item.productId}`)}
                >
                  <View style={styles.recBadge}>
                    <Ionicons name="sparkles" size={10} color="#7C3AED" />
                    <Text style={styles.recBadgeText}>Proportion Match</Text>
                  </View>
                  <Text style={styles.recName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.recPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
                  {item.reason ? <Text style={styles.recReason} numberOfLines={1}>{item.reason}</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Products Grid */}
        <View style={[styles.section, { paddingHorizontal: SPACING.md }]}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { paddingHorizontal: 0 }]}>
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

      {/* Fit Profile Setup Modal */}
      <Modal visible={fitModalVisible} transparent animationType="slide" onRequestClose={() => setFitModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={18} color="#7C3AED" />
                <Text style={styles.modalTitle}>Jewellery Fit Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setFitModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Choose your face shape to get Lenskart-style proportion recommendations for earring drop-length and necklace length.
            </Text>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 10, paddingVertical: 6 }}>
              {FACE_SHAPES.map((shape) => {
                const isSelected = fitProfile?.faceShape === shape.key;
                return (
                  <TouchableOpacity
                    key={shape.key}
                    style={[styles.shapeCard, isSelected && styles.shapeCardActive]}
                    onPress={() => saveFitMutation.mutate(shape.key)}
                    disabled={saveFitMutation.isPending}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.shapeLabel, isSelected && { color: '#7C3AED' }]}>{shape.label}</Text>
                        {isSelected && (
                          <View style={styles.activeShapeBadge}>
                            <Text style={styles.activeShapeBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.shapeDesc}>{shape.desc}</Text>
                      <Text style={styles.shapeTip}>{shape.tip}</Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'chevron-forward'}
                      size={20}
                      color={isSelected ? '#7C3AED' : '#94A3B8'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.privacyFootnote}>
              Privacy Note: Only your selected shape category is stored for product matching. You can clear it anytime.
            </Text>

            {fitProfile && (
              <TouchableOpacity
                style={styles.deleteFitBtn}
                onPress={() => deleteFitMutation.mutate()}
                disabled={deleteFitMutation.isPending}
              >
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                <Text style={styles.deleteFitBtnText}>Remove Saved Fit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F0' },
  banner: { paddingTop: 48, paddingBottom: 20, paddingHorizontal: SPACING.md },
  bannerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  backBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  bannerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  bannerBadgeText: { color: '#FEF3C7', fontSize: 10, fontWeight: '700' },
  bannerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30, marginBottom: 4 },
  bannerSub: { color: '#FDE68A', fontSize: 12, marginBottom: 14 },
  bannerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tryOnBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  tryOnBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  wishlistBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#FCD34D', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  wishlistBtnText: { color: '#FCD34D', fontSize: 12, fontWeight: '600' },
  fitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(124,58,237,0.75)', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
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
  materialStrip: { marginTop: 14 },
  materialChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
  },
  materialChipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  categoryStrip: { marginTop: 14 },
  catItem: { alignItems: 'center', gap: 4 },
  catIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontSize: 10, color: '#475569', fontWeight: '600' },
  featuredCard: {
    width: 150, backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: '#FDE68A', ...SHADOWS.sm,
  },
  featuredImg: { width: '100%', height: 110, resizeMode: 'cover' },
  featuredImgPlaceholder: {
    width: '100%', height: 110, backgroundColor: '#FEF3C7',
    alignItems: 'center', justifyContent: 'center',
  },
  featuredInfo: { padding: 8 },
  featuredName: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  featuredVendor: { fontSize: 10, color: '#64748B', marginTop: 1 },
  featuredPrice: { fontSize: 13, fontWeight: '900', color: '#B45309', marginTop: 3 },
  vendorCard: {
    width: 110, backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg,
    padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  vendorAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, position: 'relative',
  },
  vendorAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  verifiedBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#10B981', borderRadius: 8, width: 14, height: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  vendorName: { fontSize: 11, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  vendorRating: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  vendorRatingText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  vendorDist: { fontSize: 9, color: '#94A3B8', marginTop: 1 },
  fitPromptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: SPACING.md, marginTop: 16, padding: 14,
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  fitPromptIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  fitPromptTitle: { fontSize: 13, fontWeight: '800', color: '#4C1D95', marginBottom: 2 },
  fitPromptSub: { fontSize: 11, color: '#6D28D9', lineHeight: 15 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  productCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg,
    overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  productImageWrap: { height: 150, backgroundColor: '#F8FAFC', position: 'relative' },
  productImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  productImagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF9EC',
  },
  tryOnBadge: {
    position: 'absolute', bottom: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.primary, paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tryOnBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  heartBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, ...SHADOWS.sm,
  },
  productInfo: { padding: 10 },
  productName: { fontSize: 12, fontWeight: '700', color: '#0F172A', lineHeight: 16, marginBottom: 2 },
  productVendor: { fontSize: 10, color: '#64748B', marginBottom: 2 },
  productPurity: { fontSize: 9, color: '#B45309', fontWeight: '600', marginBottom: 3 },
  productPrice: { fontSize: 14, fontWeight: '900', color: '#B45309' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155' },
  emptyText: { fontSize: 12, color: '#94A3B8' },
  recCard: {
    width: 155, backgroundColor: '#FFFFFF', borderRadius: RADIUS.lg,
    padding: 12, borderWidth: 1.5, borderColor: '#DDD6FE', ...SHADOWS.sm,
  },
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 6,
  },
  recBadgeText: { fontSize: 9, fontWeight: '800', color: '#7C3AED' },
  recName: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 4, lineHeight: 16 },
  recPrice: { fontSize: 13, fontWeight: '900', color: '#B45309' },
  recReason: { fontSize: 10, color: '#64748B', marginTop: 3 },
  // Fit Profile Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.md, paddingBottom: 32,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', lineHeight: 18, marginBottom: 12 },
  shapeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  shapeCardActive: { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  shapeLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  activeShapeBadge: {
    backgroundColor: '#7C3AED', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: RADIUS.full,
  },
  activeShapeBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  shapeDesc: { fontSize: 11, color: '#475569', marginTop: 2 },
  shapeTip: { fontSize: 10.5, color: '#6D28D9', fontWeight: '600', marginTop: 3 },
  privacyFootnote: { fontSize: 10.5, color: '#94A3B8', textAlign: 'center', marginTop: 12 },
  deleteFitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10, borderRadius: RADIUS.md,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
  },
  deleteFitBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },
});
