import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import type { EventDto } from '@/types/api';
import { format, parseISO } from 'date-fns';

type Tab = 'registered' | 'created';

export default function MyEventsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('registered');

  const { data: myEvents = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: eventService.getMyEvents,
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: eventService.getAllEvents,
  });

  const registeredEvents = allEvents.filter(e => e.isRegistered);
  const createdEvents = myEvents;
  const events = tab === 'registered' ? registeredEvents : createdEvents;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try { return format(parseISO(dateStr), 'MMM d, yyyy'); } catch { return dateStr; }
  };

  const renderEvent = ({ item }: { item: EventDto }) => (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(`/events/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={s.cardLeft}>
        <View style={[s.typeIcon, { backgroundColor: COLORS.primaryLight }]}>
          <Ionicons name="calendar" size={20} color={COLORS.primary} />
        </View>
      </View>
      <View style={s.cardContent}>
        <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={s.cardMeta}>
          <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
          <Text style={s.cardMetaText}>{formatDate(item.startDate)}</Text>
        </View>
        {(item.venue || item.location) && (
          <View style={s.cardMeta}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.cardMetaText} numberOfLines={1}>{item.venue || item.location}</Text>
          </View>
        )}
      </View>
      <View style={s.cardRight}>
        {item.status && (
          <View style={[s.statusBadge, item.status === 'CANCELLED' && { backgroundColor: COLORS.errorLight }]}>
            <Text style={[s.statusText, item.status === 'CANCELLED' && { color: COLORS.error }]}>
              {item.status === 'UPCOMING' ? 'Upcoming' : item.status === 'ONGOING' ? 'Live' : item.status === 'CANCELLED' ? 'Cancelled' : item.status}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Events</Text>
        <TouchableOpacity onPress={() => router.push('/events/create')} style={s.backBtn} hitSlop={8}>
          <Ionicons name="add" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tab, tab === 'registered' && s.tabActive]}
          onPress={() => setTab('registered')}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color={tab === 'registered' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[s.tabText, tab === 'registered' && s.tabTextActive]}>Registered</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === 'created' && s.tabActive]}
          onPress={() => setTab('created')}
        >
          <Ionicons name="create-outline" size={16} color={tab === 'created' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[s.tabText, tab === 'created' && s.tabTextActive]}>Created by Me</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => String(item.id)}
          renderItem={renderEvent}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No events yet</Text>
              <Text style={s.emptyDesc}>
                {tab === 'registered' ? "You haven't registered for any events." : "You haven't created any events yet."}
              </Text>
              {tab === 'created' && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/events/create')}>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={s.emptyBtnText}>Create Event</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  tabs: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 16,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  cardLeft: {},
  typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardMetaText: { fontSize: 13, color: COLORS.textMuted },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10, marginTop: 16,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
