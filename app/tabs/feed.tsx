import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { THEME } from '@/constants/theme';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { feedService } from '@/services/feedService';
import { eventService } from '@/services/eventService';
import { facilityService } from '@/services/facilityService';
import { societyFinanceService } from '@/services/societyFinanceService';
import { visitorService } from '@/services/visitorService';
import type { PostDto, EventDto } from '@/types/api';
import type { SocietyInvoiceDto } from '@/services/societyFinanceService';
import type { FacilityBookingDto } from '@/services/facilityService';
import type { VisitorDto } from '@/services/visitorService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ─── SOS ─────────────────────────────────────────────────────────────────────

function SOSButton() {
  const router = useRouter();
  const handleSOS = useCallback(() => {
    Alert.alert(
      'Emergency SOS',
      'This will alert security and all emergency contacts. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: () => router.push('/security/sos' as any),
        },
      ],
    );
  }, [router]);

  return (
    <Pressable onPress={handleSOS} style={styles.sosBtn} accessibilityLabel="Emergency SOS">
      <Ionicons name="warning" size={20} color="#fff" />
      <Text style={styles.sosBtnText}>Emergency SOS</Text>
    </Pressable>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

interface QuickAction {
  key: string;
  label: string;
  icon: IoniconsName;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { key: 'pay', label: 'Pay Dues', icon: 'card-outline', route: '/payments', color: '#059669' },
  { key: 'book', label: 'Book Facility', icon: 'calendar-outline', route: '/facilities', color: '#4F46E5' },
  { key: 'complaint', label: 'Raise Issue', icon: 'chatbubble-ellipses-outline', route: '/helpdesk', color: '#D97706' },
  { key: 'visitor', label: 'Add Visitor', icon: 'person-add-outline', route: '/security/visitor', color: '#7C3AED' },
];

function QuickActionsRow() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN', 'COMMUNITY_ADMIN', 'SUPER_ADMIN');
  const isGuard = hasRole('GUARD', 'SECURITY');
  const isVendor = hasRole('VENDOR');

  const actions = React.useMemo<QuickAction[]>(() => {
    if (isGuard) {
      return [
        { key: 'walkin', label: 'Walk-In', icon: 'person-add-outline', route: '/guard/walk-in', color: '#4F46E5' },
        { key: 'handover', label: 'Handover', icon: 'qr-code-outline', route: '/guard/handover', color: '#059669' },
        { key: 'cctv', label: 'CCTV Live', icon: 'videocam-outline', route: '/guard/cctv', color: '#DC2626' },
        { key: 'passes', label: 'Gate Passes', icon: 'shield-outline', route: '/guard/tabs/dashboard', color: '#7C3AED' },
      ];
    }
    if (isVendor) {
      return [
        { key: 'jobs', label: 'My Jobs', icon: 'briefcase-outline', route: '/vendor/tabs/dashboard', color: '#4F46E5' },
        { key: 'settlements', label: 'Payouts', icon: 'cash-outline', route: '/vendor/settlements', color: '#059669' },
        { key: 'inventory', label: 'Inventory', icon: 'cube-outline', route: '/vendor/inventory', color: '#D97706' },
        { key: 'availability', label: 'Availability', icon: 'time-outline', route: '/vendor/availability', color: '#7C3AED' },
      ];
    }
    if (isAdmin) {
      return [
        { key: 'admin', label: 'Admin Hub', icon: 'shield-checkmark-outline', route: '/admin-role/tabs/dashboard', color: '#1E293B' },
        { key: 'dues', label: 'Dues & Bills', icon: 'card-outline', route: '/payments', color: '#059669' },
        { key: 'broadcast', label: 'Notices', icon: 'megaphone-outline', route: '/notices', color: '#D97706' },
        { key: 'gate', label: 'Visitors', icon: 'people-outline', route: '/security', color: '#7C3AED' },
      ];
    }
    return QUICK_ACTIONS;
  }, [isAdmin, isGuard, isVendor]);

  return (
    <View style={styles.quickActionsRow}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={() => router.push(action.route as any)}
          style={styles.quickActionItem}
          accessibilityLabel={action.label}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
            <Ionicons name={action.icon} size={22} color={action.color} />
          </View>
          <Text style={styles.quickActionLabel}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Upcoming Activities ──────────────────────────────────────────────────────

function UpcomingCard({ event, booking }: { event?: EventDto; booking?: FacilityBookingDto }) {
  const router = useRouter();
  if (!event && !booking) return null;

  return (
    <View style={styles.card}>
      {event && (
        <Pressable
          style={styles.upcomingRow}
          onPress={() => router.push(`/events/${event.id}` as any)}
        >
          <View style={[styles.upcomingDot, { backgroundColor: '#4F46E5' }]} />
          <View style={styles.upcomingInfo}>
            <Text style={styles.upcomingTitle} numberOfLines={1}>{event.title}</Text>
            <Text style={styles.upcomingMeta}>
              {new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </Pressable>
      )}
      {booking && (
        <Pressable
          style={[styles.upcomingRow, event && styles.upcomingRowBorder]}
          onPress={() => router.push('/facilities' as any)}
        >
          <View style={[styles.upcomingDot, { backgroundColor: '#059669' }]} />
          <View style={styles.upcomingInfo}>
            <Text style={styles.upcomingTitle} numberOfLines={1}>{booking.facilityName}</Text>
            <Text style={styles.upcomingMeta}>{booking.date} · {booking.startTime}–{booking.endTime}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

// ─── Payments Due ─────────────────────────────────────────────────────────────

function PaymentsDueCard({ invoices }: { invoices: SocietyInvoiceDto[] }) {
  const router = useRouter();
  if (invoices.length === 0) return null;

  const total = invoices.reduce((sum, inv) => sum + (inv.balanceDue ?? 0), 0);

  return (
    <Pressable
      style={[styles.card, styles.dueBanner]}
      onPress={() => router.push('/payments' as any)}
      accessibilityLabel={`${invoices.length} payment${invoices.length > 1 ? 's' : ''} due`}
    >
      <View style={styles.dueLeft}>
        <Ionicons name="alert-circle" size={24} color="#DC2626" />
        <View style={styles.dueTextWrap}>
          <Text style={styles.dueTitle}>
            {invoices.length} payment{invoices.length > 1 ? 's' : ''} overdue
          </Text>
          <Text style={styles.dueAmount}>₹{total.toLocaleString('en-IN')} total due</Text>
        </View>
      </View>
      <View style={styles.payNowBtn}>
        <Text style={styles.payNowText}>Pay Now</Text>
      </View>
    </Pressable>
  );
}

// ─── Visitors Today ───────────────────────────────────────────────────────────

function VisitorItem({ visitor }: { visitor: VisitorDto }) {
  const router = useRouter();
  const statusColor = visitor.status === 'CHECKED_IN' ? '#059669' : visitor.status === 'PENDING' ? '#D97706' : '#94A3B8';
  return (
    <Pressable
      style={styles.visitorRow}
      onPress={() => router.push('/security' as any)}
    >
      <View style={[styles.visitorAvatar, { backgroundColor: statusColor + '20' }]}>
        <Ionicons name="person" size={18} color={statusColor} />
      </View>
      <View style={styles.visitorInfo}>
        <Text style={styles.visitorName}>{visitor.visitorName}</Text>
        <Text style={styles.visitorMeta}>{visitor.purpose} · {visitor.flatNumber ?? '—'}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
        <Text style={[styles.statusPillText, { color: statusColor }]}>
          {visitor.status?.replace('_', ' ')}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

function AnnouncementCard({ post }: { post: PostDto }) {
  const router = useRouter();
  return (
    <Pressable
      style={styles.announcementCard}
      onPress={() => router.push(`/community/post/${post.id}` as any)}
    >
      <View style={styles.announcementHeader}>
        <Ionicons name="megaphone" size={16} color="#4F46E5" />
        <Text style={styles.announcementAuthor}>{post.authorName}</Text>
        {post.official && <Ionicons name="checkmark-circle" size={14} color="#4F46E5" />}
      </View>
      <Text style={styles.announcementContent} numberOfLines={3}>{post.content}</Text>
    </Pressable>
  );
}

// ─── Family Activity (role-guarded) ──────────────────────────────────────────

function FamilyActivitySection() {
  const router = useRouter();
  return (
    <Pressable style={styles.card} onPress={() => router.push('/community/family' as any)}>
      <View style={styles.familyRow}>
        <View style={styles.familyIconWrap}>
          <Ionicons name="people" size={22} color="#7C3AED" />
        </View>
        <View style={styles.familyText}>
          <Text style={styles.familyTitle}>Family Activity</Text>
          <Text style={styles.familyMeta}>View your family members' recent activity</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </Pressable>
  );
}

// ─── Community Feed Snippet ───────────────────────────────────────────────────

function FeedSnippetCard({ post }: { post: PostDto }) {
  const router = useRouter();
  return (
    <Pressable
      style={styles.feedCard}
      onPress={() => router.push(`/community/post/${post.id}` as any)}
    >
      <Text style={styles.feedAuthor}>{post.authorName} · {post.authorFlat}</Text>
      <Text style={styles.feedContent} numberOfLines={2}>{post.content}</Text>
      <View style={styles.feedFooter}>
        <Ionicons name="heart-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.feedMeta}>{post.likeCount ?? 0}</Text>
        <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.feedMeta}>{post.commentCount ?? 0}</Text>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN', 'COMMUNITY_ADMIN', 'SUPER_ADMIN');
  const isResident = hasRole('RESIDENT', 'OWNER', 'TENANT');

  const { data: feedPage, isLoading: feedLoading } = useQuery({
    queryKey: ['home-feed'],
    queryFn: () => feedService.getPosts(0, 10),
    staleTime: 60_000,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['home-events'],
    queryFn: () => eventService.getUpcomingEvents(),
    staleTime: 60_000,
  });

  const { data: myBookings = [] } = useQuery({
    queryKey: ['home-bookings'],
    queryFn: () => facilityService.getMyBookings(),
    staleTime: 60_000,
    enabled: isResident,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['home-invoices-overdue'],
    queryFn: () => societyFinanceService.getInvoices('OVERDUE'),
    staleTime: 60_000,
    enabled: isResident,
  });

  const { data: visitors = [] } = useQuery({
    queryKey: ['home-visitors-today'],
    queryFn: () => visitorService.getTodaysPasses(),
    staleTime: 30_000,
    enabled: isResident || isAdmin,
  });

  const allPosts = feedPage?.content ?? [];
  const announcements = allPosts.filter((p) => p.type === 'announcement' || p.official);
  const feedSnippet = allPosts.filter((p) => p.type !== 'announcement').slice(0, 3);
  const nextEvent = upcomingEvents[0];
  const nextBooking = myBookings.find((b) => b.status === 'CONFIRMED');
  const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE');

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['home-feed'] });
    qc.invalidateQueries({ queryKey: ['home-events'] });
    qc.invalidateQueries({ queryKey: ['home-bookings'] });
    qc.invalidateQueries({ queryKey: ['home-invoices-overdue'] });
    qc.invalidateQueries({ queryKey: ['home-visitors-today'] });
  }, [qc]);

  if (feedLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.brandDark} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>
            Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </Text>
          <Text style={styles.greetingSub}>{user?.communityName ?? 'Your Community'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/notifications' as any)}
          accessibilityLabel="Notifications"
          style={styles.notifBtn}
        >
          <Ionicons name="notifications-outline" size={24} color={COLORS.text ?? '#1E293B'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={THEME.brandDark} />
        }
      >
        {/* 1 · Emergency SOS */}
        <SOSButton />

        {/* 2 · Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <QuickActionsRow />

        {/* 3 · Upcoming Activities */}
        {(nextEvent || nextBooking) && (
          <>
            <SectionHeader title="Upcoming" onSeeAll={() => router.push('/events' as any)} />
            <UpcomingCard event={nextEvent} booking={nextBooking} />
          </>
        )}

        {/* 4 · Payments Due */}
        {overdueInvoices.length > 0 && (
          <>
            <SectionHeader title="Payments Due" onSeeAll={() => router.push('/payments' as any)} />
            <PaymentsDueCard invoices={overdueInvoices} />
          </>
        )}

        {/* 5 · Visitors Today */}
        {visitors.length > 0 && (
          <>
            <SectionHeader title="Visitors Today" onSeeAll={() => router.push('/security' as any)} />
            <View style={styles.card}>
              {visitors.slice(0, 3).map((v) => (
                <VisitorItem key={v.id} visitor={v} />
              ))}
            </View>
          </>
        )}

        {/* 6 · Announcements */}
        {announcements.length > 0 && (
          <>
            <SectionHeader title="Announcements" onSeeAll={() => router.push('/community' as any)} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.announcementsScroll}
            >
              {announcements.slice(0, 5).map((post) => (
                <AnnouncementCard key={post.id} post={post} />
              ))}
            </ScrollView>
          </>
        )}

        {/* 7 · Family Activity (role-guarded) */}
        {isResident && (
          <>
            <SectionHeader title="Family" />
            <FamilyActivitySection />
          </>
        )}

        {/* 8 · Community Feed Snippet */}
        {feedSnippet.length > 0 && (
          <>
            <SectionHeader
              title="Community Feed"
              onSeeAll={() => router.push('/community' as any)}
            />
            <View style={styles.card}>
              {feedSnippet.map((post, idx) => (
                <View key={post.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <FeedSnippetCard post={post} />
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#F8FAFC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background ?? '#F8FAFC' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  greeting: { fontSize: 18, fontWeight: '700', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.bold },
  greetingSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.regular },
  notifBtn: { padding: 6 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  bottomPad: { height: 20 },

  // SOS
  sosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  sosBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONTS.bold },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.bold },
  seeAll: { fontSize: 13, color: THEME.brandDark, fontFamily: FONTS.semiBold },

  // Quick Actions
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  quickActionItem: { alignItems: 'center', flex: 1 },
  quickActionIcon: { width: 50, height: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickActionLabel: { fontSize: 11, color: COLORS.text ?? '#1E293B', textAlign: 'center', fontFamily: FONTS.semiBold, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },

  // Upcoming
  upcomingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  upcomingRowBorder: { borderTopWidth: 1, borderTopColor: THEME.border },
  upcomingDot: { width: 10, height: 10, borderRadius: 5 },
  upcomingInfo: { flex: 1 },
  upcomingTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.semiBold },
  upcomingMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },

  // Payments Due
  dueBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  dueLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dueTextWrap: { flex: 1 },
  dueTitle: { fontSize: 14, fontWeight: '600', color: '#991B1B', fontFamily: FONTS.semiBold },
  dueAmount: { fontSize: 12, color: '#B91C1C', marginTop: 2, fontFamily: FONTS.regular },
  payNowBtn: { backgroundColor: '#DC2626', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 7 },
  payNowText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONTS.bold },

  // Visitors
  visitorRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  visitorAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  visitorInfo: { flex: 1 },
  visitorName: { fontSize: 14, fontWeight: '600', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.semiBold },
  visitorMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: FONTS.regular },
  statusPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.semiBold },

  // Announcements
  announcementsScroll: { paddingRight: 16, gap: 10, marginBottom: 16 },
  announcementCard: {
    width: 240,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 14,
    ...SHADOWS.sm,
  },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  announcementAuthor: { fontSize: 12, fontWeight: '600', color: '#4F46E5', flex: 1, fontFamily: FONTS.semiBold },
  announcementContent: { fontSize: 13, color: COLORS.text ?? '#1E293B', lineHeight: 18, fontFamily: FONTS.regular },

  // Family
  familyRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  familyIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  familyText: { flex: 1 },
  familyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text ?? '#1E293B', fontFamily: FONTS.semiBold },
  familyMeta: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },

  // Feed snippet
  feedCard: { padding: 14 },
  feedAuthor: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4, fontFamily: FONTS.semiBold },
  feedContent: { fontSize: 14, color: COLORS.text ?? '#1E293B', lineHeight: 20, fontFamily: FONTS.regular },
  feedFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  feedMeta: { fontSize: 12, color: COLORS.textMuted, marginRight: 8, fontFamily: FONTS.regular },
  divider: { height: 1, backgroundColor: THEME.border, marginHorizontal: 14 },
});
