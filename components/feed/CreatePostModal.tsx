import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedService } from '@/services/feedService';
import { useAuth } from '@/hooks/useAuth';
import { PostType, CreatePostRequest } from '@/types/api';
import { COLORS, RADIUS, SHADOWS, FONTS, getAvatarColor, getInitials } from '@/constants/config';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: PostType;
  initialFilter?: string;
}

interface PostTypeOption {
  key: PostType;
  label: string;
  emoji: string;
  placeholder: string;
  color: string;
  bg: string;
  requiresPermission?: string[];
  requiresAdmin?: boolean;
}

const ALL_POST_TYPES: PostTypeOption[] = [
  {
    key: 'post',
    label: 'Discussion',
    emoji: '💬',
    placeholder: 'Share an update, recommendation or thought with neighbors...',
    color: '#2563EB',
    bg: '#EFF6FF',
    requiresPermission: ['Create Post'],
  },
  {
    key: 'question',
    label: 'Ask Neighbors',
    emoji: '❓',
    placeholder: 'Looking for a plumber, doctor recommendation, or help?',
    color: '#059669',
    bg: '#ECFDF5',
    requiresPermission: ['Create Post'],
  },
  {
    key: 'announcement',
    label: 'Notice',
    emoji: '📢',
    placeholder: 'Write an official committee update or resident notice...',
    color: '#4F46E5',
    bg: '#EEF2FF',
    requiresPermission: ['Create Notice'],
    requiresAdmin: true,
  },
  {
    key: 'poll',
    label: 'Poll',
    emoji: '📊',
    placeholder: 'Ask the community to vote on an issue or idea...',
    color: '#7C3AED',
    bg: '#F5F3FF',
    requiresPermission: ['Create Poll'],
    requiresAdmin: true,
  },
  {
    key: 'classified',
    label: 'Buy & Sell',
    emoji: '🛍️',
    placeholder: 'Describe the item you want to sell, condition, reason...',
    color: '#D97706',
    bg: '#FFFBEB',
    requiresPermission: ['Create Post', 'Create Listing'],
  },
  {
    key: 'lost_found',
    label: 'Lost & Found',
    emoji: '🔍',
    placeholder: 'Describe the lost or found item, brand, color, location...',
    color: '#EF4444',
    bg: '#FEF2F2',
    requiresPermission: ['Create Post'],
  },
];

const SUGGESTED_TAGS = [
  '#Maintenance', '#LostAndFound', '#Security', '#Recommendations',
  '#Sports', '#Parking', '#Pets', '#BuySell', '#Events',
];

