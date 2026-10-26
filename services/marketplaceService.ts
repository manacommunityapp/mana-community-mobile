import api from './apiClient';
import { mediaService } from './mediaService';
import { inferMimeType, verifyServerUploadResponse } from '@/security';
import type {
  MarketplaceListingDto, CreateListingRequest,
  MarketplaceFilters, PageResponse,
} from '@/types/api';

/**
 * Marketplace service — all URLs aligned to the actual backend (PR #167 / develop).
 *
 * Backend base paths:
 *   Listings  → /api/marketplace/listings
 *   Wishlist  → /api/marketplace/wishlist
 *   Images    → /api/media/upload  (shared MediaController)
 *   Reports   → /api/marketplace/admin/moderation/report
 */
export const marketplaceService = {

  // ── Browse ───────────────────────────────────────────────────
  /**
   * GET /api/marketplace/listings
   * Params: type, category, search, minPrice, maxPrice, freeOnly, page, size
   *
   * The backend supports listing types beyond SELL:
   *   SELL | RENT | FOOD | SERVICE | DONATION | BARTER
   * Pass type=SELL to limit to buy/sell listings (mobile default).
   */
  async getListings(
    filters: MarketplaceFilters = {},
    page = 0,
  ): Promise<PageResponse<MarketplaceListingDto>> {
    try {
      const res = await api.get<PageResponse<MarketplaceListingDto>>(
        '/marketplace/listings',
        { params: { ...filters, page, size: 20 } },
      );
      if (res.data?.content && res.data.content.length > 0) {
        return res.data;
      }
    } catch {
      // Fallback to sample listings for development/preview
    }
    return getFallbackListings(filters, page);
  },

  async getListing(id: number): Promise<MarketplaceListingDto> {
    try {
      const res = await api.get<MarketplaceListingDto>(`/marketplace/listings/${id}`);
      if (res.data) return res.data;
    } catch {
      // Fallback
    }
    const found = FALLBACK_LISTINGS.find((l) => l.id === id);
    return found ?? FALLBACK_LISTINGS[0];
  },

  // ── My Listings ──────────────────────────────────────────────
  /**
   * GET /api/marketplace/listings/mine
   * Param: status (ACTIVE | SOLD | EXPIRED — omit for all)
   */
  async getMyListings(
    status?: 'ACTIVE' | 'SOLD' | 'EXPIRED',
    page = 0,
  ): Promise<PageResponse<MarketplaceListingDto>> {
    const res = await api.get<PageResponse<MarketplaceListingDto>>(
      '/marketplace/listings/mine',
      { params: { ...(status ? { status } : {}), page, size: 20 } },
    );
    return res.data;
  },

  // ── CRUD ─────────────────────────────────────────────────────
  async createListing(data: CreateListingRequest): Promise<MarketplaceListingDto> {
    const res = await api.post<MarketplaceListingDto>('/marketplace/listings', data);
    return res.data;
  },

  async updateListing(
    id: number,
    data: Partial<CreateListingRequest>,
  ): Promise<MarketplaceListingDto> {
    const res = await api.put<MarketplaceListingDto>(`/marketplace/listings/${id}`, data);
    return res.data;
  },

  async deleteListing(id: number): Promise<void> {
    await api.delete(`/marketplace/listings/${id}`);
  },

  /**
   * PUT /api/marketplace/listings/{id}/status
   * Body: { status: "SOLD" }
   * Backend supports: ACTIVE | SOLD | RESERVED | EXPIRED | UNDER_REVIEW
   */
  async markAsSold(id: number): Promise<void> {
    await api.put(`/marketplace/listings/${id}/status`, { status: 'SOLD' });
  },

  // ── Wishlist ─────────────────────────────────────────────────
  /**
   * GET /api/marketplace/wishlist
   * Returns paginated saved listings for the current user.
   */
  async getSavedListings(page = 0): Promise<PageResponse<MarketplaceListingDto>> {
    const res = await api.get<PageResponse<MarketplaceListingDto>>(
      '/marketplace/wishlist',
      { params: { page, size: 20 } },
    );
    return res.data;
  },

  /**
   * GET /api/marketplace/wishlist/check/{listingId}
   * Returns { isWishlisted: boolean } — used to set the heart icon state.
   */
  async isListingSaved(id: number): Promise<boolean> {
    const res = await api.get<{ isWishlisted: boolean }>(
      `/marketplace/wishlist/check/${id}`,
    );
    return res.data.isWishlisted;
  },

  /**
   * POST /api/marketplace/wishlist/toggle/{listingId}
   * Single idempotent toggle — adds if not saved, removes if already saved.
   * Replaces the separate save/unsave endpoints the mobile previously used.
   */
  async toggleSave(id: number): Promise<void> {
    await api.post(`/marketplace/wishlist/toggle/${id}`);
  },

  /**
   * Convenience aliases kept for backward-compat with screens that still
   * call saveListing() / unsaveListing() separately.
   * Both now route to the same toggle endpoint.
   */
  async saveListing(id: number): Promise<void> {
    return this.toggleSave(id);
  },

  async unsaveListing(id: number): Promise<void> {
    return this.toggleSave(id);
  },

  // ── Image upload ─────────────────────────────────────────────
  /**
   * POST /api/media/upload  (shared MediaController, multipart/form-data)
   * Returns { url: string } — pass the URL into CreateListingRequest.imageUrls[].
   *
   * Call this once per image BEFORE creating or updating the listing.
   */
  async uploadImage(
    localUri: string,
    declaredMimeType?: string,
    onProgress?: (pct: number) => void,
  ): Promise<string> {
    const fileName = localUri.split('/').pop() ?? 'image.jpg';
    const mimeType = inferMimeType(localUri, declaredMimeType);

    try {
      const media = await mediaService.uploadMedia(
        { uri: localUri, name: fileName, type: mimeType },
        { module: 'MARKETPLACE', moduleId: 'listing', communityId: 1, mediaType: 'IMAGE' },
      );
      if (media?.url) return media.url;
    } catch (e) {
      console.warn('Presigned upload failed; falling back to direct multipart', e);
    }

    const form = new FormData();
    form.append('file', { uri: localUri, name: fileName, type: mimeType } as any);

    const res = await api.post<Record<string, unknown>>(
      '/media/upload',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      },
    );
    // Verifies server-side acceptance and extracts confirmed URL
    return verifyServerUploadResponse(res.data);
  },

  // ── Report ───────────────────────────────────────────────────
  /**
   * POST /api/marketplace/admin/moderation/report
   * Body: { listingId, reason }
   */
  async reportListing(id: number, reason: string): Promise<void> {
    await api.post('/marketplace/admin/moderation/report', { listingId: id, reason });
  },

  // ── Bargaining / Offers ──────────────────────────────────────
  async submitOffer(data: { listingId: number; offerPrice: number; note?: string }): Promise<any> {
    const res = await api.post('/marketplace/offers', data);
    return res.data;
  },

  async getOffersForMyListings(): Promise<any[]> {
    const res = await api.get('/marketplace/offers/received');
    return res.data;
  },

  async getMySentOffers(): Promise<any[]> {
    const res = await api.get('/marketplace/offers/sent');
    return res.data;
  },

  async respondToOffer(offerId: number, status: 'ACCEPTED' | 'DECLINED', counterPrice?: number): Promise<any> {
    const res = await api.put(`/marketplace/offers/${offerId}/respond`, { status, counterPrice });
    return res.data;
  },

  // ── Orders & Gate Handover ───────────────────────────────────
  async getMyOrders(page = 0): Promise<PageResponse<any>> {
    const res = await api.get<PageResponse<any>>('/marketplace/orders/mine', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async getSellerOrders(page = 0): Promise<PageResponse<any>> {
    const res = await api.get<PageResponse<any>>('/marketplace/orders/selling', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async updateOrderStatus(orderId: number, status: string): Promise<any> {
    const res = await api.put(`/marketplace/orders/${orderId}/status?status=${status}`, {});
    return res.data;
  },

  async verifyPickupOtp(orderId: number, otp: string): Promise<any> {
    const res = await api.post(`/marketplace/orders/${orderId}/verify-otp?otp=${otp}`, {});
    return res.data;
  },

  async cancelOrder(orderId: number): Promise<void> {
    await api.put(`/marketplace/orders/${orderId}/cancel`, {});
  },
};

const FALLBACK_LISTINGS: MarketplaceListingDto[] = [];

function getFallbackListings(
  filters: MarketplaceFilters = {},
  page = 0,
): PageResponse<MarketplaceListingDto> {
  return {
    content: [],
    page,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  };
}
