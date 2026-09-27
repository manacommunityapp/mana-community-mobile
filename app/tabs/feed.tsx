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
import { feedService } from '@/services/feedService';
import { notificationService } from '@/services/notificationService';
import { eventService } from '@/services/eventService';
import { PollCard } from '@/components/polls/PollCard';
import { QuickActions } from '@/components/common/QuickActions';
import { PostDto, EventDto } from '@/types/api';
import { COLORS, SHADOWS, RADIUS, getAvatarColor } from '@/constants/config';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

const SCREEN_W = Dimensions.get('window').width;
const EVENT_CARD_W = SCREEN_W * 0.65;

type FeedFilter = 'ALL' | 'ANNOUNCEMENT' | 'POLL' | 'GENERAL';

const FEED_FILTERS: { key: FeedFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL',          label: 'All Updates', icon: 'sparkles-outline' },
  { key: 'ANNOUNCEMENT', label: 'Notices',     icon: 'megaphone-outline' },
  { key: 'POLL',         label: 'Polls',       icon: 'stats-chart-outline' },
  { key: 'GENERAL',      label: 'Community',   icon: 'chatbubbles-outline' },
];

const POST_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  poll:         { label: 'POLL',      color: '#7C3AED', bg: '#EDE9FE' },
  announcement: { label: 'NOTICE',    color: '#4F46E5', bg: '#EEF2FF' },
  post:         { label: 'COMMUNITY', color: '#2563EB', bg: '#DBEAFE' },
};

