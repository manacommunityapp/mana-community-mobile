import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  FlatList, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { EVENT_ADMIN_COLORS } from '@/constants/eventAdminTheme';
import { eventAdminService, type EventVenue } from '@/services/eventAdminService';

export default function VenuesScreen() {
  const [venues, setVenues] = useState<EventVenue[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const data = await eventAdminService.getVenues();
    setVenues(data);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: EventVenue }) => {
    const isAvailable = item.isAvailable;
    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={[s.venueIcon, { backgroundColor: EVENT_ADMIN_COLORS.accentLight }]}>
            <Ionicons
              name={item.type === 'Indoor' ? 'business' : 'sunny'}
              size={20}
              color={EVENT_ADMIN_COLORS.accent}
            />
          </View>
          <View style={s.venueInfo}>
            <Text style={s.venueName}>{item.name}</Text>
            {item.type && <Text style={s.venueType}>{item.type}</Text>}
          </View>
          <View style={[s.availBadge, { backgroundColor: isAvailable ? '#D1FAE5' : '#FEE2E2' }]}>
            <View style={[s.availDot, { backgroundColor: isAvailable ? '#059669' : '#DC2626' }]} />
            <Text style={[s.availText, { color: isAvailable ? '#059669' : '#DC2626' }]}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>
        <View style={s.detailsRow}>
          {item.capacity != null && (
            <View style={s.detailItem}>
              <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
              <Text style={s.detailText}>Capacity: {item.capacity}</Text>
            </View>
          )}
          {item.location && (
            <View style={s.detailItem}>
              <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
              <Text style={s.detailText}>{item.location}</Text>
            </View>
          )}
        </View>
        {item.amenities && item.amenities.length > 0 && (
          <View style={s.amenitiesRow}>
            {item.amenities.map(a => (
              <View key={a} style={s.amenityChip}>
                <Text style={s.amenityText}>{a}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Venues</Text>
        <Text style={s.headerSub}>
          {venues.filter(v => v.isAvailable).length} of {venues.length} available
        </Text>
      </View>
      <FlatList
        data={venues}
        keyExtractor={v => String(v.id)}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EVENT_ADMIN_COLORS.accent} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="location-outline" size={48} color={COLORS.border} />
            <Text style={s.emptyText}>No venues found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  list: { paddingHorizontal: 12, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  venueIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  venueInfo: { flex: 1 },
  venueName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  venueType: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 10, fontWeight: '700' },

  detailsRow: { gap: 6, marginBottom: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: COLORS.textMuted },

  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  amenityChip: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.xs,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  amenityText: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
