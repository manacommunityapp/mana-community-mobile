import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'DENIED';
type TabKey = 'upcoming' | 'history';

interface VisitorEntry {
  id: number;
  name: string;
  purpose: string;
  vehicleNumber?: string;
  expectedAt: string;
  status: VisitorStatus;
  flat: string;
}

const STATUS_META: Record<VisitorStatus, { label: string; color: string; bg: string }> = {
  EXPECTED:    { label: 'Expected',    color: '#D97706', bg: '#FEF3C7' },
  CHECKED_IN:  { label: 'Inside',      color: '#059669', bg: '#D1FAE5' },
  CHECKED_OUT: { label: 'Left',        color: '#6B7280', bg: '#F3F4F6' },
  DENIED:      { label: 'Denied',      color: '#EF4444', bg: '#FEE2E2' },
};

const SAMPLE_VISITORS: VisitorEntry[] = [
  { id: 1, name: 'Ramesh Kumar',   purpose: 'Plumber - Kitchen repair',  vehicleNumber: 'KA-01-AB-1234', expectedAt: '2026-09-26T10:00:00', status: 'EXPECTED',    flat: 'A1-302' },
  { id: 2, name: 'Swiggy Delivery', purpose: 'Food Delivery',            expectedAt: '2026-09-26T12:30:00', status: 'CHECKED_IN',  flat: 'B2-105' },
  { id: 3, name: 'Priya Sharma',   purpose: 'Guest Visit',               vehicleNumber: 'MH-02-CD-5678', expectedAt: '2026-09-25T15:00:00', status: 'CHECKED_OUT', flat: 'C1-401' },
  { id: 4, name: 'Amazon Delivery', purpose: 'Package Delivery',          expectedAt: '2026-09-26T14:00:00', status: 'EXPECTED',    flat: 'A2-201' },
  { id: 5, name: 'Electrician',    purpose: 'Wiring check',              expectedAt: '2026-09-25T09:00:00', status: 'DENIED',      flat: 'B1-304' },
];

export default function VisitorsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('upcoming');

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goHome(); return true; });
      return () => sub.remove();
    }, [goHome])
  );

  const filtered = tab === 'upcoming'
    ? SAMPLE_VISITORS.filter(v => v.status === 'EXPECTED' || v.status === 'CHECKED_IN')
    : SAMPLE_VISITORS.filter(v => v.status === 'CHECKED_OUT' || v.status === 'DENIED');

  const renderItem = ({ item }: { item: VisitorEntry }) => {
    const meta = STATUS_META[item.status];
    return (
      <View style={s.visitorCard}>
        <View style={s.visitorIcon}>
          <Ionicons
            name={item.purpose.includes('Delivery') ? 'cube-outline' : 'person-outline'}
            size={22}
            color={COLORS.primary}
          />
        </View>
        <View style={s.visitorInfo}>
          <Text style={s.visitorName} numberOfLines={1}>{item.name}</Text>
          <Text style={s.visitorPurpose} numberOfLines={1}>{item.purpose}</Text>
          <View style={s.visitorMeta}>
            <Ionicons name="home-outline" size={11} color={COLORS.textMuted} />
            <Text style={s.metaText}>{item.flat}</Text>
            {item.vehicleNumber && (
              <>
                <Ionicons name="car-outline" size={11} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                <Text style={s.metaText}>{item.vehicleNumber}</Text>
              </>
            )}
          </View>
        </View>
        <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Gate & Visitors</Text>
          <Text style={s.headerSub}>Manage visitor access</Text>
        </View>
        <TouchableOpacity style={s.backBtn} hitSlop={8}>
          <Ionicons name="add-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        {(['upcoming', 'history'] as TabKey[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'upcoming' ? 'Active' : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No visitors</Text>
            <Text style={s.emptyDesc}>Pre-approve visitors to speed up gate entry</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  tabRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt,
  },
  tabBtnActive: { backgroundColor: COLORS.accent },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  list: { padding: 12, gap: 10 },
  visitorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  visitorIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  visitorInfo: { flex: 1, gap: 2 },
  visitorName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  visitorPurpose: { fontSize: 12, color: COLORS.textMuted },
  visitorMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
