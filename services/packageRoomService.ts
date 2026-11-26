import api from './apiClient';

export type PackageStatus = 'RECEIVED' | 'NOTIFIED' | 'COLLECTED' | 'RETURNED' | 'DISPUTED';
export type CourierPartner = 'AMAZON' | 'FLIPKART' | 'BLUEDART' | 'DTDC' | 'EKART' | 'DELHIVERY' | 'FEDEX' | 'OTHER';

export interface PackageEntry {
  id: number;
  trackingNumber?: string;
  senderName?: string;
  courierPartner: CourierPartner | string;
  flatNumber: string;
  residentName?: string;
  status: PackageStatus;
  receivedAt: string;
  notifiedAt?: string;
  collectedAt?: string;
  collectedByName?: string;
  collectionOtp?: string;
  otpExpiresAt?: string;
  description?: string;
  packageCount: number;
  photoUrl?: string;
  shelfNumber?: string;
}

export interface CollectPackageRequest {
  packageId: number;
  otp: string;
}

export interface PackageStats {
  pendingCount: number;
  collectedTodayCount: number;
  totalThisMonth: number;
}

export const packageRoomService = {
  async getMyPackages(): Promise<PackageEntry[]> {
    try {
      const res = await api.get<PackageEntry[]>('/parcels/my');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    try {
      const res = await api.get<PackageEntry[]>('/parcels');
      if (Array.isArray(res.data)) return res.data;
    } catch {}
    return [];
  },

  async getAllPackages(status?: PackageStatus): Promise<PackageEntry[]> {
    try {
      const res = await api.get<PackageEntry[]>('/parcels', { params: { status } });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getStats(): Promise<PackageStats> {
    try {
      const res = await api.get<PackageStats>('/parcels/stats');
      return res.data;
    } catch {
      return { pendingCount: 0, collectedTodayCount: 0, totalThisMonth: 0 };
    }
  },

  async generateCollectionOtp(packageId: number): Promise<{ otp: string; expiresAt: string }> {
    try {
      const res = await api.post<{ otp: string; expiresAt: string }>(`/parcels/${packageId}/generate-otp`);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to generate pickup OTP');
    }
  },

  async collectPackage(req: CollectPackageRequest): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post<{ success: boolean; message: string }>(`/parcels/${req.packageId}/collect`, { otp: req.otp });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to collect parcel');
    }
  },

  async addPackage(data: Partial<PackageEntry>): Promise<PackageEntry> {
    try {
      const res = await api.post<PackageEntry>('/parcels', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to register parcel');
    }
  },
};
