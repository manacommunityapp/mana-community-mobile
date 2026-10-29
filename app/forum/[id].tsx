import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { forumService, ForumPostDto, ForumCommentDto } from '@/services/forumService';

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  ANNOUNCEMENT: { bg: '#EDE9FE', color: '#7C3AED' },
  MAINTENANCE:  { bg: '#FEF3C7', color: '#D97706' },
  EVENTS:       { bg: '#D1FAE5', color: '#059669' },
  CLASSIFIEDS:  { bg: '#DBEAFE', color: '#2563EB' },
  COMPLAINT:    { bg: '#FEE2E2', color: '#DC2626' },
  DISCUSSION:   { bg: '#E0F2FE', color: '#0891B2' },
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);

  const [commentText, setCommentText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'post' | 'comment'; id: number } | null>(null);
  const [commentError, setCommentError] = useState('');

  const postId = Number(id);

  const { data: post, isLoading: postLoading } = useQuery<ForumPostDto | null>({
    queryKey: ['forum', 'post', postId],
    queryFn: () => forumService.getPost(postId),
    staleTime: 30_000,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<ForumCommentDto[]>({
    queryKey: ['forum', 'comments', postId],
    queryFn: () => forumService.getComments(postId),
    staleTime: 30_000,
  });

  const addCommentMutation = useMutation({
    mutationFn: () => forumService.addComment(postId, commentText.trim()),
    onSuccess: () => {
      setCommentText('');
      setCommentError('');
      queryClient.invalidateQueries({ queryKey: ['forum', 'comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum', 'posts'] });
    },
    onError: (err: any) => {
      setCommentError(err?.message || 'Failed to post comment.');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: () => forumService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum', 'posts'] });
      router.back();
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => forumService.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum', 'comments', postId] });
    },
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    setCommentError('');
    addCommentMutation.mutate();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'post') {
      deletePostMutation.mutate();
    } else {
      deleteCommentMutation.mutate(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const catStyle = CATEGORY_STYLES[post?.category ?? ''] ?? { bg: '#F1F5F9', color: COLORS.textSecondary };

  const renderComment = ({ item }: { item: ForumCommentDto }) => (
    <View style={s.commentCard}>
      <View style={s.commentHeader}>
        <View style={s.authorAvatar}>
          <Text style={s.authorInitial}>{item.authorName?.[0] ?? '?'}</Text>
        </View>
        <View style={s.commentMeta}>
          <Text style={s.commentAuthor}>{item.authorName}</Text>
          <Text style={s.commentTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {item.isOwn ?? false ? (
          <TouchableOpacity
            onPress={() => setDeleteTarget({ type: 'comment', id: item.id })}
            hitSlop={8}
            style={s.deleteBtn}
          >
            <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={s.commentContent}>{item.content}</Text>
    </View>
  );

  const ListHeader = () => {
    if (!post) return null;
    return (
      <View style={s.postCard}>
        {/* Category + time */}
        <View style={s.postMeta}>
          {post.category ? (
            <View style={[s.catChip, { backgroundColor: catStyle.bg }]}>
              <Text style={[s.catChipText, { color: catStyle.color }]}>{post.category}</Text>
            </View>
          ) : null}
          {post.isPinned && (
            <View style={s.pinnedBadge}>
              <Ionicons name="pin" size={10} color="#7C3AED" />
              <Text style={s.pinnedText}>Pinned</Text>
            </View>
          )}
          <Text style={s.postTime}>{timeAgo(post.createdAt)}</Text>
        </View>

        {/* Title */}
        <Text style={s.postTitle}>{post.title}</Text>

        {/* Author */}
        <View style={s.authorRow}>
          <View style={s.authorAvatar}>
            <Text style={s.authorInitial}>{post.authorName?.[0] ?? '?'}</Text>
          </View>
          <Text style={s.authorName}>{post.authorName}</Text>
          {post.isOwn && (
            <TouchableOpacity
              style={s.deletePostBtn}
              onPress={() => setDeleteTarget({ type: 'post', id: postId })}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={14} color="#DC2626" />
              <Text style={s.deletePostText}>Delete Post</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <Text style={s.postContent}>{post.content}</Text>

        {/* Stats */}
        <View style={s.postStats}>
          <View style={s.statItem}>
            <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.statText}>{post.commentCount} comments</Text>
          </View>
          <View style={s.statItem}>
            <Ionicons name="heart-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.statText}>{post.likeCount} likes</Text>
          </View>
        </View>

        {/* Comments header */}
        <View style={s.commentsDivider}>
          <Text style={s.commentsLabel}>Comments</Text>
          {commentsLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{post?.title ?? 'Discussion'}</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {postLoading ? (
          <View style={s.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : !post ? (
          <View style={s.loadingState}>
            <Ionicons name="alert-circle-outline" size={40} color={COLORS.textMuted} />
            <Text style={s.emptyText}>Post not found</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={item => String(item.id)}
            renderItem={renderComment}
            ListHeaderComponent={<ListHeader />}
            ListEmptyComponent={
              !commentsLoading ? (
                <View style={s.noComments}>
                  <Text style={s.noCommentsText}>No comments yet. Be the first to reply!</Text>
                </View>
              ) : null
            }
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Comment Input */}
        <View style={s.inputArea}>
          {commentError ? (
            <View style={s.commentErrorBox}>
              <Ionicons name="alert-circle-outline" size={12} color="#B91C1C" />
              <Text style={s.commentErrorText}>{commentError}</Text>
            </View>
          ) : null}
          <View style={s.inputRow}>
            <TextInput
              ref={inputRef}
              style={s.commentInput}
              placeholder="Write a comment..."
              placeholderTextColor={COLORS.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!commentText.trim() || addCommentMutation.isPending) && s.sendBtnDisabled]}
              onPress={handleSendComment}
              disabled={!commentText.trim() || addCommentMutation.isPending}
              activeOpacity={0.8}
            >
              {addCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Ionicons name="trash-outline" size={32} color="#DC2626" style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={s.modalTitle}>
              {deleteTarget?.type === 'post' ? 'Delete Post?' : 'Delete Comment?'}
            </Text>
            <Text style={s.modalSub}>
              {deleteTarget?.type === 'post'
                ? 'This will permanently remove your post and all its comments.'
                : 'This will permanently remove your comment.'}
            </Text>
            <TouchableOpacity style={s.modalDeleteBtn} onPress={handleConfirmDelete} activeOpacity={0.85}>
              <Text style={s.modalDeleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setDeleteTarget(null)} activeOpacity={0.85}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    flex: 1, fontSize: 15, fontFamily: 'Outfit-Bold', fontWeight: '700',
    color: COLORS.text, textAlign: 'center', marginHorizontal: 8,
  },

  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  listContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 16 },

  postCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)', ...SHADOWS.md,
    gap: 10, marginBottom: SPACING.sm,
  },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catChipText: { fontSize: 11, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  pinnedText: { fontSize: 10, fontWeight: '700', color: '#7C3AED', fontFamily: 'Outfit-Bold' },
  postTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginLeft: 'auto' },
  postTitle: { fontSize: 18, fontWeight: '800', color: THEME.textPrimary, fontFamily: 'Outfit-Bold', lineHeight: 24 },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  authorInitial: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  authorName: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', flex: 1 },
  deletePostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm,
  },
  deletePostText: { fontSize: 11, fontWeight: '700', color: '#DC2626', fontFamily: 'DMSans-Medium' },

  postContent: { fontSize: 14, color: COLORS.text, fontFamily: 'DMSans-Regular', lineHeight: 21 },

  postStats: { flexDirection: 'row', gap: 16, paddingTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  commentsDivider: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: SPACING.sm, marginTop: 4,
  },
  commentsLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold' },

  commentCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.08)', gap: 6,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentMeta: { flex: 1 },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  commentTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  deleteBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  commentContent: { fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', lineHeight: 19 },

  noComments: { paddingVertical: 24, alignItems: 'center' },
  noCommentsText: { fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', textAlign: 'center' },

  inputArea: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    paddingBottom: Platform.OS === 'ios' ? 8 : SPACING.sm,
  },
  commentErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    marginBottom: 6,
  },
  commentErrorText: { fontSize: 11, color: '#B91C1C', fontFamily: 'DMSans-Regular', flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  commentInput: {
    flex: 1, backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: SPACING.md, paddingVertical: 9,
    fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular',
    maxHeight: 80,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  sendBtnDisabled: { backgroundColor: '#C7D2FE' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.xl, paddingBottom: 36, gap: 8,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', textAlign: 'center' },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', textAlign: 'center', lineHeight: 18 },
  modalDeleteBtn: {
    backgroundColor: '#DC2626', borderRadius: RADIUS.md, paddingVertical: 14,
    alignItems: 'center', marginTop: 8,
  },
  modalDeleteText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  modalCancelBtn: {
    borderRadius: RADIUS.md, paddingVertical: 13,
    alignItems: 'center', backgroundColor: '#F1F5F9',
  },
  modalCancelText: { color: COLORS.text, fontSize: 15, fontWeight: '600', fontFamily: 'DMSans-Medium' },
});