// ── Upcoming Event Card (horizontal carousel) ──────────────────────
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

  return (
    <TouchableOpacity style={es.card} onPress={onPress} activeOpacity={0.8}>
      {/* Placeholder image area */}
      <View style={es.imagePlaceholder}>
        <Ionicons name="image-outline" size={36} color={COLORS.primaryMid} />
      </View>

      {/* Date badge overlay */}
      <Text style={es.dateBadge}>
        {fmtDate(event.startDate)} {event.startTime ? `• ${fmtTime(event.startTime)}` : ''}
      </Text>

      <Text style={es.title} numberOfLines={1}>{event.title}</Text>

      {/* Attendee row */}
      <View style={es.attendeeRow}>
        <View style={es.avatarStack}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[es.miniAvatar, { left: i * 14, backgroundColor: ['#4F46E5','#059669','#0891B2'][i] }]}>
              <Text style={es.miniAvatarText}>{['A','B','C'][i]}</Text>
            </View>
          ))}
        </View>
        {count > 3 && (
          <Text style={es.moreText}>+{count - 3}</Text>
        )}
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
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    paddingHorizontal: 12,
    paddingTop: 10,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    width: 56,
    height: 24,
    position: 'relative',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  miniAvatarText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 10,
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
  const flatLabel = post.authorFlat ? ` (${post.authorFlat})` : '';
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: false });

  return (
    <View style={styles.card}>
      {/* Author Row */}
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }]}>
            {(post.authorName || 'N')[0].toUpperCase()}
          </Text>
        </View>

        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.authorName || 'Community Member'}{flatLabel}
          </Text>
          <Text style={styles.authorMeta}>
            {timeAgo} ago • {typeMeta.label}
          </Text>
        </View>

        <TouchableOpacity hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
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

      {/* Media image placeholder */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <View style={styles.mediaPlaceholder}>
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
            size={18}
            color={post.liked ? COLORS.error : COLORS.textMuted}
          />
          <Text style={[styles.actionText, post.liked && styles.likedText]}>
            {post.likeCount || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={17} color={COLORS.textMuted} />
          <Text style={styles.actionText}>{post.commentCount || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={17} color={COLORS.textMuted} />
        </TouchableOpacity>
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

  const userName = user?.name?.split(' ')[0] || 'Neighbor';
  const communityName = user?.communityName || '';
  const userInitial = (user?.name || 'R')[0].toUpperCase();
  const avatarColor = getAvatarColor(user?.name || 'Resident');

  // Announcements for the banner
  const announcements = allPosts.filter(p => p.type === 'announcement');
  const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;

  // ── Finance Banner ─────────────────────────────────────────────────
  const FinanceBanner = useMemo(() => (
    <View style={styles.financeBanner}>
      <View style={styles.financeIcon}>
        <Ionicons name="card-outline" size={18} color="#fff" />
      </View>
      <View style={styles.financeText}>
        <Text style={styles.financeLabel}>Outstanding Balance</Text>
        <Text style={styles.financeAmount}>₹4,500 <Text style={styles.financeDue}>due 15th Oct</Text></Text>
      </View>
      <TouchableOpacity
        style={styles.payBtn}
        onPress={() => router.push('/finance')}
        activeOpacity={0.85}
      >
        <Text style={styles.payBtnText}>Pay Now</Text>
      </TouchableOpacity>
    </View>
  ), [router]);

  // ── Quick Stats Row ────────────────────────────────────────────────
  const StatsRow = useMemo(() => (
    <View style={styles.statsRow}>
      <View style={[styles.statTile, { backgroundColor: '#FEF3C7' }]}>
        <Text style={[styles.statNum, { color: '#D97706' }]}>2</Text>
        <Text style={[styles.statLabel, { color: '#92400E' }]}>Events Today</Text>
      </View>
      <View style={[styles.statTile, { backgroundColor: '#DBEAFE' }]}>
        <Text style={[styles.statNum, { color: '#2563EB' }]}>8</Text>
        <Text style={[styles.statLabel, { color: '#1E40AF' }]}>Unread Msgs</Text>
      </View>
      <View style={[styles.statTile, { backgroundColor: '#EDE9FE' }]}>
        <Text style={[styles.statNum, { color: '#7C3AED' }]}>3</Text>
        <Text style={[styles.statLabel, { color: '#5B21B6' }]}>Active Polls</Text>
      </View>
    </View>
  ), []);

  const ListHeader = useMemo(() => (
    <View style={styles.headerStack}>
      {/* Finance Banner */}
      {FinanceBanner}

      {/* Quick Stats Row */}
      {StatsRow}

      {/* Quick Action Services */}
      <QuickActions />

      {/* Community Announcement Card */}
      {latestAnnouncement && (
        <View style={styles.announcementCard}>
          <View style={styles.announcementIconWrap}>
            <Ionicons name="volume-high" size={22} color={COLORS.primary} />
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
        </View>
      )}

      {/* Upcoming Events Section */}
      {upcomingEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => router.push('/tabs/events')}>
              <Text style={styles.seeAll}>See All</Text>
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
          <View style={[styles.composerAvatar, { backgroundColor: avatarColor.bg }]}>
            <Text style={styles.composerAvatarText}>{userInitial}</Text>
          </View>
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
              style={[styles.iconChip, { backgroundColor: '#EDE9FE' }]}
              onPress={() => router.push('/polls/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Ionicons name="stats-chart" size={15} color="#7C3AED" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconChip, { backgroundColor: '#DBEAFE' }]}
              onPress={() => router.push('/polls/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Ionicons name="chatbubble-ellipses" size={15} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconChip, { backgroundColor: '#CCFBF1' }]}
              onPress={() => router.push('/events/create')}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Ionicons name="calendar" size={15} color="#0D9488" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconChip, { backgroundColor: '#FEF3C7' }]}
              activeOpacity={0.7}
              hitSlop={4}
            >
              <Ionicons name="camera" size={15} color="#D97706" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Feed Filter Chips */}
      <View style={styles.filterSection}>
        <Text style={styles.feedHeading}>Community Feed</Text>
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
                  size={14}
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
  ), [filter, router, userInitial, avatarColor, latestAnnouncement, upcomingEvents, FinanceBanner, StatsRow]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Welcome Top Bar (Profile on top side header) ────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.welcomeRow}
          onPress={() => router.push('/tabs/profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.profileAvatar, { backgroundColor: avatarColor.bg }]}>
            <Text style={styles.profileAvatarText}>{userInitial}</Text>
          </View>
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeLabel}>{greeting} 👋</Text>
            <Text style={styles.welcomeName}>{userName}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          {!!communityName && !isSearchOpen && (
            <View style={styles.communityBadge}>
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
              size={22}
              color={isSearchOpen ? COLORS.primary : COLORS.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
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

      {/* ── Expandable Search Bar (Revealed when search button is clicked) ────── */}
      {isSearchOpen && (
        <View style={styles.searchBarWrap}>
          <View style={styles.searchBarCurved}>
            <Ionicons name="search-outline" size={17} color={COLORS.primary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search updates, notices, events, neighbors..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                hitSlop={8}
              >
                <Ionicons name="close-outline" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Feed List ─────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
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
                <Ionicons name="chatbubbles-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>No posts in this category</Text>
              <Text style={styles.emptyText}>Be the first to share an update with your neighbors!</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/polls/create')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Post</Text>
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

  // ── Finance Banner ────────────────────────────────────────────────
  financeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  financeIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  financeText: { flex: 1 },
  financeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  financeAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#D97706',
  },
  financeDue: {
    fontSize: 11,
    fontWeight: '400',
    color: '#78716C',
  },
  payBtn: {
    backgroundColor: '#D97706',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  payBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Quick Stats Row ───────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statTile: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },

  // ── Welcome Top Bar ───────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  welcomeText: {},
  welcomeLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  communityBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  communityBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
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
    fontWeight: '800',
  },

  // ── Curved Search Bar ───────────────────────────────────────────────
  searchBarWrap: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBarCurved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    paddingVertical: 6,
  },
  searchFilterBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  // ── Header Stack ───────────────────────────────────────────────
  headerStack: { gap: 0, paddingBottom: 4 },

  // ── Announcement Card ─────────────────────────────────────────
  announcementCard: {
    flexDirection: 'row',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  announcementIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementContent: { flex: 1 },
  announcementLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  announcementDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // ── Upcoming Events Section ───────────────────────────────────
  eventsSection: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  eventsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },

  // ── Composer Card ─────────────────────────────────────────────
  composerCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  composerInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  composerPlaceholder: { fontSize: 12, color: COLORS.textMuted },
  composerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  iconChip: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  // ── Filter Section ────────────────────────────────────────────
  filterSection: {
    paddingTop: 18,
    gap: 10,
  },
  feedHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
    paddingHorizontal: 16,
  },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  // ── Post Card ─────────────────────────────────────────────────
  list: { paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', fontSize: 16 },
  authorInfo: { flex: 1 },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  authorMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  pollContainer: { marginTop: 4 },
  mediaPlaceholder: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
  },
  actionBtnLiked: { backgroundColor: '#FEE2E2' },
  actionText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  likedText: { color: COLORS.error },

  // ── Empty State ───────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    paddingTop: 50,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 6,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
