import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsService, TripBookingDto } from '@/services/tripsService';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';

export default function TripRosterScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ tripId: string; tripTitle?: string }>();
  const tripId = params.tripId || 'trip-1';
  const tripTitle = params.tripTitle || 'Community Trip';

  const [search, setSearch] = useState('');
  const [manualCode, setManualCode] = useState('');

  const { data: manifest = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['trip-manifest', tripId],
    queryFn: () => tripsService.getManifest(tripId),
  });

  const checkInMutation = useMutation({
    mutationFn: (bookingId: string) => tripsService.checkInPassenger(bookingId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['trip-manifest', tripId] });
      Alert.alert('Checked In ✅', `Passenger confirmed on boarding manifest.`);
    },
    onError: () => Alert.alert('Check-in Error', 'Could not update boarding status.'),
  });

  const totalSeats = manifest.reduce((s, b) => s + (b.participantCount || 1), 0);
  const totalCheckedIn = manifest.filter(b => b.attendance?.checkedIn).reduce((s, b) => s + (b.participantCount || 1), 0);

  const filtered = manifest.filter((b) => {
    const q = search.toLowerCase();
    const matchesName = (b.host || '').toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
    const matchesPax = (b.passengers || []).some(p => p.name.toLowerCase().includes(q));
    const matchesQR = (b.boardingPassQR || '').toLowerCase().includes(q);
    return !search || matchesName || matchesPax || matchesQR;
  });

  const handleManualVerify = () => {
    if (!manualCode.trim()) return;
    const target = manifest.find(b =>
      b.boardingPassQR?.toLowerCase().trim() === manualCode.toLowerCase().trim() ||
      b.id.toLowerCase().trim() === manualCode.toLowerCase().trim()
    );

    if (target) {
      checkInMutation.mutate(target.id);
      setManualCode('');
    } else {
      Alert.alert('Invalid QR Token', 'No confirmed booking found matching this code.');
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>Passenger Roster</Text>
          <Text style={s.headerSub} numberOfLines={1}>{tripTitle}</Text>
        </View>
      </View>

      {/* Roster Stats Bar */}
      <View style={s.statsStrip}>
        <View style={s.statBox}>
          <Text style={s.statVal}>{totalSeats}</Text>
          <Text style={s.statLabel}>Total Booked</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: '#059669' }]}>{totalCheckedIn}</Text>
          <Text style={s.statLabel}>Boarded</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: '#D97706' }]}>{Math.max(0, totalSeats - totalCheckedIn)}</Text>
          <Text style={s.statLabel}>Pending</Text>
        </View>
      </View>

      {/* QR / Token Fast Verify Box */}
      <View style={s.scanBox}>
        <Ionicons name="qr-code-outline" size={20} color={COLORS.primary} />
        <TextInput
          style={s.scanInput}
          placeholder="Enter or scan 6-digit Boarding Code..."
          placeholderTextColor={COLORS.textMuted}
          value={manualCode}
          onChangeText={setManualCode}
        />
        <TouchableOpacity
          style={s.verifyBtn}
          onPress={handleManualVerify}
          disabled={!manualCode.trim() || checkInMutation.isPending}
        >
          <Text style={s.verifyBtnText}>Check In</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={s.searchBar}>
        <Ionicons name="search" size={16} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Filter by passenger name or unit..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Passenger List */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Loading manifest roster…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item: booking }) => {
            const isCheckedIn = !!booking.attendance?.checkedIn;

            return (
              <View style={s.passengerCard}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.paxName}>
                      {booking.passengers?.[0]?.name || booking.host || 'Resident Member'}
                    </Text>
                    <Text style={s.paxId}>Pass: {booking.boardingPassQR || booking.id}</Text>
                  </View>

                  <TouchableOpacity
                    style={[s.statusBtn, isCheckedIn ? s.statusBtnChecked : s.statusBtnPending]}
                    onPress={() => checkInMutation.mutate(booking.id)}
                    disabled={checkInMutation.isPending}
                  >
                    <Ionicons
                      name={isCheckedIn ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={isCheckedIn ? '#059669' : '#6B7280'}
                    />
                    <Text style={[s.statusBtnText, isCheckedIn && { color: '#059669' }]}>
                      {isCheckedIn ? 'Boarded' : 'Check In'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Co-passengers and pickup info */}
                <View style={s.cardDetails}>
                  <Text style={s.detailText}>
                    👥 {booking.participantCount || 1} Passenger(s) • 🚏 {booking.selectedPickupPoint || 'Main Gate'}
                  </Text>
                  {booking.passengers?.[0]?.emergencyPhone && (
                    <Text style={s.detailText}>
                      📞 Emergency: {booking.passengers[0].emergencyPhone}
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={36} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Passengers Found</Text>
              <Text style={s.emptySub}>No bookings match your search query for this trip.</Text>
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
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontFamily: FONTS.regular,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  scanBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 8,
  },
  scanInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  passengerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    gap: 8,
    ...SHADOWS.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paxName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  paxId: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
    marginTop: 1,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusBtnChecked: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusBtnPending: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  cardDetails: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: RADIUS.sm,
    gap: 2,
  },
  detailText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
