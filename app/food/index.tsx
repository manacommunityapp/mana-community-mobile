import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { useCallback } from 'react';

type FoodCategory = 'ALL' | 'TIFFIN' | 'HOME_COOKED' | 'BAKERY' | 'SNACKS' | 'BEVERAGES';

const CATEGORIES: { value: FoodCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ALL',         label: 'All',         icon: 'grid-outline' },
  { value: 'TIFFIN',      label: 'Tiffin',      icon: 'restaurant-outline' },
  { value: 'HOME_COOKED', label: 'Home Food',   icon: 'home-outline' },
  { value: 'BAKERY',      label: 'Bakery',      icon: 'cafe-outline' },
  { value: 'SNACKS',      label: 'Snacks',      icon: 'fast-food-outline' },
  { value: 'BEVERAGES',   label: 'Drinks',      icon: 'beer-outline' },
];

interface FoodItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: FoodCategory;
  vendorName: string;
  vendorFlat: string;
  rating: number;
  isVeg: boolean;
  available: boolean;
}

const SAMPLE_ITEMS: FoodItem[] = [
  { id: 1, name: 'South Indian Thali',     description: 'Rice, sambar, rasam, 2 curries, curd',         price: 120, category: 'TIFFIN',      vendorName: 'Lakshmi Kitchen', vendorFlat: 'B2-301', rating: 4.5, isVeg: true, available: true },
  { id: 2, name: 'Paneer Butter Masala',   description: 'Rich creamy paneer with butter naan',          price: 180, category: 'HOME_COOKED', vendorName: 'Rani\'s Kitchen', vendorFlat: 'A1-205', rating: 4.8, isVeg: true, available: true },
  { id: 3, name: 'Chocolate Brownies (6)', description: 'Fudgy brownies with walnut topping',            price: 200, category: 'BAKERY',      vendorName: 'Sweet Bites',     vendorFlat: 'C3-102', rating: 4.7, isVeg: true, available: true },
  { id: 4, name: 'Chicken Biryani',        description: 'Hyderabadi dum biryani with raita',             price: 220, category: 'HOME_COOKED', vendorName: 'Nawab\'s Pot',    vendorFlat: 'B1-404', rating: 4.9, isVeg: false, available: true },
  { id: 5, name: 'Samosa (4 pcs)',         description: 'Crispy potato samosas with chutney',            price: 60,  category: 'SNACKS',      vendorName: 'Snack Corner',    vendorFlat: 'A2-103', rating: 4.3, isVeg: true, available: false },
  { id: 6, name: 'Fresh Juice Combo',      description: 'Orange, watermelon & mango juice (300ml each)', price: 150, category: 'BEVERAGES',   vendorName: 'Juice Bar',       vendorFlat: 'C1-GF',  rating: 4.6, isVeg: true, available: true },
];

export default function FoodScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FoodCategory>('ALL');

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goHome(); return true; });
      return () => sub.remove();
    }, [goHome])
  );

  const filtered = filter === 'ALL' ? SAMPLE_ITEMS : SAMPLE_ITEMS.filter(i => i.category === filter);

  const renderItem = ({ item }: { item: FoodItem }) => (
    <View style={[s.foodCard, !item.available && s.unavailable]}>
      <View style={s.foodImagePlaceholder}>
        <Ionicons name="restaurant" size={28} color={item.isVeg ? '#059669' : '#DC2626'} />
        <View style={[s.vegBadge, { backgroundColor: item.isVeg ? '#D1FAE5' : '#FEE2E2' }]}>
          <View style={[s.vegDot, { backgroundColor: item.isVeg ? '#059669' : '#DC2626' }]} />
        </View>
      </View>
      <View style={s.foodInfo}>
        <Text style={s.foodName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.foodDesc} numberOfLines={2}>{item.description}</Text>
        <View style={s.vendorRow}>
          <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.vendorText}>{item.vendorName} ({item.vendorFlat})</Text>
        </View>
        <View style={s.foodFooter}>
          <Text style={s.foodPrice}>{'₹'}{item.price}</Text>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={s.ratingText}>{item.rating}</Text>
          </View>
          {!item.available && (
            <Text style={s.soldOut}>Sold Out</Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Community Kitchen</Text>
          <Text style={s.headerSub}>Fresh food from your neighbors</Text>
        </View>
        <TouchableOpacity style={s.backBtn} hitSlop={8}>
          <Ionicons name="cart-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={s.filterScroll}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[s.filterChip, filter === c.value && s.filterChipActive]}
            onPress={() => setFilter(c.value)}
          >
            <Ionicons
              name={c.icon}
              size={14}
              color={filter === c.value ? '#fff' : COLORS.textMuted}
            />
            <Text style={[s.filterText, filter === c.value && s.filterTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Food List */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No items available</Text>
            <Text style={s.emptyDesc}>Check back later for fresh food from your community!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  filterScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: COLORS.accent },
  filterText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 12, gap: 10 },
  foodCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  unavailable: { opacity: 0.6 },
  foodImagePlaceholder: {
    width: 72, height: 72, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  vegBadge: {
    position: 'absolute', top: 4, left: 4, width: 16, height: 16,
    borderRadius: 3, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  vegDot: { width: 8, height: 8, borderRadius: 4 },
  foodInfo: { flex: 1, gap: 2 },
  foodName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  foodDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  vendorText: { fontSize: 11, color: COLORS.textMuted },
  foodFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  foodPrice: { fontSize: 16, fontWeight: '800', color: COLORS.accent },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  soldOut: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
