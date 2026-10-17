import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  foodService,
  RestaurantDto,
  FoodOrderDto,
  MenuItemDto,
} from '@/services/foodService';

type TabKey = 'kitchens' | 'orders';

const ORDER_STEPS: Array<{ key: FoodOrderDto['status']; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'PLACED',           label: 'Order Placed',      icon: 'checkmark-circle-outline' },
  { key: 'PREPARING',        label: 'Cooking',           icon: 'flame-outline' },
  { key: 'OUT_FOR_DELIVERY', label: 'On the Way',        icon: 'bicycle-outline' },
  { key: 'DELIVERED',        label: 'Delivered',         icon: 'bag-check-outline' },
];

const STATUS_CONFIG: Record<FoodOrderDto['status'], { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PLACED:           { label: 'Order Placed',      color: '#4F46E5', bg: '#EEF2FF', icon: 'checkmark-circle-outline' },
  PREPARING:        { label: 'Cooking in Kitchen',color: '#D97706', bg: '#FEF3C7', icon: 'flame-outline' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: '#2563EB', bg: '#DBEAFE', icon: 'bicycle-outline' },
  DELIVERED:        { label: 'Delivered',          color: '#059669', bg: '#D1FAE5', icon: 'bag-check-outline' },
  CANCELLED:        { label: 'Cancelled',          color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

const KITCHEN_OFFERS: Record<string, string> = {
  'res-1': 'Society Exclusive • ₹20 off',
  'res-2': 'Free Delivery Today',
  'res-3': '1st Order • 15% off',
  'res-4': 'Weekend Special Deal',
};

const GST_RATE = 0.05;
const DELIVERY_FEE = 0; // Free intra-society delivery

// ── Order Tracking Timeline ───────────────────────────────────────────────────
function OrderTrackingTimeline({ status }: { status: FoodOrderDto['status'] }) {
  if (status === 'CANCELLED') return null;
  const currentIdx = ORDER_STEPS.findIndex((s) => s.key === status);
  return (
    <View style={tlStyles.container}>
      {ORDER_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const isActive = idx === currentIdx;
        return (
          <View key={step.key} style={tlStyles.stepRow}>
            <View style={tlStyles.lineCol}>
              <View style={[tlStyles.dot, done ? tlStyles.dotDone : tlStyles.dotPending, isActive && tlStyles.dotActive]}>
                <Ionicons name={step.icon} size={12} color={done ? '#FFFFFF' : COLORS.textMuted} />
              </View>
              {idx < ORDER_STEPS.length - 1 && (
                <View style={[tlStyles.line, done && idx < currentIdx ? tlStyles.lineDone : tlStyles.linePending]} />
              )}
            </View>
            <View style={tlStyles.labelCol}>
              <Text style={[tlStyles.label, done ? tlStyles.labelDone : tlStyles.labelPending, isActive && tlStyles.labelActive]}>
                {step.label}
              </Text>
              {isActive && <Text style={tlStyles.activeHint}>In progress…</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const tlStyles = StyleSheet.create({
  container: { paddingVertical: SPACING.xs },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 40 },
  lineCol: { alignItems: 'center', width: 28 },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  dotPending: { backgroundColor: '#E2E8F0' },
  dotDone: { backgroundColor: COLORS.primary },
  dotActive: { backgroundColor: '#F97316' },
  line: { width: 2, flex: 1, minHeight: 16, marginVertical: 2 },
  lineDone: { backgroundColor: COLORS.primary },
  linePending: { backgroundColor: '#E2E8F0' },
  labelCol: { flex: 1, paddingLeft: SPACING.sm, paddingBottom: 12 },
  label: { fontSize: 13, fontFamily: 'DMSans-Medium' },
  labelPending: { color: COLORS.textMuted },
  labelDone: { color: COLORS.text, fontWeight: '600' },
  labelActive: { color: '#F97316', fontWeight: '800', fontFamily: 'Outfit-Bold' },
  activeHint: { fontSize: 10, color: '#F97316', fontFamily: 'DMSans-Regular', marginTop: 1 },
});

// ── Star Rating Widget ────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: SPACING.sm }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} hitSlop={6}>
          <Ionicons name={star <= value ? 'star' : 'star-outline'} size={32} color={star <= value ? '#F59E0B' : '#CBD5E1'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function FoodScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('kitchens');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Ordering state
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantDto | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Order details + rating state
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<FoodOrderDto | null>(null);
  const [ratingModal, setRatingModal] = useState<{ order: FoodOrderDto } | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (ratingModal) { setRatingModal(null); return true; }
        if (selectedOrderDetails) { setSelectedOrderDetails(null); return true; }
        if (selectedRestaurant) { setSelectedRestaurant(null); setCart({}); setSpecialInstructions(''); return true; }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, selectedRestaurant, selectedOrderDetails, ratingModal])
  );

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: restaurants = [], isLoading: loadingRestaurants, refetch: refetchRestaurants } =
    useQuery<RestaurantDto[]>({
      queryKey: ['food', 'restaurants'],
      queryFn: () => foodService.getRestaurants(),
      staleTime: 30_000,
    });

  const { data: orders = [], isLoading: loadingOrders, refetch: refetchOrders } =
    useQuery<FoodOrderDto[]>({
      queryKey: ['food', 'my-orders'],
      queryFn: () => foodService.getMyOrders(),
      staleTime: 15_000,
    });

  const { data: liveMenu = [], isLoading: loadingMenu } =
    useQuery<MenuItemDto[]>({
      queryKey: ['food', 'menu', selectedRestaurant?.id],
      queryFn: () => (selectedRestaurant ? foodService.getRestaurantMenu(selectedRestaurant.id) : Promise.resolve([])),
      enabled: !!selectedRestaurant,
      staleTime: 30_000,
    });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.allSettled([refetchRestaurants(), refetchOrders()]); }
    finally { setRefreshing(false); }
  }, [refetchRestaurants, refetchOrders]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const placeOrderMutation = useMutation({
    mutationFn: (payload: {
      restaurantId?: string;
      restaurantName: string;
      items: Array<{ name: string; qty: number; price: number; isVeg?: boolean }>;
      totalAmount: number;
      deliveryAddress?: string;
      specialInstructions?: string;
    }) => foodService.placeOrder(payload),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      setSelectedRestaurant(null);
      setCart({});
      setSpecialInstructions('');
      setActiveTab('orders');
      Alert.alert('🍲 Order Placed!', `Order with ${newOrder.restaurantName || 'the kitchen'} is being prepared.`);
    },
    onError: (err: any) => {
      Alert.alert('Order Failed', err?.message || 'Unable to place order. Please try again.');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: string) => foodService.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      if (selectedOrderDetails) setSelectedOrderDetails((prev) => prev ? { ...prev, status: 'CANCELLED' } : null);
      Alert.alert('Order Cancelled', 'Your food order has been cancelled.');
    },
    onError: () => Alert.alert('Error', 'Unable to cancel order at this time.'),
  });

  const rateOrderMutation = useMutation({
    mutationFn: ({ orderId, rating, comment }: { orderId: string; rating: number; comment: string }) =>
      foodService.rateOrder(orderId, rating, comment),
    onSuccess: () => {
      setRatingModal(null);
      setStarRating(0);
      setRatingComment('');
      Alert.alert('Thank you!', 'Your feedback helps community chefs improve.');
    },
    onError: () => Alert.alert('Error', 'Could not submit rating. Please try again.'),
  });

  // ── Derived Data ─────────────────────────────────────────────────────────────
  const cuisines = useMemo(() => {
    const set = new Set<string>(['All']);
    restaurants.forEach((r) => r.cuisine && set.add(r.cuisine));
    return Array.from(set);
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
      const matchQuery = !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCuisine && matchQuery;
    });
  }, [restaurants, selectedCuisine, searchQuery]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => !searchQuery ||
      o.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  const menuList = useMemo(() => {
    if (!selectedRestaurant) return [];
    if (liveMenu && liveMenu.length > 0) return liveMenu;
    return selectedRestaurant.menu || [];
  }, [selectedRestaurant, liveMenu]);

  // Group menu items by category for Zomato-style sectioned display
  const categorizedMenu = useMemo(() => {
    const map = new Map<string, MenuItemDto[]>();
    menuList.forEach((item) => {
      const cat = item.category || 'Main Course';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    return Array.from(map.entries());
  }, [menuList]);

  const cartTotal = useMemo(() => {
    return menuList.reduce((acc, item) => acc + item.price * (cart[item.id] || 0), 0);
  }, [menuList, cart]);

  const cartGST = useMemo(() => Math.round(cartTotal * GST_RATE), [cartTotal]);
  const cartGrandTotal = useMemo(() => cartTotal + cartGST + DELIVERY_FEE, [cartTotal, cartGST]);

  const cartItemCount = useMemo(() => {
    return Object.values(cart).reduce((acc, qty) => acc + qty, 0);
  }, [cart]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = Math.max(0, (prev[itemId] || 0) + delta);
      if (next === 0) { const copy = { ...prev }; delete copy[itemId]; return copy; }
      return { ...prev, [itemId]: next };
    });
  };

  const handleConfirmOrder = () => {
    if (!selectedRestaurant || cartItemCount === 0) {
      Alert.alert('Empty Cart', 'Please select at least 1 item to order.');
      return;
    }
    const orderItems = menuList.filter((m) => (cart[m.id] || 0) > 0).map((m) => ({
      name: m.name, qty: cart[m.id], price: m.price, isVeg: m.isVeg,
    }));
    placeOrderMutation.mutate({
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      deliveryAddress: `Tower ${user?.tower || 'A'} - Unit ${user?.flatNumber || '1204'}`,
      items: orderItems,
      totalAmount: cartGrandTotal,
      specialInstructions: specialInstructions.trim() || undefined,
    });
  };

  // Reorder: open the same restaurant and pre-fill cart from past order items
  const handleReorder = (order: FoodOrderDto) => {
    const restaurant = restaurants.find((r) => r.id === order.restaurantId) ||
      restaurants.find((r) => r.name === order.restaurantName);
    if (!restaurant) {
      Alert.alert('Kitchen Unavailable', 'This kitchen is not available right now.');
      return;
    }
    const menu = restaurant.menu || [];
    const preCart: Record<string, number> = {};
    order.items.forEach((oi) => {
      const found = menu.find((m) => m.name === oi.name);
      if (found) preCart[found.id] = oi.qty;
    });
    setSelectedRestaurant(restaurant);
    setCart(preCart);
    setSpecialInstructions('');
    setSelectedOrderDetails(null);
  };

  const handleShareOrder = async (order: FoodOrderDto) => {
    try {
      await Share.share({
        message: `🍲 *Mana Food Order*\nKitchen: ${order.restaurantName}\nStatus: ${order.status}\nItems: ${order.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}\nTotal: ₹${order.totalAmount}`,
      });
    } catch { /* dismissed */ }
  };

  const isInitialLoading = (loadingRestaurants || loadingOrders) && !refreshing && restaurants.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goHome} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Home Kitchens & Food</Text>
          <Text style={styles.headerSub}>Fresh homemade meals by neighbor chefs</Text>
        </View>
        <TouchableOpacity
          onPress={() => setActiveTab(activeTab === 'orders' ? 'kitchens' : 'orders')}
          style={styles.headerCartBtn}
        >
          <Ionicons name={activeTab === 'orders' ? 'restaurant-outline' : 'receipt-outline'} size={20} color={COLORS.primary} />
          {orders.length > 0 && activeTab !== 'orders' && (
            <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{orders.length}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* Hero Banner */}
        <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={12} color="#FEF3C7" />
                <Text style={styles.heroBadgeText}>SOCIETY HOME CHEFS</Text>
              </View>
              <Text style={styles.heroTitle}>Community Kitchen</Text>
              <Text style={styles.heroSubtitle}>Hot, hygienic home food delivered straight to your flat door</Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Ionicons name="restaurant" size={26} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{restaurants.length}</Text>
              <Text style={styles.heroStatLabel}>Active Kitchens</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{orders.length}</Text>
              <Text style={styles.heroStatLabel}>My Orders</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>~25 min</Text>
              <Text style={styles.heroStatLabel}>Avg Delivery</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={activeTab === 'kitchens' ? 'Search home chefs or cuisines...' : 'Search your past food orders...'}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Segmented Tabs */}
        <View style={styles.tabBar}>
          {(['kitchens', 'orders'] as TabKey[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabItem, activeTab === t && styles.tabItemActive]} onPress={() => setActiveTab(t)} activeOpacity={0.7}>
              <Ionicons name={t === 'kitchens' ? 'restaurant' : 'receipt-outline'} size={16} color={activeTab === t ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'kitchens' ? 'Home Kitchens' : 'My Orders'}
              </Text>
              {(t === 'kitchens' ? restaurants.length : orders.length) > 0 && (
                <View style={[styles.tabBadge, activeTab === t && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === t && styles.tabBadgeTextActive]}>
                    {t === 'kitchens' ? restaurants.length : orders.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Cuisine Filter Pills */}
        {activeTab === 'kitchens' && cuisines.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {cuisines.map((c) => {
              const active = selectedCuisine === c;
              return (
                <TouchableOpacity key={c} style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={() => setSelectedCuisine(c)} activeOpacity={0.7}>
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {isInitialLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading community home kitchens...</Text>
          </View>
        )}

        {/* Tab: Kitchens List */}
        {activeTab === 'kitchens' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {filteredRestaurants.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Kitchens Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery ? 'No home kitchens match your search.' : 'Check back soon for available community home chefs.'}
                </Text>
              </View>
            ) : (
              filteredRestaurants.map((kitchen) => {
                const offer = KITCHEN_OFFERS[kitchen.id];
                return (
                  <View key={kitchen.id} style={styles.kitchenCard}>
                    {/* Offer Banner */}
                    {offer && (
                      <View style={styles.offerBanner}>
                        <Ionicons name="pricetag" size={11} color="#059669" />
                        <Text style={styles.offerBannerText}>{offer}</Text>
                      </View>
                    )}

                    <View style={styles.kitchenHeaderRow}>
                      <View style={styles.kitchenIconWrap}>
                        <Ionicons name="restaurant" size={24} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: SPACING.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={styles.kitchenName} numberOfLines={1}>{kitchen.name}</Text>
                          <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                            <Text style={styles.ratingText}>{kitchen.rating || 4.8}</Text>
                          </View>
                        </View>
                        <Text style={styles.cuisineText}>{kitchen.cuisine}</Text>
                        {kitchen.chefName && (
                          <Text style={styles.chefText}>Chef: {kitchen.chefName} · {kitchen.flatNumber || ''}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.kitchenMetaBar}>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>{kitchen.deliveryTime || '20-30 mins'}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="cash-outline" size={13} color={COLORS.textMuted} />
                        <Text style={styles.metaText}>Min ₹{kitchen.minOrder || 100}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="bicycle-outline" size={13} color="#059669" />
                        <Text style={[styles.metaText, { color: '#059669' }]}>Free Delivery</Text>
                      </View>
                    </View>

                    <View style={styles.kitchenFooter}>
                      <Text style={styles.doorstepNote}>Doorstep Flat Delivery</Text>
                      <TouchableOpacity style={styles.orderNowBtn} onPress={() => { setSelectedRestaurant(kitchen); setCart({}); setSpecialInstructions(''); }} activeOpacity={0.8}>
                        <Text style={styles.orderNowBtnText}>View Menu & Order</Text>
                        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Tab: My Orders */}
        {activeTab === 'orders' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Orders Placed Yet</Text>
                <Text style={styles.emptySub}>Explore community home kitchens and enjoy delicious meals.</Text>
                <TouchableOpacity style={styles.exploreKitchensBtn} onPress={() => setActiveTab('kitchens')}>
                  <Text style={styles.exploreKitchensBtnText}>Browse Home Chefs</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredOrders.map((order) => {
                const statusMeta = STATUS_CONFIG[order.status] || STATUS_CONFIG.PLACED;
                const isDelivered = order.status === 'DELIVERED';
                return (
                  <TouchableOpacity key={order.id} style={styles.orderCard} onPress={() => setSelectedOrderDetails(order)} activeOpacity={0.75}>
                    <View style={styles.orderHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderKitchenName}>{order.restaurantName}</Text>
                        <Text style={styles.orderIdText}>Order #{order.id}</Text>
                        {order.orderTime && <Text style={styles.orderTime}>{order.orderTime}</Text>}
                      </View>
                      <View style={[styles.orderStatusBadge, { backgroundColor: statusMeta.bg }]}>
                        <Ionicons name={statusMeta.icon} size={13} color={statusMeta.color} />
                        <Text style={[styles.orderStatusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                      </View>
                    </View>

                    <View style={styles.orderItemsBox}>
                      {order.items?.map((item, i) => (
                        <View key={i} style={styles.orderItemRow}>
                          <Text style={styles.orderItemName}>{item.name} <Text style={{ color: COLORS.textMuted }}>x{item.qty}</Text></Text>
                          <Text style={styles.orderItemPrice}>₹{item.price * item.qty}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.orderFooter}>
                      <View>
                        <Text style={styles.orderTotalLabel}>Grand Total</Text>
                        <Text style={styles.orderTotalValue}>₹{order.totalAmount}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {isDelivered && (
                          <TouchableOpacity style={styles.reorderBtn} onPress={(e) => { e.stopPropagation?.(); handleReorder(order); }}>
                            <Ionicons name="refresh-outline" size={13} color={COLORS.primary} />
                            <Text style={styles.reorderBtnText}>Reorder</Text>
                          </TouchableOpacity>
                        )}
                        {isDelivered && (
                          <TouchableOpacity style={styles.rateBtn} onPress={(e) => { e.stopPropagation?.(); setRatingModal({ order }); setStarRating(0); setRatingComment(''); }}>
                            <Ionicons name="star-outline" size={13} color="#F59E0B" />
                            <Text style={styles.rateBtnText}>Rate</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.shareOrderBtn} onPress={(e) => { e.stopPropagation?.(); handleShareOrder(order); }}>
                          <Ionicons name="share-social-outline" size={15} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── MODAL 1: Menu & Ordering ── */}
      <Modal visible={!!selectedRestaurant} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>{selectedRestaurant?.name}</Text>
                <Text style={styles.modalSubtitle}>{selectedRestaurant?.cuisine}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedRestaurant(null); setCart({}); setSpecialInstructions(''); }} disabled={placeOrderMutation.isPending}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {loadingMenu ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />
              ) : (
                categorizedMenu.map(([category, items]) => (
                  <View key={category} style={{ marginBottom: SPACING.sm }}>
                    <Text style={styles.menuSectionHeader}>{category}</Text>
                    <View style={{ gap: SPACING.sm }}>
                      {items.map((dish) => {
                        const qty = cart[dish.id] || 0;
                        return (
                          <View key={dish.id} style={styles.menuItemCard}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <View style={[styles.vegIndicator, { borderColor: dish.isVeg ? '#059669' : '#DC2626' }]}>
                                  <View style={[styles.vegIndicatorDot, { backgroundColor: dish.isVeg ? '#059669' : '#DC2626' }]} />
                                </View>
                                <Text style={styles.dishName}>{dish.name}</Text>
                                {dish.rating && dish.rating >= 4.5 && (
                                  <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>★ Popular</Text></View>
                                )}
                              </View>
                              {dish.desc ? <Text style={styles.dishDesc} numberOfLines={2}>{dish.desc}</Text> : null}
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                <Text style={styles.dishPrice}>₹{dish.price}</Text>
                                {dish.preparationTime && <Text style={styles.prepTime}>{dish.preparationTime}</Text>}
                              </View>
                            </View>
                            <View style={styles.stepperWrap}>
                              {qty === 0 ? (
                                <TouchableOpacity style={styles.addDishBtn} onPress={() => handleUpdateQty(dish.id, 1)}>
                                  <Text style={styles.addDishBtnText}>+ ADD</Text>
                                </TouchableOpacity>
                              ) : (
                                <View style={styles.stepperContainer}>
                                  <TouchableOpacity style={styles.stepperBtn} onPress={() => handleUpdateQty(dish.id, -1)}>
                                    <Ionicons name="remove" size={15} color={COLORS.primary} />
                                  </TouchableOpacity>
                                  <Text style={styles.stepperQty}>{qty}</Text>
                                  <TouchableOpacity style={styles.stepperBtn} onPress={() => handleUpdateQty(dish.id, 1)}>
                                    <Ionicons name="add" size={15} color={COLORS.primary} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Special Instructions */}
            <View style={styles.instructionsBox}>
              <Ionicons name="create-outline" size={14} color={COLORS.textMuted} />
              <TextInput
                style={styles.instructionsInput}
                placeholder="Special instructions (no onion, extra spicy…)"
                placeholderTextColor={COLORS.textMuted}
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                multiline
                maxLength={200}
              />
            </View>

            {/* Bill Breakdown */}
            <View style={styles.billBox}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Deliver to</Text>
                <Text style={styles.billVal}>Tower {user?.tower || 'A'} - Unit {user?.flatNumber || '1204'}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total ({cartItemCount} items)</Text>
                <Text style={styles.billVal}>₹{cartTotal}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>GST (5%)</Text>
                <Text style={styles.billVal}>₹{cartGST}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <Text style={[styles.billVal, { color: '#059669' }]}>FREE (Society)</Text>
              </View>
              <View style={[styles.billRow, styles.billTotalRow]}>
                <Text style={styles.billTotalLabel}>Grand Total</Text>
                <Text style={styles.billTotalVal}>₹{cartGrandTotal}</Text>
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setSelectedRestaurant(null); setCart({}); setSpecialInstructions(''); }} disabled={placeOrderMutation.isPending}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmOrderBtn, (cartItemCount === 0 || placeOrderMutation.isPending) && { opacity: 0.6 }]}
                onPress={handleConfirmOrder}
                disabled={cartItemCount === 0 || placeOrderMutation.isPending}
              >
                {placeOrderMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmOrderBtnText}>Place Order · ₹{cartGrandTotal}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: Order Details with Tracking Timeline ── */}
      <Modal visible={!!selectedOrderDetails} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedOrderDetails?.restaurantName}</Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrderDetails?.id}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrderDetails(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedOrderDetails && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Zomato-style tracking timeline */}
                {selectedOrderDetails.status !== 'CANCELLED' && (
                  <View style={styles.trackingSection}>
                    <Text style={styles.trackingSectionTitle}>Order Tracking</Text>
                    <OrderTrackingTimeline status={selectedOrderDetails.status} />
                  </View>
                )}

                {selectedOrderDetails.status === 'CANCELLED' && (
                  <View style={[styles.orderStatusBadge, { backgroundColor: '#FEE2E2', alignSelf: 'flex-start', marginBottom: SPACING.sm }]}>
                    <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                    <Text style={[styles.orderStatusText, { color: '#EF4444' }]}>Order Cancelled</Text>
                  </View>
                )}

                {/* Items breakdown */}
                <View style={styles.detailItemsList}>
                  {selectedOrderDetails.items?.map((it, idx) => (
                    <View key={idx} style={styles.orderItemRow}>
                      <Text style={styles.orderItemName}>{it.name} x{it.qty}</Text>
                      <Text style={styles.orderItemPrice}>₹{it.price * it.qty}</Text>
                    </View>
                  ))}
                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailTotalLabel}>Grand Total</Text>
                    <Text style={styles.detailTotalVal}>₹{selectedOrderDetails.totalAmount}</Text>
                  </View>
                </View>

                {selectedOrderDetails.deliveryAddress && (
                  <View style={styles.deliveryAddressRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.deliveryAddressText}>{selectedOrderDetails.deliveryAddress}</Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md }}>
                  <TouchableOpacity style={[styles.doneBtn, { flex: 1, backgroundColor: COLORS.surfaceAlt }]} onPress={() => handleShareOrder(selectedOrderDetails)}>
                    <Ionicons name="share-social-outline" size={15} color={COLORS.text} />
                    <Text style={[styles.doneBtnText, { color: COLORS.text, marginLeft: 4 }]}>Share</Text>
                  </TouchableOpacity>

                  {selectedOrderDetails.status === 'DELIVERED' && (
                    <TouchableOpacity
                      style={[styles.doneBtn, { flex: 1, backgroundColor: '#FEF3C7' }]}
                      onPress={() => { setRatingModal({ order: selectedOrderDetails }); setStarRating(0); setRatingComment(''); }}
                    >
                      <Ionicons name="star-outline" size={15} color="#D97706" />
                      <Text style={[styles.doneBtnText, { color: '#D97706', marginLeft: 4 }]}>Rate</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrderDetails.status === 'DELIVERED' && (
                    <TouchableOpacity
                      style={[styles.doneBtn, { flex: 1, backgroundColor: '#EEF2FF' }]}
                      onPress={() => handleReorder(selectedOrderDetails)}
                    >
                      <Ionicons name="refresh-outline" size={15} color={COLORS.primary} />
                      <Text style={[styles.doneBtnText, { color: COLORS.primary, marginLeft: 4 }]}>Reorder</Text>
                    </TouchableOpacity>
                  )}

                  {selectedOrderDetails.status === 'PLACED' && (
                    <TouchableOpacity
                      style={[styles.doneBtn, { flex: 1, backgroundColor: '#FEE2E2' }]}
                      onPress={() => {
                        Alert.alert('Cancel Order', 'Are you sure you want to cancel?', [
                          { text: 'No', style: 'cancel' },
                          { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelOrderMutation.mutate(selectedOrderDetails.id) },
                        ]);
                      }}
                      disabled={cancelOrderMutation.isPending}
                    >
                      <Text style={[styles.doneBtnText, { color: '#EF4444' }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.doneBtn, { flex: 1 }]} onPress={() => setSelectedOrderDetails(null)}>
                    <Text style={styles.doneBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: Post-Delivery Rating (Zomato-style) ── */}
      <Modal visible={!!ratingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Rate Your Order</Text>
              <TouchableOpacity onPress={() => setRatingModal(null)} disabled={rateOrderMutation.isPending}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {ratingModal && (
              <View style={{ gap: SPACING.sm }}>
                <Text style={[styles.modalSubtitle, { textAlign: 'center' }]}>
                  How was your meal from {ratingModal.order.restaurantName}?
                </Text>
                <StarRating value={starRating} onChange={setStarRating} />
                <Text style={styles.ratingHint}>
                  {starRating === 0 ? 'Tap a star to rate' : starRating <= 2 ? 'Sorry to hear that!' : starRating === 3 ? 'It was okay' : starRating === 4 ? 'Pretty good!' : 'Amazing! 🎉'}
                </Text>
                <TextInput
                  style={styles.ratingCommentInput}
                  placeholder="What did you like or dislike? (optional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  multiline
                  maxLength={300}
                />
                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setRatingModal(null)} disabled={rateOrderMutation.isPending}>
                    <Text style={styles.cancelBtnText}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmOrderBtn, (starRating === 0 || rateOrderMutation.isPending) && { opacity: 0.6 }]}
                    onPress={() => ratingModal && rateOrderMutation.mutate({ orderId: ratingModal.order.id, rating: starRating, comment: ratingComment })}
                    disabled={starRating === 0 || rateOrderMutation.isPending}
                  >
                    {rateOrderMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.confirmOrderBtnText}>Submit Rating</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99, 102, 241, 0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  headerCartBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  headerBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 10, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  headerBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  scrollContent: { padding: SPACING.md, paddingBottom: 40 },
  centerContainer: { padding: SPACING.xl, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  heroBanner: { borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 6 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#FEF3C7', fontFamily: 'Outfit-Bold', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroSubtitle: { fontSize: 12, color: '#EEF2FF', marginTop: 2, lineHeight: 16, fontFamily: 'DMSans-Regular' },
  heroIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, marginTop: SPACING.md },
  heroStatCard: { alignItems: 'center' },
  heroStatNumber: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroStatLabel: { fontSize: 10, color: '#EEF2FF', marginTop: 1, fontFamily: 'DMSans-Medium' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  searchContainer: { marginBottom: SPACING.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', gap: 8, ...SHADOWS.sm },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular' },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4, marginBottom: SPACING.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.12)', gap: 4 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.md, gap: 5 },
  tabItemActive: { backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  tabBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 },
  tabBadgeActive: { backgroundColor: COLORS.primary },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  tabBadgeTextActive: { color: '#FFFFFF' },

  categoryScroll: { gap: 6, paddingBottom: SPACING.md },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  categoryChipTextActive: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Outfit-Bold' },

  kitchenCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.sm, overflow: 'hidden' },
  offerBanner: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#DCFCE7', paddingHorizontal: SPACING.lg, paddingVertical: 5, marginHorizontal: -SPACING.lg, marginTop: -SPACING.lg, marginBottom: SPACING.md },
  offerBannerText: { fontSize: 11, fontWeight: '700', color: '#059669', fontFamily: 'Outfit-Bold' },
  kitchenHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  kitchenIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  kitchenName: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  ratingText: { fontSize: 11, fontWeight: '800', color: '#B45309', fontFamily: 'Outfit-Bold' },
  cuisineText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontFamily: 'DMSans-Regular' },
  chefText: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  kitchenMetaBar: { flexDirection: 'row', gap: SPACING.md, backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.sm, marginVertical: SPACING.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  kitchenFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  doorstepNote: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  orderNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, ...SHADOWS.sm },
  orderNowBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  orderCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.sm },
  orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderKitchenName: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  orderIdText: { fontSize: 11, fontFamily: 'monospace', color: COLORS.textMuted, marginTop: 1 },
  orderTime: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  orderStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  orderStatusText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  orderItemsBox: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, marginVertical: SPACING.md, gap: 4 },
  orderItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderItemName: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  orderItemPrice: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  orderTotalLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  orderTotalValue: { fontSize: 16, fontWeight: '900', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  reorderBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md },
  reorderBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md },
  rateBtnText: { fontSize: 11, fontWeight: '700', color: '#D97706', fontFamily: 'Outfit-Bold' },
  shareOrderBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },

  emptyCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 20 },
  exploreKitchensBtn: { marginTop: SPACING.sm, backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  exploreKitchensBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },

  menuSectionHeader: { fontSize: 11, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.xs, marginTop: SPACING.xs, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.1)' },
  menuItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: '#E2E8F0', gap: SPACING.sm },
  vegIndicator: { width: 14, height: 14, borderRadius: 3, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  vegIndicatorDot: { width: 6, height: 6, borderRadius: 3 },
  dishName: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', flex: 1 },
  popularBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  popularBadgeText: { fontSize: 9, fontWeight: '800', color: '#B45309', fontFamily: 'Outfit-Bold' },
  dishDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  dishPrice: { fontSize: 13, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  prepTime: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  stepperWrap: { alignItems: 'flex-end' },
  addDishBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  addDishBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  stepperBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  stepperQty: { fontSize: 12, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', minWidth: 16, textAlign: 'center' },

  instructionsBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: '#E2E8F0', marginVertical: SPACING.sm },
  instructionsInput: { flex: 1, fontSize: 12, color: COLORS.text, fontFamily: 'DMSans-Regular', minHeight: 36 },

  billBox: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, marginVertical: SPACING.sm, gap: 5 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  billLabel: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  billVal: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  billTotalRow: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 5, marginTop: 2 },
  billTotalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  billTotalVal: { fontSize: 15, fontWeight: '900', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  modalActionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmOrderBtn: { flex: 1.6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm },
  confirmOrderBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  trackingSection: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#E2E8F0' },
  trackingSectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },

  detailItemsList: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, marginVertical: SPACING.sm, gap: 6 },
  detailTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, marginTop: 4 },
  detailTotalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  detailTotalVal: { fontSize: 16, fontWeight: '900', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  deliveryAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: SPACING.xs },
  deliveryAddressText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  doneBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  ratingHint: { textAlign: 'center', fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  ratingCommentInput: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', borderWidth: 1, borderColor: '#E2E8F0', minHeight: 60 },
});
