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
      return res.data;
    } catch (err: any) {
      secureLog.warn('[sportsAuction] getMyConfigs failed', err?.message);
      return [];
    }
  },

  async getConfig(id: number): Promise<SportsAuctionConfigResponse> {
    const res = await api.get<SportsAuctionConfigResponse>(`${BASE}/config/${id}`);
    return res.data;
  },

  async getStats(configId: number): Promise<SportsAuctionStatsResponse | null> {
    try {
      const res = await api.get<SportsAuctionStatsResponse>(`${BASE}/config/${configId}/stats`);
      return res.data;
    } catch {
      return null;
    }
  },

  // ── Live auction ─────────────────────────────────────────────
  async getCurrentPlayer(configId: number): Promise<PlayerWithBidResponse | null> {
    try {
      const res = await api.get<PlayerWithBidResponse>(`${BASE}/live/${configId}/current-player`);
      return res.data;
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
