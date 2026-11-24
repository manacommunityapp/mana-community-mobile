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
    const res = await api.get<PackageEntry[]>('/package-room/my');
    return res.data ?? [];
  },

  async getAllPackages(status?: PackageStatus): Promise<PackageEntry[]> {
    const res = await api.get<PackageEntry[]>('/package-room/all', { params: { status } });
    return res.data ?? [];
  },

  async getStats(): Promise<PackageStats> {
    const res = await api.get<PackageStats>('/package-room/stats');
    return res.data;
  },

  async generateCollectionOtp(packageId: number): Promise<{ otp: string; expiresAt: string }> {
    const res = await api.post<{ otp: string; expiresAt: string }>(`/package-room/${packageId}/generate-otp`);
    return res.data;
  },

  async collectPackage(req: CollectPackageRequest): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/package-room/collect', req);
    return res.data;
  },

  async addPackage(data: Partial<PackageEntry>): Promise<PackageEntry> {
    const res = await api.post<PackageEntry>('/package-room/add', data);
    return res.data;
  },
};
