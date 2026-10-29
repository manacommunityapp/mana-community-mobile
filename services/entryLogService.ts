import api from './apiClient';

export type EntryLogType = 'RESIDENT' | 'VISITOR' | 'VEHICLE' | 'STAFF' | 'DELIVERY';
export type EntryLogAction = 'ENTRY' | 'EXIT';

export interface EntryLogEntry {
  id: number;
  type: EntryLogType;
  action: EntryLogAction;
  personName: string;
  vehicleNumber?: string;
  flatNumber?: string;
  gate: string;
  timestamp: string;
  guardName?: string;
  passCode?: string;
  purpose?: string;
  photoUrl?: string;
  verificationMethod?: 'OTP' | 'FACE' | 'MANUAL' | 'QR' | 'VEHICLE';
}

export interface EntryLogFilter {
  type?: EntryLogType;
  action?: EntryLogAction;
  dateFrom?: string;
  dateTo?: string;
  gate?: string;
  page?: number;
  size?: number;
}

export interface EntryLogPage {
  content: EntryLogEntry[];
  totalElements: number;
  totalPages: number;
  page: number;
}

const MOCK_LOGS: EntryLogEntry[] = [
  { id: 1, type: 'VISITOR', action: 'ENTRY', personName: 'Swiggy Delivery', gate: 'Main Gate', timestamp: new Date(Date.now() - 30 * 60000).toISOString(), passCode: 'MANA-5501', purpose: 'Food Delivery', verificationMethod: 'OTP' },
  { id: 2, type: 'RESIDENT', action: 'EXIT', personName: 'Rajesh Kumar', flatNumber: '302', gate: 'Main Gate', timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), verificationMethod: 'FACE' },
  { id: 3, type: 'VEHICLE', action: 'ENTRY', personName: 'Rajan (Driver)', vehicleNumber: 'KA-01-AB-1234', flatNumber: '302', gate: 'Parking Gate', timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), verificationMethod: 'VEHICLE' },
  { id: 4, type: 'RESIDENT', action: 'ENTRY', personName: 'Rajesh Kumar', flatNumber: '302', gate: 'Main Gate', timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), verificationMethod: 'FACE' },
  { id: 5, type: 'STAFF', action: 'ENTRY', personName: 'Kamla (Maid)', flatNumber: '302', gate: 'Staff Gate', timestamp: new Date(Date.now() - 9 * 3600000).toISOString(), verificationMethod: 'QR' },
  { id: 6, type: 'VISITOR', action: 'EXIT', personName: 'Amazon Courier', gate: 'Main Gate', timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), passCode: 'MANA-5498', verificationMethod: 'MANUAL' },
];

export const entryLogService = {
  async getMyEntryLog(filter?: EntryLogFilter): Promise<EntryLogPage> {
    try {
      const res = await api.get<EntryLogPage>('/access/my-log', { params: filter });
      return res.data;
    } catch {
      const filtered = MOCK_LOGS.filter(l => {
        if (filter?.type && l.type !== filter.type) return false;
        if (filter?.action && l.action !== filter.action) return false;
        return true;
      });
      return { content: filtered, totalElements: filtered.length, totalPages: 1, page: 0 };
    }
  },

  async getSocietyLog(filter?: EntryLogFilter): Promise<EntryLogPage> {
    try {
      const res = await api.get<EntryLogPage>('/access/society-log', { params: filter });
      return res.data;
    } catch {
      return { content: MOCK_LOGS, totalElements: MOCK_LOGS.length, totalPages: 1, page: 0 };
    }
  },

  async getStats(): Promise<{ totalToday: number; currentlyInside: number; visitorEntriesToday: number }> {
    try {
      const res = await api.get('/access/stats');
      return res.data;
    } catch {
      return { totalToday: 24, currentlyInside: 7, visitorEntriesToday: 6 };
    }
  },
};
