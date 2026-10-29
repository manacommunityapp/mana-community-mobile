import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { forumService, FORUM_CATEGORIES } from '@/services/forumService';

const CATEGORIES = FORUM_CATEGORIES.filter(c => c.code !== 'ALL');

export default function NewPostScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('DISCUSSION');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => forumService.createPost({ title: title.trim(), content: content.trim(), category }),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['forum', 'posts'] });
      router.replace(`/forum/${post.id}` as any);
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to create post. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (!content.trim()) { setError('Please enter content for your post.'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[s.postBtn, (mutation.isPending) && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.postBtnText}>Publish</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Category */}
        <Text style={s.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          {CATEGORIES.map(cat => {
            const active = category === cat.code;
            return (
              <TouchableOpacity
                key={cat.code}
                style={[s.catChip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setCategory(cat.code)}
                activeOpacity={0.8}
              >
                <Ionicons name={cat.icon} size={14} color={active ? '#fff' : cat.color} />
                <Text style={[s.catChipText, active && { color: '#fff' }]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Title */}
        <Text style={s.label}>Title *</Text>
        <TextInput
          style={s.titleInput}
          placeholder="What's on your mind?"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          multiline={false}
        />
        <Text style={s.charCount}>{title.length}/200</Text>

        {/* Content */}
        <Text style={s.label}>Details *</Text>
        <TextInput
          style={s.contentInput}
          placeholder="Share more details, context, or questions here..."
          placeholderTextColor={COLORS.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        {/* Error */}
        {error ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Tips */}
        <View style={s.tipsBox}>
          <Text style={s.tipsTitle}>Posting guidelines</Text>
          <Text style={s.tipItem}>• Be respectful and constructive</Text>
          <Text style={s.tipItem}>• Stay on topic for the selected category</Text>
          <Text style={s.tipItem}>• No personal attacks or spam</Text>
          <Text style={s.tipItem}>• For urgent issues, contact management directly</Text>
        </View>
      </ScrollView>
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
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  postBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: RADIUS.md, ...SHADOWS.sm, minWidth: 72, alignItems: 'center',
  },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, gap: 4, paddingBottom: 40 },

  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: 6, marginTop: 12, fontFamily: 'DMSans-Medium',
  },
  catRow: { gap: 8, paddingBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  catChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  titleInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, fontFamily: 'DMSans-Regular',
  },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 2, fontFamily: 'DMSans-Regular' },

  contentInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: 14, color: COLORS.text, fontFamily: 'DMSans-Regular',
    minHeight: 140,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 8,
  },
  errorText: { flex: 1, fontSize: 12, color: '#B91C1C', fontFamily: 'DMSans-Regular' },

  tipsBox: {
    marginTop: 16, backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 4,
  },
  tipsTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold', marginBottom: 4 },
  tipItem: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', lineHeight: 18 },
});
