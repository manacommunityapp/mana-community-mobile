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
import { SHADOWS } from '@/constants/config';
import { homeServicesService, HomeHelpWorkerDto } from '@/services/homeServicesService';

const CATEGORIES = [
  { code: 'ALL', name: 'All' },
  { code: 'PLUMBING', name: 'Plumber' },
  { code: 'ELECTRICAL', name: 'Electrician' },
  { code: 'CLEANING', name: 'Cleaning' },
  { code: 'APPLIANCE', name: 'Appliance' },
  { code: 'CARPENTRY', name: 'Carpentry' },
  { code: 'PAINTING', name: 'Painting' },
  { code: 'MAID', name: 'Maid/Cook' },
  { code: 'PEST_CONTROL', name: 'Pest Control' },
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Find Home Help</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, skill, or service..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
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
              <Text style={[styles.catPillText, active && styles.catPillTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Finding verified professionals...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.speciality}>{item.speciality || item.category}</Text>
                  <View style={styles.metaRow}>
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={styles.ratingText}>{item.rating} ({item.reviewCount})</Text>
                    </View>
                    {item.experience && <Text style={styles.expText}>• {item.experience}</Text>}
                    {item.priceRange && <Text style={styles.priceText}>• {item.priceRange}</Text>}
                  </View>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                  <Ionicons name="call" size={14} color="#059669" />
                  <Text style={styles.callBtnText}>Call</Text>
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
                    <Ionicons name="calendar-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.bookBtnText}>Book Visit</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No service providers found</Text>
              <Text style={styles.emptySub}>Try selecting another category</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!bookingWorker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Book {bookingWorker?.name}</Text>
              <TouchableOpacity onPress={() => setBookingWorker(null)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>Category: {bookingWorker?.category}</Text>

            <Text style={styles.inputLabel}>Preferred Time Slot</Text>
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

            <Text style={styles.inputLabel}>Describe Issue / Requirement</Text>
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
              {bookMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Visit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  catList: { paddingHorizontal: 16, paddingBottom: 10 },
  catPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8 },
  catPillActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  catPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  catPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  verifiedText: { fontSize: 10, color: '#059669', fontWeight: '700', marginLeft: 3 },
  speciality: { fontSize: 12, color: '#64748B', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#0F172A', marginLeft: 3 },
  expText: { fontSize: 11, color: '#64748B', marginLeft: 4 },
  priceText: { fontSize: 11, color: '#059669', fontWeight: '600', marginLeft: 4 },
  cardActions: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', paddingVertical: 9, borderRadius: 10, marginRight: 8 },
  callBtnText: { color: '#059669', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  bookBtn: { flex: 2, borderRadius: 10, overflow: 'hidden' },
  bookGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9 },
  bookBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 12, color: '#64748B', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  slotRow: { marginBottom: 12 },
  slotChip: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6 },
  slotChipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  slotChipText: { fontSize: 12, color: '#334155' },
  slotChipTextActive: { color: '#4F46E5', fontWeight: '700' },
  textArea: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 10, fontSize: 13, color: '#0F172A', textAlignVertical: 'top', height: 80, marginBottom: 16 },
  confirmBtn: { backgroundColor: '#4F46E5', paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
