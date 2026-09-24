import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { format, parseISO, isPast } from 'date-fns';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: event, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getById(Number(id)),
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: () => eventService.register(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: () => eventService.unregister(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const handleRegister = () => {
    if (event?.isRegistered) {
      Alert.alert('Cancel Registration', 'Are you sure you want to unregister?', [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => unregisterMutation.mutate() },
      ]);
    } else {
      registerMutation.mutate();
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const dateStr = event.startDate ? format(parseISO(event.startDate), 'MMM d, yyyy') : '';
    await Share.share({
      message: `${event.title}\n${dateStr} at ${event.venue || event.location || 'TBD'}\nJoin us at Mana Community!`,
    });
  };

  const formatEventDate = useCallback((dateStr?: string) => {
    if (!dateStr) return '';
    try { return format(parseISO(dateStr), 'EEE, MMM d, yyyy'); } catch { return dateStr; }
  }, []);

  const formatEventTime = useCallback((timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${hour % 12 || 12}:${m} ${ampm}`;
    } catch { return timeStr; }
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 100 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Event Not Found</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isExpired = event.registrationDeadline ? isPast(parseISO(event.registrationDeadline)) : false;
  const isFull = event.maxAttendees ? event.registrationCount >= event.maxAttendees : false;
  const canRegister = !isExpired && !isFull && event.status !== 'CANCELLED' && event.status !== 'COMPLETED';
  const isOwner = user?.id === event.createdById;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Event Details</Text>
        <TouchableOpacity onPress={handleShare} style={s.backBtn} hitSlop={8}>
          <Ionicons name="share-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="calendar" size={36} color={COLORS.primary} />
          </View>
          {event.status === 'CANCELLED' && (
            <View style={s.cancelledBadge}>
              <Text style={s.cancelledText}>CANCELLED</Text>
            </View>
          )}
        </View>

        {/* Title & Type */}
        <View style={s.titleSection}>
          <Text style={s.title}>{event.title}</Text>
          <View style={s.tagsRow}>
            {event.type && (
              <View style={s.tag}>
                <Text style={s.tagText}>{event.type}</Text>
              </View>
            )}
            {event.category && (
              <View style={[s.tag, { backgroundColor: COLORS.successLight }]}>
                <Text style={[s.tagText, { color: '#065F46' }]}>{event.category}</Text>
              </View>
            )}
            {event.priceType && (
              <View style={[s.tag, { backgroundColor: event.priceType === 'FREE' ? COLORS.successLight : COLORS.warningLight }]}>
                <Text style={[s.tagText, { color: event.priceType === 'FREE' ? '#065F46' : '#92400E' }]}>
                  {event.priceType === 'FREE' ? 'Free' : event.price ? `₹${event.price}` : 'Paid'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Cards */}
        <View style={s.infoCards}>
          {/* Date & Time */}
          <View style={s.infoCard}>
            <View style={s.infoIconWrap}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Date & Time</Text>
              <Text style={s.infoValue}>{formatEventDate(event.startDate)}</Text>
              <Text style={s.infoSub}>
                {formatEventTime(event.startTime)}
                {event.endTime ? ` - ${formatEventTime(event.endTime)}` : ''}
              </Text>
              {event.endDate && event.endDate !== event.startDate && (
                <Text style={s.infoSub}>to {formatEventDate(event.endDate)}</Text>
              )}
            </View>
          </View>

          {/* Venue */}
          <View style={s.infoCard}>
            <View style={s.infoIconWrap}>
              <Ionicons name="location-outline" size={20} color={COLORS.error} />
            </View>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Location</Text>
              <Text style={s.infoValue}>{event.venue || event.location || 'TBD'}</Text>
              {event.city && <Text style={s.infoSub}>{event.city}</Text>}
              {event.locationType && (
                <View style={[s.tag, { marginTop: 4, backgroundColor: COLORS.infoLight }]}>
                  <Text style={[s.tagText, { color: '#1E40AF' }]}>{event.locationType}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Organizer */}
          <View style={s.infoCard}>
            <View style={s.infoIconWrap}>
              <Ionicons name="person-outline" size={20} color={COLORS.warning} />
            </View>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Organizer</Text>
              <Text style={s.infoValue}>{event.organizerName || event.createdByName}</Text>
              {event.organizerContact && (
                <Text style={s.infoSub}>{event.organizerContact}</Text>
              )}
            </View>
          </View>

          {/* Registration Stats */}
          <View style={s.infoCard}>
            <View style={s.infoIconWrap}>
              <Ionicons name="people-outline" size={20} color={COLORS.success} />
            </View>
            <View style={s.infoContent}>
              <Text style={s.infoLabel}>Registrations</Text>
              <Text style={s.infoValue}>
                {event.registrationCount || event.attendees || 0}
                {event.maxAttendees ? ` / ${event.maxAttendees}` : ''} registered
              </Text>
              {event.registrationDeadline && (
                <Text style={s.infoSub}>
                  Deadline: {formatEventDate(event.registrationDeadline)}
                </Text>
              )}
              {isFull && <Text style={[s.infoSub, { color: COLORS.error }]}>Event is full</Text>}
            </View>
          </View>
        </View>

        {/* Description */}
        {event.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About this event</Text>
            <Text style={s.description}>{event.description}</Text>
          </View>
        )}

        {/* Notes */}
        {event.notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.description}>{event.notes}</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Register Button */}
      <View style={s.bottomBar}>
        {isOwner ? (
          <TouchableOpacity
            style={[s.registerBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => router.push(`/events/create?editId=${id}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={s.registerBtnText}>Edit Event</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              s.registerBtn,
              event.isRegistered && s.registeredBtn,
              !canRegister && !event.isRegistered && s.disabledBtn,
            ]}
            onPress={handleRegister}
            disabled={!canRegister && !event.isRegistered}
            activeOpacity={0.8}
          >
            <Ionicons
              name={event.isRegistered ? 'checkmark-circle' : 'add-circle-outline'}
              size={20}
              color={event.isRegistered ? '#065F46' : '#fff'}
            />
            <Text style={[s.registerBtnText, event.isRegistered && s.registeredBtnText]}>
              {event.isRegistered ? 'Registered' : isFull ? 'Event Full' : isExpired ? 'Registration Closed' : 'Register Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  headerTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  scroll: { padding: 16 },
  banner: {
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.lg, padding: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 100,
  },
  bannerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.md },
  cancelledBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: COLORS.error, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  cancelledText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  titleSection: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8, letterSpacing: -0.3 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  infoCards: { gap: 10, marginBottom: 16 },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  infoIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  infoSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  description: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
    ...SHADOWS.lg,
  },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14,
  },
  registeredBtn: { backgroundColor: COLORS.successLight, borderWidth: 1.5, borderColor: COLORS.success },
  disabledBtn: { backgroundColor: COLORS.textMuted, opacity: 0.6 },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registeredBtnText: { color: '#065F46' },
});
