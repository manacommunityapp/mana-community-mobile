import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedService } from '@/services/feedService';
import { useAuth } from '@/hooks/useAuth';
import { PostDto, PostType } from '@/types/api';
import { COLORS, RADIUS, SHADOWS, FONTS, getAvatarColor, getInitials } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { PostCommentSheet } from '@/components/feed/PostCommentSheet';
import { RichPostContent } from '@/components/feed/RichPostContent';
import { CachedImage as Image } from '@/components/common/CachedImage';
import { formatDistanceToNow } from 'date-fns';

type CategoryFilter = 'ALL' | 'ANNOUNCEMENT' | 'POST' | 'QUESTION' | 'CLASSIFIED' | 'LOST_FOUND';

const FILTER_TABS: { key: CategoryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL', label: 'All', icon: 'grid-outline' },
  { key: 'ANNOUNCEMENT', label: 'Notices', icon: 'megaphone-outline' },
  { key: 'POST', label: 'Discussions', icon: 'chatbubbles-outline' },
  { key: 'QUESTION', label: 'Questions', icon: 'help-circle-outline' },
  { key: 'CLASSIFIED', label: 'Buy & Sell', icon: 'pricetag-outline' },
  { key: 'LOST_FOUND', label: 'Lost & Found', icon: 'search-outline' },
];

