import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { auctionService } from '@/services/auctionService';
import { tokenStore } from '@/services/apiClient';
import { CONFIG } from '@/constants/config';
import { secureLog } from '@/security';
import type { AuctionDto, BidDto, AuctionEvent, BidAckMessage } from '@/types/api';

export type BidResult = 'success' | 'outbid' | 'below_minimum' | 'error';

export interface UseAuctionLiveReturn {
  auction:         AuctionDto | null;
  bids:            BidDto[];
  isLoading:       boolean;
  isPlacingBid:    boolean;
  connected:       boolean;
  isWinning:       boolean;
  wasOutbid:       boolean;
  lastBidFlash:    boolean;      // true for ~800ms after a new bid — triggers price animation
  auctionEnded:    boolean;
  winner:          { id: number; name: string; amount: number } | null;
  placeBid:        (amount: number) => Promise<BidResult>;
  minNextBid:      number;
  clearOutbid:     () => void;
}

// Dynamic bid increment based on current price
function getBidIncrement(currentBid: number): number {
  if (currentBid < 1_000)   return 100;
  if (currentBid < 10_000)  return 500;
  if (currentBid < 1_00_000) return 1_000;
  return 5_000;
}

/** Maps a server ack status to the BidResult type consumed by UI components. */
function ackToBidResult(ack: BidAckMessage): BidResult {
  switch (ack.status) {
    case 'ACCEPTED': return 'success';
    case 'OUTBID':   return 'outbid';
    case 'REJECTED': return 'error';
    default:         return 'error';
  }
}

