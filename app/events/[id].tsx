import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, FONTS, SPACING } from '@/constants/config';
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

const TYPE_THEME: Record<string, { color: string; bg: string; gradient: [string, string] }> = {
  SPORTS:    { color: '#059669', bg: '#ECFDF5', gradient: ['#059669', '#10B981'] },
  SOCIAL:    { color: '#2563EB', bg: '#EFF6FF', gradient: ['#2563EB', '#3B82F6'] },
  CULTURAL:  { color: '#7C3AED', bg: '#F5F3FF', gradient: ['#7C3AED', '#8B5CF6'] },
  WORKSHOP:  { color: '#4F46E5', bg: '#EEF2FF', gradient: ['#4F46E5', '#6366F1'] },
  RELIGIOUS: { color: '#DC2626', bg: '#FEF2F2', gradient: ['#DC2626', '#EF4444'] },
  MEETING:   { color: '#0891B2', bg: '#ECFEFF', gradient: ['#0891B2', '#06B6D4'] },
  COMMUNITY: { color: '#4F46E5', bg: '#EEF2FF', gradient: ['#4F46E5', '#6366F1'] },
};

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
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.navBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Event Not Found</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.loadingWrap}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.emptyTitle}>This event doesn't exist</Text>
          <Text style={s.emptyDesc}>It may have been removed or the link is incorrect.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const theme = TYPE_THEME[event.type] ?? { color: COLORS.primary, bg: COLORS.primaryLight, gradient: GRADIENTS.primary };
  const isExpired = event.registrationDeadline ? isPast(parseISO(event.registrationDeadline)) : false;
  const isFull = event.maxAttendees ? event.registrationCount >= event.maxAttendees : false;
  const canRegister = !isExpired && !isFull && event.status !== 'CANCELLED' && event.status !== 'COMPLETED';
  const isOwner = user?.id === event.createdById;
  const dateIsToday = event.startDate ? isToday(parseISO(event.startDate)) : false;
  const dateIsTomorrow = event.startDate ? isTomorrow(parseISO(event.startDate)) : false;
  const daysAway = event.startDate ? differenceInDays(parseISO(event.startDate), new Date()) : -1;
  const attendees = event.registrationCount || event.attendees || 0;
  const capacityPct = event.maxAttendees ? Math.min(100, Math.round((attendees / event.maxAttendees) * 100)) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />}
      >
        {/* Hero banner */}
        <LinearGradient
          colors={theme.gradient}
          style={s.heroBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Nav overlay */}
          <View style={s.heroNav}>
            <TouchableOpacity onPress={() => router.back()} style={s.heroNavBtn} hitSlop={8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={s.heroNavBtn} hitSlop={8}>
              <Ionicons name="share-outline" size={19} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Date showcase */}
          <View style={s.heroDateCard}>
            <Text style={s.heroDateDay}>
              {event.startDate ? format(parseISO(event.startDate), 'dd') : '--'}
            </Text>
            <Text style={s.heroDateMon}>
              {event.startDate ? format(parseISO(event.startDate), 'MMM yyyy').toUpperCase() : '---'}
            </Text>
          </View>

          {/* Status pill */}
          {event.status === 'CANCELLED' ? (
            <View style={s.statusPill}>
              <Ionicons name="close-circle" size={14} color="#fff" />
              <Text style={s.statusPillText}>Cancelled</Text>
            </View>
          ) : dateIsToday ? (
            <View style={[s.statusPill, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <View style={s.liveDot} />
              <Text style={s.statusPillText}>Happening Today</Text>
            </View>
          ) : dateIsTomorrow ? (
            <View style={[s.statusPill, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={s.statusPillText}>Tomorrow</Text>
            </View>
          ) : daysAway > 0 && daysAway <= 7 ? (
            <View style={[s.statusPill, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={s.statusPillText}>In {daysAway} days</Text>
            </View>
          ) : null}
        </LinearGradient>

        {/* Content */}
        <View style={s.content}>
          {/* Title + tags */}
          <Text style={s.eventTitle}>{event.title}</Text>
          <View style={s.tagsRow}>
            <View style={[s.tag, { backgroundColor: theme.bg }]}>
              <Text style={[s.tagText, { color: theme.color }]}>{event.type}</Text>
            </View>
            {event.category && (
              <View style={[s.tag, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[s.tagText, { color: '#065F46' }]}>{event.category}</Text>
              </View>
            )}
            {event.priceType && (
              <View style={[s.tag, { backgroundColor: event.priceType === 'FREE' ? '#ECFDF5' : '#FFFBEB' }]}>
                <Ionicons
                  name={event.priceType === 'FREE' ? 'pricetag-outline' : 'cash-outline'}
                  size={11}
                  color={event.priceType === 'FREE' ? '#065F46' : '#92400E'}
                />
                <Text style={[s.tagText, { color: event.priceType === 'FREE' ? '#065F46' : '#92400E' }]}>
                  {event.priceType === 'FREE' ? 'Free' : event.price ? `₹${event.price}` : 'Paid'}
                </Text>
              </View>
            )}
          </View>

          {/* Info grid */}
          <View style={s.infoGrid}>
            <InfoRow
              icon="calendar-outline"
              iconColor={theme.color}
              label="Date & Time"
              value={formatEventDate(event.startDate)}
              sub={
                formatEventTime(event.startTime) +
                (event.endTime ? ` – ${formatEventTime(event.endTime)}` : '') +
                (event.endDate && event.endDate !== event.startDate ? `\nto ${formatEventDate(event.endDate)}` : '')
              }
            />
            <InfoRow
              icon="location-outline"
              iconColor="#DC2626"
              label="Location"
              value={event.venue || event.location || 'To be announced'}
              sub={[event.city, event.locationType].filter(Boolean).join(' · ')}
            />
            <InfoRow
              icon="person-outline"
              iconColor="#7C3AED"
              label="Organizer"
              value={event.organizerName || event.createdByName || 'Community'}
              sub={event.organizerContact ?? undefined}
            />
          </View>

          {/* Attendance card */}
          <View style={s.attendanceCard}>
            <View style={s.attendanceHeader}>
              <View style={s.attendanceLeft}>
                <Ionicons name="people" size={18} color={theme.color} />
                <Text style={s.attendanceTitle}>Attendance</Text>
              </View>
              <Text style={s.attendanceCount}>
                {attendees}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}
              </Text>
            </View>
            {event.maxAttendees ? (
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${capacityPct}%`,
                      backgroundColor: capacityPct >= 90 ? COLORS.error : theme.color,
                    },
                  ]}
                />
              </View>
            ) : null}
            <View style={s.attendanceMeta}>
              {event.registrationDeadline && (
                <View style={s.metaChip}>
                  <Ionicons name="timer-outline" size={12} color={COLORS.textMuted} />
                  <Text style={s.metaChipText}>
                    Deadline: {formatEventDate(event.registrationDeadline)}
                  </Text>
                </View>
              )}
              {isFull && (
                <View style={[s.metaChip, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="alert-circle" size={12} color={COLORS.error} />
                  <Text style={[s.metaChipText, { color: COLORS.error }]}>Event is full</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {event.description && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>About this event</Text>
              <Text style={s.sectionBody}>{event.description}</Text>
            </View>
          )}

          {/* Notes */}
          {event.notes && (
            <View style={s.noteCard}>
              <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.noteLabel}>Notes</Text>
                <Text style={s.noteBody}>{event.notes}</Text>
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      <View style={s.bottomBar}>
        {isOwner ? (
          <TouchableOpacity
            style={s.bottomBtnWrap}
            onPress={() => router.push(`/events/create?editId=${id}`)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={GRADIENTS.primary} style={s.bottomBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={s.bottomBtnText}>Edit Event</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.bottomBtnWrap}
            onPress={handleRegister}
            disabled={!canRegister && !event.isRegistered}
            activeOpacity={0.8}
          >
            {event.isRegistered ? (
              <View style={s.registeredBtn}>
                <Ionicons name="checkmark-circle" size={20} color="#065F46" />
                <Text style={s.registeredBtnText}>Registered</Text>
              </View>
            ) : (
              <LinearGradient
                colors={canRegister ? theme.gradient : ['#9CA3AF', '#9CA3AF']}
                style={[s.bottomBtn, !canRegister && { opacity: 0.6 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={s.bottomBtnText}>
                  {isFull ? 'Event Full' : isExpired ? 'Registration Closed' : 'Register Now'}
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  icon, iconColor, label, value, sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View style={s.infoRow}>
      <View style={[s.infoIcon, { backgroundColor: iconColor + '14' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
        {sub ? <Text style={s.infoSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.medium },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.displaySemi },

  scrollContent: { paddingBottom: 20 },

  // Hero
  heroBanner: {
    paddingTop: SPACING.md,
    paddingBottom: 28,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  heroNavBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroDateCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  heroDateDay: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 44,
    fontFamily: FONTS.displayEB,
  },
  heroDateMon: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220,38,38,0.85)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  statusPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#fff',
  },

  // Content
  content: { padding: SPACING.lg },
  eventTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
    lineHeight: 30,
    fontFamily: FONTS.displayEB,
    marginBottom: 10,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.semiBold },

  // Info grid
  infoGrid: {
    gap: 2,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', fontFamily: FONTS.semiBold },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2, fontFamily: FONTS.displaySemi },
  infoSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.regular },

  // Attendance
  attendanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  attendanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attendanceTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold },
  attendanceCount: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.displayEB },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  attendanceMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', fontFamily: FONTS.medium },

  // Sections
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8, fontFamily: FONTS.displayBold },
  sectionBody: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 23, fontFamily: FONTS.regular },

  noteCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noteLabel: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 2, fontFamily: FONTS.semiBold },
  noteBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, fontFamily: FONTS.regular },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    ...SHADOWS.lg,
  },
  bottomBtnWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  bottomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15,
  },
  bottomBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: FONTS.displayBold },
  registeredBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#059669',
    borderRadius: RADIUS.md, paddingVertical: 14,
  },
  registeredBtnText: { color: '#065F46', fontSize: 16, fontWeight: '700', fontFamily: FONTS.displayBold },
});
