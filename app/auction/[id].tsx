import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Animated, ActivityIndicator,
  Modal, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAuctionLive } from '@/hooks/useAuctionLive';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { BidFeed } from '@/components/auction/BidFeed';
import { BidButton } from '@/components/auction/BidButton';
import { COLORS } from '@/constants/config';
import { format } from 'date-fns';

const { width: W } = Dimensions.get('window');

// ── Animated price display ─────────────────────────────────────
function AnimatedPrice({
  amount, flash,
}: { amount: number; flash: boolean }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flash) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale,     { toValue: 1.18, duration: 150, useNativeDriver: true }),
        Animated.timing(scale,     { toValue: 1,    duration: 250, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(bgOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, [flash]);

  return (
    <View style={ap.wrap}>
      <Text style={ap.label}>Current Bid</Text>
      <Animated.View style={[ap.flash, { opacity: bgOpacity }]} />
      <Animated.Text style={[ap.price, { transform: [{ scale }] }]}>
        ₹{amount.toLocaleString('en-IN')}
      </Animated.Text>
    </View>
  );
}

const ap = StyleSheet.create({
  wrap:  { alignItems: 'center', position: 'relative' },
  flash: { ...StyleSheet.absoluteFill, backgroundColor: '#FEF9C3', borderRadius: 12 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 4, letterSpacing: 0.5 },
  price: { fontSize: 42, fontWeight: '900', color: COLORS.primary, fontVariant: ['tabular-nums'] as any },
});

// ── Image gallery (horizontal scroll) ─────────────────────────
function Gallery({ urls }: { urls: string[] }) {
  const [idx, setIdx] = useState(0);

  if (urls.length === 0) {
    return (
      <View style={gl.empty}>
        <Text style={{ fontSize: 48 }}>🔨</Text>
      </View>
    );
  }

  return (
    <View style={gl.wrap}>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) =>
          setIdx(Math.round(e.nativeEvent.contentOffset.x / W))
        }
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={gl.image} resizeMode="cover" />
        )}
      />
      {urls.length > 1 && (
        <View style={gl.dots}>
          {urls.map((_, i) => (
            <View key={i} style={[gl.dot, i === idx && gl.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const gl = StyleSheet.create({
  wrap:     { width: W, height: W * 0.7, position: 'relative', backgroundColor: '#F3F4F6' },
  image:    { width: W, height: W * 0.7 },
  empty:    { width: W, height: W * 0.7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  dots:     { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:{ width: 18, backgroundColor: '#fff' },
});

// ── Winner overlay modal ───────────────────────────────────────
function WinnerModal({
  winner, isMe, onClose,
}: {
  winner: { id: number; name: string; amount: number };
  isMe:   boolean;
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }).start();
  }, []);

  return (
    <Modal transparent animationType="fade">
      <View style={wm.overlay}>
        <Animated.View style={[wm.card, { transform: [{ scale }] }]}>
          <Text style={wm.trophy}>🏆</Text>
          <Text style={wm.headline}>
            {isMe ? 'Congratulations!' : 'Auction Ended!'}
          </Text>
          <Text style={wm.sub}>
            {isMe
              ? `You won this item for\n₹${winner.amount.toLocaleString('en-IN')}!`
              : `${winner.name} won this auction\nfor ₹${winner.amount.toLocaleString('en-IN')}`
            }
          </Text>
          <TouchableOpacity style={wm.btn} onPress={onClose}>
            <Text style={wm.btnText}>{isMe ? '🎉 Claim Item' : 'Close'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const wm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  card:     { backgroundColor: COLORS.surface, borderRadius: 24, padding: 32, alignItems: 'center', marginHorizontal: 32, gap: 12 },
  trophy:   { fontSize: 64 },
  headline: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  sub:      { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24 },
  btn:      { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  btnText:  { color: '#fff', fontWeight: '800', fontSize: 16 },
});

// ── Main auction room ──────────────────────────────────────────
export default function AuctionRoomScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();

  const {
    auction, bids, isLoading, isPlacingBid,
    connected, isWinning, wasOutbid,
    lastBidFlash, auctionEnded, winner,
    placeBid, minNextBid, clearOutbid,
  } = useAuctionLive(Number(id), user?.id ?? 0);

  const [showWinner,  setShowWinner]  = useState(false);
  const outbidOpacity = useRef(new Animated.Value(0)).current;

  // Show winner modal when auction ends
  useEffect(() => {
    if (auctionEnded && winner) {
      setTimeout(() => setShowWinner(true), 600);
    }
  }, [auctionEnded, winner]);

  // Animate outbid banner
  useEffect(() => {
    if (wasOutbid) {
      Animated.sequence([
        Animated.timing(outbidOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(outbidOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => clearOutbid());
    }
  }, [wasOutbid]);

  if (isLoading) {
    return (
      <SafeAreaView style={scr.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!auction) return null;

  const isLive     = auction.status === 'LIVE' || auction.status === 'ENDING_SOON';
  const isUpcoming = auction.status === 'UPCOMING';

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      {/* Top bar */}
      <View style={scr.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={scr.back}>‹</Text>
        </TouchableOpacity>
        <View style={scr.topCenter}>
          <View style={[scr.statusDot, isLive && scr.statusDotLive]} />
          <Text style={scr.statusLabel}>
            {auction.status === 'LIVE'         ? 'LIVE'
            : auction.status === 'ENDING_SOON' ? 'ENDING SOON'
            : auction.status === 'UPCOMING'    ? 'UPCOMING'
            : 'ENDED'}
          </Text>
          {!connected && isLive && (
            <Text style={scr.wsStatus}> · Reconnecting…</Text>
          )}
        </View>
        <Text style={scr.bidCount}>🔨 {auction.bidCount}</Text>
      </View>

      {/* Outbid banner */}
      <Animated.View style={[scr.outbidBanner, { opacity: outbidOpacity }]}>
        <Text style={scr.outbidText}>⚠️ You've been outbid!</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[]} bounces={false}>
        {/* Gallery */}
        <Gallery urls={auction.imageUrls} />

        <View style={scr.body}>
          {/* Title */}
          <Text style={scr.title}>{auction.title}</Text>
          <Text style={scr.meta}>
            {auction.category} · {auction.condition} · by {auction.sellerName}
            {auction.sellerFlat ? ` (${auction.sellerFlat})` : ''}
          </Text>

          {/* Price + countdown side by side */}
          <View style={scr.priceRow}>
            <AnimatedPrice amount={auction.currentBid || auction.startingPrice} flash={lastBidFlash} />

            <View style={scr.countdownWrap}>
              {isLive && (
                <CountdownTimer
                  endTime={auction.endTime}
                  size="md"
                  onExpired={() => {/* status update comes via STOMP */}}
                />
              )}
              {isUpcoming && (
                <>
                  <Text style={scr.startsLabel}>Starts in</Text>
                  <CountdownTimer endTime={auction.startTime} size="md" />
                </>
              )}
              {auctionEnded && (
                <Text style={scr.endedLabel}>Auction Ended</Text>
              )}
            </View>
          </View>

          {/* Reserve price indicator */}
          {auction.reservePrice && (
            <View style={[scr.reserveRow, auction.reserveMet && scr.reserveMet]}>
              <Text style={[scr.reserveText, auction.reserveMet && scr.reserveMetText]}>
                {auction.reserveMet
                  ? '✅ Reserve price met'
                  : `⚠️ Reserve not met (₹${auction.reservePrice.toLocaleString('en-IN')})`
                }
              </Text>
            </View>
          )}

          {/* Current leader */}
          {auction.currentBidder && !auctionEnded && (
            <View style={scr.leaderCard}>
              <Text style={scr.leaderLabel}>Current Leader</Text>
              <Text style={scr.leaderName}>
                {auction.currentBidderId === user?.id ? '🏆 You!' : `🏆 ${auction.currentBidder}`}
              </Text>
            </View>
          )}

          {/* Description */}
          {auction.description && (
            <View style={scr.descCard}>
              <Text style={scr.descTitle}>About this item</Text>
              <Text style={scr.desc}>{auction.description}</Text>
            </View>
          )}

          {/* Auction details */}
          <View style={scr.detailsCard}>
            <Text style={scr.detailsTitle}>Auction Details</Text>
            <View style={scr.detailRow}>
              <Text style={scr.detailLabel}>Starting Price</Text>
              <Text style={scr.detailValue}>₹{auction.startingPrice.toLocaleString('en-IN')}</Text>
            </View>
            <View style={scr.detailRow}>
              <Text style={scr.detailLabel}>Start Time</Text>
              <Text style={scr.detailValue}>{format(new Date(auction.startTime), 'dd MMM, h:mm a')}</Text>
            </View>
            <View style={scr.detailRow}>
              <Text style={scr.detailLabel}>End Time</Text>
              <Text style={scr.detailValue}>{format(new Date(auction.endTime), 'dd MMM, h:mm a')}</Text>
            </View>
            <View style={scr.detailRow}>
              <Text style={scr.detailLabel}>Min. Next Bid</Text>
              <Text style={[scr.detailValue, { color: COLORS.primary, fontWeight: '700' }]}>
                ₹{minNextBid.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Bid history feed */}
          <View style={scr.feedCard}>
            <BidFeed bids={bids} currentUserId={user?.id ?? 0} />
          </View>

          <View style={{ height: 16 }} />
        </View>
      </ScrollView>

      {/* Bid button — sticky at bottom */}
      {!isUpcoming && (
        <BidButton
          currentBid={auction.currentBid || auction.startingPrice}
          minNextBid={minNextBid}
          isPlacingBid={isPlacingBid}
          auctionEnded={auctionEnded}
          isWinning={isWinning}
          onBid={placeBid}
        />
      )}

      {/* Winner modal */}
      {showWinner && winner && (
        <WinnerModal
          winner={winner}
          isMe={winner.id === user?.id}
          onClose={() => setShowWinner(false)}
        />
      )}
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.background },
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:          { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  topCenter:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
  statusDotLive: { backgroundColor: COLORS.error },
  statusLabel:   { fontSize: 13, fontWeight: '800', color: COLORS.text, letterSpacing: 0.5 },
  wsStatus:      { fontSize: 11, color: COLORS.textMuted },
  bidCount:      { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  outbidBanner:  { backgroundColor: '#FEE2E2', paddingVertical: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FCA5A5' },
  outbidText:    { color: '#991B1B', fontWeight: '700', fontSize: 14 },
  body:          { padding: 16, gap: 14 },
  title:         { fontSize: 22, fontWeight: '900', color: COLORS.text, lineHeight: 28 },
  meta:          { fontSize: 13, color: COLORS.textMuted },
  priceRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  countdownWrap: { alignItems: 'center', gap: 4 },
  startsLabel:   { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  endedLabel:    { fontSize: 16, fontWeight: '800', color: COLORS.textMuted },
  reserveRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FCD34D' },
  reserveMet:    { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  reserveText:   { fontSize: 13, fontWeight: '600', color: '#92400E' },
  reserveMetText:{ color: '#065F46' },
  leaderCard:    { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#C7D2FE' },
  leaderLabel:   { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  leaderName:    { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  descCard:      { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  descTitle:     { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  desc:          { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  detailsCard:   { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  detailsTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  detailRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel:   { fontSize: 13, color: COLORS.textMuted },
  detailValue:   { fontSize: 13, fontWeight: '600', color: COLORS.text },
  feedCard:      { backgroundColor: COLORS.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
});
