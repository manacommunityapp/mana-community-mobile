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
} from '@/services/foodService';

type TabKey = 'kitchens' | 'orders';

const STATUS_CONFIG: Record<FoodOrderDto['status'], { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  PLACED:           { label: 'Order Placed',      color: '#4F46E5', bg: '#EEF2FF', icon: 'checkmark-circle-outline' },
  PREPARING:        { label: 'Cooking in Kitchen',color: '#D97706', bg: '#FEF3C7', icon: 'flame-outline' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: '#2563EB', bg: '#DBEAFE', icon: 'bicycle-outline' },
  DELIVERED:        { label: 'Delivered',         color: '#059669', bg: '#D1FAE5', icon: 'bag-check-outline' },
};

// Default sample menu items for restaurants to enable 1-tap cart & checkout
const RESTAURANT_MENUS: Record<string, Array<{ id: string; name: string; price: number; isVeg: boolean; desc: string }>> = {
  default: [
    { id: 'm1', name: 'Special Resident Thali', price: 150, isVeg: true, desc: 'Fresh roti, dal tadka, paneer sabzi, rice & salad' },
    { id: 'm2', name: 'Home Style Biryani Bowl', price: 220, isVeg: false, desc: 'Aromatic basmati rice cooked with home spices & raita' },
    { id: 'm3', name: 'Fresh Artisan Brownie / Sweet Box', price: 120, isVeg: true, desc: 'Freshly baked homemade sweet dessert' },
  ],
};

