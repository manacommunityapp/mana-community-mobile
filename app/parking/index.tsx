import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

type ParkingFilter = 'MY_SPOTS' | 'AVAILABLE' | 'VIOLATIONS';

interface ParkingSpot {
  id: number;
  spotNumber: string;
  level: string;
  type: 'CAR' | 'BIKE' | 'EV';
  status: 'OCCUPIED' | 'AVAILABLE' | 'RESERVED';
  vehicleNumber?: string;
  ownerName?: string;
  ownerFlat?: string;
}

const TYPE_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  CAR:  { icon: 'car',            color: '#2563EB', bg: '#DBEAFE' },
  BIKE: { icon: 'bicycle',        color: '#7C3AED', bg: '#EDE9FE' },
  EV:   { icon: 'flash',          color: '#059669', bg: '#D1FAE5' },
};

const SAMPLE_SPOTS: ParkingSpot[] = [
  { id: 1, spotNumber: 'B1-P12', level: 'Basement 1', type: 'CAR',  status: 'OCCUPIED', vehicleNumber: 'KA-01-AB-1234', ownerName: 'You', ownerFlat: 'A1-302' },
  { id: 2, spotNumber: 'B1-P13', level: 'Basement 1', type: 'BIKE', status: 'OCCUPIED', vehicleNumber: 'KA-01-CD-5678', ownerName: 'You', ownerFlat: 'A1-302' },
  { id: 3, spotNumber: 'B2-P05', level: 'Basement 2', type: 'CAR',  status: 'AVAILABLE' },
  { id: 4, spotNumber: 'B1-EV3', level: 'Basement 1', type: 'EV',   status: 'RESERVED', ownerName: 'Rahul K.', ownerFlat: 'B2-201' },
  { id: 5, spotNumber: 'B2-P22', level: 'Basement 2', type: 'CAR',  status: 'AVAILABLE' },
  { id: 6, spotNumber: 'B1-P08', level: 'Basement 1', type: 'BIKE', status: 'AVAILABLE' },
];

export default function ParkingScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<ParkingFilter>('MY_SPOTS');

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

  const filtered = filter === 'MY_SPOTS'
    ? SAMPLE_SPOTS.filter(s => s.ownerName === 'You')
    : filter === 'AVAILABLE'
    ? SAMPLE_SPOTS.filter(s => s.status === 'AVAILABLE')
    : [];

  const renderItem = ({ item }: { item: ParkingSpot }) => {
    const meta = TYPE_ICON[item.type];
    return (
      <View style={st.spotCard}>
        <View style={[st.spotIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={st.spotInfo}>
          <Text style={st.spotNumber}>{item.spotNumber}</Text>
          <Text style={st.spotLevel}>{item.level} • {item.type}</Text>
          {item.vehicleNumber && (
            <View style={st.vehicleRow}>
              <Ionicons name="car-outline" size={11} color={COLORS.textMuted} />
              <Text style={st.vehicleText}>{item.vehicleNumber}</Text>
            </View>
          )}
        </View>
        <View style={[
          st.statusPill,
          item.status === 'AVAILABLE' ? { backgroundColor: '#D1FAE5' } :
          item.status === 'RESERVED' ? { backgroundColor: '#FEF3C7' } :
          { backgroundColor: COLORS.surfaceAlt },
        ]}>
          <Text style={[
            st.statusPillText,
            item.status === 'AVAILABLE' ? { color: '#059669' } :
            item.status === 'RESERVED' ? { color: '#D97706' } :
            { color: COLORS.textMuted },
          ]}>
            {item.status === 'OCCUPIED' ? 'In Use' : item.status === 'AVAILABLE' ? 'Free' : 'Reserved'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity onPress={goHome} style={st.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Parking</Text>
          <Text style={st.headerSub}>Manage your parking spots</Text>
        </View>
        <TouchableOpacity style={st.backBtn} hitSlop={8}>
          <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.filterRow} style={st.filterScroll}
      >
        {([
          { key: 'MY_SPOTS' as ParkingFilter, label: 'My Spots', icon: 'key-outline' as keyof typeof Ionicons.glyphMap },
          { key: 'AVAILABLE' as ParkingFilter, label: 'Available', icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap },
          { key: 'VIOLATIONS' as ParkingFilter, label: 'Violations', icon: 'warning-outline' as keyof typeof Ionicons.glyphMap },
        ]).map(f => (
          <TouchableOpacity
            key={f.key}
            style={[st.filterChip, filter === f.key && st.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons name={f.icon} size={14} color={filter === f.key ? '#fff' : COLORS.textMuted} />
            <Text style={[st.filterText, filter === f.key && st.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={st.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="car-outline" size={48} color={COLORS.textMuted} />
            <Text style={st.emptyTitle}>No spots to show</Text>
            <Text style={st.emptyDesc}>
              {filter === 'VIOLATIONS' ? 'No violations reported — great job!' : 'No parking spots found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
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
  filterScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  filterChipActive: { backgroundColor: COLORS.accent },
  filterText: { fontSize: 13, fontWeight: '500', color: COLORS.textMuted },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 12, gap: 10 },
  spotCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  spotIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  spotInfo: { flex: 1, gap: 2 },
  spotNumber: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  spotLevel: { fontSize: 12, color: COLORS.textMuted },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  vehicleText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  statusPill: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
