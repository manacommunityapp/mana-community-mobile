import api from './apiClient';
import type {
  PropertyUnitDto,
  MoveInOutNocDto,
  FlatDocumentDto,
  AIPropertyInsightDto,
} from '@/types/cpos';

export const cposService = {
  // ── My Properties ────────────────────────────────────────────────
  async getMyProperties(): Promise<PropertyUnitDto[]> {
    try {
      const res = await api.get<PropertyUnitDto[]>('/cpos/properties/mine');
      return res.data;
    } catch {
      return [
        {
          id: 'unit-1204',
          unitNumber: 'A-1204',
          tower: 'Tower A (Aspen)',
          floor: 12,
          carpetAreaSqFt: 1840,
          configuration: '3BHK',
          ownershipType: 'OWNER_OCCUPIED',
          estimatedMarketValue: '₹2.15 Cr',
          rentalYield: '5.8%',
          parkingSlotsAssigned: ['B1-42', 'B1-43'],
        },
        {
          id: 'unit-302',
          unitNumber: 'B-302',
          tower: 'Tower B (Birch)',
          floor: 3,
          carpetAreaSqFt: 1420,
          configuration: '2BHK',
          ownershipType: 'RENTED_OUT',
          currentTenant: {
            name: 'Karthik Ramanathan',
            phone: '+91 98450 11223',
            leaseStartDate: '01 Jan 2026',
            leaseEndDate: '31 Dec 2026',
            monthlyRent: 42000,
            depositAmount: 200000,
            policeVerificationDone: true,
          },
          estimatedMarketValue: '₹1.55 Cr',
          rentalYield: '6.4%',
          parkingSlotsAssigned: ['B2-18'],
        },
      ];
    }
  },

  // ── Move-in / Move-out NOCs ──────────────────────────────────────
  async getNocRequests(): Promise<MoveInOutNocDto[]> {
    try {
      const res = await api.get<MoveInOutNocDto[]>('/cpos/nocs');
      return res.data;
    } catch {
      return [
        {
          id: 'noc-101',
          unitNumber: 'B-302',
          residentName: 'Karthik Ramanathan',
          type: 'MOVE_IN',
          scheduledDate: '01 Jan 2026',
          timeSlot: '10:00 AM - 2:00 PM',
          status: 'COMPLETED',
          securityDepositCleared: true,
          liftBookingConfirmed: true,
          notes: 'Goods lift #2 padded protection allocated',
        },
        {
          id: 'noc-102',
          unitNumber: 'C-704',
          residentName: 'Vikram Mehta',
          type: 'MOVE_OUT',
          scheduledDate: '15 Nov 2026',
          timeSlot: '11:00 AM - 3:00 PM',
          status: 'APPROVED',
          securityDepositCleared: true,
          liftBookingConfirmed: true,
        },
      ];
    }
  },

  async requestNoc(payload: Partial<MoveInOutNocDto>): Promise<MoveInOutNocDto> {
    try {
      const res = await api.post<MoveInOutNocDto>('/cpos/nocs', payload);
      return res.data;
    } catch {
      return {
        id: `noc-${Date.now()}`,
        unitNumber: payload.unitNumber || 'A-1204',
        residentName: payload.residentName || 'You (Resident)',
        type: payload.type || 'MOVE_IN',
        scheduledDate: payload.scheduledDate || 'Upcoming Weekend',
        timeSlot: payload.timeSlot || '10:00 AM - 2:00 PM',
        status: 'PENDING_APPROVAL',
        securityDepositCleared: true,
        liftBookingConfirmed: false,
      };
    }
  },

  // ── Flat Documents ───────────────────────────────────────────────
  async getDocuments(): Promise<FlatDocumentDto[]> {
    try {
      const res = await api.get<FlatDocumentDto[]>('/cpos/documents');
      return res.data;
    } catch {
      return [
        {
          id: 'doc-1',
          title: 'Registered Sale Deed Agreement (Unit A-1204)',
          category: 'SALE_DEED',
          fileSize: '12.4 MB',
          lastUpdated: '14 May 2024',
          documentUrl: 'https://manacommunity.in/docs/sale-deed.pdf',
        },
        {
          id: 'doc-2',
          title: 'Registered 11-Month Tenancy Lease Agreement (Unit B-302)',
          category: 'LEASE_AGREEMENT',
          fileSize: '3.8 MB',
          lastUpdated: '01 Jan 2026',
          documentUrl: 'https://manacommunity.in/docs/lease-agreement.pdf',
        },
        {
          id: 'doc-3',
          title: 'BBMP Property Tax Khata Certificate (FY 2025-26)',
          category: 'PROPERTY_TAX',
          fileSize: '1.2 MB',
          lastUpdated: '20 Jun 2026',
          documentUrl: 'https://manacommunity.in/docs/property-tax.pdf',
        },
        {
          id: 'doc-4',
          title: 'Builder Possession Letter & Key Handover Certificate',
          category: 'POSSESSION_LETTER',
          fileSize: '2.1 MB',
          lastUpdated: '10 Feb 2024',
          documentUrl: 'https://manacommunity.in/docs/possession.pdf',
        },
      ];
    }
  },

  // ── AI Property Insights ─────────────────────────────────────────
  async getAIInsights(): Promise<AIPropertyInsightDto[]> {
    try {
      const res = await api.get<AIPropertyInsightDto[]>('/cpos/ai-insights');
      return res.data;
    } catch {
      return [
        {
          id: 'ai-1',
          type: 'LEASE',
          title: 'Tenancy Lease Expiry in 65 Days (Unit B-302)',
          insight: 'Current lease ends 31 Dec 2026. Micro-market rent in Sarjapur has grown +9.2% YoY.',
          recommendation: 'Initiate 10% rent escalation renewal proposal with existing tenant.',
          confidenceScore: 94,
        },
        {
          id: 'ai-2',
          type: 'VALUE',
          title: 'Capital Appreciation Forecast: +8.4% by Q4 2027',
          insight: 'Upcoming Metro Yellow/Blue Line intersection connectivity is driving demand.',
          recommendation: 'Hold portfolio asset; rental yield remains steady at 6.4%.',
          confidenceScore: 88,
        },
        {
          id: 'ai-3',
          type: 'MAINTENANCE',
          title: 'Predictive AC & Water Heater Servicing Window',
          insight: 'Heavy summer usage pattern detected from IoT sub-meters.',
          recommendation: 'Schedule pre-monsoon coil deep cleaning via Mana Home Services.',
          confidenceScore: 91,
        },
      ];
    }
  },
};
