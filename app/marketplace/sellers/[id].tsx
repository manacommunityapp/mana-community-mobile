import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { sellerService, SellerProfile, SellerListing, SellerReview } from '@/services/sellerService';

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Ionicons
          key={n}
          name={n <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

function ReviewModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rStyles.overlay}>
        <View style={rStyles.sheet}>
          <Text style={rStyles.title}>Write a Review</Text>
          <View style={rStyles.starRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={30} color="#F59E0B" />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={rStyles.input}
            placeholder="Share your experience (optional)"
            placeholderTextColor={COLORS.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
          <View style={rStyles.btnRow}>
            <TouchableOpacity style={rStyles.cancelBtn} onPress={onClose}>
              <Text style={rStyles.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={rStyles.submitBtn} onPress={() => onSubmit(rating, comment)}>
              <Text style={rStyles.submitLabel}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SellerProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sellerId = parseInt(id ?? '0', 10);
  const qc = useQueryClient();

  const [reviewModal, setReviewModal] = useState(false);

  const { data: seller, isLoading: loadingSeller } = useQuery({
    queryKey: ['seller', sellerId],
    queryFn: () => sellerService.getSellerProfile(sellerId),
  });

  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['seller-listings', sellerId],
    queryFn: () => sellerService.getSellerListings(sellerId),
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['seller-reviews', sellerId],
    queryFn: () => sellerService.getSellerReviews(sellerId),
  });

  const { mutate: submitReview } = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment: string }) =>
      sellerService.submitReview(sellerId, rating, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller-reviews', sellerId] });
      qc.invalidateQueries({ queryKey: ['seller', sellerId] });
      setReviewModal(false);
      Alert.alert('Thank you!', 'Your review has been submitted.');
    },
    onError: () => Alert.alert('Error', 'Could not submit review. Please try again.'),
  });

  if (loadingSeller) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!seller) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.notFound}>Seller not found.</Text>
      </SafeAreaView>
    );
  }

  const initials = seller.businessName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{seller.businessName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.bigAvatar}>
            <Text style={styles.bigAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.businessName}>{seller.businessName}</Text>
              {seller.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color="#2563EB" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={styles.sellerType}>{seller.sellerType.replace('_', ' ')}</Text>
            <View style={styles.ratingRow}>
              <Stars rating={seller.avgRating} />
              <Text style={styles.ratingNum}>{seller.avgRating.toFixed(1)}</Text>
              <Text style={styles.reviewCountText}>({seller.totalReviews} reviews)</Text>
            </View>
            {seller.description && (
              <Text style={styles.description}>{seller.description}</Text>
            )}
          </View>

          {/* Contact */}
          {seller.phone ? (
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => Linking.openURL(`tel:${seller.phone}`)}
              >
                <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                <Text style={styles.contactBtnLabel}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactBtn, styles.waBtn]}
                onPress={() => Linking.openURL(`https://wa.me/${seller.phone.replace(/\D/g, '')}`)}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                <Text style={[styles.contactBtnLabel, { color: '#16A34A' }]}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Listings */}
        <Text style={styles.sectionTitle}>Offerings</Text>
        {loadingListings ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : listings.length === 0 ? (
          <Text style={styles.noItems}>No listings yet.</Text>
        ) : (
          listings.map(listing => (
            <ListingRow key={listing.id} listing={listing} />
          ))
        )}

        {/* Reviews */}
        <View style={styles.reviewsHeader}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          <TouchableOpacity onPress={() => setReviewModal(true)}>
            <Text style={styles.addReviewLink}>+ Add Review</Text>
          </TouchableOpacity>
        </View>
        {loadingReviews ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : reviews.length === 0 ? (
          <Text style={styles.noItems}>No reviews yet. Be the first!</Text>
        ) : (
          reviews.map(r => <ReviewRow key={r.id} review={r} />)
        )}
      </ScrollView>

      <ReviewModal
        visible={reviewModal}
        onClose={() => setReviewModal(false)}
        onSubmit={(rating, comment) => submitReview({ rating, comment })}
      />
    </SafeAreaView>
  );
}

function ListingRow({ listing }: { listing: SellerListing }) {
  return (
    <View style={styles.listingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.listingTitle}>{listing.title}</Text>
        {listing.description && (
          <Text style={styles.listingDesc} numberOfLines={2}>{listing.description}</Text>
        )}
      </View>
      <View style={styles.listingRight}>
        {listing.price != null && (
          <Text style={styles.listingPrice}>
            ₹{listing.price}{listing.priceUnit ? `/${listing.priceUnit}` : ''}
          </Text>
        )}
        <View style={[styles.availBadge, !listing.isAvailable && styles.soldOutBadge]}>
          <Text style={[styles.availText, !listing.isAvailable && styles.soldOutText]}>
            {listing.isAvailable ? 'Available' : 'Sold out'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ReviewRow({ review }: { review: SellerReview }) {
  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewTop}>
        <Text style={styles.reviewerName}>{review.reviewerName}</Text>
        <Stars rating={review.rating} size={12} />
      </View>
      {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
      <Text style={styles.reviewDate}>
        {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border ?? '#E2E8F0',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  backBtn: { padding: SPACING.md },
  notFound: { textAlign: 'center', marginTop: 48, color: COLORS.textMuted },
  scroll: { padding: SPACING.md, gap: 12, paddingBottom: 48 },

  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: 16, gap: 12,
    ...SHADOWS.sm,
  },
  bigAvatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },
  bigAvatarText: { fontSize: 22, fontWeight: '800', color: '#7C3AED' },
  profileInfo: { gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  businessName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#DBEAFE', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  verifiedText: { fontSize: 11, fontWeight: '600', color: '#2563EB' },
  sellerType: { fontSize: 13, color: COLORS.textMuted, textTransform: 'capitalize' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ratingNum: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  reviewCountText: { fontSize: 12, color: COLORS.textMuted },
  description: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginTop: 6 },

  contactRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: RADIUS.sm,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
  },
  waBtn: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  contactBtnLabel: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  noItems: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },

  listingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm, padding: 12,
    borderWidth: 1, borderColor: COLORS.border ?? '#E2E8F0',
  },
  listingTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  listingDesc:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  listingRight: { alignItems: 'flex-end', gap: 4 },
  listingPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  availBadge:   { backgroundColor: '#DCFCE7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  soldOutBadge: { backgroundColor: '#F3F4F6' },
  availText:    { fontSize: 11, fontWeight: '600', color: '#16A34A' },
  soldOutText:  { color: '#9CA3AF' },

  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addReviewLink: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  reviewRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm, padding: 12, gap: 4,
    borderWidth: 1, borderColor: COLORS.border ?? '#E2E8F0',
  },
  reviewTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewerName:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  reviewComment: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  reviewDate:    { fontSize: 11, color: COLORS.textMuted },
});

const rStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 16,
  },
  title:   { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  input: {
    borderWidth: 1, borderColor: COLORS.border ?? '#E2E8F0',
    borderRadius: RADIUS.sm, padding: 12, fontSize: 14, color: COLORS.text,
    textAlignVertical: 'top', minHeight: 80,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border ?? '#E2E8F0',
    alignItems: 'center',
  },
  cancelLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  submitBtn: {
    flex: 2, paddingVertical: 12, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary ?? '#6366F1',
    alignItems: 'center',
  },
  submitLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
