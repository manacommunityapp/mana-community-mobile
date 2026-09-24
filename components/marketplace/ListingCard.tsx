import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import type { MarketplaceListingDto } from '@/types/api';
import { COLORS } from '@/constants/config';

const CARD_WIDTH = (Dimensions.get('window').width - 36) / 2; // 2 cols, 12px padding + 12px gap

const CONDITION_LABEL: Record<string, string> = {
  NEW:      'New',
  LIKE_NEW: 'Like New',
  GOOD:     'Good',
  FAIR:     'Fair',
  POOR:     'Poor',
};

const CONDITION_COLOR: Record<string, string> = {
  NEW:      '#10B981',
  LIKE_NEW: '#3B82F6',
  GOOD:     '#6366F1',
  FAIR:     '#F59E0B',
  POOR:     '#6B7280',
};

interface ListingCardProps {
  listing:    MarketplaceListingDto;
  onSave?:    (l: MarketplaceListingDto) => void;
  isSaving?:  boolean;
}

export function ListingCard({ listing, onSave, isSaving }: ListingCardProps) {
  const router = useRouter();
  const thumb  = listing.imageUrls?.[0];

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push(`/marketplace/${listing.id}`)}
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={s.imageWrap}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Text style={s.imagePlaceholderEmoji}>🏷️</Text>
          </View>
        )}

        {/* Overlay badges */}
        {listing.status === 'SOLD' && (
          <View style={s.soldOverlay}>
            <Text style={s.soldText}>SOLD</Text>
          </View>
        )}
        {listing.isFree && listing.status !== 'SOLD' && (
          <View style={s.freeBadge}>
            <Text style={s.freeBadgeText}>FREE</Text>
          </View>
        )}

        {/* Heart / Save */}
        <TouchableOpacity
          style={s.heartBtn}
          onPress={(e) => { e.stopPropagation?.(); onSave?.(listing); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          disabled={isSaving}
        >
          <Text style={s.heart}>{listing.isSaved ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.title} numberOfLines={2}>{listing.title}</Text>

        <View style={s.row}>
          <Text style={s.price}>
            {listing.isFree ? 'Free' : `₹${listing.price.toLocaleString('en-IN')}`}
          </Text>
          {listing.isNegotiable && !listing.isFree && (
            <Text style={s.neg}> · Nego</Text>
          )}
        </View>

        <View style={s.meta}>
          <View style={[s.condBadge, { backgroundColor: CONDITION_COLOR[listing.condition] + '22' }]}>
            <Text style={[s.condText, { color: CONDITION_COLOR[listing.condition] }]}>
              {CONDITION_LABEL[listing.condition]}
            </Text>
          </View>
        </View>

        <View style={s.footer}>
          {listing.sellerFlat && (
            <Text style={s.flat} numberOfLines={1}>🏠 {listing.sellerFlat}</Text>
          )}
          <Text style={s.time}>
            {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: false })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:                 { width: CARD_WIDTH, backgroundColor: COLORS.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  imageWrap:            { width: '100%', aspectRatio: 1, position: 'relative', backgroundColor: '#F3F4F6' },
  image:                { width: '100%', height: '100%' },
  imagePlaceholder:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderEmoji:{ fontSize: 40 },
  soldOverlay:          { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  soldText:             { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 2 },
  freeBadge:            { position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.success, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  freeBadgeText:        { color: '#fff', fontWeight: '800', fontSize: 11 },
  heartBtn:             { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  heart:                { fontSize: 15 },
  info:                 { padding: 10, gap: 4 },
  title:                { fontSize: 13, fontWeight: '600', color: COLORS.text, lineHeight: 18 },
  row:                  { flexDirection: 'row', alignItems: 'baseline' },
  price:                { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  neg:                  { fontSize: 11, color: COLORS.textMuted },
  meta:                 { flexDirection: 'row', gap: 5 },
  condBadge:            { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  condText:             { fontSize: 10, fontWeight: '700' },
  footer:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  flat:                 { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  time:                 { fontSize: 10, color: COLORS.textMuted },
});
