import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';
import type { BuyingGroup } from '@/types/groupBuying';

export default function TowerGroupsScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: ['tower-groups'],
    queryFn: groupBuyingService.getBuyingGroups,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const joinMutation = useMutation({
    mutationFn: (groupId: string) => groupBuyingService.joinBuyingGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tower-groups'] });
      Alert.alert('Joined Tower Group!', 'You will now receive notifications when neighbours in your tower coordinate bulk grocery and festival orders.');
    },
  });

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: 'Tower & Block Groups' }} />

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Hero */}
        <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={s.heroBadge}>
            <Ionicons name="business" size={13} color="#FEF3C7" />
            <Text style={s.heroBadgeText}>NEIGHBOURHOOD CLUSTERS</Text>
          </View>
          <Text style={s.heroTitle}>Tower Bulk Buying Circles</Text>
          <Text style={s.heroSub}>
            Coordinate with residents in your specific tower or floor. Pool orders, split bulk packs, and pick up right at your tower lobby.
          </Text>
        </LinearGradient>

        {/* Groups List */}
        <View style={s.section}>
          <Text style={s.sectionHeading}>Active Groups in Mana Residency</Text>

          {isLoading ? (
            <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            groups.map(grp => (
              <View key={grp.id} style={s.groupCard}>
                <View style={s.cardTop}>
                  <View style={s.iconWrap}>
                    <Ionicons name="business-outline" size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.groupName}>{grp.name}</Text>
                    <Text style={s.towerText}>{grp.tower} ? {grp.block}</Text>
                  </View>
                  {grp.isMember && (
                    <View style={s.memberPill}>
                      <Text style={s.memberText}>Joined ?</Text>
                    </View>
                  )}
                </View>

                {grp.description ? <Text style={s.groupDesc}>{grp.description}</Text> : null}

                {/* Leader & Stats */}
                <View style={s.statsRow}>
                  <View style={s.statItem}>
                    <Text style={s.statNum}>{grp.memberCount}</Text>
                    <Text style={s.statLabel}>Neighbours</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statItem}>
                    <Text style={s.statNum}>?{((grp.totalSaved ?? grp.totalSavings ?? 0) / 1000).toFixed(1)}k</Text>
                    <Text style={s.statLabel}>Total Saved</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statItem}>
                    <Text style={s.statNum}>{grp.activeDealsCount}</Text>
                    <Text style={s.statLabel}>Active Deals</Text>
                  </View>
                </View>

                {/* Coordinator */}
                <View style={s.leaderRow}>
                  <Ionicons name="person-circle-outline" size={16} color={COLORS.textMuted} />
                  <Text style={s.leaderText}>
                    Coordinated by <Text style={s.bold}>{grp.leaderName}</Text> ({grp.leaderFlat})
                  </Text>
                </View>

                {/* Join Button */}
                {!grp.isMember ? (
                  <TouchableOpacity
                    style={s.joinBtn}
                    onPress={() => joinMutation.mutate(grp.id)}
                    disabled={joinMutation.isPending}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                    <Text style={s.joinBtnText}>Join {grp.tower} Circle</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  center: { alignItems: 'center', padding: 40 },
  hero: { padding: 20, gap: 10 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', lineHeight: 28 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  section: { marginHorizontal: 14, marginTop: 14, gap: 12 },
  sectionHeading: { fontSize: 13, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  towerText: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  memberPill: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  memberText: { fontSize: 11, fontWeight: '800', color: '#166534' },
  groupDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
  },
  statItem: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  statDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaderText: { fontSize: 12, color: COLORS.textMuted },
  bold: { fontWeight: '700', color: COLORS.text },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
  },
  joinBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
