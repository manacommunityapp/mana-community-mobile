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

type FacilityCategory = 'ALL' | 'CLUBHOUSE' | 'GYM' | 'POOL' | 'PARTY_HALL' | 'COURT';

const CATEGORIES: { value: FacilityCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ALL',        label: 'All',          icon: 'grid-outline' },
  { value: 'CLUBHOUSE',  label: 'Clubhouse',    icon: 'home-outline' },
  { value: 'GYM',        label: 'Gym',          icon: 'barbell-outline' },
  { value: 'POOL',       label: 'Pool',         icon: 'water-outline' },
  { value: 'PARTY_HALL', label: 'Party Hall',   icon: 'musical-notes-outline' },
  { value: 'COURT',      label: 'Courts',       icon: 'tennisball-outline' },
];

interface Facility {
  id: number;
  name: string;
  category: FacilityCategory;
  location: string;
  capacity: number;
  pricePerHour: number;
  availableSlots: number;
  rating: number;
  amenities: string[];
}

const SAMPLE_FACILITIES: Facility[] = [
  { id: 1, name: 'Main Clubhouse',      category: 'CLUBHOUSE',  location: 'Block A, Ground Floor', capacity: 50, pricePerHour: 500, availableSlots: 3, rating: 4.5, amenities: ['AC', 'Sound System', 'Kitchen'] },
  { id: 2, name: 'Fitness Center',      category: 'GYM',        location: 'Block B, Basement',     capacity: 20, pricePerHour: 0,   availableSlots: 8, rating: 4.7, amenities: ['Treadmill', 'Weights', 'Trainer'] },
  { id: 3, name: 'Swimming Pool',       category: 'POOL',       location: 'Central Area',          capacity: 30, pricePerHour: 200, availableSlots: 5, rating: 4.8, amenities: ['Changing Room', 'Lockers', 'Lifeguard'] },
  { id: 4, name: 'Grand Party Hall',    category: 'PARTY_HALL', location: 'Block C, Terrace',       capacity: 100, pricePerHour: 2000, availableSlots: 1, rating: 4.6, amenities: ['Stage', 'AC', 'Catering', 'Parking'] },
  { id: 5, name: 'Badminton Court',     category: 'COURT',      location: 'Sports Complex',         capacity: 4,  pricePerHour: 150, availableSlots: 4, rating: 4.4, amenities: ['Floodlights', 'Equipment'] },
  { id: 6, name: 'Tennis Court',        category: 'COURT',      location: 'Sports Complex',         capacity: 4,  pricePerHour: 200, availableSlots: 2, rating: 4.3, amenities: ['Floodlights', 'Equipment', 'Coaching'] },
];

export default function FacilitiesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FacilityCategory>('ALL');

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

  const filtered = filter === 'ALL' ? SAMPLE_FACILITIES : SAMPLE_FACILITIES.filter(f => f.category === filter);

  const renderItem = ({ item }: { item: Facility }) => (
    <View style={s.facilityCard}>
      <View style={s.facilityImagePlaceholder}>
        <Ionicons
          name={CATEGORIES.find(c => c.value === item.category)?.icon || 'business-outline'}
          size={32}
          color={COLORS.primary}
        />
        {item.pricePerHour === 0 && (
          <View style={s.freeBadge}>
            <Text style={s.freeBadgeText}>FREE</Text>
          </View>
        )}
      </View>
      <View style={s.facilityInfo}>
        <Text style={s.facilityName} numberOfLines={1}>{item.name}</Text>
        <View style={s.locationRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.locationText}>{item.location}</Text>
        </View>
        <View style={s.amenityRow}>
          {item.amenities.slice(0, 3).map(a => (
            <View key={a} style={s.amenityChip}>
              <Text style={s.amenityText}>{a}</Text>
            </View>
          ))}
        </View>
        <View style={s.facilityFooter}>
          {item.pricePerHour > 0 && (
            <Text style={s.price}>{'₹'}{item.pricePerHour}/hr</Text>
          )}
          <View style={s.slotBadge}>
            <Ionicons name="time-outline" size={11} color="#059669" />
            <Text style={s.slotText}>{item.availableSlots} slots</Text>
          </View>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={s.ratingText}>{item.rating}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Facilities</Text>
          <Text style={s.headerSub}>Book amenities & spaces</Text>
        </View>
        <TouchableOpacity style={s.backBtn} hitSlop={8}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow} style={s.filterScroll}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[s.filterChip, filter === c.value && s.filterChipActive]}
            onPress={() => setFilter(c.value)}
          >
            <Ionicons name={c.icon} size={14} color={filter === c.value ? '#fff' : COLORS.textMuted} />
            <Text style={[s.filterText, filter === c.value && s.filterTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="business-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No facilities found</Text>
            <Text style={s.emptyDesc}>Check back for available amenities</Text>
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
  facilityCard: {
    flexDirection: 'row', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  facilityImagePlaceholder: {
    width: 80, height: 80, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  freeBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#D1FAE5', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  freeBadgeText: { fontSize: 9, fontWeight: '800', color: '#059669' },
  facilityInfo: { flex: 1, gap: 3 },
  facilityName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 12, color: COLORS.textMuted },
  amenityRow: { flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  amenityChip: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  amenityText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  facilityFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.accent },
  slotBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#D1FAE5', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  slotText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
