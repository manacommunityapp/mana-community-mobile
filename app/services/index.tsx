import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, BackHandler, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

type ServiceCategory = 'ALL' | 'PLUMBING' | 'ELECTRICAL' | 'CLEANING' | 'CARPENTRY' | 'PAINTING' | 'APPLIANCE';

const CATEGORIES: { value: ServiceCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ALL',        label: 'All',         icon: 'grid-outline' },
  { value: 'PLUMBING',   label: 'Plumbing',    icon: 'water-outline' },
  { value: 'ELECTRICAL', label: 'Electrical',  icon: 'flash-outline' },
  { value: 'CLEANING',   label: 'Cleaning',    icon: 'sparkles-outline' },
  { value: 'CARPENTRY',  label: 'Carpentry',   icon: 'hammer-outline' },
  { value: 'PAINTING',   label: 'Painting',    icon: 'color-palette-outline' },
  { value: 'APPLIANCE',  label: 'Appliance',   icon: 'settings-outline' },
];

interface ServiceProvider {
  id: number;
  name: string;
  category: ServiceCategory;
  phone: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  verified: boolean;
  available: boolean;
  speciality: string;
}

const SAMPLE_PROVIDERS: ServiceProvider[] = [
  { id: 1, name: 'Raju Plumbing Services',  category: 'PLUMBING',   phone: '+919876543210', rating: 4.7, reviewCount: 42, priceRange: '₹200-500',   verified: true,  available: true,  speciality: 'Pipe fitting, leaks, bathroom' },
  { id: 2, name: 'Spark Electricals',        category: 'ELECTRICAL', phone: '+919876543211', rating: 4.5, reviewCount: 38, priceRange: '₹300-800',   verified: true,  available: true,  speciality: 'Wiring, MCB, fan & light' },
  { id: 3, name: 'CleanPro Services',        category: 'CLEANING',   phone: '+919876543212', rating: 4.8, reviewCount: 65, priceRange: '₹500-1500',  verified: true,  available: true,  speciality: 'Deep clean, kitchen, bathroom' },
  { id: 4, name: 'Kumar Carpenter',          category: 'CARPENTRY',  phone: '+919876543213', rating: 4.3, reviewCount: 21, priceRange: '₹400-2000',  verified: false, available: true,  speciality: 'Furniture repair, modular work' },
  { id: 5, name: 'Perfect Paint Works',      category: 'PAINTING',   phone: '+919876543214', rating: 4.6, reviewCount: 33, priceRange: '₹15-25/sqft', verified: true,  available: false, speciality: 'Interior, exterior, texture' },
  { id: 6, name: 'Fix-It Appliance Repair',  category: 'APPLIANCE',  phone: '+919876543215', rating: 4.4, reviewCount: 29, priceRange: '₹300-1000',  verified: true,  available: true,  speciality: 'AC, washing machine, fridge' },
];

export default function ServicesScreen({ isTab = false }: { isTab?: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ServiceCategory>('ALL');

  const goHome = useCallback(() => {
    if (isTab) return;
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router, isTab]);

  useFocusEffect(
    useCallback(() => {
      if (isTab) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { goHome(); return true; });
      return () => sub.remove();
    }, [goHome, isTab])
  );

  const filtered = filter === 'ALL' ? SAMPLE_PROVIDERS : SAMPLE_PROVIDERS.filter(p => p.category === filter);

  const renderItem = ({ item }: { item: ServiceProvider }) => (
    <View style={[s.providerCard, !item.available && s.unavailable]}>
      <View style={s.providerTop}>
        <View style={s.providerIcon}>
          <Ionicons
            name={CATEGORIES.find(c => c.value === item.category)?.icon || 'build-outline'}
            size={22}
            color={COLORS.primary}
          />
        </View>
        <View style={s.providerInfo}>
          <View style={s.nameRow}>
            <Text style={s.providerName} numberOfLines={1}>{item.name}</Text>
            {item.verified && (
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
            )}
          </View>
          <Text style={s.speciality} numberOfLines={1}>{item.speciality}</Text>
          <View style={s.metaRow}>
            <View style={s.ratingBadge}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={s.ratingText}>{item.rating}</Text>
              <Text style={s.reviewCount}>({item.reviewCount})</Text>
            </View>
            <Text style={s.priceRange}>{item.priceRange}</Text>
          </View>
        </View>
      </View>
      <View style={s.providerActions}>
        <TouchableOpacity
          style={[s.callBtn, !item.available && s.callBtnDisabled]}
          onPress={() => item.available && Linking.openURL(`tel:${item.phone}`)}
          activeOpacity={0.7}
          disabled={!item.available}
        >
          <Ionicons name="call-outline" size={16} color={item.available ? '#fff' : COLORS.textMuted} />
          <Text style={[s.callBtnText, !item.available && { color: COLORS.textMuted }]}>
            {item.available ? 'Call Now' : 'Unavailable'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.chatBtn} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        {!isTab && (
          <TouchableOpacity onPress={goHome} style={s.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
        )}
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Home Services</Text>
          <Text style={s.headerSub}>Verified local technicians & helpers</Text>
        </View>
        <TouchableOpacity style={s.backBtn} hitSlop={8}>
          <Ionicons name="search-outline" size={20} color={COLORS.text} />
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
            <Ionicons name="construct-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No providers found</Text>
            <Text style={s.emptyDesc}>Try a different category or check back later</Text>
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
  providerCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm, gap: 12,
  },
  unavailable: { opacity: 0.6 },
  providerTop: { flexDirection: 'row', gap: 12 },
  providerIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  providerInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  providerName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  speciality: { fontSize: 12, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  reviewCount: { fontSize: 10, color: COLORS.textMuted },
  priceRange: { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  providerActions: { flexDirection: 'row', gap: 8 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  callBtnDisabled: { backgroundColor: COLORS.surfaceAlt },
  callBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  chatBtn: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
