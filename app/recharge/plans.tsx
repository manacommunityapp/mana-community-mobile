import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  rechargeService,
  type RechargePlan,
  type RechargeType,
} from '@/services/rechargeService';

type PlanCategory = 'ALL' | 'POPULAR' | 'DATA' | 'UNLIMITED' | 'VALIDITY' | 'TOPUP';

const CATEGORY_LABELS: Record<PlanCategory, string> = {
  ALL: 'All Plans',
  POPULAR: '🔥 Popular',
  DATA: '📶 Data',
  UNLIMITED: '♾️ Unlimited',
  VALIDITY: '📅 Validity',
  TOPUP: '💰 Top-up',
};

export default function PlansScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mobile: string;
    operatorId: string;
    operatorName: string;
    operatorIcon: string;
    operatorColor: string;
    circle: string;
    rechargeType: string;
  }>();

  const [selectedCategory, setSelectedCategory] = useState<PlanCategory>('POPULAR');
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['recharge-plans', params.operatorId],
    queryFn: () => rechargeService.getPlans(params.operatorId),
    staleTime: 5 * 60 * 1000,
  });

  const filteredPlans = selectedCategory === 'ALL'
    ? plans
    : plans.filter(p => p.category === selectedCategory);

  const handlePay = async () => {
    if (!selectedPlan) return;
    setIsPaying(true);
    try {
      const result = await rechargeService.initiateRecharge({
        mobileNumber: params.mobile,
        operatorId: params.operatorId,
        circle: params.circle,
        planId: selectedPlan.id,
        amount: selectedPlan.price,
        rechargeType: params.rechargeType as RechargeType,
      });

      // Try PhonePe first, then generic UPI
      const canPhonePe = await Linking.canOpenURL(result.phonePeUrl);
      if (canPhonePe) {
        await Linking.openURL(result.phonePeUrl);
      } else {
        const canUpi = await Linking.canOpenURL(result.upiIntentUrl);
        if (canUpi) {
          await Linking.openURL(result.upiIntentUrl);
        } else {
          Alert.alert(
            'Payment Initiated',
            `Recharge of ₹${selectedPlan.price} for ${params.mobile} via ${params.operatorName}.\n\nTransaction ID: ${result.transactionId}\n\nOpen your UPI app to complete payment.`,
            [{ text: 'Done', onPress: () => router.replace('/recharge') }]
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not initiate recharge. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Top Nav */}
      <View style={s.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={s.topNavTitleBox}>
          <Text style={s.topNavTitle}>
            {params.operatorIcon} {params.operatorName}
          </Text>
          <Text style={s.topNavSubtitle}>
            +91 {params.mobile} · {params.circle} · {params.rechargeType}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={s.changeBtn}>
          <Text style={s.changeBtnText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={s.progressRow}>
        <View style={s.progressStep}>
          <Text style={s.progressLabel}>1. Number ✓</Text>
        </View>
        <View style={s.progressLine} />
        <View style={[s.progressStep, s.progressStepActive]}>
          <Text style={[s.progressLabel, s.progressLabelActive]}>2. Plan</Text>
        </View>
        <View style={s.progressLine} />
        <View style={s.progressStep}>
          <Text style={s.progressLabel}>3. Pay</Text>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryScroll}
      >
        {(Object.keys(CATEGORY_LABELS) as PlanCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.categoryPill, selectedCategory === cat && s.categoryPillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[s.categoryPillText, selectedCategory === cat && s.categoryPillTextActive]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Plans List */}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={THEME.brand} />
            <Text style={s.loadingText}>Fetching latest plans…</Text>
          </View>
        ) : filteredPlans.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No plans in this category.</Text>
          </View>
        ) : (
          filteredPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[s.planCard, selectedPlan?.id === plan.id && s.planCardSelected]}
              onPress={() => setSelectedPlan(plan)}
              activeOpacity={0.8}
            >
              {/* Badges */}
              <View style={s.planBadgesRow}>
                {plan.isBestSeller && (
                  <View style={s.bestsellerBadge}>
                    <Text style={s.bestsellerBadgeText}>🔥 Best Seller</Text>
                  </View>
                )}
                {plan.isRecommended && (
                  <View style={s.recommendedBadge}>
                    <Text style={s.recommendedBadgeText}>⭐ Recommended</Text>
                  </View>
                )}
              </View>

              <View style={s.planRow}>
                {/* Price */}
                <View style={s.planPriceBox}>
                  <Text style={s.planPrice}>₹{plan.price}</Text>
                  <Text style={s.planValidity}>{plan.validity}</Text>
                </View>

                {/* Details */}
                <View style={s.planDetails}>
                  <View style={s.planDetailRow}>
                    <View style={s.planDetailItem}>
                      <Text style={s.planDetailIcon}>📶</Text>
                      <Text style={s.planDetailLabel}>Data</Text>
                      <Text style={s.planDetailValue}>{plan.data}</Text>
                    </View>
                    <View style={s.planDetailDivider} />
                    <View style={s.planDetailItem}>
                      <Text style={s.planDetailIcon}>📞</Text>
                      <Text style={s.planDetailLabel}>Calls</Text>
                      <Text style={s.planDetailValue}>{plan.calls}</Text>
                    </View>
                    <View style={s.planDetailDivider} />
                    <View style={s.planDetailItem}>
                      <Text style={s.planDetailIcon}>💬</Text>
                      <Text style={s.planDetailLabel}>SMS</Text>
                      <Text style={s.planDetailValue}>{plan.sms}</Text>
                    </View>
                  </View>
                  <Text style={s.planDesc}>{plan.description}</Text>
                </View>

                {/* Selection radio */}
                <View style={[s.radio, selectedPlan?.id === plan.id && s.radioSelected]}>
                  {selectedPlan?.id === plan.id && <View style={s.radioDot} />}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Pay Footer */}
      {selectedPlan && (
        <View style={s.stickyFooter}>
          <View style={s.selectedPlanSummary}>
            <Text style={s.selectedPlanAmount}>₹{selectedPlan.price}</Text>
            <Text style={s.selectedPlanMeta} numberOfLines={1}>
              {selectedPlan.validity} · {selectedPlan.data}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.payBtn, isPaying && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={isPaying}
            activeOpacity={0.85}
          >
            {isPaying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={s.payBtnText}>📱 Pay ₹{selectedPlan.price}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  topNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  topNavTitleBox: { flex: 1, marginLeft: 12 },
  topNavTitle: { fontSize: 16, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.displayBold },
  topNavSubtitle: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 1 },
  changeBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: THEME.border,
  },
  changeBtnText: { fontSize: 12, fontWeight: '600', color: THEME.brandDark, fontFamily: FONTS.semiBold },
  progressRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  progressStep: { alignItems: 'center' },
  progressStepActive: {},
  progressLabel: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.medium },
  progressLabelActive: { color: THEME.brandDark, fontWeight: '700', fontFamily: FONTS.bold },
  progressLine: { flex: 1, height: 1, backgroundColor: THEME.border, marginHorizontal: 8 },
  categoryScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  categoryPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: THEME.border,
    backgroundColor: '#FFFFFF',
  },
  categoryPillActive: { backgroundColor: THEME.brandDark, borderColor: THEME.brandDark },
  categoryPillText: { fontSize: 12.5, fontWeight: '600', color: THEME.textSecondary, fontFamily: FONTS.semiBold },
  categoryPillTextActive: { color: '#FFFFFF' },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  loadingBox: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: THEME.textSecondary, fontFamily: FONTS.regular },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 13, color: THEME.textSecondary },
  planCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: THEME.border,
    padding: 14, gap: 8, ...SHADOWS.card,
  },
  planCardSelected: { borderColor: THEME.brand, backgroundColor: THEME.brandLight },
  planBadgesRow: { flexDirection: 'row', gap: 6 },
  bestsellerBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#FEF3C7', borderRadius: 5,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  bestsellerBadgeText: { fontSize: 10, fontWeight: '700', color: '#D97706', fontFamily: FONTS.semiBold },
  recommendedBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: THEME.brandLight, borderRadius: 5,
    borderWidth: 1, borderColor: THEME.brandBorder,
  },
  recommendedBadgeText: { fontSize: 10, fontWeight: '700', color: THEME.brandDark, fontFamily: FONTS.semiBold },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planPriceBox: { minWidth: 64, alignItems: 'center' },
  planPrice: { fontSize: 22, fontWeight: '800', color: THEME.textPrimary, fontFamily: FONTS.displayBold, fontVariant: ['tabular-nums'] },
  planValidity: { fontSize: 10, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 2, textAlign: 'center' },
  planDetails: { flex: 1, gap: 8 },
  planDetailRow: { flexDirection: 'row', alignItems: 'center' },
  planDetailItem: { flex: 1, alignItems: 'center' },
  planDetailIcon: { fontSize: 13 },
  planDetailLabel: { fontSize: 9.5, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 1 },
  planDetailValue: { fontSize: 11, fontWeight: '700', color: THEME.textPrimary, fontFamily: FONTS.semiBold, textAlign: 'center' },
  planDetailDivider: { width: 1, height: 30, backgroundColor: THEME.border, marginHorizontal: 4 },
  planDesc: { fontSize: 11.5, color: THEME.textSecondary, fontFamily: FONTS.regular },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: THEME.border,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  radioSelected: { borderColor: THEME.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.brand },
  stickyFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: THEME.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...SHADOWS.card,
  },
  selectedPlanSummary: { flex: 1 },
  selectedPlanAmount: { fontSize: 20, fontWeight: '800', color: THEME.textPrimary, fontFamily: FONTS.displayBold, fontVariant: ['tabular-nums'] },
  selectedPlanMeta: { fontSize: 11, color: THEME.textSecondary, fontFamily: FONTS.regular, marginTop: 1 },
  payBtn: {
    backgroundColor: THEME.brand, borderRadius: 12,
    paddingHorizontal: 22, paddingVertical: 14,
    alignItems: 'center', minWidth: 130,
  },
  payBtnDisabled: { backgroundColor: THEME.borderMedium },
  payBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: FONTS.bold },
});
