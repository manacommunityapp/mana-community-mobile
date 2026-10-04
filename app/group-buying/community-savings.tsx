import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Share, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import CommunitySavingsCard from '@/components/group-buying/CommunitySavingsCard';

export default function CommunitySavingsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { data: savings, isLoading, refetch } = useQuery({
    queryKey: ['community-savings'],
    queryFn: groupBuyingService.getCommunitySavings,
  });
  const onRefresh = useCallback(async () => { setRefreshing(true); await refetch(); setRefreshing(false); }, [refetch]);

  const handleShare = async () => {
    if (!savings) return;
    const amt = savings.totalSavedThisMonth >= 100000 ? 'Rs ' + (savings.totalSavedThisMonth / 100000).toFixed(1) + 'L' : 'Rs ' + savings.totalSavedThisMonth.toLocaleString();
    await Share.share({ message: 'Our community at Mana Residency saved ' + amt + ' this month through Group Buying! ' + savings.totalOrders + ' orders across ' + savings.activeDeals + ' deals. Join us! #ManaCommunity #GroupBuying' });
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}>
      {isLoading || !savings ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          <CommunitySavingsCard data={savings} />
          <View style={s.statsGrid}>
            <StatCard label="Total Orders" value={savings.totalOrders.toLocaleString()} icon="receipt-outline" color="#2563EB" />
            <StatCard label="Active Deals" value={String(savings.activeDeals)} icon="flame-outline" color="#D97706" />
            <StatCard label="Avg Saving" value={'Rs ' + savings.avgSavingPerOrder} icon="trending-down-outline" color="#059669" />
            {savings.totalKgsBought ? <StatCard label="KGs Bought" value={savings.totalKgsBought.toLocaleString()} icon="basket-outline" color="#7C3AED" /> : null}
          </View>
          {savings.totalSavedAllTime ? (
            <View style={s.allTimeCard}>
              <Ionicons name="trophy-outline" size={24} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={s.allTimeLabel}>All-time Community Savings</Text>
                <Text style={s.allTimeAmount}>Rs {savings.totalSavedAllTime.toLocaleString()}</Text>
              </View>
            </View>
          ) : null}
          <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color="#fff" />
            <Text style={s.shareBtnText}>Share Community Achievement</Text>
          </TouchableOpacity>
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>How savings are calculated</Text>
            <Text style={s.infoText}>We compare the community price you paid against the standard market retail price. The difference is your saving per unit, multiplied by your quantity. Community total = sum of all residents' savings.</Text>
          </View>
        </>
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}
function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <View style={ss.card}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[ss.value, { color }]}>{value}</Text>
      <Text style={ss.label}>{label}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  allTimeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF3C7', borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: '#FDE68A' },
  allTimeLabel: { fontSize: 12, color: '#92400E' },
  allTimeAmount: { fontSize: 22, fontWeight: '800', color: '#92400E' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14 },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  infoCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
});
const ss = StyleSheet.create({
  card: { flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
});