export function useAuctionLive(
  auctionId: number,
  currentUserId: number,
): UseAuctionLiveReturn {
  const [auction,       setAuction]      = useState<AuctionDto | null>(null);
  const [bids,          setBids]         = useState<BidDto[]>([]);
  const [isLoading,     setIsLoading]    = useState(true);
  const [isPlacingBid,  setIsPlacingBid] = useState(false);
  const [connected,     setConnected]    = useState(false);
  const [wasOutbid,     setWasOutbid]    = useState(false);
  const [lastBidFlash,  setFlash]        = useState(false);
  const [auctionEnded,  setAuctionEnded] = useState(false);
  const [winner,        setWinner]       = useState<{ id: number; name: string; amount: number } | null>(null);

  const stompRef   = useRef<Client | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Holds the resolve callback of the currently pending placeBid Promise.
   * Set just before publishing the STOMP bid; cleared when the ack arrives
   * or the timeout fires.
   */
  const pendingBidResolveRef = useRef<((result: BidResult) => void) | null>(null);
  const bidTimeoutRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Trigger flash animation ────────────────────────────────────
  const triggerFlash = useCallback(() => {
    setFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 800);
  }, []);

  /** Called when a bid ack arrives or the timeout fires — settles the pending promise. */
  const settleBid = useCallback((result: BidResult) => {
    if (bidTimeoutRef.current) {
      clearTimeout(bidTimeoutRef.current);
      bidTimeoutRef.current = null;
    }
    const resolve = pendingBidResolveRef.current;
    pendingBidResolveRef.current = null;
    setIsPlacingBid(false);
    if (resolve) resolve(result);
  }, []);

  // ── Load initial auction + bids ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [a, b] = await Promise.all([
          auctionService.getAuction(auctionId),
          auctionService.getBids(auctionId, 0),
        ]);
        if (cancelled) return;
        setAuction(a);
        setBids([...b.content].reverse()); // oldest first for display
        setAuctionEnded(a.status === 'ENDED' || a.status === 'CANCELLED');
        if (a.winnerId) {
          setWinner({ id: a.winnerId, name: a.winnerName!, amount: a.finalPrice! });
        }
      } catch (err) {
        secureLog.error('[Auction] Load failed', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [auctionId]);

  // ── STOMP WebSocket ────────────────────────────────────────────
  useEffect(() => {
    let client: Client;

    (async () => {
      const token = await tokenStore.getAccess();
      if (!token) return;

      client = new Client({
        brokerURL: CONFIG.WS_URL,
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 3000,

        onConnect: () => {
          setConnected(true);

          const handleIncoming = (frame: IMessage) => {
            try {
              const event: AuctionEvent = JSON.parse(frame.body);
              handleAuctionEvent(event);
            } catch { /* malformed */ }
          };

          // Primary topic (dot notation as per STOMP inventory)
          client.subscribe(`/topic/auction.${auctionId}`, handleIncoming);

          // Alias topic (slash notation for backwards compatibility with backend)
          client.subscribe(`/topic/auction/${auctionId}`, handleIncoming);

          // ── Private bid-result acknowledgment channel ──────────
          // The server sends { status, bidId, auctionId, amount, reason? } here
          // after processing a bid from /app/auction/{id}/bid
          client.subscribe('/user/queue/auction/bid-result', (frame: IMessage) => {
            try {
              const ack: BidAckMessage = JSON.parse(frame.body);
              // Only handle acks for this auction to avoid cross-screen interference
              if (ack.auctionId !== auctionId) return;

              secureLog.info('[Auction] Bid ack received', { status: ack.status, reason: ack.reason });

              if (ack.status === 'OUTBID') {
                setWasOutbid(true);
              }

              // Settle the pending bid Promise with the real server verdict
              settleBid(ackToBidResult(ack));
            } catch { /* malformed ack */ }
          });
        },

        onDisconnect: () => setConnected(false),
        onStompError: (f) => {
          secureLog.warn('[Auction STOMP]', { message: f.headers['message'] });
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
      // Settle any dangling pending bid on unmount to avoid memory leaks
      settleBid('error');
    };
  }, [auctionId, settleBid]);

  // ── Handle incoming auction events ─────────────────────────────
  const handleAuctionEvent = useCallback((event: AuctionEvent) => {
    switch (event.type) {

      case 'BID_PLACED': {
        // Add new bid to the feed
        const newBid: BidDto = {
          id:          Date.now(),
          auctionId,
          bidderId:    event.bidderId!,
          bidderName:  event.bidderName!,
          bidderFlat:  event.bidderFlat,
          amount:      event.amount!,
          isWinning:   true,
          createdAt:   event.timestamp ?? new Date().toISOString(),
        };
        setBids((prev) => {
          // Mark previous winner as no longer winning
          const updated = prev.map((b) => ({ ...b, isWinning: false }));
          return [...updated, newBid];
        });
        // Update auction state & only trigger outbid if current user was previously leading
        setAuction((prev) => {
          if (!prev) return prev;
          if (prev.currentBidderId === currentUserId && event.bidderId !== currentUserId) {
            setWasOutbid(true);
          }
          return {
            ...prev,
            currentBid:      event.amount!,
            currentBidder:   event.bidderName!,
            currentBidderId: event.bidderId!,
            bidCount:        prev.bidCount + 1,
            status:          'LIVE',
          };
        });
        triggerFlash();
        break;
      }

      case 'OUTBID': {
        setWasOutbid(true);
        break;
      }

      case 'AUCTION_EXTENDED': {
        setAuction((prev) => prev ? { ...prev, endTime: event.newEndTime! } : prev);
        break;
      }

      case 'RESERVE_MET': {
        setAuction((prev) => prev ? { ...prev, reserveMet: true } : prev);
        break;
      }

      case 'AUCTION_ENDED': {
        setAuction((prev) => prev ? {
          ...prev,
          status:     'ENDED',
          winnerId:   event.winnerId,
          winnerName: event.winnerName,
          finalPrice: event.finalAmount,
        } : prev);
        setWinner({
          id:     event.winnerId!,
          name:   event.winnerName!,
          amount: event.finalAmount!,
        });
        setAuctionEnded(true);
        break;
      }

      case 'AUCTION_STARTED': {
        setAuction((prev) => prev ? { ...prev, status: 'LIVE' } : prev);
        break;
      }
    }
  }, [auctionId, currentUserId, triggerFlash]);

  // ── Place bid ──────────────────────────────────────────────────
  const placeBid = useCallback(async (amount: number): Promise<BidResult> => {
    if (!auction) return 'error';
    if (amount < minNextBid(auction)) return 'below_minimum';
    if (isPlacingBid) return 'error';

    setIsPlacingBid(true);
    setWasOutbid(false);

    // ── Path A: STOMP connected — use server-acknowledged flow ─────
    if (stompRef.current?.connected) {
      return new Promise<BidResult>((resolve) => {
        // Store the resolver so the ack subscription can call it
        pendingBidResolveRef.current = resolve;

        // Safety timeout: if no ack arrives within 8 s, fall back to 'error'
        // (covers network hiccups, server crash, etc.)
        bidTimeoutRef.current = setTimeout(() => {
          secureLog.warn('[Auction] Bid ack timeout — treating as error');
          settleBid('error');
        }, 8_000);

        stompRef.current!.publish({
          destination: `/app/auction/${auctionId}/bid`,
          body: JSON.stringify({ amount }),
        });
        // isPlacingBid stays true until settleBid() is called by ack or timeout
      });
    }

    // ── Path B: STOMP disconnected — REST fallback (optimistic) ───
    try {
      await auctionService.placeBid(auctionId, amount);
      setIsPlacingBid(false);
      return 'success';
    } catch (err: any) {
      const status = err?.response?.status;
      setIsPlacingBid(false);
      if (status === 409) return 'outbid';
      return 'error';
    }
  }, [auction, auctionId, isPlacingBid, settleBid]);

  function minNextBid(a: AuctionDto): number {
    const base = Math.max(a.currentBid, a.startingPrice);
    return base + getBidIncrement(base);
  }

  const isWinning  = auction?.currentBidderId === currentUserId;
  const minBid     = auction ? minNextBid(auction) : 0;

  return {
    auction,
    bids,
    isLoading,
    isPlacingBid,
    connected,
    isWinning,
    wasOutbid,
    lastBidFlash,
    auctionEnded,
    winner,
    placeBid,
    minNextBid:  minBid,
    clearOutbid: () => setWasOutbid(false),
  };
}

// Export helper for increment chips
export function getBidIncrements(currentBid: number): number[] {
  const inc = getBidIncrement(currentBid);
  return [inc, inc * 2, inc * 5, inc * 10];
}
