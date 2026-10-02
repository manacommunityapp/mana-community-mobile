import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { foodService, GroceryItemDto, GroceryOrderDto } from '@/services/foodService';

type TabKey = 'shop' | 'orders';
type CategoryKey = 'All' | 'Vegetables' | 'Fruits' | 'Dairy' | 'Grains' | 'Spices' | 'Organic';

const CATEGORIES: CategoryKey[] = ['All', 'Vegetables', 'Fruits', 'Dairy', 'Grains', 'Spices', 'Organic'];

export default function GroceryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('shop');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/food');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack])
  );

  const {
    data: items = [],
    isLoading: loadingItems,
    refetch: refetchItems,
  } = useQuery<GroceryItemDto[]>({
    queryKey: ['food', 'grocery-items'],
    queryFn: () => foodService.getGroceryItems(),
    staleTime: 60_000,
  });

  const {
    data: groceryOrders = [],
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery<GroceryOrderDto[]>({
    queryKey: ['food', 'grocery-orders'],
    queryFn: () => foodService.getGroceryOrders(),
    staleTime: 30_000,
  });

  const placeGroceryOrder = useMutation({
    mutationFn: (payload: { items: Array<{ itemId: string; name: string; qty: number; price: number }>; totalAmount: number }) =>
      foodService.placeGroceryOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      setCart({});
      setActiveTab('orders');
      Alert.alert('Order Placed!', 'Your grocery order will be delivered within 2 hours.');
    },
    onError: () => {
      Alert.alert('Error', 'Could not place grocery order. Please try again.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.allSettled([refetchItems(), refetchOrders()]); }
    finally { setRefreshing(false); }
  }, [refetchItems, refetchOrders]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const cartTotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.price * (cart[item.id] || 0)), 0);
  }, [items, cart]);

  const cartItemCount = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] || 0) + delta);
      if (next === 0) { const copy = { ...prev }; delete copy[itemId]; return copy; }
      return { ...prev, [itemId]: next };
    });
  };

  const handleCheckout = () => {
    if (cartItemCount === 0) { Alert.alert('Empty Cart', 'Add items to your cart first.'); return; }
    const orderItems = items
      .filter((i) => (cart[i.id] || 0) > 0)
      .map((i) => ({ itemId: i.id, name: i.name, qty: cart[i.id], price: i.price }));
    placeGroceryOrder.mutate({ items: orderItems, totalAmount: cartTotal });
  };

  const isInitialLoading = loadingItems && items.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Organic Grocery</Text>
          <Text style={styles.headerSub}>Farm-fresh from society farmers</Text>
        </View>
        <TouchableOpacity onPress={() => setActiveTab(activeTab === 'orders' ? 'shop' : 'orders')} style={styles.headerBtn}>
          <Ionicons name={activeTab === 'orders' ? 'leaf-outline' : 'receipt-outline'} size={20} color={COLORS.primary} />
          {cartItemCount > 0 && activeTab !== 'orders' && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartItemCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* Hero */}
        <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Ionicons name="leaf" size={12} color="#FEF3C7" />
                <Text style={styles.heroBadgeText}>ORGANIC & LOCAL</Text>
              </View>
              <Text style={styles.heroTitle}>Society Farmers Market</Text>
              <Text style={styles.heroSubtitle}>Organic veggies, fruits, dairy & grains sourced directly from society residents who grow their own</Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Ionicons name="leaf" size={26} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{items.length}</Text>
              <Text style={styles.heroStatLabel}>Products</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>100%</Text>
              <Text style={styles.heroStatLabel}>Organic</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>2 Hrs</Text>
              <Text style={styles.heroStatLabel}>Delivery</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput style={styles.searchInput} placeholder="Search organic produce..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={COLORS.textMuted} /></TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['shop', 'orders'] as TabKey[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabItem, activeTab === t && styles.tabItemActive]} onPress={() => setActiveTab(t)} activeOpacity={0.7}>
              <Ionicons name={t === 'shop' ? 'leaf' : 'receipt-outline'} size={16} color={activeTab === t ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t === 'shop' ? 'Shop' : 'My Orders'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Chips */}
        {activeTab === 'shop' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity key={c} style={[styles.catChip, selectedCategory === c && styles.catChipActive]} onPress={() => setSelectedCategory(c)} activeOpacity={0.7}>
                <Text style={[styles.catChipText, selectedCategory === c && styles.catChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {isInitialLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading grocery items...</Text>
          </View>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && !isInitialLoading && (
          <View style={{ gap: SPACING.sm }}>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="leaf-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Products Found</Text>
                <Text style={styles.emptySub}>Try a different category or search term.</Text>
              </View>
            ) : (
              filteredItems.map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <View key={item.id} style={styles.itemCard}>
                    <View style={styles.itemIconWrap}>
                      <Ionicons name={item.isOrganic ? 'leaf' : 'nutrition'} size={20} color={item.isOrganic ? '#059669' : '#F59E0B'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.isOrganic && <View style={styles.organicTag}><Text style={styles.organicTagText}>Organic</Text></View>}
                      </View>
                      <Text style={styles.itemMeta}>{item.unit} · by {item.farmerName}</Text>
                      <Text style={styles.itemPrice}>₹{item.price}</Text>
                    </View>
                    <View style={styles.stepperWrap}>
                      {qty === 0 ? (
                        <TouchableOpacity style={styles.addBtn} onPress={() => handleUpdateQty(item.id, 1)}>
                          <Text style={styles.addBtnText}>+ ADD</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.stepper}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => handleUpdateQty(item.id, -1)}>
                            <Ionicons name="remove" size={15} color={COLORS.primary} />
                          </TouchableOpacity>
                          <Text style={styles.stepQty}>{qty}</Text>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => handleUpdateQty(item.id, 1)}>
                            <Ionicons name="add" size={15} color={COLORS.primary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {groceryOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Grocery Orders</Text>
                <Text style={styles.emptySub}>Start shopping from the society farmers market.</Text>
              </View>
            ) : (
              groceryOrders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderIdText}>Order #{order.id}</Text>
                      <Text style={styles.orderDateText}>{order.orderTime}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: order.status === 'DELIVERED' ? '#D1FAE5' : '#EEF2FF' }]}>
                      <Text style={[styles.statusText, { color: order.status === 'DELIVERED' ? '#059669' : COLORS.primary }]}>{order.status}</Text>
                    </View>
                  </View>
                  <View style={styles.orderItemsBox}>
                    {order.items.map((it, i) => (
                      <View key={i} style={styles.orderItemRow}>
                        <Text style={styles.orderItemName}>{it.name} x{it.qty}</Text>
                        <Text style={styles.orderItemPrice}>₹{it.price * it.qty}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.orderTotal}>
                    <Text style={styles.orderTotalLabel}>Total</Text>
                    <Text style={styles.orderTotalVal}>₹{order.totalAmount}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Cart Bar */}
      {cartItemCount > 0 && activeTab === 'shop' && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartBarItems}>{cartItemCount} items</Text>
            <Text style={styles.cartBarTotal}>₹{cartTotal}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkoutBtn, placeGroceryOrder.isPending && { opacity: 0.6 }]}
            onPress={handleCheckout}
            disabled={placeGroceryOrder.isPending}
          >
            {placeGroceryOrder.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.checkoutBtnText}>Checkout</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99, 102, 241, 0.12)' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  cartBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#059669', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  scrollContent: { padding: SPACING.md, paddingBottom: 100 },
  centerContainer: { padding: SPACING.xl, alignItems: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  heroBanner: { borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 6 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#FEF3C7', fontFamily: 'Outfit-Bold', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroSubtitle: { fontSize: 12, color: '#ECFDF5', marginTop: 2, lineHeight: 17, fontFamily: 'DMSans-Regular' },
  heroIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, marginTop: SPACING.md },
  heroStatCard: { alignItems: 'center' },
  heroStatNumber: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroStatLabel: { fontSize: 10, color: '#ECFDF5', marginTop: 1, fontFamily: 'DMSans-Medium' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', gap: 8, marginBottom: SPACING.sm, ...SHADOWS.sm },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular' },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4, marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.12)', gap: 4 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.md, gap: 5 },
  tabItemActive: { backgroundColor: '#ECFDF5' },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: '#059669', fontWeight: '800', fontFamily: 'Outfit-Bold' },

  catScroll: { gap: 6, paddingBottom: SPACING.md },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  catChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  catChipTextActive: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Outfit-Bold' },

  emptyCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular' },

  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.12)', gap: SPACING.sm, ...SHADOWS.sm },
  itemIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  organicTag: { backgroundColor: '#D1FAE5', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  organicTagText: { fontSize: 8, fontWeight: '800', color: '#059669', fontFamily: 'Outfit-Bold' },
  itemMeta: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#059669', fontFamily: 'Outfit-Bold', marginTop: 2 },
  stepperWrap: { alignItems: 'flex-end' },
  addBtn: { backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  addBtnText: { fontSize: 11, fontWeight: '800', color: '#059669', fontFamily: 'Outfit-Bold' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  stepBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  stepQty: { fontSize: 12, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', minWidth: 16, textAlign: 'center' },

  orderCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', ...SHADOWS.sm, gap: SPACING.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderIdText: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  orderDateText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  orderItemsBox: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, gap: 4 },
  orderItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderItemName: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  orderItemPrice: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  orderTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  orderTotalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  orderTotalVal: { fontSize: 16, fontWeight: '900', color: '#059669', fontFamily: 'Outfit-Bold' },

  cartBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOWS.md },
  cartBarItems: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  cartBarTotal: { fontSize: 18, fontWeight: '900', color: '#059669', fontFamily: 'Outfit-Bold' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md, ...SHADOWS.sm },
  checkoutBtnText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
