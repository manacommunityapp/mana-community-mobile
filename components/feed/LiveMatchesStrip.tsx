import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { useAppTheme } from '@/context/ThemeContext';
import { sportsService, type FeedLiveMatch } from '@/services/sportsService';

const MAX_CARDS = 6;

function getSportEmoji(sport?: string | null): string {
  if (!sport) return '🏆';
  const s = sport.toLowerCase();
  if (s.includes('cricket')) return '🏏';
  if (s.includes('badminton')) return '🏸';
  if (s.includes('football') || s.includes('soccer')) return '⚽';
  if (s.includes('tennis')) return '🎾';
  if (s.includes('table tennis') || s.includes('tt') || s.includes('ping pong')) return '🏓';
  if (s.includes('basketball')) return '🏀';
  if (s.includes('volleyball')) return '🏐';
  if (s.includes('carrom')) return '🎯';
  if (s.includes('chess')) return '♟️';
  if (s.includes('pickleball')) return '🏓';
  if (s.includes('swimming')) return '🏊';
  return '🏆';
}

function getRoundStageLabel(roundName?: string | null): string | null {
  if (!roundName?.trim()) return null;
  const value = roundName.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (/THIRD_PLACE|3RD_PLACE/.test(value)) return '3RD PLACE';
  if (/(^|_)GRAND_FINAL($|_)/.test(value)) return 'GRAND FINAL';
  if (/(^|_)SUPER_FINAL($|_)/.test(value)) return 'SUPER FINAL';
  if (/(^|_)ELIMINATOR($|_)/.test(value)) return 'ELIMINATOR';
  const qualifierMatch = value.match(/(^|_)QUALIFIER_?(\d)?($|_)/);
  if (qualifierMatch) return qualifierMatch[2] ? `QUALIFIER ${qualifierMatch[2]}` : 'QUALIFIER';
  if (/SEMI.?FINAL|(^|_)SF($|_)/.test(value)) return 'SEMI-FINAL';
  if (/QUARTER.?FINAL|(^|_)QF($|_)/.test(value)) return 'QUARTER-FINAL';
  if (/(^|_)FINAL($|_)/.test(value) || value === 'F') return 'FINAL';
  const roundMatch = value.match(/ROUND_OF_(\d+)|^R(\d+)$/);
  if (roundMatch) return `ROUND OF ${roundMatch[1] || roundMatch[2]}`;
  return null;
}

function hasRecordedScores(m: FeedLiveMatch): boolean {
  const a = String(m.scoreTeamA || '').trim();
  const b = String(m.scoreTeamB || '').trim();
  return Boolean((a && a !== '0' && a !== '—') || (b && b !== '0' && b !== '—'));
}

function isLiveStatus(status?: string | null, hasScores?: boolean): boolean {
  const s = String(status || '').toUpperCase().trim();
  if (['LIVE', 'IN_PROGRESS', 'INPROGRESS', 'ACTIVE', 'ONGOING', 'STARTED', 'MATCHES_RUNNING'].includes(s)) {
    return true;
  }
  if (hasScores && s !== 'COMPLETED' && s !== 'CANCELLED' && s !== 'DRAFT' && s !== 'BYE') {
    return true;
  }
  return false;
}

function isUpcomingStatus(status?: string | null, hasScores?: boolean): boolean {
  if (isLiveStatus(status, hasScores)) return false;
  const s = String(status || '').toUpperCase().trim();
  return !['COMPLETED', 'CANCELLED', 'BYE', 'AUTO_ADVANCED'].includes(s);
}

function isExcludedMatch(m: FeedLiveMatch): boolean {
  const s = String(m.status || '').toUpperCase().trim();
  if (['BYE', 'AUTO_ADVANCED', 'CANCELLED'].includes(s)) return true;
  const a = String(m.teamAName || '').trim().toUpperCase();
  const b = String(m.teamBName || '').trim().toUpperCase();
  return a === 'BYE' || b === 'BYE';
}

