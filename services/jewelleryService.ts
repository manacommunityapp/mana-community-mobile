import api from './apiClient';

// ── Enums & Types ──────────────────────────────────────────────
export type JewelleryCategory =
  | 'EARRINGS'
  | 'NECKLACE'
  | 'RING'
  | 'BANGLE'
  | 'BRACELET'
  | 'PENDANT'
  | 'NOSE_RING'
  | 'MAANG_TIKKA'
  | 'OTHER';

export type JewelleryMaterial = 'GOLD' | 'SILVER' | 'DIAMOND' | 'PLATINUM' | 'ARTIFICIAL' | 'GEMSTONE';
export type JewelleryStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
export type TryOnMode = 'LIVE_AR' | 'PHOTO';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface JewelleryVendor {
  id: string;
  shopName: string;
  ownerName: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  address: string;
  distance?: string;
  isVerified: boolean;
  phoneNumber?: string;
  imageUrl?: string;
  openNow?: boolean;
  openHours?: string;
}

export interface JewelleryProduct {
  id: string;
  vendorId: string;
  vendorName: string;
  sku: string;
  name: string;
  category: JewelleryCategory;
  material: JewelleryMaterial;
  purity?: string;
  netWeightG?: number;
  description?: string;
  imageUrls: string[];
  tryOnAssetUrl?: string;
  goldRatePerGram?: number;
  makingCharges?: number;
  stoneCost?: number;
  totalPrice: number;
  gstPercent?: number;
  stockQuantity: number;
  status: JewelleryStatus;
  isWishlisted?: boolean;
  tags?: string[];
  huid?: string;
}

export interface JewelleryTryOnSession {
  id: string;
  productId: string;
  mode: TryOnMode;
  platform: string;
  status: string;
  startedAt: string;
}

export interface JewelleryPhotoJob {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  outputUrl?: string;
  createdAt: string;
}

export interface JewelleryWishlistItem {
  id: string;
  productId: string;
  product: JewelleryProduct;
  savedAt: string;
}

export interface JewelleryAppointment {
  id: string;
  vendorId: string;
  vendorName: string;
  shopAddress: string;
  date: string;
  time: string;
  purpose: string;
  status: AppointmentStatus;
  notes?: string;
}

export interface CreateAppointmentRequest {
  vendorId: string;
  date: string;
  time: string;
  purpose: string;
  notes?: string;
}

export interface StartTryOnRequest {
  productId: string;
  mode: TryOnMode;
  platform: string;
}

/** Returned by POST /api/jewellery/try-on/uploads */
export interface TryOnUploadSlot {
  sessionId: string;          // UUID session for the presigned upload
  presignedUploadUrl: string; // PUT directly to this URL
  httpMethod: string;         // "PUT"
  s3Key: string;              // Pass this to submitPhotoJob
  contentType: string;        // "image/jpeg"
  expiresAt: string;
}

export const jewelleryService = {
  // ── Products ──────────────────────────────────────────────────
  async getProducts(params?: {
    category?: JewelleryCategory;
    material?: JewelleryMaterial;
    vendorId?: string;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<JewelleryProduct[]> {
    try {
      const res = await api.get<JewelleryProduct[]>('/jewellery/products', { params });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getProductById(id: string): Promise<JewelleryProduct | null> {
    try {
      const res = await api.get<JewelleryProduct>(`/jewellery/products/${id}`);
      return res.data ?? null;
    } catch {
      return null;
    }
  },

  async getFeaturedProducts(): Promise<JewelleryProduct[]> {
    try {
      const res = await api.get<JewelleryProduct[]>('/jewellery/products/featured');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  // ── Vendors ───────────────────────────────────────────────────
  async getNearbyVendors(): Promise<JewelleryVendor[]> {
    try {
      const res = await api.get<JewelleryVendor[]>('/jewellery/vendors/nearby');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getVendorById(vendorId: string): Promise<JewelleryVendor | null> {
    try {
      const res = await api.get<JewelleryVendor>(`/jewellery/vendors/${vendorId}`);
      return res.data ?? null;
    } catch {
      return null;
    }
  },

  async getVendorProducts(vendorId: string): Promise<JewelleryProduct[]> {
    try {
      const res = await api.get<JewelleryProduct[]>(`/jewellery/vendors/${vendorId}/products`);
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  // ── Virtual Try-On ─────────────────────────────────────────────
  async requestPhotoUploadUrl(): Promise<TryOnUploadSlot> {
    const res = await api.post<TryOnUploadSlot>('/jewellery/try-on/uploads');
    return res.data;
  },

  async startTryOnSession(req: StartTryOnRequest): Promise<JewelleryTryOnSession> {
    const res = await api.post<JewelleryTryOnSession>('/jewellery/try-on/sessions', req);
    return res.data;
  },

  async submitPhotoJob(sessionId: string, sourceS3Key: string): Promise<JewelleryPhotoJob> {
    const res = await api.post<JewelleryPhotoJob>(
      `/jewellery/try-on/sessions/${sessionId}/photo-jobs`,
      { sourceS3Key },
    );
    return { ...res.data, id: String(res.data.id) };
  },

  async getPhotoJobStatus(jobId: string): Promise<JewelleryPhotoJob> {
    const res = await api.get<JewelleryPhotoJob>(`/jewellery/try-on/photo-jobs/${jobId}`);
    return { ...res.data, id: String(res.data.id) };
  },

  async deletePhoto(jobId: string): Promise<void> {
    await api.delete(`/jewellery/try-on/photo-jobs/${jobId}`);
  },

  // ── Wishlist ──────────────────────────────────────────────────
  async getWishlist(): Promise<JewelleryWishlistItem[]> {
    try {
      const res = await api.get<JewelleryWishlistItem[]>('/jewellery/wishlist');
      return (res.data ?? []).map((w) => ({ ...w, id: String(w.id), productId: String(w.productId) }));
    } catch {
      return [];
    }
  },

  async addToWishlist(productId: string): Promise<void> {
    await api.post('/jewellery/wishlist', { productId: Number(productId) });
  },

  async removeFromWishlist(productId: string): Promise<void> {
    await api.delete(`/jewellery/wishlist/${productId}`);
  },

  /** Convenience toggle used by product detail and vendor storefront. */
  async toggleWishlist(product: JewelleryProduct): Promise<void> {
    if (product.isWishlisted) {
      await jewelleryService.removeFromWishlist(product.id);
    } else {
      await jewelleryService.addToWishlist(product.id);
    }
  },

  // ── Appointments ──────────────────────────────────────────────
  async bookAppointment(req: CreateAppointmentRequest): Promise<JewelleryAppointment> {
    const res = await api.post<JewelleryAppointment>('/jewellery/appointments', req);
    return { ...res.data, id: String(res.data.id), vendorId: String(res.data.vendorId) };
  },

  async getMyAppointments(): Promise<JewelleryAppointment[]> {
    try {
      const res = await api.get<JewelleryAppointment[]>('/jewellery/appointments');
      return (res.data ?? []).map((a) => ({ ...a, id: String(a.id), vendorId: String(a.vendorId) }));
    } catch {
      return [];
    }
  },

  async cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
    await api.patch(`/jewellery/appointments/${appointmentId}/cancel`, { reason });
  },
};
