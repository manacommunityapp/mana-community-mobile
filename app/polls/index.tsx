import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { pollService } from '@/services/pollService';
import { PollCard } from '@/components/polls/PollCard';
import { COLORS } from '@/constants/config';
import { formatDistanceToNow, isPast } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import type { PostDto } from '@/types/api';

type Tab = 'ACTIVE' | 'CLOSED' | 'MINE';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'ACTIVE', label: 'Active',  emoji: '📊' },
  { key: 'CLOSED', label: 'Closed',  emoji: '🔒' },
  { key: 'MINE',   label: 'My Polls',emoji: '✍️' },
];

function PollListItem({ post }: { post: PostDto }) {
  const router = useRouter();
  const poll   = post.poll;
  if (!poll) return null;

  const isExpired = poll.deadline ? isPast(new Date(poll.deadline)) : false;
  const isClosed  = !poll.isActive || isExpired;
  const hasVoted  = (poll.votedOptionIds?.length ?? 0) > 0 || !!poll.votedOptionId;

  return (
    <View style={s.item}>
      {/* Author */}
      <View style={s.authorRow}>
        <View style={s.avatar}><Text style={s.avatarText}>{post.authorName[0]}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.authorName}>{post.authorName}</Text>
          <Text style={s.authorMeta}>
            {post.authorFlat} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </Text>
        </View>
        {hasVoted && !isClosed && (
          <View style={s.votedBadge}><Text style={s.votedText}>✓ Voted</Text></View>
        )}
        {isClosed && (
          <View style={s.closedBadge}><Text style={s.closedText}>Closed</Text></View>
        )}
      </View>

      {/* Question */}
      <Text style={s.question}>{post.content}</Text>

      {/* Embedded poll widget */}
      <PollCard post={post} compact />

      {/* Tap to expand */}
      <TouchableOpacity
        style={s.expandBtn}
        onPress={() => router.push(`/polls/${post.id}`)}
      >
        <Text style={s.expandText}>View full poll →</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function PollsScreen() {
  const router  = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('ACTIVE');

  const goHome = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/tabs/feed');
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  const isMine = tab === 'MINE';

  const {
    data, isLoading, fetchNextPage, hasNextPage,
    isFetchingNextPage, refetch, isRefetching,
  } = useInfiniteQuery({
    queryKey:        ['polls', tab],
    queryFn:         ({ pageParam = 0 }) =>
      isMine
        ? pollService.getMyPolls(pageParam)
        : pollService.getPolls(tab === 'ACTIVE' ? 'ACTIVE' : 'CLOSED', pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.page + 1 < last.totalPages ? last.page + 1 : undefined,
  });

  const polls = data?.pages.flatMap((p) => p.content) ?? [];
  const total = data?.pages[0]?.totalElements ?? 0;

  const EMPTY_MSG: Record<Tab, string> = {
    ACTIVE: 'No active polls right now.',
    CLOSED: 'No closed polls yet.',
    MINE:   "You haven't created any polls yet.",
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Community Polls</Text>
        <TouchableOpacity
          style={s.createBtn}
          onPress={() => router.push('/polls/create')}
        >
          <Text style={s.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>
              {t.emoji} {t.label}
            </Text>
            {tab === t.key && total > 0 && (
              <Text style={s.tabCount}>{total}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={polls}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <PollListItem post={item} />}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color={COLORS.primary} /> : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>📊</Text>
              <Text style={s.emptyText}>{EMPTY_MSG[tab]}</Text>
              {tab !== 'CLOSED' && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/polls/create')}>
                  <Text style={s.emptyBtnText}>Create a Poll</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  createBtn:    { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  createBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  tabs:         { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab:          { flex: 1, flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabActive:    { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabText:      { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  tabTextActive:{ color: COLORS.primary, fontWeight: '700' },
  tabCount:     { backgroundColor: COLORS.primary, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  item:         { backgroundColor: COLORS.surface, marginHorizontal: 12, marginVertical: 5, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  authorRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  authorName:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
  authorMeta:   { fontSize: 11, color: COLORS.textMuted },
  votedBadge:   { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  votedText:    { fontSize: 11, fontWeight: '700', color: '#065F46' },
  closedBadge:  { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  closedText:   { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  question:     { fontSize: 16, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  expandBtn:    { alignItems: 'center', paddingTop: 4 },
  expandText:   { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  empty:        { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji:   { fontSize: 52 },
  emptyText:    { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },
  emptyBtn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
