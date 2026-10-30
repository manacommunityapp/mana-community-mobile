import api from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KhataType = 'VENDOR' | 'PERSONAL';
export type TransactionKind = 'GAVE' | 'GOT';

export interface KhataParty {
  id: string;
  name: string;
  phone: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'FRIEND' | 'FAMILY';
  avatarInitials: string;
  avatarColor: string;
  balance: number;
  lastActivity: string;
  totalGave: number;
  totalGot: number;
  notes?: string;
}

export interface KhataEntry {
  id: string;
  partyId: string;
  kind: TransactionKind;
  amount: number;
  note: string;
  date: string;
  hasReceipt: boolean;
  reminderSent?: boolean;
}

export interface KhataStats {
  totalReceivable: number;
  totalPayable: number;
  netBalance: number;
  partiesWithBalance: number;
  overduePastDays: number;
}

export interface CreatePartyDto {
  name: string;
  phone: string;
  type: KhataParty['type'];
  notes?: string;
}

export interface AddEntryDto {
  partyId: string;
  kind: TransactionKind;
  amount: number;
  note: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const khatabookService = {
  async getVendorParties(): Promise<KhataParty[]> {
    const res = await api.get<KhataParty[]>('/vendor-finance/parties');
    return res.data;
  },

  async getVendorStats(): Promise<KhataStats> {
    const res = await api.get<KhataStats>('/vendor-finance/stats');
    return res.data;
  },

  async getPersonalParties(): Promise<KhataParty[]> {
    const res = await api.get<KhataParty[]>('/personal-finance/khata/parties');
    return res.data;
  },

  async getPersonalStats(): Promise<KhataStats> {
    const res = await api.get<KhataStats>('/personal-finance/khata/stats');
    return res.data;
  },

  async getEntries(partyId: string): Promise<KhataEntry[]> {
    const res = await api.get<KhataEntry[]>(`/khata/parties/${partyId}/entries`);
    return res.data;
  },

  async getParty(partyId: string): Promise<KhataParty> {
    const res = await api.get<KhataParty>(`/khata/parties/${partyId}`);
    return res.data;
  },

  async addEntry(dto: AddEntryDto): Promise<KhataEntry> {
    const res = await api.post<KhataEntry>(`/khata/parties/${dto.partyId}/entries`, dto);
    return res.data;
  },

  async addVendorParty(dto: CreatePartyDto): Promise<KhataParty> {
    const res = await api.post<KhataParty>('/vendor-finance/parties', dto);
    return res.data;
  },

  async addPersonalParty(dto: CreatePartyDto): Promise<KhataParty> {
    const res = await api.post<KhataParty>('/personal-finance/khata/parties', dto);
    return res.data;
  },

  async sendReminder(partyId: string): Promise<void> {
    await api.post(`/khata/parties/${partyId}/remind`);
  },
};
