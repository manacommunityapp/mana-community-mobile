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

const MOCK_RESIDENTS: ResidentEntry[] = [
  { id: 1, name: 'Rajesh Sharma',  flatNumber: 'A-101', block: 'Tower A', residentType: 'OWNER',  isVerified: true,  familySize: 4, phone: '9876500001' },
  { id: 2, name: 'Meena Iyer',     flatNumber: 'A-204', block: 'Tower A', residentType: 'TENANT', isVerified: true,  familySize: 2, phone: '9876500002' },
  { id: 3, name: 'Arjun Mehta',    flatNumber: 'A-305', block: 'Tower A', residentType: 'OWNER',  isVerified: false, familySize: 3 },
  { id: 4, name: 'Sonal Verma',    flatNumber: 'B-102', block: 'Tower B', residentType: 'OWNER',  isVerified: true,  familySize: 5, phone: '9876500004' },
  { id: 5, name: 'Deepak Nair',    flatNumber: 'B-201', block: 'Tower B', residentType: 'TENANT', isVerified: true,  familySize: 2 },
  { id: 6, name: 'Kavita Reddy',   flatNumber: 'B-403', block: 'Tower B', residentType: 'OWNER',  isVerified: true,  familySize: 3, phone: '9876500006' },
  { id: 7, name: 'Suresh Pillai',  flatNumber: 'C-101', block: 'Tower C', residentType: 'OWNER',  isVerified: false, familySize: 4 },
  { id: 8, name: 'Anita Desai',    flatNumber: 'C-302', block: 'Tower C', residentType: 'TENANT', isVerified: true,  familySize: 2, phone: '9876500008' },
];

export const directoryService = {
  async getDirectory(search?: string, block?: string): Promise<ResidentEntry[]> {
    try {
      const res = await api.get<ResidentEntry[]>('/community/directory/residents', {
        params: { search, block },
      });
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_RESIDENTS;
  },

  async getResidentByFlat(flatNumber: string): Promise<ResidentEntry | null> {
    try {
      const res = await api.get<ResidentEntry>(`/community/directory/residents/flat/${flatNumber}`);
      return res.data;
    } catch {
      return null;
    }
  },

  async getBlocks(): Promise<string[]> {
    try {
      const res = await api.get<string[]>('/community/directory/residents/blocks');
      return res.data ?? [];
    } catch {
      return [];
    }
  },
};
