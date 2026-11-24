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
export type JewelleryStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED' | 'DRAFT';
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
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  date: string;
  time: string;
  purpose: string;
  status: AppointmentStatus;
  notes?: string;
}

export interface RegisterVendorRequest {
  shopName: string;
  ownerName: string;
  phoneNumber: string;
  email?: string;
  address: string;
  serviceAreas?: string;
  specialties?: string;
  gstNumber?: string;
  panNumber?: string;
  bisHallmarkLicense?: string;
}

export interface CreateJewelleryProductRequest {
  sku?: string;
  name: string;
  category: JewelleryCategory;
  material: JewelleryMaterial;
  purity?: string;
  netWeightG?: number;
  description?: string;
  huid?: string;
  tags?: string;
  imageUrls?: string[];
  tryOnAssetUrl?: string;
  goldRatePerGram?: number;
  makingCharges?: number;
  stoneCost?: number;
  totalPrice: number;
  gstPercent?: number;
  stockQuantity: number;
  status?: JewelleryStatus;
  dropLengthMm?: number;
  sizeMm?: number;
  necklaceLengthIn?: number;
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

export interface FitProfile {
  faceShape: 'round' | 'oval' | 'square' | 'heart' | 'oblong' | 'unknown';
  widthRatio?: number;
  neckRatio?: number;
  confidence: number;
}

export interface RecommendationItem {
  productId: number;
  name: string;
  price: number;
  score: number;
  reason: string;
}

// ── Normalizers (exported for unit tests) ───────────────────────

export function unwrapPaginatedList<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray(data.content)) {
    return data.content;
  }
  return [];
}

export function normalizeJewelleryVendor(raw: any): JewelleryVendor {
  let specialties: string[] = [];
  if (Array.isArray(raw?.specialties)) {
    specialties = raw.specialties.map((s: any) => String(s).trim()).filter(Boolean);
  } else if (typeof raw?.specialties === 'string' && raw.specialties.trim()) {
    specialties = raw.specialties
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  return {
    id: String(raw?.id ?? ''),
    shopName: raw?.shopName ?? '',
    ownerName: raw?.ownerName ?? '',
    rating: Number(raw?.rating ?? 0),
    reviewCount: Number(raw?.reviewCount ?? 0),
    specialties,
    address: raw?.address ?? '',
    distance: raw?.distance ?? undefined,
    isVerified: Boolean(raw?.isVerified),
    phoneNumber: raw?.phoneNumber ?? undefined,
    imageUrl: raw?.imageUrl ?? undefined,
    openNow: raw?.openNow != null ? Boolean(raw.openNow) : undefined,
    openHours: raw?.openHours ?? undefined,
  };
}

export function normalizeJewelleryProduct(raw: any): JewelleryProduct {
  let tags: string[] | undefined = undefined;
  if (Array.isArray(raw?.tags)) {
    tags = raw.tags.map((t: any) => String(t).trim()).filter(Boolean);
  } else if (typeof raw?.tags === 'string' && raw.tags.trim()) {
    tags = raw.tags
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);
  }

  return {
    id: String(raw?.id ?? ''),
    vendorId: String(raw?.vendorId ?? ''),
    vendorName: raw?.vendorName ?? '',
    sku: raw?.sku ?? '',
    name: raw?.name ?? '',
    category: (raw?.category ?? 'OTHER') as JewelleryCategory,
    material: (raw?.material ?? 'GOLD') as JewelleryMaterial,
    purity: raw?.purity ?? undefined,
    netWeightG: raw?.netWeightG != null ? Number(raw.netWeightG) : undefined,
    description: raw?.description ?? undefined,
    imageUrls: Array.isArray(raw?.imageUrls) ? raw.imageUrls : [],
    tryOnAssetUrl: raw?.tryOnAssetUrl ?? undefined,
    goldRatePerGram: raw?.goldRatePerGram != null ? Number(raw.goldRatePerGram) : undefined,
    makingCharges: raw?.makingCharges != null ? Number(raw.makingCharges) : undefined,
    stoneCost: raw?.stoneCost != null ? Number(raw.stoneCost) : undefined,
    totalPrice: Number(raw?.totalPrice ?? 0),
    gstPercent: raw?.gstPercent != null ? Number(raw.gstPercent) : undefined,
    stockQuantity: Number(raw?.stockQuantity ?? 0),
    status: (raw?.status ?? 'ACTIVE') as JewelleryStatus,
    isWishlisted: Boolean(raw?.isWishlisted),
    tags,
    huid: raw?.huid ?? undefined,
  };
}

