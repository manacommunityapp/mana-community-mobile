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
  MealPlanDto,
  TiffinSubscriptionDto,
} from '@/services/foodService';

type TabKey = 'plans' | 'active';

export default function SubscriptionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('plans');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MealPlanDto | null>(null);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/food');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (selectedPlan) { setSelectedPlan(null); return true; }
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack, selectedPlan])
  );

  const {
    data: plans = [],
    isLoading: loadingPlans,
    refetch: refetchPlans,
  } = useQuery<MealPlanDto[]>({
    queryKey: ['food', 'meal-plans'],
    queryFn: () => foodService.getMealPlans(),
    staleTime: 60_000,
  });

  const {
    data: subscriptions = [],
    isLoading: loadingSubs,
    refetch: refetchSubs,
  } = useQuery<TiffinSubscriptionDto[]>({
    queryKey: ['food', 'my-subscriptions'],
    queryFn: () => foodService.getMySubscriptions(),
    staleTime: 30_000,
  });

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => foodService.subscribeToPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      setSelectedPlan(null);
      setActiveTab('active');
      Alert.alert('Subscribed!', 'Your tiffin subscription is now active. Meals will start from tomorrow.');
    },
    onError: () => {
      Alert.alert('Error', 'Could not subscribe to this plan. Please try again.');
    },
  });

  const cancelSubMutation = useMutation({
    mutationFn: (subId: string) => foodService.cancelSubscription(subId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food'] });
      Alert.alert('Cancelled', 'Your tiffin subscription has been cancelled.');
    },
    onError: () => {
      Alert.alert('Error', 'Could not cancel subscription.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.allSettled([refetchPlans(), refetchSubs()]); }
    finally { setRefreshing(false); }
  }, [refetchPlans, refetchSubs]);

  const filteredPlans = useMemo(() => {
    if (!searchQuery) return plans;
    const q = searchQuery.toLowerCase();
    return plans.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.chefName.toLowerCase().includes(q) ||
        p.cuisine.toLowerCase().includes(q)
    );
  }, [plans, searchQuery]);

  const isInitialLoading = (loadingPlans || loadingSubs) && plans.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tiffin Subscriptions</Text>
          <Text style={styles.headerSub}>Daily meal plans from home cooks</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* Hero */}
        <LinearGradient colors={['#8B5CF6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Ionicons name="repeat" size={12} color="#FEF3C7" />
                <Text style={styles.heroBadgeText}>TIFFIN SERVICE</Text>
              </View>
              <Text style={styles.heroTitle}>Meal Subscriptions</Text>
              <Text style={styles.heroSubtitle}>Subscribe to daily home-cooked tiffin from verified society chefs. Skip, pause, or cancel anytime.</Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Ionicons name="calendar" size={26} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{plans.length}</Text>
              <Text style={styles.heroStatLabel}>Plans Available</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>{subscriptions.length}</Text>
              <Text style={styles.heroStatLabel}>Active Subs</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>Save 20%</Text>
              <Text style={styles.heroStatLabel}>vs. Daily Orders</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meal plans, chefs, cuisines..."
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

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['plans', 'active'] as TabKey[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, activeTab === t && styles.tabItemActive]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t === 'plans' ? 'list' : 'checkmark-circle'}
                size={16}
                color={activeTab === t ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'plans' ? 'Browse Plans' : 'My Subscriptions'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isInitialLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading subscription plans...</Text>
          </View>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {filteredPlans.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Plans Found</Text>
                <Text style={styles.emptySub}>Check back soon for new tiffin meal plans.</Text>
              </View>
            ) : (
              filteredPlans.map((plan) => (
                <View key={plan.id} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <View style={styles.planIconWrap}>
                      <Ionicons name="restaurant" size={22} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={styles.planTitle}>{plan.title}</Text>
                      <Text style={styles.planChef}>by {plan.chefName}</Text>
                    </View>
                    <View style={styles.priceBadge}>
                      <Text style={styles.priceAmount}>₹{plan.pricePerMonth}</Text>
                      <Text style={styles.priceUnit}>/month</Text>
                    </View>
                  </View>

                  <Text style={styles.planDesc} numberOfLines={2}>{plan.description}</Text>

                  <View style={styles.planMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="restaurant-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{plan.cuisine}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{plan.mealsPerDay}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.subscribeBtn}
                    onPress={() => setSelectedPlan(plan)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.subscribeBtnText}>Subscribe Now</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Active Subscriptions Tab */}
        {activeTab === 'active' && !isInitialLoading && (
          <View style={{ gap: SPACING.md }}>
            {subscriptions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No Active Subscriptions</Text>
                <Text style={styles.emptySub}>Browse plans and subscribe to start receiving daily meals.</Text>
                <TouchableOpacity style={styles.browseBtn} onPress={() => setActiveTab('plans')}>
                  <Text style={styles.browseBtnText}>Browse Plans</Text>
                </TouchableOpacity>
              </View>
            ) : (
              subscriptions.map((sub) => {
                const isActive = sub.status === 'ACTIVE';
                return (
                  <View key={sub.id} style={styles.subCard}>
                    <View style={styles.subHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subTitle}>{sub.planTitle}</Text>
                        <Text style={styles.subChef}>by {sub.chefName}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: isActive ? '#D1FAE5' : '#FEE2E2' }]}>
                        <Text style={[styles.statusText, { color: isActive ? '#059669' : '#EF4444' }]}>
                          {sub.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.subMetaRow}>
                      <Text style={styles.subMetaItem}>Started: {sub.startDate}</Text>
                      <Text style={styles.subMetaItem}>₹{sub.pricePerMonth}/month</Text>
                    </View>

                    {sub.nextDelivery && (
                      <View style={styles.nextDeliveryBar}>
                        <Ionicons name="bicycle-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.nextDeliveryText}>Next delivery: {sub.nextDelivery}</Text>
                      </View>
                    )}

                    {isActive && (
                      <View style={styles.subActions}>
                        <TouchableOpacity
                          style={styles.pauseBtn}
                          onPress={() => {
                            Alert.alert('Pause Subscription', 'Pause meals for tomorrow?', [
                              { text: 'No' },
                              { text: 'Yes, Pause', onPress: () => foodService.pauseSubscription(sub.id, 1) },
                            ]);
                          }}
                        >
                          <Ionicons name="pause-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.pauseBtnText}>Skip Tomorrow</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelSubBtn}
                          onPress={() => {
                            Alert.alert('Cancel Subscription', 'Are you sure? This cannot be undone.', [
                              { text: 'Keep' },
                              { text: 'Cancel', style: 'destructive', onPress: () => cancelSubMutation.mutate(sub.id) },
                            ]);
                          }}
                          disabled={cancelSubMutation.isPending}
                        >
                          <Text style={styles.cancelSubBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Subscribe Confirmation Modal */}
      <Modal visible={!!selectedPlan} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Subscription</Text>
              <TouchableOpacity onPress={() => setSelectedPlan(null)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <View style={{ gap: SPACING.md }}>
                <Text style={styles.modalPlanName}>{selectedPlan.title}</Text>
                <Text style={styles.modalPlanChef}>by {selectedPlan.chefName}</Text>
                <Text style={styles.modalPlanDesc}>{selectedPlan.description}</Text>

                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Cuisine</Text>
                    <Text style={styles.summaryVal}>{selectedPlan.cuisine}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Meals</Text>
                    <Text style={styles.summaryVal}>{selectedPlan.mealsPerDay}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Monthly Cost</Text>
                    <Text style={[styles.summaryVal, { color: COLORS.primary, fontWeight: '900' }]}>₹{selectedPlan.pricePerMonth}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Deliver to</Text>
                    <Text style={styles.summaryVal}>Tower {user?.tower || 'A'} - Unit {user?.flatNumber || '1204'}</Text>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectedPlan(null)} disabled={subscribeMutation.isPending}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, subscribeMutation.isPending && { opacity: 0.6 }]}
                    onPress={() => subscribeMutation.mutate(selectedPlan.id)}
                    disabled={subscribeMutation.isPending}
                  >
                    {subscribeMutation.isPending ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.modalConfirmText}>Subscribe · ₹{selectedPlan.pricePerMonth}/mo</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(99, 102, 241, 0.12)' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },
  centerContainer: { padding: SPACING.xl, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  heroBanner: { borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.md },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 6 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#FEF3C7', fontFamily: 'Outfit-Bold', letterSpacing: 0.5 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroSubtitle: { fontSize: 12, color: '#EEF2FF', marginTop: 2, lineHeight: 17, fontFamily: 'DMSans-Regular' },
  heroIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.lg, paddingVertical: SPACING.sm, marginTop: SPACING.md },
  heroStatCard: { alignItems: 'center' },
  heroStatNumber: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  heroStatLabel: { fontSize: 10, color: '#EEF2FF', marginTop: 1, fontFamily: 'DMSans-Medium' },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', gap: 8, marginBottom: SPACING.sm, ...SHADOWS.sm },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular' },

  tabBar: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4, marginBottom: SPACING.md, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.12)', gap: 4 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.md, gap: 5 },
  tabItemActive: { backgroundColor: '#EEF2FF' },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  emptyCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 4 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 20 },
  browseBtn: { marginTop: SPACING.sm, backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  browseBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  planCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', ...SHADOWS.sm, gap: SPACING.sm },
  planHeader: { flexDirection: 'row', alignItems: 'center' },
  planIconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  planChef: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  priceBadge: { alignItems: 'flex-end' },
  priceAmount: { fontSize: 18, fontWeight: '900', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  priceUnit: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  planDesc: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 17 },
  planMetaRow: { flexDirection: 'row', gap: SPACING.md, backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  subscribeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#7C3AED', paddingVertical: 10, borderRadius: RADIUS.md, ...SHADOWS.sm },
  subscribeBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  subCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', ...SHADOWS.sm, gap: SPACING.sm },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  subTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  subChef: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  subMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subMetaItem: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  nextDeliveryBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, padding: SPACING.sm },
  nextDeliveryText: { fontSize: 12, color: COLORS.primary, fontFamily: 'DMSans-Medium' },
  subActions: { flexDirection: 'row', gap: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  pauseBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingVertical: 8, borderRadius: RADIUS.md },
  pauseBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  cancelSubBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: '#FEE2E2' },
  cancelSubBtnText: { fontSize: 12, fontWeight: '700', color: '#EF4444', fontFamily: 'Outfit-Bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalPlanName: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalPlanChef: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  modalPlanDesc: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 17 },
  summaryBox: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  summaryVal: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalActions: { flexDirection: 'row', gap: SPACING.md },
  modalCancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  modalConfirmBtn: { flex: 1.6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#7C3AED', alignItems: 'center', ...SHADOWS.sm },
  modalConfirmText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
