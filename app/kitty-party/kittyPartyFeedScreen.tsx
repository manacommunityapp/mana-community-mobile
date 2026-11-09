import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { kittyPartyService } from '@/services/kittyPartyService';
import type {
  KittyPartyPost,
  KittyPartyPostComment,
  CreateKittyPartyPostRequest,
  KittyPartyPostType,
} from '@/types/kittyPartyTypes';
import { KittyPartyPostCard } from '@/components/kittyPartyPostCard';

export default function KittyPartyFeedScreen() {
  const { circleId: paramCircleId, id: paramId, isAdmin: paramIsAdmin } =
    useLocalSearchParams<{ circleId?: string; id?: string; isAdmin?: string }>();
  const router = useRouter();
  const circleId = Number(paramCircleId || paramId || 0);
  const isAdmin = paramIsAdmin === 'true';

  const [posts, setPosts] = useState<KittyPartyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Post Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<KittyPartyPostType>('TEXT');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Comments Modal State
  const [activePostForComments, setActivePostForComments] = useState<KittyPartyPost | null>(null);
  const [comments, setComments] = useState<KittyPartyPostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (circleId) {
      loadPosts();
    }
  }, [circleId]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await kittyPartyService.getCirclePosts(circleId);
      setPosts(res || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleVote = async (postId: number, optionId: number) => {
    try {
      const updatedPost = await kittyPartyService.castVote(postId, optionId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
    } catch (e: any) {
      Alert.alert('Vote Failed', e?.message || 'Unable to record your vote');
    }
  };

  const handleOpenComments = async (post: KittyPartyPost) => {
    setActivePostForComments(post);
    try {
      setLoadingComments(true);
      const res = await kittyPartyService.getPostComments(post.id);
      setComments(res || []);
    } catch (e: any) {
      console.error('Failed to load comments', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!activePostForComments || !newCommentText.trim()) return;
    try {
      setSubmittingComment(true);
      const comment = await kittyPartyService.addComment(activePostForComments.id, {
        commentText: newCommentText.trim(),
      });
      setComments((prev) => [...prev, comment]);
      setNewCommentText('');
      setPosts((prev) =>
        prev.map((p) => (p.id === activePostForComments.id ? { ...p, commentsCount: p.commentsCount + 1 } : p))
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleTogglePin = async (post: KittyPartyPost) => {
    try {
      await kittyPartyService.togglePinPost(post.id);
      loadPosts();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to pin/unpin');
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      Alert.alert('Required', 'Please write a message or question to post');
      return;
    }

    if (postType === 'POLL') {
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        Alert.alert('Required', 'Poll must have at least 2 non-empty options');
        return;
      }
    }

    try {
      setSubmittingCreate(true);
      const payload: CreateKittyPartyPostRequest = {
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        postType,
        attachmentUrl: attachmentUrl.trim() || undefined,
        isPinned: isAdmin ? isPinned : false,
        pollOptions: postType === 'POLL' ? pollOptions.map((o) => o.trim()).filter(Boolean) : undefined,
      };

      await kittyPartyService.createPost(circleId, payload);
      setShowCreateModal(false);
      resetCreateForm();
      Alert.alert('Success', 'Post published to feed!');
      loadPosts();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to publish post');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const resetCreateForm = () => {
    setPostTitle('');
    setPostContent('');
    setAttachmentUrl('');
    setPostType('TEXT');
    setIsPinned(false);
    setPollOptions(['', '']);
  };

  const formatCommentTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7E22CE" />
        <Text style={styles.loadingText}>Loading circle feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discussion Feed</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(); }} />
        }
      >
        {/* Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerTitle}>💬 Circle Discussions & Announcements</Text>
          <Text style={styles.bannerSubtitle}>
            Share gathering themes, potluck updates, greetings, and stay connected with your circle.
          </Text>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📣</Text>
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "+ Post" button to share the first announcement, question, or poll with members.
            </Text>
          </View>
        ) : (
          posts.map((post) => (
            <KittyPartyPostCard
              key={post.id}
              post={post}
              isAdmin={isAdmin}
              onPressComments={() => handleOpenComments(post)}
              onTogglePin={() => handleTogglePin(post)}
              onVote={(optionId) => handleVote(post.id, optionId)}
            />
          ))
        )}
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView contentContainerStyle={styles.createModalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Share an Update</Text>
              <Text style={styles.modalSubtitle}>Post a message, theme idea, announcement, or poll</Text>

              {/* Post Type Selector */}
              <View style={styles.typeSelector}>
                {(['TEXT', 'ANNOUNCEMENT', 'POLL', 'PHOTO'] as KittyPartyPostType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, postType === type && styles.typeBtnActive]}
                    onPress={() => setPostType(type)}
                  >
                    <Text style={[styles.typeBtnText, postType === type && styles.typeBtnTextActive]}>
                      {type === 'ANNOUNCEMENT'
                        ? '📢 Announcement'
                        : type === 'POLL'
                        ? '📊 Poll'
                        : type === 'PHOTO'
                        ? '📷 Photo'
                        : '💬 Text'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Title (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Next Meetup Theme or Poll Question"
                value={postTitle}
                onChangeText={setPostTitle}
              />

              <Text style={styles.inputLabel}>{postType === 'POLL' ? 'Poll Question *' : 'Message *'}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={postType === 'POLL' ? 'Ask a question for circle members to vote on...' : 'Write your update or question...'}
                multiline
                numberOfLines={4}
                value={postContent}
                onChangeText={setPostContent}
              />

              {/* Poll Options Builder */}
              {postType === 'POLL' && (
                <View style={styles.pollSection}>
                  <Text style={styles.inputLabel}>Poll Options (Min 2)</Text>
                  {pollOptions.map((opt, idx) => (
                    <View key={idx} style={styles.pollOptionRow}>
                      <TextInput
                        style={[styles.input, styles.pollInput]}
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChangeText={(txt) => {
                          const updated = [...pollOptions];
                          updated[idx] = txt;
                          setPollOptions(updated);
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <TouchableOpacity
                          style={styles.removeOptionBtn}
                          onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                        >
                          <Text style={styles.removeOptionText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {pollOptions.length < 6 && (
                    <TouchableOpacity
                      style={styles.addOptionBtn}
                      onPress={() => setPollOptions([...pollOptions, ''])}
                    >
                      <Text style={styles.addOptionBtnText}>+ Add Option</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {postType !== 'POLL' && (
                <>
                  <Text style={styles.inputLabel}>Image URL (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://example.com/photo.jpg"
                    value={attachmentUrl}
                    onChangeText={setAttachmentUrl}
                  />
                </>
              )}

              {isAdmin && (
                <TouchableOpacity
                  style={styles.pinToggleRow}
                  onPress={() => setIsPinned(!isPinned)}
                >
                  <Text style={styles.pinToggleIcon}>{isPinned ? '☑️' : '⬜'}</Text>
                  <Text style={styles.pinToggleText}>Pin to top of feed as an Announcement</Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreatePost}
                  disabled={submittingCreate}
                >
                  <Text style={styles.submitBtnText}>
                    {submittingCreate ? 'Posting...' : 'Publish'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Thread Modal */}
      <Modal
        visible={!!activePostForComments}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePostForComments(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.commentModalCard}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentHeaderTitle} numberOfLines={1}>
                Comments ({activePostForComments?.commentsCount || 0})
              </Text>
              <TouchableOpacity onPress={() => setActivePostForComments(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <ActivityIndicator style={{ paddingVertical: 20 }} color="#7E22CE" />
            ) : (
              <ScrollView style={styles.commentsList}>
                {comments.length === 0 ? (
                  <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
                ) : (
                  comments.map((c) => (
                    <View key={c.id} style={styles.commentBubble}>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentAuthor}>{c.userName || 'Member'}</Text>
                        <Text style={styles.commentTime}>{formatCommentTime(c.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentBody}>{c.commentText}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* Comment Composer */}
            <View style={styles.commentComposerRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, !newCommentText.trim() && styles.commentSendBtnDisabled]}
                onPress={handleAddComment}
                disabled={submittingComment || !newCommentText.trim()}
              >
                <Text style={styles.commentSendText}>
                  {submittingComment ? '...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  backBtn: {
    padding: 6,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7E22CE',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#7E22CE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
  },
  bannerCard: {
    backgroundColor: '#FAF5FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B21A8',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#7E22CE',
    lineHeight: 17,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  createModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 14,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeBtnActive: {
    borderColor: '#7E22CE',
    backgroundColor: '#7E22CE',
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pollSection: {
    marginBottom: 12,
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pollInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeOptionBtn: {
    padding: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  removeOptionText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },
  addOptionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: '#FAF5FF',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addOptionBtnText: {
    color: '#7E22CE',
    fontSize: 12,
    fontWeight: '700',
  },
  pinToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    marginBottom: 12,
  },
  pinToggleIcon: {
    fontSize: 16,
  },
  pinToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B21A8',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitBtn: {
    backgroundColor: '#7E22CE',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  commentModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  commentHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  commentsList: {
    maxHeight: 250,
    marginVertical: 10,
  },
  noCommentsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    paddingVertical: 30,
  },
  commentBubble: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  commentTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  commentBody: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 16,
  },
  commentComposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#111827',
  },
  commentSendBtn: {
    backgroundColor: '#7E22CE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  commentSendBtnDisabled: {
    opacity: 0.4,
  },
  commentSendText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
