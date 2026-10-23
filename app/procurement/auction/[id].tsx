import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { AuctionRFQ, AuctionBid } from '@/types/procurement';

type Tab = 'leaderboard' | 'mybid';

function timeLeft(deadline?: string): string {
  if (!deadline) return '—';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Auction Closed';
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60000)}m left`;
  if (h < 24) return `${h}h ${Math.floor((diff % 3_600_000) / 60000)}m left`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h left`;
}

function isOpen(auction?: AuctionRFQ): boolean {
  if (!auction) return false;
  if (auction.status !== 'OPEN') return false;
  if (!auction.auctionDeadline) return true;
  return new Date(auction.auctionDeadline).getTime() > Date.now();
}

export default function AuctionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const rfqId = Number(id);

  const [tab, setTab] = useState<Tab>('leaderboard');
  const [bidAmount, setBidAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [bidNotes, setBidNotes] = useState('');

  const { data: auctions = [], isLoading: loadingAuction } = useQuery({
    queryKey: ['auctions'],
    queryFn: procurementHubService.getOpenAuctions,
  });
  const auction = auctions.find(a => a.id === rfqId);

  const { data: bids = [], isLoading: loadingBids, refetch: refetchBids } = useQuery({
    queryKey: ['auction-bids', rfqId],
    queryFn: () => procurementHubService.getAuctionBids(rfqId),
    enabled: !!rfqId,
    refetchInterval: 30_000,
  });

  const placeBidMutation = useMutation({
    mutationFn: () => procurementHubService.placeAuctionBid(rfqId, {
      bidAmount: Number(bidAmount),
      deliveryDays: deliveryDays ? Number(deliveryDays) : undefined,
      notes: bidNotes.trim() || undefined,
    }),
    onSuccess: (bid) => {
      qc.invalidateQueries({ queryKey: ['auction-bids', rfqId] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
      Alert.alert(
        bid.rank === 1 ? '🥇 You\'re Leading!' : `Bid Placed`,
        bid.rank === 1
          ? `Your bid of ₹${Number(bidAmount).toLocaleString('en-IN')} is currently the lowest.`
          : `You're at rank #${bid.rank}. Lower your bid to take the lead.`,
      );
      setBidAmount('');
      setDeliveryDays('');
      setBidNotes('');
      setTab('leaderboard');
    },
    onError: () => Alert.alert('Error', 'Could not place bid.'),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => procurementHubService.withdrawAuctionBid(rfqId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction-bids', rfqId] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
      Alert.alert('Bid Withdrawn', 'Your bid has been withdrawn.');
    },
    onError: () => Alert.alert('Error', 'Could not withdraw bid.'),
  });

  const awardMutation = useMutation({
    mutationFn: (bidId: number) => procurementHubService.awardAuctionBid(rfqId, bidId),
    onSuccess: (bid) => {
      qc.invalidateQueries({ queryKey: ['auction-bids', rfqId] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
      Alert.alert('Auction Awarded', `Awarded to ${bid.supplierName} for ₹${bid.bidAmount.toLocaleString('en-IN')}`);
      router.back();
    },
    onError: () => Alert.alert('Error', 'Could not award auction.'),
  });

  const myBid = bids.find(b => b.isMyBid);
  const auctionOpen = isOpen(auction);
  const savingVsEstimate = auction?.estimatedValue && bids.length > 0
    ? Math.round((1 - bids[0].bidAmount / auction.estimatedValue) * 100)
    : null;

  if (loadingAuction) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color="#7C3AED" size="large" />
      </View>
    );
  }

  if (!auction) {
    return (
      <View style={s.centered}>
        <Text style={{ color: COLORS.textMuted }}>Auction not found</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={auctionOpen ? ['#4C1D95', '#7C3AED'] : ['#374151', '#6B7280']}
          style={s.hero}
        >
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>{auction.title}</Text>
              <Text style={s.heroItem}>📦 {auction.primaryItem}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: auctionOpen ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)' }]}>
              <Text style={s.statusText}>{auctionOpen ? '⚡ LIVE' : '🔒 CLOSED'}</Text>
            </View>
          </View>

          {/* Countdown */}
          <View style={s.countdownBox}>
            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={s.countdownText}>{timeLeft(auction.auctionDeadline)}</Text>
          </View>

          {/* Key stats */}
          <View style={s.heroStats}>
            <HeroStat val={String(bids.length)} label="Bids" />
            <HeroStat
              val={bids.length > 0 ? `₹${bids[0].bidAmount.toLocaleString('en-IN')}` : '—'}
              label="Lowest Bid"
            />
            {savingVsEstimate != null && savingVsEstimate > 0 && (
              <HeroStat val={`${savingVsEstimate}%`} label="Savings" accent />
            )}
            {auction.reservePrice && (
              <HeroStat val={`₹${(auction.reservePrice / 1000).toFixed(0)}K`} label="Reserve" />
            )}
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={s.tabs}>
          {(['leaderboard', 'mybid'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === 'leaderboard' ? '🏆 Leaderboard' : myBid ? '✏️ My Bid' : '➕ Place Bid'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'leaderboard' && (
          <LeaderboardTab
            bids={bids}
            loading={loadingBids}
            auctionOpen={auctionOpen}
            reservePrice={auction.reservePrice}
            estimatedValue={auction.estimatedValue}
            onAward={auctionOpen ? (bidId) => {
              Alert.alert(
                'Award Auction?',
                'This will close the auction and notify the winning supplier.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Award', style: 'default', onPress: () => awardMutation.mutate(bidId) },
                ],
              );
            } : undefined}
          />
        )}

        {tab === 'mybid' && (
          <MyBidTab
            myBid={myBid}
            auctionOpen={auctionOpen}
            bidAmount={bidAmount}
            onBidAmountChange={setBidAmount}
            deliveryDays={deliveryDays}
            onDeliveryDaysChange={setDeliveryDays}
            bidNotes={bidNotes}
            onBidNotesChange={setBidNotes}
            onPlace={() => {
              if (!bidAmount || isNaN(Number(bidAmount)) || Number(bidAmount) <= 0) {
                return Alert.alert('Error', 'Enter a valid bid amount.');
              }
              placeBidMutation.mutate();
            }}
            onWithdraw={() => {
              Alert.alert('Withdraw Bid?', 'Your bid will be removed from the leaderboard.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Withdraw', style: 'destructive', onPress: () => withdrawMutation.mutate() },
              ]);
            }}
            placingBid={placeBidMutation.isPending}
            withdrawingBid={withdrawMutation.isPending}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Leaderboard tab ───────────────────────────────────────────────────────────

function LeaderboardTab({ bids, loading, auctionOpen, reservePrice, estimatedValue, onAward }: {
  bids: AuctionBid[];
  loading: boolean;
  auctionOpen: boolean;
  reservePrice?: number;
  estimatedValue?: number;
  onAward?: (bidId: number) => void;
}) {
  if (loading) return <ActivityIndicator color="#7C3AED" style={{ marginTop: 32 }} />;

  if (bids.length === 0) {
    return (
      <View style={lb.empty}>
        <Text style={lb.emptyIcon}>🔨</Text>
        <Text style={lb.emptyTitle}>No bids yet</Text>
        <Text style={lb.emptySub}>Be the first supplier to place a competitive bid</Text>
      </View>
    );
  }

  return (
    <View style={lb.root}>
      {bids.map((bid, i) => {
        const isLeader = i === 0;
        const aboveReserve = reservePrice != null && bid.bidAmount > reservePrice;
        const savingPct = estimatedValue
          ? Math.round((1 - bid.bidAmount / estimatedValue) * 100)
          : null;

        return (
          <View
            key={bid.id}
            style={[lb.row, isLeader && lb.rowLeader, bid.isMyBid && lb.rowMine]}
          >
            <View style={[lb.rank, isLeader && lb.rankLeader]}>
              <Text style={[lb.rankText, isLeader && lb.rankTextLeader]}>
                {isLeader ? '🥇' : `#${i + 1}`}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={lb.nameRow}>
                <Text style={lb.supplierName}>{bid.supplierName}</Text>
                {bid.isMyBid && <View style={lb.myBadge}><Text style={lb.myBadgeText}>You</Text></View>}
                {aboveReserve && <View style={lb.reserveBadge}><Text style={lb.reserveBadgeText}>↑ Reserve</Text></View>}
              </View>
              <View style={lb.bidMeta}>
                {bid.deliveryDays != null && (
                  <Text style={lb.metaItem}>🚚 {bid.deliveryDays}d delivery</Text>
                )}
                {savingPct != null && savingPct > 0 && (
                  <Text style={[lb.metaItem, { color: '#059669' }]}>🎯 {savingPct}% below estimate</Text>
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[lb.amount, isLeader && lb.amountLeader]}>
                ₹{bid.bidAmount.toLocaleString('en-IN')}
              </Text>
              {onAward && isLeader && !aboveReserve && (
                <TouchableOpacity style={lb.awardBtn} onPress={() => onAward(bid.id)}>
                  <Text style={lb.awardBtnText}>Award</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {onAward && (
        <View style={lb.awardNote}>
          <Ionicons name="information-circle-outline" size={14} color="#7C3AED" />
          <Text style={lb.awardNoteText}>Tap Award on a bid to close the auction and notify the supplier.</Text>
        </View>
      )}
    </View>
  );
}

// ── My Bid tab ────────────────────────────────────────────────────────────────

function MyBidTab({ myBid, auctionOpen, bidAmount, onBidAmountChange, deliveryDays, onDeliveryDaysChange, bidNotes, onBidNotesChange, onPlace, onWithdraw, placingBid, withdrawingBid }: {
  myBid?: AuctionBid;
  auctionOpen: boolean;
  bidAmount: string;
  onBidAmountChange: (v: string) => void;
  deliveryDays: string;
  onDeliveryDaysChange: (v: string) => void;
  bidNotes: string;
  onBidNotesChange: (v: string) => void;
  onPlace: () => void;
  onWithdraw: () => void;
  placingBid: boolean;
  withdrawingBid: boolean;
}) {
  return (
    <View style={mb.root}>
      {/* Current bid status */}
      {myBid && (
        <View style={[mb.currentBid, myBid.rank === 1 && mb.currentBidLeader]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={mb.currentBidLabel}>
              {myBid.rank === 1 ? '🥇 You\'re Leading' : `Your Current Bid — Rank #${myBid.rank}`}
            </Text>
          </View>
          <Text style={mb.currentBidAmount}>₹{myBid.bidAmount.toLocaleString('en-IN')}</Text>
          {myBid.deliveryDays != null && (
            <Text style={mb.currentBidMeta}>🚚 {myBid.deliveryDays} days delivery</Text>
          )}
          {myBid.notes && <Text style={mb.currentBidMeta}>📝 {myBid.notes}</Text>}
        </View>
      )}

      {auctionOpen ? (
        <>
          <View style={mb.card}>
            <Text style={mb.cardTitle}>{myBid ? 'Revise Your Bid' : 'Place a Bid'}</Text>

            {myBid && (
              <View style={mb.tipBox}>
                <Ionicons name="bulb-outline" size={14} color="#D97706" />
                <Text style={mb.tipText}>
                  Your new bid replaces the current one. Compete by bidding lower.
                </Text>
              </View>
            )}

            <Text style={mb.label}>Bid Amount (₹) *</Text>
            <TextInput
              style={mb.input}
              placeholder={myBid ? `Current: ₹${myBid.bidAmount.toLocaleString('en-IN')}` : 'Total amount for the RFQ'}
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={bidAmount}
              onChangeText={onBidAmountChange}
            />

            <Text style={mb.label}>Delivery in (days)</Text>
            <TextInput
              style={mb.input}
              placeholder="e.g., 7"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={deliveryDays}
              onChangeText={onDeliveryDaysChange}
            />

            <Text style={mb.label}>Notes (optional)</Text>
            <TextInput
              style={[mb.input, { height: 72, textAlignVertical: 'top' }]}
              placeholder="Any conditions, GST-inclusive note, warranty, etc."
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={bidNotes}
              onChangeText={onBidNotesChange}
            />

            <TouchableOpacity
              style={[mb.placeBtn, placingBid && { opacity: 0.6 }]}
              onPress={onPlace}
              disabled={placingBid}
            >
              {placingBid
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="hammer-outline" size={16} color="#fff" />
                    <Text style={mb.placeBtnText}>{myBid ? 'Revise Bid' : 'Submit Bid'}</Text>
                  </>}
            </TouchableOpacity>
          </View>

          {myBid && (
            <TouchableOpacity
              style={[mb.withdrawBtn, withdrawingBid && { opacity: 0.6 }]}
              onPress={onWithdraw}
              disabled={withdrawingBid}
            >
              {withdrawingBid
                ? <ActivityIndicator color="#DC2626" size="small" />
                : <Text style={mb.withdrawBtnText}>Withdraw Bid</Text>}
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={mb.closedBox}>
          <Text style={mb.closedIcon}>🔒</Text>
          <Text style={mb.closedTitle}>Auction Closed</Text>
          <Text style={mb.closedSub}>Bidding has ended for this auction.</Text>
        </View>
      )}
    </View>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function HeroStat({ val, label, accent }: { val: string; label: string; accent?: boolean }) {
  return (
    <View style={s.heroStat}>
      <Text style={[s.heroStatVal, accent && { color: '#FDE68A' }]}>{val}</Text>
      <Text style={s.heroStatLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  hero: { padding: 16, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  heroTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroItem: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  countdownBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.md, padding: 10,
  },
  countdownText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  heroStats: { flexDirection: 'row' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: '#F1F5F9',
  },
  tabActive: { backgroundColor: '#F5F3FF' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#7C3AED', fontWeight: '700' },
});

const lb = StyleSheet.create({
  root: { padding: 12, gap: 8 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  rowLeader: { borderColor: '#059669', borderWidth: 1.5, backgroundColor: '#F0FDF4' },
  rowMine: { borderColor: '#7C3AED', borderWidth: 1.5 },
  rank: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  rankLeader: { backgroundColor: '#DCFCE7' },
  rankText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  rankTextLeader: { color: '#059669' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  supplierName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  myBadge: { backgroundColor: '#F5F3FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  myBadgeText: { fontSize: 9, fontWeight: '800', color: '#7C3AED' },
  reserveBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  reserveBadgeText: { fontSize: 9, fontWeight: '700', color: '#D97706' },
  bidMeta: { flexDirection: 'row', gap: 8, marginTop: 3 },
  metaItem: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  amount: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  amountLeader: { color: '#059669' },
  awardBtn: {
    backgroundColor: '#DCFCE7', borderRadius: 8, borderWidth: 1, borderColor: '#86EFAC',
    paddingHorizontal: 10, paddingVertical: 5,
  },
  awardBtnText: { fontSize: 11, fontWeight: '800', color: '#065F46' },
  awardNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.md, padding: 10, marginTop: 4,
  },
  awardNoteText: { flex: 1, fontSize: 11, color: '#5B21B6', lineHeight: 16 },
});

const mb = StyleSheet.create({
  root: { padding: 12, gap: 12 },
  currentBid: {
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1.5, borderColor: '#C4B5FD', gap: 4,
  },
  currentBidLeader: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  currentBidLabel: { fontSize: 12, fontWeight: '800', color: '#5B21B6' },
  currentBidAmount: { fontSize: 22, fontWeight: '900', color: '#4C1D95' },
  currentBidMeta: { fontSize: 11, color: '#7C3AED' },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  tipBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.md, padding: 8,
  },
  tipText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569' },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: COLORS.text, backgroundColor: '#F8FAFC',
  },
  placeBtn: {
    backgroundColor: '#7C3AED', borderRadius: RADIUS.md, height: 48,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  placeBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  withdrawBtn: {
    borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: RADIUS.md, height: 44,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2',
  },
  withdrawBtnText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  closedBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
  closedIcon: { fontSize: 36 },
  closedTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  closedSub: { fontSize: 12, color: COLORS.textMuted },
});
