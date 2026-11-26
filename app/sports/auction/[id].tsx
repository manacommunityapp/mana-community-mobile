import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

export default function SportsAuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user, isAnyAdmin, hasRole } = useAuth();
  const configId = Number(id);
  const qc = useQueryClient();

  const isAuctionAdmin = Boolean(
    isAnyAdmin ||
    hasRole?.('ADMIN', 'SUPER_ADMIN', 'COMMUNITY_ADMIN', 'SPORTS_ADMIN') ||
    user?.role?.toUpperCase().includes('ADMIN') ||
    user?.role === 'SPORTS_ADMIN'
  );

  const [tab, setTab]                       = useState<Tab>('live');
  const [bidding, setBidding]               = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const { data: baseData, isLoading: loading, refetch } = useQuery({
    queryKey: ['auction-detail', configId],
    queryFn: async () => {
      const [cfg, st, pl, tm, myTeams] = await Promise.all([
        sportsAuctionService.getConfig(configId).catch(() => null),
        sportsAuctionService.getStats(configId),
        sportsAuctionService.getPlayers(configId),
        sportsAuctionService.getTeams(configId),
        sportsAuctionService.getMyCaptainRegistrations(),
      ]);
      return {
        config: cfg,
        stats: st,
        players: pl,
        teams: tm,
        myTeam: myTeams.find((t) => t.configId === configId) ?? null,
      };
    },
    enabled: !!configId,
  });

  const config  = baseData?.config ?? null;
  const stats   = baseData?.stats ?? null;
  const players = baseData?.players ?? [];
  const teams   = baseData?.teams ?? [];
  const myTeam  = baseData?.myTeam ?? null;

  const isCaptain = Boolean(myTeam);
  const isAuthorizedBidder = isAuctionAdmin || isCaptain;

  const activeTeam: SportsAuctionTeamResponse | null =
    myTeam ??
    teams.find((t) => t.id === selectedTeamId) ??
    (isAuctionAdmin && teams.length > 0 ? teams[0] : null);

  const isLive = config?.status === 'LIVE' || config?.status === 'ACTIVE';

  const { data: current = null } = useQuery({
    queryKey: ['auction-current-player', configId],
    queryFn: () => sportsAuctionService.getCurrentPlayer(configId),
    enabled: !!configId,
    refetchInterval: isLive ? 2000 : 8000,
  });

  const nextBid = (current?.nextBid && current.nextBid > (current.currentBid ?? 0))
    ? current.nextBid
    : current?.player
    ? computeNextBid(current.currentBid, current.player.basePrice, config)
    : 0;

  const isAlreadyHighestBidder = Boolean(
    activeTeam && (current?.currentBidTeamName || current?.currentTeamName) &&
    ((current.currentBidTeamName ?? current.currentTeamName) === activeTeam.teamName ||
     (current.bids && current.bids.length > 0 && current.bids[0].teamId === activeTeam.id))
  );

  const hasEnoughBudget = activeTeam
    ? (activeTeam.remainingBudget == null || activeTeam.remainingBudget >= nextBid)
    : true;

  const playerStatus = current?.status ?? current?.player?.status;
  const isSold = playerStatus === 'SOLD';
  const isUnsold = playerStatus === 'UNSOLD' || playerStatus === 'PASSED';
  const isPlayerAvailable = current?.player != null && !isSold && !isUnsold;

  const canBid = isLive && isAuthorizedBidder && !!activeTeam && isPlayerAvailable && !isAlreadyHighestBidder && hasEnoughBudget;

  async function handleBid() {
    if (!current?.player || !activeTeam || !canBid) return;
    const confirmMessage = isAuctionAdmin && !isCaptain
      ? `Place bid of ₹${nextBid.toLocaleString()} for ${current.player.playerName} on behalf of ${activeTeam.teamName}?`
      : `Place bid of ₹${nextBid.toLocaleString()} for ${current.player.playerName}?`;

    Alert.alert(
      'Confirm Bid',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Bid ₹${nextBid.toLocaleString()}`,
          style: 'default',
          onPress: async () => {
            setBidding(true);
            try {
              await sportsAuctionService.placeBid(configId, current.player.id, nextBid, activeTeam.id);
              qc.invalidateQueries({ queryKey: ['auction-current-player', configId] });
              qc.invalidateQueries({ queryKey: ['auction-detail', configId] });
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

  async function handleNextPlayer() {
    try {
      await sportsAuctionService.nextPlayer(configId);
      qc.invalidateQueries({ queryKey: ['auction-current-player', configId] });
      qc.invalidateQueries({ queryKey: ['auction-detail', configId] });
    } catch (e: any) {
      Alert.alert('Stage Action', e?.message || 'Could not advance to next player');
    }
  }

  async function handleMarkSold() {
    if (!current?.player) return;
    const winningTeam = teams.find(t => t.teamName === current.currentTeamName) ||
      (current.bids && current.bids.length > 0 ? teams.find(t => t.id === current.bids[0].teamId) : null);
    if (!winningTeam || !current.currentBid) {
      Alert.alert('Cannot Sell', 'No active bids have been placed on this player yet.');
      return;
    }
    Alert.alert(
      'Hammer Down: Sell Player',
      `Confirm sale of ${current.player.playerName} to ${winningTeam.teamName} for ₹${current.currentBid.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Sale',
          style: 'default',
          onPress: async () => {
            try {
              await sportsAuctionService.markSold(configId, current.player.id, winningTeam.id);
              qc.invalidateQueries({ queryKey: ['auction-current-player', configId] });
              qc.invalidateQueries({ queryKey: ['auction-detail', configId] });
            } catch (e: any) {
              Alert.alert('Sale Error', e?.message || 'Could not complete sale');
            }
          },
        },
      ]
    );
  }

  async function handlePassUnsold() {
    if (!current?.player) return;
    Alert.alert(
      'Pass as Unsold',
      `Pass ${current.player.playerName} as Unsold? Player can return in later rounds.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pass Unsold',
          style: 'destructive',
          onPress: async () => {
            try {
              await sportsAuctionService.passUnsold(configId, current.player.id);
              qc.invalidateQueries({ queryKey: ['auction-current-player', configId] });
              qc.invalidateQueries({ queryKey: ['auction-detail', configId] });
            } catch (e: any) {
              Alert.alert('Action Error', e?.message || 'Could not pass player');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

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
          <StatBit label="Queued"    value={stats.queuedPlayers ?? stats.remainingPlayers ?? 0} />
          <StatBit label="Unsold"    value={stats.unsoldPlayers ?? 0} />
          <StatBit label="Spent"     value={formatBudgetAmount(stats.totalSpent ?? stats.totalAmountSpent ?? 0)} />
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
          activeTeam={activeTeam}
          isAuctionAdmin={isAuctionAdmin}
          isCaptain={isCaptain}
          isAuthorizedBidder={isAuthorizedBidder}
          isAlreadyHighestBidder={isAlreadyHighestBidder}
          hasEnoughBudget={hasEnoughBudget}
          isSold={isSold}
          isUnsold={isUnsold}
          onOpenTeamPicker={() => setShowTeamPicker(true)}
          onBid={handleBid}
          onNextPlayer={handleNextPlayer}
          onMarkSold={handleMarkSold}
          onPassUnsold={handlePassUnsold}
        />
      )}
      {tab === 'players' && <PlayersTab players={players} />}
      {tab === 'teams'   && <TeamsTab   teams={teams} budgetPerTeam={config?.budgetPerTeam ?? 0} />}

      {/* Team Picker Modal for Admins */}
      <Modal visible={showTeamPicker} transparent animationType="fade" onRequestClose={() => setShowTeamPicker(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowTeamPicker(false)}>
          <View style={s.teamPickerSheet}>
            <View style={s.teamPickerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="shield-checkmark" size={16} color="#F59E0B" />
                <Text style={s.teamPickerTitle}>Select Bidding Team</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTeamPicker(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {teams.length === 0 ? (
                <Text style={s.emptyText}>No teams registered yet</Text>
              ) : (
                teams.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.teamPickItem, activeTeam?.id === t.id && s.teamPickItemActive]}
                    onPress={() => {
                      setSelectedTeamId(t.id);
                      setShowTeamPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.teamPickName, activeTeam?.id === t.id && s.teamPickNameActive]}>
                        {t.teamName}
                      </Text>
                      <Text style={s.teamPickMeta}>
                        Budget Left: ₹{(t.remainingBudget ?? 0).toLocaleString()} · Spent: ₹{(t.spent ?? 0).toLocaleString()}
                      </Text>
                    </View>
                    {activeTeam?.id === t.id && (
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Live tab ───────────────────────────────────────────────────

function LiveTab({
  isLive, current, canBid, bidding, nextBid, activeTeam,
  isAuctionAdmin, isCaptain, isAuthorizedBidder,
  isAlreadyHighestBidder, hasEnoughBudget, isSold, isUnsold,
  onOpenTeamPicker, onBid, onNextPlayer, onMarkSold, onPassUnsold,
}: {
  isLive: boolean;
  current: PlayerWithBidResponse | null;
  canBid: boolean;
  bidding: boolean;
  nextBid: number;
  activeTeam: SportsAuctionTeamResponse | null;
  isAuctionAdmin: boolean;
  isCaptain: boolean;
  isAuthorizedBidder: boolean;
  isAlreadyHighestBidder: boolean;
  hasEnoughBudget: boolean;
  isSold: boolean;
  isUnsold: boolean;
  onOpenTeamPicker: () => void;
  onBid: () => void;
  onNextPlayer: () => void;
  onMarkSold: () => void;
  onPassUnsold: () => void;
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
        {isAuctionAdmin && (
          <TouchableOpacity style={s.conductorMainBtn} onPress={onNextPlayer} activeOpacity={0.85}>
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={s.conductorMainBtnText}>Bring Next Player to Block</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  const p = current.player;
  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 32 }}>
      {/* Player on block */}
      <View style={s.playerCard}>
        {/* Role & team banner */}
        {isAuctionAdmin && (
          <View style={s.bidderBanner}>
            <View style={s.adminRoleBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#92400E" />
              <Text style={s.adminRoleText}>ADMIN BIDDER</Text>
            </View>
            <TouchableOpacity
              style={s.teamPickerTrigger}
              onPress={onOpenTeamPicker}
              activeOpacity={0.8}
            >
              <Text style={s.teamPickerTriggerText} numberOfLines={1}>
                {activeTeam?.teamName ? `Team: ${activeTeam.teamName} ▾` : 'Select Team ▾'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isCaptain && !isAuctionAdmin && activeTeam && (
          <View style={s.bidderBanner}>
            <View style={s.captainRoleBadge}>
              <Ionicons name="ribbon" size={12} color="#065F46" />
              <Text style={s.captainRoleText}>Captain: {activeTeam.teamName}</Text>
            </View>
            <Text style={{ fontSize: 11, color: COLORS.textMuted }}>
              Purse: ₹{(activeTeam.remainingBudget ?? 0).toLocaleString()}
            </Text>
          </View>
        )}

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
            <Text style={s.bidLabel}>{current.currentBid ? 'Current Bid' : 'Base Price'}</Text>
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

          {isAuthorizedBidder && isAlreadyHighestBidder && !isSold && !isUnsold && (
            <View style={s.holdingBidBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={s.holdingBidText}>Highest Bidder</Text>
            </View>
          )}

          {isAuthorizedBidder && !hasEnoughBudget && !isAlreadyHighestBidder && !isSold && !isUnsold && (
            <View style={s.insufficientBudgetBadge}>
              <Ionicons name="alert-circle" size={13} color="#DC2626" />
              <Text style={s.insufficientBudgetText}>Purse Exceeded</Text>
            </View>
          )}
        </View>

        {isSold && (
          <View style={s.soldBanner}>
            <Ionicons name="checkmark-done-circle" size={16} color="#059669" />
            <Text style={s.soldBannerText}>
              SOLD to {p.assignedTeamName || current.currentTeamName || 'Winning Team'} for ₹{(p.soldPrice || current.currentBid || 0).toLocaleString()}
            </Text>
          </View>
        )}

        {isUnsold && (
          <View style={s.unsoldBanner}>
            <Ionicons name="close-circle" size={16} color="#DC2626" />
            <Text style={s.unsoldBannerText}>Player Unsold / Passed</Text>
          </View>
        )}

        {!isAuthorizedBidder && isLive && (
          <View style={s.restrictedBox}>
            <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} />
            <Text style={s.restrictedText}>
              Bidding is restricted to Team Captains and Admins (ADMIN, COMMUNITY_ADMIN, SPORTS_ADMIN).
            </Text>
          </View>
        )}

        {isAuthorizedBidder && !activeTeam && isLive && (
          <Text style={s.noTeamNote}>No teams available in this auction to place bids.</Text>
        )}
      </View>

      {/* Auctioneer Stage Controls for Admins */}
      {isAuctionAdmin && isLive && (
        <View style={s.conductorCard}>
          <View style={s.conductorCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="hammer" size={14} color="#7C3AED" />
              <Text style={s.conductorCardTitle}>AUCTIONEER STAGE CONTROLS</Text>
            </View>
            <Text style={s.conductorCardSub}>Mobile Conductor</Text>
          </View>
          <View style={s.conductorBtnRow}>
            {!isSold && !isUnsold && current.currentBid != null && (
              <TouchableOpacity style={s.hammerSellBtn} onPress={onMarkSold} activeOpacity={0.85}>
                <Ionicons name="checkmark-done" size={14} color="#fff" />
                <Text style={s.hammerSellBtnText}>Hammer Down (Sell)</Text>
              </TouchableOpacity>
            )}
            {!isSold && !isUnsold && current.currentBid == null && (
              <TouchableOpacity style={s.passUnsoldBtn} onPress={onPassUnsold} activeOpacity={0.85}>
                <Ionicons name="close" size={14} color="#DC2626" />
                <Text style={s.passUnsoldBtnText}>Pass Unsold</Text>
              </TouchableOpacity>
            )}
            {(isSold || isUnsold) && (
              <TouchableOpacity style={s.nextPlayerBtn} onPress={onNextPlayer} activeOpacity={0.85}>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
                <Text style={s.nextPlayerBtnText}>Next Player →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

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
  QUEUED:    '#2563EB',
  AVAILABLE: '#16a34a',
  SELLING:   '#f59e0b',
  ON_BLOCK:  '#f59e0b',
  SOLD:      '#059669',
  PASSED:    '#DC2626',
  UNSOLD:    '#DC2626',
  RETAINED:  '#7C3AED',
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

function formatBudgetAmount(raw?: number | null): string {
  if (!raw || raw <= 0) return '₹0';
  if (raw >= 10000000) return `₹${(raw / 10000000).toFixed(1)}Cr`;
  if (raw >= 100000) return `₹${(raw / 100000).toFixed(1)}L`;
  if (raw >= 1000) return `₹${Math.round(raw / 1000)}K`;
  return `₹${raw.toLocaleString()}`;
}

function computeNextBid(
  currentBid: number | null | undefined,
  basePrice: number | null | undefined,
  config: SportsAuctionConfigResponse | null,
): number {
  const base = basePrice && basePrice > 0 ? basePrice : (config?.basePrice ?? 100);
  if (currentBid == null || currentBid <= 0) {
    return base;
  }
  const defaultInc = config?.bidIncrementDefault || 100;
  const threshold = config?.bidIncrementThreshold || 0;
  const aboveInc = config?.bidIncrementAbove || defaultInc;
  const increment = (threshold > 0 && currentBid >= threshold) ? aboveInc : defaultInc;
  return currentBid + increment;
}

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
  holdingBidBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#A7F3D0' },
  holdingBidText: { fontSize: 12, fontWeight: '700', color: '#065F46' },
  insufficientBudgetBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#FECACA' },
  insufficientBudgetText: { fontSize: 12, fontWeight: '700', color: '#991B1B' },
  soldBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', borderRadius: RADIUS.sm, padding: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  soldBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: '#065F46' },
  unsoldBanner:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', borderRadius: RADIUS.sm, padding: 10, borderWidth: 1, borderColor: '#FECACA' },
  unsoldBannerText:{ flex: 1, fontSize: 12, fontWeight: '700', color: '#991B1B' },
  noTeamNote:     { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  bidderBanner:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  adminRoleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  adminRoleText:  { fontSize: 10, fontWeight: '800', color: '#92400E', letterSpacing: 0.5 },
  captainRoleBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  captainRoleText:{ fontSize: 11, fontWeight: '700', color: '#065F46' },
  teamPickerTrigger: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, maxWidth: '55%' },
  teamPickerTriggerText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  restrictedBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', borderRadius: RADIUS.sm, padding: 10, marginTop: 4 },
  restrictedText: { flex: 1, fontSize: 11, color: COLORS.textMuted, lineHeight: 15 },
  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  teamPickerSheet:{ backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 32, gap: 12 },
  teamPickerHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  teamPickerTitle:{ fontSize: 15, fontWeight: '700', color: COLORS.text },
  teamPickItem:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  teamPickItemActive:{ backgroundColor: '#EEF2FF' },
  teamPickName:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  teamPickNameActive:{ color: COLORS.primary },
  teamPickMeta:   { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  section:        { gap: 6 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  bidHistoryRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: COLORS.border },
  bidHistoryTeam: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  bidHistoryAmt:  { fontSize: 13, fontWeight: '700', color: COLORS.text },
  rtmBadge:       { backgroundColor: '#fef3c7', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  rtmText:        { fontSize: 9, fontWeight: '900', color: '#92400e', letterSpacing: 0.5 },
  conductorCard:  {
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: '#DDD6FE', gap: 10, ...SHADOWS.xs,
  },
  conductorCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  conductorCardTitle: { fontSize: 11, fontWeight: '800', color: '#6D28D9', letterSpacing: 0.5 },
  conductorCardSub: { fontSize: 10, color: '#7C3AED', fontWeight: '600' },
  conductorBtnRow: { flexDirection: 'row', gap: 8 },
  hammerSellBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#059669', paddingVertical: 10, borderRadius: RADIUS.sm,
  },
  hammerSellBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  passUnsoldBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
    paddingVertical: 10, borderRadius: RADIUS.sm,
  },
  passUnsoldBtnText: { color: '#DC2626', fontSize: 12, fontWeight: '700' },
  nextPlayerBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#6D28D9', paddingVertical: 10, borderRadius: RADIUS.sm,
  },
  nextPlayerBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  conductorMainBtn:{
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#6D28D9', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: RADIUS.md, marginTop: 8,
  },
  conductorMainBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
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
