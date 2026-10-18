import { THEME } from '@/constants/theme';
import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, ListRenderItemInfo,
  Share, ScrollView, Dimensions, TextInput, Platform,
} from 'react-native';
import { CachedImage as Image } from '@/components/common/CachedImage';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { feedService } from '@/services/feedService';
import { notificationService } from '@/services/notificationService';
import { eventService } from '@/services/eventService';
import { pollService } from '@/services/pollService';
import { smartHelpdeskService } from '@/services/smartHelpdeskService';
import { PollCard } from '@/components/polls/PollCard';
import { QuickActions } from '@/components/common/QuickActions';
import { FlatGateActivityCard } from '@/components/common/FlatGateActivityCard';
import { PostDto, EventDto } from '@/types/api';
import { COLORS, SHADOWS, RADIUS, FONTS, GRADIENTS, getAvatarColor, getInitials } from '@/constants/config';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAppBack } from '@/hooks/useAppBack';
import { ProfileImageModal } from '@/components/common/ProfileImageModal';
import { ResidentPassCard } from '@/components/common/ResidentPassCard';
import { TodayAtAGlance, KpiChip } from '@/components/common/TodayAtAGlance';
import { CommunityHighlightBanner } from '@/components/common/CommunityHighlightBanner';

const SCREEN_W = Dimensions.get('window').width;
const EVENT_CARD_W = SCREEN_W * 0.62;

type FeedFilter = 'ALL' | 'ANNOUNCEMENT' | 'POLL' | 'GENERAL';

const FEED_FILTERS: { key: FeedFilter; label: string; emoji: string }[] = [
  { key: 'ALL',          label: 'All',       emoji: '✨' },
  { key: 'ANNOUNCEMENT', label: 'Notices',   emoji: '📢' },
  { key: 'POLL',         label: 'Polls',     emoji: '📊' },
  { key: 'GENERAL',      label: 'Community', emoji: '💬' },
];

const POST_TYPE_META: Record<string, { label: string; emoji: string; color: string; bg: string; accent: string }> = {
  poll:         { label: 'POLL',      emoji: '📊', color: '#7C3AED', bg: '#EDE9FE', accent: '#7C3AED' },
  announcement: { label: 'NOTICE',    emoji: '📢', color: '#4F46E5', bg: '#EEF2FF', accent: '#4F46E5' },
  post:         { label: 'POST',      emoji: '💬', color: '#2563EB', bg: '#DBEAFE', accent: '#2563EB' },
};

