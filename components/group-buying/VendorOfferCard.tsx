import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { VendorOffer } from '@/types/groupBuying';

interface Props { offer: VendorOffer; onSelect: (offer: VendorOffer) => void; }

export default function VendorOfferCard({ offer, onSelect }: Props) {
  return (
    <TouchableOpacity style={[s.card, offer.isBestValue && s.cardBest]} onPress={() => onSelect(offer)} activeOpacity={0.8}>
      {offer.isBestValue && (
        <View style={s.bestBadge}><Text style={s.bestText}>👑 Best Value</Text></View>
      )}
      <View style={s.row}>
        <View style={s.vendorInfo}>
          <View style={s.nameRow}>
            <Text style={s.vendorName}>{offer.vendorName}</Text>
            {offer.vendorVerified && <Ionicons name="checkmark-circle" size={14} color="#059669" />}
          </View>
          <View style={s.ratingRow}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={s.rating}>{offer.vendorRating}</Text>
          </View>
        </View>
        <View style={s.offerInfo}>
          <Text style={s.price}>₹{offer.offeredPrice}</Text>
          <Text style={s.moq}>MOQ: {offer.minimumQty} units</Text>
        </View>
      </View>
      {offer.terms && <Text style={s.terms} numberOfLines={2}>{offer.terms}</Text>}
      <View style={s.footer}>
        <Text style={s.delivery}>📅 Delivery: {offer.deliveryDate}</Text>
        <View style={[s.joinBtn, offer.isBestValue && s.joinBtnBest]}>
          <Text style={[s.joinBtnText, offer.isBestValue && s.joinBtnTextBest]}>Join This Offer</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8, ...SHADOWS.sm },
  cardBest: { borderColor: '#F59E0B', borderWidth: 2 },
  bestBadge: { backgroundColor: '#FEF3C7', borderRadius: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3 },
  bestText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorInfo: { gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vendorName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontSize: 12, color: COLORS.textSecondary },
  offerInfo: { alignItems: 'flex-end' },
  price: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  moq: { fontSize: 11, color: COLORS.textMuted },
  terms: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delivery: { fontSize: 12, color: COLORS.textMuted },
  joinBtn: { backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  joinBtnBest: { backgroundColor: COLORS.primary },
  joinBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  joinBtnTextBest: { color: '#fff' },
});
