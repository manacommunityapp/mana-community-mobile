import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pollService } from '@/services/pollService';
import { feedService } from '@/services/feedService';
import { PollCard } from '@/components/polls/PollCard';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';
import { format, formatDistanceToNow, isPast } from 'date-fns';

export default function PollDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const { user } = useAuth();
  const [comment, setComment] = useState('');

  const { data: post, isLoading } = useQuery({
    queryKey: ['poll', id],
    queryFn:  () => pollService.getPoll(Number(id)),
    refetchInterval: 10_000,  // live refresh every 10s while screen is open
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['poll-comments', id],
    queryFn:  () => feedService.getComments(Number(id)),
  });

  const commentMutation = useMutation({
    mutationFn: () => feedService.addComment(Number(id), comment.trim()),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['poll-comments', id] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => pollService.closePoll(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['poll', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => pollService.deletePoll(Number(id)),
    onSuccess: () => router.replace('/polls'),
  });

  const handleClose = () => Alert.alert('Close Poll', 'Stop accepting new votes?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Close Poll', onPress: () => closeMutation.mutate() },
  ]);

  const handleDelete = () => Alert.alert('Delete Poll', 'Permanently delete this poll and all votes?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
  ]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!post || !post.poll) return null;

  const poll      = post.poll;
  const isOwner   = post.authorId === user?.id;
  const isExpired = poll.deadline ? isPast(new Date(poll.deadline)) : false;
  const isClosed  = !poll.isActive || isExpired;
  const maxVotes  = Math.max(...poll.options.map((o) => o.voteCount));
  const winner    = isClosed ? poll.options.find((o) => o.voteCount === maxVotes) : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Poll</Text>
        {isOwner && !isClosed && (
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.closeBtn}>Close</Text>
          </TouchableOpacity>
        )}
        {isOwner && isClosed && (
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[s.closeBtn, { color: COLORS.error }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Author card */}
          <View style={s.authorCard}>
            <View style={s.avatar}><Text style={s.avatarText}>{post.authorName[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.authorName}>{post.authorName}</Text>
              <Text style={s.authorMeta}>
                {post.authorFlat} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </Text>
            </View>
          </View>

          {/* Question */}
          <Text style={s.question}>{post.content}</Text>

          {/* Meta row */}
          <View style={s.metaRow}>
            {poll.deadline && (
              <Text style={s.meta}>
                {isClosed
                  ? `Ended ${format(new Date(poll.deadline), 'dd MMM, h:mm a')}`
                  : `Closes ${formatDistanceToNow(new Date(poll.deadline), { addSuffix: true })}`
                }
              </Text>
            )}
            {poll.allowMultipleVotes && (
              <Text style={s.meta}>Multiple votes allowed</Text>
            )}
            {poll.isAnonymous && (
              <Text style={s.meta}>🔏 Anonymous</Text>
            )}
          </View>

          {/* Winner banner (after close) */}
          {isClosed && winner && poll.totalVotes > 0 && (
            <View style={s.winnerBanner}>
              <Text style={s.winnerTitle}>🏆 Leading Answer</Text>
              <Text style={s.winnerText}>{winner.text}</Text>
              <Text style={s.winnerSub}>
                {winner.voteCount} votes · {Math.round((winner.voteCount / poll.totalVotes) * 100)}%
              </Text>
            </View>
          )}

          {/* Poll card — full (not compact) */}
          <View style={s.pollWrap}>
            <PollCard
              post={post}
              currentUserId={user?.id}
              compact={false}
              onVoted={() => qc.invalidateQueries({ queryKey: ['poll', id] })}
            />
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statNum}>{poll.totalVotes}</Text>
              <Text style={s.statLabel}>Total votes</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>{poll.options.length}</Text>
              <Text style={s.statLabel}>Options</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>{comments.length}</Text>
              <Text style={s.statLabel}>Comments</Text>
            </View>
          </View>

          {/* Comments */}
          <View style={s.commentsSection}>
            <Text style={s.commentsSectionTitle}>Comments</Text>
            {comments.length === 0 ? (
              <Text style={s.noComments}>No comments yet. Share your thoughts!</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={s.commentRow}>
                  <View style={s.commentAvatar}>
                    <Text style={s.commentAvatarText}>{c.authorName[0]}</Text>
                  </View>
                  <View style={s.commentBody}>
                    <View style={s.commentHeader}>
                      <Text style={s.commentAuthor}>{c.authorName}</Text>
                      <Text style={s.commentTime}>
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </Text>
                    </View>
                    <Text style={s.commentText}>{c.content}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Comment input */}
        <View style={s.commentInput}>
          <TextInput
            style={s.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Add a comment…"
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={280}
          />
          <TouchableOpacity
            style={[s.sendBtn, !comment.trim() && s.sendBtnDisabled]}
            onPress={() => commentMutation.mutate()}
            disabled={!comment.trim() || commentMutation.isPending}
          >
            {commentMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.sendBtnText}>Send</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:               { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  headerTitle:        { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  closeBtn:           { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
  scroll:             { padding: 16, gap: 14 },
  authorCard:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:             { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:         { color: '#fff', fontWeight: '700', fontSize: 16 },
  authorName:         { fontSize: 14, fontWeight: '600', color: COLORS.text },
  authorMeta:         { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  question:           { fontSize: 20, fontWeight: '800', color: COLORS.text, lineHeight: 27 },
  metaRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  meta:               { fontSize: 12, color: COLORS.textMuted, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  winnerBanner:       { backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, gap: 4, borderWidth: 1, borderColor: '#FCD34D', alignItems: 'center' },
  winnerTitle:        { fontSize: 13, fontWeight: '700', color: '#92400E' },
  winnerText:         { fontSize: 17, fontWeight: '800', color: '#78350F', textAlign: 'center' },
  winnerSub:          { fontSize: 12, color: '#92400E' },
  pollWrap:           { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  statsRow:           { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  stat:               { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: COLORS.border },
  statNum:            { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  statLabel:          { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  commentsSection:    { gap: 12 },
  commentsSectionTitle:{ fontSize: 15, fontWeight: '700', color: COLORS.text },
  noComments:         { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 16 },
  commentRow:         { flexDirection: 'row', gap: 10 },
  commentAvatar:      { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  commentBody:        { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.border, gap: 3 },
  commentHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthor:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  commentTime:        { fontSize: 11, color: COLORS.textMuted },
  commentText:        { fontSize: 14, color: COLORS.text, lineHeight: 19 },
  commentInput:       { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
  input:              { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text, maxHeight: 80 },
  sendBtn:            { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendBtnDisabled:    { backgroundColor: COLORS.border },
  sendBtnText:        { color: '#fff', fontWeight: '700', fontSize: 13 },
});
