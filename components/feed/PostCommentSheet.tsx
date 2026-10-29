import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CachedImage as Image } from '@/components/common/CachedImage';
import { feedService } from '@/services/feedService';
import { useAuth } from '@/hooks/useAuth';
import { PostDto, CommentDto } from '@/types/api';
import { COLORS, RADIUS, SHADOWS, FONTS, getAvatarColor, getInitials } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';

const { height: SCREEN_H } = Dimensions.get('window');

interface PostCommentSheetProps {
  visible: boolean;
  onClose: () => void;
  post: PostDto | null;
}

export function PostCommentSheet({ visible, onClose, post }: PostCommentSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');

  const postId = post?.id;

  const { data: comments = [], isLoading } = useQuery<CommentDto[]>({
    queryKey: ['comments', postId],
    queryFn: () => (postId ? feedService.getComments(postId) : Promise.resolve([])),
    enabled: visible && !!postId,
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) => {
      if (!postId) throw new Error('No post selected');
      return feedService.addComment(postId, text);
    },
    onSuccess: (newComment) => {
      setCommentText('');
      queryClient.setQueryData<CommentDto[]>(['comments', postId], (old = []) => [...old, newComment]);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const toggleCommentLikeMutation = useMutation({
    mutationFn: (commentId: number) => feedService.toggleCommentLike(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  const handleSend = () => {
    const trimmed = commentText.trim();
    if (!trimmed || addCommentMutation.isPending) return;
    addCommentMutation.mutate(trimmed);
  };

  if (!visible || !post) return null;

  const userInitial = getInitials(user?.fullName || user?.name || 'Resident');
  const userAvatarColor = getAvatarColor(user?.fullName || 'Resident');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          {/* Sheet Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Discussion</Text>
              <Text style={styles.headerSubtitle}>
                Post by {post.authorName || 'Community Member'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Original Post Snippet */}
          <View style={styles.postSnippet}>
            <Text style={styles.snippetText} numberOfLines={2}>
              "{post.content}"
            </Text>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading comments...</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>💬</Text>
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptyText}>Be the first neighbor to reply and share thoughts!</Text>
                </View>
              }
              renderItem={({ item }) => {
                const authorColor = getAvatarColor(item.authorName || 'Neighbor');
                const timeAgo = (() => {
                  try {
                    return formatDistanceToNow(new Date(item.createdAt), { addSuffix: false });
                  } catch {
                    return 'recently';
                  }
                })();

                return (
                  <View style={styles.commentItem}>
                    {item.authorPhoto ? (
                      <Image source={{ uri: item.authorPhoto }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatar, { backgroundColor: authorColor.bg }]}>
                        <Text style={[styles.avatarInitial, { color: authorColor.text }]}>
                          {getInitials(item.authorName)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.commentBody}>
                      <View style={styles.commentBubble}>
                        <View style={styles.commentAuthorRow}>
                          <Text style={styles.commentAuthorName}>{item.authorName || 'Neighbor'}</Text>
                          <Text style={styles.commentTime}>{timeAgo} ago</Text>
                        </View>
                        <Text style={styles.commentContent}>{item.content}</Text>
                      </View>

                      {/* Comment Actions */}
                      <View style={styles.commentActions}>
                        <TouchableOpacity
                          style={styles.commentActionBtn}
                          onPress={() => toggleCommentLikeMutation.mutate(item.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="heart-outline" size={14} color={COLORS.textMuted} />
                          <Text style={styles.commentActionText}>Like</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Sticky Bottom Input Bar */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputUserAvatar, { backgroundColor: userAvatarColor.bg }]}>
              <Text style={[styles.inputUserInitials, { color: userAvatarColor.text }]}>
                {userInitial}
              </Text>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Write a constructive reply..."
              placeholderTextColor={COLORS.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                commentText.trim().length === 0 && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={commentText.trim().length === 0 || addCommentMutation.isPending}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: SCREEN_H * 0.78,
    minHeight: SCREEN_H * 0.45,
    ...SHADOWS.md,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  postSnippet: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  snippetText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentBody: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  commentTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  commentContent: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    paddingLeft: 6,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: COLORS.surface,
  },
  inputUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputUserInitials: {
    fontSize: 11,
    fontWeight: '800',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