export const jewelleryService = {
  // ── Products ──────────────────────────────────────────────────
  async getProducts(params?: {
    category?: JewelleryCategory;
    material?: JewelleryMaterial;
    vendorId?: string;
    search?: string;
    q?: string;
    page?: number;
    size?: number;
  }): Promise<JewelleryProduct[]> {
    try {
      const queryParams = params
        ? {
            category: params.category,
            material: params.material,
            vendorId: params.vendorId,
            q: params.q ?? params.search ?? undefined,
            search: params.search ?? params.q ?? undefined,
            page: params.page,
            size: params.size,
          }
        : undefined;
      const res = await api.get<any>('/jewellery/products', { params: queryParams });
      return unwrapPaginatedList(res.data).map(normalizeJewelleryProduct);
    } catch {
      return [];
    }
  },

  async getProductById(id: string): Promise<JewelleryProduct | null> {
    try {
      const res = await api.get<any>(`/jewellery/products/${id}`);
      return res.data && typeof res.data === 'object' ? normalizeJewelleryProduct(res.data) : null;
    } catch {
      return null;
    }
  },

  async getFeaturedProducts(): Promise<JewelleryProduct[]> {
    try {
      const res = await api.get<any>('/jewellery/products/featured');
      return unwrapPaginatedList(res.data).map(normalizeJewelleryProduct);
    } catch {
      return [];
    }
  },

  // ── Vendors ───────────────────────────────────────────────────
  async getNearbyVendors(): Promise<JewelleryVendor[]> {
    try {
      const res = await api.get<any>('/jewellery/vendors/nearby');
      return unwrapPaginatedList(res.data).map(normalizeJewelleryVendor);
    } catch {
      return [];
    }
  },

  async getVendorById(vendorId: string): Promise<JewelleryVendor | null> {
    try {
      const res = await api.get<any>(`/jewellery/vendors/${vendorId}`);
      return res.data && typeof res.data === 'object' ? normalizeJewelleryVendor(res.data) : null;
    } catch {
      return null;
    }
  },

  async getVendorProducts(vendorId: string): Promise<JewelleryProduct[]> {
    try {
      const res = await api.get<any>(`/jewellery/vendors/${vendorId}/products`);
      return unwrapPaginatedList(res.data).map(normalizeJewelleryProduct);
    } catch {
      return [];
    }
  },

  // ── Merchant / Jeweller Console ───────────────────────────────
  async getMyVendorProfile(): Promise<JewelleryVendor | null> {
    try {
      const res = await api.get<any>('/jewellery/vendors/me');
      return res.data && typeof res.data === 'object' ? normalizeJewelleryVendor(res.data) : null;
    } catch {
      return null;
    }
  },

  async registerVendor(req: RegisterVendorRequest): Promise<JewelleryVendor> {
    const res = await api.post<any>('/jewellery/vendors/register', req);
    return normalizeJewelleryVendor(res.data);
  },

  async createProduct(req: CreateJewelleryProductRequest): Promise<JewelleryProduct> {
    const res = await api.post<any>('/jewellery/products', req);
    return normalizeJewelleryProduct(res.data);
  },

  async updateProductStatus(productId: string, status: JewelleryStatus): Promise<JewelleryProduct> {
    const res = await api.patch<any>(`/jewellery/products/${productId}/status`, { status });
    return normalizeJewelleryProduct(res.data);
  },

  async getVendorAppointments(): Promise<JewelleryAppointment[]> {
    try {
      const res = await api.get<any>('/jewellery/vendor/appointments');
      return unwrapPaginatedList(res.data).map((a: any) => ({
        ...a,
        id: String(a.id),
        vendorId: String(a.vendorId),
        customerId: a.customerId != null ? String(a.customerId) : undefined,
      }));
    } catch {
      return [];
    }
  },

  async updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): Promise<void> {
    await api.patch(`/jewellery/vendor/appointments/${appointmentId}/status`, { status });
  },

  // ── Virtual Try-On ─────────────────────────────────────────────
  async requestPhotoUploadUrl(): Promise<TryOnUploadSlot> {
    const res = await api.post<TryOnUploadSlot>('/jewellery/try-on/uploads');
    return res.data;
  },

  async startTryOnSession(req: StartTryOnRequest): Promise<JewelleryTryOnSession> {
    const res = await api.post<any>('/jewellery/try-on/sessions', {
      ...req,
      productId: Number(req.productId),
    });
    return {
      ...res.data,
      id: String(res.data.id),
      productId: String(res.data.productId),
    };
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
      const res = await api.get<any>('/jewellery/wishlist');
      return unwrapPaginatedList(res.data).map((w: any) => ({
        ...w,
        id: String(w.id),
        productId: String(w.productId),
        product: w.product ? normalizeJewelleryProduct(w.product) : w.product,
      }));
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
    const res = await api.post<any>('/jewellery/appointments', {
      ...req,
      vendorId: Number(req.vendorId),
    });
    return { ...res.data, id: String(res.data.id), vendorId: String(res.data.vendorId) };
  },

  async getMyAppointments(): Promise<JewelleryAppointment[]> {
    try {
      const res = await api.get<any>('/jewellery/appointments');
      return unwrapPaginatedList(res.data).map((a: any) => ({
        ...a,
        id: String(a.id),
        vendorId: String(a.vendorId),
      }));
    } catch {
      return [];
    }
  },

  async cancelAppointment(appointmentId: string, reason?: string): Promise<void> {
    await api.patch(`/jewellery/appointments/${appointmentId}/cancel`, { reason });
  },

  async getAvailableSlots(vendorId: string, date?: string): Promise<string[]> {
    try {
      const res = await api.get<any>(`/jewellery/vendors/${vendorId}/available-slots`, {
        params: date ? { date } : undefined,
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return ['10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
    }
  },

  // ── Fit Profile & Recommendations ──────────────────────────────
  async saveFitProfile(profile: FitProfile): Promise<void> {
    await api.put('/jewellery/fit-profile', profile);
  },

  async getFitProfile(): Promise<FitProfile | null> {
    try {
      const res = await api.get<any>('/jewellery/fit-profile');
      if (!res.data || typeof res.data !== 'object') return null;
      return {
        faceShape: res.data.faceShape ?? 'unknown',
        widthRatio: res.data.widthRatio != null ? Number(res.data.widthRatio) : undefined,
        neckRatio: res.data.neckRatio != null ? Number(res.data.neckRatio) : undefined,
        confidence: Number(res.data.confidence ?? 0.9),
      };
    } catch {
      return null;
    }
  },

  async deleteFitProfile(): Promise<void> {
    await api.delete('/jewellery/fit-profile');
  },

  async getRecommendations(category = 'EARRINGS', limit = 12): Promise<RecommendationItem[]> {
    try {
      const res = await api.get<any>('/jewellery/recommendations', {
        params: { category, limit },
      });
      return unwrapPaginatedList(res.data).map((item: any) => ({
        productId: Number(item.productId),
        name: item.name ?? '',
        price: Number(item.price ?? 0),
        score: Number(item.score ?? 0),
        reason: item.reason ?? '',
      }));
    } catch {
      return [];
    }
  },
};
