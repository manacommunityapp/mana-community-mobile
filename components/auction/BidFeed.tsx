import { useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ListRenderItemInfo } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import type { BidDto } from '@/types/api';
import { COLORS } from '@/constants/config';

interface BidFeedProps {
  bids:          BidDto[];
  currentUserId: number;
  maxVisible?:   number;
}

function BidRow({ bid, isMine }: { bid: BidDto; isMine: boolean }) {
  return (
    <View style={[r.row, isMine && r.rowMine]}>
      {/* Avatar */}
      <View style={[r.avatar, isMine && r.avatarMine]}>
        <Text style={r.avatarText}>{bid.bidderName[0]?.toUpperCase()}</Text>
      </View>

      <View style={r.body}>
        <View style={r.top}>
          <Text style={[r.name, isMine && r.nameMine]} numberOfLines={1}>
            {isMine ? 'You' : bid.bidderName}
            {bid.bidderFlat ? ` · ${bid.bidderFlat}` : ''}
          </Text>
          <Text style={r.time}>
            {formatDistanceToNow(new Date(bid.createdAt), { addSuffix: false })}
          </Text>
        </View>
        <View style={r.amountRow}>
          <Text style={[r.amount, isMine && r.amountMine]}>
            ₹{bid.amount.toLocaleString('en-IN')}
          </Text>
          {bid.isWinning && (
            <View style={r.winningBadge}>
              <Text style={r.winningText}>🏆 Highest</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const r = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, gap: 10 },
  rowMine:      { backgroundColor: '#EEF2FF' },
  avatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.textMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarMine:   { backgroundColor: COLORS.primary },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  body:         { flex: 1, gap: 2 },
  top:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name:         { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  nameMine:     { color: COLORS.primary },
  time:         { fontSize: 11, color: COLORS.textMuted },
  amountRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount:       { fontSize: 16, fontWeight: '800', color: COLORS.text },
  amountMine:   { color: COLORS.primary },
  winningBadge: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  winningText:  { fontSize: 11, fontWeight: '700', color: '#92400E' },
});

// ── Feed container ─────────────────────────────────────────────
export function BidFeed({ bids, currentUserId, maxVisible = 50 }: BidFeedProps) {
  const listRef = useRef<FlatList<BidDto>>(null);

  // Auto-scroll to latest bid (bottom of list — reversed)
  useEffect(() => {
    if (bids.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [bids.length]);

  const visible = bids.slice(-maxVisible);

  if (visible.length === 0) {
    return (
      <View style={f.empty}>
        <Text style={f.emptyEmoji}>🔨</Text>
        <Text style={f.emptyText}>No bids yet — be the first!</Text>
      </View>
    );
  }

  const renderItem = ({ item }: ListRenderItemInfo<BidDto>) => (
    <BidRow bid={item} isMine={item.bidderId === currentUserId} />
  );

  return (
    <View style={f.container}>
      <View style={f.header}>
        <Text style={f.headerTitle}>Bid History</Text>
        <Text style={f.headerCount}>{bids.length} bid{bids.length !== 1 ? 's' : ''}</Text>
      </View>
      <FlatList
        ref={listRef}
        data={visible}
        keyExtractor={(b) => String(b.id)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}          // parent ScrollView handles scroll
        ItemSeparatorComponent={() => <View style={f.sep} />}
      />
    </View>
  );
}

const f = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  headerCount: { fontSize: 13, color: COLORS.textMuted },
  sep:       { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
  empty:     { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji:{ fontSize: 36 },
  emptyText: { fontSize: 14, color: COLORS.textMuted },
});
