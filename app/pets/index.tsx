import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ScrollView, BackHandler, Modal, TextInput,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  petService,
  PetDto,
  PetServiceDto,
  LostFoundPetDto,
} from '@/services/petService';

type PetFilter = 'REGISTRY' | 'SERVICES' | 'LOST_FOUND';

const PET_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  DOG:   { icon: 'paw',     color: '#D97706', bg: '#FEF3C7' },
  CAT:   { icon: 'paw',     color: '#7C3AED', bg: '#EDE9FE' },
  BIRD:  { icon: 'leaf',    color: '#059669', bg: '#D1FAE5' },
  OTHER: { icon: 'paw',     color: '#2563EB', bg: '#DBEAFE' },
};

export default function PetsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<PetFilter>('REGISTRY');
  const [refreshing, setRefreshing] = useState(false);

  // Register Pet Modal state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<'DOG' | 'CAT' | 'BIRD' | 'OTHER'>('DOG');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [vaccinated, setVaccinated] = useState(true);

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isRegisterOpen) {
          setIsRegisterOpen(false);
          return true;
        }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, isRegisterOpen])
  );

  // ── 1. Fetch Pets ──────────────────────────────────────────────────────────
  const { data: pets = [], isLoading: loadingPets, refetch: refetchPets } = useQuery<PetDto[]>({
    queryKey: ['pets', 'list'],
    queryFn: () => petService.getPets(),
    staleTime: 30_000,
  });

  // ── 2. Fetch Services ──────────────────────────────────────────────────────
  const { data: petServices = [], isLoading: loadingServices, refetch: refetchServices } = useQuery<PetServiceDto[]>({
    queryKey: ['pets', 'services'],
    queryFn: () => petService.getPetServices(),
    staleTime: 30_000,
  });

  // ── 3. Fetch Lost & Found ──────────────────────────────────────────────────
  const { data: lostFound = [], isLoading: loadingLost, refetch: refetchLost } = useQuery<LostFoundPetDto[]>({
    queryKey: ['pets', 'lost-found'],
    queryFn: () => petService.getLostFound(),
    staleTime: 30_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refetchPets(), refetchServices(), refetchLost()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPets, refetchServices, refetchLost]);

  // ── 4. Register Mutation ───────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (data: Omit<PetDto, 'id'>) => petService.registerPet(data),
    onSuccess: (newPet) => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setIsRegisterOpen(false);
      setPetName('');
      setPetBreed('');
      setPetAge('');
      Alert.alert('🐾 Pet Registered', `${newPet.name} has been added to the community pet registry.`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to register pet.');
    },
  });

  const handleRegisterSubmit = () => {
    if (!petName.trim() || !petBreed.trim()) {
      Alert.alert('Validation', 'Please enter pet name and breed.');
      return;
    }
    registerMutation.mutate({
      name: petName.trim(),
      type: petType,
      breed: petBreed.trim(),
      ownerName: user?.fullName || user?.name || 'Resident',
      ownerFlat: `Tower ${user?.tower || 'A'} - Unit ${user?.flatNumber || '101'}`,
      vaccinated,
      age: petAge.trim() || '1 year',
    });
  };

  const renderPet = ({ item }: { item: PetDto }) => {
    const meta = PET_ICONS[item.type] || PET_ICONS.DOG;
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

  const renderService = ({ item }: { item: PetServiceDto }) => (
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
            <Ionicons name="star" size={11} color="#D97706" />
            <Text style={s.ratingText}>{item.rating}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={s.bookBtn}
        activeOpacity={0.7}
        onPress={() => Alert.alert('Book Service', `Contact ${item.provider} at ${item.flat} to confirm your appointment.`)}
      >
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
        <TouchableOpacity onPress={() => setIsRegisterOpen(true)} style={s.backBtn} hitSlop={8}>
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
          data={pets}
          keyExtractor={item => String(item.id)}
          renderItem={renderPet}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="paw-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No pets registered</Text>
              <Text style={s.emptyDesc}>Be the first to register your pet in the community.</Text>
            </View>
          }
        />
      )}

      {tab === 'SERVICES' && (
        <FlatList
          data={petServices}
          keyExtractor={item => String(item.id)}
          renderItem={renderService}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        />
      )}

      {tab === 'LOST_FOUND' && (
        <FlatList
          data={lostFound}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
          renderItem={({ item }) => (
            <View style={s.petCard}>
              <View style={[s.petIcon, { backgroundColor: item.type === 'LOST' ? '#FEE2E2' : '#D1FAE5' }]}>
                <Ionicons name={item.type === 'LOST' ? 'alert-circle' : 'checkmark-circle'} size={24} color={item.type === 'LOST' ? '#DC2626' : '#059669'} />
              </View>
              <View style={s.petInfo}>
                <View style={s.petNameRow}>
                  <Text style={s.petName}>{item.petName || 'Pet'}</Text>
                  <View style={[s.vacBadge, { backgroundColor: item.type === 'LOST' ? '#FEE2E2' : '#D1FAE5' }]}>
                    <Text style={[s.vacText, { color: item.type === 'LOST' ? '#DC2626' : '#059669' }]}>{item.type}</Text>
                  </View>
                </View>
                <Text style={s.petBreed}>{item.description}</Text>
                <Text style={s.ownerText}>📍 {item.lastSeenLocation || 'Club House'} • {item.lastSeenTime || item.date}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="heart-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No lost pets</Text>
              <Text style={s.emptyDesc}>All pets are safe at home! Report if you find a lost pet.</Text>
            </View>
          }
        />
      )}

      {/* ── Register Pet Modal ── */}
      <Modal visible={isRegisterOpen} transparent animationType="slide" onRequestClose={() => setIsRegisterOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Register Your Pet</Text>
              <TouchableOpacity onPress={() => setIsRegisterOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.fieldLabel}>Pet Name *</Text>
              <TextInput style={s.input} placeholder="e.g. Bruno" value={petName} onChangeText={setPetName} />

              <Text style={s.fieldLabel}>Pet Type</Text>
              <View style={s.typeSelector}>
                {(['DOG', 'CAT', 'BIRD', 'OTHER'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.typeChip, petType === t && s.typeChipActive]}
                    onPress={() => setPetType(t)}
                  >
                    <Text style={[s.typeChipText, petType === t && s.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>Breed *</Text>
              <TextInput style={s.input} placeholder="e.g. Golden Retriever" value={petBreed} onChangeText={setPetBreed} />

              <Text style={s.fieldLabel}>Age</Text>
              <TextInput style={s.input} placeholder="e.g. 2 years" value={petAge} onChangeText={setPetAge} />

              <TouchableOpacity style={s.vacCheckRow} onPress={() => setVaccinated(v => !v)}>
                <Ionicons name={vaccinated ? 'checkbox' : 'square-outline'} size={20} color={COLORS.accent} />
                <Text style={s.vacCheckText}>Up-to-date with vaccinations</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.submitModalBtn}
                onPress={handleRegisterSubmit}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.submitModalBtnText}>Add Pet to Registry</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text },
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
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: 12, fontSize: 14, color: COLORS.text,
  },
  typeSelector: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  typeChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  typeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  typeChipTextActive: { color: '#fff', fontWeight: '700' },
  vacCheckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 20,
  },
  vacCheckText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  submitModalBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center',
  },
  submitModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
