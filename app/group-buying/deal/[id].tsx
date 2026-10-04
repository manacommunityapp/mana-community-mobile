import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import PriceTierCard from '@/components/group-buying/PriceTierCard';
import QuantityProgressBar from '@/components/group-buying/QuantityProgressBar';
import PricingModelBadge from '@/components/group-buying/PricingModelBadge';
import Countdown from '@/components/group-buying/Countdown';
import QuantitySelector from '@/components/group-buying/QuantitySelector';
import type { GroupDealDto, GroupOrderDto } from '@/types/groupBuying';

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<GroupOrderDto | null>(null);

  const { data: deal, isLoading, isError, refetch } = useQuery({
    queryKey: ['deal-detail', id],
    queryFn: () => groupBuyingService.getDealById(id as string),
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: (qty: number) => groupBuyingService.joinDeal(id as string, qty),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['group-deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal-detail', id] });
      setCreatedOrder(order);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not join deal. Please try again.');
    },
  });

  const discPct = deal
    ? Math.round(((deal.mrp - deal.currentTierPrice) / deal.mrp) * 100)
    : 0;

  const totalCost = deal ? deal.currentTierPrice * quantity : 0;
  const totalSavings = deal ? (deal.mrp - deal.currentTierPrice) * quantity : 0;

  const handleShare = async () => {
    if (!deal) return;
    try {
      await Share.share({
        message: `?? Join me on Mana Group Buy for "${deal.title}" at just ?${deal.currentTierPrice} (Market price: ?${deal.mrp})! We need ${deal.nextTierUnitsNeeded ?? (deal.targetQty - deal.committedQty)} more units to unlock even bigger discounts! Check it out in the Mana app.`,
      });
    } catch (e) {
      console.log('Share error', e);
    }
  };

  const handleJoinPress = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmJoin = () => {
    joinMutation.mutate(quantity);
  };

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading deal details...</Text>
      </View>
    );
  }

  if (isError || !deal) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={s.errorTitle}>Deal Not Found</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: deal.title,
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} style={s.headerShareBtn}>
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Deal Header Banner */}
        <LinearGradient
          colors={deal.isFestivalDeal ? ['#7C3AED', '#4C1D95'] : GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroBanner}
        >
          <View style={s.topBadgesRow}>
            <View style={s.categoryPill}>
              <Text style={s.categoryPillText}>{deal.category}</Text>
            </View>
            <View style={s.topRightBadges}>
              {deal.isTrending && (
                <View style={s.badgeHot}>
                  <Text style={s.badgeHotText}>?? Trending</Text>
                </View>
              )}
              {deal.isFestivalDeal && (
                <View style={s.badgeFest}>
                  <Text style={s.badgeFestText}>?? Festival Deal</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={s.title}>{deal.title}</Text>
          {deal.subCategory && <Text style={s.subCategory}>{deal.subCategory}</Text>}

          {/* Pricing Highlight Box */}
          <View style={s.priceBox}>
            <View style={s.priceBoxLeft}>
              <Text style={s.mrpLabel}>
                Market Price: <Text style={s.mrpCrossed}>?{deal.mrp}</Text>
              </Text>
              <View style={s.currentPriceRow}>
                <Text style={s.currentPrice}>?{deal.currentTierPrice}</Text>
                <Text style={s.unitText}>/ unit</Text>
              </View>
            </View>
            <View style={s.discountPill}>
              <Text style={s.discountText}>{discPct}% SAVINGS</Text>
              <Text style={s.saveAmount}>Save ?{deal.mrp - deal.currentTierPrice}/unit</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Vendor Profile Link Card */}
        <TouchableOpacity
          style={s.vendorCard}
          onPress={() => router.push((`/group-buying/vendor/${deal.vendorId}`) as any)}
          activeOpacity={0.8}
        >
          <View style={s.vendorAvatar}>
            <Ionicons name="storefront" size={20} color={COLORS.primary} />
          </View>
          <View style={s.vendorInfo}>
            <View style={s.vendorNameRow}>
              <Text style={s.vendorName}>{deal.vendor}</Text>
              {deal.vendorVerified && (
                <Ionicons name="checkmark-circle" size={15} color="#059669" />
              )}
            </View>
            <View style={s.vendorMeta}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={s.vendorRating}>{deal.vendorRating}</Text>
              <Text style={s.vendorDot}>?</Text>
              <Text style={s.vendorViewProfile}>View Vendor Profile ?</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Countdown Urgency */}
        <View style={s.countdownCard}>
          <Ionicons name="time-outline" size={18} color="#D97706" />
          <Countdown endsAt={deal.dealEndsAt} label="Group deal closes in: " />
        </View>

        {/* Quantity Progress */}
        <View style={s.sectionCard}>
          <Text style={s.sectionHeading}>Community Commitment Progress</Text>
          <QuantityProgressBar
            committedQty={deal.committedQty}
            targetQty={deal.targetQty}
            nextTierUnitsNeeded={deal.nextTierUnitsNeeded}
            moqLabel={deal.moqLabel}
          />
          <View style={s.participantsRow}>
            <Ionicons name="people-outline" size={14} color={COLORS.textSecondary} />
            <Text style={s.participantsText}>
              <Text style={s.bold}>{deal.currentParticipants}</Text> neighbours already joined
            </Text>
          </View>
        </View>

        {/* Price Tier Ladder */}
        {deal.priceTiers && deal.priceTiers.length > 0 && (
          <View style={s.sectionCard}>
            <View style={s.tierCardHeader}>
              <Text style={s.sectionHeading}>Collective Volume Pricing</Text>
              <PricingModelBadge model={deal.pricingModel} />
            </View>
            <PriceTierCard tiers={deal.priceTiers} mrp={deal.mrp} />
          </View>
        )}

        {/* Pricing Model Explanation */}
        <View style={s.pricingModelCallout}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={s.modelCalloutTitle}>
              {deal.pricingModel === 'THRESHOLD' && 'Volume Price Guarantee'}
              {deal.pricingModel === 'GUARANTEED' && 'Guaranteed Flat Price'}
              {deal.pricingModel === 'TARGET_OR_CANCEL' && 'Target-or-Cancel Protection'}
            </Text>
            <Text style={s.modelCalloutDesc}>
              {deal.pricingModel === 'THRESHOLD' &&
                'The price automatically drops for everyone as more residents join. You will be charged the lowest unlocked final price.'}
              {deal.pricingModel === 'GUARANTEED' &&
                'The group price is locked and guaranteed regardless of final order count.'}
              {deal.pricingModel === 'TARGET_OR_CANCEL' &&
                'If the minimum group target is not reached by deal close, your payment is 100% automatically refunded.'}
            </Text>
          </View>
        </View>

        {/* Logistics & Delivery Details */}
        <View style={s.sectionCard}>
          <Text style={s.sectionHeading}>Fulfillment & Pickup Details</Text>
          <View style={s.logisticsList}>
            <View style={s.logisticsRow}>
              <View style={s.logisticsIconWrap}>
                <Ionicons name="location-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={s.logisticsTextWrap}>
                <Text style={s.logisticsLabel}>Pickup Location</Text>
                <Text style={s.logisticsValue}>{deal.pickupPoint}</Text>
              </View>
            </View>

            {deal.pickupDate && (
              <View style={s.logisticsRow}>
                <View style={s.logisticsIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={s.logisticsTextWrap}>
                  <Text style={s.logisticsLabel}>Pickup Date</Text>
                  <Text style={s.logisticsValue}>{deal.pickupDate}</Text>
                </View>
              </View>
            )}

            {deal.pickupSlots && deal.pickupSlots.length > 0 && (
              <View style={s.logisticsRow}>
                <View style={s.logisticsIconWrap}>
                  <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={s.logisticsTextWrap}>
                  <Text style={s.logisticsLabel}>Available Time Slots</Text>
                  <Text style={s.logisticsValue}>{deal.pickupSlots.join(', ')}</Text>
                </View>
              </View>
            )}

            <View style={s.logisticsRow}>
              <View style={s.logisticsIconWrap}>
                <Ionicons name="card-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={s.logisticsTextWrap}>
                <Text style={s.logisticsLabel}>Payment Terms</Text>
                <Text style={s.logisticsValue}>
                  {deal.paymentType === 'FULL' && 'Full Payment on Order'}
                  {deal.paymentType === 'ADVANCE' && 'Advance Token Deposit'}
                  {deal.paymentType === 'PAY_AT_PICKUP' && 'Pay at Clubhouse Pickup'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Product Description */}
        <View style={s.sectionCard}>
          <Text style={s.sectionHeading}>About This Product</Text>
          <Text style={s.descText}>{deal.description}</Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={s.bottomBar}>
        <View style={s.bottomBarTop}>
          <View style={s.qtyWrap}>
            <Text style={s.qtyLabel}>Quantity:</Text>
            <QuantitySelector
              quantity={quantity}
              onQuantityChange={setQuantity}
              min={1}
              max={deal.inventoryRemaining ?? 20}
            />
          </View>

          <View style={s.totalWrap}>
            <Text style={s.totalLabel}>Total Price</Text>
            <Text style={s.totalValue}>?{totalCost.toLocaleString()}</Text>
            <Text style={s.totalSavings}>You save ?{totalSavings}</Text>
          </View>
        </View>

        <View style={s.actionButtonsRow}>
          <TouchableOpacity style={s.inviteBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
            <Text style={s.inviteBtnText}>Invite</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.joinBtn}
            onPress={handleJoinPress}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRADIENTS.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.joinBtnGradient}
            >
              <Ionicons name="bag-check-outline" size={20} color="#FFFFFF" />
              <Text style={s.joinBtnText}>Join Group Buy (?{totalCost})</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirmation / Success Modal */}
      <Modal visible={showConfirmModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {createdOrder ? (
              // Order Success State
              <View style={s.modalSuccess}>
                <View style={s.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={48} color="#059669" />
                </View>
                <Text style={s.successTitle}>You're In the Group Buy!</Text>
                <Text style={s.successSub}>
                  Order #{createdOrder.id} has been registered at the locked rate of ?{deal.currentTierPrice}/unit.
                </Text>

                <View style={s.orderSummaryBox}>
                  <View style={s.orderSummaryRow}>
                    <Text style={s.summaryLabel}>Item</Text>
                    <Text style={s.summaryValue}>{createdOrder.title}</Text>
                  </View>
                  <View style={s.orderSummaryRow}>
                    <Text style={s.summaryLabel}>Quantity</Text>
                    <Text style={s.summaryValue}>{createdOrder.qty} units</Text>
                  </View>
                  <View style={s.orderSummaryRow}>
                    <Text style={s.summaryLabel}>Total Amount</Text>
                    <Text style={[s.summaryValue, s.boldPrimary]}>?{createdOrder.total}</Text>
                  </View>
                  <View style={s.orderSummaryRow}>
                    <Text style={s.summaryLabel}>Pickup</Text>
                    <Text style={s.summaryValue}>{createdOrder.pickupPoint ?? deal.pickupPoint}</Text>
                  </View>
                </View>

                <View style={s.successActions}>
                  <TouchableOpacity
                    style={s.pickupPassBtn}
                    onPress={() => {
                      setShowConfirmModal(false);
                      setCreatedOrder(null);
                      router.push((`/group-buying/pickup/${createdOrder.id}`) as any);
                    }}
                  >
                    <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
                    <Text style={s.pickupPassBtnText}>View Digital Pickup Pass</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.doneBtn}
                    onPress={() => {
                      setShowConfirmModal(false);
                      setCreatedOrder(null);
                      router.push('/group-buying' as any);
                    }}
                  >
                    <Text style={s.doneBtnText}>Back to Deals</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Confirm Joining Deal State
              <View style={s.modalConfirm}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Confirm Group Buy Order</Text>
                  <TouchableOpacity
                    onPress={() => setShowConfirmModal(false)}
                    style={s.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={s.confirmDetails}>
                  <Text style={s.confirmProductTitle}>{deal.title}</Text>
                  <View style={s.confirmRow}>
                    <Text style={s.confirmLabel}>Quantity</Text>
                    <Text style={s.confirmValue}>{quantity} unit(s)</Text>
                  </View>
                  <View style={s.confirmRow}>
                    <Text style={s.confirmLabel}>Locked Rate</Text>
                    <Text style={s.confirmValue}>?{deal.currentTierPrice} / unit</Text>
                  </View>
                  <View style={s.confirmRow}>
                    <Text style={s.confirmLabel}>Total Payable</Text>
                    <Text style={[s.confirmValue, s.boldPrimary]}>?{totalCost}</Text>
                  </View>
                  <View style={s.confirmRow}>
                    <Text style={s.confirmLabel}>Total Savings</Text>
                    <Text style={[s.confirmValue, s.savingsText]}>?{totalSavings}</Text>
                  </View>
                  <View style={s.confirmRow}>
                    <Text style={s.confirmLabel}>Pickup At</Text>
                    <Text style={s.confirmValue}>{deal.pickupPoint}</Text>
                  </View>
                </View>

                <View style={s.confirmNotice}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={s.confirmNoticeText}>
                    If more neighbours join and unlock a lower price tier, your final charge will automatically adjust downwards.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[s.confirmSubmitBtn, joinMutation.isPending && s.btnDisabled]}
                  onPress={handleConfirmJoin}
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={s.confirmSubmitBtnText}>Confirm Commitment (?{totalCost})</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
  content: {
    paddingBottom: 130,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  headerShareBtn: {
    marginRight: 8,
    padding: 6,
  },
  heroBanner: {
    padding: 18,
    paddingTop: 16,
    gap: 12,
  },
  topBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  categoryPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topRightBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badgeHot: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeHotText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeFest: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeFestText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  subCategory: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: -4,
  },
  priceBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  priceBoxLeft: {
    gap: 2,
  },
  mrpLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  mrpCrossed: {
    textDecorationLine: 'line-through',
  },
  currentPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  unitText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  discountPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  discountText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '900',
  },
  saveAmount: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  vendorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorInfo: {
    flex: 1,
    gap: 3,
  },
  vendorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vendorRating: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  vendorDot: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  vendorViewProfile: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  tierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  participantsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.text,
  },
  pricingModelCallout: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 14,
    marginTop: 12,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 12,
  },
  modelCalloutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  modelCalloutDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  logisticsList: {
    gap: 12,
  },
  logisticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logisticsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logisticsTextWrap: {
    flex: 1,
  },
  logisticsLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  logisticsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 1,
  },
  descText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
    ...SHADOWS.lg,
  },
  bottomBarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  totalWrap: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  totalSavings: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  inviteBtnText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  joinBtn: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  joinBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 20,
    paddingBottom: 36,
  },
  modalConfirm: {
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  confirmDetails: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 10,
  },
  confirmProductTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  confirmValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  boldPrimary: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  savingsText: {
    color: '#059669',
  },
  confirmNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: RADIUS.md,
  },
  confirmNoticeText: {
    fontSize: 11,
    color: COLORS.primary,
    flex: 1,
    lineHeight: 15,
  },
  confirmSubmitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalSuccess: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  successSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  orderSummaryBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 8,
    marginTop: 4,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  successActions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  pickupPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
  },
  pickupPassBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  doneBtnText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
