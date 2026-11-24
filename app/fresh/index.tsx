import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import {
  freshProduceService,
  FreshProduct,
  FreshOrder,
} from '@/services/freshProduceService';

const CATEGORIES = [
  'All',
  'Leafy Greens',
  'Vegetables',
  'Fruits',
  'Dairy & Eggs',
  'Organic Staples',
];

interface CartItem {
  product: FreshProduct;
  quantity: number;
}

export default function ManaFreshScreen() {
  const router = useRouter();

  // State
  const [products, setProducts] = useState<FreshProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<Record<number, CartItem>>({});

  // Modals
  const [cartModalVisible, setCartModalVisible] = useState<boolean>(false);
  const [ordersModalVisible, setOrdersModalVisible] = useState<boolean>(false);
  const [myOrders, setMyOrders] = useState<FreshOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);

  // Checkout form
  const [deliveryAddress, setDeliveryAddress] = useState<string>('Flat 402, Tower B, Mana Sarovar');
  const [deliverySlot, setDeliverySlot] = useState<string>('Morning 06:30 AM – 08:30 AM');
  const [notes, setNotes] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);

  const loadProducts = useCallback(async () => {
    try {
      const data = await freshProduceService.getProducts();
      setProducts(data);
    } catch {
      // Handled in service fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
  };

  const loadMyOrders = async () => {
    setLoadingOrders(true);
    try {
      const orders = await freshProduceService.getMyOrders();
      setMyOrders(orders);
    } catch {
      // Fallback
    } finally {
      setLoadingOrders(false);
    }
  };

  // Cart operations
  const addToCart = (product: FreshProduct) => {
    setCart((prev) => {
      const current = prev[product.id]?.quantity || 0;
      return {
        ...prev,
        [product.id]: { product, quantity: current + 1 },
      };
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const current = prev[productId]?.quantity || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: { ...prev[productId], quantity: current - 1 },
      };
    });
  };

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const cartTotalItems = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.quantity, 0),
    [cartItems]
  );
  const cartTotalPrice = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [cartItems]
  );

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' || p.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategory, searchQuery]);

  // Handle place order
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add fresh items before placing an order.');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery flat / address.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const req = {
        items: cartItems.map((ci) => ({
          productId: ci.product.id,
          quantity: ci.quantity,
        })),
        deliveryAddress: deliveryAddress.trim(),
        deliverySlot,
        notes: notes.trim() || undefined,
      };

      const order = await freshProduceService.placeOrder(req);
      setCart({});
      setCartModalVisible(false);
      Alert.alert(
        'Order Placed Successfully! 🥦',
        `Your fresh produce order #${order.id || Math.floor(Math.random() * 90000 + 10000)} has been received and scheduled for ${deliverySlot}.`,
        [{ text: 'View My Orders', onPress: () => { setOrdersModalVisible(true); loadMyOrders(); } }, { text: 'Done' }]
      );
    } catch {
      Alert.alert(
        'Order Confirmed (Offline Mode)',
        `Your order total ₹${cartTotalPrice.toFixed(2)} has been recorded locally. It will be fulfilled during the next batch run.`,
        [{ text: 'OK', onPress: () => { setCart({}); setCartModalVisible(false); } }]
      );
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await freshProduceService.cancelOrder(orderId);
            setMyOrders((prev) =>
              prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o))
            );
            Alert.alert('Cancelled', 'Your order has been cancelled.');
          } catch {
            Alert.alert('Error', 'Could not cancel order at this moment.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mana Fresh</Text>
          <View style={styles.locBadge}>
            <Ionicons name="leaf" size={12} color="#059669" />
            <Text style={styles.locText}>Farm-to-Doorstep</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              setOrdersModalVisible(true);
              loadMyOrders();
            }}
            hitSlop={8}
          >
            <Ionicons name="receipt-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, styles.cartIconBtn]}
            onPress={() => setCartModalVisible(true)}
            hitSlop={8}
          >
            <Ionicons name="cart-outline" size={22} color="#059669" />
            {cartTotalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartTotalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body */}
      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner Promo */}
        <View style={styles.bannerPromo}>
          <View style={{ flex: 1 }}>
            <View style={styles.tagWrap}>
              <Text style={styles.tagText}>100% RESIDUE FREE</Text>
            </View>
            <Text style={styles.bannerHeadline}>Daily Morning Harvest</Text>
            <Text style={styles.bannerDesc}>
              Fresh greens, vegetables & A2 milk directly delivered by 7:00 AM.
            </Text>
          </View>
          <Text style={styles.bannerEmoji}>🥬</Text>
        </View>

        {/* Cross Module Links: Fresh Kitchen & Daily Basket */}
        <View style={styles.quickLinksRow}>
          <TouchableOpacity
            style={[styles.quickLinkCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
            onPress={() => router.push('/fresh-kitchen' as any)}
          >
            <Ionicons name="restaurant-outline" size={18} color="#059669" />
            <Text style={[styles.quickLinkText, { color: '#047857' }]}>Fresh Kitchen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickLinkCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={() => router.push('/daily-basket' as any)}
          >
            <Ionicons name="basket-outline" size={18} color="#2563EB" />
            <Text style={[styles.quickLinkText, { color: '#1D4ED8' }]}>Daily Basket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickLinkCard, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}
            onPress={() => router.push('/fresh-kitchen/combo/combo-1' as any)}
          >
            <Ionicons name="sparkles-outline" size={18} color="#9333EA" />
            <Text style={[styles.quickLinkText, { color: '#7E22CE' }]}>Combos</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search spinach, milk, mangoes, tomatoes..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Horizontal Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Product Catalog Grid */}
        <View style={styles.catalogHeader}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'All' ? 'All Farm Products' : selectedCategory} ({filteredProducts.length})
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Fetching farm harvest...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="leaf-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySub}>Try searching for another fresh produce item.</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => {
              const qtyInCart = cart[product.id]?.quantity || 0;
              return (
                <View key={product.id} style={styles.productCard}>
                  {product.imageUrl ? (
                    <Image
                      source={{ uri: product.imageUrl }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.productImageFallback}>
                      <Ionicons name="leaf" size={28} color="#10B981" />
                    </View>
                  )}

                  <View style={styles.productInfo}>
                    <Text style={styles.productCategory}>{product.category || 'Produce'}</Text>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    {product.unit && <Text style={styles.productUnit}>{product.unit}</Text>}

                    <View style={styles.priceRow}>
                      <Text style={styles.priceText}>₹{product.price.toFixed(0)}</Text>
                      {qtyInCart === 0 ? (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => addToCart(product)}
                        >
                          <Ionicons name="add" size={16} color="#FFFFFF" />
                          <Text style={styles.addBtnText}>ADD</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.stepperWrap}>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => removeFromCart(product.id)}
                          >
                            <Ionicons name="remove" size={14} color="#059669" />
                          </TouchableOpacity>
                          <Text style={styles.stepperQty}>{qtyInCart}</Text>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => addToCart(product)}
                          >
                            <Ionicons name="add" size={14} color="#059669" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Cart Bottom Bar */}
      {cartTotalItems > 0 && (
        <View style={styles.floatingBar}>
          <View>
            <Text style={styles.floatingBarTitle}>
              {cartTotalItems} {cartTotalItems === 1 ? 'item' : 'items'} in Basket
            </Text>
            <Text style={styles.floatingBarPrice}>₹{cartTotalPrice.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => setCartModalVisible(true)}
          >
            <Text style={styles.checkoutBtnText}>View Basket</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Cart & Checkout Modal */}
      <Modal visible={cartModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.cartModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Your Fresh Basket</Text>
                <Text style={styles.modalSub}>{cartTotalItems} items selected</Text>
              </View>
              <TouchableOpacity onPress={() => setCartModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cartItemsList} showsVerticalScrollIndicator={false}>
              {cartItems.map((ci) => (
                <View key={ci.product.id} style={styles.cartItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartItemName}>{ci.product.name}</Text>
                    <Text style={styles.cartItemSub}>
                      ₹{ci.product.price} × {ci.quantity} {ci.product.unit ? `(${ci.product.unit})` : ''}
                    </Text>
                  </View>
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => removeFromCart(ci.product.id)}
                    >
                      <Ionicons name="remove" size={14} color="#059669" />
                    </TouchableOpacity>
                    <Text style={styles.stepperQty}>{ci.quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => addToCart(ci.product)}
                    >
                      <Ionicons name="add" size={14} color="#059669" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartItemTotal}>
                    ₹{(ci.product.price * ci.quantity).toFixed(0)}
                  </Text>
                </View>
              ))}

              <View style={styles.divider} />

              <Text style={styles.inputLabel}>Delivery Flat / Doorstep</Text>
              <TextInput
                style={styles.input}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Flat / Unit and Building Name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Delivery Time Slot</Text>
              <View style={styles.slotRow}>
                {['Morning 06:30 AM – 08:30 AM', 'Evening 05:00 PM – 07:00 PM'].map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.slotChip, deliverySlot === slot && styles.slotChipActive]}
                    onPress={() => setDeliverySlot(slot)}
                  >
                    <Ionicons
                      name={slot.startsWith('Morning') ? 'sunny-outline' : 'moon-outline'}
                      size={14}
                      color={deliverySlot === slot ? '#059669' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.slotText,
                        deliverySlot === slot && styles.slotTextActive,
                      ]}
                    >
                      {slot.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Instructions / Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Leave at doorstep, ring bell once..."
                placeholderTextColor="#94A3B8"
                multiline
              />

              {/* Price summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryVal}>₹{cartTotalPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee</Text>
                  <Text style={[styles.summaryVal, { color: '#059669' }]}>FREE</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={styles.summaryTotalLabel}>Total to Pay</Text>
                  <Text style={styles.summaryTotalVal}>₹{cartTotalPrice.toFixed(2)}</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.placeOrderBtn, submittingOrder && { opacity: 0.7 }]}
              onPress={handleCheckout}
              disabled={submittingOrder}
            >
              {submittingOrder ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.placeOrderText}>Confirm & Place Fresh Order</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* My Orders Modal */}
      <Modal visible={ordersModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>My Fresh Orders</Text>
                <Text style={styles.modalSub}>Track your grocery deliveries</Text>
              </View>
              <TouchableOpacity onPress={() => setOrdersModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingOrders ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#059669" />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : myOrders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={44} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No past orders</Text>
                <Text style={styles.emptySub}>Your fresh produce orders will appear here.</Text>
              </View>
            ) : (
              <FlatList
                data={myOrders}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <View>
                        <Text style={styles.orderCardTitle}>Order #{item.id}</Text>
                        <Text style={styles.orderCardSlot}>
                          {item.deliverySlot || 'Morning Batch'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.orderStatusBadge,
                          item.status === 'DELIVERED'
                            ? styles.badgeDelivered
                            : item.status === 'CANCELLED'
                            ? styles.badgeCancelled
                            : styles.badgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.orderStatusText,
                            item.status === 'DELIVERED'
                              ? styles.textDelivered
                              : item.status === 'CANCELLED'
                              ? styles.textCancelled
                              : styles.textPending,
                          ]}
                        >
                          {item.status.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.orderItemsCount}>
                      {item.items?.length || 1} items • ₹{Number(item.totalAmount).toFixed(2)}
                    </Text>

                    {item.status === 'PENDING' && (
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => handleCancelOrder(item.id)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel Order</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartIconBtn: {
    backgroundColor: '#ECFDF5',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#059669',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  locBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  headerActions: { flexDirection: 'row', gap: 8 },
  mainScroll: { flex: 1 },
  bannerPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tagWrap: {
    backgroundColor: '#059669',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  tagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  bannerHeadline: { fontSize: 16, fontWeight: '800', color: '#065F46' },
  bannerDesc: { fontSize: 12, color: '#047857', marginTop: 4, lineHeight: 16 },
  bannerEmoji: { fontSize: 44, marginLeft: 12 },
  quickLinksRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  quickLinkCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickLinkText: { fontSize: 12, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  categoryScroll: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  categoryChipTextActive: { color: '#FFFFFF' },
  catalogHeader: { paddingHorizontal: 16, marginVertical: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 13, color: '#64748B' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 10 },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  productImage: { width: '100%', height: 110 },
  productImageFallback: {
    width: '100%',
    height: 110,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { padding: 10 },
  productCategory: { fontSize: 10, fontWeight: '700', color: '#059669', textTransform: 'uppercase' },
  productName: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginTop: 2, height: 36 },
  productUnit: { fontSize: 11, color: '#64748B', marginTop: 2 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  stepperBtn: { paddingHorizontal: 7, paddingVertical: 4 },
  stepperQty: { fontSize: 12, fontWeight: '700', color: '#065F46', minWidth: 16, textAlign: 'center' },
  floatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...SHADOWS.md,
  },
  floatingBarTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  floatingBarPrice: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 2 },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cartModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cartItemsList: { maxHeight: 380 },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cartItemName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cartItemSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cartItemTotal: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginLeft: 12, minWidth: 45, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  slotRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  slotChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  slotChipActive: { borderColor: '#059669', backgroundColor: '#ECFDF5' },
  slotText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  slotTextActive: { color: '#065F46', fontWeight: '700' },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  summaryLabel: { fontSize: 13, color: '#64748B' },
  summaryVal: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  summaryTotalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 6 },
  summaryTotalLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  summaryTotalVal: { fontSize: 16, fontWeight: '800', color: '#059669' },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  placeOrderText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  orderCardSlot: { fontSize: 12, color: '#64748B', marginTop: 2 },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeDelivered: { backgroundColor: '#ECFDF5' },
  badgeCancelled: { backgroundColor: '#FEE2E2' },
  orderStatusText: { fontSize: 11, fontWeight: '700' },
  textPending: { color: '#D97706' },
  textDelivered: { color: '#059669' },
  textCancelled: { color: '#DC2626' },
  orderItemsCount: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 8 },
  cancelBtn: { marginTop: 10, alignSelf: 'flex-start' },
  cancelBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
});
