import api from './apiClient';
import type { AuctionDto, BidDto, PageResponse } from '@/types/api';

const EMPTY_PAGE: PageResponse<any> = { content: [], totalElements: 0, totalPages: 0, page: 0, number: 0, size: 20 };

export const auctionService = {
  async getAuctions(
    status: 'LIVE' | 'UPCOMING' | 'ENDED' | 'ALL' = 'ALL',
    page = 0,
  ): Promise<PageResponse<AuctionDto>> {
    try {
      const res = await api.get<PageResponse<AuctionDto>>('/auctions', {
        params: { status, page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async getAuction(id: number): Promise<AuctionDto> {
    const res = await api.get<AuctionDto>(`/auctions/${id}`);
    return res.data;
  },

  async getBids(auctionId: number, page = 0): Promise<PageResponse<BidDto>> {
    try {
      const res = await api.get<PageResponse<BidDto>>(`/auctions/${auctionId}/bids`, {
        params: { page, size: 50, sort: 'createdAt,desc' },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async placeBid(auctionId: number, amount: number): Promise<BidDto> {
    try {
      const res = await api.post<BidDto>(`/auctions/${auctionId}/bids`, { amount });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to place bid. Please try again.');
    }
  },

  async watchAuction(id: number): Promise<void> {
    try {
      await api.post(`/auctions/${id}/watch`);
    } catch {
      // Watch failures are non-critical
    }
  },

  async unwatchAuction(id: number): Promise<void> {
    try {
      await api.delete(`/auctions/${id}/watch`);
    } catch {
      // Unwatch failures are non-critical
    }
  },

  async getMyAuctions(page = 0): Promise<PageResponse<AuctionDto>> {
    try {
      const res = await api.get<PageResponse<AuctionDto>>('/auctions/my', {
        params: { page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async getMyBids(page = 0): Promise<PageResponse<AuctionDto>> {
    try {
      const res = await api.get<PageResponse<AuctionDto>>('/auctions/my-bids', {
        params: { page, size: 20 },
      });
      return res.data;
    } catch {
      return EMPTY_PAGE;
    }
  },

  async createAuction(data: Partial<AuctionDto>): Promise<AuctionDto> {
    try {
      const res = await api.post<AuctionDto>('/auctions', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to create auction. Please try again.');
    }
  },
};
