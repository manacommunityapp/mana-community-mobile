import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { commuteService } from '@/services/commuteService';
import { RideCard } from '@/components/commute/RideCard';
import { COLORS } from '@/constants/config';

type Tab = 'offers' | 'bookings';

export default function MyRidesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('offers');

  const { data: offersPage, isLoading: loadingOffers } = useQuery({
    queryKey: ['commute-my-offers'],
    queryFn:  () => commuteService.getMyOffers(),
    enabled:  tab === 'offers',
  });

  const { data: bookingsPage, isLoading: loadingBookings } = useQuery({
    queryKey: ['commute-my-bookings'],
    queryFn:  () => commuteService.getMyBookings(),
    enabled:  tab === 'bookings',
  });

  const rides = tab === 'offers'
    ? (offersPage?.content ?? [])
    : (bookingsPage?.content ?? []);
  const isLoading = tab === 'offers' ? loadingOffers : loadingBookings;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Rides</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, tab === 'offers' && s.tabActive]}
          onPress={() => setTab('offers')}
        >
          <Text style={[s.tabText, tab === 'offers' && s.tabTextActive]}>My Offers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'bookings' && s.tabActive]}
          onPress={() => setTab('bookings')}
        >
          <Text style={[s.tabText, tab === 'bookings' && s.tabTextActive]}>My Bookings</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <RideCard ride={item} />}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>{tab === 'offers' ? '🚗' : '🎫'}</Text>
              <Text style={s.emptyText}>
                {tab === 'offers'
                  ? 'You haven\'t offered any rides yet.'
                  : 'You haven\'t booked any rides yet.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:       { fontSize: 15, color: COLORS.primary, fontWeight: '600' },
  headerTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text },
  tabRow:        { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:           { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { borderBottomColor: COLORS.primary },
  tabText:       { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  list:          { padding: 16 },
  empty:         { padding: 40, alignItems: 'center', gap: 8 },
  emptyIcon:     { fontSize: 40 },
  emptyText:     { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
