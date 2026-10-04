import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import type { BuyingGroup } from '@/types/groupBuying';

export default function TowerGroupsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['tower-groups'],
    queryFn: groupBuyingService.getBuyingGroups,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const joinMutation = useMutation({
    mutationFn: (groupId: string) => groupBuyingService.joinBuyingGroup(groupId),
    onSuccess: () => {
      Alert.alert('Joined Group!', 'You are now part of your building tower buying collective.');
      queryClient.invalidateQueries({ queryKey: ['tower-groups'] });
    },
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Tower Buying Groups', headerBackTitle: 'Back' }} />
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        <View style={s.heroBanner}>
          <Ionicons name="business-outline" size={32} color={COLORS.primary} />
          <Text style={s.heroTitle}>Tower & Wing Bulk Hubs</Text>
          <Text style={s.heroSub}>
            Coordinate deliveries with neighbors in your specific tower. One lobby drop point, coordinated schedules, and shared bulk deliveries.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Available Tower Groups ({groups.length})</Text>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          groups.map(group => (
            <View key={group.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.towerBadge}>
                  <Ionicons name="business" size={16} color={COLORS.primary} />
                  <Text style={s.towerBadgeText}>{group.tower}</Text>
                </View>
                {group.isMember ? (
                  <View style={s.memberBadge}><Text style={s.memberBadgeText}>Member ✓</Text></View>
                ) : null}
              </View>

              <Text style={s.groupName}>{group.name}</Text>
              <Text style={s.groupDesc}>{group.description}</Text>

              <View style={s.leaderRow}>
                <Ionicons name="person-circle-outline" size={16} color={COLORS.textMuted} />
                <Text style={s.leaderText}>Coordinated by <Text style={{ fontWeight: '700', color: COLORS.text }}>{group.leaderName}</Text> ({group.leaderFlat})</Text>
              </View>

              <View style={s.statsRow}>
                <View style={s.statBox}>
                  <Text style={s.statNum}>{group.memberCount}</Text>
                  <Text style={s.statLabel}>Flats</Text>
                </View>
                <View style={s.statDiv} />
                <View style={s.statBox}>
                  <Text style={s.statNum}>₹{(group.totalSaved / 1000).toFixed(0)}K</Text>
                  <Text style={s.statLabel}>Saved</Text>
                </View>
                <View style={s.statDiv} />
                <View style={s.statBox}>
                  <Text style={s.statNum}>{group.activeDealsCount}</Text>
                  <Text style={s.statLabel}>Active Deals</Text>
                </View>
              </View>

              {!group.isMember ? (
                <TouchableOpacity
                  style={s.joinBtn}
                  onPress={() => joinMutation.mutate(group.id)}
                  disabled={joinMutation.isPending}
                  activeOpacity={0.85}
                >
                  <Ionicons name="person-add-outline" size={15} color="#fff" />
                  <Text style={s.joinBtnText}>Join {group.tower} Collective</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.viewDealsBtn}
                  onPress={() => router.push('/group-buying' as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cart-outline" size={15} color={COLORS.primary} />
                  <Text style={s.viewDealsBtnText}>Browse Tower Active Deals</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: SPACING.md },
  heroBanner: { backgroundColor: '#F0FDF4', borderRadius: RADIUS.xl, padding: 18, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#86EFAC' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#166534' },
  heroSub: { fontSize: 13, color: '#15803D', textAlign: 'center', lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 60 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  towerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  towerBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  memberBadge: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  memberBadgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  groupName: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  groupDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaderText: { fontSize: 12, color: COLORS.textMuted },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: 10, marginTop: 2 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  statDiv: { width: 1, height: 24, backgroundColor: COLORS.border },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, marginTop: 4 },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  viewDealsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 10, marginTop: 4 },
  viewDealsBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
