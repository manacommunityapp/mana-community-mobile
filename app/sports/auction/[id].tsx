import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { sportsAuctionService } from '@/services/sportsAuctionService';
import type {
  SportsAuctionConfigResponse,
  SportsAuctionPlayerResponse,
  SportsAuctionTeamResponse,
  SportsAuctionStatsResponse,
  PlayerWithBidResponse,
} from '@/types/api';

type Tab = 'live' | 'players' | 'teams';
const POLL_MS = 4000;

export default function SportsAuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const configId = Number(id);

  const [config, setConfig]   = useState<SportsAuctionConfigResponse | null>(null);
  const [stats, setStats]     = useState<SportsAuctionStatsResponse | null>(null);
  const [current, setCurrent] = useState<PlayerWithBidResponse | null>(null);
  const [players, setPlayers] = useState<SportsAuctionPlayerResponse[]>([]);
  const [teams, setTeams]     = useState<SportsAuctionTeamResponse[]>([]);
  const [myTeam, setMyTeam]   = useState<SportsAuctionTeamResponse | null>(null);
  const [tab, setTab]         = useState<Tab>('live');
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadBase = useCallback(async () => {
    const [cfg, st, pl, tm, myTeams] = await Promise.all([
      sportsAuctionService.getConfig(configId).catch(() => null),
      sportsAuctionService.getStats(configId),
      sportsAuctionService.getPlayers(configId),
      sportsAuctionService.getTeams(configId),
      sportsAuctionService.getMyCaptainRegistrations(),
    ]);
    if (cfg) setConfig(cfg);
    setStats(st);
    setPlayers(pl);
    setTeams(tm);
    const mine = myTeams.find((t) => t.configId === configId) ?? null;
    setMyTeam(mine);
    setLoading(false);
  }, [configId]);

  const pollCurrent = useCallback(async () => {
    const c = await sportsAuctionService.getCurrentPlayer(configId);
    setCurrent(c);
  }, [configId]);

  useEffect(() => {
    loadBase();
    pollCurrent();
    pollRef.current = setInterval(pollCurrent, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadBase, pollCurrent]);

  async function handleBid() {
    if (!current?.player || !myTeam) return;
    const nextBid = (current.currentBid ?? current.player.basePrice ?? 0) + (config?.bidIncrementDefault ?? 100);
    Alert.alert(
      'Confirm Bid',
      `Place bid of ₹${nextBid.toLocaleString()} for ${current.player.playerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Bid ₹${nextBid.toLocaleString()}`,
          style: 'default',
          onPress: async () => {
            setBidding(true);
            try {
              await sportsAuctionService.placeBid(configId, current.player.id, nextBid, myTeam.id);
              await pollCurrent();
            } catch (e: any) {
              Alert.alert('Bid Failed', e?.message ?? 'Please try again.');
            } finally {
              setBidding(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  const isLive    = config?.status === 'LIVE';
  const canBid    = isLive && !!myTeam && !!current?.player;
  const nextBid   = current ? (current.currentBid ?? current.player.basePrice ?? 0) + (config?.bidIncrementDefault ?? 100) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text style={s.title} numberOfLines={1}>{config?.eventName ?? 'Auction'}</Text>
          <Text style={s.subtitle}>{config?.sportName} · {config?.seasonName}</Text>
        </View>
        {isLive && (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Stats bar */}
      {stats && (
        <View style={s.statsBar}>
          <StatBit label="Sold"      value={stats.soldPlayers} />
          <StatBit label="Left"      value={stats.remainingPlayers} />
          <StatBit label="Unsold"    value={stats.unsoldPlayers} />
          <StatBit label="Spent"     value={`₹${(stats.totalAmountSpent / 100).toFixed(0)}L`} />
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['live', 'players', 'teams'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'live' ? 'Live' : t === 'players' ? `Players (${players.length})` : `Teams (${teams.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'live' && (
        <LiveTab
          isLive={isLive}
          current={current}
          canBid={canBid}
          bidding={bidding}
          nextBid={nextBid}
          myTeam={myTeam}
          onBid={handleBid}
        />
      )}
      {tab === 'players' && <PlayersTab players={players} />}
      {tab === 'teams'   && <TeamsTab   teams={teams} budgetPerTeam={config?.budgetPerTeam ?? 0} />}
    </SafeAreaView>
  );
}

// ── Live tab ───────────────────────────────────────────────────

function LiveTab({
  isLive, current, canBid, bidding, nextBid, myTeam, onBid,
}: {
  isLive: boolean;
  current: PlayerWithBidResponse | null;
  canBid: boolean;
  bidding: boolean;
  nextBid: number;
  myTeam: SportsAuctionTeamResponse | null;
  onBid: () => void;
}) {
  if (!isLive) {
    return (
      <View style={s.offlineWrap}>
        <Ionicons name="timer-outline" size={44} color={COLORS.textMuted} />
        <Text style={s.offlineTitle}>Auction not live yet</Text>
        <Text style={s.offlineSub}>Live bidding will appear here once the auction starts.</Text>
      </View>
    );
  }
  if (!current?.player) {
    return (
      <View style={s.offlineWrap}>
        <Ionicons name="hourglass-outline" size={44} color={COLORS.textMuted} />
        <Text style={s.offlineTitle}>Waiting for next player…</Text>
      </View>
    );
  }
  const p = current.player;
  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 32 }}>
      {/* Player on block */}
      <View style={s.playerCard}>
        <View style={s.playerCardHeader}>
          <View style={s.playerAvatar}>
            <Text style={s.playerInitial}>{p.playerName?.[0] ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.playerName}>{p.playerName}</Text>
            <Text style={s.playerMeta}>{p.playerRole ?? '—'}  ·  {p.category ?? '—'}</Text>
          </View>
          <View style={s.baseChip}>
            <Text style={s.baseChipText}>Base ₹{(p.basePrice ?? 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Current high bid */}
        <View style={s.bidRow}>
          <View>
            <Text style={s.bidLabel}>Current Bid</Text>
            <Text style={s.bidAmount}>₹{(current.currentBid ?? p.basePrice ?? 0).toLocaleString()}</Text>
            {current.currentTeamName && (
              <Text style={s.bidTeam}>{current.currentTeamName}</Text>
            )}
          </View>
          {canBid && (
            <TouchableOpacity
              style={[s.bidBtn, bidding && s.bidBtnDisabled]}
              onPress={onBid}
              disabled={bidding}
            >
              {bidding
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.bidBtnText}>Bid ₹{nextBid.toLocaleString()}</Text>}
            </TouchableOpacity>
          )}
        </View>

        {!myTeam && isLive && (
          <Text style={s.noTeamNote}>Register as captain to place bids</Text>
        )}
      </View>

      {/* Bid history */}
      {current.bids.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Bid History</Text>
          {current.bids.map((bid) => (
            <View key={bid.id} style={s.bidHistoryRow}>
              <Text style={s.bidHistoryTeam}>{bid.teamName}</Text>
              {bid.isRtm && <View style={s.rtmBadge}><Text style={s.rtmText}>RTM</Text></View>}
              <Text style={s.bidHistoryAmt}>₹{bid.bidAmount.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Players tab ────────────────────────────────────────────────

const PLAYER_STATUS_COLOR: Record<string, string> = {
  AVAILABLE: COLORS.success ?? '#16a34a',
  ON_BLOCK:  '#f59e0b',
  SOLD:      '#6b7280',
  UNSOLD:    '#9ca3af',
};

function PlayersTab({ players }: { players: SportsAuctionPlayerResponse[] }) {
  return (
    <FlatList
      data={players}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 32 }}
      renderItem={({ item: p }) => (
        <View style={s.playerRow}>
          <View style={s.playerRowLeft}>
            <View style={[s.playerDot, { backgroundColor: PLAYER_STATUS_COLOR[p.status] ?? '#9ca3af' }]} />
            <View>
              <Text style={s.playerRowName}>{p.playerName}</Text>
              <Text style={s.playerRowMeta}>{p.playerRole ?? '—'}  ·  {p.category ?? '—'}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            {p.soldPrice
              ? <Text style={s.soldPrice}>₹{p.soldPrice.toLocaleString()}</Text>
              : <Text style={s.basePriceSmall}>₹{(p.basePrice ?? 0).toLocaleString()}</Text>}
            {p.assignedTeamName && <Text style={s.assignedTeam}>{p.assignedTeamName}</Text>}
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={s.emptyText}>No players listed yet</Text>}
    />
  );
}

// ── Teams tab ──────────────────────────────────────────────────

function TeamsTab({ teams, budgetPerTeam }: { teams: SportsAuctionTeamResponse[]; budgetPerTeam: number }) {
  const sorted = [...teams].sort((a, b) => b.spent - a.spent);
  return (
    <FlatList
      data={sorted}
      keyExtractor={(t) => String(t.id)}
      contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 32 }}
      renderItem={({ item: t }) => {
        const usedPct = budgetPerTeam > 0 ? (t.spent / budgetPerTeam) * 100 : 0;
        return (
          <View style={s.teamCard}>
            <View style={s.teamCardHeader}>
              <View style={[s.teamColorDot, { backgroundColor: t.colorHex ?? COLORS.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.teamName}>{t.teamName}</Text>
                <Text style={s.teamOwner}>{t.ownerName}</Text>
              </View>
              <Text style={s.teamBudget}>₹{(t.remainingBudget).toLocaleString()} left</Text>
            </View>
            <View style={s.budgetBar}>
              <View style={[s.budgetFill, { width: `${Math.min(usedPct, 100)}%`, backgroundColor: t.colorHex ?? COLORS.primary }]} />
            </View>
            <Text style={s.budgetMeta}>Spent ₹{t.spent.toLocaleString()} of ₹{budgetPerTeam.toLocaleString()}</Text>
          </View>
        );
      }}
      ListEmptyComponent={<Text style={s.emptyText}>No teams registered yet</Text>}
    />
  );
}

// ── Helpers ────────────────────────────────────────────────────

function StatBit({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={s.statBit}>
      <Text style={s.statBitValue}>{value}</Text>
      <Text style={s.statBitLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background },
  topBar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  back:           { fontSize: 28, color: COLORS.primary, lineHeight: 32, width: 32 },
  title:          { fontSize: 15, fontWeight: '700', color: COLORS.text },
  subtitle:       { fontSize: 11, color: COLORS.textMuted },
  liveBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dc2626', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveText:       { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  statsBar:       { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderColor: COLORS.border },
  statBit:        { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statBitValue:   { fontSize: 14, fontWeight: '800', color: COLORS.text },
  statBitLabel:   { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  tabRow:         { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tab:            { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText:        { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive:  { color: COLORS.primary },

  // Live tab
  playerCard:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, ...SHADOWS.sm, gap: 14 },
  playerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerAvatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  playerInitial:  { fontSize: 20, fontWeight: '900', color: '#fff' },
  playerName:     { fontSize: 17, fontWeight: '800', color: COLORS.text },
  playerMeta:     { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  baseChip:       { backgroundColor: COLORS.background, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  baseChipText:   { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  bidRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bidLabel:       { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  bidAmount:      { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  bidTeam:        { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  bidBtn:         { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 12 },
  bidBtnDisabled: { opacity: 0.5 },
  bidBtnText:     { color: '#fff', fontWeight: '800', fontSize: 14 },
  noTeamNote:     { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  section:        { gap: 6 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  bidHistoryRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: COLORS.border },
  bidHistoryTeam: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  bidHistoryAmt:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  rtmBadge:       { backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  rtmText:        { fontSize: 9, fontWeight: '900', color: '#92400e', letterSpacing: 0.5 },
  offlineWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  offlineTitle:   { fontSize: 17, fontWeight: '800', color: COLORS.text },
  offlineSub:     { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  // Players tab
  playerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: 12, ...SHADOWS.xs },
  playerRowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  playerDot:      { width: 8, height: 8, borderRadius: 4 },
  playerRowName:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  playerRowMeta:  { fontSize: 11, color: COLORS.textMuted },
  soldPrice:      { fontSize: 13, fontWeight: '800', color: COLORS.text },
  basePriceSmall: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  assignedTeam:   { fontSize: 10, color: COLORS.textMuted },

  // Teams tab
  teamCard:       { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, ...SHADOWS.xs, gap: 8 },
  teamCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamColorDot:   { width: 12, height: 12, borderRadius: 6 },
  teamName:       { fontSize: 14, fontWeight: '700', color: COLORS.text },
  teamOwner:      { fontSize: 11, color: COLORS.textMuted },
  teamBudget:     { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  budgetBar:      { height: 5, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  budgetFill:     { height: '100%', borderRadius: 3 },
  budgetMeta:     { fontSize: 10, color: COLORS.textMuted },

  emptyText:      { textAlign: 'center', color: COLORS.textMuted, fontSize: 13, paddingTop: 32 },
});
