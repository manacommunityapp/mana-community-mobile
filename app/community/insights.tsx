import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { insightsService, CommunityInsight, MetricsSnapshot, InsightSeverity } from '@/services/insightsService';

const SEVERITY_COLOR: Record<InsightSeverity, string> = {
  CRITICAL: '#EF4444',
  ALERT:    '#F97316',
  WARNING:  '#F59E0B',
  INFO:     '#3B82F6',
};

const SEVERITY_ORDER: InsightSeverity[] = ['CRITICAL', 'ALERT', 'WARNING', 'INFO'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function KpiTile({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <View style={styles.kpiTile}>
      <Text style={[styles.kpiValue, color ? { color } : undefined]}>{value}{unit}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function InsightCard({ item }: { item: CommunityInsight }) {
  const color = SEVERITY_COLOR[item.severity] ?? '#6B7280';
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={[styles.severityChip, { backgroundColor: color + '20', color }]}>
          {item.severity}
        </Text>
      </View>
      <Text style={styles.cardDesc}>{item.description}</Text>
      {item.recommendation ? (
        <Text style={styles.cardRec}>💡 {item.recommendation}</Text>
      ) : null}
      <Text style={styles.timeAgo}>{timeAgo(item.generatedAt)}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<CommunityInsight[]>([]);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);

  // TODO: replace with useAuth/communityId hook when available
  const communityId = 1;

  const load = useCallback(async () => {
    try {
      const [ins, met] = await Promise.all([
        insightsService.getActiveInsights(communityId),
        insightsService.getLatestMetrics(communityId),
      ]);
      const sorted = [...ins].sort(
        (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
      );
      setInsights(sorted);
      setMetrics(met);
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communityId]);

  useEffect(() => { load(); }, [load]);

  const actionableInsights = insights.filter((i) => i.severity !== 'INFO');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Community Health</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366F1" />
      ) : (
        <FlatList
          data={insights}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            <>
              {/* KPI tiles */}
              <View style={styles.kpiRow}>
                <KpiTile
                  label="Collection Rate"
                  value={metrics ? Math.round(metrics.collectionRate) : '—'}
                  unit="%"
                  color={metrics && metrics.collectionRate >= 85 ? '#10B981' : '#F59E0B'}
                />
                <KpiTile
                  label="Open Issues"
                  value={metrics?.openComplaints ?? '—'}
                  color={metrics && metrics.openComplaints <= 5 ? '#10B981' : '#EF4444'}
                />
                <KpiTile
                  label="Active Residents"
                  value={metrics ? Math.round(metrics.activeResidentsPct) : '—'}
                  unit="%"
                  color="#3B82F6"
                />
              </View>

              {/* All-clear banner */}
              {actionableInsights.length === 0 && (
                <View style={styles.allClear}>
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  <Text style={styles.allClearText}>Your community is healthy 🌱</Text>
                </View>
              )}

              {insights.length > 0 && (
                <Text style={styles.sectionHeader}>Active Insights</Text>
              )}
            </>
          }
          renderItem={({ item }) => <InsightCard item={item} />}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.emptyText}>Your community is healthy 🌱</Text>
              <Text style={styles.emptySubtext}>No active insights at this time.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 17, fontWeight: '700', color: '#111827' },
  kpiRow: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 12, padding: 16, gap: 8 },
  kpiTile: { flex: 1, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  kpiLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  allClear: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, gap: 10 },
  allClearText: { fontSize: 15, fontWeight: '600', color: '#065F46' },
  sectionHeader: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginHorizontal: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 10, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  severityChip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginLeft: 8 },
  cardDesc: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 6 },
  cardRec: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginBottom: 6 },
  timeAgo: { fontSize: 11, color: '#9CA3AF' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});
