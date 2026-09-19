import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { COLORS } from '@/constants/config';
import type { CommuteRideDto } from '@/types/api';

interface Props {
  ride: CommuteRideDto;
  compact?: boolean;
}

export function RideCard({ ride, compact }: Props) {
  const router = useRouter();

  const statusColor =
    ride.status === 'ACTIVE' ? COLORS.success :
    ride.status === 'FULL'   ? COLORS.warning :
    COLORS.textMuted;

  const isOffer = ride.rideType === 'OFFER';

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => router.push(`/commute/ride/${ride.id}`)}
    >
      {/* Header */}
      <View style={s.row}>
        <View style={[s.typeBadge, { backgroundColor: isOffer ? '#EEF2FF' : '#FEF3C7' }]}>
          <Text style={[s.typeText, { color: isOffer ? COLORS.primary : '#92400E' }]}>
            {isOffer ? '🚗 Offering' : '🙋 Requesting'}
          </Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[s.statusText, { color: statusColor }]}>{ride.status}</Text>
      </View>

      {/* Route */}
      <View style={s.routeWrap}>
        <View style={s.routeLine}>
          <View style={s.dotGreen} />
          <View style={s.dottedLine} />
          <View style={s.dotRed} />
        </View>
        <View style={s.routeTexts}>
          <Text style={s.locationText} numberOfLines={1}>{ride.fromLocation}</Text>
          <Text style={s.locationText} numberOfLines={1}>{ride.toLocation}</Text>
        </View>
      </View>

      {/* Details row */}
      <View style={s.detailsRow}>
        <Text style={s.detailItem}>
          🕐 {format(new Date(ride.departureTime), 'dd MMM, h:mm a')}
        </Text>
        <Text style={s.detailItem}>
          💺 {ride.availableSeats}/{ride.totalSeats} seats
        </Text>
        {!ride.free && ride.pricePerSeat != null && (
          <Text style={s.detailItem}>₹{ride.pricePerSeat}/seat</Text>
        )}
        {ride.free && <Text style={s.freeTag}>FREE</Text>}
      </View>

      {!compact && (
        <View style={s.footer}>
          <Text style={s.driverText}>
            {ride.driverName}{ride.driverFlat ? ` · ${ride.driverFlat}` : ''}
          </Text>
          {ride.vehicleType && (
            <Text style={s.vehicleText}>{ride.vehicleType}</Text>
          )}
          {ride.ladiesOnly && <Text style={s.ladiesTag}>Ladies Only</Text>}
          {ride.recurring && <Text style={s.recurringTag}>🔄 Recurring</Text>}
        </View>
      )}

      {ride.hasBooked && (
        <View style={s.bookedBanner}>
          <Text style={s.bookedText}>
            ✓ Booked · {ride.myBookingStatus}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:         { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge:    { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeText:     { fontSize: 12, fontWeight: '700' },
  statusDot:    { width: 7, height: 7, borderRadius: 4, marginLeft: 'auto' },
  statusText:   { fontSize: 11, fontWeight: '600' },
  routeWrap:    { flexDirection: 'row', gap: 10 },
  routeLine:    { alignItems: 'center', gap: 2, paddingVertical: 2 },
  dotGreen:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  dottedLine:   { width: 2, height: 20, backgroundColor: COLORS.border },
  dotRed:       { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.error },
  routeTexts:   { flex: 1, justifyContent: 'space-between' },
  locationText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  detailsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem:   { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  freeTag:      { fontSize: 11, fontWeight: '800', color: COLORS.success, backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  footer:       { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  driverText:   { fontSize: 12, color: COLORS.textMuted },
  vehicleText:  { fontSize: 12, color: COLORS.textMuted },
  ladiesTag:    { fontSize: 10, fontWeight: '700', color: '#DB2777', backgroundColor: '#FCE7F3', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  recurringTag: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  bookedBanner: { backgroundColor: '#EEF2FF', borderRadius: 8, padding: 8, alignItems: 'center' },
  bookedText:   { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});
