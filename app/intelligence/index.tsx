import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { manaIntelligenceService } from '@/services/manaIntelligenceService';
import { RecommendationCard } from '@/types/manaIntelligence';

export default function ManaIntelligenceFeed() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mana-intelligence-feed'],
    queryFn: manaIntelligenceService.getPersonalizedFeed,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'GROUP_BUY_DEAL':
        return '#EF4444';
      case 'COMMUNITY_SERVICE':
        return '#6366F1';
      case 'SKILL_MATCH':
        return '#10B981';
      case 'NEIGHBORHOOD_EVENT':
        return '#F59E0B';
      default:
        return COLORS.primary;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'GROUP_BUY_DEAL':
        return 'flame-outline';
      case 'COMMUNITY_SERVICE':
        return 'construct-outline';
      case 'SKILL_MATCH':
        return 'people-outline';
      case 'NEIGHBORHOOD_EVENT':
        return 'calendar-outline';
      default:
        return 'sparkles-outline';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Header Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerBadge}>
          <Ionicons name="sparkles" size={12} color="#FBBF24" />
          <Text style={styles.bannerBadgeText}>Mana Intelligence Layer</Text>
        </View>
        <Text style={styles.bannerTitle}>For You in Your Community</Text>
        <Text style={styles.bannerSub}>Ranked with zero-leakage privacy enforcement</Text>

        <TouchableOpacity
          style={styles.discoverBtn}
          onPress={() => router.push('/intelligence/discover' as any)}
        >
          <Ionicons name="compass-outline" size={16} color="#FFFFFF" />
          <Text style={styles.discoverBtnText}>Discover Neighbors & Skills</Text>
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      <View style={styles.content}>
        <Text style={styles.sectionHeader}>Recommended Feed</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : !data || data.recommendations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={36} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Recommendations Yet</Text>
            <Text style={styles.emptySub}>Interact with deals, events, and neighbors to personalize your feed.</Text>
          </View>
        ) : (
          data.recommendations.map((rec: RecommendationCard) => (
            <View key={rec.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: getBadgeColor(rec.type) + '15' }]}>
                  <Ionicons name={getIcon(rec.type) as any} size={12} color={getBadgeColor(rec.type)} />
                  <Text style={[styles.typeText, { color: getBadgeColor(rec.type) }]}>
                    {rec.badge || rec.type.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={styles.scoreText}>{Math.round(rec.score * 100)}% match</Text>
              </View>

              <Text style={styles.cardTitle}>{rec.title}</Text>
              <Text style={styles.cardSubtitle}>{rec.subtitle}</Text>

              {rec.reason && (
                <View style={styles.reasonRow}>
                  <Ionicons name="bulb-outline" size={12} color="#64748B" />
                  <Text style={styles.reasonText}>{rec.reason}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(rec.targetRoute as any)}
              >
                <Text style={styles.actionBtnText}>{rec.actionLabel}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  banner: {
    backgroundColor: '#312E81',
    padding: SPACING.lg,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerBadgeText: { color: '#E0E7FF', fontSize: 11, fontWeight: '700' },
  bannerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#C7D2FE', fontSize: 12, marginTop: 2, marginBottom: 12 },
  discoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  discoverBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  content: { padding: SPACING.md },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: SPACING.sm },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  typeText: { fontSize: 10, fontWeight: '700' },
  scoreText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#475569', marginBottom: 8 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', padding: 6, borderRadius: RADIUS.sm, marginBottom: 12 },
  reasonText: { fontSize: 11, color: '#475569', flex: 1 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyCard: { alignItems: 'center', padding: SPACING.xl, marginTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 8 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, maxWidth: 260 },
});
