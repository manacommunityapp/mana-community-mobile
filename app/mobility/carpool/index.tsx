import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { mobilityCarpoolService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityOffer } from '@/types/mobility';

function OfferCard({ offer, onJoin }: { offer: MobilityOffer; onJoin: (id: number) => void }) {
  const time  = new Date(offer.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const date  = new Date(offer.departureTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const seats = offer.availableSeats;
  const isFull = seats === 0;

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.driverAvatar}>
          <Text style={s.avatarText}>
            {offer.driverName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={s.driverInfo}>
          <Text style={s.driverName}>{offer.driverName}</Text>
          <View style={s.ratingRow}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={s.ratingText}>{offer.rating.toFixed(1)}</Text>
            {offer.vehicleModel && (
              <>
                <Text style={s.dot}>·</Text>
                <Text style={s.vehicleText}>{offer.vehicleModel}</Text>
              </>
            )}
          </View>
        </View>
        <View style={s.timeBlock}>
          <Text style={s.timeText}>{time}</Text>
          <Text style={s.dateText}>{date}</Text>
        </View>
      </View>

      <View style={s.routeBlock}>
        <View style={s.routeRow}>
          <View style={[s.routeDot, { backgroundColor: '#10B981' }]} />
          <Text style={s.routeAddr} numberOfLines={1}>{offer.origin}</Text>
        </View>
        <View style={s.routeLine} />
        <View style={s.routeRow}>
          <View style={[s.routeDot, { backgroundColor: '#EF4444' }]} />
          <Text style={s.routeAddr} numberOfLines={1}>{offer.destination}</Text>
        </View>
      </View>

      <View style={s.cardBottom}>
        <View style={s.seatsRow}>
          <Ionicons name="person" size={13} color={seats > 0 ? '#059669' : COLORS.textMuted} />
          <Text style={[s.seatsText, isFull && s.seatsTextFull]}>
            {isFull ? 'Full' : `${seats} seat${seats > 1 ? 's' : ''} left`}
          </Text>
        </View>
        <Text style={s.priceText}>₹{offer.pricePerSeat} / seat</Text>
        <TouchableOpacity
          style={[s.joinBtn, isFull && s.joinBtnDisabled]}
          onPress={() => !isFull && onJoin(offer.id)}
          activeOpacity={isFull ? 1 : 0.85}
        >
          <Text style={s.joinBtnText}>{isFull ? 'Full' : 'Join'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CarpoolScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.back(); return true; });
      return () => sub.remove();
    }, [router]),
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['mobility-carpool-offers', search],
    queryFn:  () => mobilityCarpoolService.getOffers(search || undefined),
  });

  const joinMutation = useMutation({
    mutationFn: (offerId: number) => mobilityCarpoolService.joinOffer(offerId, 1),
    onSuccess:  () => {
      Alert.alert('Joined!', "You've joined the carpool. The driver will be notified.");
      refetch();
    },
    onError: () => Alert.alert('Error', 'Could not join this carpool. Please try again.'),
  });

  const offers = data?.content ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Community Carpool</Text>
          <Text style={s.headerSub}>Share rides with neighbors</Text>
        </View>
        <TouchableOpacity
          style={s.offerHeaderBtn}
          onPress={() => Alert.alert('Offer Ride', 'Create carpool offer — coming in next update')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.offerHeaderBtnText}>Offer</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by destination…"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error ? (
        <View style={s.centered}>
          <Ionicons name="alert-circle-outline" size={36} color={COLORS.error} />
          <Text style={s.errorText}>Failed to load rides</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : offers.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="people-outline" size={36} color={COLORS.primary} />
          </View>
          <Text style={s.emptyTitle}>No carpools available</Text>
          <Text style={s.emptySubtitle}>
            {search ? 'No rides match your search' : 'Be the first to offer a ride in your community!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              onJoin={(id) => joinMutation.mutate(id)}
            />
          )}
          contentContainerStyle={s.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Text style={s.footerNote}>{data?.totalElements ?? 0} rides available</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },

  header:          {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12, ...SHADOWS.sm,
  },
  backBtn:         {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerCenter:    { flex: 1 },
  headerTitle:     { fontSize: 17, fontFamily: FONTS.displayBold, color: COLORS.text },
  headerSub:       { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.medium, marginTop: 1 },
  offerHeaderBtn:  {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 6, ...SHADOWS.sm,
  },
  offerHeaderBtnText: { fontSize: 12, fontFamily: FONTS.bold, color: '#fff' },

  searchBar:       {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, margin: 14, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, ...SHADOWS.sm,
  },
  searchInput:     { flex: 1, height: 42, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text },

  list:            { paddingHorizontal: 14, paddingBottom: 32, gap: 12 },

  card:            {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    gap: 10, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardTop:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  driverAvatar:    {
    width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:      { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  driverInfo:      { flex: 1 },
  driverName:      { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
  ratingRow:       { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingText:      { fontSize: 11.5, fontFamily: FONTS.semiBold, color: COLORS.text },
  dot:             { color: COLORS.textMuted },
  vehicleText:     { fontSize: 11.5, color: COLORS.textMuted, fontFamily: FONTS.regular },
  timeBlock:       { alignItems: 'flex-end' },
  timeText:        { fontSize: 15, fontFamily: FONTS.displayBold, color: COLORS.text },
  dateText:        { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular },

  routeBlock:      { gap: 3 },
  routeRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot:        { width: 8, height: 8, borderRadius: 4 },
  routeLine:       { width: 1.5, height: 10, backgroundColor: COLORS.border, marginLeft: 3.25 },
  routeAddr:       { flex: 1, fontSize: 13, color: COLORS.text, fontFamily: FONTS.regular },

  cardBottom:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seatsRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  seatsText:       { fontSize: 12, color: '#059669', fontFamily: FONTS.semiBold },
  seatsTextFull:   { color: COLORS.textMuted },
  priceText:       { fontSize: 14, fontFamily: FONTS.displayBold, color: COLORS.text },
  joinBtn:         {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  joinBtnDisabled: { backgroundColor: COLORS.surfaceAlt },
  joinBtnText:     { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },

  footerNote:      { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular, padding: 12 },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText:       { color: COLORS.error, fontFamily: FONTS.semiBold, fontSize: 15 },
  retryBtn:        { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:       { color: '#fff', fontFamily: FONTS.bold, fontSize: 13 },
  emptyIcon:       { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:      { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text },
  emptySubtitle:   { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular, textAlign: 'center' },
});
