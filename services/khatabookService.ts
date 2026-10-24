import api from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KhataType = 'VENDOR' | 'PERSONAL';
export type TransactionKind = 'GAVE' | 'GOT'; // GAVE = credit out, GOT = credit received

export interface KhataParty {
  id: string;
  name: string;
  phone: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'FRIEND' | 'FAMILY';
  avatarInitials: string;
  avatarColor: string;
  balance: number;        // positive = they owe us, negative = we owe them
  lastActivity: string;   // ISO date
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
  date: string;           // ISO date
  hasReceipt: boolean;
  reminderSent?: boolean;
}

export interface KhataStats {
  totalReceivable: number;   // total others owe us
  totalPayable: number;      // total we owe others
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

// ─── Sample data ─────────────────────────────────────────────────────────────

const VENDOR_PARTIES: KhataParty[] = [
  {
    id: 'kp1', name: 'Ravi Electricals', phone: '9876543210',
    type: 'CUSTOMER', avatarInitials: 'RE', avatarColor: '#3B82F6',
    balance: 4500, lastActivity: '2026-10-17',
    totalGave: 12000, totalGot: 7500,
    notes: 'Monthly service contract for wiring repairs',
  },
  {
    id: 'kp2', name: 'Flat B-204 Meena', phone: '9876543211',
    type: 'CUSTOMER', avatarInitials: 'ME', avatarColor: '#10B981',
    balance: 1200, lastActivity: '2026-10-14',
    totalGave: 3200, totalGot: 2000,
  },
  {
    id: 'kp3', name: 'Anand Plumbing Co.', phone: '9876543212',
    type: 'SUPPLIER', avatarInitials: 'AP', avatarColor: '#F59E0B',
    balance: -2800, lastActivity: '2026-10-10',
    totalGave: 1000, totalGot: 3800,
    notes: 'Supply pipes and fittings. Usually 30-day credit',
  },
  {
    id: 'kp4', name: 'Tower A Residents', phone: '9123456789',
    type: 'CUSTOMER', avatarInitials: 'TA', avatarColor: '#8B5CF6',
    balance: 6750, lastActivity: '2026-10-18',
    totalGave: 6750, totalGot: 0,
  },
  {
    id: 'kp5', name: 'Singh Hardware', phone: '9876500001',
    type: 'SUPPLIER', avatarInitials: 'SH', avatarColor: '#EF4444',
    balance: -900, lastActivity: '2026-10-05',
    totalGave: 5000, totalGot: 5900,
  },
];

const PERSONAL_PARTIES: KhataParty[] = [
  {
    id: 'pp1', name: 'Rahul Verma', phone: '9812345678',
    type: 'FRIEND', avatarInitials: 'RV', avatarColor: '#6366F1',
    balance: 3000, lastActivity: '2026-10-16',
    totalGave: 5000, totalGot: 2000,
    notes: 'Borrowed for bike repair — Oct 2026',
  },
  {
    id: 'pp2', name: 'Priya Sharma', phone: '9876543220',
    type: 'FRIEND', avatarInitials: 'PS', avatarColor: '#EC4899',
    balance: -1500, lastActivity: '2026-10-12',
    totalGave: 500, totalGot: 2000,
    notes: 'Lunch splits at office',
  },
  {
    id: 'pp3', name: 'Suresh (Brother)', phone: '9800000001',
    type: 'FAMILY', avatarInitials: 'SU', avatarColor: '#0D9488',
    balance: 8000, lastActivity: '2026-09-28',
    totalGave: 8000, totalGot: 0,
    notes: 'Sent for monthly expenses',
  },
  {
    id: 'pp4', name: 'Neha (Office)', phone: '9811111110',
    type: 'FRIEND', avatarInitials: 'NE', avatarColor: '#D97706',
    balance: 500, lastActivity: '2026-10-10',
    totalGave: 1000, totalGot: 500,
  },
];

const PARTY_ENTRIES: Record<string, KhataEntry[]> = {
  kp1: [
    { id: 'e1', partyId: 'kp1', kind: 'GAVE', amount: 5000, note: 'Advance for wiring job Oct batch', date: '2026-10-05', hasReceipt: true },
    { id: 'e2', partyId: 'kp1', kind: 'GOT',  amount: 3500, note: 'Partial payment received', date: '2026-10-10', hasReceipt: false },
    { id: 'e3', partyId: 'kp1', kind: 'GAVE', amount: 2000, note: 'Extra materials advance', date: '2026-10-15', hasReceipt: false },
    { id: 'e4', partyId: 'kp1', kind: 'GOT',  amount: 4000, note: 'Balance settled', date: '2026-10-17', hasReceipt: true },
    { id: 'e5', partyId: 'kp1', kind: 'GAVE', amount: 5000, note: 'New month advance Oct 17', date: '2026-10-17', hasReceipt: false },
  ],
  kp2: [
    { id: 'e10', partyId: 'kp2', kind: 'GAVE', amount: 2000, note: 'Cleaning service for flat', date: '2026-10-01', hasReceipt: false },
    { id: 'e11', partyId: 'kp2', kind: 'GAVE', amount: 1200, note: 'AC service charges', date: '2026-10-12', hasReceipt: true },
    { id: 'e12', partyId: 'kp2', kind: 'GOT',  amount: 2000, note: 'Cash payment received', date: '2026-10-14', hasReceipt: false },
  ],
  kp3: [
    { id: 'e20', partyId: 'kp3', kind: 'GOT',  amount: 3000, note: 'Pipes and fittings supply', date: '2026-09-30', hasReceipt: true },
    { id: 'e21', partyId: 'kp3', kind: 'GAVE', amount: 1000, note: 'Partial payment to Anand', date: '2026-10-05', hasReceipt: false },
    { id: 'e22', partyId: 'kp3', kind: 'GOT',  amount: 800, note: 'Extra valves delivered', date: '2026-10-10', hasReceipt: true },
  ],
  kp4: [
    { id: 'e30', partyId: 'kp4', kind: 'GAVE', amount: 6750, note: 'Group buy advance collected from Tower A', date: '2026-10-18', hasReceipt: false },
  ],
  kp5: [
    { id: 'e40', partyId: 'kp5', kind: 'GOT',  amount: 2400, note: 'Cement bags + sand supply', date: '2026-09-25', hasReceipt: true },
    { id: 'e41', partyId: 'kp5', kind: 'GAVE', amount: 2000, note: 'Payment to Singh', date: '2026-10-01', hasReceipt: false },
    { id: 'e42', partyId: 'kp5', kind: 'GOT',  amount: 3500, note: 'Paint and hardware supply', date: '2026-10-05', hasReceipt: true },
    { id: 'e43', partyId: 'kp5', kind: 'GAVE', amount: 3000, note: 'Payment settled Oct 5', date: '2026-10-05', hasReceipt: false },
    { id: 'e44', partyId: 'kp5', kind: 'GOT',  amount: 900, note: 'Bolt and screw sets', date: '2026-10-05', hasReceipt: false },
  ],
  pp1: [
    { id: 'ep1', partyId: 'pp1', kind: 'GAVE', amount: 5000, note: 'Lent for bike repair', date: '2026-10-10', hasReceipt: false },
    { id: 'ep2', partyId: 'pp1', kind: 'GOT',  amount: 2000, note: 'Partial repayment', date: '2026-10-16', hasReceipt: false },
  ],
  pp2: [
    { id: 'ep10', partyId: 'pp2', kind: 'GOT',  amount: 2000, note: 'Priya paid for team lunch', date: '2026-10-08', hasReceipt: false },
    { id: 'ep11', partyId: 'pp2', kind: 'GAVE', amount: 500, note: 'My share returned', date: '2026-10-12', hasReceipt: false },
  ],
  pp3: [
    { id: 'ep20', partyId: 'pp3', kind: 'GAVE', amount: 8000, note: 'Monthly family support', date: '2026-09-28', hasReceipt: false },
  ],
  pp4: [
    { id: 'ep30', partyId: 'pp4', kind: 'GAVE', amount: 1000, note: 'Office cab split', date: '2026-10-05', hasReceipt: false },
    { id: 'ep31', partyId: 'pp4', kind: 'GOT',  amount: 500, note: 'Neha returned half', date: '2026-10-10', hasReceipt: false },
  ],
};

function computeStats(parties: KhataParty[]): KhataStats {
  const receivable = parties.filter(p => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const payable = parties.filter(p => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0);
  return {
    totalReceivable: receivable,
    totalPayable: payable,
    netBalance: receivable - payable,
    partiesWithBalance: parties.filter(p => p.balance !== 0).length,
    overduePastDays: 15,
  };
}

let vendorPartiesStore = [...VENDOR_PARTIES];
let personalPartiesStore = [...PERSONAL_PARTIES];
let entriesStore = { ...PARTY_ENTRIES };
let entryCounter = 1000;

// ─── Service ─────────────────────────────────────────────────────────────────

export const khatabookService = {
  // Vendor khata
  async getVendorParties(): Promise<KhataParty[]> {
    try {
      const res = await api.get<KhataParty[]>('/vendor-finance/parties');
      return res.data;
    } catch {
      return vendorPartiesStore;
    }
  },

  async getVendorStats(): Promise<KhataStats> {
    try {
      const res = await api.get<KhataStats>('/vendor-finance/stats');
      return res.data;
    } catch {
      return computeStats(vendorPartiesStore);
    }
  },

  // Personal khata
  async getPersonalParties(): Promise<KhataParty[]> {
    try {
      const res = await api.get<KhataParty[]>('/personal-finance/khata/parties');
      return res.data;
    } catch {
      return personalPartiesStore;
    }
  },

  async getPersonalStats(): Promise<KhataStats> {
    try {
      const res = await api.get<KhataStats>('/personal-finance/khata/stats');
      return res.data;
    } catch {
      return computeStats(personalPartiesStore);
    }
  },

  // Entries for a party
  async getEntries(partyId: string): Promise<KhataEntry[]> {
    try {
      const res = await api.get<KhataEntry[]>(`/khata/parties/${partyId}/entries`);
      return res.data;
    } catch {
      return (entriesStore[partyId] ?? []).slice().reverse();
    }
  },

  async getParty(partyId: string): Promise<KhataParty | null> {
    try {
      const res = await api.get<KhataParty>(`/khata/parties/${partyId}`);
      return res.data;
    } catch {
      return (
        vendorPartiesStore.find(p => p.id === partyId) ??
        personalPartiesStore.find(p => p.id === partyId) ??
        null
      );
    }
  },

  // Add entry (GAVE or GOT)
  async addEntry(dto: AddEntryDto): Promise<KhataEntry> {
    try {
      const res = await api.post<KhataEntry>(`/khata/parties/${dto.partyId}/entries`, dto);
      return res.data;
    } catch {
      const entry: KhataEntry = {
        id: `e${++entryCounter}`,
        partyId: dto.partyId,
        kind: dto.kind,
        amount: dto.amount,
        note: dto.note,
        date: new Date().toISOString().split('T')[0],
        hasReceipt: false,
      };
      if (!entriesStore[dto.partyId]) entriesStore[dto.partyId] = [];
      entriesStore[dto.partyId].unshift(entry);

      const delta = dto.kind === 'GAVE' ? dto.amount : -dto.amount;
      const vp = vendorPartiesStore.find(p => p.id === dto.partyId);
      if (vp) {
        vp.balance += delta;
        vp.lastActivity = entry.date;
        if (dto.kind === 'GAVE') vp.totalGave += dto.amount;
        else vp.totalGot += dto.amount;
      }
      const pp = personalPartiesStore.find(p => p.id === dto.partyId);
      if (pp) {
        pp.balance += delta;
        pp.lastActivity = entry.date;
        if (dto.kind === 'GAVE') pp.totalGave += dto.amount;
        else pp.totalGot += dto.amount;
      }
      return entry;
    }
  },

  // Add party
  async addVendorParty(dto: CreatePartyDto): Promise<KhataParty> {
    try {
      const res = await api.post<KhataParty>('/vendor-finance/parties', dto);
      return res.data;
    } catch {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#0D9488', '#EC4899'];
      const party: KhataParty = {
        id: `kp${Date.now()}`,
        name: dto.name,
        phone: dto.phone,
        type: dto.type,
        avatarInitials: dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
        balance: 0,
        lastActivity: new Date().toISOString().split('T')[0],
        totalGave: 0,
        totalGot: 0,
        notes: dto.notes,
      };
      vendorPartiesStore.push(party);
      return party;
    }
  },

  async addPersonalParty(dto: CreatePartyDto): Promise<KhataParty> {
    try {
      const res = await api.post<KhataParty>('/personal-finance/khata/parties', dto);
      return res.data;
    } catch {
      const colors = ['#6366F1', '#EC4899', '#0D9488', '#D97706', '#10B981', '#3B82F6'];
      const party: KhataParty = {
        id: `pp${Date.now()}`,
        name: dto.name,
        phone: dto.phone,
        type: dto.type,
        avatarInitials: dto.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
        balance: 0,
        lastActivity: new Date().toISOString().split('T')[0],
        totalGave: 0,
        totalGot: 0,
        notes: dto.notes,
      };
      personalPartiesStore.push(party);
      return party;
    }
  },

  async sendReminder(partyId: string): Promise<void> {
    try { await api.post(`/khata/parties/${partyId}/remind`); } catch {}
  },
};
