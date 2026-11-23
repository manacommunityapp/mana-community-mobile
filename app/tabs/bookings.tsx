import React from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '@/constants/theme';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { useAppTheme } from '@/context/ThemeContext';
import { facilityService, type FacilityBookingDto } from '@/services/facilityService';
import { eventService } from '@/services/eventService';
import type { EventDto } from '@/types/api';

import { useAuth } from '@/hooks/useAuth';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface BookingCategory {
  key: string;
  label: string;
  icon: IoniconsName;
  route: string;
  color: string;
  module?: string;
}

const BOOKING_CATEGORIES: BookingCategory[] = [
  { key: 'facility', label: 'Facilities', icon: 'grid-outline', route: '/facilities', color: '#4F46E5', module: 'FACILITIES' },
  { key: 'events', label: 'Events', icon: 'calendar-outline', route: '/events', color: '#059669', module: 'EVENTS' },
  { key: 'sports', label: 'Sports', icon: 'football-outline', route: '/sports', color: '#D97706', module: 'SPORTS' },
  { key: 'trips', label: 'Trips', icon: 'airplane-outline', route: '/trips', color: '#1D4ED8', module: 'TRIPS' },
  { key: 'amenity', label: 'Amenities', icon: 'business-outline', route: '/facilities', color: '#7C3AED', module: 'FACILITIES' },
  { key: 'helpdesk', label: 'Service Requests', icon: 'construct-outline', route: '/helpdesk', color: '#0369A1', module: 'HELPDESK' },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CONFIRMED:    { color: '#059669', bg: '#ECFDF5', label: 'Confirmed' },
  PENDING:      { color: '#D97706', bg: '#FFFBEB', label: 'Pending' },
  WAITLISTED:   { color: '#7C3AED', bg: '#F5F3FF', label: 'Waitlisted' },
  CANCELLED:    { color: '#DC2626', bg: '#FEF2F2', label: 'Cancelled' },
  COMPLETED:    { color: '#475569', bg: '#F8FAFC', label: 'Completed' },
  NO_SHOW:      { color: '#94A3B8', bg: '#F8FAFC', label: 'No Show' },
};

function FacilityBookingCard({ booking }: { booking: FacilityBookingDto }) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.PENDING;
  return (
    <Pressable
      style={[styles.bookingCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
      onPress={() => router.push('/facilities' as any)}
    >
      <View style={[styles.bookingIconWrap, { backgroundColor: palette.isDark ? cfg.color + '24' : cfg.bg }]}>
        <Ionicons name="grid" size={20} color={cfg.color} />
      </View>
      <View style={styles.bookingInfo}>
        <Text style={[styles.bookingTitle, { color: palette.text }]} numberOfLines={1}>{booking.facilityName}</Text>
        <Text style={[styles.bookingMeta, { color: palette.textMuted }]}>{booking.date} · {booking.startTime}–{booking.endTime}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: palette.isDark ? cfg.color + '24' : cfg.bg }]}>
        <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </Pressable>
  );
}

function EventBookingCard({ event }: { event: EventDto }) {
  const router = useRouter();
  const { palette } = useAppTheme();
  return (
    <Pressable
      style={[styles.bookingCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
      onPress={() => router.push(`/events/${event.id}` as any)}
    >
      <View style={[styles.bookingIconWrap, { backgroundColor: palette.successLight }]}>
        <Ionicons name="calendar" size={20} color={palette.success} />
      </View>
      <View style={styles.bookingInfo}>
        <Text style={[styles.bookingTitle, { color: palette.text }]} numberOfLines={1}>{event.title}</Text>
        <Text style={[styles.bookingMeta, { color: palette.textMuted }]}>
          {new Date(event.startDate).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: palette.successLight }]}>
        <Text style={[styles.statusPillText, { color: palette.success }]}>Registered</Text>
      </View>
    </Pressable>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const { hasModule, isSuperAdmin } = useAuth();
  const { palette } = useAppTheme();

  const visibleCategories = React.useMemo(() => {
    return BOOKING_CATEGORIES.filter((c) => isSuperAdmin || !c.module || hasModule(c.module));
  }, [hasModule, isSuperAdmin]);

  const { data: facilityBookings = [], isLoading: loadingFacility } = useQuery({
    queryKey: ['bookings-tab-facility'],
    queryFn: () => facilityService.getMyBookings(),
    staleTime: 60_000,
  });

  const { data: myEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['bookings-tab-events'],
    queryFn: () => eventService.getMyEvents(),
    staleTime: 60_000,
  });

  const isLoading = loadingFacility || loadingEvents;
  const upcoming = facilityBookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'WAITLISTED');
  const hasAny = upcoming.length > 0 || myEvents.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.dockBg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: palette.dockBg, borderBottomColor: palette.dockBorder }]}>
        <Text style={[styles.title, { color: palette.text }]}>Bookings</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Your reservations & registrations</Text>
      </View>
      <View style={{ flex: 1, backgroundColor: palette.appBg }}>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {/* Categories */}
            {visibleCategories.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Book Something</Text>
                <View style={styles.catGrid}>
                  {visibleCategories.map((cat) => (
                    <Pressable
                      key={cat.key}
                      style={[styles.catTile, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
                      onPress={() => router.push(cat.route as any)}
                      accessibilityLabel={cat.label}
                    >
                      <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                        <Ionicons name={cat.icon} size={22} color={cat.color} />
                      </View>
                      <Text style={[styles.catLabel, { color: palette.text }]}>{cat.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {isLoading && (
              <ActivityIndicator style={{ marginTop: 24 }} color={palette.link} />
            )}

            {!isLoading && hasAny && (
              <Text style={[styles.sectionTitle, { color: palette.text }]}>My Upcoming</Text>
            )}

            {!isLoading && upcoming.length > 0 && upcoming.slice(0, 5).map((b) => (
              <FacilityBookingCard key={b.id} booking={b} />
            ))}

            {!isLoading && myEvents.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>My Events</Text>
                {myEvents.slice(0, 5).map((e) => (
                  <EventBookingCard key={e.id} event={e} />
                ))}
              </>
            )}

            {!isLoading && !hasAny && (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={palette.textMuted} />
                <Text style={[styles.emptyTitle, { color: palette.text }]}>No upcoming bookings</Text>
                <Text style={[styles.emptyMeta, { color: palette.textMuted }]}>Book a facility, event or activity above</Text>
              </View>
            )}
          </>
        }
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#FAF8FF' },
  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
    ...SHADOWS.sm,
  },
  title: { fontSize: 25, color: COLORS.text ?? '#131B2E', fontFamily: FONTS.displayBold },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },
  scroll: { padding: 16, paddingBottom: 108 },
  sectionTitle: { fontSize: 15.5, color: COLORS.text ?? '#131B2E', fontFamily: FONTS.displayBold, marginBottom: 10, marginTop: 8 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  catTile: {
    width: '30%', flexGrow: 1,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: THEME.border,
    padding: 14, alignItems: 'center', gap: 8,
    ...SHADOWS.sm,
  },
  catIcon: { width: 46, height: 46, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text ?? '#1E293B', textAlign: 'center', fontFamily: FONTS.semiBold },

  bookingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: THEME.border,
    padding: 14, marginBottom: 8, gap: 12, ...SHADOWS.sm,
  },
  bookingIconWrap: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  bookingInfo: { flex: 1 },
  bookingTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.semiBold },
  bookingMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },
  statusPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.semiBold },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.semiBold },
  emptyMeta: { fontSize: 13, color: COLORS.textMuted, fontFamily: FONTS.regular, textAlign: 'center' },
});