// ── Upcoming Event Card ───────────────────────────────────────
function UpcomingEventCard({ event, onPress }: { event: EventDto; onPress: () => void }) {
  const fmtDate = (d?: string) => {
    if (!d) return '';
    try { return format(parseISO(d), 'EEE, d MMM').toUpperCase(); } catch { return d; }
  };
  const fmtTime = (t?: string) => {
    if (!t) return '';
    try {
      const [h, m] = t.split(':');
      const hr = parseInt(h);
      return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
    } catch { return t; }
  };

  const count = event.registrationCount ?? event.attendees ?? 0;
  const gradientColors = [
    ['#4338CA', '#6366F1'],
    ['#0891B2', '#06b6d4'],
    ['#059669', '#10B981'],
    ['#DB2777', '#EC4899'],
  ];
  const gIdx = Math.abs(parseInt(String(event.id ?? 0), 10) || 0) % gradientColors.length;

  return (
    <TouchableOpacity style={es.card} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={gradientColors[gIdx] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={es.imageArea}
      >
        <View style={es.eventIconCircle}>
          <Text style={es.eventEmoji}>📅</Text>
        </View>
        <View style={es.dateBadgeWrap}>
          <Text style={es.dateBadge}>
            {fmtDate(event.startDate)}{event.startTime ? `  ·  ${fmtTime(event.startTime)}` : ''}
          </Text>
        </View>
      </LinearGradient>

      <View style={es.body}>
        <Text style={es.title} numberOfLines={1}>{event.title}</Text>
        <View style={es.attendeeRow}>
          <View style={es.avatarStack}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[es.miniAvatar, { left: i * 13, backgroundColor: ['#4F46E5','#059669','#0891B2'][i] }]}>
                <Text style={es.miniAvatarText}>{['A','B','C'][i]}</Text>
              </View>
            ))}
          </View>
          <Text style={es.attendeeCount}>
            {count > 3 ? `+${count - 3} going` : count > 0 ? `${count} going` : 'Be first'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const es = StyleSheet.create({
  card: {
    width: EVENT_CARD_W,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  imageArea: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eventIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventEmoji: { fontSize: 16 },
  dateBadgeWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  dateBadge: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
    fontFamily: FONTS.bold,
  },
  body: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarStack: {
    flexDirection: 'row',
    width: 44,
    height: 18,
    position: 'relative',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  miniAvatarText: {
    color: '#fff',
    fontSize: 7.5,
    fontFamily: FONTS.bold,
    fontWeight: '800',
  },
  attendeeCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    marginLeft: 4,
  },
});

// ── Post Card ──────────────────────────────────────────────────────
function PostCard({ post }: { post: PostDto }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [authorPhotoError, setAuthorPhotoError] = useState(false);

  const authorPhotoUri =
    post.authorPhoto ||
    (post as any).profilePicUrl ||
    (post as any).authorProfilePic ||
    (post as any).authorProfilePicUrl ||
    (post as any).profilePhoto;

  const hasAuthorPhoto =
    !authorPhotoError &&
    !!authorPhotoUri &&
    typeof authorPhotoUri === 'string' &&
    authorPhotoUri.trim().length > 0 &&
    !authorPhotoUri.includes('null') &&
    !authorPhotoUri.includes('undefined') &&
    (authorPhotoUri.startsWith('http') ||
      authorPhotoUri.startsWith('/') ||
      authorPhotoUri.startsWith('file://') ||
      authorPhotoUri.startsWith('data:'));

  const likeMutation = useMutation({
    mutationFn: () => feedService.likePost(post.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.authorName} posted in Mana Community:\n"${post.content}"`,
      });
    } catch { /* ignore */ }
  };

  const avatarColor = getAvatarColor(post.authorName || 'Neighbor');
  const typeMeta = POST_TYPE_META[post.type] || POST_TYPE_META.post;
  const timeAgo = (() => {
    if (!post.createdAt) return 'recently';
    try { return formatDistanceToNow(new Date(post.createdAt), { addSuffix: false }); }
    catch { return 'recently'; }
  })();

  return (
    <View style={styles.card}>
      <View style={[styles.cardAccent, { backgroundColor: typeMeta.accent }]} />

      <View style={styles.cardInner}>
        {/* Author Row */}
        <View style={styles.authorRow}>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: avatarColor.bg, overflow: 'hidden' }]}
            activeOpacity={0.85}
            onPress={() => setShowAuthorModal(true)}
          >
            {hasAuthorPhoto ? (
              <Image
                source={{ uri: authorPhotoUri }}
                style={styles.avatarImage}
                onError={() => setAuthorPhotoError(true)}
              />
            ) : (
              <Text style={[styles.avatarText, { color: avatarColor.text }]}>
                {getInitials(post.authorName)}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.authorName || 'Community Member'}
              </Text>
              {post.authorFlat && (
                <View style={styles.flatChip}>
                  <Text style={styles.flatChipText}>{post.authorFlat}</Text>
                </View>
              )}
            </View>
            <Text style={styles.authorMeta}>{timeAgo} ago</Text>
          </View>

          <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg }]}>
            <Text style={styles.typeBadgeEmoji}>{typeMeta.emoji}</Text>
            <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>
              {typeMeta.label}
            </Text>
          </View>
        </View>

        {/* Content */}
        <Text style={styles.content}>{post.content}</Text>

        {/* Embedded Poll */}
        {post.type === 'poll' && post.poll && (
          <View style={styles.pollContainer}>
            <PollCard
              post={post}
              currentUserId={user?.id}
              compact
              onVoted={() => qc.invalidateQueries({ queryKey: ['feed'] })}
            />
          </View>
        )}

        {/* Media image */}
        {post.mediaUrls && post.mediaUrls.length > 0 && (
          <View style={styles.mediaWrap}>
            <Image source={{ uri: post.mediaUrls[0] }} style={styles.mediaImage} />
          </View>
        )}

        {/* Action Bar */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, post.liked && styles.actionBtnLiked]}
            onPress={() => likeMutation.mutate()}
            activeOpacity={0.7}
          >
            <Text style={styles.actionEmoji}>{post.liked ? '❤️' : '🤍'}</Text>
            <Text style={[styles.actionText, post.liked && styles.likedText]}>
              {post.likeCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionText}>{post.commentCount || 0}</Text>
          </TouchableOpacity>

          <View style={styles.actionsRight}>
            <TouchableOpacity style={styles.actionBtnIcon} onPress={handleShare} activeOpacity={0.7}>
              <Text style={styles.actionEmoji}>🔗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Enlarged Post Author Photo Modal */}
      <ProfileImageModal
        visible={showAuthorModal}
        onClose={() => setShowAuthorModal(false)}
        imageUrl={hasAuthorPhoto ? authorPhotoUri : null}
        name={post.authorName || 'Community Member'}
        subtitle={post.authorFlat ? `Flat ${post.authorFlat}` : undefined}
      />
    </View>
  );
}

// ── Feed Screen ─────────────────────────────────────────────────────
export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FeedFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showUserPhotoModal, setShowUserPhotoModal] = useState(false);

  useAppBack({
    isRootScreen: true,
    onBeforeBack: () => {
      if (isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
        return true;
      }
    },
  });

  const {
    data, fetchNextPage, hasNextPage,
    isFetchingNextPage, isLoading, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 0 }) => feedService.getPosts(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 30_000,
  });

  const { data: upcomingEvents = [] } = useQuery<EventDto[]>({
    queryKey: ['events', 'upcoming-home'],
    queryFn: () => eventService.getUpcomingEvents(),
  });

  const { data: activePollsPage } = useQuery({
    queryKey: ['polls', 'active-count'],
    queryFn: () => pollService.getPolls('ACTIVE', 0),
    staleTime: 60_000,
  });

  const { data: openTickets = [] } = useQuery({
    queryKey: ['helpdesk', 'open-count'],
    queryFn: () => smartHelpdeskService.getTickets('OPEN'),
    staleTime: 60_000,
  });

  const allPosts = useMemo(() => data?.pages.flatMap((p) => p.content) ?? [], [data]);

  const filteredPosts = useMemo(() => {
    let list = allPosts;
    if (filter === 'ANNOUNCEMENT') list = list.filter(p => p.type === 'announcement');
    if (filter === 'POLL') list = list.filter(p => p.type === 'poll');
    if (filter === 'GENERAL') list = list.filter(p => p.type === 'post');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.content?.toLowerCase().includes(q) ||
        p.authorName?.toLowerCase().includes(q) ||
        p.authorFlat?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPosts, filter, searchQuery]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PostDto>) => <PostCard post={item} />,
    []
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const [userPhotoError, setUserPhotoError] = useState(false);
  const userDisplayName = user?.fullName || user?.name || (user?.email ? user.email.split('@')[0] : 'Resident');
  const userName = userDisplayName.split(' ')[0] || 'Neighbor';
  const communityName = user?.communityName || '';
  const userInitial = getInitials(userDisplayName);
  const avatarColor = getAvatarColor(userDisplayName);
  const userPhotoUri = user?.profilePicUrl || user?.profilePhoto;
  const hasUserPhoto = !userPhotoError && !!userPhotoUri && typeof userPhotoUri === 'string' && userPhotoUri.trim().length > 0 && !userPhotoUri.includes('null') && !userPhotoUri.includes('undefined') && (userPhotoUri.startsWith('http') || userPhotoUri.startsWith('/') || userPhotoUri.startsWith('file://') || userPhotoUri.startsWith('data:'));

  const announcements = allPosts.filter(p => p.type === 'announcement');
  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;

  const FinanceBanner = null;

  // ── KPI chips for the new "Today at a Glance" strip ────────────────
  const kpiChips = useMemo<KpiChip[]>(() => [
    {
      id: 'events',
      label: 'Events',
      emoji: '🎉',
      value: upcomingEvents.length,
      icon: 'calendar-outline',
      color: '#4F46E5',
      bg: '#EEF2FF',
      iconBg: '#C7D2FE',
      route: '/tabs/events',
    },
    {
      id: 'health_buddy',
      label: 'Health Buddy',
      emoji: '🥗',
      value: 'Active',
      icon: 'heart-outline',
      color: '#059669',
      bg: '#ECFDF5',
      iconBg: '#A7F3D0',
      route: '/wellness',
    },
    {
      id: 'tickets',
      label: 'Tickets',
      emoji: '🎧',
      value: openTickets.length,
      icon: 'headset-outline',
      color: '#0891B2',
      bg: '#ECFEFF',
      iconBg: '#A5F3FC',
      route: '/helpdesk',
    },
    {
      id: 'sports',
      label: 'Live Sports',
      emoji: '🏆',
      value: 0,
      icon: 'trophy-outline',
      color: '#059669',
      bg: '#ECFDF5',
      iconBg: '#A7F3D0',
      route: '/sports',
    },
    {
      id: 'notifs',
      label: 'Notifications',
      emoji: '🔔',
      value: unreadCount,
      icon: 'notifications-outline',
      color: '#2563EB',
      bg: '#EFF6FF',
      iconBg: '#BFDBFE',
      route: '/notifications',
    },
    {
      id: 'visitors',
      label: 'Gate Log',
      emoji: '🚪',
      value: 0,
      icon: 'shield-checkmark-outline',
      color: '#0891B2',
      bg: '#ECFEFF',
      iconBg: '#A5F3FC',
      route: '/visitors',
    },
  ], [upcomingEvents.length, activePollsPage?.totalElements, openTickets.length, unreadCount]);

  // ── Quick Stats Row (legacy — kept for other parts if reused) ────────
  const statTiles = useMemo(() => [
    { id: 'events',  label: 'Events',  emoji: '📅', value: upcomingEvents.length,                color: '#4F46E5', labelColor: '#3730A3', bg: '#EEF2FF', route: '/tabs/events' },
    { id: 'polls',   label: 'Polls',   emoji: '📊', value: activePollsPage?.totalElements ?? 0,  color: '#7C3AED', labelColor: '#5B21B6', bg: '#EDE9FE', route: '/polls' },
    { id: 'tickets', label: 'Tickets', emoji: '🎧', value: openTickets.length,                   color: '#0891B2', labelColor: '#155E75', bg: '#CFFAFE', route: '/helpdesk' },
    { id: 'sports',  label: 'Live',    emoji: '🏆', value: 0,                                    color: '#059669', labelColor: '#065F46', bg: '#DCFCE7', route: '/sports' },
    { id: 'notifs',  label: 'Notifs',  emoji: '🔔', value: unreadCount,                          color: '#2563EB', labelColor: '#1E40AF', bg: '#DBEAFE', route: '/notifications' },
  ], [upcomingEvents.length, activePollsPage?.totalElements, openTickets.length, unreadCount]);

  // Resident pass card data derived from the auth user
  const flatNumber   = user?.flatNumber ?? user?.flatNo ?? undefined;
  const tower        = user?.tower ?? user?.block ?? undefined;
  const residentId   = user?.id ? `MNA-${String(user.id).padStart(4, '0')}` : 'MNA-0001';
  const manaPoints   = (user as any)?.manaPoints ?? 0;

  const ListHeader = useMemo(() => (
    <View style={styles.headerStack}>

      {/* ── 1. Resident Pass Hero Card (Hidden for now) ── */}
      {/* <ResidentPassCard
        residentName={userDisplayName}
        flatNumber={flatNumber}
        tower={tower}
        communityName={communityName || undefined}
        duesPaid
        manaPoints={manaPoints}
        residentId={residentId}
      /> */}

      {/* ── 2. Today at a Glance KPI Strip (NEW — Figma redesign) ── */}
      <TodayAtAGlance chips={kpiChips} />

      <FlatGateActivityCard />
      {FinanceBanner}
      <QuickActions />

      {/* ── 3. Community Highlight Banner (NEW — Figma redesign) ── */}
      {latestAnnouncement && (
        <CommunityHighlightBanner
          eyebrow="COMMUNITY UPDATE"
          title={latestAnnouncement.content.split('\n')[0]}
          description={
            latestAnnouncement.content.includes('\n')
              ? latestAnnouncement.content.split('\n').slice(1).join(' ').trim()
              : undefined
          }
          decorEmoji="📢"
          onPress={() => router.push('/tabs/feed')}
        />
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionEmoji}>🎉</Text>
              <View>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <Text style={styles.sectionSub}>{upcomingEvents.length} events this week</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => router.push('/tabs/events')}
            >
              <Text style={styles.seeAll}>See All</Text>
              <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsScroll}
          >
            {upcomingEvents.slice(0, 5).map((event) => (
              <UpcomingEventCard
                key={event.id}
                event={event}
                onPress={() => router.push(`/events/${event.id}`)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Composer Card */}
      <View style={styles.composerCard}>
        <View style={styles.composerRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowUserPhotoModal(true)}
          >
            {hasUserPhoto ? (
              <Image
                source={{ uri: userPhotoUri }}
                style={styles.composerAvatarImage}
                onError={() => setUserPhotoError(true)}
              />
            ) : (
              <LinearGradient
                colors={GRADIENTS.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.composerAvatar}
              >
                <Text style={styles.composerAvatarText}>{userInitial}</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.composerInput}
            onPress={() => router.push('/polls/create')}
            activeOpacity={0.8}
          >
            <Text style={styles.composerPlaceholder} numberOfLines={1}>
              Share with neighbors...
            </Text>
          </TouchableOpacity>
          <View style={styles.composerIconRow}>
            <TouchableOpacity
              style={[styles.composerIconChip, { backgroundColor: '#EDE9FE' }]}
              onPress={() => router.push('/polls/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Text style={styles.composerChipEmoji}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.composerIconChip, { backgroundColor: '#DBEAFE' }]}
              onPress={() => router.push('/polls/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Text style={styles.composerChipEmoji}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.composerIconChip, { backgroundColor: '#CCFBF1' }]}
              onPress={() => router.push('/events/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Text style={styles.composerChipEmoji}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.composerIconChip, { backgroundColor: '#FEF3C7' }]}
              onPress={() => router.push('/polls/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Text style={styles.composerChipEmoji}>📸</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Feed Filter Chips */}
      <View style={styles.filterSection}>
        <View style={styles.filterTitleRow}>
          <View style={styles.feedHeadingRow}>
            <Text style={styles.feedHeadingEmoji}>📰</Text>
            <Text style={styles.feedHeading}>Community Feed</Text>
          </View>
          <Text style={styles.postCount}>{filteredPosts.length} posts</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FEED_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.filterEmoji}>{f.emoji}</Text>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  ), [filter, filteredPosts.length, router, userDisplayName, flatNumber, tower, communityName, manaPoints, residentId, kpiChips, userInitial, avatarColor, latestAnnouncement, upcomingEvents, FinanceBanner, user?.profilePicUrl, user?.profilePhoto]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Clean White Top Bar ────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.welcomeRow}
          onPress={() => router.push('/tabs/profile')}
          activeOpacity={0.7}
        >
          {hasUserPhoto ? (
            <Image
              source={{ uri: userPhotoUri }}
              style={styles.profileAvatarImage}
              onError={() => setUserPhotoError(true)}
            />
          ) : (
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{userInitial}</Text>
            </View>
          )}
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeLabel}>{greeting} 👋</Text>
            <Text style={styles.welcomeName}>{userName}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          {!!communityName && !isSearchOpen && (
            <View style={styles.communityBadge}>
              <Text style={styles.communityBadgeEmoji}>🏠</Text>
              <Text style={styles.communityBadgeText}>{communityName}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.headerIconBtn, isSearchOpen && styles.headerIconBtnActive]}
            onPress={() => {
              setIsSearchOpen((prev) => !prev);
              if (isSearchOpen) setSearchQuery('');
            }}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.headerIconEmoji}>{isSearchOpen ? '✕' : '🔍'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyBtn}
            onPress={() => router.push('/emergency')}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.emergencyEmoji}>🚨</Text>
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>24x7</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Text style={styles.notifEmoji}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Bar ─────────────────────────────── */}
      {isSearchOpen && (
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBarCurved}>
            <Text style={styles.searchEmoji}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search updates, notices, neighbors..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Feed List ─────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading community feed...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>Be the first to share an update with your neighbors!</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/polls/create')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#312E81', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyBtnGradient}
                >
                  <Text style={styles.emptyBtnEmoji}>✏️</Text>
                  <Text style={styles.emptyBtnText}>Create Post</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Enlarged Current User Photo Modal */}
      <ProfileImageModal
        visible={showUserPhotoModal}
        onClose={() => setShowUserPhotoModal(false)}
        imageUrl={hasUserPhoto ? userPhotoUri : null}
        name={userDisplayName}
        subtitle={communityName || 'Resident'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },

  // ── Loading ──────────────────────────────────────────────────────
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },

  // ── Quick Stats Row ───────────────────────────────────────────────
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 2,
    gap: 6,
  },
  statTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
    ...SHADOWS.sm,
  },
  statTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontFamily: FONTS.displayEB,
    lineHeight: 22,
  },
  statEmoji: { fontSize: 12 },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.1,
  },

  // ── Gradient Top Bar ──────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 8,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.brandLight,
    borderWidth: 1,
    borderColor: THEME.brandBorder,
  },
  profileAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.brandBorder,
  },
  profileAvatarText: {
    color: THEME.brandDark,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.displayBold,
  },
  welcomeText: {},
  welcomeLabel: {
    fontSize: 11.5,
    color: THEME.textSecondary,
    fontFamily: FONTS.medium,
  },
  welcomeName: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  communityBadgeEmoji: { fontSize: 11 },
  communityBadgeText: {
    color: THEME.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: THEME.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  headerIconBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  headerIconEmoji: { fontSize: 16 },
  emergencyBtn: {
    width: 37,
    height: 37,
    borderRadius: 12,
    backgroundColor: 'rgba(220,38,38,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.35)',
  },
  emergencyEmoji: { fontSize: 16 },
  emergencyBadge: {
    position: 'absolute',
    top: -5,
    right: -6,
    backgroundColor: '#DC2626',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  emergencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: FONTS.bold,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: THEME.surfaceMuted,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  notifEmoji: { fontSize: 16 },
  badge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#DC2626',
    borderRadius: 20,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: FONTS.bold, fontWeight: '800',
  },

  // ── Search Bar ────────────────────────────────────────────────────
  searchBarWrap: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FAFBFC',
  },
  searchBarCurved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 9 : 4,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 8,
  },
  searchEmoji: { fontSize: 14 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 5,
    fontFamily: FONTS.regular,
  },

  // ── Header Stack ───────────────────────────────────────────────────
  headerStack: { gap: 0, paddingBottom: 4 },

  // ── Announcement Card ──────────────────────────────────────────────
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  announcementGradient: {
    ...StyleSheet.absoluteFill,
  },
  announcementIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(79,70,229,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  announcementEmoji: { fontSize: 20 },
  announcementContent: { flex: 1 },
  announcementLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.6,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
    marginBottom: 2,
  },
  announcementDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
    fontFamily: FONTS.regular,
  },
  announcementArrow: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── Upcoming Events ────────────────────────────────────────────────
  eventsSection: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionEmoji: { fontSize: 17 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  sectionSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    marginTop: 0.5,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  seeAll: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  eventsScroll: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 2,
  },

  // ── Composer Card ──────────────────────────────────────────────────
  composerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: RADIUS.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  composerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  composerAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    fontFamily: FONTS.displayBold,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    justifyContent: 'center',
  },
  composerPlaceholder: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  composerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  composerIconChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerChipEmoji: { fontSize: 14 },

  // ── Filter Section ─────────────────────────────────────────────────
  filterSection: {
    paddingTop: 20,
    gap: 10,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  feedHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedHeadingEmoji: { fontSize: 18 },
  feedHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  postCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  filterChipActive: {
    backgroundColor: THEME.brandLight,
    borderColor: THEME.brandBorder,
  },
  filterEmoji: { fontSize: 13 },
  filterText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.textSecondary,
    fontFamily: FONTS.semiBold,
  },
  filterTextActive: {
    color: THEME.brandDark,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── Post Card ──────────────────────────────────────────────────────
  list: { paddingBottom: 28 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.card,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardAccent: {
    width: 3.5,
    flexShrink: 0,
  },
  cardInner: {
    flex: 1,
    padding: 14,
    gap: 11,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 15,
    fontFamily: FONTS.displayBold,
  },
  authorInfo: { flex: 1 },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  flatChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  flatChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  authorMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    fontFamily: FONTS.regular,
  },
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  typeBadgeEmoji: { fontSize: 10 },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: FONTS.bold,
  },
  content: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 21,
    fontFamily: FONTS.regular,
  },
  pollContainer: { marginTop: 2 },
  mediaWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: 2,
  },
  mediaImage: {
    width: '100%',
    height: 185,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E8F0',
  },
  actionsRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  actionBtnIcon: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  actionBtnLiked: { backgroundColor: '#FEE2E2' },
  actionEmoji: { fontSize: 15 },
  actionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  likedText: { color: COLORS.error },

  // ── Empty State ────────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONTS.regular,
  },
  emptyBtn: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: 6,
    ...SHADOWS.md,
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnEmoji: { fontSize: 14 },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
});
