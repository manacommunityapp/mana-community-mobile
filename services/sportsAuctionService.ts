import api from './apiClient';
import { secureLog } from '@/security';
import type {
  SportsAuctionConfigResponse,
  SportsAuctionPlayerResponse,
  SportsAuctionTeamResponse,
  SportsAuctionBidResponse,
  SportsAuctionStatsResponse,
  PlayerWithBidResponse,
} from '@/types/api';

const BASE = '/api/auction';

export const sportsAuctionService = {
  // ── Config ──────────────────────────────────────────────────
  async getMyConfigs(): Promise<SportsAuctionConfigResponse[]> {
    try {
      const res = await api.get<SportsAuctionConfigResponse[]>(`${BASE}/config`);
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch (_e) { /* fallback to /config/all */ }
    try {
      const res = await api.get<SportsAuctionConfigResponse[]>(`${BASE}/config/all`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      secureLog.warn('[sportsAuction] getMyConfigs failed', err?.message);
      return [];
    }
  },

  async getConfig(id: number): Promise<SportsAuctionConfigResponse> {
    try {
      const res = await api.get<SportsAuctionConfigResponse>(`${BASE}/config/${id}`);
      if (res.data) return res.data;
    } catch {}
    // Fallback: check if id matches an eventId or configId across all configs
    try {
      const all = await sportsAuctionService.getMyConfigs();
      const match = all.find((c) => c.id === id || c.eventId === id);
      if (match) return match;
    } catch {}
    throw new Error('Auction configuration not found');
  },

  async getStats(configId: number): Promise<SportsAuctionStatsResponse | null> {
    try {
      const res = await api.get<any>(`${BASE}/config/${configId}/stats`);
      if (!res.data) return null;
      const raw = res.data;
      const totalPlayers = raw.totalPlayers ?? 0;
      const soldPlayers = raw.soldPlayers ?? 0;
      const queuedPlayers = raw.queuedPlayers ?? raw.remainingPlayers ?? 0;
      const unsoldPlayers = raw.unsoldPlayers ?? Math.max(0, totalPlayers - soldPlayers - queuedPlayers);
      const totalSpent = raw.totalSpent ?? raw.totalAmountSpent ?? 0;
      return {
        totalPlayers,
        soldPlayers,
        queuedPlayers,
        remainingPlayers: queuedPlayers,
        unsoldPlayers,
        totalTeams: raw.totalTeams ?? 0,
        totalBudget: raw.totalBudget ?? 0,
        totalSpent,
        totalAmountSpent: totalSpent,
        totalBids: raw.totalBids ?? 0,
      };
    } catch {
      return null;
    }
  },

  // ── Conductor controls (Admin & Auctioneer) ───────────────────
  async nextPlayer(configId: number): Promise<PlayerWithBidResponse | null> {
    try {
      await api.get(`${BASE}/live/${configId}/random-player`);
      return sportsAuctionService.getCurrentPlayer(configId);
    } catch (err: any) {
      secureLog.warn('[sportsAuction] nextPlayer error', err?.message);
      throw new Error(err?.response?.data?.message || 'Failed to bring next player to the block');
    }
  },

  async markSold(configId: number, playerId: number, teamId: number): Promise<SportsAuctionPlayerResponse> {
    try {
      const res = await api.post<SportsAuctionPlayerResponse>(`${BASE}/live/sold`, {
        playerId,
        teamId,
      });
      return res.data;
    } catch (err: any) {
      secureLog.warn('[sportsAuction] markSold error', err?.message);
      throw new Error(err?.response?.data?.message || 'Failed to mark player as sold');
    }
  },

  async passUnsold(configId: number, playerId: number): Promise<SportsAuctionPlayerResponse> {
    try {
      const res = await api.post<SportsAuctionPlayerResponse>(`${BASE}/live/${playerId}/pass`);
      return res.data;
    } catch (err: any) {
      secureLog.warn('[sportsAuction] passUnsold error', err?.message);
      throw new Error(err?.response?.data?.message || 'Failed to pass player as unsold');
    }
  },

  // ── Live auction ─────────────────────────────────────────────
  async getCurrentPlayer(configId: number): Promise<PlayerWithBidResponse | null> {
    try {
      const res = await api.get<any>(`${BASE}/live/${configId}/current-player`);
      if (!res.data) return null;
      const raw = res.data;
      const playerId = raw.playerId ?? raw.player?.id;
      if (!playerId) return null;

      let bids: SportsAuctionBidResponse[] = [];
      try {
        bids = await sportsAuctionService.getBidHistory(playerId);
      } catch {}

      const player: SportsAuctionPlayerResponse = {
        id: playerId,
        configId,
        playerName: raw.playerName ?? raw.player?.playerName ?? '',
        category: raw.category ?? raw.player?.category,
        playerRole: raw.playerRole ?? raw.player?.playerRole,
        age: raw.age ?? raw.player?.age,
        basePrice: raw.basePrice ?? raw.player?.basePrice ?? 0,
        statsJson: raw.statsJson ?? raw.player?.statsJson,
        queueOrder: raw.queueOrder ?? raw.player?.queueOrder ?? 0,
        status: raw.status ?? raw.player?.status ?? 'QUEUED',
        assignedTeamId: raw.assignedTeamId ?? raw.player?.assignedTeamId,
        assignedTeamName: raw.assignedTeamName ?? raw.player?.assignedTeamName,
        soldPrice: raw.soldPrice ?? raw.player?.soldPrice,
        innings: raw.innings ?? raw.player?.innings,
        bestBowling: raw.bestBowling ?? raw.player?.bestBowling,
        cricHeroesId: raw.cricHeroesId ?? raw.player?.cricHeroesId,
        cricHeroesUrl: raw.cricHeroesUrl ?? raw.player?.cricHeroesUrl,
      };

      const resolvedTeamName = raw.currentBidTeamName ?? raw.currentTeamName ?? (bids.length > 0 ? bids[0].teamName : undefined);

      return {
        player,
        playerId,
        playerName: player.playerName,
        category: player.category,
        playerRole: player.playerRole,
        age: player.age,
        basePrice: player.basePrice,
        statsJson: player.statsJson,
        currentBid: raw.currentBid,
        nextBid: raw.nextBid,
        nextIncrement: raw.nextIncrement,
        currentTeamName: resolvedTeamName,
        currentBidTeamName: resolvedTeamName,
        status: raw.status ?? player.status,
        queueOrder: player.queueOrder,
        innings: player.innings,
        bestBowling: player.bestBowling,
        cricHeroesId: player.cricHeroesId,
        cricHeroesUrl: player.cricHeroesUrl,
        bids,
      };
    } catch {
      return null;
    }
  },

  async getPlayers(configId: number): Promise<SportsAuctionPlayerResponse[]> {
    try {
      const res = await api.get<SportsAuctionPlayerResponse[]>(`${BASE}/live/${configId}/players`);
      return res.data;
    } catch {
      return [];
    }
  },

  async getTeams(configId: number): Promise<SportsAuctionTeamResponse[]> {
    try {
      const res = await api.get<SportsAuctionTeamResponse[]>(`${BASE}/live/${configId}/teams`);
      return res.data;
    } catch {
      return [];
    }
  },

  async getBidHistory(playerId: number): Promise<SportsAuctionBidResponse[]> {
    try {
      const res = await api.get<SportsAuctionBidResponse[]>(`${BASE}/live/bids/${playerId}`);
      return res.data;
    } catch {
      return [];
    }
  },

  async placeBid(configId: number, playerId: number, bidAmount: number, teamId: number): Promise<SportsAuctionBidResponse> {
    const res = await api.post<SportsAuctionBidResponse>(`${BASE}/live/bid`, {
      configId, playerId, bidAmount, teamId,
    });
    return res.data;
  },

  // ── Teams ────────────────────────────────────────────────────
  async getTeamsByConfig(configId: number): Promise<SportsAuctionTeamResponse[]> {
    try {
      const res = await api.get<SportsAuctionTeamResponse[]>(`${BASE}/teams/${configId}`);
      return res.data;
    } catch {
      return [];
    }
  },

  async getMyCaptainRegistrations(): Promise<SportsAuctionTeamResponse[]> {
    try {
      const res = await api.get<SportsAuctionTeamResponse[]>(`${BASE}/teams/captain/mine`);
      return res.data;
    } catch {
      return [];
    }
  },

  // ── Watch ────────────────────────────────────────────────────
  async getWatchList(): Promise<number[]> {
    try {
      const res = await api.get<{ configId: number }[]>(`${BASE}/watch`);
      return res.data.map((w) => w.configId);
    } catch {
      return [];
    }
  },

  async watchAuction(configId: number): Promise<void> {
    try { await api.post(`${BASE}/watch/${configId}`); } catch { /* non-critical */ }
  },

  async unwatchAuction(configId: number): Promise<void> {
    try { await api.delete(`${BASE}/watch/${configId}`); } catch { /* non-critical */ }
  },
};
