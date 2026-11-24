import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { sportsService } from '@/services/sportsService';
import { websocketManager } from '@/services/websocketManager';
import { secureLog } from '@/security';
import type { MatchDto, MatchEventDto } from '@/types/api';

interface UseLiveScoreReturn {
  match:        MatchDto | null;
  events:       MatchEventDto[];
  isLoading:    boolean;
  connected:    boolean;
  matchEnded:   boolean;
  refetch:      () => Promise<void>;
}

let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch {}

function notifyMatchEnded(match: MatchDto, homeScore?: number, awayScore?: number) {
  if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') return;
  try {
    const h = homeScore ?? match.homeScore ?? 0;
    const a = awayScore ?? match.awayScore ?? 0;
    Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 ${match.homeTeamName} vs ${match.awayTeamName} - Full Time`,
        body: `Final Result: ${match.homeTeamName} ${h} - ${a} ${match.awayTeamName}`,
        data: { type: 'SPORTS_RESULT', matchId: match.id },
        sound: 'default',
      },
      trigger: null,
    });
  } catch {
    // Non-fatal if local notification cannot be scheduled
  }
}

export function useLiveScore(matchId: number): UseLiveScoreReturn {
  const [match,      setMatch]      = useState<MatchDto | null>(null);
  const [events,     setEvents]     = useState<MatchEventDto[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [connected,  setConnected]  = useState(websocketManager.isConnected);
  const [matchEnded, setMatchEnded] = useState(false);

  const lastSequenceRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const fetchMatch = useCallback(async () => {
    try {
      const [m, ev] = await Promise.all([
        sportsService.getMatch(matchId),
        sportsService.getMatchEvents(matchId),
      ]);
      if (!isMountedRef.current) return;
      setMatch(m);
      setEvents(ev);
      setMatchEnded(m.status === 'COMPLETED' || m.status === 'CANCELLED');
    } catch (err) {
      secureLog.error('[LiveScore] Load failed', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [matchId]);

  // Load initial match data
  useEffect(() => {
    isMountedRef.current = true;
    fetchMatch();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchMatch]);

  // Re-fetch on returning to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        fetchMatch();
      }
    });
    return () => sub.remove();
  }, [fetchMatch]);

  const handleLiveEvent = useCallback((ev: any) => {
    if (!ev || !isMountedRef.current) return;

    // Sequence ordering & deduplication
    if (typeof ev.sequence === 'number') {
      if (ev.sequence <= lastSequenceRef.current) {
        return; // Stale or duplicate packet
      }
      if (lastSequenceRef.current > 0 && ev.sequence > lastSequenceRef.current + 1) {
        // Gap detected — fetch fresh match state
        fetchMatch();
      }
      lastSequenceRef.current = ev.sequence;
    }

    // 1. Cricket SportsLiveMatchStateResponse / Delta Event
    if (ev.innings1 !== undefined || ev.innings2 !== undefined || ev.currentInnings !== undefined) {
      setMatch((prev) => {
        if (!prev) return prev;
        const inn1 = ev.innings1;
        const inn2 = ev.innings2;
        const status = ev.status || prev.status;

        const homeScore = inn1 ? inn1.totalRuns : prev.homeScore;
        const homeWickets = inn1 ? inn1.totalWickets : prev.homeWickets;
        const homeOvers = inn1 ? inn1.totalOvers : prev.homeOvers;

        const awayScore = inn2 ? inn2.totalRuns : prev.awayScore;
        const awayWickets = inn2 ? inn2.totalWickets : prev.awayWickets;
        const awayOvers = inn2 ? inn2.totalOvers : prev.awayOvers;

        const dispHome = inn1 ? `${inn1.totalRuns}/${inn1.totalWickets} (${inn1.totalOvers} ov)` : prev.homeScoreDisplay;
        const dispAway = inn2 ? `${inn2.totalRuns}/${inn2.totalWickets} (${inn2.totalOvers} ov)` : prev.awayScoreDisplay;

        const isDone = status === 'COMPLETED' || status === 'CANCELLED';
        if (isDone) setMatchEnded(true);

        return {
          ...prev,
          status,
          homeScore,
          homeWickets,
          homeOvers,
          awayScore,
          awayWickets,
          awayOvers,
          homeScoreDisplay: dispHome,
          awayScoreDisplay: dispAway,
        };
      });

      if (ev.lastBall || ev.recentBalls) {
        // Append last ball to events if provided
        const ball = ev.lastBall;
        if (ball) {
          const newEv: MatchEventDto = {
            id: ball.deliveryNumber ?? Date.now(),
            matchId,
            type: ball.isWicket ? 'WICKET' : 'COMMENTARY',
            minute: ball.overNumber ?? 0,
            over: ball.overNumber !== undefined ? `${ball.overNumber}.${ball.ballNumber ?? 0}` : undefined,
            description: ball.commentary || `${ball.runsScored ?? 0} runs scored`,
            timestamp: new Date().toISOString(),
          };
          setEvents((prev) => [...prev, newEv]);
        }
      }
      return;
    }

    // 2. Generic Sports Delta / Legacy Event
    if (ev.type) {
      switch (ev.type) {
        case 'SCORE_UPDATE':
        case 'MATCH_STARTED':
          setMatch((prev) => prev ? {
            ...prev,
            homeScore:      ev.homeScore      ?? prev.homeScore,
            awayScore:      ev.awayScore      ?? prev.awayScore,
            status:         ev.status         ?? prev.status,
            currentPeriod:  ev.currentPeriod  ?? prev.currentPeriod,
            elapsedMinutes: ev.elapsedMinutes ?? prev.elapsedMinutes,
            homeSetsWon:    ev.homeSetsWon    ?? prev.homeSetsWon,
            awaySetsWon:    ev.awaySetsWon    ?? prev.awaySetsWon,
            homeOvers:      ev.homeOvers      ?? prev.homeOvers,
            homeWickets:    ev.homeWickets    ?? prev.homeWickets,
            awayOvers:      ev.awayOvers      ?? prev.awayOvers,
            awayWickets:    ev.awayWickets    ?? prev.awayWickets,
          } : prev);
          if (ev.event) setEvents((prev) => [...prev, ev.event!]);
          break;

        case 'MATCH_EVENT':
          if (ev.event) setEvents((prev) => [...prev, ev.event!]);
          if (ev.homeScore !== undefined || ev.awayScore !== undefined) {
            setMatch((prev) => prev ? {
              ...prev,
              homeScore:   ev.homeScore   ?? prev.homeScore,
              awayScore:   ev.awayScore   ?? prev.awayScore,
              homeOvers:   ev.homeOvers   ?? prev.homeOvers,
              homeWickets: ev.homeWickets ?? prev.homeWickets,
              awayOvers:   ev.awayOvers   ?? prev.awayOvers,
              awayWickets: ev.awayWickets ?? prev.awayWickets,
            } : prev);
          }
          break;

        case 'MATCH_ENDED':
          setMatch((prev) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              status:    'COMPLETED' as const,
              homeScore: ev.homeScore ?? prev.homeScore,
              awayScore: ev.awayScore ?? prev.awayScore,
            };
            notifyMatchEnded(updated, ev.homeScore, ev.awayScore);
            return updated;
          });
          setMatchEnded(true);
          if (ev.event) setEvents((prev) => [...prev, ev.event!]);
          break;
      }
      return;
    }

    // Direct match state update payload (e.g. from /topic/match/{id}/generic-state)
    if (ev.homeScore !== undefined || ev.awayScore !== undefined || ev.status !== undefined) {
      setMatch((prev) => prev ? {
        ...prev,
        homeScore:      ev.homeScore      ?? prev.homeScore,
        awayScore:      ev.awayScore      ?? prev.awayScore,
        status:         ev.status         ?? prev.status,
        currentPeriod:  ev.currentPeriod  ?? prev.currentPeriod,
        elapsedMinutes: ev.elapsedMinutes ?? prev.elapsedMinutes,
        homeSetsWon:    ev.homeSetsWon    ?? prev.homeSetsWon,
        awaySetsWon:    ev.awaySetsWon    ?? prev.awaySetsWon,
        homeOvers:      ev.homeOvers      ?? prev.homeOvers,
        homeWickets:    ev.homeWickets    ?? prev.homeWickets,
        awayOvers:      ev.awayOvers      ?? prev.awayOvers,
        awayWickets:    ev.awayWickets    ?? prev.awayWickets,
      } : prev);
      if (ev.status === 'COMPLETED' || ev.status === 'CANCELLED') {
        setMatchEnded(true);
      }
    }
  }, [fetchMatch, matchId]);

  // STOMP subscription via shared singleton WebSocketManager
  useEffect(() => {
    setConnected(websocketManager.isConnected);

    const unsubConnect = websocketManager.onConnect(() => {
      if (isMountedRef.current) {
        setConnected(true);
        fetchMatch();
      }
    });

    const unsubDisconnect = websocketManager.onDisconnect(() => {
      if (isMountedRef.current) {
        setConnected(false);
      }
    });

    // Subscribe to primary live topic and state topic via shared manager
    const unsubLive = websocketManager.subscribe(`/topic/matches/${matchId}/live`, handleLiveEvent);
    const unsubState = websocketManager.subscribe(`/topic/match/${matchId}/state`, handleLiveEvent);

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubLive();
      unsubState();
    };
  }, [matchId, handleLiveEvent, fetchMatch]);

  return { match, events, isLoading, connected, matchEnded, refetch: fetchMatch };
}
