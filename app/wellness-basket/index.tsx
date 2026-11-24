import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/config';
import {
  wellnessBasketService,
  SEED_WELLNESS_PLANS,
  SEED_SUBSCRIBER,
  SEED_CLUSTERS,
} from '@/services/wellnessBasketService';
import type {
  WellnessPlan,
  WellnessSubscriber,
  WellnessCluster,
} from '@/types/wellnessBasket';

export default function WellnessBasketHomeScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<WellnessPlan[]>(SEED_WELLNESS_PLANS);
  const [subscriber, setSubscriber] = useState<WellnessSubscriber | null>(SEED_SUBSCRIBER);
  const [clusters, setClusters] = useState<WellnessCluster[]>(SEED_CLUSTERS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, s, c] = await Promise.all([
        wellnessBasketService.getPlans(),
        wellnessBasketService.getSubscription(),
        wellnessBasketService.getClusters(),
      ]);
      setPlans(p);
      setSubscriber(s);
      setClusters(c);
    } catch {
      setPlans(SEED_WELLNESS_PLANS);
      setSubscriber(SEED_SUBSCRIBER);
      setClusters(SEED_CLUSTERS);
    } finally {
      setLoading(false);
    }
  };

  const activeCluster = clusters.find((c) => c.isActivated) || clusters[0];
  const isSubscriber = subscriber && subscriber.subscriptionStatus === 'ACTIVE';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Mana Fresh Wellness',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#064E3B' },
          headerTintColor: '#FFFFFF',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/wellness-basket/weekly-menu')}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="nutrition-outline" size={14} color="#A7F3D0" />
              <Text style={styles.heroBadgeText}>Morning Nutrition Subscription</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Fresh, Portion-Controlled Breakfast Bowls</Text>
          <Text style={styles.heroSubtitle}>
            Dietitian-formulated, whole-food daily nutrition boxes delivered at your door before 8:00 AM (Mon–Sat).
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statVal}>26</Text>
              <Text style={styles.statLbl}>Deliveries / Mo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>2-4°C</Text>
              <Text style={styles.statLbl}>Cold Chain</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>100%</Text>
              <Text style={styles.statLbl}>FSSAI Safe</Text>
            </View>
          </View>
        </View>

        {/* Society Cluster Delivery Status */}
        {activeCluster && (
          <View style={styles.clusterCard}>
            <View style={styles.clusterHeader}>
              <View style={styles.clusterIconWrap}>
                <Ionicons name="business" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.clusterTitle}>{activeCluster.societyName}</Text>
                <Text style={styles.clusterSub}>
                  {activeCluster.isActivated
                    ? 'Society Route Active (6:00 – 8:00 AM)'
                    : `Needs ${activeCluster.subscribersNeededForActivation} more to activate route`}
                </Text>
              </View>
              <View
                style={[
                  styles.clusterStatusPill,
                  { backgroundColor: activeCluster.isActivated ? '#D1FAE5' : '#FEF3C7' },
                ]}
              >
                <Text
                  style={[
                    styles.clusterStatusText,
                    { color: activeCluster.isActivated ? '#065F46' : '#92400E' },
                  ]}
                >
                  {activeCluster.isActivated ? 'ACTIVE' : 'PENDING'}
                </Text>
              </View>
            </View>

            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(
                      100,
                      (activeCluster.currentSubscriberCount / activeCluster.activationThreshold) * 100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {activeCluster.currentSubscriberCount} / {activeCluster.activationThreshold} subscribers enrolled
            </Text>
          </View>
        )}

        {/* Active Subscriber Status */}
        {isSubscriber && subscriber && (
          <View style={styles.subscriberCard}>
            <View style={styles.subscriberHeader}>
              <View>
                <Text style={styles.subActiveBadge}>ACTIVE SUBSCRIPTION</Text>
                <Text style={styles.subscriberPlanTitle}>{subscriber.planType} Wellness Box</Text>
              </View>
              <TouchableOpacity
                style={styles.menuBtn}
                onPress={() => router.push('/wellness-basket/weekly-menu')}
              >
                <Ionicons name="restaurant-outline" size={16} color="#059669" />
                <Text style={styles.menuBtnText}>Weekly Menu</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.subscriberDetails}>
              <Text style={styles.subDetailText}>
                Portion: <Text style={styles.subDetailBold}>{subscriber.portionSize}</Text>
              </Text>
              <Text style={styles.subDetailText}>
                Goal: <Text style={styles.subDetailBold}>{subscriber.goalType?.replace(/_/g, ' ')}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* Subscription Plans */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose Your Daily Nutrition</Text>
          <TouchableOpacity onPress={() => router.push('/wellness-basket/weekly-menu')}>
            <Text style={styles.seeMenuText}>Preview Menu →</Text>
          </TouchableOpacity>
        </View>

        {plans.map((plan) => {
          const isSelected = subscriber?.planType === plan.planType && isSubscriber;
          return (
            <View key={plan.planType} style={styles.planCard}>
              {plan.planType === 'PREMIUM' && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{plan.displayName}</Text>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                </View>
              </View>

              <View style={styles.pricingRow}>
                <Text style={styles.priceMain}>₹{plan.pricePerMonth}</Text>
                <Text style={styles.pricePerMonth}>/ month</Text>
                <View style={styles.dailyPriceTag}>
                  <Text style={styles.dailyPriceText}>₹{plan.pricePerDelivery} / day</Text>
                </View>
              </View>

              <View style={styles.featureList}>
                {plan.includedFeatures.map((f, i) => (
                  <View key={i} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#059669" />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.subscribeBtn, isSelected && styles.subscribedBtn]}
                onPress={() => {
                  if (!isSelected) {
                    router.push({
                      pathname: '/wellness-basket/plan-builder',
                      params: { planType: plan.planType },
                    });
                  }
                }}
              >
                <Text style={[styles.subscribeBtnText, isSelected && styles.subscribedBtnText]}>
                  {isSelected ? '✓ Current Active Plan' : `Subscribe (${plan.displayName})`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Quick Menu Preview CTA */}
        <TouchableOpacity
          style={styles.weeklyScheduleCta}
          onPress={() => router.push('/wellness-basket/weekly-menu')}
        >
          <View style={styles.scheduleIconWrap}>
            <Ionicons name="calendar" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.scheduleTitle}>View 6-Day Menu & Nutrition</Text>
            <Text style={styles.scheduleSub}>
              Browse next week's fruit bowls, sprout kits and request item swaps.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#059669" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#064E3B',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  heroBadgeText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#D1FAE5',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: RADIUS.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  statLbl: {
    color: '#A7F3D0',
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  clusterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clusterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  clusterSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  clusterStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  clusterStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'right',
  },
  subscriberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  subscriberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subActiveBadge: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subscriberPlanTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  menuBtnText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  subscriberDetails: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subDetailText: {
    fontSize: 11,
    color: '#64748B',
  },
  subDetailBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeMenuText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  planDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  priceMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  pricePerMonth: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
  dailyPriceTag: {
    marginLeft: 'auto',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dailyPriceText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  featureList: {
    gap: 6,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 11,
    color: '#334155',
  },
  subscribeBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  subscribeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  subscribedBtn: {
    backgroundColor: '#ECFDF5',
  },
  subscribedBtnText: {
    color: '#059669',
  },
  weeklyScheduleCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  scheduleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  scheduleSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