function formatScheduledDateTime(iso?: string | null): string {
  if (!iso) return 'Upcoming';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Upcoming';
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return `Today, ${timeStr}`;
    if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${timeStr}`;
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return 'Upcoming';
  }
}

function formatCompletedTime(iso?: string | null): string {
  if (!iso) return 'Completed';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Completed';
    const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) {
      return `Today, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return 'Completed';
  }
}

function formatScoreValue(score?: string | null, isCricket?: boolean): string {
  if (!score || score === '0' || score === '—') return isCricket ? '—' : '0';
  return String(score).trim();
}

function getMatchNarrative(m: FeedLiveMatch, live: boolean): { text: string; highlight?: boolean } {
  if (!live) {
    if (m.winnerName) return { text: `Winner: ${m.winnerName}`, highlight: true };
    return { text: 'Match Concluded' };
  }
  if (/cricket/i.test(m.sportName || '')) {
    const aActive = Boolean(m.scoreTeamA && m.scoreTeamA !== '0' && m.scoreTeamA !== '—');
    const bActive = Boolean(m.scoreTeamB && m.scoreTeamB !== '0' && m.scoreTeamB !== '—');
    if (aActive && bActive) return { text: '2nd Innings in progress · Chase on', highlight: true };
    if (aActive) return { text: '1st Innings in progress' };
    return { text: 'Live Action · In Progress' };
  }
  return { text: 'Live Match in Progress', highlight: true };
}

function mapConfigMatchToFeed(cfg: any, m: any): FeedLiveMatch {
  return {
    matchId: Number(m.id ?? m.matchId),
    configId: Number(cfg.id),
    eventId: cfg.eventId ?? null,
    sportName: cfg.sportName || cfg.eventName || 'Sports',
    tournamentName: cfg.tournamentName || 'Tournament',
    eventName: cfg.eventName || null,
    roundName: m.roundName || m.round || null,
    teamAName: m.teamAName || m.homeName || 'Team A',
    teamBName: m.teamBName || m.awayName || 'Team B',
    teamAFlat: m.teamAFlat || m.homeFlat || null,
    teamBFlat: m.teamBFlat || m.awayFlat || null,
    scoreTeamA: m.scoreTeamA != null ? String(m.scoreTeamA) : (m.score1 != null ? String(m.score1) : null),
    scoreTeamB: m.scoreTeamB != null ? String(m.scoreTeamB) : (m.score2 != null ? String(m.score2) : null),
    status: m.status || 'SCHEDULED',
    winnerName: m.winnerName || null,
    scheduledAt: m.scheduledAt || null,
    completedAt: m.completedAt || null,
    venueName: m.venueName || m.courtName || null,
  };
}

async function fetchConfigFeedMatches(
  maxConfigs = 6,
  maxPerConfig = 20,
  onlyCompleted = false,
): Promise<FeedLiveMatch[]> {
  try {
    const configs = await sportsService.getTournamentConfigs().catch(() => []);
    const validConfigs = configs
      .filter((c: any) => String(c?.status || '').toUpperCase() !== 'DRAFT')
      .slice(0, maxConfigs);
    if (validConfigs.length === 0) return [];

    const nested = await Promise.all(
      validConfigs.map(async (cfg: any): Promise<FeedLiveMatch[]> => {
        try {
          const cfgMatches = await sportsService.getMatchesByConfigId(Number(cfg.id)).catch(() => []);
          return cfgMatches
            .filter((m: any) => {
              const id = Number(m?.id ?? m?.matchId);
              if (!id) return false;
              const status = String(m?.status || '').toUpperCase();
              if (['BYE', 'AUTO_ADVANCED', 'CANCELLED', 'DRAFT'].includes(status)) return false;
              if (m?.showInFeed === false) return false;
              if (onlyCompleted && status !== 'COMPLETED') return false;
              return true;
            })
            .slice(0, maxPerConfig)
            .map((m: any) => mapConfigMatchToFeed(cfg, m));
        } catch {
          return [];
        }
      }),
    );
    return nested.flat();
  } catch {
    return [];
  }
}

