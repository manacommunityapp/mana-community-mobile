import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';
import type {
  KittyPartyCircleLeaderboardResponse,
  KittyPartyLeaderboardEntry,
} from '@/types/kittyPartyTypes';

export default function KittyPartyLeaderboardScreen() {
  const { id: paramId, circleId: paramCircleId } = useLocalSearchParams<{ id?: string; circleId?: string }>();
  const router = useRouter();
  const circleId = Number(paramId || paramCircleId || 0);

  const [data, setData] = useState<KittyPartyCircleLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await kittyPartyService.getLeaderboard(circleId);
      setData(res);
    } catch (err) {
      console.error('Failed to load mobile leaderboard', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (circleId) {
      fetchLeaderboard();
    }
  }, [circleId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>Loading Housie champions...</Text>
      </View>
    );
  }

  const entries = data?.entries || [];
  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D97706']} />}
    >
      {/* Header Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>🏆 HOUSIE & GAMES LEADERBOARD</Text>
        </View>
        <Text style={styles.bannerTitle}>{data?.circleName || 'Social Circle'} Champions</Text>
        <Text style={styles.bannerSubtitle}>
          Resident rankings based on Tambola games played, patterns claimed, and non-cash trophies.
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{data?.totalGamesInCircle || 0}</Text>
            <Text style={styles.statLabel}>Total Matches</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{entries.length}</Text>
            <Text style={styles.statLabel}>Players Ranked</Text>
          </View>
        </View>
      </View>

      {/* Top 3 Podium */}
      {entries.length >= 2 && (
        <View style={styles.podiumContainer}>
          {top2 && (
            <View style={[styles.podiumCol, styles.podiumCol2]}>
              <Text style={styles.medalEmoji}>🥈</Text>
              <Text style={styles.podiumName} numberOfLines={1}>{top2.userName}</Text>
              {top2.flatDetails && <Text style={styles.podiumFlat}>{top2.flatDetails}</Text>}
              <View style={styles.podiumScoreBadge}>
                <Text style={styles.podiumScoreText}>{top2.totalPoints} pts</Text>
              </View>
              <Text style={styles.podiumWinsText}>{top2.totalWins} Wins</Text>
            </View>
          )}

          {top1 && (
            <View style={[styles.podiumCol, styles.podiumCol1]}>
              <Text style={styles.crownEmoji}>👑</Text>
              <Text style={styles.podiumName1} numberOfLines={1}>{top1.userName}</Text>
              {top1.flatDetails && <Text style={styles.podiumFlat1}>{top1.flatDetails}</Text>}
              <View style={[styles.podiumScoreBadge, styles.podiumScoreBadge1]}>
                <Text style={styles.podiumScoreText1}>{top1.totalPoints} pts</Text>
              </View>
              <Text style={styles.podiumWinsText1}>{top1.totalWins} Wins</Text>
            </View>
          )}

          {top3 && (
            <View style={[styles.podiumCol, styles.podiumCol3]}>
              <Text style={styles.medalEmoji}>🥉</Text>
              <Text style={styles.podiumName} numberOfLines={1}>{top3.userName}</Text>
              {top3.flatDetails && <Text style={styles.podiumFlat}>{top3.flatDetails}</Text>}
              <View style={styles.podiumScoreBadge}>
                <Text style={styles.podiumScoreText}>{top3.totalPoints} pts</Text>
              </View>
              <Text style={styles.podiumWinsText}>{top3.totalWins} Wins</Text>
            </View>
          )}
        </View>
      )}

      {/* Rankings List */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Full Community Rankings</Text>
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎲</Text>
            <Text style={styles.emptyTitle}>No games played yet</Text>
            <Text style={styles.emptySubtitle}>
              Join or host a Housie game in this circle to rank up on the leaderboard!
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View key={entry.userId} style={styles.rankRow}>
              <View style={styles.rankNumCol}>
                {entry.rank === 1 ? (
                  <Text style={styles.rankMedal}>🥇</Text>
                ) : entry.rank === 2 ? (
                  <Text style={styles.rankMedal}>🥈</Text>
                ) : entry.rank === 3 ? (
                  <Text style={styles.rankMedal}>🥉</Text>
                ) : (
                  <Text style={styles.rankNumText}>#{entry.rank}</Text>
                )}
              </View>

              <View style={styles.rankInfoCol}>
                <Text style={styles.rankNameText}>{entry.userName}</Text>
                {entry.flatDetails && <Text style={styles.rankFlatText}>{entry.flatDetails}</Text>}
                <View style={styles.badgesWrapper}>
                  {entry.badges?.map((badge, idx) => (
                    <View key={idx} style={styles.badgeChip}>
                      <Text style={styles.badgeChipText}>{badge}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.rankScoreCol}>
                <Text style={styles.rankScoreText}>{entry.totalPoints}</Text>
                <Text style={styles.rankScoreSub}>{entry.totalWins} wins</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  contentContainer: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B', fontWeight: '500' },
  bannerCard: {
    backgroundColor: '#D97706',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#D97706',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgePillText: { color: '#FEF3C7', fontSize: 11, fontWeight: '800' },
  bannerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  bannerSubtitle: { color: '#FEF3C7', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  statVal: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#FEF3C7', fontSize: 11, fontWeight: '600' },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  podiumCol: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  podiumCol1: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 2,
    paddingVertical: 16,
    shadowOpacity: 0.1,
  },
  podiumCol2: {},
  podiumCol3: {},
  crownEmoji: { fontSize: 32, marginBottom: 4 },
  medalEmoji: { fontSize: 26, marginBottom: 4 },
  podiumName: { fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  podiumName1: { fontSize: 15, fontWeight: '800', color: '#78350F', textAlign: 'center' },
  podiumFlat: { fontSize: 10, color: '#64748B', marginTop: 2 },
  podiumFlat1: { fontSize: 11, color: '#92400E', fontWeight: '600', marginTop: 2 },
  podiumScoreBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  podiumScoreBadge1: { backgroundColor: '#F59E0B' },
  podiumScoreText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  podiumScoreText1: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  podiumWinsText: { fontSize: 10, color: '#64748B', marginTop: 4 },
  podiumWinsText1: { fontSize: 11, color: '#92400E', fontWeight: '700', marginTop: 4 },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#334155' },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, maxWidth: 240 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rankNumCol: { width: 36, alignItems: 'center' },
  rankMedal: { fontSize: 20 },
  rankNumText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  rankInfoCol: { flex: 1, marginLeft: 8 },
  rankNameText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  rankFlatText: { fontSize: 11, color: '#64748B', marginTop: 1 },
  badgesWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  badgeChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeChipText: { fontSize: 9, fontWeight: '700', color: '#92400E' },
  rankScoreCol: { alignItems: 'flex-end', marginLeft: 8 },
  rankScoreText: { fontSize: 16, fontWeight: '900', color: '#4F46E5' },
  rankScoreSub: { fontSize: 10, color: '#64748B', marginTop: 1 },
});
