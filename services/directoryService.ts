import api from './apiClient';

export interface ResidentEntry {
  id: number;
  name: string;
  flatNumber: string;
  block: string;
  tower?: string;
  phone?: string;
  email?: string;
  residentType: 'OWNER' | 'TENANT';
  moveInDate?: string;
  familySize?: number;
  isVerified: boolean;
  photo?: string;
}

export const directoryService = {
  async getDirectory(search?: string, block?: string): Promise<ResidentEntry[]> {
    try {
      const res = await api.get<ResidentEntry[]>('/community/directory', {
        params: { search, block },
      });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getResidentByFlat(flatNumber: string): Promise<ResidentEntry | null> {
    try {
      const res = await api.get<ResidentEntry>(`/community/directory/flat/${flatNumber}`);
      return res.data;
    } catch {
      return null;
    }
  },

  async getBlocks(): Promise<string[]> {
    try {
      const res = await api.get<string[]>('/community/directory/blocks');
      return res.data ?? [];
    } catch {
      return [];
    }
  },
};
