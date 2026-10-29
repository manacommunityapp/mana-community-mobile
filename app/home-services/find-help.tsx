import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, Linking, Modal, Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SHADOWS, FONTS } from '@/constants/config';
import { homeServicesService, HomeHelpWorkerDto } from '@/services/homeServicesService';

const CATEGORIES = [
  { code: 'ALL',          name: 'All',          emoji: '🏠' },
  { code: 'PLUMBING',     name: 'Plumber',      emoji: '🔧' },
  { code: 'ELECTRICAL',   name: 'Electrician',  emoji: '⚡' },
  { code: 'CLEANING',     name: 'Cleaning',     emoji: '✨' },
  { code: 'APPLIANCE',    name: 'Appliance',    emoji: '📺' },
  { code: 'CARPENTRY',    name: 'Carpentry',    emoji: '🪚' },
  { code: 'PAINTING',     name: 'Painting',     emoji: '🎨' },
  { code: 'MAID',         name: 'Maid/Cook',    emoji: '👩‍🍳' },
  { code: 'PEST_CONTROL', name: 'Pest Control', emoji: '🐛' },
];

export default function FindHelpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || 'ALL');
  const [search, setSearch] = useState('');
  const [bookingWorker, setBookingWorker] = useState<HomeHelpWorkerDto | null>(null);
  const [notes, setNotes] = useState('');
  const [slot, setSlot] = useState('Morning (9 AM - 12 PM)');

  const { data: workers = [], isLoading, refetch } = useQuery({
    queryKey: ['home-services-find-workers', selectedCategory],
    queryFn: () => homeServicesService.getWorkers(selectedCategory),
  });

  const bookMutation = useMutation({
    mutationFn: (data: Parameters<typeof homeServicesService.bookWorker>[0]) => homeServicesService.bookWorker(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['home-services-hub-bookings'] });
      setBookingWorker(null);
      Alert.alert('Visit Scheduled', `Booking #${res.bookingId} has been confirmed.`, [
        { text: 'View Bookings', onPress: () => router.push('/home-services/bookings') },
        { text: 'OK' }
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not schedule booking.'),
  });

  const filtered = useMemo(() => {
    let list = workers;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(w => w.name.toLowerCase().includes(q) || (w.speciality && w.speciality.toLowerCase().includes(q)));
    }
    return list;
  }, [workers, search]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>🔍 Find Home Help</Text>
            <Text style={styles.headerSub}>Verified professionals near you</Text>
          </View>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, skill, or service..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        data={CATEGORIES}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.catList}
        renderItem={({ item }) => {
          const active = selectedCategory === item.code;
          return (
            <TouchableOpacity
              style={[styles.catPill, active && styles.catPillActive]}
              onPress={() => setSelectedCategory(item.code)}
            >
              <Text style={styles.catPillEmoji}>{item.emoji}</Text>
              <Text style={[styles.catPillText, active && styles.catPillTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <View style={styles.loadingCircle}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
          <Text style={styles.loadingText}>Finding verified professionals...</Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          onRefresh={() => { refetch(); }}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardAccent} />
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.verified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✅ Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.speciality}>{item.speciality || item.category}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.ratingChip}>
                      <Text style={styles.ratingEmoji}>⭐</Text>
                      <Text style={styles.ratingText}>{item.rating} ({item.reviewCount})</Text>
                    </View>
                    {item.experience && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>🕐 {item.experience}</Text>
                      </View>
                    )}
                    {item.priceRange && (
                      <View style={[styles.metaChip, { borderColor: '#A7F3D0' }]}>
                        <Text style={[styles.metaChipText, { color: '#059669' }]}>💰 {item.priceRange}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Text style={styles.callBtnText}>📞 Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => { setBookingWorker(item); setNotes(''); }}
                >
                  <LinearGradient
                    colors={['#4F46E5', '#6366F1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bookGrad}
                  >
                    <Text style={styles.bookBtnText}>📅 Book Visit</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyEmoji}>🔍</Text>
              </View>
              <Text style={styles.emptyTitle}>No service providers found</Text>
              <Text style={styles.emptySub}>Try selecting another category</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!bookingWorker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalAccent} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Book {bookingWorker?.name}</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setBookingWorker(null)}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalCategoryChip}>
              <Text style={styles.modalCategoryText}>🏷️ {bookingWorker?.category}</Text>
            </View>

            <Text style={styles.inputLabel}>🕐 Preferred Time Slot</Text>
            <View style={styles.slotRow}>
              {['Morning (9 AM - 12 PM)', 'Afternoon (1 PM - 4 PM)', 'Evening (5 PM - 8 PM)'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.slotChip, slot === s && styles.slotChipActive]}
                  onPress={() => setSlot(s)}
                >
                  <Text style={[styles.slotChipText, slot === s && styles.slotChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>📝 Describe Issue / Requirement</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Tap leaking in master bathroom, need washer fix..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                if (!bookingWorker) return;
                bookMutation.mutate({
                  workerId: bookingWorker.id,
                  providerName: bookingWorker.name,
                  category: bookingWorker.category,
                  phone: bookingWorker.phone,
                  slotDate: new Date().toISOString().split('T')[0],
                  timeSlot: slot,
                  requirementsNotes: notes,
                });
              }}
              disabled={bookMutation.isPending}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmGrad}
              >
                {bookMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>✅ Confirm Visit</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.displayEB, color: '#FFFFFF' },
  headerSub: { fontSize: 11, fontFamily: FONTS.regular, color: '#C7D2FE', marginTop: 2 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, fontFamily: FONTS.medium, color: '#FFFFFF' },

  catList: { paddingHorizontal: 16, paddingVertical: 12 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    marginRight: 8,
    ...SHADOWS.sm,
  },
  catPillActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  catPillEmoji: { fontSize: 14, marginRight: 6 },
  catPillText: { fontSize: 12, fontFamily: FONTS.semiBold, color: '#64748B' },
  catPillTextActive: { color: '#FFFFFF', fontFamily: FONTS.bold },

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontFamily: FONTS.displayEB, color: '#4F46E5' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontFamily: FONTS.displayBold, color: '#0F172A' },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedText: { fontSize: 10, fontFamily: FONTS.bold, color: '#059669' },
  speciality: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingEmoji: { fontSize: 11, marginRight: 4 },
  ratingText: { fontSize: 11, fontFamily: FONTS.bold, color: '#92400E' },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    backgroundColor: '#F8FAFC',
  },
  metaChipText: { fontSize: 10, fontFamily: FONTS.semiBold, color: '#64748B' },

  cardActions: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  callBtn: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callBtnText: { fontSize: 13, fontFamily: FONTS.bold, color: '#059669' },
  bookBtn: { flex: 2, height: 42, borderRadius: 12, overflow: 'hidden' },
  bookGrad: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  bookBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingText: { fontSize: 13, fontFamily: FONTS.medium, color: '#64748B' },

  emptyBox: { paddingVertical: 60, alignItems: 'center' },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 16, fontFamily: FONTS.displayBold, color: '#0F172A' },
  emptySub: { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    overflow: 'hidden',
  },
  modalAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  modalTitle: { fontSize: 17, fontFamily: FONTS.displayEB, color: '#0F172A' },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCategoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginTop: 6,
    marginBottom: 14,
  },
  modalCategoryText: { fontSize: 11, fontFamily: FONTS.bold, color: '#4F46E5' },

  inputLabel: { fontSize: 12, fontFamily: FONTS.bold, color: '#334155', marginBottom: 8 },
  slotRow: { marginBottom: 14 },
  slotChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  slotChipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  slotChipText: { fontSize: 12, fontFamily: FONTS.medium, color: '#334155' },
  slotChipTextActive: { color: '#4F46E5', fontFamily: FONTS.bold },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#0F172A',
    textAlignVertical: 'top',
    height: 80,
    marginBottom: 16,
  },
  confirmBtn: { borderRadius: 14, overflow: 'hidden' },
  confirmGrad: { paddingVertical: 14, alignItems: 'center' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: FONTS.bold },
});
