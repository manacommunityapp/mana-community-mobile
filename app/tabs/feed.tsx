import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Image,
  TouchableOpacity, ActivityIndicator, ListRenderItemInfo,
  Share, ScrollView, Dimensions, TextInput, Platform,
} from 'react-native';
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
import { PostDto, EventDto } from '@/types/api';
import { COLORS, SHADOWS, RADIUS, FONTS, GRADIENTS, getAvatarColor, getInitials } from '@/constants/config';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

const SCREEN_W = Dimensions.get('window').width;
const EVENT_CARD_W = SCREEN_W * 0.68;

type FeedFilter = 'ALL' | 'ANNOUNCEMENT' | 'POLL' | 'GENERAL';

const FEED_FILTERS: { key: FeedFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL',          label: 'All',          icon: 'sparkles-outline' },
  { key: 'ANNOUNCEMENT', label: 'Notices',      icon: 'megaphone-outline' },
  { key: 'POLL',         label: 'Polls',        icon: 'stats-chart-outline' },
  { key: 'GENERAL',      label: 'Community',    icon: 'chatbubbles-outline' },
];

const POST_TYPE_META: Record<string, { label: string; color: string; bg: string; accent: string }> = {
  poll:         { label: 'POLL',      color: '#7C3AED', bg: '#EDE9FE', accent: '#7C3AED' },
  announcement: { label: 'NOTICE',    color: '#4F46E5', bg: '#EEF2FF', accent: '#4F46E5' },
  post:         { label: 'COMMUNITY', color: '#2563EB', bg: '#DBEAFE', accent: '#2563EB' },
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
          <Ionicons name="calendar" size={28} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={es.dateBadgeWrap}>
          <Text style={es.dateBadge}>
            {fmtDate(event.startDate)}{event.startTime ? `  •  ${fmtTime(event.startTime)}` : ''}
          </Text>
        </View>
      </LinearGradient>

      <View style={es.body}>
        <Text style={es.title} numberOfLines={1}>{event.title}</Text>
        <View style={es.attendeeRow}>
          <View style={es.avatarStack}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[es.miniAvatar, { left: i * 16, backgroundColor: ['#4F46E5','#059669','#0891B2'][i] }]}>
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
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  imageArea: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  eventIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dateBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.4,
    fontFamily: FONTS.bold,
  },
  body: {
    padding: 12,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.2,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
    width: 58,
    height: 22,
    position: 'relative',
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  miniAvatarText: {
    color: '#fff',
    fontSize: 8,
    fontFamily: FONTS.bold, fontWeight: '800',
  },
  attendeeCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    marginLeft: 6,
  },
});

