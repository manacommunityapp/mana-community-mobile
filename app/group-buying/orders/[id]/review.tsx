import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';

const REVIEW_TAGS = [
  'Fresh & Sealed',
  'Fast Handover',
  'Huge Savings',
  'Great Packaging',
  'Friendly Staff',
  'Accurate Weight',
  'Good Expiry Date',
];

export default function OrderReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [productRating, setProductRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Fresh & Sealed', 'Huge Savings']);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!comment.trim() && selectedTags.length === 0) {
      Alert.alert('Feedback Required', 'Please share a few words or tags about your experience.');
      return;
    }

    setSubmitting(true);
    try {
      const fullComment = [
        selectedTags.length > 0 ? `[${selectedTags.join(', ')}]` : '',
        comment.trim(),
      ].filter(Boolean).join(' ');

      await groupBuyingService.submitOrderReview({
        orderId: id || 'GB-2026-00101',
        dealId: 'd1',
        residentName: 'Sandeep V',
        productRating,
        deliveryRating,
        comment: fullComment,
      });

      Alert.alert(
        '⭐ Thank You!',
        'Your verified review helps neighbours find the best wholesale suppliers.',
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'Unable to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Rate Your Order', headerBackTitle: 'Orders' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        
        {/* Header summary */}
        <View style={s.headerCard}>
          <Ionicons name="sparkles" size={28} color={COLORS.primary} />
          <Text style={s.headerTitle}>How was your Community Buy?</Text>
          <Text style={s.headerSub}>Order #{id || 'GB-2026-00101'}</Text>
        </View>

        {/* Product Rating */}
        <View style={s.card}>
          <Text style={s.ratingLabel}>Product Quality & Freshness</Text>
          <View style={s.starRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setProductRating(star)} style={s.starBtn}>
                <Ionicons
                  name={star <= productRating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= productRating ? '#F59E0B' : COLORS.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.starSubtext}>
            {productRating === 5 ? 'Excellent Quality' : productRating === 4 ? 'Good Quality' : productRating === 3 ? 'Average' : 'Needs Improvement'}
          </Text>
        </View>

        {/* Delivery / Desk Handover Rating */}
        <View style={s.card}>
          <Text style={s.ratingLabel}>Pickup Desk / Delivery Experience</Text>
          <View style={s.starRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setDeliveryRating(star)} style={s.starBtn}>
                <Ionicons
                  name={star <= deliveryRating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= deliveryRating ? '#F59E0B' : COLORS.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.starSubtext}>
            {deliveryRating === 5 ? 'Smooth & Fast Handover' : deliveryRating === 4 ? 'Good Experience' : 'Slow or Confusing'}
          </Text>
        </View>

        {/* Highlights Tags */}
        <View style={s.card}>
          <Text style={s.ratingLabel}>Highlights</Text>
          <View style={s.tagContainer}>
            {REVIEW_TAGS.map(tag => {
              const active = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[s.tagChip, active && s.tagChipActive]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'add-circle-outline'}
                    size={14}
                    color={active ? '#fff' : COLORS.textSecondary}
                  />
                  <Text style={[s.tagChipText, active && s.tagChipTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Detailed Comments */}
        <View style={s.card}>
          <Text style={s.ratingLabel}>Write your Review</Text>
          <TextInput
            style={s.textArea}
            placeholder="Share feedback for your neighbours and supplier..."
            placeholderTextColor={COLORS.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={s.submitBtn}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={s.submitBtnText}>Submit Community Review</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, gap: 14 },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  headerSub: { fontSize: 13, color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  ratingLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 4 },
  starBtn: { padding: 4 },
  starSubtext: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: COLORS.primary },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tagChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tagChipTextActive: { color: '#fff', fontWeight: '700' },
  textArea: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 16,
    ...SHADOWS.md,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
