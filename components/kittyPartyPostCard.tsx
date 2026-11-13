import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { KittyPartyPost } from '@/types/kittyPartyTypes';

interface Props {
  post: KittyPartyPost;
  onPressComments: () => void;
  onTogglePin?: () => void;
  onVote?: (optionId: number) => void;
  isAdmin?: boolean;
}

export const KittyPartyPostCard: React.FC<Props> = ({
  post,
  onPressComments,
  onTogglePin,
  onVote,
  isAdmin,
}) => {
  const isAnnouncement = post.postType === 'ANNOUNCEMENT' || post.isPinned;

  const formatTimestamp = (dateStr: string) => {
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

  return (
    <View style={[styles.card, post.isPinned && styles.pinnedCard]}>
      {/* Pinned Announcement Header */}
      {post.isPinned && (
        <View style={styles.pinnedBanner}>
          <Text style={styles.pinnedText}>📌 PINNED ANNOUNCEMENT</Text>
        </View>
      )}

      {/* Author and Type Row */}
      <View style={styles.authorRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {post.authorName ? post.authorName.charAt(0) : 'U'}
          </Text>
        </View>

        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.authorName || 'Member'}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(post.createdAt)}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.typeBadge, isAnnouncement ? styles.typeBadgeAnnouncement : styles.typeBadgeGeneral]}>
            <Text style={[styles.typeBadgeText, isAnnouncement ? styles.typeTextAnnouncement : styles.typeTextGeneral]}>
              {post.postType}
            </Text>
          </View>
          {isAdmin && onTogglePin && (
            <TouchableOpacity onPress={onTogglePin} style={styles.pinBtn}>
              <Text style={styles.pinBtnText}>{post.isPinned ? '📍' : '📌'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Title & Body */}
      {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
      <Text style={styles.postContent}>{post.content}</Text>

      {/* Attachment Image if present */}
      {post.attachmentUrl ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.attachmentUrl }}
            style={styles.attachmentImage}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Poll Options */}
      {post.postType === 'POLL' && post.pollOptions && post.pollOptions.length > 0 && (
        <View style={styles.pollContainer}>
          <View style={styles.pollHeader}>
            <Text style={styles.pollHeaderTitle}>📊 Community Poll</Text>
            <Text style={styles.pollHeaderVotes}>{post.totalVotes || 0} votes</Text>
          </View>

          {post.pollOptions.map((opt) => {
            const isVoted = post.userVotedOptionId === opt.id || opt.userVoted;
            const hasVotedAny = !!post.userVotedOptionId;

            return (
              <TouchableOpacity
                key={opt.id}
                disabled={hasVotedAny}
                onPress={() => onVote && onVote(opt.id)}
                style={[
                  styles.pollOptionBox,
                  hasVotedAny && (isVoted ? styles.pollOptionVoted : styles.pollOptionUnvoted),
                ]}
              >
                {/* Progress bar background */}
                {hasVotedAny && (
                  <View
                    style={[
                      styles.pollProgressBar,
                      isVoted ? styles.pollProgressVoted : styles.pollProgressNormal,
                      { width: `${opt.percentage || 0}%` },
                    ]}
                  />
                )}

                <View style={styles.pollOptionContent}>
                  <View style={styles.pollOptionLeft}>
                    <Text style={isVoted ? styles.pollRadioVoted : styles.pollRadioNormal}>
                      {isVoted ? '✓' : '○'}
                    </Text>
                    <Text style={[styles.pollOptionText, isVoted && styles.pollOptionTextVoted]}>
                      {opt.optionText}
                    </Text>
                  </View>

                  {hasVotedAny && (
                    <Text style={styles.pollPercentText}>
                      {opt.percentage}% ({opt.voteCount})
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Footer / Comments trigger */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.commentTrigger} onPress={onPressComments}>
          <Text style={styles.commentIcon}>💬</Text>
          <Text style={styles.commentText}>
            {post.commentsCount > 0
              ? `${post.commentsCount} Comment${post.commentsCount > 1 ? 's' : ''}`
              : 'Add Comment'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  pinnedCard: {
    borderColor: '#C084FC',
    backgroundColor: '#FAF5FF',
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderColor: '#E9D5FF',
  },
  pinnedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7E22CE',
    letterSpacing: 0.5,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7E22CE',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeAnnouncement: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  typeBadgeGeneral: {
    backgroundColor: '#F3F4F6',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  typeTextAnnouncement: {
    color: '#6B21A8',
  },
  typeTextGeneral: {
    color: '#4B5563',
  },
  pinBtn: {
    padding: 4,
  },
  pinBtnText: {
    fontSize: 14,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  postContent: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 10,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 180,
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  commentTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentIcon: {
    fontSize: 13,
  },
  commentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  pollContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pollHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pollHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  pollHeaderVotes: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  pollOptionBox: {
    position: 'relative',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
    overflow: 'hidden',
  },
  pollOptionVoted: {
    borderColor: '#8B5CF6',
  },
  pollOptionUnvoted: {
    borderColor: '#E2E8F0',
  },
  pollProgressBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  pollProgressVoted: {
    backgroundColor: '#DDD6FE',
  },
  pollProgressNormal: {
    backgroundColor: '#F1F5F9',
  },
  pollOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pollOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pollRadioVoted: {
    fontSize: 12,
    fontWeight: '900',
    color: '#7C3AED',
    marginRight: 8,
  },
  pollRadioNormal: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 8,
  },
  pollOptionText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
  },
  pollOptionTextVoted: {
    color: '#5B21B6',
    fontWeight: '800',
  },
  pollPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginLeft: 6,
  },
});