export default function FoodScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('kitchens');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Order modal state
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantDto | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<FoodOrderDto | null>(null);

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedOrderDetails) {
          setSelectedOrderDetails(null);
          return true;
        }
        if (selectedRestaurant) {
          setSelectedRestaurant(null);
          return true;
        }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, selectedRestaurant, selectedOrderDetails])
  );

  // ── 1. Fetch Live Restaurants / Home Kitchens ─────────────────────────────
  const {
    data: restaurants = [],
    isLoading: loadingRestaurants,
    refetch: refetchRestaurants,
  } = useQuery<RestaurantDto[]>({
    queryKey: ['food', 'restaurants'],
    queryFn: () => foodService.getRestaurants(),
    staleTime: 30_000,
  });

  // ── 2. Fetch Live Orders ──────────────────────────────────────────────────
  const {
    data: orders = [],
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery<FoodOrderDto[]>({
    queryKey: ['food', 'my-orders'],
    queryFn: () => foodService.getMyOrders(),
    staleTime: 15_000,
  });

  // ── Pull-to-Refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetchRestaurants(), refetchOrders()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchRestaurants, refetchOrders]);

  // ── 3. Place Order Mutation ───────────────────────────────────────────────
  const placeOrderMutation = useMutation({
    mutationFn: (payload: {
      restaurantId?: string;
      restaurantName: string;
      items: Array<{ name: string; qty: number; price: number }>;
      totalAmount: number;
    }) => foodService.placeOrder(payload),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      setSelectedRestaurant(null);
      setCart({});
      setActiveTab('orders');
      Alert.alert(
        '🍲 Order Placed Successfully!',
        `Your order with ${newOrder.restaurantName || 'the kitchen'} has been received and is being prepared.`
      );
    },
    onError: (err: any) => {
      Alert.alert('Order Failed', err?.message || 'Unable to place food order. Please try again.');
    },
  });

  // Derived Cuisines
  const cuisines = useMemo(() => {
    const set = new Set<string>(['All']);
    restaurants.forEach((r) => r.cuisine && set.add(r.cuisine));
    return Array.from(set);
  }, [restaurants]);

  // Filtered Restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const matchCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
      const matchQuery =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCuisine && matchQuery;
    });
  }, [restaurants, selectedCuisine, searchQuery]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      return (
        !searchQuery ||
        o.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [orders, searchQuery]);

  // Cart Helpers
  const menuList = useMemo(() => {
    if (!selectedRestaurant) return [];
    return RESTAURANT_MENUS[selectedRestaurant.id] || RESTAURANT_MENUS.default;
  }, [selectedRestaurant]);

  const cartTotal = useMemo(() => {
    return menuList.reduce((acc, item) => {
      const qty = cart[item.id] || 0;
      return acc + item.price * qty;
    }, 0);
  }, [menuList, cart]);

  const cartItemCount = useMemo(() => {
    return Object.values(cart).reduce((acc, qty) => acc + qty, 0);
  }, [cart]);

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleConfirmOrder = () => {
    if (!selectedRestaurant || cartItemCount === 0) {
      Alert.alert('Empty Cart', 'Please select at least 1 food item to order.');
      return;
    }

    const orderItems = menuList
      .filter((m) => (cart[m.id] || 0) > 0)
      .map((m) => ({
        name: m.name,
        qty: cart[m.id],
        price: m.price,
      }));

    placeOrderMutation.mutate({
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      items: orderItems,
      totalAmount: cartTotal,
    });
  };

  const handleShareOrder = async (order: FoodOrderDto) => {
    try {
      await Share.share({
        message: `🍲 *Mana Food Order*\nKitchen: ${order.restaurantName}\nStatus: ${order.status}\nItems: ${order.items.map((i) => `${i.name} (x${i.qty})`).join(', ')}\nTotal: ₹${order.totalAmount}`,
      });
    } catch {
      // dismissed
    }
  };

  const isInitialLoading = (loadingRestaurants || loadingOrders) && !refreshing && restaurants.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Screen Header ── */}
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
          <Ionicons
            name={activeTab === 'orders' ? 'restaurant-outline' : 'receipt-outline'}
            size={20}
            color={COLORS.primary}
          />
          {orders.length > 0 && activeTab !== 'orders' && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{orders.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Top Hero Banner ── */}
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={12} color="#FEF3C7" />
                <Text style={styles.heroBadgeText}>SOCIETY HOME CHEFS</Text>
              </View>
              <Text style={styles.heroTitle}>Community Kitchen</Text>
              <Text style={styles.heroSubtitle}>
                Hot, hygienic home food delivered straight to your flat door
              </Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Ionicons name="restaurant" size={26} color="#FFFFFF" />
            </View>
          </View>

          {/* Metrics Row */}
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
              <Text style={styles.heroStatNumber}>~25 Mins</Text>
              <Text style={styles.heroStatLabel}>Avg Delivery</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Search Bar ── */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'kitchens'
                  ? 'Search home chefs or cuisines...'
                  : 'Search your past food orders...'
              }
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Segmented Navigation Tabs ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'kitchens' && styles.tabItemActive]}
            onPress={() => setActiveTab('kitchens')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="restaurant"
              size={16}
              color={activeTab === 'kitchens' ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'kitchens' && styles.tabTextActive]}>
              Home Kitchens
            </Text>
            <View style={[styles.tabBadge, activeTab === 'kitchens' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'kitchens' && styles.tabBadgeTextActive]}>
                {restaurants.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
            onPress={() => setActiveTab('orders')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={activeTab === 'orders' ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              My Orders
            </Text>
            {orders.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'orders' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'orders' && styles.tabBadgeTextActive]}>
                  {orders.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Cuisine Filter Pills ── */}
        {activeTab === 'kitchens' && cuisines.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {cuisines.map((c) => {
              const active = selectedCuisine === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCuisine(c)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Loading Spinner ── */}
        {isInitialLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading community home kitchens...</Text>
          </View>
        )}

        {/* ── TAB 1: KITCHENS LIST ── */}
        {activeTab === 'kitchens' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {filteredRestaurants.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="restaurant-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Kitchens Found</Text>
                <Text style={styles.emptySub}>
                  {searchQuery
                    ? 'No home kitchens match your search criteria.'
                    : 'Check back soon for available community home chefs.'}
                </Text>
              </View>
            ) : (
              filteredRestaurants.map((kitchen) => (
                <View key={kitchen.id} style={styles.kitchenCard}>
                  <View style={styles.kitchenHeaderRow}>
                    <View style={styles.kitchenIconWrap}>
                      <Ionicons name="restaurant" size={24} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.kitchenName} numberOfLines={1}>
                          {kitchen.name}
                        </Text>
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={styles.ratingText}>{kitchen.rating || 4.8}</Text>
                        </View>
                      </View>

                      <Text style={styles.cuisineText}>{kitchen.cuisine}</Text>
                    </View>
                  </View>

                  {/* Highlights Row */}
                  <View style={styles.kitchenMetaBar}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{kitchen.deliveryTime || '20-30 mins'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="cash-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>Min Order: ₹{kitchen.minOrder || 100}</Text>
                    </View>
                  </View>

                  {/* Footer & Order Action */}
                  <View style={styles.kitchenFooter}>
                    <Text style={styles.doorstepNote}>Doorstep Flat Delivery</Text>
                    <TouchableOpacity
                      style={styles.orderNowBtn}
                      onPress={() => {
                        setSelectedRestaurant(kitchen);
                        setCart({ m1: 1 });
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.orderNowBtnText}>View Menu & Order</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── TAB 2: MY ORDERS ── */}
        {activeTab === 'orders' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Orders Placed Yet</Text>
                <Text style={styles.emptySub}>
                  Explore community home kitchens and enjoy delicious meals from neighbors.
                </Text>
                <TouchableOpacity
                  style={styles.exploreKitchensBtn}
                  onPress={() => setActiveTab('kitchens')}
                >
                  <Text style={styles.exploreKitchensBtnText}>Browse Home Chefs</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredOrders.map((order) => {
                const statusMeta = STATUS_CONFIG[order.status] || STATUS_CONFIG.PLACED;
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.orderCard}
                    onPress={() => setSelectedOrderDetails(order)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.orderHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.orderKitchenName}>{order.restaurantName}</Text>
                        <Text style={styles.orderIdText}>Order #{order.id}</Text>
                      </View>
                      <View style={[styles.orderStatusBadge, { backgroundColor: statusMeta.bg }]}>
                        <Ionicons name={statusMeta.icon} size={13} color={statusMeta.color} />
                        <Text style={[styles.orderStatusText, { color: statusMeta.color }]}>
                          {statusMeta.label}
                        </Text>
                      </View>
                    </View>

                    {/* Items List Preview */}
                    <View style={styles.orderItemsBox}>
                      {order.items?.map((item, i) => (
                        <View key={i} style={styles.orderItemRow}>
                          <Text style={styles.orderItemName}>
                            {item.name} <Text style={{ color: COLORS.textMuted }}>x{item.qty}</Text>
                          </Text>
                          <Text style={styles.orderItemPrice}>₹{item.price * item.qty}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Order Total & Footer */}
                    <View style={styles.orderFooter}>
                      <View>
                        <Text style={styles.orderTotalLabel}>Paid Total</Text>
                        <Text style={styles.orderTotalValue}>₹{order.totalAmount}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.shareOrderBtn}
                        onPress={() => handleShareOrder(order)}
                      >
                        <Ionicons name="share-social-outline" size={15} color={COLORS.primary} />
                        <Text style={styles.shareOrderBtnText}>Share Details</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── MODAL 1: MENU & ORDERING MODAL ── */}
      <Modal visible={!!selectedRestaurant} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedRestaurant?.name}
                </Text>
                <Text style={styles.modalSubtitle}>{selectedRestaurant?.cuisine}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedRestaurant(null);
                  setCart({});
                }}
                disabled={placeOrderMutation.isPending}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              <Text style={styles.menuSectionHeader}>Available Dishes Today</Text>
              <View style={{ gap: SPACING.sm }}>
                {menuList.map((dish) => {
                  const qty = cart[dish.id] || 0;
                  return (
                    <View key={dish.id} style={styles.menuItemCard}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <View
                            style={[
                              styles.vegIndicator,
                              { borderColor: dish.isVeg ? '#059669' : '#DC2626' },
                            ]}
                          >
                            <View
                              style={[
                                styles.vegIndicatorDot,
                                { backgroundColor: dish.isVeg ? '#059669' : '#DC2626' },
                              ]}
                            />
                          </View>
                          <Text style={styles.dishName}>{dish.name}</Text>
                        </View>
                        <Text style={styles.dishDesc} numberOfLines={2}>
                          {dish.desc}
                        </Text>
                        <Text style={styles.dishPrice}>₹{dish.price}</Text>
                      </View>

                      {/* Stepper */}
                      <View style={styles.stepperWrap}>
                        {qty === 0 ? (
                          <TouchableOpacity
                            style={styles.addDishBtn}
                            onPress={() => handleUpdateQty(dish.id, 1)}
                          >
                            <Text style={styles.addDishBtnText}>+ ADD</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.stepperContainer}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleUpdateQty(dish.id, -1)}
                            >
                              <Ionicons name="remove" size={15} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.stepperQty}>{qty}</Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleUpdateQty(dish.id, 1)}
                            >
                              <Ionicons name="add" size={15} color={COLORS.primary} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bill Summary & Flat Info */}
            <View style={styles.billBox}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Deliver to Flat</Text>
                <Text style={styles.billVal}>
                  Tower {user?.tower || 'A'} - Unit {user?.flatNumber || '1204'}
                </Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total ({cartItemCount} items)</Text>
                <Text style={styles.billVal}>₹{cartTotal}</Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setSelectedRestaurant(null);
                  setCart({});
                }}
                disabled={placeOrderMutation.isPending}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmOrderBtn,
                  (cartItemCount === 0 || placeOrderMutation.isPending) && { opacity: 0.6 },
                ]}
                onPress={handleConfirmOrder}
                disabled={cartItemCount === 0 || placeOrderMutation.isPending}
              >
                {placeOrderMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmOrderBtnText}>
                    Place Order &bull; ₹{cartTotal}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: ORDER DETAILS ── */}
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
              <View style={{ gap: SPACING.sm }}>
                <View
                  style={[
                    styles.orderStatusBadge,
                    {
                      backgroundColor:
                        STATUS_CONFIG[selectedOrderDetails.status]?.bg || '#EEF2FF',
                      alignSelf: 'flex-start',
                    },
                  ]}
                >
                  <Ionicons
                    name={STATUS_CONFIG[selectedOrderDetails.status]?.icon || 'checkmark-circle'}
                    size={14}
                    color={STATUS_CONFIG[selectedOrderDetails.status]?.color || COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.orderStatusText,
                      { color: STATUS_CONFIG[selectedOrderDetails.status]?.color || COLORS.primary },
                    ]}
                  >
                    {STATUS_CONFIG[selectedOrderDetails.status]?.label || selectedOrderDetails.status}
                  </Text>
                </View>

                <View style={styles.detailItemsList}>
                  {selectedOrderDetails.items?.map((it, idx) => (
                    <View key={idx} style={styles.orderItemRow}>
                      <Text style={styles.orderItemName}>
                        {it.name} x{it.qty}
                      </Text>
                      <Text style={styles.orderItemPrice}>₹{it.price * it.qty}</Text>
                    </View>
                  ))}
                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailTotalLabel}>Grand Total</Text>
                    <Text style={styles.detailTotalVal}>₹{selectedOrderDetails.totalAmount}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setSelectedOrderDetails(null)}
                >
                  <Text style={styles.doneBtnText}>Close</Text>
                </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.12)',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  headerCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  scrollContent: { padding: SPACING.md, paddingBottom: 40 },
  centerContainer: { padding: SPACING.xl, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  heroBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEF3C7',
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#EEF2FF',
    marginTop: 2,
    lineHeight: 16,
    fontFamily: 'DMSans-Regular',
  },
  heroIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  heroStatCard: { alignItems: 'center' },
  heroStatNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#EEF2FF',
    marginTop: 1,
    fontFamily: 'DMSans-Medium',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  searchContainer: { marginBottom: SPACING.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    gap: 8,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'DMSans-Regular',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.12)',
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 5,
  },
  tabItemActive: { backgroundColor: '#EEF2FF' },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: 'DMSans-Medium',
  },
  tabTextActive: { color: COLORS.primary, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  tabBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeActive: { backgroundColor: COLORS.primary },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  tabBadgeTextActive: { color: '#FFFFFF' },

  categoryScroll: { gap: 6, paddingBottom: SPACING.md },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  categoryChipTextActive: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Outfit-Bold' },

  kitchenCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  kitchenHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kitchenIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kitchenName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: 'Outfit-Bold',
  },
  cuisineText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: 'DMSans-Regular',
  },

  kitchenMetaBar: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginVertical: SPACING.md,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  kitchenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  doorstepNote: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  orderNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  orderNowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
  },

  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderKitchenName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  orderIdText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  orderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
  },
  orderItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    gap: 4,
  },
  orderItemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  orderItemName: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  orderItemPrice: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },

  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  orderTotalLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  orderTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  shareOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  shareOrderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontFamily: 'DMSans-Regular',
    paddingHorizontal: 20,
  },
  exploreKitchensBtn: {
    marginTop: SPACING.sm,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  exploreKitchensBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: 'DMSans-Regular',
  },

  menuSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: SPACING.sm,
  },
  vegIndicator: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegIndicatorDot: { width: 6, height: 6, borderRadius: 3 },
  dishName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  dishDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: 'DMSans-Regular',
  },
  dishPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 4,
    fontFamily: 'Outfit-Bold',
  },

  stepperWrap: { alignItems: 'flex-end' },
  addDishBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  addDishBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  stepperBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  stepperQty: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    minWidth: 16,
    textAlign: 'center',
  },

  billBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    gap: 4,
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between' },
  billLabel: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  billVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },

  modalActionRow: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  confirmOrderBtn: {
    flex: 1.6,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  confirmOrderBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
  },

  detailItemsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    gap: 6,
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: 4,
  },
  detailTotalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  detailTotalVal: { fontSize: 16, fontWeight: '900', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  doneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },
});
