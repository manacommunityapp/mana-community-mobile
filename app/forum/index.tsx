import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { forumService, ForumPostDto, FORUM_CATEGORIES } from '@/services/forumService';

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  ANNOUNCEMENT: { bg: '#EDE9FE', color: '#7C3AED' },
  MAINTENANCE:  { bg: '#FEF3C7', color: '#D97706' },
  EVENTS:       { bg: '#D1FAE5', color: '#059669' },
  CLASSIFIEDS:  { bg: '#DBEAFE', color: '#2563EB' },
  COMPLAINT:    { bg: '#FEE2E2', color: '#DC2626' },
  DISCUSSION:   { bg: '#E0F2FE', color: '#0891B2' },
};

export default function ForumScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleSearchChange = useCallback((t: string) => {
    setSearch(t);
    clearTimeout((handleSearchChange as any)._timer);
    (handleSearchChange as any)._timer = setTimeout(() => setDebouncedSearch(t), 400);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['forum', 'posts', activeCategory, debouncedSearch],
    queryFn: () => forumService.getPosts({
      category: activeCategory !== 'ALL' ? activeCategory : undefined,
      search: debouncedSearch || undefined,
    }),
    staleTime: 30_000,
  });

  const posts = data?.content ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const renderPost = ({ item }: { item: ForumPostDto }) => {
    const catMeta = CATEGORY_COLORS[item.category ?? ''] ?? { bg: '#F1F5F9', color: COLORS.textSecondary };
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => router.push(`/forum/${item.id}`)}
        activeOpacity={0.85}
      >
        {item.isPinned && (
          <View style={s.pinnedBadge}>
            <Ionicons name="pin" size={10} color="#7C3AED" />
            <Text style={s.pinnedText}>Pinned</Text>
          </View>
        )}
        <View style={s.cardTop}>
          {item.category ? (
            <View style={[s.catChip, { backgroundColor: catMeta.bg }]}>
              <Text style={[s.catChipText, { color: catMeta.color }]}>{item.category}</Text>
            </View>
          ) : null}
          <Text style={s.timeText}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={s.postTitle} numberOfLines={2}>{item.title}</Text>
        {item.preview ? (
          <Text style={s.postPreview} numberOfLines={2}>{item.preview}</Text>
        ) : null}
        <View style={s.cardFooter}>
          <View style={s.authorRow}>
            <View style={s.authorAvatar}>
              <Text style={s.authorInitial}>{item.authorName?.[0] ?? '?'}</Text>
            </View>
            <Text style={s.authorName} numberOfLines={1}>{item.authorName}</Text>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Ionicons name="chatbubble-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.statText}>{item.commentCount}</Text>
            </View>
            <View style={s.statItem}>
              <Ionicons name="heart-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.statText}>{item.likeCount}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs/feed')} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Community Forum</Text>
          <Text style={s.headerSub}>Discuss, announce & connect</Text>
        </View>
        <TouchableOpacity
          style={s.newPostBtn}
          onPress={() => router.push('/forum/new-post')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={s.newPostBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search discussions..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={handleSearchChange}
        />
        {search ? (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); }} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter */}
      <FlatList
        data={FORUM_CATEGORIES}
        keyExtractor={item => item.code}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.categoryList}
        renderItem={({ item }) => {
          const active = activeCategory === item.code;
          return (
            <TouchableOpacity
              style={[s.catBtn, active && { backgroundColor: item.color, borderColor: item.color }]}
              onPress={() => setActiveCategory(item.code)}
              activeOpacity={0.8}
            >
              <Ionicons name={item.icon} size={14} color={active ? '#fff' : item.color} />
              <Text style={[s.catBtnText, active && { color: '#fff' }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Post List */}
      <FlatList
        data={posts}
        keyExtractor={item => String(item.id)}
        renderItem={renderPost}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={s.emptyState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <View style={s.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No discussions yet</Text>
              <Text style={s.emptySub}>Be the first to start a conversation</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/forum/new-post')}>
                <Text style={s.emptyBtnText}>Start a Discussion</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.12)',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  newPostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.md, ...SHADOWS.sm,
  },
  newPostBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: SPACING.md, marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 9,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, fontFamily: 'DMSans-Regular' },

  categoryList: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: 8 },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  catBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)', ...SHADOWS.md,
    gap: 6,
  },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    marginBottom: 2,
  },
  pinnedText: { fontSize: 10, fontWeight: '700', color: '#7C3AED', fontFamily: 'Outfit-Bold' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  catChipText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  timeText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginLeft: 'auto' },
  postTitle: { fontSize: 15, fontWeight: '700', color: THEME.textPrimary, fontFamily: 'Outfit-Bold', lineHeight: 21 },
  postPreview: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 17 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  authorAvatar: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  authorInitial: { fontSize: 11, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  authorName: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 30, fontFamily: 'DMSans-Regular' },
  emptyBtn: {
    marginTop: 8, backgroundColor: COLORS.primary,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
});
