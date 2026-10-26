import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAppBack } from '@/hooks/useAppBack';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

interface PoojaSevaItem {
  id: number;
  name: string;
  type: string;
  date: string;
  startTime?: string;
  mandap?: string;
  pandit?: string;
  fee?: number;
  isFree?: boolean;
  slots?: number;
}

const SAMPLE_POOJAS: PoojaSevaItem[] = [
  { id: 1, name: 'Ganesh Maha Ganapati Homam', type: 'Vedic Homam', date: 'Day 1 (Morning)', startTime: '08:30 AM', mandap: 'Main Temple Mandap', pandit: 'Acharya Shastri', fee: 501, isFree: false, slots: 25 },
  { id: 2, name: 'Sahasranama Archana & Prasadam', type: 'Archana', date: 'Daily', startTime: '10:00 AM', mandap: 'Sanctum', pandit: 'Pt. Ramanujam', fee: 251, isFree: false, slots: 50 },
  { id: 3, name: 'Community Maha Aarti & Pushpanjali', type: 'Community Aarti', date: 'Daily Evening', startTime: '07:30 PM', mandap: 'Open Pavillion', pandit: 'Temple Board', fee: 0, isFree: true, slots: 200 },
  { id: 4, name: 'Satyanarayan Vrat Katha & Pooja', type: 'Katha & Sankalp', date: 'Day 5', startTime: '04:30 PM', mandap: 'Clubhouse Hall A', pandit: 'Pt. Joshi', fee: 351, isFree: false, slots: 40 },
];

export default function EventPoojaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const eventId = Number(id);
  const { goBack } = useAppBack({ fallbackRoute: id ? `/events/${id}` : '/events' });

  const [selectedSeva, setSelectedSeva] = useState<PoojaSevaItem | null>(null);
  const [devoteeName, setDevoteeName] = useState(user?.fullName || user?.name || '');
  const [gotram, setGotram] = useState('');
  const [nakshatram, setNakshatram] = useState('');
  const [headCount, setHeadCount] = useState('1');
  const [showModal, setShowModal] = useState(false);

  const { data: event } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getById(eventId),
    enabled: !!eventId,
  });

  const handleBook = (seva: PoojaSevaItem) => {
    setSelectedSeva(seva);
    setShowModal(true);
  };

  const handleConfirmBooking = () => {
    if (!devoteeName.trim()) {
      Alert.alert('Required', 'Please enter primary devotee name.');
      return;
    }
    Alert.alert(
      'Pooja Token Confirmed! 🙏',
      `Your token for "${selectedSeva?.name}" has been registered successfully.\nDevotee: ${devoteeName}${gotram ? ` (Gotram: ${gotram})` : ''}\nFee: ${selectedSeva?.isFree ? 'Free' : `₹${selectedSeva?.fee}`}`,
      [{ text: 'OK', onPress: () => setShowModal(false) }]
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pooja & Seva Tokens</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.bannerCard}>
          <Text style={{ fontSize: 32 }}>🪔</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.bannerTitle}>{event?.title || 'Community Pooja'}</Text>
            <Text style={s.bannerSub}>Book sacred sevas, archana & family sankalp slots.</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Available Sevas & Rituals</Text>

        {SAMPLE_POOJAS.map(item => (
          <View key={item.id} style={s.sevaCard}>
            <View style={s.sevaHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.sevaType}>{item.type.toUpperCase()}</Text>
                <Text style={s.sevaTitle}>{item.name}</Text>
              </View>
              <View style={s.feeBadge}>
                <Text style={s.feeText}>{item.isFree ? 'FREE' : `₹${item.fee}`}</Text>
              </View>
            </View>

            <View style={s.detailsGrid}>
              <View style={s.detailRow}>
                <Ionicons name="calendar-outline" size={14} color="#64748B" />
                <Text style={s.detailText}>{item.date} · {item.startTime}</Text>
              </View>
              <View style={s.detailRow}>
                <Ionicons name="location-outline" size={14} color="#64748B" />
                <Text style={s.detailText}>{item.mandap} (Pandit: {item.pandit})</Text>
              </View>
            </View>

            <TouchableOpacity style={s.bookBtn} onPress={() => handleBook(item)}>
              <Ionicons name="hand-right-outline" size={16} color="#fff" />
              <Text style={s.bookBtnText}>Book Seva Token</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Book Pooja Token</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalSevaName}>{selectedSeva?.name}</Text>
            <Text style={s.modalSevaSub}>
              {selectedSeva?.date} · {selectedSeva?.startTime} · {selectedSeva?.mandap}
            </Text>

            <Text style={s.label}>Devotee Name *</Text>
            <TextInput
              style={s.input}
              value={devoteeName}
              onChangeText={setDevoteeName}
              placeholder="e.g. Ramesh Sharma"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Gotram</Text>
                <TextInput
                  style={s.input}
                  value={gotram}
                  onChangeText={setGotram}
                  placeholder="e.g. Kashyapa"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Family Count</Text>
                <TextInput
                  style={s.input}
                  keyboardType="numeric"
                  value={headCount}
                  onChangeText={setHeadCount}
                  placeholder="1"
                />
              </View>
            </View>

            <Text style={s.label}>Nakshatram (Optional)</Text>
            <TextInput
              style={s.input}
              value={nakshatram}
              onChangeText={setNakshatram}
              placeholder="e.g. Rohini, Ashwini"
            />

            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirmBooking}>
              <Text style={s.confirmBtnText}>
                Confirm Token {selectedSeva?.isFree ? '(Free)' : `(₹${selectedSeva?.fee})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  content: { padding: 16, paddingBottom: 40 },
  bannerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB',
    padding: 16, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 20,
  },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: '#92400E' },
  bannerSub: { fontSize: 12, color: '#B45309', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  sevaCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  sevaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sevaType: { fontSize: 10, fontWeight: '800', color: '#DC2626', letterSpacing: 0.5 },
  sevaTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  feeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#FEF2F2' },
  feeText: { fontSize: 12, fontWeight: '800', color: '#DC2626' },
  detailsGrid: { marginVertical: 12, gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#64748B' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: RADIUS.md, backgroundColor: '#DC2626',
  },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSevaName: { fontSize: 16, fontWeight: '800', color: '#DC2626' },
  modalSevaSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  confirmBtn: { backgroundColor: '#DC2626', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
