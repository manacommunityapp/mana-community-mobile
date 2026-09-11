import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Dimensions, FlatList,
  ActivityIndicator, Alert, Share, NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { marketplaceService } from '@/services/marketplaceService';
import { chatService } from '@/services/chatService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';
import { formatDistanceToNow, format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New', LIKE_NEW: 'Like New', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor',
};
const CONDITION_COLOR: Record<string, string> = {
  NEW: '#10B981', LIKE_NEW: '#3B82F6', GOOD: '#6366F1', FAIR: '#F59E0B', POOR: '#6B7280',
};
const CATEGORY_EMOJI: Record<string, string> = {
  FURNITURE: '🛋️', ELECTRONICS: '📱', CLOTHING: '👕', BOOKS: '📚',
  SPORTS: '🏋️', KITCHEN: '🍳', GARDEN: '🌱', SERVICES: '🔧',
  FREE: '🎁', OTHER: '📦',
};

// ── Image gallery with pagination dots ────────────────────────
function ImageGallery({ urls }: { urls: string[] }) {
  const [current, setCurrent] = useState(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrent(idx);
    },
    [],
  );

  if (urls.length === 0) {
    return (
      <View style={[g.container, g.placeholder]}>
        <Text style={g.placeholderEmoji}>🏷️</Text>
        <Text style={g.placeholderText}>No photos</Text>
      </View>
    );
  }

  return (
    <View style={g.container}>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={g.image} resizeMode="cover" />
        )}
      />
      {/* Dots */}
      {urls.length > 1 && (
        <View style={g.dots}>
          {urls.map((_, i) => (
            <View key={i} style={[g.dot, i === current && g.dotActive]} />
          ))}
        </View>
      )}
      {/* Counter */}
      <View style={g.counter}>
        <Text style={g.counterText}>{current + 1}/{urls.length}</Text>
      </View>
    </View>
  );
}

