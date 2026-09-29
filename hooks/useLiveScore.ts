import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { sportsService } from '@/services/sportsService';
import { tokenStore } from '@/services/apiClient';
import { CONFIG } from '@/constants/config';
import { secureLog } from '@/security';
import type { MatchDto, MatchEventDto, LiveScoreEvent } from '@/types/api';

interface UseLiveScoreReturn {
  match:        MatchDto | null;
  events:       MatchEventDto[];
  isLoading:    boolean;
  connected:    boolean;
  matchEnded:   boolean;
  refetch:      () => Promise<void>;
}

export function useLiveScore(matchId: number): UseLiveScoreReturn {
  const [match,      setMatch]      = useState<MatchDto | null>(null);
  const [events,     setEvents]     = useState<MatchEventDto[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [connected,  setConnected]  = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const stompRef = useRef<Client | null>(null);

  const fetchMatch = useCallback(async () => {
    try {
      const [m, ev] = await Promise.all([
        sportsService.getMatch(matchId),
        sportsService.getMatchEvents(matchId),
      ]);
      setMatch(m);
      setEvents(ev);
      setMatchEnded(m.status === 'COMPLETED' || m.status === 'CANCELLED');
    } catch (err) {
      secureLog.error('[LiveScore] Load failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [matchId]);

  // Load initial match data + event history
  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // STOMP subscription
  useEffect(() => {
    let client: Client;
    (async () => {
      const token = await tokenStore.getAccess();
      if (!token) return;

      client = new Client({
        brokerURL: CONFIG.WS_URL,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 4000,
        onConnect: () => {
          setConnected(true);

          const handleIncoming = (frame: IMessage) => {
            try {
              const ev = JSON.parse(frame.body);
              handleLiveEvent(ev);
            } catch { /* ignore malformed */ }
          };

          // Primary topic (dot notation per STOMP inventory)
          client.subscribe(`/topic/sports.match.${matchId}`, handleIncoming);

          // Alias topics (slash notation for backwards compatibility with backend)
          client.subscribe(`/topic/match/${matchId}`, handleIncoming);
          client.subscribe(`/topic/match/${matchId}/state`, handleIncoming);
        },
        onDisconnect: () => setConnected(false),
        onStompError:  (f) => {
          secureLog.warn('[Sports STOMP]', { message: f.headers['message'] });
          setConnected(false);
        },
      });
      client.activate();
      stompRef.current = client;
    })();
    return () => {
      stompRef.current?.deactivate();
      stompRef.current = null;
      setConnected(false);
    };
  }, [matchId]);

  const handleLiveEvent = useCallback((ev: any) => {
    if (!ev) return;

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
          setMatch((prev) => prev ? {
            ...prev,
            status:    'COMPLETED',
            homeScore: ev.homeScore ?? prev.homeScore,
            awayScore: ev.awayScore ?? prev.awayScore,
          } : prev);
          setMatchEnded(true);
          if (ev.event) setEvents((prev) => [...prev, ev.event!]);
          break;
      }
      return;
    }

    // Direct match state update payload (e.g. from /topic/match/{id}/state)
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
  }, []);

  return { match, events, isLoading, connected, matchEnded, refetch: fetchMatch };
}
