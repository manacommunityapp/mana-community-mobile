import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { groupBuyingService } from '../../services/groupBuyingService';
import { CommunitySavings } from '../../types/groupBuying';

export default function CommunitySavingsScreen() {
  const [savings, setSavings] = useState<CommunitySavings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavings();
  }, []);

  const loadSavings = async () => {
    try {
      const data = await groupBuyingService.getCommunitySavings();
      setSavings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !savings) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const bp = savings.monthlyBuyingPower;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Community Buying Power',
          headerBackTitle: 'Group Buy',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Hero Milestone Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.trophyCircle}>
            <MaterialCommunityIcons name="trophy-award" size={36} color="#f59e0b" />
          </View>
          <Text style={styles.heroTitle}>Collective Milestone</Text>
          <Text style={styles.heroMilestoneText}>{bp.heroMilestoneText}</Text>
          <View style={styles.discountPill}>
            <Ionicons name="trending-down" size={16} color="#059669" />
            <Text style={styles.discountPillText}>
              {bp.collectiveDiscountPercent}% Avg Discount vs Retail
            </Text>
          </View>
        </View>

        {/* Monthly Buying Power Grid */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Month's Buying Power</Text>
            <Text style={styles.monthBadge}>October 2026</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>₹{bp.totalSaved.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Saved This Month</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{bp.totalOrders.toLocaleString('en-IN')}</Text>
              <Text style={styles.statLabel}>Orders Placed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{bp.activeDeals}</Text>
              <Text style={styles.statLabel}>Active Deals</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{bp.totalKgBought.toLocaleString('en-IN')} KG</Text>
              <Text style={styles.statLabel}>Produce & Essentials</Text>
            </View>
          </View>

          <View style={styles.highlightRow}>
            <View style={styles.highlightItem}>
              <Ionicons name="receipt-outline" size={18} color="#059669" />
              <Text style={styles.highlightText}>
                Avg Saving: <Text style={styles.boldText}>₹{bp.avgSavingPerOrder} / order</Text>
              </Text>
            </View>
            <View style={styles.highlightItem}>
              <Ionicons name="basket-outline" size={18} color="#0284c7" />
              <Text style={styles.highlightText}>
                Top Category: <Text style={styles.boldText}>{bp.topSavingCategory}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Top Deals This Month */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Value Deals This Month</Text>
          {savings.topDealsThisMonth.map((deal, idx) => (
            <View key={idx} style={styles.dealRow}>
              <View style={styles.dealRank}>
                <Text style={styles.dealRankText}>#{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dealName}>{deal.dealTitle}</Text>
                <Text style={styles.dealParticipants}>{deal.participants} residents joined</Text>
              </View>
              <View style={styles.dealSavings}>
                <Text style={styles.dealSavingsAmount}>+₹{deal.savings.toLocaleString('en-IN')}</Text>
                <Text style={styles.dealSavingsLabel}>Saved</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tower Leaderboard */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tower Participation Leaderboard</Text>
          {savings.towerLeaderboard.map((t, idx) => (
            <View key={idx} style={styles.towerRow}>
              <View style={styles.towerBadge}>
                <Ionicons name="business" size={16} color="#059669" />
                <Text style={styles.towerName}>{t.tower}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.towerOrders}>{t.orders} orders</Text>
              </View>
              <Text style={styles.towerSaved}>₹{t.totalSaved.toLocaleString('en-IN')}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroBanner: {
    backgroundColor: '#064e3b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#047857',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 13, fontWeight: '700', color: '#a7f3d0', textTransform: 'uppercase', letterSpacing: 1 },
  heroMilestoneText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 26,
  },
  discountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 14,
    gap: 6,
  },
  discountPillText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  monthBadge: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: {
    flexBasis: '48%',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#059669' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  highlightRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  highlightItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  highlightText: { fontSize: 12, color: '#475569' },
  boldText: { fontWeight: '700', color: '#0f172a' },
  dealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  dealRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealRankText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  dealName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  dealParticipants: { fontSize: 11, color: '#64748b', marginTop: 2 },
  dealSavings: { alignItems: 'flex-end' },
  dealSavingsAmount: { fontSize: 14, fontWeight: '800', color: '#059669' },
  dealSavingsLabel: { fontSize: 10, color: '#64748b' },
  towerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  towerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  towerName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  towerOrders: { fontSize: 12, color: '#64748b' },
  towerSaved: { fontSize: 13, fontWeight: '800', color: '#059669' },
});