const g = StyleSheet.create({
  container:       { width: SCREEN_WIDTH, aspectRatio: 1.1, backgroundColor: '#F3F4F6', position: 'relative' },
  image:           { width: SCREEN_WIDTH, aspectRatio: 1.1 },
  placeholder:     { alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderEmoji:{ fontSize: 56 },
  placeholderText: { fontSize: 14, color: COLORS.textMuted },
  dots:            { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot:             { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:       { width: 18, backgroundColor: '#fff' },
  counter:         { position: 'absolute', top: 12, right: 14, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  counterText:     { color: '#fff', fontSize: 12, fontWeight: '600' },
});

// ── Main screen ────────────────────────────────────────────────
export default function ListingDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const { user } = useAuth();

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn:  () => marketplaceService.getListing(Number(id)),
  });

  const isOwner = listing?.sellerId === user?.id;

  // Backend uses a single toggle endpoint — no need to check isSaved first
  const saveMutation = useMutation({
    mutationFn: () => marketplaceService.toggleSave(Number(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listing', id] }),
  });

  const soldMutation = useMutation({
    mutationFn: () => marketplaceService.markAsSold(Number(id)),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['listing', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => marketplaceService.deleteListing(Number(id)),
    onSuccess:  () => router.replace('/marketplace'),
  });

  const [chatLoading, setChatLoading] = useState(false);

  const handleContactSeller = useCallback(async () => {
    if (!listing) return;
    setChatLoading(true);
    try {
      const conv = await chatService.startDirect(listing.sellerId);
      router.push(`/chat/${conv.id}`);
    } catch {
      Alert.alert('Error', 'Could not start a conversation.');
    } finally {
      setChatLoading(false);
    }
  }, [listing, router]);

  const handleShare = useCallback(async () => {
    if (!listing) return;
    await Share.share({
      message: `${listing.title} — ${listing.isFree ? 'FREE' : '₹' + listing.price.toLocaleString('en-IN')}\n\nAvailable in our community on Mana Community.`,
    });
  }, [listing]);

  const handleMarkSold = useCallback(() => {
    Alert.alert('Mark as Sold', 'Mark this listing as sold?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Sold', onPress: () => soldMutation.mutate() },
    ]);
  }, [soldMutation]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Listing', 'Permanently delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ]);
  }, [deleteMutation]);

  const handleReport = useCallback(() => {
    Alert.alert('Report Listing', 'Why are you reporting this listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Spam',          onPress: () => marketplaceService.reportListing(Number(id), 'SPAM') },
      { text: 'Inappropriate', onPress: () => marketplaceService.reportListing(Number(id), 'INAPPROPRIATE') },
      { text: 'Wrong Price',   onPress: () => marketplaceService.reportListing(Number(id), 'WRONG_PRICE') },
    ]);
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={scr.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!listing) return null;

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      {/* Back + actions header */}
      <View style={scr.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={scr.back}>‹</Text>
        </TouchableOpacity>
        <View style={scr.topActions}>
          <TouchableOpacity onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={scr.topActionIcon}>{listing.isSaved ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={scr.topActionIcon}>📤</Text>
          </TouchableOpacity>
          {!isOwner && (
            <TouchableOpacity onPress={handleReport} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={scr.topActionIcon}>🚩</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Image gallery */}
        <ImageGallery urls={listing.imageUrls} />

        <View style={scr.body}>
          {/* Status + category */}
          <View style={scr.tagRow}>
            {listing.status === 'SOLD' && (
              <View style={scr.soldBadge}><Text style={scr.soldText}>SOLD</Text></View>
            )}
            <View style={scr.catBadge}>
              <Text style={scr.catText}>
                {CATEGORY_EMOJI[listing.category] ?? '📦'} {listing.category}
              </Text>
            </View>
            <View style={[scr.condBadge, { backgroundColor: CONDITION_COLOR[listing.condition] + '22' }]}>
              <Text style={[scr.condText, { color: CONDITION_COLOR[listing.condition] }]}>
                {CONDITION_LABEL[listing.condition]}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={scr.title}>{listing.title}</Text>

          {/* Price */}
          <View style={scr.priceRow}>
            <Text style={scr.price}>
              {listing.isFree ? '🎁 Free' : `₹${listing.price.toLocaleString('en-IN')}`}
            </Text>
            {listing.isNegotiable && !listing.isFree && (
              <View style={scr.negoBadge}><Text style={scr.negoText}>Negotiable</Text></View>
            )}
          </View>

          {/* Stats */}
          <Text style={scr.stats}>
            👁 {listing.viewCount} views · 🤍 {listing.savedCount} saves ·{' '}
            {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
          </Text>

          {/* Description */}
          {listing.description ? (
            <View style={scr.section}>
              <Text style={scr.sectionTitle}>Description</Text>
              <Text style={scr.description}>{listing.description}</Text>
            </View>
          ) : null}

          {/* Seller card */}
          <View style={scr.section}>
            <Text style={scr.sectionTitle}>Seller</Text>
            <View style={scr.sellerCard}>
              <View style={scr.sellerAvatar}>
                <Text style={scr.sellerAvatarText}>{listing.sellerName[0]}</Text>
              </View>
              <View style={scr.sellerInfo}>
                <Text style={scr.sellerName}>{listing.sellerName}</Text>
                {listing.sellerFlat && (
                  <Text style={scr.sellerFlat}>🏠 {listing.sellerFlat}</Text>
                )}
              </View>
              {!isOwner && (
                <TouchableOpacity
                  style={scr.chatBtn}
                  onPress={handleContactSeller}
                  disabled={chatLoading}
                >
                  {chatLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={scr.chatBtnText}>💬 Chat</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Listed date */}
          <Text style={scr.listedDate}>
            Listed on {format(new Date(listing.createdAt), 'dd MMM yyyy')}
          </Text>

          {/* Owner actions */}
          {isOwner && (
            <View style={scr.ownerActions}>
              <Text style={scr.ownerActionsTitle}>Manage Listing</Text>
              <View style={scr.ownerBtns}>
                {listing.status === 'ACTIVE' && (
                  <>
                    <TouchableOpacity
                      style={[scr.ownerBtn, scr.ownerBtnPrimary]}
                      onPress={() => router.push({ pathname: '/marketplace/create', params: { editId: listing.id } })}
                    >
                      <Text style={scr.ownerBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[scr.ownerBtn, scr.ownerBtnSuccess]}
                      onPress={handleMarkSold}
                      disabled={soldMutation.isPending}
                    >
                      <Text style={scr.ownerBtnText}>✅ Mark Sold</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={[scr.ownerBtn, scr.ownerBtnDanger]}
                  onPress={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={scr.ownerBtnText}>🗑 Delete</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA for non-owners */}
      {!isOwner && listing.status === 'ACTIVE' && (
        <View style={scr.bottomBar}>
          <View style={scr.bottomPrice}>
            <Text style={scr.bottomPriceLabel}>Price</Text>
            <Text style={scr.bottomPriceValue}>
              {listing.isFree ? 'Free' : `₹${listing.price.toLocaleString('en-IN')}`}
            </Text>
          </View>
          <TouchableOpacity
            style={scr.contactBtn}
            onPress={handleContactSeller}
            disabled={chatLoading}
            activeOpacity={0.85}
          >
            {chatLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={scr.contactBtnText}>💬 Contact Seller</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:         { flex: 1, backgroundColor: COLORS.background },
  topBar:            { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.92)' },
  back:              { fontSize: 32, color: COLORS.primary, lineHeight: 38, fontWeight: '300' },
  topActions:        { flexDirection: 'row', gap: 14 },
  topActionIcon:     { fontSize: 22 },
  body:              { padding: 16, gap: 12 },
  tagRow:            { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  soldBadge:         { backgroundColor: '#374151', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  soldText:          { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  catBadge:          { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catText:           { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  condBadge:         { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  condText:          { fontSize: 12, fontWeight: '700' },
  title:             { fontSize: 22, fontWeight: '800', color: COLORS.text, lineHeight: 28 },
  priceRow:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  price:             { fontSize: 28, fontWeight: '900', color: COLORS.primary },
  negoBadge:         { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  negoText:          { fontSize: 12, fontWeight: '600', color: '#92400E' },
  stats:             { fontSize: 12, color: COLORS.textMuted },
  section:           { gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle:      { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  description:       { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  sellerCard:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sellerAvatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sellerAvatarText:  { color: '#fff', fontWeight: '700', fontSize: 18 },
  sellerInfo:        { flex: 1 },
  sellerName:        { fontSize: 15, fontWeight: '700', color: COLORS.text },
  sellerFlat:        { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  chatBtn:           { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  chatBtnText:       { color: '#fff', fontWeight: '700', fontSize: 13 },
  listedDate:        { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  ownerActions:      { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  ownerActionsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  ownerBtns:         { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  ownerBtn:          { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', minWidth: 90 },
  ownerBtnPrimary:   { backgroundColor: COLORS.primary },
  ownerBtnSuccess:   { backgroundColor: COLORS.success },
  ownerBtnDanger:    { backgroundColor: COLORS.error },
  ownerBtnText:      { color: '#fff', fontWeight: '700', fontSize: 13 },
  bottomBar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 14 },
  bottomPrice:       { gap: 1 },
  bottomPriceLabel:  { fontSize: 11, color: COLORS.textMuted },
  bottomPriceValue:  { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  contactBtn:        { flex: 1, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  contactBtnText:    { color: '#fff', fontWeight: '800', fontSize: 15 },
});
