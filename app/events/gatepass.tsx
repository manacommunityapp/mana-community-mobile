import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAppBack } from '@/hooks/useAppBack';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { format, parseISO } from 'date-fns';

export default function EventGatePassScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const eventId = Number(id);

  const { goBack } = useAppBack({
    fallbackRoute: id ? `/events/${id}` : '/events',
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getById(eventId),
    enabled: !!eventId,
  });

  const passCode = `EVT-${eventId}-${user?.id || 101}-${(eventId * 73) % 999}`;

  const handleSharePass = async () => {
    if (!event) return;
    await Share.share({
      message: `🎟️ Entry Pass for ${event.title}\nPasscode: ${passCode}\nAttendee: ${user?.fullName || user?.name || 'Resident'}\nVenue: ${event.venue || event.location || 'Community Center'}`,
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Digital Entry Ticket</Text>
        <TouchableOpacity onPress={handleSharePass} style={s.shareBtn}>
          <Ionicons name="share-social-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : !event ? (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>Event details unavailable</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.ticketCard}>
            {/* Top header */}
            <View style={s.ticketHeader}>
              <View style={s.badge}>
                <Text style={s.badgeText}>CONFIRMED ADMISSION</Text>
              </View>
              <Text style={s.eventTitle}>{event.title}</Text>
              <Text style={s.eventCategory}>{event.type || 'COMMUNITY EVENT'}</Text>
            </View>

            {/* Dotted divider */}
            <View style={s.dividerRow}>
              <View style={s.notchLeft} />
              <View style={s.dashLine} />
              <View style={s.notchRight} />
            </View>

            {/* Ticket body */}
            <View style={s.ticketBody}>
              <View style={s.infoGrid}>
                <View style={s.infoCell}>
                  <Text style={s.infoLabel}>DATE</Text>
                  <Text style={s.infoVal}>
                    {event.startDate ? format(parseISO(event.startDate), 'dd MMM yyyy') : 'TBD'}
                  </Text>
                </View>
                <View style={s.infoCell}>
                  <Text style={s.infoLabel}>TIME</Text>
                  <Text style={s.infoVal}>{event.startTime || 'TBD'}</Text>
                </View>
                <View style={s.infoCell}>
                  <Text style={s.infoLabel}>VENUE</Text>
                  <Text style={s.infoVal}>{event.venue || event.location || 'Main Club'}</Text>
                </View>
                <View style={s.infoCell}>
                  <Text style={s.infoLabel}>ATTENDEE</Text>
                  <Text style={s.infoVal}>{user?.fullName || user?.name || 'Resident'}</Text>
                </View>
              </View>

              {/* Passcode Box */}
              <View style={s.passBox}>
                <Text style={s.passLabel}>GATE ENTRY PASSCODE</Text>
                <Text style={s.passCodeText}>{passCode}</Text>
                <Text style={s.passInstruction}>Show this pass to security at the gate</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <TouchableOpacity style={s.shareActionBtn} onPress={handleSharePass}>
            <Ionicons name="share-outline" size={18} color="#fff" />
            <Text style={s.shareActionBtnText}>Share Ticket Pass</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: COLORS.text },
  shareBtn: { padding: 6 },
  content: { padding: 20 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 15, color: COLORS.textMuted },
  ticketCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    overflow: 'hidden', ...SHADOWS.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  ticketHeader: {
    backgroundColor: COLORS.primary, padding: 24, alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, marginBottom: 10,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  eventTitle: { fontSize: 20, fontFamily: 'Outfit-Bold', fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  eventCategory: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, height: 24 },
  notchLeft: { width: 14, height: 24, borderTopRightRadius: 12, borderBottomRightRadius: 12, backgroundColor: COLORS.background },
  dashLine: { flex: 1, borderBottomWidth: 2, borderBottomColor: COLORS.border, borderStyle: 'dashed' },
  notchRight: { width: 14, height: 24, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, backgroundColor: COLORS.background },
  ticketBody: { padding: 20 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  infoCell: { width: '50%' },
  infoLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  infoVal: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  passBox: {
    backgroundColor: '#F3F4F6', borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  passLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  passCodeText: { fontSize: 22, fontFamily: 'Outfit-Bold', fontWeight: '900', color: COLORS.primary, letterSpacing: 2, marginVertical: 6 },
  passInstruction: { fontSize: 11, color: COLORS.textMuted },
  shareActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md,
    marginTop: 20, gap: 8, ...SHADOWS.sm,
  },
  shareActionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
