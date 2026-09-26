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

type PetFilter = 'REGISTRY' | 'SERVICES' | 'LOST_FOUND';

interface PetEntry {
  id: number;
  name: string;
  type: 'DOG' | 'CAT' | 'BIRD' | 'OTHER';
  breed: string;
  ownerName: string;
  ownerFlat: string;
  vaccinated: boolean;
  age: string;
}

interface PetService {
  id: number;
  name: string;
  type: string;
  provider: string;
  flat: string;
  price: string;
  rating: number;
}

const PET_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  DOG:   { icon: 'paw',     color: '#D97706', bg: '#FEF3C7' },
  CAT:   { icon: 'paw',     color: '#7C3AED', bg: '#EDE9FE' },
  BIRD:  { icon: 'leaf',    color: '#059669', bg: '#D1FAE5' },
  OTHER: { icon: 'paw',     color: '#2563EB', bg: '#DBEAFE' },
};

const SAMPLE_PETS: PetEntry[] = [
  { id: 1, name: 'Bruno',   type: 'DOG',  breed: 'Golden Retriever', ownerName: 'Sanjay R.', ownerFlat: 'A1-302', vaccinated: true,  age: '3 years' },
  { id: 2, name: 'Whiskers', type: 'CAT',  breed: 'Persian',         ownerName: 'Priya M.',  ownerFlat: 'B2-105', vaccinated: true,  age: '2 years' },
  { id: 3, name: 'Buddy',   type: 'DOG',  breed: 'Labrador',        ownerName: 'Amit K.',   ownerFlat: 'C1-401', vaccinated: true,  age: '5 years' },
  { id: 4, name: 'Coco',    type: 'DOG',  breed: 'Shih Tzu',        ownerName: 'Neetha S.', ownerFlat: 'A2-201', vaccinated: false, age: '1 year' },
  { id: 5, name: 'Kiki',    type: 'BIRD', breed: 'Cockatiel',       ownerName: 'Rahul V.',  ownerFlat: 'B1-304', vaccinated: true,  age: '6 months' },
];

const SAMPLE_SERVICES: PetService[] = [
  { id: 1, name: 'Dog Walking',          type: 'Walking',   provider: 'Suresh K.',      flat: 'A3-GF', price: '₹200/walk', rating: 4.8 },
  { id: 2, name: 'Pet Grooming at Home', type: 'Grooming',  provider: 'PetCare Studio', flat: 'C2-102', price: '₹500-800', rating: 4.6 },
  { id: 3, name: 'Vet on Call',          type: 'Vet',       provider: 'Dr. Meena',      flat: 'B3-201', price: '₹300/visit', rating: 4.9 },
  { id: 4, name: 'Pet Sitting',          type: 'Sitting',   provider: 'Deepa M.',       flat: 'A1-105', price: '₹400/day', rating: 4.5 },
];

export default function PetsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<PetFilter>('REGISTRY');

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

  const renderPet = ({ item }: { item: PetEntry }) => {
    const meta = PET_ICONS[item.type];
    return (
      <View style={s.petCard}>
        <View style={[s.petIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={24} color={meta.color} />
        </View>
        <View style={s.petInfo}>
          <View style={s.petNameRow}>
            <Text style={s.petName}>{item.name}</Text>
            {item.vaccinated && (
              <View style={s.vacBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#059669" />
                <Text style={s.vacText}>Vaccinated</Text>
              </View>
            )}
          </View>
          <Text style={s.petBreed}>{item.breed} • {item.age}</Text>
          <View style={s.ownerRow}>
            <Ionicons name="person-outline" size={11} color={COLORS.textMuted} />
            <Text style={s.ownerText}>{item.ownerName} ({item.ownerFlat})</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
      </View>
    );
  };

  const renderService = ({ item }: { item: PetService }) => (
    <View style={s.serviceCard}>
      <View style={s.serviceInfo}>
        <Text style={s.serviceName}>{item.name}</Text>
        <View style={s.serviceProvider}>
          <Ionicons name="person-outline" size={11} color={COLORS.textMuted} />
          <Text style={s.serviceProviderText}>{item.provider} ({item.flat})</Text>
        </View>
        <View style={s.serviceFooter}>
          <Text style={s.servicePrice}>{item.price}</Text>
          <View style={s.ratingBadge}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={s.ratingText}>{item.rating}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={s.bookBtn} activeOpacity={0.7}>
        <Text style={s.bookBtnText}>Book</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Pet Corner</Text>
          <Text style={s.headerSub}>Community pet directory</Text>
        </View>
        <TouchableOpacity style={s.backBtn} hitSlop={8}>
          <Ionicons name="add-outline" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        {([
          { key: 'REGISTRY' as PetFilter, label: 'Registry', icon: 'paw-outline' as keyof typeof Ionicons.glyphMap },
          { key: 'SERVICES' as PetFilter, label: 'Services', icon: 'cut-outline' as keyof typeof Ionicons.glyphMap },
          { key: 'LOST_FOUND' as PetFilter, label: 'Lost & Found', icon: 'search-outline' as keyof typeof Ionicons.glyphMap },
        ]).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Ionicons name={t.icon} size={14} color={tab === t.key ? '#fff' : COLORS.textMuted} />
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'REGISTRY' && (
        <FlatList
          data={SAMPLE_PETS}
          keyExtractor={item => String(item.id)}
          renderItem={renderPet}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {tab === 'SERVICES' && (
        <FlatList
          data={SAMPLE_SERVICES}
          keyExtractor={item => String(item.id)}
          renderItem={renderService}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {tab === 'LOST_FOUND' && (
        <View style={s.empty}>
          <Ionicons name="heart-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>No lost pets</Text>
          <Text style={s.emptyDesc}>All pets are safe at home! Report if you find a lost pet.</Text>
        </View>
      )}
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
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt,
  },
  tabBtnActive: { backgroundColor: COLORS.accent },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  list: { padding: 12, gap: 10 },
  petCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  petIcon: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  petInfo: { flex: 1, gap: 2 },
  petNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  vacBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#D1FAE5', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1,
  },
  vacText: { fontSize: 9, fontWeight: '700', color: '#059669' },
  petBreed: { fontSize: 12, color: COLORS.textMuted },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ownerText: { fontSize: 11, color: COLORS.textMuted },
  serviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  serviceInfo: { flex: 1, gap: 3 },
  serviceName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  serviceProvider: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serviceProviderText: { fontSize: 12, color: COLORS.textMuted },
  serviceFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  servicePrice: { fontSize: 14, fontWeight: '800', color: COLORS.accent },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  bookBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
});
