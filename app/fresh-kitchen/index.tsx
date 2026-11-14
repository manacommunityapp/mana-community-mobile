import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { freshKitchenService, SEED_FRESH_PRODUCTS } from '@/services/freshKitchenService';
import type { FreshFoodProduct, FreshFoodProductCategory } from '@/types/freshKitchen';

const CATEGORIES: { key: FreshFoodProductCategory; label: string; icon: string }[] = [
  { key: 'ALL', label: 'All Items', icon: 'sparkles' },
  { key: 'STANDARD_BATTER', label: 'Standard Batters', icon: 'restaurant-outline' },
  { key: 'SPECIALTY_BATTER', label: 'Specialty Batters', icon: 'flame-outline' },
  { key: 'MILLET_BATTER', label: 'Millet Batters', icon: 'leaf-outline' },
  { key: 'CHUTNEY_PODI', label: 'Chutneys & Podis', icon: 'nutrition-outline' },
];

export default function FreshKitchenScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<FreshFoodProductCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<FreshFoodProduct[]>(SEED_FRESH_PRODUCTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [activeCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await freshKitchenService.getProducts(activeCategory);
      setProducts(data);
    } catch {
      setProducts(SEED_FRESH_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToBasket = async (product: FreshFoodProduct) => {
    try {
      await freshKitchenService.addItemToDailyBasket({
        productId: product.id,
        itemName: product.name,
        itemCategory: product.category,
        unitPrice: product.price,
        quantity: 1,
        scheduledDays: ['MON', 'WED', 'FRI'],
      });
      Alert.alert(
        'Added to My Daily Basket',
        `${product.name} will be delivered fresh on Mon, Wed, Fri mornings between 6:00-7:00 AM.`,
        [
          { text: 'View Basket', onPress: () => router.push('/daily-basket') },
          { text: 'Continue Shopping', style: 'cancel' },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add to basket');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Mana Fresh Kitchen',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/daily-basket')}
              style={styles.basketIconBtn}
            >
              <Ionicons name="basket-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Freshness Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerBadge}>
          <Ionicons name="snow-outline" size={16} color="#0284c7" />
          <Text style={styles.bannerBadgeText}>Cold Chain 2°C – 4°C</Text>
        </View>
        <Text style={styles.bannerTitle}>Fresh Stone-Ground Batters & Morning Kits</Text>
        <Text style={styles.bannerSub}>
          Ground at 4 AM, chilled immediately, and delivered to your doorstep before 7 AM.
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          placeholder="Search batters, chutneys, meal kits..."
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={isSelected ? '#ffffff' : '#475569'}
              />
              <Text
                style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Products Grid / List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Fetching fresh morning kitchen items...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.productsList}>
          {filteredProducts.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productTopRow}>
                <View style={styles.freshBadge}>
                  <Ionicons name="thermometer-outline" size={12} color="#0369a1" />
                  <Text style={styles.freshBadgeText}>2-4°C Safe</Text>
                </View>
                <View style={styles.shelfLifeBadge}>
                  <Ionicons name="time-outline" size={12} color="#059669" />
                  <Text style={styles.shelfLifeText}>{product.shelfLifeHours}h Life</Text>
                </View>
              </View>

              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productUnit}>{product.unit}</Text>
              <Text style={styles.productDesc} numberOfLines={2}>
                {product.description}
              </Text>

              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.priceText}>₹{product.price}</Text>
                  {product.mrp > product.price && (
                    <Text style={styles.mrpText}>MRP ₹{product.mrp}</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddToBasket(product)}
                >
                  <Ionicons name="add" size={18} color="#ffffff" />
                  <Text style={styles.addBtnText}>Daily Basket</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  basketIconBtn: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  banner: {
    backgroundColor: '#e0f2fe',
    margin: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  bannerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 44,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  categoryScroll: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  productsList: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...SHADOWS.sm,
  },
  productTopRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.xs,
  },
  freshBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freshBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369a1',
  },
  shelfLifeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shelfLifeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  productUnit: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: SPACING.xs,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  mrpText: {
    fontSize: 11,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: '#64748b',
  },
});
