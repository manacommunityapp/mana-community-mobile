import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { COLORS, SPACING } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import MonthlyBasketCard from '@/components/group-buying/MonthlyBasketCard';

export default function Baskets() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: baskets = [], isLoading, refetch } = useQuery({
    queryKey: ['monthly-baskets'],
    queryFn: groupBuyingService.getMonthlyBaskets,
  });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);
  const joinMutation = useMutation({
    mutationFn: (basketId: string) => groupBuyingService.joinBasket(basketId),
    onSuccess: () => Alert.alert('Success!', 'You have joined the basket. Pickup details will be shared closer to delivery date.'),
    onError: () => Alert.alert('Error', 'Could not join basket. Try again.'),
  });
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
      <View style={s.headerBox}>
        <Text style={s.headerTitle}>📦 Monthly Family Baskets</Text>
        <Text style={s.headerSub}>Curated monthly essentials at group prices. No shopping stress every month.</Text>
      </View>
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : baskets.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>No baskets available</Text>
          <Text style={s.emptySub}>Monthly baskets are published at the start of each month.</Text>
        </View>
      ) : (
        baskets.map(basket => (
          <MonthlyBasketCard key={basket.id} basket={basket} onJoin={() => joinMutation.mutate(basket.id)} />
        ))
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  headerBox: { backgroundColor: '#F0FDF4', borderRadius: 16, padding: 20, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#86EFAC' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#166534' },
  headerSub: { fontSize: 13, color: '#15803D', textAlign: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});