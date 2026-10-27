import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { jewelleryService } from '@/services/jewelleryService';

export default function JewelleryProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ['jewellery-product', id],
    queryFn: () => jewelleryService.getProductById(id!),
    enabled: !!id,
  });

  const wishlistMutation = useMutation({
    mutationFn: () =>
      product?.isWishlisted
        ? jewelleryService.removeFromWishlist(id!)
        : jewelleryService.addToWishlist(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jewellery-product', id] });
      queryClient.invalidateQueries({ queryKey: ['jewellery-wishlist'] });
    },
    onError: () => Alert.alert('Error', 'Failed to update wishlist. Please try again.'),
  });

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.loadingWrap}>
        <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
        <Text style={styles.notFoundText}>Product not found</Text>
      </View>
    );
  }

  const priceBreakdown = [
    product.netWeightG && product.goldRatePerGram
      ? { label: `Gold (${product.netWeightG}g × ₹${product.goldRatePerGram}/g)`, value: product.netWeightG * product.goldRatePerGram }
      : null,
    product.makingCharges ? { label: 'Making Charges', value: product.makingCharges } : null,
    product.stoneCost     ? { label: 'Stone / Diamond',  value: product.stoneCost }     : null,
    product.gstPercent    ? { label: `GST @ ${product.gstPercent}%`, value: product.totalPrice * (product.gstPercent / 100) } : null,
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Image Gallery */}
        <View style={styles.imageWrap}>
          {product.imageUrls?.[selectedImageIdx] ? (
            <Image
              source={{ uri: product.imageUrls[selectedImageIdx] }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="diamond-outline" size={64} color="#C7D2FE" />
            </View>
          )}
          {/* Wishlist button */}
          <TouchableOpacity
            style={styles.wishlistFab}
            onPress={() => wishlistMutation.mutate()}
            disabled={wishlistMutation.isPending}
          >
            <Ionicons
              name={product.isWishlisted ? 'heart' : 'heart-outline'}
              size={20}
              color={product.isWishlisted ? '#EF4444' : '#64748B'}
            />
          </TouchableOpacity>
          {/* Image thumbnails */}
          {product.imageUrls?.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbStrip}
              contentContainerStyle={{ gap: 6, paddingHorizontal: SPACING.sm }}
            >
              {product.imageUrls.map((url, i) => (
                <TouchableOpacity key={i} onPress={() => setSelectedImageIdx(i)}>
                  <Image
                    source={{ uri: url }}
                    style={[styles.thumb, i === selectedImageIdx && styles.thumbActive]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoTop}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{product.category.replace(/_/g, ' ')}</Text>
            </View>
            {product.status === 'OUT_OF_STOCK' && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>

          <Text style={styles.productName}>{product.name}</Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/jewellery/vendor/[vendorId]', params: { vendorId: product.vendorId } })}
          >
            <Text style={styles.vendorName}>by {product.vendorName} →</Text>
          </TouchableOpacity>

          {/* Metal Details */}
          <View style={styles.detailRow}>
            {product.material && (
              <View style={styles.detailChip}>
                <Ionicons name="cube-outline" size={12} color="#B45309" />
                <Text style={styles.detailChipText}>{product.material}</Text>
              </View>
            )}
            {product.purity && (
              <View style={styles.detailChip}>
                <Ionicons name="shield-checkmark-outline" size={12} color="#059669" />
                <Text style={styles.detailChipText}>{product.purity}</Text>
              </View>
            )}
            {product.netWeightG && (
              <View style={styles.detailChip}>
                <Ionicons name="scale-outline" size={12} color="#4F46E5" />
                <Text style={styles.detailChipText}>{product.netWeightG}g</Text>
              </View>
            )}
          </View>

          {/* HUID */}
          {product.huid && (
            <View style={styles.huidRow}>
              <Ionicons name="barcode-outline" size={14} color="#B45309" />
              <Text style={styles.huidText}>BIS HUID: {product.huid}</Text>
            </View>
          )}

          {/* Description */}
          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.cardTitle}>Price Breakdown</Text>
          {priceBreakdown.length > 0 ? (
            <>
              {priceBreakdown.map((item) => (
                <View key={item.label} style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{item.label}</Text>
                  <Text style={styles.priceValue}>₹{item.value.toLocaleString('en-IN')}</Text>
                </View>
              ))}
              <View style={styles.priceDivider} />
            </>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalValue}>₹{product.totalPrice.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Try-On Section */}
        {product.tryOnAssetUrl && (
          <View style={styles.tryOnCard}>
            <View style={styles.tryOnHeader}>
              <Ionicons name="camera" size={20} color={COLORS.primary} />
              <Text style={styles.tryOnCardTitle}>Virtual Try-On Available</Text>
            </View>
            <Text style={styles.tryOnCardSub}>
              See how this {product.category.toLowerCase().replace(/_/g, ' ')} looks on you before buying.
            </Text>
            <TouchableOpacity
              style={styles.tryOnCardBtn}
              onPress={() =>
                router.push({ pathname: '/jewellery/try-on', params: { productId: product.id } })
              }
            >
              <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
              <Text style={styles.tryOnCardBtnText}>Try On Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stock Info */}
        {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
          <View style={styles.lowStockWarn}>
            <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
            <Text style={styles.lowStockText}>Only {product.stockQuantity} left in stock!</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.consultBtn}
          onPress={() => router.push({ pathname: '/jewellery/appointments', params: { vendorId: product.vendorId } })}
        >
          <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
          <Text style={styles.consultBtnText}>Consult</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addCartBtn, product.status === 'OUT_OF_STOCK' && styles.disabledBtn]}
          disabled={product.status === 'OUT_OF_STOCK'}
        >
          <Ionicons name="bag-add-outline" size={16} color="#FFFFFF" />
          <Text style={styles.addCartBtnText}>
            {product.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF8F0' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: '#64748B' },
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  imageWrap: { backgroundColor: '#FFFFFF', position: 'relative' },
  mainImage: { width: '100%', height: 300 },
  imagePlaceholder: { height: 300, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF9EC' },
  wishlistFab: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 8, ...SHADOWS.sm,
  },
  thumbStrip: { backgroundColor: '#FFFFFF', paddingVertical: 8 },
  thumb: { width: 56, height: 56, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: '#E2E8F0' },
  thumbActive: { borderColor: COLORS.primary },
  infoCard: { backgroundColor: '#FFFFFF', margin: 12, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
  infoTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  categoryChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  categoryChipText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  outOfStockBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  outOfStockText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  productName: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 2 },
  vendorName: { fontSize: 12, color: '#64748B', marginBottom: 10 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#E2E8F0' },
  detailChipText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  huidRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', padding: 8, borderRadius: RADIUS.sm, marginBottom: 10 },
  huidText: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  description: { fontSize: 13, color: '#475569', lineHeight: 20, marginTop: 4 },
  priceCard: { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginBottom: 12, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.sm },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 12, color: '#64748B' },
  priceValue: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  priceDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#B45309' },
  tryOnCard: { backgroundColor: COLORS.primaryLight, marginHorizontal: 12, marginBottom: 12, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primaryMid },
  tryOnHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tryOnCardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  tryOnCardSub: { fontSize: 12, color: '#475569', marginBottom: 12 },
  tryOnCardBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md, alignSelf: 'flex-start' },
  tryOnCardBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  lowStockWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', marginHorizontal: 12, padding: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#FDE68A' },
  lowStockText: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  actionBar: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  consultBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.md,
  },
  consultBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  addCartBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#B45309', paddingVertical: 12, borderRadius: RADIUS.md,
  },
  addCartBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  disabledBtn: { backgroundColor: '#CBD5E1' },
});