export default function CommunityFeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState<PostDto | null>(null);

  // ── Infinite Posts Query ──────────────────────────────────────────────
  const {
    data,
    isLoading,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['community-feed-all', activeTab, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      if (searchQuery.trim()) {
        return feedService.searchPosts(searchQuery.trim(), pageParam, 15);
      }
      return feedService.getPosts(pageParam, 15);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.hasNext === false) return undefined;
      const currentPage = lastPage.page ?? lastPage.number ?? 0;
      const totalPages = lastPage.totalPages ?? 1;
      return currentPage + 1 < totalPages ? currentPage + 1 : undefined;
    },
    staleTime: 30_000,
  });

  const allPosts = useMemo(() => {
    const rawList = data?.pages.flatMap((p) => p.content || []) || [];
    if (activeTab === 'ALL') return rawList;
    return rawList.filter((p) => {
      const type = (p.type || p.postType || '').toUpperCase();
      if (activeTab === 'ANNOUNCEMENT') return type === 'ANNOUNCEMENT' || p.official;
      if (activeTab === 'POST') return type === 'POST' || type === 'GENERAL';
      return type === activeTab;
    });
  }, [data, activeTab]);

  // ── Like Mutation ───────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: (postId: number) => feedService.likePost(postId),
    onMutate: async (postId: number) => {
      await queryClient.cancelQueries({ queryKey: ['community-feed-all'] });
      queryClient.setQueriesData({ queryKey: ['community-feed-all'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            content: (page.content || []).map((p: PostDto) => {
              if (p.id === postId) {
                const liked = !p.liked;
                return {
                  ...p,
                  liked,
                  likesCount: liked ? (p.likesCount || 0) + 1 : Math.max(0, (p.likesCount || 1) - 1),
                };
              }
              return p;
            }),
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feed-all'] });
      queryClient.invalidateQueries({ queryKey: ['home-feed'] });
    },
  });

  // ── Bookmark Mutation ───────────────────────────────────────────────
  const bookmarkMutation = useMutation({
    mutationFn: (postId: number) => feedService.toggleBookmark(postId),
    onMutate: async (postId: number) => {
      queryClient.setQueriesData({ queryKey: ['community-feed-all'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            content: (page.content || []).map((p: PostDto) => {
              if (p.id === postId) {
                return { ...p, bookmarked: !p.bookmarked };
              }
              return p;
            }),
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feed-all'] });
    },
  });

  const handleShare = useCallback(async (post: PostDto) => {
    try {
      await Share.share({
        title: post.title || 'Community Update',
        message: `${post.title ? post.title + '\n\n' : ''}${post.content}\n\n— Shared via Mana Community`,
      });
    } catch {}
  }, []);

  const renderPostItem = ({ item }: { item: PostDto }) => {
    const authorName = item.authorName || (item as any).author?.name || 'Neighbor';
    const initials = getInitials(authorName);
    const avatarColor = getAvatarColor(authorName);
    const unit = item.flatNumber || (item as any).author?.flatNumber;
    const isOfficial = item.official || item.type === 'announcement';

    let timeAgo = '';
    try {
      timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
    } catch {
      timeAgo = 'recently';
    }

    return (
      <View style={s.postCard}>
        {/* Author Header */}
        <View style={s.postHeader}>
          <View style={[s.avatar, { backgroundColor: avatarColor }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.authorMeta}>
            <View style={s.nameRow}>
              <Text style={s.authorName} numberOfLines={1}>
                {authorName}
              </Text>
              {isOfficial && (
                <View style={s.officialBadge}>
                  <Ionicons name="shield-checkmark" size={11} color="#4F46E5" />
                  <Text style={s.officialBadgeText}>Official</Text>
                </View>
              )}
            </View>
            <Text style={s.timestamp}>
              {unit ? `Unit ${unit} · ` : ''}{timeAgo}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => bookmarkMutation.mutate(item.id)}
            hitSlop={8}
            style={s.bookmarkBtn}
          >
            <Ionicons
              name={item.bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={item.bookmarked ? '#4F46E5' : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Title & Body */}
        {!!item.title && <Text style={s.postTitle}>{item.title}</Text>}
        <RichPostContent post={item} />

        {/* Attached Image */}
        {!!item.imageUrl && (
          <View style={s.imageWrap}>
            <Image
              source={{ uri: item.imageUrl }}
              style={s.postImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Action Bar (Like, Comment, Share) */}
        <View style={s.actionBar}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => likeMutation.mutate(item.id)}
            hitSlop={6}
          >
            <Ionicons
              name={item.liked ? 'heart' : 'heart-outline'}
              size={19}
              color={item.liked ? '#DC2626' : COLORS.textSecondary}
            />
            <Text style={[s.actionCount, item.liked && { color: '#DC2626', fontWeight: '600' }]}>
              {item.likesCount ?? 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => setActivePostForComments(item)}
            hitSlop={6}
          >
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.textSecondary} />
            <Text style={s.actionCount}>{item.commentsCount ?? 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, { marginLeft: 'auto' }]}
            onPress={() => handleShare(item)}
            hitSlop={6}
          >
            <Ionicons name="share-social-outline" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={THEME.brandDark} />
          <Text style={s.loadingText}>Loading community feed...</Text>
        </View>
      );
    }

    return (
      <View style={s.emptyCard}>
        <View style={s.emptyIconCircle}>
          <Ionicons name="chatbubbles" size={32} color="#4F46E5" />
        </View>
        <Text style={s.emptyTitle}>No posts here yet</Text>
        <Text style={s.emptySub}>
          {searchQuery
            ? `No posts found matching "${searchQuery}". Try another keyword.`
            : 'Be the first neighbor to start a discussion, share news, or ask a question!'}
        </Text>
        <TouchableOpacity
          style={s.createFirstBtn}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={s.createFirstBtnText}>Create Post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>

        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle}>Community Feed</Text>
          <Text style={s.headerSub}>{user?.communityName || 'Your Community'}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={s.newPostBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={s.newPostBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search Bar ── */}
      <View style={s.searchBarWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search topics, hashtags, recommendations..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={6}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Filter Tabs ── */}
      <View style={s.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.filtersScroll}
          renderItem={({ item }) => {
            const active = activeTab === item.key;
            return (
              <TouchableOpacity
                onPress={() => setActiveTab(item.key)}
                style={[s.filterChip, active && s.filterChipActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={14}
                  color={active ? '#FFFFFF' : COLORS.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Main Feed List ── */}
      <FlatList
        data={allPosts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPostItem}
        contentContainerStyle={allPosts.length === 0 ? s.emptyListContent : s.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={THEME.brandDark}
          />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={s.footerLoading}>
              <ActivityIndicator size="small" color={THEME.brandDark} />
            </View>
          ) : null
        }
      />

      {/* ── Floating Action Button for New Post ── */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.9}
        accessibilityLabel="Create New Post"
      >
        <Ionicons name="create-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ── Modals & Sheets ── */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />

      <PostCommentSheet
        visible={!!activePostForComments}
        post={activePostForComments}
        onClose={() => setActivePostForComments(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background ?? '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  newPostBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 9 : 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#4F46E5',
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 84,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 84,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...SHADOWS.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4F46E5',
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  bookmarkBtn: {
    padding: 4,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  imageWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#F1F5F9',
  },
  postImage: {
    width: '100%',
    height: 200,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 10,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 28,
    alignItems: 'center',
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  createFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
});
