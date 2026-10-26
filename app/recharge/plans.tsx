import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SHADOWS, FONTS, COLORS } from '@/constants/config';
import {
  rechargeService,
  type RechargePlan,
  type RechargeType,
} from '@/services/rechargeService';

type PlanCategory = 'ALL' | 'POPULAR' | 'DATA' | 'UNLIMITED' | 'VALIDITY' | 'TOPUP';

const CATEGORY_TABS: { key: PlanCategory; label: string; icon: string }[] = [
  { key: 'POPULAR', label: 'Popular', icon: 'flame' },
  { key: 'DATA', label: 'Daily Data', icon: 'cellular' },
  { key: 'UNLIMITED', label: 'True 5G', icon: 'infinite' },
  { key: 'VALIDITY', label: 'Annual / Long', icon: 'calendar' },
  { key: 'TOPUP', label: 'Top-Up', icon: 'wallet' },
  { key: 'ALL', label: 'All Plans', icon: 'grid' },
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [enableExpiryReminder, setEnableExpiryReminder] = useState(true);
  const [enableAutoQueue, setEnableAutoQueue] = useState(true);

  const operatorColor = params.operatorColor || COLORS.primary;

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['recharge-plans', params.operatorId],
    queryFn: () => rechargeService.getPlans(params.operatorId || 'JIO'),
    staleTime: 5 * 60 * 1000,
  });

  // Filter plans by category and query
  const filteredPlans = useMemo(() => {
    let result = selectedCategory === 'ALL'
      ? plans
      : plans.filter(p => p.category === selectedCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.price.toString().includes(q) ||
        p.data.toLowerCase().includes(q) ||
        p.validity.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [plans, selectedCategory, searchQuery]);

  // Per-day price calculation
  const getPerDayCost = (price: number, validity: string) => {
    const days = parseInt(validity.replace(/\D/g, ''), 10);
    if (!days || isNaN(days)) return null;
    return (price / days).toFixed(1);
  };

  // Calendar future expiry date calculation
  const getCalculatedExpiryDate = (validity: string) => {
    const days = parseInt(validity.replace(/\D/g, ''), 10);
    if (!days || isNaN(days)) return null;
    const targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const day = targetDate.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[targetDate.getMonth()];
    const year = targetDate.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleSelectPlan = (plan: RechargePlan) => {
    setSelectedPlan(plan);
    setShowCheckoutModal(true);
  };

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
        rechargeType: (params.rechargeType as RechargeType) || 'PREPAID',
      });

      // Attempt to open PhonePe or standard UPI app
      const canPhonePe = await Linking.canOpenURL(result.phonePeUrl).catch(() => false);
      if (canPhonePe) {
        await Linking.openURL(result.phonePeUrl);
      } else {
        const canUpi = await Linking.canOpenURL(result.upiIntentUrl).catch(() => false);
        if (canUpi) {
          await Linking.openURL(result.upiIntentUrl);
        } else {
          setShowCheckoutModal(false);
          const expiryDateStr = getCalculatedExpiryDate(selectedPlan.validity);
          Alert.alert(
            'Recharge Queued Successfully',
            `Recharge of ₹${selectedPlan.price} initiated for +91 ${params.mobile}.\n\nReference: ${result.transactionId}\nValid till: ${expiryDateStr || selectedPlan.validity}\n\n🛡️ Queued Activation: Your operator will activate this pack on expiry. You will receive an expiry reminder 24h prior.`,
            [{ text: 'Back to Services', onPress: () => router.replace('/services') }]
          );
        }
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'Unable to open payment app. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <View style={s.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <View style={s.topNav}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={s.headerOperatorInfo}>
          <View style={[s.operatorBadgeMini, { borderColor: operatorColor }]}>
            <Text style={{ fontSize: 16 }}>{params.operatorIcon || '📱'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.operatorHeading}>{params.operatorName || 'Mobile Operator'}</Text>
              <View style={[s.pillTypeBadge, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={s.pillTypeText}>{params.rechargeType || 'Prepaid'}</Text>
              </View>
            </View>
            <Text style={s.operatorMeta}>
              +91 {params.mobile} · {params.circle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={s.changeBtn}
        >
          <Text style={s.changeBtnText}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stepper ───────────────────────────────────────────── */}
      <View style={s.stepperRow}>
        <View style={s.stepItem}>
          <View style={[s.stepDot, s.stepDotCompleted]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
          <Text style={s.stepTextCompleted}>Number</Text>
        </View>
        <View style={[s.stepLine, s.stepLineCompleted]} />
        <View style={s.stepItem}>
          <View style={[s.stepDot, s.stepDotActive]}>
            <Text style={s.stepDotNumberActive}>2</Text>
          </View>
          <Text style={[s.stepText, s.stepTextActive]}>Select Plan</Text>
        </View>
        <View style={s.stepLine} />
        <View style={s.stepItem}>
          <View style={s.stepDot}>
            <Text style={s.stepDotNumber}>3</Text>
          </View>
          <Text style={s.stepText}>1-Tap Pay</Text>
        </View>
      </View>

      {/* ── Expiry Queuing Protection Assurance ───────────────── */}
      <View style={s.queueAssuranceStrip}>
        <Ionicons name="shield-checkmark" size={16} color="#059669" />
        <Text style={s.queueAssuranceText}>
          <Text style={{ fontFamily: FONTS.bold, color: '#065F46' }}>Zero Days Lost:</Text> Recharges queue automatically with your operator. New pack activates the minute your current pack ends.
        </Text>
      </View>

      {/* ── Search Input ──────────────────────────────────────── */}
      <View style={s.searchContainer}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by amount, validity (e.g. 84 days), or OTT..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category Tabs Carousel ────────────────────────────── */}
      <View style={s.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryScroll}
        >
          {CATEGORY_TABS.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[s.categoryChip, isActive && s.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={isActive ? '#FFFFFF' : COLORS.textSecondary}
                />
                <Text style={[s.categoryChipText, isActive && s.categoryChipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Plans List ────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadingText}>Fetching certified operator plans…</Text>
          </View>
        ) : filteredPlans.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
            <Text style={s.emptyTitle}>No matching plans found</Text>
            <Text style={s.emptySubtitle}>Try searching for amounts like ₹239 or ₹299</Text>
            <TouchableOpacity
              style={s.resetSearchBtn}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('POPULAR');
              }}
            >
              <Text style={s.resetSearchText}>View Popular Plans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPlans.map((plan) => {
            const isSelected = selectedPlan?.id === plan.id;
            const perDay = getPerDayCost(plan.price, plan.validity);
            const expiryDate = getCalculatedExpiryDate(plan.validity);

            // Detect OTT or special keywords in description
            const hasHotstar = /hotstar/i.test(plan.description);
            const hasPrime = /prime/i.test(plan.description);
            const hasWynk = /wynk/i.test(plan.description);
            const hasRollover = /rollover/i.test(plan.description);

            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  s.planCard,
                  isSelected && { borderColor: COLORS.primary, backgroundColor: '#FAF5FF' },
                ]}
                onPress={() => handleSelectPlan(plan)}
                activeOpacity={0.85}
              >
                {/* Badges strip */}
                <View style={s.badgesRow}>
                  {plan.isBestSeller && (
                    <View style={s.bestSellerBadge}>
                      <Ionicons name="flame" size={11} color="#C2410C" />
                      <Text style={s.bestSellerText}>BESTSELLER</Text>
                    </View>
                  )}
                  {plan.isRecommended && (
                    <View style={s.recommendedBadge}>
                      <Ionicons name="star" size={11} color="#1D4ED8" />
                      <Text style={s.recommendedText}>RECOMMENDED</Text>
                    </View>
                  )}
                  {perDay && (
                    <View style={s.perDayBadge}>
                      <Text style={s.perDayBadgeText}>₹{perDay} / day</Text>
                    </View>
                  )}
                </View>

                {/* Main Card Content */}
                <View style={s.planMainRow}>
                  {/* Left: Price Box with Projected Expiry */}
                  <View style={s.priceBox}>
                    <Text style={s.priceText}>₹{plan.price}</Text>
                    <Text style={s.validityText}>{plan.validity}</Text>
                    {expiryDate && (
                      <View style={s.calendarExpiryTag}>
                        <Ionicons name="calendar-outline" size={10} color={COLORS.primary} />
                        <Text style={s.calendarExpiryText}>Till {expiryDate}</Text>
                      </View>
                    )}
                  </View>

                  {/* Right: Key Specs */}
                  <View style={s.specsGrid}>
                    <View style={s.specItem}>
                      <Ionicons name="cellular-outline" size={15} color={COLORS.primary} />
                      <Text style={s.specValue}>{plan.data}</Text>
                      <Text style={s.specLabel}>Data</Text>
                    </View>
                    <View style={s.specDivider} />
                    <View style={s.specItem}>
                      <Ionicons name="call-outline" size={15} color="#059669" />
                      <Text style={s.specValue}>{plan.calls}</Text>
                      <Text style={s.specLabel}>Voice</Text>
                    </View>
                    <View style={s.specDivider} />
                    <View style={s.specItem}>
                      <Ionicons name="chatbox-ellipses-outline" size={15} color="#D97706" />
                      <Text style={s.specValue}>{plan.sms}</Text>
                      <Text style={s.specLabel}>SMS</Text>
                    </View>
                  </View>
                </View>

                {/* Plan Description */}
                <Text style={s.planDescription}>{plan.description}</Text>

                {/* OTT & Addon Chips */}
                <View style={s.perksRow}>
                  {hasHotstar && (
                    <View style={[s.perkChip, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                      <Text style={{ fontSize: 10 }}>🎬</Text>
                      <Text style={[s.perkChipText, { color: '#1E40AF' }]}>Disney+ Hotstar</Text>
                    </View>
                  )}
                  {hasPrime && (
                    <View style={[s.perkChip, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <Text style={{ fontSize: 10 }}>📦</Text>
                      <Text style={[s.perkChipText, { color: '#92400E' }]}>Amazon Prime</Text>
                    </View>
                  )}
                  {hasWynk && (
                    <View style={[s.perkChip, { backgroundColor: '#FDF4FF', borderColor: '#F5D0FE' }]}>
                      <Text style={{ fontSize: 10 }}>🎵</Text>
                      <Text style={[s.perkChipText, { color: '#86198F' }]}>Wynk Music</Text>
                    </View>
                  )}
                  {hasRollover && (
                    <View style={[s.perkChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <Text style={{ fontSize: 10 }}>🔄</Text>
                      <Text style={[s.perkChipText, { color: '#065F46' }]}>Weekend Rollover</Text>
                    </View>
                  )}
                  <View style={[s.perkChip, { backgroundColor: COLORS.backgroundAlt, borderColor: COLORS.borderLight }]}>
                    <Text style={{ fontSize: 10 }}>⚡</Text>
                    <Text style={[s.perkChipText, { color: COLORS.textSecondary }]}>Unlimited 5G Data</Text>
                  </View>
                </View>

                {/* Select Button Row */}
                <View style={s.planFooter}>
                  <View style={s.cashbackOfferTag}>
                    <Ionicons name="sparkles" size={12} color="#D97706" />
                    <Text style={s.cashbackOfferText}>
                      Earn ₹{Math.round(plan.price * 0.02)} society points
                    </Text>
                  </View>

                  <View style={s.selectBtn}>
                    <Text style={s.selectBtnText}>Select Plan</Text>
                    <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Quick Bottom Bar (When Plan Selected) ─────────────── */}
      {selectedPlan && (
        <View style={s.floatingBar}>
          <View style={s.floatingInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={s.floatingPrice}>₹{selectedPlan.price}</Text>
              <Text style={s.floatingValidity}>({selectedPlan.validity})</Text>
            </View>
            <Text style={s.floatingMeta}>
              {selectedPlan.data} · {params.operatorName}
            </Text>
          </View>

          <TouchableOpacity
            style={s.floatingPayBtn}
            onPress={() => setShowCheckoutModal(true)}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.floatingPayGradient}
            >
              <Text style={s.floatingPayText}>Proceed to Pay</Text>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Checkout & Bill Summary Bottom Sheet Modal ─────────── */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.checkoutSheet}>
            <View style={s.sheetHandle} />

            {/* Modal Header */}
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>Recharge Summary</Text>
                <Text style={s.sheetSubtitle}>Review validity & schedule before payment</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCheckoutModal(false)}
                style={s.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Target SIM Card */}
            <View style={s.targetCard}>
              <View style={[s.targetIconBox, { borderColor: operatorColor }]}>
                <Text style={{ fontSize: 20 }}>{params.operatorIcon || '📱'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.targetMobile}>+91 {params.mobile}</Text>
                <Text style={s.targetDetails}>
                  {params.operatorName} · {params.circle} · {params.rechargeType}
                </Text>
              </View>
            </View>

            {/* Plan Specs Breakdown */}
            {selectedPlan && (
              <View style={s.planSummaryBox}>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Plan Amount</Text>
                  <Text style={s.summaryValue}>₹{selectedPlan.price}.00</Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Calculated Expiry Date</Text>
                  <Text style={[s.summaryValue, { color: COLORS.primary, fontFamily: FONTS.bold }]}>
                    Valid till {getCalculatedExpiryDate(selectedPlan.validity) || selectedPlan.validity}
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Platform & Convenience Fee</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.feeStrikethrough}>₹3.00</Text>
                    <Text style={s.feeFreeText}>FREE</Text>
                  </View>
                </View>
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Society Cashback (2%)</Text>
                  <Text style={s.cashbackValue}>
                    + ₹{Math.round(selectedPlan.price * 0.02)} Points
                  </Text>
                </View>

                <View style={s.summaryDivider} />

                <View style={s.summaryTotalRow}>
                  <Text style={s.summaryTotalLabel}>Total Amount Payable</Text>
                  <Text style={s.summaryTotalValue}>₹{selectedPlan.price}</Text>
                </View>
              </View>
            )}

            {/* Expiry Intelligence Toggles */}
            <View style={s.expirySettingsBox}>
              <View style={s.toggleSettingRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={s.settingTitle}>Auto-Queue on Current Expiry</Text>
                  <Text style={s.settingDesc}>
                    Avoid losing remaining days. Operator activates pack when current pack ends.
                  </Text>
                </View>
                <Switch
                  value={enableAutoQueue}
                  onValueChange={setEnableAutoQueue}
                  trackColor={{ false: '#CBD5E1', true: COLORS.primaryLight }}
                  thumbColor={enableAutoQueue ? COLORS.primary : '#F1F5F9'}
                />
              </View>

              <View style={[s.toggleSettingRow, { borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: 8 }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={s.settingTitle}>Notify 24h Before Expiry</Text>
                  <Text style={s.settingDesc}>
                    Get reminder via WhatsApp & Mana App before this pack expires.
                  </Text>
                </View>
                <Switch
                  value={enableExpiryReminder}
                  onValueChange={setEnableExpiryReminder}
                  trackColor={{ false: '#CBD5E1', true: COLORS.primaryLight }}
                  thumbColor={enableExpiryReminder ? COLORS.primary : '#F1F5F9'}
                />
              </View>
            </View>

            {/* Pay Button */}
            <TouchableOpacity
              style={[s.payNowBtn, isPaying && s.payNowBtnDisabled]}
              onPress={handlePay}
              disabled={isPaying}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.payNowGradient}
              >
                {isPaying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={17} color="#FFFFFF" />
                    <Text style={s.payNowText}>
                      Pay ₹{selectedPlan?.price} via UPI / PhonePe
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundAlt,
  },
  headerOperatorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  operatorBadgeMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  operatorHeading: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  pillTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  pillTypeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  operatorMeta: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  changeBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: COLORS.success,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepDotNumber: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textMuted,
  },
  stepDotNumberActive: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  stepTextCompleted: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.successDark,
  },
  stepTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.success,
  },
  queueAssuranceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  queueAssuranceText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#065F46',
    lineHeight: 15,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  categoryBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingVertical: 8,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundAlt,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  resetSearchBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
  },
  resetSearchText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
    gap: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bestSellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestSellerText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#C2410C',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#1D4ED8',
  },
  perDayBadge: {
    backgroundColor: COLORS.backgroundAlt,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  perDayBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  planMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceBox: {
    paddingRight: 14,
    borderRightWidth: 1,
    borderRightColor: COLORS.borderLight,
    minWidth: 88,
  },
  priceText: {
    fontSize: 24,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  validityText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  calendarExpiryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  calendarExpiryText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  specsGrid: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingLeft: 8,
  },
  specItem: {
    alignItems: 'center',
    gap: 2,
  },
  specValue: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 2,
  },
  specLabel: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  specDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.borderLight,
    alignSelf: 'center',
  },
  planDescription: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  perksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  perkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  perkChipText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
  },
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cashbackOfferTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cashbackOfferText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: '#D97706',
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
  },
  selectBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  floatingInfo: {
    flex: 1,
  },
  floatingPrice: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  floatingValidity: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  floatingMeta: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  floatingPayBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  floatingPayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  floatingPayText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  checkoutSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderSlate,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  targetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  targetMobile: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  targetDetails: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planSummaryBox: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 7,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  feeStrikethrough: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  feeFreeText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.successDark,
  },
  cashbackValue: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#D97706',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 3,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.primary,
  },
  expirySettingsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 8,
  },
  toggleSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  settingDesc: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
    lineHeight: 14,
  },
  payNowBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  payNowBtnDisabled: {
    opacity: 0.75,
  },
  payNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  payNowText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
});
