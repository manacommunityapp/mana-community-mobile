import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityOpsService, OpsControlRoomSummary } from '@/services/communityOpsService';

interface Tile {
  label: string;
  key: keyof OpsControlRoomSummary;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  alertIfPositive?: boolean;
}

const TILES: Tile[] = [
  { label: 'Staff On Duty',       key: 'staffOnDuty',              icon: 'people-outline',       color: '#2563EB', route: '/ops/attendance' },
  { label: 'Pending Parcels',     key: 'pendingParcels',           icon: 'cube-outline',          color: '#D97706', route: '/ops/parcels',     alertIfPositive: true },
  { label: "Today's Visitors",    key: 'todayVisitors',            icon: 'walk-outline',          color: '#059669', route: '/visitors' },
  { label: 'Overdue Tasks',       key: 'overdueMaintenanceTasks',  icon: 'warning-outline',       color: '#DC2626', route: '/helpdesk',        alertIfPositive: true },
  { label: 'Upcoming Maintenance',key: 'upcomingMaintenance',      icon: 'construct-outline',     color: '#7C3AED', route: '/helpdesk' },
  { label: 'Move Requests',       key: 'pendingMoveRequests',      icon: 'swap-horizontal-outline',color: '#0891B2', route: '/ops/move-request',alertIfPositive: true },
];

export default function OpsControlRoom() {
  const router = useRouter();
  const [summary, setSummary] = useState<OpsControlRoomSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await communityOpsService.getControlRoomSummary();
      setSummary(data);
    } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Text style={styles.title}>Operations Control Room</Text>
        <Text style={styles.subtitle}>Live community dashboard</Text>

        <View style={styles.grid}>
          {TILES.map(tile => {
            const val = summary?.[tile.key] ?? 0;
            const isAlert = tile.alertIfPositive && val > 0;
            return (
              <TouchableOpacity
                key={tile.key}
                style={[styles.tile, isAlert && styles.tileAlert]}
                onPress={() => router.push(tile.route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrap, { backgroundColor: isAlert ? '#FEE2E2' : `${tile.color}18` }]}>
                  <Ionicons name={tile.icon} size={26} color={isAlert ? '#DC2626' : tile.color} />
                </View>
                <Text style={[styles.tileValue, { color: isAlert ? '#DC2626' : tile.color }]}>{val}</Text>
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          {[
            { label: 'Digital Passes', icon: 'qr-code-outline' as const, route: '/ops/passes' },
            { label: 'Watchlist Check', icon: 'shield-checkmark-outline' as const, route: '/ops/watchlist-check' },
            { label: 'Attendance', icon: 'finger-print-outline' as const, route: '/ops/attendance' },
          ].map(a => (
            <TouchableOpacity
              key={a.route}
              style={styles.actionBtn}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <Ionicons name={a.icon} size={22} color="#2563EB" />
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 3,
  },
  tileAlert: { backgroundColor: '#FFF5F5' },
  iconWrap: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  tileValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  tileLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 28, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, backgroundColor: '#EFF6FF', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', gap: 6,
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#2563EB', textAlign: 'center' },
});
