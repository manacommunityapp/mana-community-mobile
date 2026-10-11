import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAppBack } from '@/hooks/useAppBack';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { parseISO, isPast } from 'date-fns';

type PassFilter = 'ALL' | 'ACTIVE' | 'EXPIRED';

export default function EventPassesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { goBack } = useAppBack({ fallbackRoute: '/tabs/events' });
  const [filter, setFilter] = useState<PassFilter>('ACTIVE');

  const { data: allEvents = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: eventService.getAllEvents,
  });

  const registeredEvents = allEvents.filter(e => e.isRegistered || (e as any).rsvped);

  const passes = registeredEvents.map(ev => {
    const isEventPast = ev.startDate ? isPast(parseISO(ev.startDate)) : false;
    const isCancelled = ev.status === 'CANCELLED';
    const status = isCancelled ? 'CANCELLED' : isEventPast ? 'EXPIRED' : 'ACTIVE';
    const passCode = `EVT-${ev.id}-${user?.id || 101}-${(ev.id * 73) % 999}`;
    return {
      id: String(ev.id),
      eventId: ev.id,
      title: ev.title,
      type: ev.type,
      startDate: ev.startDate,
      startTime: ev.startTime,
      venue: ev.venue || ev.location || 'Community Center',
      passCode,
      status,
      attendees: (ev as any).devoteeCount || 1,
    };
  });

  const filteredPasses = passes.filter(p => {
    if (filter === 'ACTIVE') return p.status === 'ACTIVE';
    if (filter === 'EXPIRED') return p.status === 'EXPIRED' || p.status === 'CANCELLED';
    return true;
  });

  const handleShare = async (pass: any) => {
    await Share.share({
      message: `🎟️ Entry Pass: ${pass.title}\nPasscode: ${pass.passCode}\nVenue: ${pass.venue}\nDate: ${pass.startDate}`,
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Event Passes</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {(['ACTIVE', 'ALL', 'EXPIRED'] as PassFilter[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.filterChip, filter === tab && s.filterChipActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[s.filterChipText, filter === tab && s.filterChipTextActive]}>
              {tab === 'ACTIVE' ? 'Active Passes' : tab === 'ALL' ? 'All' : 'Past & Used'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : filteredPasses.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 44 }}>🎟️</Text>
          <Text style={s.emptyTitle}>No passes found</Text>
          <Text style={s.emptyDesc}>
            {filter === 'ACTIVE'
              ? 'You do not have any active entry passes right now.'
              : 'No past passes recorded.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPasses}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <View style={s.ticketCard}>
              <View style={s.ticketHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.ticketType}>{item.type || 'COMMUNITY EVENT'}</Text>
                  <Text style={s.ticketTitle} numberOfLines={2}>{item.title}</Text>
                </View>
                <View style={[s.statusBadge, item.status === 'ACTIVE' ? s.badgeActive : s.badgeExpired]}>
                  <Text style={[s.statusText, item.status === 'ACTIVE' ? s.textActive : s.textExpired]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={s.ticketDivider}>
                <View style={s.notchLeft} />
                <View style={s.dashedLine} />
                <View style={s.notchRight} />
              </View>

              <View style={s.ticketBody}>
                <View style={s.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>DATE & TIME</Text>
                    <Text style={s.infoValue}>{item.startDate} {item.startTime || ''}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={s.infoLabel}>VENUE</Text>
                    <Text style={s.infoValue} numberOfLines={1}>{item.venue}</Text>
                  </View>
                </View>

                <View style={s.qrSection}>
                  <View style={s.qrBox}>
                    <Ionicons name="qr-code-outline" size={52} color={COLORS.text} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={s.passCodeLabel}>ENTRY PASSCODE</Text>
                    <Text style={s.passCodeValue}>{item.passCode}</Text>
                    <Text style={s.passNotice}>Show at security / venue check-in desk</Text>
                  </View>
                </View>

                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={s.viewEventBtn}
                    onPress={() => router.push(`/events/${item.eventId}` as any)}
                  >
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={s.viewEventText}>Event Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.shareBtn}
                    onPress={() => handleShare(item)}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#475569" />
                    <Text style={s.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
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
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterChipTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 40 },
  ticketCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, marginBottom: 16,
    ...SHADOWS.md, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0',
  },
  ticketHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticketType: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5, marginBottom: 2 },
  ticketTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#ECFDF5' },
  badgeExpired: { backgroundColor: '#F1F5F9' },
  statusText: { fontSize: 11, fontWeight: '800' },
  textActive: { color: '#059669' },
  textExpired: { color: '#64748B' },
  ticketDivider: { height: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  notchLeft: { width: 14, height: 20, borderTopRightRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#F8FAFC', marginLeft: -2 },
  dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed' },
  notchRight: { width: 14, height: 20, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, backgroundColor: '#F8FAFC', marginRight: -2 },
  ticketBody: { padding: 16, paddingTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  infoLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  qrSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: RADIUS.md, marginBottom: 14 },
  qrBox: { width: 64, height: 64, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  passCodeLabel: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  passCodeValue: { fontSize: 14, fontWeight: '900', color: COLORS.primary, letterSpacing: 0.5, marginTop: 2 },
  passNotice: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10 },
  viewEventBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#EEF2FF', borderRadius: RADIUS.md },
  viewEventText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: RADIUS.md },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  emptyState: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 },
});
