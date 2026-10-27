import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, TextInput, Alert, BackHandler, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { mobilityCarpoolService } from '@/services/mobilityService';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { MobilityOffer } from '@/types/mobility';

const QUICK_FILTERS = ['All', 'Metro Station', 'Tech Park', 'Airport', 'Mall'];

function OfferCard({ offer, onJoin, isJoining }: { offer: MobilityOffer; onJoin: (id: number) => void; isJoining: boolean }) {
  const depDate = new Date(offer.departureTime);
  const timeStr = depDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  
  const today = new Date();
  const isToday = depDate.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = depDate.toDateString() === tomorrow.toDateString();
  
  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : depDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  const seats = offer.availableSeats;
  const isFull = seats === 0;

  return (
    <View style={s.card}>
      {/* ── Top Header of Card ──────────────────────────────── */}
      <View style={s.cardTop}>
        <View style={s.driverAvatarWrap}>
          <View style={s.driverAvatar}>
            <Text style={s.avatarText}>
              {offer.driverName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={s.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={10} color="#059669" />
          </View>
        </View>

        <View style={s.driverInfo}>
          <Text style={s.driverName}>{offer.driverName}</Text>
          <View style={s.metaRow}>
            <View style={s.ratingBadge}>
              <Ionicons name="star" size={10} color="#F59E0B" />
              <Text style={s.ratingText}>{offer.rating.toFixed(1)}</Text>
            </View>
            {offer.vehicleModel && (
              <>
                <Text style={s.metaDot}>•</Text>
                <Text style={s.vehicleText} numberOfLines={1}>{offer.vehicleModel}</Text>
              </>
            )}
          </View>
        </View>

        <View style={s.departureTimeBlock}>
          <Text style={s.departureTimeText}>{timeStr}</Text>
          <View style={s.dateBadge}>
            <Text style={s.dateBadgeText}>{dateLabel}</Text>
          </View>
        </View>
      </View>

      <View style={s.cardDivider} />

      {/* ── Route Timeline ──────────────────────────────────── */}
      <View style={s.routeBlock}>
        <View style={s.routeRow}>
          <View style={s.originDotWrap}>
            <View style={s.originDot} />
          </View>
          <Text style={s.routeAddrText} numberOfLines={1}>{offer.origin}</Text>
        </View>

        <View style={s.routeTrackLine} />

        <View style={s.routeRow}>
          <View style={s.destDotWrap}>
            <Ionicons name="location" size={14} color="#EF4444" />
          </View>
          <Text style={s.routeAddrText} numberOfLines={1}>{offer.destination}</Text>
        </View>
      </View>

      <View style={s.cardDivider} />

      {/* ── Bottom Section: Price & Join ────────────────────── */}
      <View style={s.cardBottom}>
        <View style={s.seatsBlock}>
          <View style={[
            s.seatsPill,
            isFull ? s.seatsPillFull : seats === 1 ? s.seatsPillAmber : s.seatsPillGreen,
          ]}>
            <Ionicons
              name={isFull ? 'people' : 'person'}
              size={12}
              color={isFull ? '#6B7280' : seats === 1 ? '#D97706' : '#059669'}
            />
            <Text style={[
              s.seatsPillText,
              isFull ? s.seatsTextFull : seats === 1 ? s.seatsTextAmber : s.seatsTextGreen,
            ]}>
              {isFull ? 'Full' : `${seats} seat${seats > 1 ? 's' : ''} left`}
            </Text>
          </View>
        </View>

        <View style={s.priceBlock}>
          <Text style={s.priceNumber}>₹{offer.pricePerSeat}</Text>
          <Text style={s.priceSub}>/ seat</Text>
        </View>

        <TouchableOpacity
          style={[s.joinBtn, isFull && s.joinBtnDisabled]}
          onPress={() => !isFull && onJoin(offer.id)}
          activeOpacity={isFull ? 1 : 0.88}
          disabled={isFull || isJoining}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={s.joinBtnText}>{isFull ? 'Filled' : 'Join Ride'}</Text>
              {!isFull && <Ionicons name="arrow-forward" size={14} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CarpoolScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [joiningId, setJoiningId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => { router.back(); return true; });
      return () => sub.remove();
    }, [router]),
  );

  const querySearch = activeFilter !== 'All' ? activeFilter : search;

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['mobility-carpool-offers', querySearch],
    queryFn:  () => mobilityCarpoolService.getOffers(querySearch || undefined),
  });

  const joinMutation = useMutation({
    mutationFn: (offerId: number) => mobilityCarpoolService.joinOffer(offerId, 1),
    onMutate:   (id) => setJoiningId(id),
    onSuccess:  () => {
      setJoiningId(null);
      Alert.alert('Carpool Joined!', 'You have been confirmed for this ride. The driver will be notified.');
      refetch();
    },
    onError: () => {
      setJoiningId(null);
      Alert.alert('Could Not Join', 'Unable to reserve your seat. Please check availability and try again.');
    },
  });

  const offers = data?.content ?? [];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Modern Header ───────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Community Carpool</Text>
          <Text style={s.headerSub}>Share rides with verified neighbors</Text>
        </View>
        <TouchableOpacity
          style={s.offerBtn}
          onPress={() => router.push('/mobility/journeys/offer?journeyType=OFFICE' as any)}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.offerBtnText}>Offer</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ──────────────────────────────────────── */}
      <View style={s.searchContainer}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by destination (e.g. Hitec City)…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              if (activeFilter !== 'All') setActiveFilter('All');
            }}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Quick Filter Tags ────────────────────────────────── */}
      <View style={s.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {QUICK_FILTERS.map((f) => {
            const isSelected = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s.filterChip, isSelected && s.filterChipSelected]}
                onPress={() => {
                  setActiveFilter(f);
                  if (f !== 'All') setSearch('');
                }}
                activeOpacity={0.8}
              >
                <Text style={[s.filterChipText, isSelected && s.filterChipTextSelected]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Offers List or States ────────────────────────────── */}
      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Searching community carpools…</Text>
        </View>
      ) : error ? (
        <View style={s.centered}>
          <View style={s.errorIcon}>
            <Ionicons name="alert-circle-outline" size={36} color={COLORS.error} />
          </View>
          <Text style={s.errorTitle}>Could not load carpools</Text>
          <Text style={s.errorSub}>Please check your connection and retry.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()} activeOpacity={0.85}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : offers.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="people-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={s.emptyTitle}>No carpools scheduled</Text>
          <Text style={s.emptySub}>
            {search || activeFilter !== 'All'
              ? 'No rides match your search criteria. Try a different destination.'
              : 'Be the first to offer a carpool ride to your workplace or campus!'}
          </Text>
          <TouchableOpacity
            style={s.offerRideCta}
            onPress={() => router.push('/mobility/journeys/offer?journeyType=OFFICE' as any)}
            activeOpacity={0.88}
          >
            <Ionicons name="car-outline" size={16} color="#fff" />
            <Text style={s.offerRideCtaText}>Offer a Ride</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              onJoin={(id) => joinMutation.mutate(id)}
              isJoining={joiningId === item.id}
            />
          )}
          contentContainerStyle={s.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={s.footer}>
              <Text style={s.footerNote}>
                {data?.totalElements ?? offers.length} active community carpools available
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Header ─────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  offerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...SHADOWS.sm,
  },
  offerBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#fff',
  },

  // ── Search & Filter ────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    ...SHADOWS.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  filtersRow: {
    paddingBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  filterChipTextSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },

  // ── List ───────────────────────────────────────────────────
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },

  // ── Offer Card ─────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverAvatarWrap: {
    position: 'relative',
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 1,
    ...SHADOWS.sm,
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    fontSize: 14.5,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  ratingText: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    color: '#D97706',
  },
  metaDot: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  vehicleText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  departureTimeBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  departureTimeText: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  dateBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  dateBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#2563EB',
  },

  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  // ── Route Block ────────────────────────────────────────────
  routeBlock: {
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  originDotWrap: {
    width: 16,
    alignItems: 'center',
  },
  originDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
  },
  destDotWrap: {
    width: 16,
    alignItems: 'center',
  },
  routeTrackLine: {
    width: 2,
    height: 10,
    backgroundColor: COLORS.border,
    marginLeft: 7,
  },
  routeAddrText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },

  // ── Card Bottom ────────────────────────────────────────────
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seatsBlock: {
    flex: 1,
  },
  seatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  seatsPillGreen: {
    backgroundColor: '#ECFDF5',
  },
  seatsPillAmber: {
    backgroundColor: '#FFFBEB',
  },
  seatsPillFull: {
    backgroundColor: '#F3F4F6',
  },
  seatsPillText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  seatsTextGreen: {
    color: '#059669',
  },
  seatsTextAmber: {
    color: '#D97706',
  },
  seatsTextFull: {
    color: '#6B7280',
  },
  priceBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceNumber: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  priceSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...SHADOWS.primary,
  },
  joinBtnDisabled: {
    backgroundColor: '#E2E8F0',
    elevation: 0,
    shadowOpacity: 0,
  },
  joinBtnText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },

  // ── States ─────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 16.5,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
  },
  errorSub: {
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  offerRideCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 8,
    ...SHADOWS.primary,
  },
  offerRideCtaText: {
    color: '#fff',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
});
