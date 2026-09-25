import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, ListRenderItemInfo,
  Share,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { feedService } from '@/services/feedService';
import { notificationService } from '@/services/notificationService';
import { PollCard } from '@/components/polls/PollCard';
import { QuickActions } from '@/components/common/QuickActions';
import { PostDto } from '@/types/api';
import { COLORS, SHADOWS, RADIUS, getAvatarColor } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

type FeedFilter = 'ALL' | 'ANNOUNCEMENT' | 'POLL' | 'GENERAL';

const FEED_FILTERS: { key: FeedFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL',          label: 'All Updates', icon: 'sparkles-outline' },
  { key: 'ANNOUNCEMENT', label: 'Notices',     icon: 'megaphone-outline' },
  { key: 'POLL',         label: 'Polls',       icon: 'stats-chart-outline' },
  { key: 'GENERAL',      label: 'Community',   icon: 'chatbubbles-outline' },
];

const POST_TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  poll:         { label: 'POLL',         color: '#7C3AED', bg: '#EDE9FE' },
  announcement: { label: 'NOTICE',       color: '#D97706', bg: '#FEF3C7' },
  post:         { label: 'COMMUNITY',    color: '#2563EB', bg: '#DBEAFE' },
};

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
    } catch {
      // ignore
    }
  };

  const avatarColor = getAvatarColor(post.authorName || 'Neighbor');
  const typeMeta = POST_TYPE_META[post.type] || POST_TYPE_META.post;

  return (
    <View style={styles.card}>
      {/* Top Author Row */}
      <View style={styles.authorRow}>
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }]}>
            {(post.authorName || 'N')[0].toUpperCase()}
          </Text>
        </View>

        <View style={styles.authorInfo}>
          <View style={styles.nameLine}>
            <Text style={styles.authorName} numberOfLines={1}>
              {post.authorName || 'Community Member'}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg }]}>
              <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>
                {typeMeta.label}
              </Text>
            </View>
          </View>
          <Text style={styles.authorMeta}>
            {post.authorFlat ? `${post.authorFlat} · ` : ''}
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </View>

      {/* Main Post Text */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Embedded Interactive Poll Widget */}
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

      {/* Action Footer Bar */}
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

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FeedFilter>('ALL');

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
    queryFn:  notificationService.getUnreadCount,
    refetchInterval: 30_000,
  });

  const allPosts = useMemo(() => data?.pages.flatMap((p) => p.content) ?? [], [data]);

  const filteredPosts = useMemo(() => {
    if (filter === 'ALL') return allPosts;
    if (filter === 'ANNOUNCEMENT') return allPosts.filter(p => p.type === 'announcement');
    if (filter === 'POLL') return allPosts.filter(p => p.type === 'poll');
    if (filter === 'GENERAL') return allPosts.filter(p => p.type === 'post');
    return allPosts;
  }, [allPosts, filter]);

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

  const userInitial = (user?.name || 'Resident')[0].toUpperCase();
  const userUnit = user?.flatNo || user?.flatNumber || (user?.tower ? `Tower ${user.tower}` : 'Resident');

  const ListHeader = useMemo(() => (
    <View style={styles.headerStack}>
      {/* Quick Services Carousel */}
      <QuickActions />

      {/* Share / Create Box */}
      <View style={styles.composerCard}>
        <View style={styles.composerTop}>
          <View style={styles.miniAvatar}>
            <Text style={styles.miniAvatarText}>{userInitial}</Text>
          </View>
          <TouchableOpacity
            style={styles.composerInput}
            onPress={() => router.push('/polls/create')}
            activeOpacity={0.8}
          >
            <Text style={styles.composerPlaceholder}>
              Share an update or question...
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.composerActions}>
          <TouchableOpacity
            style={styles.chipBtn}
            onPress={() => router.push('/polls/create')}
            activeOpacity={0.7}
          >
            <Ionicons name="stats-chart" size={15} color="#7C3AED" />
            <Text style={[styles.chipText, { color: '#7C3AED' }]}>Create Poll</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chipBtn}
            onPress={() => router.push('/polls/create')}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={COLORS.primary} />
            <Text style={[styles.chipText, { color: COLORS.primary }]}>Discussion</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chipBtn}
            onPress={() => router.push('/events/create')}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={15} color="#0891B2" />
            <Text style={[styles.chipText, { color: '#0891B2' }]}>Host Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterSection}>
        <Text style={styles.feedHeading}>Community Feed</Text>
        <View style={styles.filterRow}>
          {FEED_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={f.icon}
                size={14}
                color={filter === f.key ? '#fff' : COLORS.textMuted}
              />
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  ), [filter, router, userInitial]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top Dashboard App Bar ───────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconWrap}>
            <Ionicons name="home" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.societyName}>Mana Community</Text>
            <Text style={styles.greetingText}>
              {greeting}, {user?.name?.split(' ')[0] || 'Neighbor'} · <Text style={styles.unitText}>{userUnit}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.topIconBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // ── Top Navigation Bar ─────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  societyName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  greetingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  unitText: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
  // ── Header Stack ───────────────────────────────────────────────
  headerStack: {
    gap: 12,
    paddingBottom: 4,
  },
  composerCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
    gap: 12,
  },
  composerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  composerInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  composerPlaceholder: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  composerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // ── Filter Section ─────────────────────────────────────────────
  filterSection: {
    paddingHorizontal: 14,
    paddingTop: 4,
    gap: 10,
  },
  feedHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterTextActive: {
    color: '#fff',
  },
  // ── Post Card ──────────────────────────────────────────────────
  list: {
    paddingBottom: 24,
  },
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
  avatarText: {
    fontWeight: '700',
    fontSize: 16,
  },
  authorInfo: {
    flex: 1,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  typeBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  pollContainer: {
    marginTop: 4,
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
  actionBtnLiked: {
    backgroundColor: '#FEE2E2',
  },
  actionText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  likedText: {
    color: COLORS.error,
  },
  // ── Empty State ────────────────────────────────────────────────
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
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
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
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
