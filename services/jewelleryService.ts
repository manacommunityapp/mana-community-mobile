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
  async startTryOnSession(req: StartTryOnRequest): Promise<JewelleryTryOnSession> {
    const res = await api.post<JewelleryTryOnSession>('/jewellery/tryon/sessions', req);
    return res.data;
  },

  async submitPhotoJob(formData: FormData): Promise<JewelleryPhotoJob> {
    const res = await api.post<JewelleryPhotoJob>('/jewellery/tryon/photo-jobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async getPhotoJobStatus(jobId: string): Promise<JewelleryPhotoJob> {
    const res = await api.get<JewelleryPhotoJob>(`/jewellery/tryon/photo-jobs/${jobId}`);
    return res.data;
  },

  async deletePhoto(photoId: string): Promise<void> {
    await api.delete(`/jewellery/tryon/photos/${photoId}`);
  },

  // ── Wishlist ──────────────────────────────────────────────────
  async getWishlist(): Promise<JewelleryWishlistItem[]> {
    try {
      const res = await api.get<JewelleryWishlistItem[]>('/jewellery/wishlist');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async addToWishlist(productId: string): Promise<void> {
    await api.post('/jewellery/wishlist', { productId });
  },

  async removeFromWishlist(productId: string): Promise<void> {
    await api.delete(`/jewellery/wishlist/${productId}`);
  },

  // ── Appointments ──────────────────────────────────────────────
  async bookAppointment(req: CreateAppointmentRequest): Promise<JewelleryAppointment> {
    const res = await api.post<JewelleryAppointment>('/jewellery/appointments', req);
    return res.data;
  },

  async getMyAppointments(): Promise<JewelleryAppointment[]> {
    try {
      const res = await api.get<JewelleryAppointment[]>('/jewellery/appointments/my');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async cancelAppointment(appointmentId: string): Promise<void> {
    await api.put(`/jewellery/appointments/${appointmentId}/cancel`);
  },
};