export function CreatePostModal({ visible, onClose, defaultType, initialFilter }: CreatePostModalProps) {
  const { user, hasPermission, isAdmin, isSuperAdmin, isAnyAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Dynamically compute which post categories this user has admin-granted access to post into
  const availablePostTypes = React.useMemo(() => {
    return ALL_POST_TYPES.filter((pt) => {
      if (isSuperAdmin || isAdmin || isAnyAdmin) return true;
      if (pt.requiresPermission) {
        const granted = pt.requiresPermission.some((p) => hasPermission(p));
        if (granted) return true;
      }
      if (pt.requiresAdmin) return false;
      return hasPermission('Create Post');
    });
  }, [isSuperAdmin, isAdmin, isAnyAdmin, hasPermission]);

  // Determine starting post type based on initial filter & permissions
  const computedDefaultType = React.useMemo<PostType>(() => {
    if (defaultType && availablePostTypes.some((p) => p.key === defaultType)) {
      return defaultType;
    }
    if (initialFilter === 'Notices' && availablePostTypes.some((p) => p.key === 'announcement')) {
      return 'announcement';
    }
    if (initialFilter === 'Polls' && availablePostTypes.some((p) => p.key === 'poll')) {
      return 'poll';
    }
    return availablePostTypes[0]?.key || 'post';
  }, [defaultType, initialFilter, availablePostTypes]);

  const [selectedType, setSelectedType] = useState<PostType>(computedDefaultType);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [visibility, setVisibility] = useState<'COMMUNITY' | 'TOWER'>('COMMUNITY');
  const [showImageInput, setShowImageInput] = useState(false);

  // Poll state
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollAnonymous, setPollAnonymous] = useState(false);

  // Update selectedType when modal opens or available types change
  React.useEffect(() => {
    if (visible) {
      setSelectedType(computedDefaultType);
    }
  }, [visible, computedDefaultType]);

  const activeMeta = availablePostTypes.find((p) => p.key === selectedType) || availablePostTypes[0] || ALL_POST_TYPES[0];

  const createMutation = useMutation({
    mutationFn: (req: CreatePostRequest) => feedService.createPost(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-feed'] });
      queryClient.invalidateQueries({ queryKey: ['community-feed-all'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Unable to publish', err?.message || 'Please check your connection and try again.');
    },
  });

  const resetForm = () => {
    setContent('');
    setTitle('');
    setImageUrl('');
    setLocation('');
    setPrice('');
    setPollOptions(['', '']);
    setPollAnonymous(false);
    setShowImageInput(false);
  };

  const handlePost = () => {
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert('Content Required', 'Please write something to share with your neighbors.');
      return;
    }

    const payload: CreatePostRequest = {
      content: trimmed,
      title: title.trim() || undefined,
      type: selectedType,
      imageUrl: imageUrl.trim() || undefined,
      mediaUrls: imageUrl.trim() ? [imageUrl.trim()] : undefined,
      visibility: visibility === 'COMMUNITY' ? 'COMMUNITY' : 'GROUP',
      location: location.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
    };

    if (selectedType === 'poll') {
      const validOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        Alert.alert('Poll Options Required', 'Please provide at least 2 distinct options for your poll.');
        return;
      }
      payload.pollQuestion = trimmed;
      payload.pollOptions = validOptions.join(',');
      payload.pollAnonymous = pollAnonymous;
    }

    createMutation.mutate(payload);
  };

  const handleTagPress = (tag: string) => {
    if (!content.includes(tag)) {
      setContent((prev) => (prev ? `${prev.trim()} ${tag} ` : `${tag} `));
    }
  };

  if (!visible) return null;

  const authorName = user?.fullName || user?.name || 'Resident';
  const authorInitial = getInitials(authorName);
  const avatarColor = getAvatarColor(authorName);
  const tower = user?.tower || user?.block;
  const flat = user?.flatNumber || user?.flatNo;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.navTitle}>Create Post</Text>

          <TouchableOpacity
            style={[styles.publishBtn, (!content.trim() || createMutation.isPending) && styles.publishBtnDisabled]}
            onPress={handlePost}
            disabled={!content.trim() || createMutation.isPending}
            activeOpacity={0.8}
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.publishText}>Publish</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Author & Visibility Selector */}
          <View style={styles.authorSection}>
            <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
              <Text style={[styles.avatarText, { color: avatarColor.text }]}>{authorInitial}</Text>
            </View>

            <View style={styles.authorMetaWrap}>
              <Text style={styles.authorName}>{authorName}</Text>
              <View style={styles.audienceRow}>
                <TouchableOpacity
                  style={[styles.audienceChip, visibility === 'COMMUNITY' && styles.audienceChipActive]}
                  onPress={() => setVisibility('COMMUNITY')}
                >
                  <Ionicons name="people" size={12} color={visibility === 'COMMUNITY' ? '#fff' : COLORS.textSecondary} />
                  <Text style={[styles.audienceText, visibility === 'COMMUNITY' && styles.audienceTextActive]}>
                    Entire Society
                  </Text>
                </TouchableOpacity>

                {tower && (
                  <TouchableOpacity
                    style={[styles.audienceChip, visibility === 'TOWER' && styles.audienceChipActive]}
                    onPress={() => setVisibility('TOWER')}
                  >
                    <Ionicons name="business" size={12} color={visibility === 'TOWER' ? '#fff' : COLORS.textSecondary} />
                    <Text style={[styles.audienceText, visibility === 'TOWER' && styles.audienceTextActive]}>
                      Tower {tower} only
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Post Intent Picker Chips - Filtered by Admin Access */}
          {availablePostTypes.length === 0 ? (
            <View style={styles.restrictedNoticeBox}>
              <Ionicons name="lock-closed-outline" size={24} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.restrictedTitle}>Posting Restricted</Text>
                <Text style={styles.restrictedDesc}>
                  Your community administrator has restricted post creation for this account. Please contact your society office or management committee to request access.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.intentWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.intentScroll}>
                {availablePostTypes.map((pt) => {
                  const isSelected = selectedType === pt.key;
                  return (
                    <TouchableOpacity
                      key={pt.key}
                      style={[styles.intentChip, isSelected && { backgroundColor: pt.color, borderColor: pt.color }]}
                      onPress={() => setSelectedType(pt.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.intentEmoji}>{pt.emoji}</Text>
                      <Text style={[styles.intentLabel, isSelected && styles.intentLabelActive]}>{pt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Optional Title for Announcements & Notices */}
          {(selectedType === 'announcement' || selectedType === 'classified') && (
            <TextInput
              style={styles.titleInput}
              placeholder={selectedType === 'announcement' ? 'Notice Heading (e.g. Water Tank Cleaning Schedule)' : 'Item Title (e.g. Solid Wood Study Table)'}
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={150}
            />
          )}

          {/* Lost & Found Location Field */}
          {selectedType === 'lost_found' && (
            <View style={styles.extraFieldRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.primary} />
              <TextInput
                style={styles.extraFieldInput}
                placeholder="Where was it seen or found? (e.g. Tennis Court Bench)"
                placeholderTextColor={COLORS.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          )}

          {/* Classified Price Field */}
          {selectedType === 'classified' && (
            <View style={styles.extraFieldRow}>
              <Ionicons name="pricetag-outline" size={16} color="#059669" />
              <TextInput
                style={styles.extraFieldInput}
                placeholder="Expected Price in ₹ (e.g. 2500)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            </View>
          )}

          {/* Main Content Area / Poll Question */}
          <TextInput
            style={styles.contentInput}
            placeholder={activeMeta.placeholder}
            placeholderTextColor={COLORS.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
            textAlignVertical="top"
          />

          {/* Poll Options Builder (Shown only when Poll is selected and user has permission) */}
          {selectedType === 'poll' && (
            <View style={styles.pollSection}>
              <View style={styles.pollHeaderRow}>
                <Ionicons name="bar-chart-outline" size={18} color="#7C3AED" />
                <Text style={styles.pollSectionTitle}>Poll Choices</Text>
              </View>

              {pollOptions.map((opt, idx) => (
                <View key={idx} style={styles.pollOptionRow}>
                  <Text style={styles.pollOptionNumber}>{idx + 1}.</Text>
                  <TextInput
                    style={styles.pollOptionInput}
                    placeholder={`Choice ${idx + 1} (e.g. ${idx === 0 ? 'Yes, proceed' : 'No, postpone'})`}
                    placeholderTextColor={COLORS.textMuted}
                    value={opt}
                    onChangeText={(val) => {
                      const updated = [...pollOptions];
                      updated[idx] = val;
                      setPollOptions(updated);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      onPress={() => {
                        const updated = pollOptions.filter((_, i) => i !== idx);
                        setPollOptions(updated);
                      }}
                      hitSlop={6}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < 5 && (
                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.addOptionText}>+ Add another choice (max 5)</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.anonymousRow}
                onPress={() => setPollAnonymous(!pollAnonymous)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={pollAnonymous ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={pollAnonymous ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={styles.anonymousText}>Anonymous voting (hide resident names from results)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Image URL Attachment Field */}
          {showImageInput ? (
            <View style={styles.imageInputWrap}>
              <Ionicons name="image-outline" size={16} color={COLORS.primary} />
              <TextInput
                style={styles.imageUrlInput}
                placeholder="Paste Image URL (https://...)"
                placeholderTextColor={COLORS.textMuted}
                value={imageUrl}
                onChangeText={setImageUrl}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowImageInput(false)}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addImageBtn} onPress={() => setShowImageInput(true)}>
              <Ionicons name="camera-outline" size={16} color={COLORS.primary} />
              <Text style={styles.addImageText}>Attach Photo / Circular Image</Text>
            </TouchableOpacity>
          )}

          {/* Suggested Hashtags */}
          <View style={styles.tagsContainer}>
            <Text style={styles.tagsLabel}>Suggested Topics:</Text>
            <View style={styles.tagsRow}>
              {SUGGESTED_TAGS.map((tag) => (
                <TouchableOpacity key={tag} style={styles.tagChip} onPress={() => handleTagPress(tag)}>
                  <Text style={styles.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  publishBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  publishBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  publishText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollArea: {
    flex: 1,
    padding: 16,
  },
  authorSection: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  authorMetaWrap: {
    flex: 1,
    gap: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  audienceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  audienceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
  },
  audienceChipActive: {
    backgroundColor: COLORS.primary,
  },
  audienceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  audienceTextActive: {
    color: '#fff',
  },
  intentWrap: {
    marginBottom: 14,
  },
  intentScroll: {
    gap: 8,
  },
  intentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  intentEmoji: {
    fontSize: 13,
  },
  intentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  intentLabelActive: {
    color: '#fff',
  },
  titleInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  extraFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  extraFieldInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  contentInput: {
    minHeight: 140,
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    paddingTop: 8,
    marginBottom: 16,
  },
  imageInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  imageUrlInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  addImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  addImageText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  tagsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginBottom: 32,
  },
  tagsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  restrictedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 16,
  },
  restrictedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  restrictedDesc: {
    fontSize: 12,
    color: '#B91C1C',
    lineHeight: 17,
  },
  pollSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
  },
  pollHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  pollSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pollOptionNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    width: 18,
  },
  pollOptionInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: COLORS.text,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginTop: 2,
  },
  addOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  anonymousText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
