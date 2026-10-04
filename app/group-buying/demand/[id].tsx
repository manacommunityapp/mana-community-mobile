import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import VendorOfferCard from '@/components/group-buying/VendorOfferCard';
import type { VendorOffer } from '@/types/groupBuying';

export default function DemandDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: demand, isLoading, refetch } = useQuery({
    queryKey: ['demand', id],
    queryFn: () => groupBuyingService.getDemandById(id!),
    enabled: !!id,
  });

  const acceptMutation = useMutation({
    mutationFn: (offer: VendorOffer) => groupBuyingService.acceptVendorOffer(id!, offer.id),
    onSuccess: (newDeal) => {
      Alert.alert('Offer Accepted!', 'This demand has been converted to an active Group Buy deal.', [
        { text: 'View Deal', onPress: () => router.push(`/group-buying/deal/${newDeal.id}` as any) }
      ]);
      queryClient.invalidateQueries({ queryKey: ['group-deals'] });
      queryClient.invalidateQueries({ queryKey: ['demand', id] });
    },
    onError: () => Alert.alert('Error', 'Could not accept offer.'),
  });

  const handleSelectOffer = (offer: VendorOffer) => {
    Alert.alert(
      'Accept Vendor Offer',
      `Accept ${offer.vendorName}'s bid at ₹${offer.offeredPrice}/unit (MOQ: ${offer.minimumQty}) and convert this demand into a live Group Deal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept & Launch Deal', onPress: () => acceptMutation.mutate(offer) },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Demand & Bids', headerBackTitle: 'Back' }} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refetch(); setRefreshing(false); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {isLoading || !demand ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          <>
            <View style={s.demandCard}>
              <View style={s.catBadge}><Text style={s.catText}>{demand.category}</Text></View>
              <Text style={s.title}>{demand.title}</Text>
              {demand.description ? <Text style={s.desc}>{demand.description}</Text> : null}

              <View style={s.metricsRow}>
                <View style={s.metric}><Text style={s.metricNum}>{demand.upvotes}</Text><Text style={s.metricLabel}>Upvotes</Text></View>
                <View style={s.metricDiv} />
                <View style={s.metric}><Text style={s.metricNum}>{demand.interestedResidents}</Text><Text style={s.metricLabel}>Residents</Text></View>
                <View style={s.metricDiv} />
                <View style={s.metric}><Text style={s.metricNum}>{demand.expectedQty}</Text><Text style={s.metricLabel}>Units</Text></View>
              </View>

              {demand.preferredPriceMin ? (
                <View style={s.priceHint}>
                  <Ionicons name="pricetag-outline" size={14} color={COLORS.primary} />
                  <Text style={s.priceHintText}>Target Price: ₹{demand.preferredPriceMin}–₹{demand.preferredPriceMax}</Text>
                </View>
              ) : null}
            </View>

            <Text style={s.sectionTitle}>Competing Vendor Offers ({demand.vendorOffers.length})</Text>

            {demand.vendorOffers.length === 0 ? (
              <View style={s.noOffers}>
                <Ionicons name="hourglass-outline" size={36} color={COLORS.textMuted} />
                <Text style={s.noOffersTitle}>No Vendor Offers Yet</Text>
                <Text style={s.noOffersSub}>We have notified verified vendors. Competing bids will appear here soon.</Text>
              </View>
            ) : (
              [...demand.vendorOffers].sort((a, b) => a.offeredPrice - b.offeredPrice).map(offer => (
                <VendorOfferCard key={offer.id} offer={offer} onSelect={handleSelectOffer} />
              ))
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  demandCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 18, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  catBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  metricsRow: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 12, marginTop: 4 },
  metric: { flex: 1, alignItems: 'center' },
  metricNum: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  metricLabel: { fontSize: 11, color: COLORS.textMuted },
  metricDiv: { width: 1, height: 26, backgroundColor: COLORS.border },
  priceHint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', borderRadius: 8, padding: 8 },
  priceHintText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  noOffers: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 32, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border },
  noOffersTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  noOffersSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});
