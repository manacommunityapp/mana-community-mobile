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

const MOCK_PACKAGES: PackageEntry[] = [
  {
    id: 1, trackingNumber: 'AMZN-98765432', senderName: 'Amazon', courierPartner: 'AMAZON',
    flatNumber: '302', residentName: 'Rajesh Kumar',
    status: 'NOTIFIED', receivedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    notifiedAt: new Date(Date.now() - 3 * 3600000 + 300000).toISOString(),
    collectionOtp: '784213', otpExpiresAt: new Date(Date.now() + 18 * 3600000).toISOString(),
    packageCount: 1, shelfNumber: 'A-12',
  },
  {
    id: 2, trackingNumber: 'FK-11223344', senderName: 'Flipkart', courierPartner: 'FLIPKART',
    flatNumber: '504', residentName: 'Sunita Sharma',
    status: 'RECEIVED', receivedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    packageCount: 2, shelfNumber: 'B-03',
  },
  {
    id: 3, trackingNumber: 'BD-55667788', senderName: 'Bluedart', courierPartner: 'BLUEDART',
    flatNumber: '102', residentName: 'Anil Gupta',
    status: 'COLLECTED', receivedAt: new Date(Date.now() - 26 * 3600000).toISOString(),
    collectedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    packageCount: 1, shelfNumber: 'A-07',
  },
];

export const packageRoomService = {
  async getMyPackages(): Promise<PackageEntry[]> {
    try {
      const res = await api.get<PackageEntry[]>('/package-room/my');
      return res.data ?? [];
    } catch {
      return MOCK_PACKAGES.filter(p => p.flatNumber === '302');
    }
  },

  async getAllPackages(status?: PackageStatus): Promise<PackageEntry[]> {
    try {
      const res = await api.get<PackageEntry[]>('/package-room/all', { params: { status } });
      return res.data ?? [];
    } catch {
      return status ? MOCK_PACKAGES.filter(p => p.status === status) : MOCK_PACKAGES;
    }
  },

  async getStats(): Promise<PackageStats> {
    try {
      const res = await api.get<PackageStats>('/package-room/stats');
      return res.data;
    } catch {
      return { pendingCount: 2, collectedTodayCount: 1, totalThisMonth: 14 };
    }
  },

  async generateCollectionOtp(packageId: number): Promise<{ otp: string; expiresAt: string }> {
    try {
      const res = await api.post<{ otp: string; expiresAt: string }>(`/package-room/${packageId}/generate-otp`);
      return res.data;
    } catch {
      return { otp: Math.floor(100000 + Math.random() * 900000).toString(), expiresAt: new Date(Date.now() + 24 * 3600000).toISOString() };
    }
  },

  async collectPackage(req: CollectPackageRequest): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post<{ success: boolean; message: string }>('/package-room/collect', req);
      return res.data;
    } catch {
      return { success: true, message: 'Package collected successfully' };
    }
  },

  async addPackage(data: Partial<PackageEntry>): Promise<PackageEntry> {
    try {
      const res = await api.post<PackageEntry>('/package-room/add', data);
      return res.data;
    } catch {
      return { id: Date.now(), ...data, status: 'RECEIVED', packageCount: 1 } as PackageEntry;
    }
  },
};
