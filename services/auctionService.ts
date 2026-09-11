import api from './apiClient';
import type { AuctionDto, BidDto, PageResponse } from '@/types/api';

export const auctionService = {
  // ── Listings ─────────────────────────────────────────────────
  async getAuctions(
    status: 'LIVE' | 'UPCOMING' | 'ENDED' | 'ALL' = 'ALL',
    page = 0,
  ): Promise<PageResponse<AuctionDto>> {
    const res = await api.get<PageResponse<AuctionDto>>('/auctions', {
      params: { status, page, size: 20 },
    });
    return res.data;
  },

  async getAuction(id: number): Promise<AuctionDto> {
    const res = await api.get<AuctionDto>(`/auctions/${id}`);
    return res.data;
  },

  // ── Bid history ───────────────────────────────────────────────
  async getBids(auctionId: number, page = 0): Promise<PageResponse<BidDto>> {
    const res = await api.get<PageResponse<BidDto>>(`/auctions/${auctionId}/bids`, {
      params: { page, size: 50, sort: 'createdAt,desc' },
    });
    return res.data;
  },

  // ── Place bid (fallback REST — prefer STOMP) ──────────────────
  async placeBid(auctionId: number, amount: number): Promise<BidDto> {
    const res = await api.post<BidDto>(`/auctions/${auctionId}/bids`, { amount });
    return res.data;
  },

  // ── Watch list ────────────────────────────────────────────────
  async watchAuction(id: number): Promise<void> {
    await api.post(`/auctions/${id}/watch`);
  },

  async unwatchAuction(id: number): Promise<void> {
    await api.delete(`/auctions/${id}/watch`);
  },

  // ── My auctions ───────────────────────────────────────────────
  async getMyAuctions(page = 0): Promise<PageResponse<AuctionDto>> {
    const res = await api.get<PageResponse<AuctionDto>>('/auctions/my', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async getMyBids(page = 0): Promise<PageResponse<AuctionDto>> {
    const res = await api.get<PageResponse<AuctionDto>>('/auctions/my-bids', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  // ── Create (admin) ────────────────────────────────────────────
  async createAuction(data: Partial<AuctionDto>): Promise<AuctionDto> {
    const res = await api.post<AuctionDto>('/auctions', data);
    return res.data;
  },
};
