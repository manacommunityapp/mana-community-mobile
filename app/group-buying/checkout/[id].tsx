import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import type { GroupDealDto } from '@/types/groupBuying';

export default function GroupBuyCheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CREDIT_DEBIT_CARD' | 'NET_BANKING' | 'ESCROW_HOLD'>('UPI');
  const [upiProvider, setUpiProvider] = useState<'GPAY' | 'PHONEPE' | 'PAYTM' | 'OTHER'>('GPAY');
  const [deliveryOption, setDeliveryOption] = useState<'CLUBHOUSE' | 'DOORSTEP'>('CLUBHOUSE');
  const [flatNumber, setFlatNumber] = useState('Tower A - 402');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: deal, isLoading } = useQuery({
    queryKey: ['group-deal', id],
    queryFn: () => groupBuyingService.getDealById(id || 'd1'),
  });

  const pricing = useMemo(() => {
    if (!deal) return { unitPrice: 0, mrp: 0, total: 0, totalMrp: 0, savings: 0, savingsPct: 0, currentTierLabel: '' };

    const currentCommitted = deal.committedQty || 0;
    const prospectiveQty = currentCommitted + quantity;

    const sortedTiers = [...(deal.priceTiers || [])].sort((a, b) => b.minQty - a.minQty);
    const applicableTier = sortedTiers.find(t => prospectiveQty >= t.minQty);

    const unitPrice = applicableTier ? applicableTier.price : deal.currentTierPrice;
    const total = unitPrice * quantity;
    const totalMrp = deal.mrp * quantity;
    const savings = Math.max(0, totalMrp - total);
    const savingsPct = totalMrp > 0 ? Math.round((savings / totalMrp) * 100) : 0;

    return {
      unitPrice,
      mrp: deal.mrp,
      total,
      totalMrp,
      savings,
      savingsPct,
      currentTierLabel: applicableTier?.label || 'Active Group Rate',
    };
  }, [deal, quantity]);

  const handlePlaceOrder = async () => {
    if (!deal) return;
    setSubmitting(true);
    try {
      const order = await groupBuyingService.checkoutGroupBuy(deal.id, quantity, {
        paymentMethod,
        amountToPayNow: pricing.total,
        escrowHoldAmount: paymentMethod === 'ESCROW_HOLD' ? pricing.total : 0,
        deliveryAddressOrPickup: deliveryOption === 'CLUBHOUSE' ? (deal.pickupPoint || 'Clubhouse Desk') : flatNumber,
        specialNotes: notes,
      });

      Alert.alert(
        '🎉 Group Buy Confirmed!',
        `Your order ${order.id} for ${quantity}x ${deal.title} is locked at ₹${pricing.unitPrice}/unit. Digital pickup pass generated.`,
        [
          {
            text: 'View Pickup Pass',
            onPress: () => router.replace(`/group-buying/pickup/${order.id}`),
          },
          {
            text: 'My Orders',
            onPress: () => router.replace('/group-buying/orders'),
          },
        ]
      );
    } catch {
      Alert.alert('Checkout Error', 'Unable to complete checkout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !deal) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading checkout details...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Group Buy Checkout', headerBackTitle: 'Deal' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* Deal Summary Banner */}
        <View style={s.summaryCard}>
          <View style={s.categoryTag}>
            <Text style={s.categoryTagText}>{deal.category.toUpperCase()}</Text>
          </View>
          <Text style={s.dealTitle}>{deal.title}</Text>
          <Text style={s.vendorName}>Supplied by {deal.vendor}</Text>

          <View style={s.pricingRow}>
            <View>
              <Text style={s.unitPriceLabel}>Locked Group Rate</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text style={s.currentPrice}>₹{pricing.unitPrice}</Text>
                <Text style={s.mrpPrice}>₹{deal.mrp}</Text>
              </View>
            </View>
            <View style={s.tierBadge}>
              <Ionicons name="sparkles" size={14} color="#166534" />
              <Text style={s.tierBadgeText}>{pricing.currentTierLabel}</Text>
            </View>
          </View>
        </View>

        {/* Quantity Selector */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Select Quantity</Text>
          <View style={s.qtyControls}>
            <TouchableOpacity
              style={[s.qtyBtn, quantity <= 1 && s.qtyBtnDisabled]}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Ionicons name="remove" size={20} color={quantity <= 1 ? COLORS.textMuted : COLORS.text} />
            </TouchableOpacity>
            <View style={s.qtyDisplay}>
              <Text style={s.qtyText}>{quantity}</Text>
              <Text style={s.qtyUnitLabel}>units</Text>
            </View>
            <TouchableOpacity
              style={s.qtyBtn}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Ionicons name="add" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {pricing.savings > 0 && (
            <View style={s.savingsCallout}>
              <Ionicons name="trending-down" size={18} color="#059669" />
              <Text style={s.savingsCalloutText}>
                You save ₹{pricing.savings} ({pricing.savingsPct}% OFF MRP) with society pool!
              </Text>
            </View>
          )}
        </View>

        {/* Fulfillment / Collection Point */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Collection & Handover</Text>
          
          <TouchableOpacity
            style={[s.optionCard, deliveryOption === 'CLUBHOUSE' && s.optionCardActive]}
            onPress={() => setDeliveryOption('CLUBHOUSE')}
          >
            <View style={s.radioCircle}>
              {deliveryOption === 'CLUBHOUSE' && <View style={s.radioDot} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.optionTitle}>Community Pickup Desk (Recommended)</Text>
              <Text style={s.optionSubtitle}>{deal.pickupPoint || 'Clubhouse Ground Floor'} • Free Society Consolidation</Text>
            </View>
            <Ionicons name="business-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          {deal.fulfillmentType === 'BOTH' && (
            <TouchableOpacity
              style={[s.optionCard, deliveryOption === 'DOORSTEP' && s.optionCardActive]}
              onPress={() => setDeliveryOption('DOORSTEP')}
            >
              <View style={s.radioCircle}>
                {deliveryOption === 'DOORSTEP' && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.optionTitle}>Doorstep Delivery</Text>
                <Text style={s.optionSubtitle}>Direct to Flat: {flatNumber}</Text>
              </View>
              <Ionicons name="home-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}

          {deliveryOption === 'DOORSTEP' && (
            <View style={{ marginTop: 8 }}>
              <Text style={s.inputSubLabel}>Confirm Tower & Flat Number</Text>
              <TextInput
                style={s.textInput}
                value={flatNumber}
                onChangeText={setFlatNumber}
                placeholder="e.g. Tower B - 802"
              />
            </View>
          )}
        </View>

        {/* Payment & Escrow Method */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Payment & Escrow Protection</Text>

          <TouchableOpacity
            style={[s.optionCard, paymentMethod === 'UPI' && s.optionCardActive]}
            onPress={() => setPaymentMethod('UPI')}
          >
            <View style={s.radioCircle}>
              {paymentMethod === 'UPI' && <View style={s.radioDot} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.optionTitle}>Instant UPI Payment</Text>
              <Text style={s.optionSubtitle}>GPay, PhonePe, Paytm, BHIM</Text>
            </View>
            <Ionicons name="phone-portrait-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          {paymentMethod === 'UPI' && (
            <View style={s.upiRow}>
              {(['GPAY', 'PHONEPE', 'PAYTM', 'OTHER'] as const).map(app => (
                <TouchableOpacity
                  key={app}
                  style={[s.upiChip, upiProvider === app && s.upiChipActive]}
                  onPress={() => setUpiProvider(app)}
                >
                  <Text style={[s.upiChipText, upiProvider === app && s.upiChipTextActive]}>{app}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[s.optionCard, paymentMethod === 'ESCROW_HOLD' && s.optionCardActive]}
            onPress={() => setPaymentMethod('ESCROW_HOLD')}
          >
            <View style={s.radioCircle}>
              {paymentMethod === 'ESCROW_HOLD' && <View style={s.radioDot} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.optionTitle}>Society Escrow Guarantee</Text>
              <Text style={s.optionSubtitle}>Amount held securely in escrow until pickup confirmation</Text>
            </View>
            <Ionicons name="shield-checkmark-outline" size={22} color="#059669" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.optionCard, paymentMethod === 'CREDIT_DEBIT_CARD' && s.optionCardActive]}
            onPress={() => setPaymentMethod('CREDIT_DEBIT_CARD')}
          >
            <View style={s.radioCircle}>
              {paymentMethod === 'CREDIT_DEBIT_CARD' && <View style={s.radioDot} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.optionTitle}>Credit / Debit Card</Text>
              <Text style={s.optionSubtitle}>Visa, MasterCard, RuPay</Text>
            </View>
            <Ionicons name="card-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Special Notes */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Special Notes (Optional)</Text>
          <TextInput
            style={[s.textInput, { height: 64, textAlignVertical: 'top' }]}
            placeholder="e.g. Leave with security desk if unreachable..."
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {/* Price Breakdown */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Price Breakdown</Text>
          <View style={s.breakdownRow}>
            <Text style={s.breakdownLabel}>MRP ({quantity} units)</Text>
            <Text style={s.breakdownValue}>₹{pricing.totalMrp.toLocaleString()}</Text>
          </View>
          <View style={s.breakdownRow}>
            <Text style={s.breakdownLabel}>Community Wholesale Discount</Text>
            <Text style={[s.breakdownValue, { color: '#059669' }]}>- ₹{pricing.savings.toLocaleString()}</Text>
          </View>
          <View style={s.breakdownRow}>
            <Text style={s.breakdownLabel}>Society Handling / Delivery</Text>
            <Text style={[s.breakdownValue, { color: '#059669' }]}>FREE</Text>
          </View>
          <View style={[s.breakdownRow, s.breakdownTotal]}>
            <Text style={s.totalLabel}>Total Payable</Text>
            <Text style={s.totalValue}>₹{pricing.total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={s.confirmBtn}
          onPress={handlePlaceOrder}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={20} color="#fff" />
              <Text style={s.confirmBtnText}>
                {paymentMethod === 'ESCROW_HOLD' ? 'Authorize Escrow Hold' : 'Pay & Lock Group Price'} • ₹{pricing.total.toLocaleString()}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textMuted },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryTagText: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },
  dealTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  vendorName: { fontSize: 13, color: COLORS.textMuted },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
  },
  unitPriceLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  currentPrice: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  mrpPrice: { fontSize: 14, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  tierBadgeText: { fontSize: 12, fontWeight: '800', color: '#166534' },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qtyBtnDisabled: { opacity: 0.4 },
  qtyDisplay: { alignItems: 'center', minWidth: 60 },
  qtyText: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  qtyUnitLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  savingsCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savingsCalloutText: { fontSize: 13, color: '#065F46', fontWeight: '700', flex: 1 },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  optionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  optionSubtitle: { fontSize: 12, color: COLORS.textMuted },
  inputSubLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  textInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  upiRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  upiChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  upiChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  upiChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  upiChipTextActive: { color: '#fff' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  breakdownLabel: { fontSize: 13, color: COLORS.textMuted },
  breakdownValue: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceAlt,
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  totalValue: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    ...SHADOWS.md,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
