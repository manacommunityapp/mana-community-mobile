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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  groupBuyingService,
  GroupDealDto,
  GroupOrderDto,
} from '@/services/groupBuyingService';

type TabKey = 'deals' | 'orders' | 'demand';

export default function GroupBuyingScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('deals');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [selectedDeal, setSelectedDeal] = useState<GroupDealDto | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedQrOrder, setSelectedQrOrder] = useState<GroupOrderDto | null>(null);

  // Propose Demand Modal state
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [newDemandTitle, setNewDemandTitle] = useState('');
  const [newDemandCategory, setNewDemandCategory] = useState('Groceries');
  const [newDemandDesc, setNewDemandDesc] = useState('');

  // ── 1. React Query: Active Deals ──────────────────────────────────────────
  const {
    data: deals = [],
    isLoading: loadingDeals,
    refetch: refetchDeals,
  } = useQuery<GroupDealDto[]>({
    queryKey: ['group-buying', 'deals'],
    queryFn: () => groupBuyingService.getDeals(),
    staleTime: 30_000,
  });

  // ── 2. React Query: My Orders ─────────────────────────────────────────────
  const {
    data: orders = [],
    isLoading: loadingOrders,
    refetch: refetchOrders,
  } = useQuery<GroupOrderDto[]>({
    queryKey: ['group-buying', 'my-orders'],
    queryFn: () => groupBuyingService.getMyOrders(),
    staleTime: 30_000,
  });

  // ── 3. React Query: Demand Board ──────────────────────────────────────────
  const {
    data: demands = [],
    isLoading: loadingDemands,
    refetch: refetchDemands,
  } = useQuery<Array<{ id: string; title: string; category: string; upvotes: number; targetUpvotes?: number; hasUpvoted?: boolean; description?: string }>>({
    queryKey: ['group-buying', 'demand'],
    queryFn: () => groupBuyingService.getDemandBoard(),
    staleTime: 30_000,
  });

  // ── Pull-to-Refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetchDeals(), refetchOrders(), refetchDemands()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchDeals, refetchOrders, refetchDemands]);

  // ── 4. Mutation: Join Deal ────────────────────────────────────────────────
  const joinDealMutation = useMutation({
    mutationFn: ({ dealId, qty }: { dealId: string; qty: number }) =>
      groupBuyingService.joinDeal(dealId, qty),
    onSuccess: (createdOrder) => {
      queryClient.invalidateQueries({ queryKey: ['group-buying'] });
      setSelectedDeal(null);
      setQuantity(1);
      setSelectedQrOrder(createdOrder);
      Alert.alert(
        '🎉 Deal Joined Successfully!',
        `Your slot has been reserved. Show your pickup pass at the collection desk.`
      );
    },
    onError: (err: any) => {
      Alert.alert('Join Deal Failed', err?.message || 'Unable to join group deal. Please try again.');
    },
  });

  // ── 5. Mutation: Upvote Demand ────────────────────────────────────────────
  const upvoteMutation = useMutation({
    mutationFn: (demandId: string) => groupBuyingService.upvoteDemand(demandId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-buying', 'demand'] });
    },
    onError: (err: any) => {
      Alert.alert('Upvote Failed', err?.message || 'Could not register upvote.');
    },
  });

  // ── 6. Mutation: Propose Demand ───────────────────────────────────────────
  const createDemandMutation = useMutation({
    mutationFn: (payload: { title: string; category: string; description?: string }) =>
      groupBuyingService.createDemand(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-buying', 'demand'] });
      setIsProposeModalOpen(false);
      setNewDemandTitle('');
      setNewDemandDesc('');
      Alert.alert('🚀 Proposal Submitted', 'Your request is live on the Demand Board for neighbor upvotes!');
    },
    onError: (err: any) => {
      Alert.alert('Submission Failed', err?.message || 'Could not post proposal.');
    },
  });

  // Derived Categories from Deals
  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    deals.forEach((d) => d.category && set.add(d.category));
    demands.forEach((d) => d.category && set.add(d.category));
    return Array.from(set);
  }, [deals, demands]);

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const matchCat = selectedCategory === 'All' || deal.category === selectedCategory;
      const matchQuery =
        !searchQuery ||
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [deals, selectedCategory, searchQuery]);

  // Filtered Demands
  const filteredDemands = useMemo(() => {
    return demands.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchQuery =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [demands, selectedCategory, searchQuery]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      return (
        !searchQuery ||
        order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [orders, searchQuery]);

  const handleSharePass = async (order: GroupOrderDto) => {
    try {
      await Share.share({
        message: `🏢 *Mana Community Group Deal Pass*\nOrder: ${order.title}\nOrder ID: ${order.id}\nQty: ${order.qty} | Total: ₹${order.total}\n🔑 Passcode: ${order.qrCode}\nShow this digital pass at the pickup desk.`,
      });
    } catch {
      // dismissed
    }
  };

  const handleCreateDemand = () => {
    if (!newDemandTitle.trim()) {
      Alert.alert('Required', 'Please enter a product or service name.');
      return;
    }
    createDemandMutation.mutate({
      title: newDemandTitle.trim(),
      category: newDemandCategory,
      description: newDemandDesc.trim() || undefined,
    });
  };

  const isLoadingCurrent =
    (activeTab === 'deals' && loadingDeals) ||
    (activeTab === 'orders' && loadingOrders) ||
    (activeTab === 'demand' && loadingDemands);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
              <Text style={styles.heroBadgeText}>SOCIETY WHOLESALE SAVINGS</Text>
            </View>
            <Text style={styles.heroTitle}>Group Buying & Deals</Text>
            <Text style={styles.heroSubtitle}>
              Unlock bulk farm and vendor pricing together with your neighbors
            </Text>
          </View>
          <View style={styles.heroIconCircle}>
            <Ionicons name="cart" size={26} color="#FFFFFF" />
          </View>
        </View>

        {/* Live Metrics Row */}
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatNumber}>{deals.length}</Text>
            <Text style={styles.heroStatLabel}>Active Deals</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatNumber}>{orders.length}</Text>
            <Text style={styles.heroStatLabel}>My Orders</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatNumber}>{demands.length}</Text>
            <Text style={styles.heroStatLabel}>Demand Board</Text>
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
              activeTab === 'deals'
                ? 'Search deals or vendors...'
                : activeTab === 'orders'
                ? 'Search your orders...'
                : 'Search requested products...'
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
          style={[styles.tabItem, activeTab === 'deals' && styles.tabItemActive]}
          onPress={() => setActiveTab('deals')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="flame"
            size={16}
            color={activeTab === 'deals' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'deals' && styles.tabTextActive]}>
            Active Deals
          </Text>
          <View style={[styles.tabBadge, activeTab === 'deals' && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, activeTab === 'deals' && styles.tabBadgeTextActive]}>
              {deals.length}
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
            My Passes
          </Text>
          {orders.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'orders' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeTab === 'orders' && styles.tabBadgeTextActive]}>
                {orders.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'demand' && styles.tabItemActive]}
          onPress={() => setActiveTab('demand')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="bulb-outline"
            size={16}
            color={activeTab === 'demand' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'demand' && styles.tabTextActive]}>
            Demand Board
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Filter Pills ── */}
      {activeTab !== 'orders' && categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Loading Spinner ── */}
      {isLoadingCurrent && !refreshing && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Syncing group buying deals...</Text>
        </View>
      )}

      {/* ── TAB 1: ACTIVE DEALS ── */}
      {activeTab === 'deals' && !isLoadingCurrent && (
        <View style={{ gap: SPACING.md }}>
          {filteredDeals.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cart-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Active Deals Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'No group deals match your search query.'
                  : 'New wholesale society deals are scheduled weekly.'}
              </Text>
            </View>
          ) : (
            filteredDeals.map((deal) => {
              const discountPct = Math.round(
                ((deal.standardPrice - deal.currentPrice) / deal.standardPrice) * 100
              );
              const progress = Math.min(
                1,
                deal.currentParticipants / (deal.targetParticipants || 1)
              );

              return (
                <View key={deal.id} style={styles.dealCard}>
                  {/* Category & Days Left Header */}
                  <View style={styles.dealHeaderRow}>
                    <View style={styles.dealCategoryBadge}>
                      <Text style={styles.dealCategoryText}>{deal.category}</Text>
                    </View>
                    <View style={styles.daysLeftBadge}>
                      <Ionicons name="time-outline" size={12} color="#D97706" />
                      <Text style={styles.daysLeftText}>{deal.daysLeft} days left</Text>
                    </View>
                  </View>

                  <Text style={styles.dealTitle}>{deal.title}</Text>
                  <Text style={styles.dealDesc} numberOfLines={2}>
                    {deal.description}
                  </Text>

                  {/* Vendor & Pickup Row */}
                  <View style={styles.vendorRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="storefront-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.vendorName}>{deal.vendor}</Text>
                    </View>
                    <View style={styles.ratingWrap}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{deal.vendorRating || 4.8}</Text>
                    </View>
                  </View>

                  {/* Pricing Tier & Savings */}
                  <View style={styles.pricingBox}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text style={styles.currentPrice}>₹{deal.currentPrice}</Text>
                        <Text style={styles.standardPrice}>₹{deal.standardPrice}</Text>
                      </View>
                      <Text style={styles.pricingSub}>Per Unit Bulk Rate</Text>
                    </View>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{discountPct}% OFF</Text>
                    </View>
                  </View>

                  {/* Group Participation Progress Bar */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>
                        <Text style={{ fontWeight: '800', color: COLORS.text }}>
                          {deal.currentParticipants}
                        </Text>
                        /{deal.targetParticipants} joined
                      </Text>
                      <Text style={styles.progressTarget}>
                        {Math.max(0, deal.targetParticipants - deal.currentParticipants)} more needed
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                    </View>
                  </View>

                  {/* Card Footer & Action */}
                  <View style={styles.dealCardFooter}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                        <Text style={styles.pickupPointText} numberOfLines={1}>
                          {deal.pickupPoint}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.joinDealBtn}
                      onPress={() => {
                        setSelectedDeal(deal);
                        setQuantity(1);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.joinDealBtnText}>Join Deal</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ── TAB 2: MY PASSES & ORDERS ── */}
      {activeTab === 'orders' && !isLoadingCurrent && (
        <View style={{ gap: SPACING.md }}>
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Orders Placed Yet</Text>
              <Text style={styles.emptySub}>
                Join any active group deal to save wholesale and receive your digital pickup QR pass.
              </Text>
              <TouchableOpacity
                style={styles.browseDealsBtn}
                onPress={() => setActiveTab('deals')}
              >
                <Text style={styles.browseDealsBtnText}>Browse Active Deals</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const isPickedUp = order.status === 'PICKED_UP';
              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeaderRow}>
                    <View>
                      <Text style={styles.orderIdText}>{order.id}</Text>
                      <Text style={styles.orderTitle}>{order.title}</Text>
                    </View>
                    <View
                      style={[
                        styles.orderStatusBadge,
                        isPickedUp ? styles.statusPickedUp : styles.statusConfirmed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.orderStatusText,
                          isPickedUp ? styles.statusTextPickedUp : styles.statusTextConfirmed,
                        ]}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderDetailRow}>
                    <Text style={styles.orderDetailLabel}>Quantity: <Text style={{ fontWeight: '800', color: COLORS.text }}>{order.qty}</Text></Text>
                    <Text style={styles.orderTotalText}>Total: ₹{order.total}</Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.orderActionsRow}>
                    <TouchableOpacity
                      style={styles.viewQrBtn}
                      onPress={() => setSelectedQrOrder(order)}
                    >
                      <Ionicons name="qr-code-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.viewQrBtnText}>Show Pickup QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareOrderBtn}
                      onPress={() => handleSharePass(order)}
                    >
                      <Ionicons name="share-social-outline" size={15} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ── TAB 3: DEMAND BOARD ── */}
      {activeTab === 'demand' && !isLoadingCurrent && (
        <View style={{ gap: SPACING.md }}>
          {/* Demand Intro Box */}
          <View style={styles.demandIntroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.demandIntroTitle}>Have a product in mind?</Text>
              <Text style={styles.demandIntroSub}>
                Post items you want at bulk discounts. When 25+ neighbors upvote, we onboard the vendor!
              </Text>
            </View>
            <TouchableOpacity
              style={styles.proposeBtn}
              onPress={() => setIsProposeModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.proposeBtnText}>Propose</Text>
            </TouchableOpacity>
          </View>

          {filteredDemands.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bulb-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Product Requests</Text>
              <Text style={styles.emptySub}>
                Be the first neighbor to suggest a product or bulk service!
              </Text>
            </View>
          ) : (
            filteredDemands.map((item) => {
              const target = item.targetUpvotes || 25;
              const progress = Math.min(1, item.upvotes / target);

              return (
                <View key={item.id} style={styles.demandCard}>
                  <View style={styles.demandHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.demandCategoryBadge}>
                        <Text style={styles.demandCategoryText}>{item.category}</Text>
                      </View>
                      <Text style={styles.demandItemTitle}>{item.title}</Text>
                      {item.description && (
                        <Text style={styles.demandItemDesc}>{item.description}</Text>
                      )}
                    </View>

                    {/* Upvote Button */}
                    <TouchableOpacity
                      style={[
                        styles.upvoteBtn,
                        item.hasUpvoted && styles.upvoteBtnActive,
                        upvoteMutation.isPending && { opacity: 0.7 },
                      ]}
                      onPress={() => upvoteMutation.mutate(item.id)}
                      disabled={upvoteMutation.isPending}
                    >
                      <Ionicons
                        name={item.hasUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={16}
                        color={item.hasUpvoted ? '#FFFFFF' : COLORS.primary}
                      />
                      <Text
                        style={[
                          styles.upvoteCountText,
                          item.hasUpvoted && styles.upvoteCountTextActive,
                        ]}
                      >
                        {item.upvotes}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Progress bar towards vendor onboarding */}
                  <View style={styles.demandProgressBox}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>
                        {item.upvotes}/{target} upvotes
                      </Text>
                      <Text style={styles.progressTarget}>
                        {Math.max(0, target - item.upvotes)} votes to unlock
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${progress * 100}%`, backgroundColor: COLORS.primary },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ── MODAL 1: JOIN DEAL ── */}
      <Modal visible={!!selectedDeal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedDeal?.title}
                </Text>
                <Text style={styles.modalSubtitle}>Wholesale Bulk Deal</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedDeal(null)}
                disabled={joinDealMutation.isPending}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedDeal && (
              <View style={{ gap: SPACING.md }}>
                {/* Pricing summary */}
                <View style={styles.modalPricingBox}>
                  <View>
                    <Text style={styles.modalPriceLabel}>Bulk Rate</Text>
                    <Text style={styles.modalPriceVal}>₹{selectedDeal.currentPrice}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.modalPriceLabel}>Delivery Point</Text>
                    <Text style={styles.modalPickupVal} numberOfLines={1}>
                      {selectedDeal.pickupPoint}
                    </Text>
                  </View>
                </View>

                {/* Quantity Stepper */}
                <View style={styles.stepperBox}>
                  <Text style={styles.stepperLabel}>Select Quantity</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Ionicons name="remove" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setQuantity(quantity + 1)}
                    >
                      <Ionicons name="add" size={18} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Total Computed */}
                <View style={styles.totalPayRow}>
                  <Text style={styles.totalPayLabel}>Total Payable</Text>
                  <Text style={styles.totalPayVal}>
                    ₹{(selectedDeal.currentPrice * quantity).toLocaleString()}
                  </Text>
                </View>

                {/* Resident Unit */}
                <Text style={styles.residentUnitText}>
                  Resident: Tower {user?.tower || 'A'} - Unit {user?.flatNumber || '1204'}
                </Text>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setSelectedDeal(null)}
                    disabled={joinDealMutation.isPending}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmBtn, joinDealMutation.isPending && { opacity: 0.7 }]}
                    onPress={() =>
                      joinDealMutation.mutate({
                        dealId: selectedDeal.id,
                        qty: quantity,
                      })
                    }
                    disabled={joinDealMutation.isPending}
                  >
                    {joinDealMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.confirmBtnText}>Confirm Reservation</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: QR PICKUP PASS ── */}
      <Modal visible={!!selectedQrOrder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.qrBadge}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                <Text style={styles.qrBadgeText}>Verified Pickup Pass</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedQrOrder(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedQrOrder && (
              <View style={{ gap: SPACING.sm, marginTop: SPACING.xs }}>
                <Text style={styles.qrTitle}>{selectedQrOrder.title}</Text>
                <Text style={styles.qrSub}>Order ID: {selectedQrOrder.id}</Text>

                {/* QR Graphics Display */}
                <View style={styles.qrGraphicBox}>
                  <Ionicons name="qr-code" size={100} color={COLORS.primary} />
                  <Text style={styles.qrCodeText}>{selectedQrOrder.qrCode}</Text>
                  <Text style={styles.qrNote}>
                    Present this QR at the Society Parcel / Clubhouse Desk
                  </Text>
                </View>

                <View style={styles.qrDetailsList}>
                  <View style={styles.qrDetailRow}>
                    <Text style={styles.qrDetailKey}>Quantity:</Text>
                    <Text style={styles.qrDetailVal}>{selectedQrOrder.qty} Units</Text>
                  </View>
                  <View style={styles.qrDetailRow}>
                    <Text style={styles.qrDetailKey}>Total Amount:</Text>
                    <Text style={styles.qrDetailVal}>₹{selectedQrOrder.total}</Text>
                  </View>
                  <View style={styles.qrDetailRow}>
                    <Text style={styles.qrDetailKey}>Resident:</Text>
                    <Text style={styles.qrDetailVal}>
                      Tower {user?.tower || 'A'} - Unit {user?.flatNumber || '1204'}
                    </Text>
                  </View>
                </View>

                <View style={styles.qrModalActions}>
                  <TouchableOpacity
                    style={styles.shareWhatsappBtn}
                    onPress={() => handleSharePass(selectedQrOrder)}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.shareWhatsappBtnText}>Share Pass</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.qrDoneBtn}
                    onPress={() => setSelectedQrOrder(null)}
                  >
                    <Text style={styles.qrDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── MODAL 3: PROPOSE DEMAND ── */}
      <Modal visible={isProposeModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Propose Bulk Deal</Text>
                <Text style={styles.modalSubtitle}>
                  Suggest items you and neighbors would buy together
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsProposeModalOpen(false)}
                disabled={createDemandMutation.isPending}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: SPACING.sm }}>
              <Text style={styles.fieldLabel}>Product or Service Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Alphonso Mangoes, A2 Ghee, Car Detailing"
                placeholderTextColor={COLORS.textMuted}
                value={newDemandTitle}
                onChangeText={setNewDemandTitle}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryPickerRow}>
                {['Groceries', 'Daily Essentials', 'Sweets & Snacks', 'Home Services'].map(
                  (cat) => {
                    const active = newDemandCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.pickerChip, active && styles.pickerChipActive]}
                        onPress={() => setNewDemandCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.pickerChipText,
                            active && styles.pickerChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              <Text style={styles.fieldLabel}>Details / Specifications</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Preferred brand, expected quantity, or requirements..."
                placeholderTextColor={COLORS.textMuted}
                value={newDemandDesc}
                onChangeText={setNewDemandDesc}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsProposeModalOpen(false)}
                  disabled={createDemandMutation.isPending}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    createDemandMutation.isPending && { opacity: 0.7 },
                  ]}
                  onPress={handleCreateDemand}
                  disabled={createDemandMutation.isPending}
                >
                  {createDemandMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Post to Board</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 40 },
  centerContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: 'DMSans-Medium',
  },

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

  dealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  dealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  dealCategoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dealCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  daysLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  daysLeftText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: 'Outfit-Bold',
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    marginTop: 2,
  },
  dealDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 17,
    fontFamily: 'DMSans-Regular',
  },
  vendorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  vendorName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  ratingWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: 'Outfit-Bold',
  },

  pricingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  standardPrice: {
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
    fontFamily: 'DMSans-Regular',
  },
  pricingSub: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  discountBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#059669',
    fontFamily: 'Outfit-Bold',
  },

  progressSection: { marginBottom: SPACING.sm },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  progressTarget: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: 'DMSans-Medium',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },

  dealCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  pickupPointText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  joinDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  joinDealBtnText: {
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
  orderIdText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    marginTop: 2,
  },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusConfirmed: { backgroundColor: '#D1FAE5' },
  statusPickedUp: { backgroundColor: '#F1F5F9' },
  orderStatusText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  statusTextConfirmed: { color: '#059669' },
  statusTextPickedUp: { color: COLORS.textMuted },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  orderDetailLabel: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  orderTotalText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  orderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  viewQrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  viewQrBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  shareOrderBtn: {
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  demandIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  demandIntroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  demandIntroSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 15,
    fontFamily: 'DMSans-Regular',
  },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  proposeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
  },

  demandCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  demandHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  demandCategoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  demandCategoryText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  demandItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  demandItemDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontFamily: 'DMSans-Regular',
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  upvoteBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  upvoteCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  upvoteCountTextActive: { color: '#FFFFFF' },
  demandProgressBox: { marginTop: SPACING.sm },

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
  browseDealsBtn: {
    marginTop: SPACING.sm,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  browseDealsBtnText: {
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
  modalPricingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  modalPriceLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  modalPriceVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  modalPickupVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  stepperBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
    minWidth: 20,
    textAlign: 'center',
  },
  totalPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  totalPayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: 'Outfit-Bold',
  },
  totalPayVal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  residentUnitText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: 'DMSans-Regular',
    textAlign: 'center',
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
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
  confirmBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
  },

  qrModalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qrBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'Outfit-Bold',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  qrSub: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
  },
  qrGraphicBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  qrCodeText: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  qrNote: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'DMSans-Regular',
  },
  qrDetailsList: { gap: 4, marginVertical: SPACING.xs },
  qrDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  qrDetailKey: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  qrDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  qrModalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  shareWhatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#25D366',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  shareWhatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  qrDoneBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  qrDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 2,
    marginTop: 4,
    fontFamily: 'DMSans-Medium',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'DMSans-Regular',
  },
  categoryPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 2 },
  pickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pickerChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  pickerChipTextActive: { color: '#FFFFFF', fontWeight: '700', fontFamily: 'Outfit-Bold' },
});
