import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { DemandRequest } from '@/types/groupBuying';

interface DemandCardProps {
  item: DemandRequest;
  onUpvote?: () => void;
  isUpvoting?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#2563EB',
  VENDOR_OFFERED: '#D97706',
  APPROVED: '#059669',
  LIVE: '#7C3AED',
  FULFILLED: '#64748B',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Collecting Support',
  VENDOR_OFFERED: 'Vendor Offers Available',
  APPROVED: 'Approved ? Deal Coming',
  LIVE: 'Now Live!',
  FULFILLED: 'Fulfilled',
};

export default function DemandCard({ item, onUpvote, isUpvoting }: DemandCardProps) {
  const router = useRouter();
  const target = item.targetUpvotes ?? 25;
  const progress = Math.min(1, item.upvotes / target);
  const color = STATUS_COLOR[item.status] ?? COLORS.primary;

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(('/group-buying/demand/' + item.id) as any)}
      activeOpacity={0.85}
    >
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={[s.statusPill, { backgroundColor: color + '18' }]}>
            <Text style={[s.statusText, { color }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
          <Text style={s.cardTitle}>{item.title}</Text>
          {item.description ? (
            <Text style={s.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>

        {onUpvote && (
          <TouchableOpacity
            style={[s.upvoteBtn, item.hasUpvoted && s.upvoteBtnActive]}
            onPress={onUpvote}
            disabled={isUpvoting}
          >
            <Ionicons
              name={item.hasUpvoted ? 'thumbs-up' : 'thumbs-up-outline'}
              size={16}
              color={item.hasUpvoted ? '#fff' : COLORS.primary}
            />
            <Text style={[s.upvoteCount, item.hasUpvoted && s.upvoteCountActive]}>
              {item.upvotes}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.cardMeta}>
        <Text style={s.metaItem}>?? {item.interestedResidents} residents</Text>
        <Text style={s.metaItem}>?? {item.expectedQty} units</Text>
        {item.preferredPriceMin && (
          <Text style={s.metaItem}>?? ?{item.preferredPriceMin}??{item.preferredPriceMax}</Text>
        )}
      </View>

      <View style={s.progressTrack}>
        <View
          style={[
            s.progressFill,
            { width: (Math.round(progress * 100) + '%') as any, backgroundColor: color },
          ]}
        />
      </View>

      <View style={s.cardFooter}>
        <Text style={s.progressLabel}>{item.upvotes}/{target} support goal</Text>
        {item.vendorOffers && item.vendorOffers.length > 0 ? (
          <View style={s.offersBadge}>
            <Ionicons name="pricetag-outline" size={12} color="#D97706" />
            <Text style={s.offersBadgeText}>{item.vendorOffers.length} offers</Text>
          </View>
        ) : (
          <Text style={s.viewDetailsText}>View Details ?</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 20,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  upvoteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 50,
  },
  upvoteBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  upvoteCount: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 2,
  },
  upvoteCountActive: {
    color: '#fff',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  offersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offersBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  viewDetailsText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
});
