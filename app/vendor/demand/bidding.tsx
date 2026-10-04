import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import { vendorService } from '@/services/vendorService';
import type { DemandRequest } from '@/types/groupBuying';

export default function VendorBiddingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDemand, setSelectedDemand] = useState<DemandRequest | null>(null);
  const [offeredPrice, setOfferedPrice] = useState('');
  const [minimumQty, setMinimumQty] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('2026-10-12');
  const [terms, setTerms] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: demands = [], isLoading, refetch } = useQuery({
    queryKey: ['demand-board'],
    queryFn: groupBuyingService.getDemandBoard,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const submitMutation = useMutation({
    mutationFn: () => vendorService.submitDemandOffer(selectedDemand!.id, {
      offeredPrice: parseFloat(offeredPrice),
      minimumQty: parseInt(minimumQty),
      deliveryDate,
      terms: terms.trim() || undefined,
    }),
    onSuccess: () => {
      Alert.alert('Offer Submitted!', 'Your bid has been submitted to the community. You will be notified when accepted.');
      setSelectedDemand(null);
      setOfferedPrice('');
      setMinimumQty('');
      setTerms('');
      queryClient.invalidateQueries({ queryKey: ['demand-board'] });
    },
    onError: () => Alert.alert('Error', 'Could not submit bid. Please try again.'),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Community Demand & Bidding', headerBackTitle: 'Back' }} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        <View style={s.heroBanner}>
          <Ionicons name="analytics-outline" size={32} color={COLORS.primary} />
          <Text style={s.heroTitle}>Community Demand Intelligence</Text>
          <Text style={s.heroSub}>
            Direct buying demand from residential societies. Submit your best wholesale bulk offer to win the deal.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Live Community Demands ({demands.length})</Text>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : demands.length === 0 ? (
          <View style={s.center}>
            <Text style={s.emptyTitle}>No active demands right now</Text>
          </View>
        ) : (
          demands.map(demand => (
            <View key={demand.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.catBadge}>{demand.category}</Text>
                  <Text style={s.demandTitle}>{demand.title}</Text>
                </View>
                <View style={s.upvotePill}>
                  <Ionicons name="thumbs-up" size={13} color={COLORS.primary} />
                  <Text style={s.upvoteText}>{demand.upvotes} votes</Text>
                </View>
              </View>

              <View style={s.statsGrid}>
                <View style={s.statBox}>
                  <Text style={s.statNum}>{demand.interestedResidents}</Text>
                  <Text style={s.statLabel}>Residents</Text>
                </View>
                <View style={s.statDiv} />
                <View style={s.statBox}>
                  <Text style={s.statNum}>{demand.expectedQty}</Text>
                  <Text style={s.statLabel}>Expected Units</Text>
                </View>
                <View style={s.statDiv} />
                <View style={s.statBox}>
                  <Text style={s.statNum}>
                    {demand.preferredPriceMin ? `₹${demand.preferredPriceMin}-${demand.preferredPriceMax}` : 'Open'}
                  </Text>
                  <Text style={s.statLabel}>Target Price</Text>
                </View>
              </View>

              {demand.preferredBrand ? (
                <Text style={s.prefBrand}>Preferred Brand: <Text style={{ fontWeight: '700', color: COLORS.text }}>{demand.preferredBrand}</Text></Text>
              ) : null}

              <View style={s.offersInfo}>
                <Text style={s.offersCount}>
                  {demand.vendorOffers.length} existing bid{demand.vendorOffers.length !== 1 ? 's' : ''}
                </Text>
                <TouchableOpacity
                  style={s.bidBtn}
                  onPress={() => {
                    setSelectedDemand(demand);
                    setMinimumQty(String(demand.expectedQty || 50));
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="flash-outline" size={15} color="#fff" />
                  <Text style={s.bidBtnText}>Submit Bid / Offer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* ── Submit Bid Modal ── */}
        <Modal visible={!!selectedDemand} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle} numberOfLines={1}>Bid on: {selectedDemand?.title}</Text>
                <TouchableOpacity onPress={() => setSelectedDemand(null)}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedDemand && (
                <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 10 }}>
                  <Text style={s.label}>Your Offered Wholesale Price (₹ / unit) *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 540"
                    placeholderTextColor={COLORS.textMuted}
                    value={offeredPrice}
                    onChangeText={setOfferedPrice}
                    keyboardType="numeric"
                  />

                  <Text style={s.label}>Minimum Order Quantity (MOQ) *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="e.g. 100"
                    placeholderTextColor={COLORS.textMuted}
                    value={minimumQty}
                    onChangeText={setMinimumQty}
                    keyboardType="numeric"
                  />

                  <Text style={s.label}>Promised Delivery Date</Text>
                  <TextInput
                    style={s.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    value={deliveryDate}
                    onChangeText={setDeliveryDate}
                  />

                  <Text style={s.label}>Terms / Sourcing Note (Optional)</Text>
                  <TextInput
                    style={[s.input, { height: 64, textAlignVertical: 'top' }]}
                    placeholder="e.g. GI tagged, sorted, freshly milled."
                    placeholderTextColor={COLORS.textMuted}
                    value={terms}
                    onChangeText={setTerms}
                    multiline
                  />

                  <TouchableOpacity
                    style={[s.submitBtn, (!offeredPrice || !minimumQty || submitMutation.isPending) && { opacity: 0.5 }]}
                    onPress={() => submitMutation.mutate()}
                    disabled={!offeredPrice || !minimumQty || submitMutation.isPending}
                    activeOpacity={0.85}
                  >
                    {submitMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Submit Competing Offer</Text>}
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  heroBanner: { backgroundColor: '#EEF2FF', borderRadius: RADIUS.xl, padding: 18, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.primaryLight },
  heroTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  heroSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  emptyTitle: { fontSize: 15, color: COLORS.textMuted },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  catBadge: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  demandTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  upvotePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  upvoteText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  statsGrid: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 10 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  statDiv: { width: 1, height: 24, backgroundColor: COLORS.border },
  prefBrand: { fontSize: 13, color: COLORS.textSecondary },
  offersInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  offersCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  bidBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  bidBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, flex: 1, marginRight: 8 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
