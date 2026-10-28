import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  entryLogService,
  EntryLogEntry,
  EntryLogType,
  EntryLogAction,
} from '@/services/entryLogService';

const TYPE_META: Record<EntryLogType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }> = {
  RESIDENT:  { icon: 'person-outline',    color: COLORS.primary, bg: '#EEF2FF', label: 'Resident' },
  VISITOR:   { icon: 'people-outline',    color: '#2563EB',      bg: '#DBEAFE', label: 'Visitor'  },
  VEHICLE:   { icon: 'car-outline',       color: '#7C3AED',      bg: '#F5F3FF', label: 'Vehicle'  },
  STAFF:     { icon: 'briefcase-outline', color: '#059669',      bg: '#D1FAE5', label: 'Staff'    },
  DELIVERY:  { icon: 'cube-outline',      color: '#D97706',      bg: '#FEF3C7', label: 'Delivery' },
};

const ACTION_META: Record<EntryLogAction, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  ENTRY: { icon: 'log-in-outline',  color: '#22C55E', label: 'Entry' },
  EXIT:  { icon: 'log-out-outline', color: '#EF4444', label: 'Exit'  },
};

const VERIFY_META: Record<string, string> = {
  OTP:     '🔢', FACE: '🤳', MANUAL: '✍️', QR: '📱', VEHICLE: '🚘',
};

const FILTERS: Array<{ key: EntryLogType | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'RESIDENT', label: 'Me' },
  { key: 'VISITOR', label: 'Visitors' },
  { key: 'VEHICLE', label: 'Vehicles' },
  { key: 'STAFF', label: 'Staff' },
  { key: 'DELIVERY', label: 'Deliveries' },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function EntryLogScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<EntryLogType | 'ALL'>('ALL');

  const { data: logPage, isLoading, refetch } = useQuery({
    queryKey: ['entry-log', filter],
    queryFn: () => entryLogService.getMyEntryLog(filter !== 'ALL' ? { type: filter } : undefined),
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ['entry-stats'],
    queryFn: () => entryLogService.getStats(),
  });

  const entries = logPage?.content ?? [];

  const renderEntry = ({ item }: { item: EntryLogEntry }) => {
    const type = TYPE_META[item.type];
    const action = ACTION_META[item.action];
    const verifyEmoji = item.verificationMethod ? VERIFY_META[item.verificationMethod] ?? '✅' : '';
    return (
      <View style={styles.logCard}>
        <View style={[styles.typeIcon, { backgroundColor: type.bg }]}>
          <Ionicons name={type.icon} size={20} color={type.color} />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.personName}>{item.personName}</Text>
          <Text style={styles.logDetail}>
            {item.gate}{item.purpose ? ` · ${item.purpose}` : ''}
          </Text>
          {item.vehicleNumber ? (
            <Text style={styles.vehicle}>{item.vehicleNumber}</Text>
          ) : null}
          {item.passCode ? (
            <Text style={styles.passCode}>Pass: {item.passCode}</Text>
          ) : null}
        </View>
        <View style={styles.logRight}>
          <View style={[styles.actionTag, { borderColor: action.color }]}>
            <Ionicons name={action.icon} size={12} color={action.color} />
            <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
          </View>
          <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
          {verifyEmoji ? <Text style={styles.verifyEmoji}>{verifyEmoji}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entry / Exit Log</Text>
      </View>

      {/* Stats row */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={18} color={COLORS.primary} />
            <View>
              <Text style={styles.statNum}>{stats.totalToday}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="person-outline" size={18} color="#22C55E" />
            <View>
              <Text style={styles.statNum}>{stats.currentlyInside}</Text>
              <Text style={styles.statLabel}>Inside</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="people-circle-outline" size={18} color="#D97706" />
            <View>
              <Text style={styles.statNum}>{stats.visitorEntriesToday}</Text>
              <Text style={styles.statLabel}>Visitors</Text>
            </View>
          </View>
        </View>
      )}

      {/* Type filter chips */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={i => i.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, filter === item.key && styles.chipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text style={[styles.chipText, filter === item.key && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={entries}
        keyExtractor={i => String(i.id)}
        renderItem={renderEntry}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No entry records found</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, backgroundColor: THEME.card, borderBottomWidth: 1, borderBottomColor: THEME.border },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: THEME.text, fontFamily: 'DMSans-Bold' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: THEME.border },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: THEME.border },
  statNum: { fontSize: 20, fontWeight: '700', color: THEME.text, fontFamily: 'DMSans-Bold' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  filterWrap: { backgroundColor: THEME.card, borderBottomWidth: 1, borderBottomColor: THEME.border },
  filterList: { paddingHorizontal: SPACING.md, paddingVertical: 10, gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: THEME.background, borderWidth: 1, borderColor: THEME.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500', fontFamily: 'DMSans-Medium' },
  chipTextActive: { color: '#fff', fontWeight: '700', fontFamily: 'DMSans-Bold' },
  list: { padding: SPACING.md, gap: 8 },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, borderRadius: RADIUS.lg, padding: 14, ...SHADOWS.sm },
  typeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logInfo: { flex: 1 },
  personName: { fontSize: 15, fontWeight: '600', color: THEME.text, fontFamily: 'DMSans-SemiBold' },
  logDetail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  vehicle: { fontSize: 11, color: '#7C3AED', marginTop: 2, fontWeight: '500' },
  passCode: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  logRight: { alignItems: 'flex-end', gap: 4 },
  actionTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  actionText: { fontSize: 11, fontWeight: '600' },
  timeText: { fontSize: 11, color: COLORS.textMuted },
  verifyEmoji: { fontSize: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
