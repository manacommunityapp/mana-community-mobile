import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CachedImage as Image } from '@/components/common/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import type { MarketplaceListingDto } from '@/types/api';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';

const CARD_WIDTH = (Dimensions.get('window').width - 36) / 2;

const CONDITION_LABEL: Record<string, string> = {
  NEW:      'New',
  LIKE_NEW: 'Like New',
  GOOD:     'Good',
  FAIR:     'Fair',
  POOR:     'Poor',
};

const CONDITION_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  NEW:      { color: '#059669', bg: '#DCFCE7', icon: '✨' },
  LIKE_NEW: { color: '#0284C7', bg: '#E0F2FE', icon: '👌' },
  GOOD:     { color: '#6366F1', bg: '#EEF2FF', icon: '👍' },
  FAIR:     { color: '#D97706', bg: '#FEF3C7', icon: '🔸' },
  POOR:     { color: '#6B7280', bg: '#F1F5F9', icon: '🔹' },
};

interface ListingCardProps {
  listing:    MarketplaceListingDto;
  onSave?:    (l: MarketplaceListingDto) => void;
  isSaving?:  boolean;
}

export function ListingCard({ listing, onSave, isSaving }: ListingCardProps) {
  const router = useRouter();
  const thumb  = listing.imageUrls?.[0];
  const cond   = CONDITION_CONFIG[listing.condition] ?? CONDITION_CONFIG.GOOD;

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

        {/* Overlay: SOLD */}
        {listing.status === 'SOLD' && (
          <View style={s.soldOverlay}>
            <View style={s.soldPill}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={s.soldText}>SOLD</Text>
            </View>
          </View>
        )}

        {/* FREE badge */}
        {listing.isFree && listing.status !== 'SOLD' && (
          <View style={s.freeBadge}>
            <Text style={s.freeBadgeText}>🎁 FREE</Text>
          </View>
        )}

        {/* Image count */}
        {listing.imageUrls && listing.imageUrls.length > 1 && listing.status !== 'SOLD' && (
          <View style={s.imgCount}>
            <Ionicons name="images-outline" size={10} color="#fff" />
            <Text style={s.imgCountText}>{listing.imageUrls.length}</Text>
          </View>
        )}

        {/* Heart */}
        <TouchableOpacity
          style={[s.heartBtn, listing.isSaved && s.heartBtnActive]}
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

        {/* Price Row */}
        <View style={s.priceRow}>
          <Text style={s.price}>
            {listing.isFree ? 'Free' : `₹${listing.price.toLocaleString('en-IN')}`}
          </Text>
          {listing.isNegotiable && !listing.isFree && (
            <View style={s.negoPill}>
              <Text style={s.negoText}>Nego</Text>
            </View>
          )}
        </View>

        {/* Condition + Time */}
        <View style={s.metaRow}>
          <View style={[s.condBadge, { backgroundColor: cond.bg }]}>
            <Text style={s.condIcon}>{cond.icon}</Text>
            <Text style={[s.condText, { color: cond.color }]}>
              {CONDITION_LABEL[listing.condition]}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          {listing.sellerFlat ? (
            <View style={s.flatRow}>
              <Ionicons name="home-outline" size={10} color={COLORS.textMuted} />
              <Text style={s.flat} numberOfLines={1}>{listing.sellerFlat}</Text>
            </View>
          ) : <View />}
          <Text style={s.time}>
            {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: false })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    ...SHADOWS.sm,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  imagePlaceholderEmoji: {
    fontSize: 40,
  },
  soldOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  soldText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
    fontFamily: FONTS.displayBold,
  },
  freeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  freeBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 10,
    fontFamily: FONTS.semiBold,
  },
  imgCount: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  imgCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  heartBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  heart: {
    fontSize: 14,
  },
  info: {
    padding: 10,
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 18,
    fontFamily: FONTS.semiBold,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: '#312E81',
    fontFamily: FONTS.displayBold,
  },
  negoPill: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  negoText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
    fontFamily: FONTS.semiBold,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 5,
  },
  condBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  condIcon: {
    fontSize: 9,
  },
  condText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  flat: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  time: {
    fontSize: 9.5,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
});