function MatchStripCard({
  match,
  compactWidth,
  onPress,
  onDismiss,
}: {
  match: FeedLiveMatch;
  compactWidth?: boolean;
  onPress: () => void;
  onDismiss?: () => void;
}) {
  const { palette } = useAppTheme();
  const scored = hasRecordedScores(match);
  const live = isLiveStatus(match.status, scored);
  const isCompleted = String(match.status || '').toUpperCase() === 'COMPLETED';
  const isUpcoming = !live && !isCompleted;
  const isCricket = /cricket/i.test(match.sportName || '');
  const roundStageLabel = getRoundStageLabel(match.roundName);
  const narrative = getMatchNarrative(match, live);

  const winnerLower = (match.winnerName || '').toLowerCase();
  const isTeamAWinner = Boolean(
    isCompleted && winnerLower && (
      winnerLower === (match.teamAName || '').toLowerCase() ||
      winnerLower.includes((match.teamAName || '').toLowerCase())
    ),
  );
  const isTeamBWinner = Boolean(
    isCompleted && winnerLower && (
      winnerLower === (match.teamBName || '').toLowerCase() ||
      winnerLower.includes((match.teamBName || '').toLowerCase())
    ),
  );

  const borderColor = live
    ? (palette.isDark ? '#F8717180' : '#FECACA')
    : isCompleted
      ? (palette.isDark ? '#FBBF2466' : '#FCD34D')
      : palette.borderLight;

  const subMeta = [match.tournamentName, match.eventName, roundStageLabel ? null : match.roundName]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={[
        st.card,
        compactWidth ? st.cardFixedWidth : st.cardFullWidth,
        { backgroundColor: palette.surface, borderColor },
      ]}
    >
      {/* Top Line: Sport pill, Stage badge, Status badge, Dismiss */}
      <View style={st.cardTopRow}>
        <View style={st.cardTopLeft}>
          <View style={[st.sportPill, { backgroundColor: palette.primaryLight }]}>
            <Text style={st.sportEmoji}>{getSportEmoji(match.sportName)}</Text>
            <Text style={[st.sportText, { color: palette.link }]} numberOfLines={1}>
              {match.sportName || 'Sports'}
            </Text>
          </View>
          {roundStageLabel ? (
            <View
              style={[
                st.stageBadge,
                {
                  backgroundColor: roundStageLabel === 'FINAL' ? '#FEF3C7' : palette.surfaceMuted,
                  borderColor: roundStageLabel === 'FINAL' ? '#FCD34D' : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  st.stageText,
                  { color: roundStageLabel === 'FINAL' ? '#92400E' : palette.textSecondary },
                ]}
              >
                {roundStageLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={st.cardTopRight}>
          {live ? (
            <View style={st.liveBadge}>
              <View style={st.liveDotWhite} />
              <Text style={st.liveBadgeText}>LIVE</Text>
            </View>
          ) : isCompleted ? (
            <View style={st.completedBadge}>
              <Ionicons name="trophy" size={10} color="#B45309" />
              <Text style={st.completedBadgeText}>DONE</Text>
            </View>
          ) : (
            <View style={[st.upcomingBadge, { backgroundColor: palette.primaryLight, borderColor: palette.primaryBorder }]}>
              <Ionicons name="time-outline" size={10} color={palette.link} />
              <Text style={[st.upcomingBadgeText, { color: palette.link }]}>UPCOMING</Text>
            </View>
          )}

          {onDismiss && (
            <TouchableOpacity
              onPress={onDismiss}
              hitSlop={8}
              style={st.dismissBtn}
              accessibilityLabel="Dismiss match card"
            >
              <Ionicons name="close" size={14} color={palette.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tournament / Event subtitle */}
      {subMeta ? (
        <Text style={[st.subMeta, { color: palette.textMuted }]} numberOfLines={1}>
          {subMeta}
        </Text>
      ) : null}

      {/* Cricbuzz-style Score Box */}
      <View
        style={[
          st.scoreBox,
          { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight },
        ]}
      >
        {/* Side A */}
        <View
          style={[
            st.teamRow,
            isTeamAWinner && { backgroundColor: palette.isDark ? 'rgba(251, 191, 36, 0.16)' : '#FEF3C7' },
          ]}
        >
          <View style={st.teamNameWrap}>
            {isTeamAWinner && <Ionicons name="trophy" size={12} color="#D97706" />}
            <Text style={[st.teamName, { color: palette.text }]} numberOfLines={1}>
              {match.teamAName}
            </Text>
            {match.teamAFlat ? (
              <View style={[st.flatPill, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
                <Text style={[st.flatText, { color: palette.textMuted }]}>{match.teamAFlat}</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              st.scoreText,
              {
                color: isTeamAWinner
                  ? palette.success
                  : isUpcoming
                    ? palette.textMuted
                    : palette.text,
              },
            ]}
          >
            {isUpcoming ? '—' : formatScoreValue(match.scoreTeamA, isCricket)}
          </Text>
        </View>

        {/* Side B */}
        <View
          style={[
            st.teamRow,
            isTeamBWinner && { backgroundColor: palette.isDark ? 'rgba(251, 191, 36, 0.16)' : '#FEF3C7' },
          ]}
        >
          <View style={st.teamNameWrap}>
            {isTeamBWinner && <Ionicons name="trophy" size={12} color="#D97706" />}
            <Text style={[st.teamName, { color: palette.text }]} numberOfLines={1}>
              {match.teamBName}
            </Text>
            {match.teamBFlat ? (
              <View style={[st.flatPill, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
                <Text style={[st.flatText, { color: palette.textMuted }]}>{match.teamBFlat}</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={[
              st.scoreText,
              {
                color: isTeamBWinner
                  ? palette.success
                  : isUpcoming
                    ? palette.textMuted
                    : palette.text,
              },
            ]}
          >
            {isUpcoming ? '—' : formatScoreValue(match.scoreTeamB, isCricket)}
          </Text>
        </View>
      </View>

      {/* Bottom Narrative + Action CTA */}
      <View style={[st.cardFooter, { borderTopColor: palette.borderLight }]}>
        <Text
          style={[
            st.narrativeText,
            {
              color: isUpcoming
                ? palette.link
                : isCompleted
                  ? palette.success
                  : narrative.highlight
                    ? palette.link
                    : palette.textMuted,
            },
          ]}
          numberOfLines={1}
        >
          {isUpcoming
            ? `🗓️ ${formatScheduledDateTime(match.scheduledAt)}`
            : isCompleted
              ? `🏆 ${narrative.text}`
              : narrative.text}
          {match.venueName ? ` · 📍 ${match.venueName}` : ''}
        </Text>

        <View
          style={[
            st.ctaPill,
            { backgroundColor: palette.primaryLight },
          ]}
        >
          <Ionicons
            name={isUpcoming ? 'calendar-outline' : 'play'}
            size={11}
            color={palette.link}
          />
          <Text style={[st.ctaPillText, { color: palette.link }]}>
            {isUpcoming ? 'Fixture' : live ? 'Watch' : 'Card'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function LiveMatchesStrip({
  communityId,
  enabled = true,
  fallback,
}: {
  communityId?: number | null;
  enabled?: boolean;
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();

  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [allMatchesModalOpen, setAllMatchesModalOpen] = useState(false);
  const [recentResultsModalOpen, setRecentResultsModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [resultsSearchText, setResultsSearchText] = useState('');

  const { data: stripMatches = [], isFetching: loadingStrip } = useQuery({
    queryKey: ['feed-live-strip', communityId],
    queryFn: async () => {
      try {
        const [liveList, upcomingList] = await Promise.all([
          sportsService.getFeedLiveMatches(communityId).catch(() => []),
          sportsService.getFeedUpcomingMatches(communityId, 15).catch(() => []),
        ]);
        const combined = new Map<number, FeedLiveMatch>();
        liveList.forEach((m) => {
          if (m?.matchId) combined.set(m.matchId, m);
        });
        upcomingList.forEach((m) => {
          if (m?.matchId && !combined.has(m.matchId)) combined.set(m.matchId, m);
        });

        // Fallback 2: inspect tournament configs if fewer than 3 valid matches
        const validCount = Array.from(combined.values()).filter((m) => !isExcludedMatch(m)).length;
        if (validCount < 3) {
          const cfgMatches = await fetchConfigFeedMatches(4, 4);
          cfgMatches.forEach((m) => {
            if (m.matchId && !combined.has(m.matchId)) combined.set(m.matchId, m);
          });
        }

        // Fallback 3: if still fewer than 3 valid matches, fetch generic / recent completed matches
        const validAfterCfg = Array.from(combined.values()).filter((m) => !isExcludedMatch(m)).length;
        if (validAfterCfg < 3) {
          const [genericList, recent] = await Promise.all([
            sportsService.getMatchesAsFeedList().catch(() => []),
            sportsService.getFeedRecentCompletedMatches(communityId, 10).catch(() => []),
          ]);
          [...genericList, ...recent].forEach((m) => {
            if (m?.matchId && !combined.has(m.matchId) && !isExcludedMatch(m)) {
              combined.set(m.matchId, m);
            }
          });
        }

        return Array.from(combined.values());
      } catch {
        return [];
      }
    },
    enabled,
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const { data: allModalMatches = [], isFetching: loadingAllModal } = useQuery({
    queryKey: ['feed-live-all', communityId],
    queryFn: async () => {
      const combined = new Map<number, FeedLiveMatch>();
      stripMatches.forEach((m) => {
        if (m?.matchId) combined.set(m.matchId, m);
      });
      const [cfgMatches, genericList] = await Promise.all([
        fetchConfigFeedMatches(8, 30),
        sportsService.getMatchesAsFeedList(),
      ]);
      [...cfgMatches, ...genericList].forEach((m) => {
        if (m?.matchId && !combined.has(m.matchId)) combined.set(m.matchId, m);
      });
      return Array.from(combined.values());
    },
    enabled: enabled && allMatchesModalOpen,
    staleTime: 20_000,
  });

  const { data: recentMatches = [], isFetching: loadingRecent } = useQuery({
    queryKey: ['feed-live-recent', communityId],
    queryFn: async () => {
      const combined = new Map<number, FeedLiveMatch>();
      const recentFeed = await sportsService.getFeedRecentCompletedMatches(communityId, 40);
      recentFeed.forEach((m) => {
        if (m?.matchId) combined.set(m.matchId, m);
      });
      stripMatches.forEach((m) => {
        if (m?.matchId && String(m.status || '').toUpperCase() === 'COMPLETED' && !combined.has(m.matchId)) {
          combined.set(m.matchId, m);
        }
      });
      if (combined.size === 0) {
        const [cfgCompleted, genericCompleted] = await Promise.all([
          fetchConfigFeedMatches(8, 30, true),
          sportsService.getMatchesAsFeedList('COMPLETED'),
        ]);
        [...cfgCompleted, ...genericCompleted].forEach((m) => {
          if (m?.matchId && !combined.has(m.matchId)) combined.set(m.matchId, m);
        });
      }
      return Array.from(combined.values());
    },
    enabled: enabled && recentResultsModalOpen,
    staleTime: 20_000,
  });

  const visible = useMemo(
    () => stripMatches.filter((m) => !isExcludedMatch(m) && !dismissedIds.includes(m.matchId)),
    [stripMatches, dismissedIds],
  );

  const orderedMatches = useMemo(() => {
    const live = visible.filter((m) => isLiveStatus(m.status, hasRecordedScores(m)));
    const upcoming = visible
      .filter((m) => isUpcomingStatus(m.status, hasRecordedScores(m)))
      .sort((a, b) => {
        const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return ta - tb;
      });
    const completed = visible.filter((m) => String(m.status || '').toUpperCase() === 'COMPLETED');
    return [...live, ...upcoming, ...completed];
  }, [visible]);

  const liveCount = useMemo(
    () => visible.filter((m) => isLiveStatus(m.status, hasRecordedScores(m))).length,
    [visible],
  );

  const openMatch = (m: FeedLiveMatch) => {
    if (m.matchId) {
      router.push(`/sports/match/${m.matchId}` as any);
    } else if (m.configId) {
      router.push(`/sports/tournament/${m.configId}` as any);
    } else {
      router.push('/sports' as any);
    }
  };

  const modalSourceMatches = allModalMatches.length > 0 ? allModalMatches : stripMatches;

  const filteredModalMatches = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return modalSourceMatches.filter((m) => {
      if (isExcludedMatch(m)) return false;
      const scored = hasRecordedScores(m);
      const statusUpper = String(m.status || '').toUpperCase();
      if (modalFilter === 'LIVE' && !isLiveStatus(m.status, scored)) return false;
      if (modalFilter === 'UPCOMING' && !isUpcomingStatus(m.status, scored)) return false;
      if (modalFilter === 'COMPLETED' && statusUpper !== 'COMPLETED') return false;
      if (!q) return true;
      const hay = [m.teamAName, m.teamBName, m.sportName, m.tournamentName, m.eventName, m.venueName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [modalSourceMatches, modalFilter, searchText]);

  if (!enabled) {
    return <>{fallback ?? null}</>;
  }

  // If user dismissed cards manually, offer restore strip (just like web LiveMatchesStrip)
  if (visible.length === 0) {
    if (loadingStrip) {
      return null;
    }
    if (stripMatches.length > 0) {
      return (
        <View style={[st.restoreRow, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
          <View style={st.restoreLeft}>
            <Ionicons name="radio" size={15} color={palette.link} />
            <Text style={[st.restoreText, { color: palette.textMuted }]}>
              {stripMatches.length} live/upcoming match{stripMatches.length > 1 ? 'es' : ''} hidden
            </Text>
          </View>
          <TouchableOpacity onPress={() => setDismissedIds([])}>
            <Text style={[st.restoreLink, { color: palette.link }]}>Show Matches</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // No live/upcoming matches in community: return fallback if provided, otherwise hide strip
    return fallback ? <>{fallback}</> : null;
  }

  const shown = orderedMatches.slice(0, MAX_CARDS);

  return (
    <View style={st.wrap}>
      {/* Strip Header (Matches Web LiveMatchesStrip) */}
      <View style={st.headerRow}>
        <View style={st.headerLeft}>
          {liveCount > 0 ? (
            <>
              <Ionicons name="radio" size={15} color="#DC2626" />
              <Text style={[st.headerTitle, { color: palette.text }]}>LIVE NOW</Text>
              <View style={st.liveCountPill}>
                <Text style={st.liveCountText}>{liveCount}</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="calendar" size={14} color={palette.link} />
              <Text style={[st.headerTitle, { color: palette.text }]}>
                {shown.length > 0 ? 'UPCOMING & SPORTS' : 'LIVE & SPORTS'}
              </Text>
            </>
          )}
        </View>

        <View style={st.headerActions}>
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              setModalFilter('ALL');
              setAllMatchesModalOpen(true);
            }}
            style={[st.headerBtn, { backgroundColor: palette.primaryLight, borderColor: palette.primaryBorder }]}
            activeOpacity={0.8}
          >
            <Text style={[st.headerBtnText, { color: palette.link }]}>Matches</Text>
            <Ionicons name="open-outline" size={11} color={palette.link} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRecentResultsModalOpen(true)}
            style={[st.headerBtn, { backgroundColor: palette.warningLight, borderColor: '#FCD34D80' }]}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy" size={11} color="#D97706" />
            <Text style={[st.headerBtnText, { color: '#92400E' }]}>Results</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Carousel of Match Cards — or Community Highlight fallback when 0 fixtures */}
      {shown.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.carouselScroll}
          decelerationRate="fast"
        >
          {shown.map((m) => (
            <MatchStripCard
              key={m.matchId}
              match={m}
              compactWidth
              onPress={() => openMatch(m)}
              onDismiss={() => setDismissedIds((prev) => [...prev, m.matchId])}
            />
          ))}
        </ScrollView>
      ) : loadingStrip ? (
        <View style={[st.loadingStripCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
          <ActivityIndicator size="small" color={palette.link} />
          <Text style={[st.loadingStripText, { color: palette.textMuted }]}>Checking live matches…</Text>
        </View>
      ) : null}

      {/* All Matches Full-Screen Modal */}
      <Modal
        visible={allMatchesModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAllMatchesModalOpen(false)}
      >
        <SafeAreaView style={[st.fullScreenModal, { backgroundColor: palette.appBg }]} edges={['top', 'bottom']}>
          <View style={[st.fullModalHeader, { backgroundColor: palette.surface, borderBottomColor: palette.borderLight }]}>
            <TouchableOpacity
              onPress={() => setAllMatchesModalOpen(false)}
              style={[st.modalBackBtn, { backgroundColor: palette.surfaceMuted }]}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={18} color={palette.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[st.modalTitle, { color: palette.text }]}>Community Sports Matches</Text>
              <Text style={[st.modalSub, { color: palette.textMuted }]}>
                {filteredModalMatches.length} {filteredModalMatches.length === 1 ? 'fixture' : 'fixtures'} · Live, upcoming & completed
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setAllMatchesModalOpen(false)}
              style={[st.modalClose, { backgroundColor: palette.surfaceMuted }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[st.fullModalControls, { backgroundColor: palette.surface, borderBottomColor: palette.borderLight }]}>
            <View style={[st.searchBox, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}>
              <Ionicons name="search" size={15} color={palette.textMuted} />
              <TextInput
                style={[st.searchInput, { color: palette.text }]}
                placeholder="Search teams, sports, venues..."
                placeholderTextColor={palette.textMuted}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={15} color={palette.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={[st.filterRow, { marginBottom: 0 }]}>
              {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as const).map((f) => {
                const active = modalFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setModalFilter(f)}
                    style={[
                      st.filterChip,
                      {
                        backgroundColor: active ? palette.primary : palette.surfaceSubtle,
                        borderColor: active ? palette.primary : palette.borderLight,
                      },
                    ]}
                  >
                    <Text style={[st.filterChipText, { color: active ? '#FFFFFF' : palette.textSecondary }]}>
                      {f === 'ALL' ? 'All' : f === 'LIVE' ? 'Live Now' : f === 'UPCOMING' ? 'Upcoming' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <ScrollView
            style={st.fullModalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={st.fullModalList}
          >
            {loadingAllModal && filteredModalMatches.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: 40 }} size="large" color={palette.link} />
            ) : filteredModalMatches.length > 0 ? (
              filteredModalMatches.map((m) => (
                <MatchStripCard
                  key={m.matchId}
                  match={m}
                  onPress={() => {
                    setAllMatchesModalOpen(false);
                    openMatch(m);
                  }}
                />
              ))
            ) : (
              <Text style={[st.emptyModalText, { color: palette.textMuted }]}>
                No matches match your filter.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Recent Results Full-Screen Modal */}
      <Modal
        visible={recentResultsModalOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setRecentResultsModalOpen(false)}
      >
        <SafeAreaView style={[st.fullScreenModal, { backgroundColor: palette.appBg }]} edges={['top', 'bottom']}>
          <View style={[st.fullModalHeader, { backgroundColor: palette.surface, borderBottomColor: palette.borderLight }]}>
            <TouchableOpacity
              onPress={() => setRecentResultsModalOpen(false)}
              style={[st.modalBackBtn, { backgroundColor: palette.surfaceMuted }]}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={18} color={palette.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[st.modalTitle, { color: palette.text }]}>Recent Match Results</Text>
              <Text style={[st.modalSub, { color: palette.textMuted }]}>
                {recentMatches.length} completed {recentMatches.length === 1 ? 'result' : 'results'} & winners
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setRecentResultsModalOpen(false)}
              style={[st.modalClose, { backgroundColor: palette.surfaceMuted }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[st.fullModalControls, { backgroundColor: palette.surface, borderBottomColor: palette.borderLight }]}>
            <View style={[st.searchBox, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight, marginBottom: 0 }]}>
              <Ionicons name="search" size={15} color={palette.textMuted} />
              <TextInput
                style={[st.searchInput, { color: palette.text }]}
                placeholder="Search completed matches, winners, sports..."
                placeholderTextColor={palette.textMuted}
                value={resultsSearchText}
                onChangeText={setResultsSearchText}
              />
              {resultsSearchText.length > 0 && (
                <TouchableOpacity onPress={() => setResultsSearchText('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={15} color={palette.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            style={st.fullModalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={st.fullModalList}
          >
            {(() => {
              const q = resultsSearchText.trim().toLowerCase();
              const visibleResults = q
                ? recentMatches.filter((m) =>
                    [m.teamAName, m.teamBName, m.sportName, m.tournamentName, m.eventName, m.winnerName, m.venueName]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase()
                      .includes(q),
                  )
                : recentMatches;

              if (loadingRecent && visibleResults.length === 0) {
                return <ActivityIndicator style={{ marginVertical: 40 }} size="large" color={palette.link} />;
              }
              if (visibleResults.length === 0) {
                return (
                  <Text style={[st.emptyModalText, { color: palette.textMuted }]}>
                    {q ? 'No results match your search.' : 'No recently completed matches found.'}
                  </Text>
                );
              }
              return visibleResults.map((m) => (
                <View key={m.matchId} style={{ gap: 4 }}>
                  <MatchStripCard
                    match={m}
                    onPress={() => {
                      setRecentResultsModalOpen(false);
                      openMatch(m);
                    }}
                  />
                  {m.completedAt ? (
                    <Text style={[st.completedAgo, { color: palette.textMuted }]}>
                      Finished {formatCompletedTime(m.completedAt)}
                    </Text>
                  ) : null}
                </View>
              ));
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 12.5,
    fontFamily: FONTS.displayBold,
    letterSpacing: 0.7,
  },
  liveCountPill: {
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  liveCountText: {
    color: '#B91C1C',
    fontSize: 10.5,
    fontFamily: FONTS.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  headerBtnText: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
  },
  carouselScroll: {
    gap: 10,
    paddingBottom: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
    ...SHADOWS.sm,
  },
  cardFixedWidth: {
    width: 268,
  },
  cardFullWidth: {
    width: '100%',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  sportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
    maxWidth: 130,
  },
  sportEmoji: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
  sportText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  stageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  stageText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.2,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  liveDotWhite: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  completedBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  dismissBtn: {
    padding: 2,
  },
  subMeta: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    lineHeight: 15,
  },
  scoreBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  teamNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    flexShrink: 1,
  },
  flatPill: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  flatText: {
    fontSize: 9.5,
    fontFamily: FONTS.semiBold,
  },
  scoreText: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  narrativeText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: FONTS.medium,
    lineHeight: 15,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ctaPillText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  restoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  restoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restoreText: {
    fontSize: 12.5,
    fontFamily: FONTS.medium,
  },
  restoreLink: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
  },
  fullScreenModal: {
    flex: 1,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModalControls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  fullModalScroll: {
    flex: 1,
  },
  fullModalList: {
    padding: 16,
    gap: 12,
    paddingBottom: 36,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    maxHeight: '85%',
    ...SHADOWS.lg,
  },
  modalScroll: {
    maxHeight: 460,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
  },
  modalSub: {
    fontSize: 12.5,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  modalList: {
    gap: 10,
    paddingBottom: 24,
  },
  completedAgo: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    textAlign: 'right',
    paddingRight: 4,
  },
  emptyModalText: {
    textAlign: 'center',
    fontSize: 13.5,
    fontFamily: FONTS.medium,
    paddingVertical: 28,
  },
  loadingStripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  loadingStripText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
});