// ── Post Card ──────────────────────────────────────────────────────
function PostCard({ post }: { post: PostDto }) {
  const qc = useQueryClient();
  const { user } = useAuth();

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
  const flatLabel = post.authorFlat ? ` · ${post.authorFlat}` : '';
  const timeAgo = (() => {
    if (!post.createdAt) return 'recently';
    try { return formatDistanceToNow(new Date(post.createdAt), { addSuffix: false }); }
    catch { return 'recently'; }
  })();

  return (
    <View style={styles.card}>
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: typeMeta.accent }]} />

      <View style={styles.cardInner}>
        {/* Author Row */}
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
            <Text style={[styles.avatarText, { color: avatarColor.text }]}>
              {getInitials(post.authorName)}
            </Text>
          </View>

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
            <Ionicons
              name={post.liked ? 'heart' : 'heart-outline'}
              size={17}
              color={post.liked ? COLORS.error : COLORS.textMuted}
            />
            <Text style={[styles.actionText, post.liked && styles.likedText]}>
              {post.likeCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.actionText}>{post.commentCount || 0}</Text>
          </TouchableOpacity>

          <View style={styles.actionsRight}>
            <TouchableOpacity style={styles.actionBtnIcon} onPress={handleShare} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  const hasUserPhoto = !userPhotoError && !!userPhotoUri && typeof userPhotoUri === 'string' && userPhotoUri.trim().length > 0 && !userPhotoUri.includes('null') && !userPhotoUri.includes('undefined') && (userPhotoUri.startsWith('http') || userPhotoUri.startsWith('file://') || userPhotoUri.startsWith('data:'));

  const announcements = allPosts.filter(p => p.type === 'announcement');
  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;

  // ── Finance Banner ─────────────────────────────────────────────────
  // Hidden until finance API is wired up — avoids showing stale hardcoded amounts
  const FinanceBanner = null;

  // ── Quick Stats Row (dynamic) ───────────────────────────────────────
  const statTiles = useMemo(() => [
    { id: 'events',  label: 'Events',   value: upcomingEvents.length,                color: '#4F46E5', labelColor: '#3730A3', bg: '#EEF2FF', icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap, route: '/tabs/events' },
    { id: 'polls',   label: 'Polls',    value: activePollsPage?.totalElements ?? 0,  color: '#7C3AED', labelColor: '#5B21B6', bg: '#EDE9FE', icon: 'bar-chart-outline' as keyof typeof Ionicons.glyphMap, route: '/polls' },
    { id: 'tickets', label: 'Tickets',  value: openTickets.length,                   color: '#0891B2', labelColor: '#155E75', bg: '#CFFAFE', icon: 'headset-outline' as keyof typeof Ionicons.glyphMap, route: '/helpdesk' },
    { id: 'sports',  label: 'Live',     value: 0,                                    color: '#059669', labelColor: '#065F46', bg: '#DCFCE7', icon: 'trophy-outline' as keyof typeof Ionicons.glyphMap, route: '/sports' },
    { id: 'notifs',  label: 'Notifs',   value: unreadCount,                          color: '#2563EB', labelColor: '#1E40AF', bg: '#DBEAFE', icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap, route: '/notifications' },
  ], [upcomingEvents.length, activePollsPage?.totalElements, openTickets.length, unreadCount]);

  const StatsRow = useMemo(() => (
    <View style={styles.statsContainer}>
      {statTiles.map(tile => (
        <TouchableOpacity
          key={tile.id}
          style={[styles.statTile, { backgroundColor: tile.bg }]}
          onPress={() => router.push(tile.route as any)}
          activeOpacity={0.7}
        >
          <View style={styles.statTileTop}>
            <Text style={[styles.statNum, { color: tile.color }]}>{tile.value}</Text>
            <Ionicons name={tile.icon} size={12} color={tile.color} style={{ opacity: 0.7 }} />
          </View>
          <Text style={[styles.statLabel, { color: tile.labelColor }]} numberOfLines={1}>
            {tile.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [statTiles, router]);

  const ListHeader = useMemo(() => (
    <View style={styles.headerStack}>
      {FinanceBanner}
      {StatsRow}
      <QuickActions />

      {/* Community Announcement Card */}
      {latestAnnouncement && (
        <View style={styles.announcementCard}>
          <LinearGradient
            colors={['#EEF2FF', '#E0E7FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.announcementGradient}
          />
          <View style={styles.announcementIconWrap}>
            <Ionicons name="volume-high" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.announcementContent}>
            <Text style={styles.announcementLabel}>COMMUNITY UPDATE</Text>
            <Text style={styles.announcementTitle} numberOfLines={1}>
              {latestAnnouncement.content.split('\n')[0]}
            </Text>
            <Text style={styles.announcementDesc} numberOfLines={2}>
              {latestAnnouncement.content}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </View>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
              <Text style={styles.sectionSub}>{upcomingEvents.length} events this week</Text>
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
              <Ionicons name="bar-chart-outline" size={15} color="#7C3AED" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.composerIconChip, { backgroundColor: '#DBEAFE' }]}
              onPress={() => router.push('/polls/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.composerIconChip, { backgroundColor: '#CCFBF1' }]}
              onPress={() => router.push('/events/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Ionicons name="calendar-outline" size={15} color="#0D9488" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.composerIconChip, { backgroundColor: '#FEF3C7' }]}
              onPress={() => router.push('/polls/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Ionicons name="camera-outline" size={15} color="#D97706" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Feed Filter Chips */}
      <View style={styles.filterSection}>
        <View style={styles.filterTitleRow}>
          <Text style={styles.feedHeading}>Community Feed</Text>
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
                <Ionicons
                  name={f.icon}
                  size={13}
                  color={active ? '#fff' : COLORS.textMuted}
                />
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  ), [filter, filteredPosts.length, router, userInitial, avatarColor, latestAnnouncement, upcomingEvents, FinanceBanner, StatsRow, user?.profilePicUrl, user?.profilePhoto]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top Bar ────────────────────────────────── */}
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
            <LinearGradient
              colors={GRADIENTS.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileAvatar}
            >
              <Text style={styles.profileAvatarText}>{userInitial}</Text>
            </LinearGradient>
          )}
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeLabel}>{greeting} 👋</Text>
            <Text style={styles.welcomeName}>{userName}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          {!!communityName && !isSearchOpen && (
            <View style={styles.communityBadge}>
              <Ionicons name="home-outline" size={11} color={COLORS.primary} />
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
            <Ionicons
              name={isSearchOpen ? 'close-outline' : 'search-outline'}
              size={21}
              color={isSearchOpen ? COLORS.primary : COLORS.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.emergencyBtn}
            onPress={() => router.push('/emergency')}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>24*7</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={21} color={COLORS.text} />
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
            <Ionicons name="search-outline" size={16} color={COLORS.primary} style={styles.searchIcon} />
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
              <LinearGradient
                colors={[COLORS.primaryLight, '#dde6ff']}
                style={styles.emptyIconWrap}
              >
                <Ionicons name="chatbubbles-outline" size={34} color={COLORS.primary} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyText}>Be the first to share an update with your neighbors!</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/polls/create')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={GRADIENTS.primary as unknown as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyBtnGradient}
                >
                  <Ionicons name="add-circle-outline" size={17} color="#fff" />
                  <Text style={styles.emptyBtnText}>Create Post</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

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

  // ── Finance Banner ────────────────────────────────────────────────
  financeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  financeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...SHADOWS.sm,
  },
  financeText: { flex: 1 },
  financeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: 0.7,
    fontFamily: FONTS.bold,
  },
  financeAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  financeAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.5,
  },
  financeDue: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: FONTS.medium,
  },
  payBtn: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...SHADOWS.sm,
  },
  payBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: FONTS.bold,
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
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
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
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    fontFamily: FONTS.semiBold,
    letterSpacing: 0.1,
  },

  // ── Welcome Top Bar ───────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: FONTS.displayBold,
  },
  welcomeText: {},
  welcomeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  welcomeName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.4,
    fontFamily: FONTS.displayEB,
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  communityBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  headerIconBtn: {
    width: 37,
    height: 37,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerIconBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryMid,
  },
  emergencyBtn: {
    width: 37,
    height: 37,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  emergencyBadge: {
    position: 'absolute',
    top: -5,
    right: -6,
    backgroundColor: '#DC2626',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  emergencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: FONTS.bold,
  },
  notifBtn: {
    width: 37,
    height: 37,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: COLORS.error,
    borderRadius: 20,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBarCurved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 9 : 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 6 },
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  announcementGradient: {
    ...StyleSheet.absoluteFill,
  },
  announcementIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(79,70,229,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
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

  // ── Upcoming Events ────────────────────────────────────────────────
  eventsSection: {
    marginTop: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
    fontFamily: FONTS.displayBold,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  eventsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },

  // ── Composer Card ──────────────────────────────────────────────────
  composerCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: FONTS.semiBold,
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── Post Card ──────────────────────────────────────────────────────
  list: { paddingBottom: 28 },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: COLORS.primaryLight,
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
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
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
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 2,
  },
  mediaImage: {
    width: '100%',
    height: 185,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
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
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    ...SHADOWS.primary,
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
});
