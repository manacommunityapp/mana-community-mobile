import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/apiClient';
import { EventDto } from '@/types/api';
import { COLORS } from '@/constants/config';
import { format } from 'date-fns';

function EventCard({ event }: { event: EventDto }) {
  const qc = useQueryClient();
  const rsvpMutation = useMutation({
    mutationFn: () => api.post(`/events/${event.id}/rsvp`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  });

  return (
    <View style={styles.card}>
      <View style={styles.dateBox}>
        <Text style={styles.dateDay}>{format(new Date(event.startAt), 'dd')}</Text>
        <Text style={styles.dateMon}>{format(new Date(event.startAt), 'MMM')}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={styles.cardMeta}>📍 {event.venue}</Text>
        <Text style={styles.cardMeta}>🕐 {format(new Date(event.startAt), 'h:mm a')}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.rsvpCount}>{event.rsvpCount} going</Text>
          <TouchableOpacity
            style={[styles.rsvpBtn, event.rsvped && styles.rsvpBtnActive]}
            onPress={() => rsvpMutation.mutate()}
            disabled={rsvpMutation.isPending}
          >
            <Text style={[styles.rsvpBtnText, event.rsvped && styles.rsvpBtnTextActive]}>
              {event.rsvped ? '✓ Going' : 'RSVP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const { data: events = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await api.get<EventDto[]>('/events');
      return res.data;
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => String(e.id)}
          renderItem={({ item }) => <EventCard event={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No upcoming events.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.background },
  header:           { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle:      { fontSize: 20, fontWeight: '700', color: COLORS.text },
  list:             { padding: 12, gap: 12 },
  card:             { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 14, borderWidth: 1, borderColor: COLORS.border },
  dateBox:          { alignItems: 'center', justifyContent: 'center', width: 48, height: 56, backgroundColor: '#EEF2FF', borderRadius: 10 },
  dateDay:          { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  dateMon:          { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  cardBody:         { flex: 1, gap: 4 },
  cardTitle:        { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardMeta:         { fontSize: 13, color: COLORS.textMuted },
  cardFooter:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  rsvpCount:        { fontSize: 12, color: COLORS.textMuted },
  rsvpBtn:          { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 5 },
  rsvpBtnActive:    { backgroundColor: COLORS.primary },
  rsvpBtnText:      { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  rsvpBtnTextActive:{ color: '#fff' },
  empty:            { alignItems: 'center', paddingTop: 80 },
  emptyText:        { color: COLORS.textMuted, fontSize: 15 },
});
