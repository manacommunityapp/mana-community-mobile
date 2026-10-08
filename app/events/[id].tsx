import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Share, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAuth } from '@/hooks/useAuth';
import { useAppBack } from '@/hooks/useAppBack';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, FONTS, SPACING } from '@/constants/config';
import { format, parseISO, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

const { width: SCREEN_W } = Dimensions.get('window');

const TYPE_THEME: Record<string, { color: string; bg: string; gradient: [string, string]; emoji: string }> = {
  SPORTS:    { color: '#059669', bg: '#ECFDF5', gradient: ['#059669', '#10B981'], emoji: '⚽' },
  SOCIAL:    { color: '#2563EB', bg: '#EFF6FF', gradient: ['#2563EB', '#3B82F6'], emoji: '🎉' },
  CULTURAL:  { color: '#7C3AED', bg: '#F5F3FF', gradient: ['#7C3AED', '#8B5CF6'], emoji: '🎨' },
  WORKSHOP:  { color: '#4F46E5', bg: '#EEF2FF', gradient: ['#4F46E5', '#6366F1'], emoji: '🎓' },
  RELIGIOUS: { color: '#DC2626', bg: '#FEF2F2', gradient: ['#DC2626', '#EF4444'], emoji: '🙏' },
  MEETING:   { color: '#0891B2', bg: '#ECFEFF', gradient: ['#0891B2', '#06B6D4'], emoji: '💼' },
  COMMUNITY: { color: '#4F46E5', bg: '#EEF2FF', gradient: ['#4F46E5', '#6366F1'], emoji: '🏠' },
};

const HUB_ITEMS = [
  { title: 'Programs',    sub: 'Schedule & acts', emoji: '📋', color: '#4F46E5', bg: '#EEF2FF', routeKey: 'programs' },
  { title: 'Gate Pass',   sub: 'QR Entry',        emoji: '🎫', color: '#059669', bg: '#ECFDF5', routeKey: 'gatepass' },
  { title: 'Donations',   sub: 'Contribute',      emoji: '❤️', color: '#E11D48', bg: '#FFF1F2', routeKey: 'donations' },
  { title: 'Volunteers',  sub: 'Join team',       emoji: '🤝', color: '#D97706', bg: '#FEF3C7', routeKey: 'volunteers' },
  { title: 'Gallery',     sub: 'Photos & video',  emoji: '📸', color: '#2563EB', bg: '#EFF6FF', routeKey: 'gallery' },
  { title: 'Food & Meals',sub: 'Diet & tokens',   emoji: '🍽️', color: '#EA580C', bg: '#FFF7ED', routeKey: 'meals' },
  { title: 'Sponsors',    sub: 'Partners',        emoji: '🏅', color: '#7C3AED', bg: '#F5F3FF', routeKey: 'sponsors' },
  { title: 'Tasks',       sub: 'To-do items',     emoji: '✅', color: '#0D9488', bg: '#F0FDFA', routeKey: 'tasks' },
  { title: 'Expenses',    sub: 'Budget & bills',  emoji: '💰', color: '#475569', bg: '#F1F5F9', routeKey: 'expenses' },
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { goBack } = useAppBack({ fallbackRoute: '/events' });

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
          <TouchableOpacity onPress={goBack} style={s.navBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Event Not Found</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.loadingWrap}>
          <Text style={{ fontSize: 48 }}>📅</Text>
          <Text style={s.emptyTitle}>This event doesn't exist</Text>
          <Text style={s.emptyDesc}>It may have been removed or the link is incorrect.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const theme = TYPE_THEME[event.type] ?? { color: COLORS.primary, bg: COLORS.primaryLight, gradient: GRADIENTS.primary as unknown as [string, string], emoji: '📅' };
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
            <TouchableOpacity onPress={goBack} style={s.heroNavBtn} hitSlop={8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={s.heroNavBtn} hitSlop={8}>
              <Ionicons name="share-outline" size={19} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Large event emoji + date */}
          <Text style={s.heroLargeEmoji}>{theme.emoji}</Text>
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
            <View style={[s.statusPill, { backgroundColor: 'rgba(220,38,38,0.85)' }]}>
              <Text style={s.statusEmoji}>❌</Text>
              <Text style={s.statusPillText}>Cancelled</Text>
            </View>
          ) : dateIsToday ? (
            <View style={[s.statusPill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <View style={s.liveDot} />
              <Text style={s.statusPillText}>Happening Today</Text>
            </View>
          ) : dateIsTomorrow ? (
            <View style={[s.statusPill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={s.statusPillText}>⏰ Tomorrow</Text>
            </View>
          ) : daysAway > 0 && daysAway <= 7 ? (
            <View style={[s.statusPill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={s.statusPillText}>📆 In {daysAway} days</Text>
            </View>
          ) : null}
        </LinearGradient>

        {/* Content */}
        <View style={s.content}>
          {/* Title + tags */}
          <Text style={s.eventTitle}>{event.title}</Text>
          <View style={s.tagsRow}>
            <View style={[s.tag, { backgroundColor: theme.bg }]}>
              <Text style={s.tagEmoji}>{theme.emoji}</Text>
              <Text style={[s.tagText, { color: theme.color }]}>{event.type}</Text>
            </View>
            {event.category && (
              <View style={[s.tag, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[s.tagText, { color: '#065F46' }]}>{event.category}</Text>
              </View>
            )}
            {event.priceType && (
              <View style={[s.tag, { backgroundColor: event.priceType === 'FREE' ? '#ECFDF5' : '#FFFBEB' }]}>
                <Text style={s.tagEmoji}>{event.priceType === 'FREE' ? '🎁' : '💳'}</Text>
                <Text style={[s.tagText, { color: event.priceType === 'FREE' ? '#065F46' : '#92400E' }]}>
                  {event.priceType === 'FREE' ? 'Free' : event.price ? `₹${event.price}` : 'Paid'}
                </Text>
              </View>
            )}
          </View>

          {/* Info grid */}
          <View style={s.infoGrid}>
            <InfoRow
              emoji="📅"
              label="Date & Time"
              value={formatEventDate(event.startDate)}
              sub={
                formatEventTime(event.startTime) +
                (event.endTime ? ` – ${formatEventTime(event.endTime)}` : '') +
                (event.endDate && event.endDate !== event.startDate ? `\nto ${formatEventDate(event.endDate)}` : '')
              }
              borderColor={theme.color}
            />
            <InfoRow
              emoji="📍"
              label="Location"
              value={event.venue || event.location || 'To be announced'}
              sub={[event.city, event.locationType].filter(Boolean).join(' · ')}
              borderColor="#DC2626"
            />
            <InfoRow
              emoji="👤"
              label="Organizer"
              value={event.organizerName || event.createdByName || 'Community'}
              sub={event.organizerContact ?? undefined}
              borderColor="#7C3AED"
              isLast
            />
          </View>

          {/* Attendance card */}
          <View style={s.attendanceCard}>
            <View style={s.attendanceHeader}>
              <View style={s.attendanceLeft}>
                <Text style={s.attendanceEmoji}>👥</Text>
                <Text style={s.attendanceTitle}>Attendance</Text>
              </View>
              <View style={s.attendanceCountWrap}>
                <Text style={[s.attendanceCount, { color: theme.color }]}>
                  {attendees}
                </Text>
                {event.maxAttendees ? (
                  <Text style={s.attendanceMax}>/ {event.maxAttendees}</Text>
                ) : null}
              </View>
            </View>
            {event.maxAttendees ? (
              <View style={s.progressTrack}>
                <LinearGradient
                  colors={capacityPct >= 90 ? ['#DC2626', '#EF4444'] : theme.gradient}
                  style={[s.progressFill, { width: `${capacityPct}%` as any }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            ) : null}
            <View style={s.attendanceMeta}>
              {event.registrationDeadline && (
                <View style={s.metaChip}>
                  <Text style={s.metaChipEmoji}>⏰</Text>
                  <Text style={s.metaChipText}>
                    Deadline: {formatEventDate(event.registrationDeadline)}
                  </Text>
                </View>
              )}
              {isFull && (
                <View style={[s.metaChip, { backgroundColor: '#FEF2F2' }]}>
                  <Text style={s.metaChipEmoji}>🚫</Text>
                  <Text style={[s.metaChipText, { color: COLORS.error }]}>Event is full</Text>
                </View>
              )}
            </View>
          </View>

          {/* Event Hub Grid */}
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <View style={[s.sectionDot, { backgroundColor: theme.color }]} />
              <Text style={s.sectionTitle}>Event Hub</Text>
            </View>
            <View style={s.gridContainer}>
              {HUB_ITEMS.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.gridCard}
                  onPress={() => router.push(`/events/${item.routeKey}?id=${id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={[s.gridIconWrap, { backgroundColor: item.bg }]}>
                    <Text style={s.gridEmoji}>{item.emoji}</Text>
                  </View>
                  <Text style={s.gridTitle}>{item.title}</Text>
                  <Text style={s.gridSub} numberOfLines={1}>{item.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          {event.description && (
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <View style={[s.sectionDot, { backgroundColor: '#6366F1' }]} />
                <Text style={s.sectionTitle}>About this event</Text>
              </View>
              <Text style={s.sectionBody}>{event.description}</Text>
            </View>
          )}

          {/* Notes */}
          {event.notes && (
            <View style={s.noteCard}>
              <Text style={s.noteEmoji}>📝</Text>
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
              <Text style={s.bottomBtnEmoji}>✏️</Text>
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
                <Text style={s.registeredEmoji}>✅</Text>
                <Text style={s.registeredBtnText}>Registered</Text>
              </View>
            ) : (
              <LinearGradient
                colors={canRegister ? theme.gradient : ['#9CA3AF', '#9CA3AF']}
                style={[s.bottomBtn, !canRegister && { opacity: 0.6 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={s.bottomBtnEmoji}>🎟️</Text>
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
  emoji, label, value, sub, borderColor, isLast,
}: {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
  borderColor: string;
  isLast?: boolean;
}) {
  return (
    <View style={[s.infoRow, !isLast && s.infoRowBorder]}>
      <View style={[s.infoIcon, { backgroundColor: borderColor + '12' }]}>
        <Text style={s.infoEmoji}>{emoji}</Text>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.medium },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 12, fontFamily: FONTS.displayBold },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', fontFamily: FONTS.regular },

  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E8F0',
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { fontSize: 17, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.displaySemi },

  scrollContent: { paddingBottom: 20 },

  // ── Hero ──
  heroBanner: {
    paddingTop: SPACING.md,
    paddingBottom: 28,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  heroNavBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLargeEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  heroDateCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroDateDay: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 46,
    fontFamily: FONTS.displayEB,
  },
  heroDateMon: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  statusEmoji: { fontSize: 12 },
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

  // ── Content ──
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
  tagEmoji: { fontSize: 11 },
  tagText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.semiBold },

  // ── Info grid ──
  infoGrid: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    marginBottom: 16,
    ...SHADOWS.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIcon: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  infoEmoji: { fontSize: 20 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase', fontFamily: FONTS.semiBold },
  infoValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2, fontFamily: FONTS.displaySemi },
  infoSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.regular },

  // ── Attendance ──
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E8F0',
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
  attendanceEmoji: { fontSize: 18 },
  attendanceTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold },
  attendanceCountWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  attendanceCount: { fontSize: 22, fontWeight: '800', fontFamily: FONTS.displayEB },
  attendanceMax: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted, fontFamily: FONTS.medium },
  progressTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: 7,
    borderRadius: 4,
  },
  attendanceMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipEmoji: { fontSize: 11 },
  metaChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', fontFamily: FONTS.medium },

  // ── Sections & Hub Grid ──
  section: { marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold },
  sectionBody: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 23, fontFamily: FONTS.regular },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCard: {
    width: (SCREEN_W - 32 - 20) / 3,
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  gridIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  gridEmoji: { fontSize: 22 },
  gridTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text, textAlign: 'center', fontFamily: FONTS.semiBold },
  gridSub: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', marginTop: 1, fontFamily: FONTS.regular },

  noteCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  noteEmoji: { fontSize: 18 },
  noteLabel: { fontSize: 12, fontWeight: '600', color: COLORS.primary, marginBottom: 2, fontFamily: FONTS.semiBold },
  noteBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, fontFamily: FONTS.regular },

  // ── Bottom bar ──
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#E8E8F0',
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
  bottomBtnEmoji: { fontSize: 18 },
  bottomBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: FONTS.displayBold },
  registeredBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#059669',
    borderRadius: RADIUS.md, paddingVertical: 14,
  },
  registeredEmoji: { fontSize: 18 },
  registeredBtnText: { color: '#065F46', fontSize: 16, fontWeight: '700', fontFamily: FONTS.displayBold },
});
