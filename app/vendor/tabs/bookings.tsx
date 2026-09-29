import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import { vendorService, type VendorBooking, type BookingStatus } from '@/services/vendorService';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type FilterKey = 'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_progress', label: 'Active' },
  { key: 'completed', label: 'Done' },
];

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string; icon: IoniconsName }> = {
  PENDING:     { label: 'Pending',     color: '#D97706', bg: '#FEF3C7', icon: 'time' },
  CONFIRMED:   { label: 'Confirmed',   color: '#2563EB', bg: '#DBEAFE', icon: 'checkmark-circle' },
  IN_PROGRESS: { label: 'In Progress', color: '#7C3AED', bg: '#EDE9FE', icon: 'play-circle' },
  COMPLETED:   { label: 'Completed',   color: '#059669', bg: '#D1FAE5', icon: 'checkmark-done-circle' },
  CANCELLED:   { label: 'Cancelled',   color: '#6B7280', bg: '#F3F4F6', icon: 'close-circle' },
};

const FILTER_STATUS: Record<FilterKey, BookingStatus | null> = {
  all: null,
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  in_progress: 'IN_PROGRESS',
  completed: 'COMPLETED',
};

export default function VendorBookingsScreen() {
  const [bookings, setBookings] = useState<VendorBooking[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async () => {
    const data = await vendorService.getBookings();
    setBookings(data);
  };

  useEffect(() => { loadBookings(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === FILTER_STATUS[filter]);

  const handleAction = (booking: VendorBooking, action: 'accept' | 'start' | 'complete' | 'cancel') => {
    const labels: Record<string, string> = {
      accept: 'Accept Booking',
      start: 'Start Job',
      complete: 'Mark Complete',
      cancel: 'Cancel Booking',
    };
    Alert.alert(labels[action], `${labels[action]} for ${booking.customerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: labels[action],
        style: action === 'cancel' ? 'destructive' : 'default',
        onPress: async () => {
          if (action === 'accept') await vendorService.acceptBooking(booking.id);
          else if (action === 'start') await vendorService.startBooking(booking.id);
          else if (action === 'complete') await vendorService.completeBooking(booking.id);
          else await vendorService.cancelBooking(booking.id);
          await loadBookings();
        },
      },
    ]);
  };

  const renderBooking = ({ item }: { item: VendorBooking }) => {
    const meta = STATUS_META[item.status];

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={[s.bookingIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={s.cardBody}>
            <Text style={s.serviceName} numberOfLines={1}>{item.service}</Text>
            <Text style={s.customerName}>{item.customerName} · {item.flat}</Text>
            <View style={s.metaRow}>
              <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
              <Text style={s.metaText}>{item.date}</Text>
              <Ionicons name="time-outline" size={11} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
              <Text style={s.metaText}>{item.time}</Text>
            </View>
          </View>
          <View>
            <Text style={s.amount}>₹{item.amount}</Text>
            <View style={[s.statusBadge, { backgroundColor: meta.bg }]}>
              <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
        </View>

        {item.notes && (
          <View style={s.notesRow}>
            <Ionicons name="document-text-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.notesText} numberOfLines={1}>{item.notes}</Text>
          </View>
        )}

        {item.status === 'PENDING' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnPrimary]} onPress={() => handleAction(item, 'accept')}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={s.actionBtnTextPrimary}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnDanger]} onPress={() => handleAction(item, 'cancel')}>
              <Ionicons name="close" size={16} color={COLORS.error} />
              <Text style={s.actionBtnTextDanger}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'CONFIRMED' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnAccent]} onPress={() => handleAction(item, 'start')}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={s.actionBtnTextPrimary}>Start Job</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status === 'IN_PROGRESS' && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.actionBtn, s.actionBtnSuccess]} onPress={() => handleAction(item, 'complete')}>
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={s.actionBtnTextPrimary}>Mark Complete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Bookings</Text>
          <Text style={s.headerSub}>{bookings.filter(b => b.status === 'PENDING').length} pending</Text>
        </View>
      </View>

      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        renderItem={renderBooking}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={VENDOR_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.emptyTitle}>No bookings</Text>
            <Text style={s.emptyDesc}>No bookings match this filter</Text>
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
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  filterRow: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: VENDOR_COLORS.accent, borderColor: VENDOR_COLORS.accentDark },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  list: { padding: 12, gap: 8 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bookingIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  serviceName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  customerName: { fontSize: 12, color: COLORS.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  amount: { fontSize: 16, fontWeight: '800', color: COLORS.text, textAlign: 'right', marginBottom: 4 },
  statusBadge: { borderRadius: RADIUS.xs, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end' },
  statusText: { fontSize: 10, fontWeight: '700' },
  notesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  notesText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  actions: {
    flexDirection: 'row', gap: 8,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 10, borderRadius: RADIUS.md,
  },
  actionBtnPrimary: { backgroundColor: VENDOR_COLORS.accent },
  actionBtnAccent: { backgroundColor: '#7C3AED' },
  actionBtnSuccess: { backgroundColor: COLORS.success },
  actionBtnTextPrimary: { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnDanger: { backgroundColor: COLORS.errorLight, borderWidth: 1, borderColor: COLORS.error },
  actionBtnTextDanger: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
});
