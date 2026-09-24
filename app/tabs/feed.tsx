import { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator, ListRenderItemInfo,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { feedService } from '@/services/feedService';
import { notificationService } from '@/services/notificationService';
import { PollCard } from '@/components/polls/PollCard';
import { PostDto } from '@/types/api';
import { COLORS } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

function PostCard({ post }: { post: PostDto }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const likeMutation = useMutation({
    mutationFn: () => feedService.likePost(post.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  return (
    <View style={styles.card}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.authorName[0]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.authorName}</Text>
          <Text style={styles.authorMeta}>
            {post.authorFlat} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </Text>
        </View>
        {post.type !== 'post' && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{post.type.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Content / Question */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Poll widget — embedded when post type is poll */}
      {post.type === 'poll' && post.poll && (
        <PollCard
          post={post}
          currentUserId={user?.id}
          compact
          onVoted={() => qc.invalidateQueries({ queryKey: ['feed'] })}
        />
      )}

      {/* Actions */}
      {post.type !== 'poll' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => likeMutation.mutate()}
          >
            <Text style={[styles.actionText, post.liked && styles.likedText]}>
              {post.liked ? '❤️' : '🤍'} {post.likeCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionText}>💬 {post.commentCount}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();

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

  const posts = data?.pages.flatMap((p) => p.content) ?? [];

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<PostDto>) => <PostCard post={item} />,
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Feed</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.pollFab}
            onPress={() => router.push('/jobs')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.pollFabText}>💼 Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pollFab}
            onPress={() => router.push('/polls/create')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.pollFabText}>📊 Poll</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bellWrap}
            onPress={() => router.push('/notifications')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.bell}>🔔</Text>
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

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage
              ? <ActivityIndicator style={{ padding: 20 }} color={COLORS.primary} />
              : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  headerTitle:     { fontSize: 20, fontWeight: '700', color: COLORS.text },
  headerActions:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pollFab:         { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#C7D2FE' },
  pollFabText:     { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  bellWrap:        { position: 'relative', padding: 4 },
  bell:            { fontSize: 22 },
  badge:           { position: 'absolute', top: 0, right: 0, backgroundColor: COLORS.error, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:       { color: '#fff', fontSize: 10, fontWeight: '800' },
  list:            { padding: 12, gap: 12 },
  card:            { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  authorRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  authorName:      { fontSize: 14, fontWeight: '600', color: COLORS.text },
  authorMeta:      { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  typeBadge:       { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText:   { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  content:         { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  actions:         { flexDirection: 'row', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText:      { fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  likedText:       { color: COLORS.error },
  empty:           { alignItems: 'center', paddingTop: 80 },
  emptyText:       { color: COLORS.textMuted, fontSize: 15 },
});
