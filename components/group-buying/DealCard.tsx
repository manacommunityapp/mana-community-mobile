import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { GroupDealDto } from '@/types/groupBuying';
import PricingModelBadge from './PricingModelBadge';
import Countdown from './Countdown';

interface DealCardProps {
  deal: GroupDealDto;
  onPress?: () => void;
}

export default function DealCard({ deal, onPress }: DealCardProps) {
  const router = useRouter();
  const discPct = Math.round(((deal.mrp - deal.currentTierPrice) / deal.mrp) * 100);
  const progress = Math.min(1, deal.committedQty / (deal.targetQty || 1));

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(('/group-buying/deal/' + deal.id) as any);
    }
  };

  return (
    <TouchableOpacity style={s.dealCard} onPress={handlePress} activeOpacity={0.85}>
      <View style={s.dealCardTop}>
        <View style={s.dealCatBadge}>
          <Text style={s.dealCatText}>{deal.category}</Text>
        </View>
        <View style={s.dealRightBadges}>
          {deal.isTrending && (
            <View style={s.trendBadge}>
              <Text style={s.trendBadgeText}>?? Hot</Text>
            </View>
          )}
          {deal.isFestivalDeal && (
            <View style={s.festBadge}>
              <Text style={s.festBadgeText}>?? Festival</Text>
            </View>
          )}
          {(deal.isEndingSoon || deal.daysLeft <= 1) && (
            <View style={s.urgentBadge}>
              <Text style={s.urgentBadgeText}>? Ends Soon</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={s.dealTitle} numberOfLines={2}>
        {deal.title}
      </Text>

      <View style={s.dealVendorRow}>
        <Ionicons name="storefront-outline" size={12} color={COLORS.textMuted} />
        <Text style={s.dealVendorText}>{deal.vendor}</Text>
        {deal.vendorVerified && <Ionicons name="checkmark-circle" size={12} color="#059669" />}
        <Ionicons name="star" size={12} color="#F59E0B" style={{ marginLeft: 6 }} />
        <Text style={s.dealVendorText}>{deal.vendorRating}</Text>
      </View>

      <View style={s.dealPricingRow}>
        <View>
          <Text style={s.dealMrp}>MRP ?{deal.mrp}</Text>
          <Text style={s.dealCurrentPrice}>?{deal.currentTierPrice}</Text>
        </View>
        <View style={s.dealDiscBadge}>
          <Text style={s.dealDiscText}>{discPct}% OFF</Text>
        </View>
        <PricingModelBadge model={deal.pricingModel} />
      </View>

      {deal.priceTiers && deal.priceTiers.length > 1 && deal.nextTierPrice ? (
        <View style={s.nextTierHint}>
          <Ionicons name="trending-down-outline" size={13} color="#059669" />
          <Text style={s.nextTierText}>
            Next tier: ?{deal.nextTierPrice} ? {deal.nextTierUnitsNeeded} more needed
          </Text>
        </View>
      ) : null}

      <View style={s.dealProgress}>
        <View style={s.dealProgressTrack}>
          <View
            style={[
              s.dealProgressFill,
              { width: (Math.round(progress * 100) + '%') as any },
            ]}
          />
        </View>
        <Text style={s.dealProgressText}>
          {deal.committedQty}/{deal.targetQty} units ? {deal.daysLeft}d left
        </Text>
      </View>

      <View style={s.dealCardFooter}>
        <Countdown endsAt={deal.dealEndsAt} label="Ends in" />
        <View style={s.viewDealBtn}>
          <Text style={s.viewDealBtnText}>View Deal</Text>
          <Ionicons name="chevron-forward" size={13} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  dealCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.md,
  },
  dealCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealCatBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dealCatText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealRightBadges: {
    flexDirection: 'row',
    gap: 5,
  },
  trendBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  festBadge: {
    backgroundColor: '#F3E8FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  festBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  urgentBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 22,
  },
  dealVendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dealVendorText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dealPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dealMrp: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  dealCurrentPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  dealDiscBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dealDiscText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  nextTierHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  nextTierText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
  dealProgress: {
    gap: 4,
  },
  dealProgressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  dealProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  dealProgressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  dealCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  viewDealBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
