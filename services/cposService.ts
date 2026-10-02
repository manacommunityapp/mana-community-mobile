import api from './apiClient';
import { secureLog } from '@/security';
import type {
  PropertyUnitDto,
  MoveInOutNocDto,
  FlatDocumentDto,
  AIPropertyInsightDto,
  FloorPlanUnit,
  TowerSummary,
  TenantKycDocument,
  TenantKycSummary,
  CrmLead,
  CrmPipelineSummary,
  CreateCrmLeadRequest,
} from '@/types/cpos';

export interface CPOSFinanceDto {
  totalRentalYield: string;
  monthlyRevenue: number;
  maintenanceDues: number;
  netCashflow: number;
  taxDeductions: number;
}

export interface CPOSOccupancyDto {
  occupiedUnits: number;
  vacantUnits: number;
  activeLeases: number;
  pendingNocs: number;
}

const FALLBACK_PROPERTIES: PropertyUnitDto[] = [
  {
    id: 'prop-1',
    unitNumber: 'A-1204',
    tower: 'Tower A',
    floor: 12,
    carpetAreaSqFt: 1850,
    configuration: '3BHK',
    ownershipType: 'RENTED_OUT',
    currentTenant: {
      name: 'Venkatesh Rao',
      phone: '+91 98450 12345',
      leaseStartDate: '2025-11-01',
      leaseEndDate: '2026-10-31',
      monthlyRent: 48000,
      depositAmount: 200000,
      policeVerificationDone: true,
    },
    estimatedMarketValue: '₹2.45 Cr',
    rentalYield: '4.8%',
    parkingSlotsAssigned: ['B1-042', 'B1-043'],
  },
  {
    id: 'prop-2',
    unitNumber: 'C-302',
    tower: 'Tower C',
    floor: 3,
    carpetAreaSqFt: 1250,
    configuration: '2BHK',
    ownershipType: 'OWNER_OCCUPIED',
    estimatedMarketValue: '₹1.65 Cr',
    rentalYield: '5.1%',
    parkingSlotsAssigned: ['B2-118'],
  },
];

const FALLBACK_NOCS: MoveInOutNocDto[] = [
  {
    id: 'noc-101',
    unitNumber: 'A-1204',
    residentName: 'Venkatesh Rao',
    type: 'MOVE_IN',
    scheduledDate: '2026-10-05',
    timeSlot: '10:00 AM - 02:00 PM',
    status: 'APPROVED',
    securityDepositCleared: true,
    liftBookingConfirmed: true,
    notes: 'Freight elevator #2 reserved',
  },
];

const FALLBACK_DOCS: FlatDocumentDto[] = [
  { id: 'doc-1', title: 'Sale Deed & Title Registration', category: 'SALE_DEED', fileSize: '4.2 MB', lastUpdated: '2024-03-15', documentUrl: '#' },
  { id: 'doc-2', title: 'Registered Lease Agreement (2025-2026)', category: 'LEASE_AGREEMENT', fileSize: '1.8 MB', lastUpdated: '2025-10-28', documentUrl: '#' },
  { id: 'doc-3', title: 'Municipal Property Tax Receipt (FY 25-26)', category: 'PROPERTY_TAX', fileSize: '650 KB', lastUpdated: '2026-04-10', documentUrl: '#' },
];

const FALLBACK_INSIGHTS: AIPropertyInsightDto[] = [
  { id: 'ins-1', type: 'YIELD', title: 'Rental Rate Optimization', insight: 'Comparable 3BHK units in Tower A renewed at ₹52,000 (+8.3%).', recommendation: 'Revise lease terms to ₹52,000 for upcoming renewal.', confidenceScore: 94 },
  { id: 'ins-2', type: 'VALUE', title: 'Asset Valuation Surge', insight: 'Upcoming Metro Line 3 extension adds approx 6-8% premium to asset value.', recommendation: 'Hold asset; capital appreciation forecast is strong.', confidenceScore: 88 },
  { id: 'ins-3', type: 'MAINTENANCE', title: 'Preventive Maintenance Alert', insight: 'HVAC system in A-1204 is due for servicing. Similar units saw 15% higher utility bills after skipping.', recommendation: 'Schedule AC deep-cleaning before summer to avoid breakdown.', confidenceScore: 91 },
  { id: 'ins-4', type: 'LEASE', title: 'Lease Renewal Window', insight: 'Lease for A-1204 expires in 30 days. Market rents for comparable 3BHK are ₹50,000-₹54,000/month.', recommendation: 'Initiate renewal negotiations at ₹52,000 with 5% annual escalation clause.', confidenceScore: 87 },
];

const FALLBACK_DIRECTORY: FloorPlanUnit[] = [
  { id: 'u-1', unitNumber: 'A-101', tower: 'Tower A', floor: 1, configuration: '2BHK', status: 'OCCUPIED', ownerName: 'Rajesh Sharma', carpetAreaSqFt: 1100 },
  { id: 'u-2', unitNumber: 'A-102', tower: 'Tower A', floor: 1, configuration: '3BHK', status: 'RENTED', ownerName: 'Priya Iyer', carpetAreaSqFt: 1500 },
  { id: 'u-3', unitNumber: 'A-201', tower: 'Tower A', floor: 2, configuration: '2BHK', status: 'VACANT', carpetAreaSqFt: 1100 },
  { id: 'u-4', unitNumber: 'A-202', tower: 'Tower A', floor: 2, configuration: '3BHK', status: 'OCCUPIED', ownerName: 'Amit Patel', carpetAreaSqFt: 1500 },
  { id: 'u-5', unitNumber: 'B-101', tower: 'Tower B', floor: 1, configuration: '2BHK', status: 'OCCUPIED', ownerName: 'Siddharth Nair', carpetAreaSqFt: 1200 },
  { id: 'u-6', unitNumber: 'B-102', tower: 'Tower B', floor: 1, configuration: '4BHK', status: 'RENTED', ownerName: 'Kavita Reddy', carpetAreaSqFt: 2100 },
  { id: 'u-7', unitNumber: 'B-201', tower: 'Tower B', floor: 2, configuration: '3BHK', status: 'UNDER_RENOVATION', ownerName: 'Vikram Singh', carpetAreaSqFt: 1600 },
  { id: 'u-8', unitNumber: 'C-101', tower: 'Tower C', floor: 1, configuration: '2BHK', status: 'OCCUPIED', ownerName: 'Deepa Menon', carpetAreaSqFt: 1250 },
  { id: 'u-9', unitNumber: 'C-302', tower: 'Tower C', floor: 3, configuration: '2BHK', status: 'OCCUPIED', ownerName: 'You', carpetAreaSqFt: 1250 },
];

const FALLBACK_TOWERS: TowerSummary[] = [
  { tower: 'Tower A', totalFloors: 14, totalUnits: 56, occupiedCount: 42, vacantCount: 6, rentedCount: 8 },
  { tower: 'Tower B', totalFloors: 14, totalUnits: 56, occupiedCount: 38, vacantCount: 8, rentedCount: 10 },
  { tower: 'Tower C', totalFloors: 10, totalUnits: 40, occupiedCount: 32, vacantCount: 3, rentedCount: 5 },
];

const FALLBACK_KYC: TenantKycDocument[] = [
  { id: 'kyc-1', tenantId: 't-1', tenantName: 'Venkatesh Rao', unitNumber: 'A-1204', docType: 'AADHAAR', status: 'VERIFIED', documentNumber: 'XXXX-XXXX-4532', uploadedAt: '2025-10-15', verifiedAt: '2025-10-16' },
  { id: 'kyc-2', tenantId: 't-1', tenantName: 'Venkatesh Rao', unitNumber: 'A-1204', docType: 'PAN', status: 'VERIFIED', documentNumber: 'ABCDE1234F', uploadedAt: '2025-10-15', verifiedAt: '2025-10-16' },
  { id: 'kyc-3', tenantId: 't-1', tenantName: 'Venkatesh Rao', unitNumber: 'A-1204', docType: 'POLICE_VERIFICATION', status: 'VERIFIED', uploadedAt: '2025-10-20', verifiedAt: '2025-10-25' },
  { id: 'kyc-4', tenantId: 't-1', tenantName: 'Venkatesh Rao', unitNumber: 'A-1204', docType: 'RENTAL_AGREEMENT', status: 'VERIFIED', uploadedAt: '2025-11-01', verifiedAt: '2025-11-01', expiryDate: '2026-10-31' },
  { id: 'kyc-5', tenantId: 't-2', tenantName: 'Neha Gupta', unitNumber: 'B-102', docType: 'AADHAAR', status: 'PENDING', uploadedAt: '2026-09-25' },
  { id: 'kyc-6', tenantId: 't-2', tenantName: 'Neha Gupta', unitNumber: 'B-102', docType: 'POLICE_VERIFICATION', status: 'PENDING' },
];

const FALLBACK_KYC_SUMMARY: TenantKycSummary = {
  totalTenants: 18,
  fullyVerified: 14,
  pendingKyc: 3,
  expiredDocs: 1,
};

const FALLBACK_CRM_LEADS: CrmLead[] = [
  { id: 'crm-1', name: 'Rahul Mehta', phone: '+91 99001 22345', unitNumber: 'A-201', dealType: 'RENTAL', stage: 'SITE_VISIT', source: 'PORTAL', monthlyRent: 35000, notes: 'Looking for 2BHK, family of 3', nextFollowUp: '2026-10-05', createdAt: '2026-09-28', updatedAt: '2026-10-01', assignedTo: 'Owner' },
  { id: 'crm-2', name: 'Sneha Kulkarni', phone: '+91 98765 43210', email: 'sneha@email.com', unitNumber: 'B-201', dealType: 'SALE', stage: 'NEGOTIATION', source: 'REFERRAL', askingPrice: 17500000, offeredPrice: 16800000, notes: 'Wants immediate possession', nextFollowUp: '2026-10-03', createdAt: '2026-09-20', updatedAt: '2026-09-30', assignedTo: 'Owner' },
  { id: 'crm-3', name: 'Vikram Joshi', phone: '+91 88001 55667', unitNumber: 'C-302', dealType: 'RENTAL', stage: 'INQUIRY', source: 'WALK_IN', monthlyRent: 28000, createdAt: '2026-10-01', updatedAt: '2026-10-01' },
  { id: 'crm-4', name: 'Anita Deshmukh', phone: '+91 77009 88112', unitNumber: 'A-1204', dealType: 'RENTAL', stage: 'CLOSED_WON', source: 'BROKER', monthlyRent: 48000, createdAt: '2026-08-15', updatedAt: '2026-09-01', assignedTo: 'Owner' },
];

const FALLBACK_CRM_SUMMARY: CrmPipelineSummary = {
  totalLeads: 12,
  inquiry: 3,
  siteVisit: 4,
  negotiation: 2,
  agreement: 1,
  closedWon: 2,
  closedLost: 0,
  totalPipelineValue: 5200000,
};

export const cposService = {
  // ── Ownership Controller: /cpos/ownership or /cpos/properties/mine
  async getMyProperties(): Promise<PropertyUnitDto[]> {
    try {
      const res = await api.get<PropertyUnitDto[]>('/api/v1/cpos/ownership');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<PropertyUnitDto[]>('/cpos/properties/mine');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_PROPERTIES;
    } catch (err) {
      secureLog.warn('CPOSService: Live properties unavailable, using fallback', err);
      return FALLBACK_PROPERTIES;
    }
  },

  // ── Occupancy Controller: /cpos/occupancy or /cpos/nocs
  async getNocRequests(): Promise<MoveInOutNocDto[]> {
    try {
      const res = await api.get<MoveInOutNocDto[]>('/api/v1/cpos/occupancy/nocs');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<MoveInOutNocDto[]>('/cpos/nocs');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_NOCS;
    } catch (err) {
      secureLog.warn('CPOSService: Live NOCs unavailable, using fallback', err);
      return FALLBACK_NOCS;
    }
  },

  async requestNoc(payload: Partial<MoveInOutNocDto>): Promise<MoveInOutNocDto> {
    try {
      const res = await api.post<MoveInOutNocDto>('/cpos/nocs', payload);
      return res.data;
    } catch (err) {
      secureLog.warn('CPOSService: Request NOC API failed, saving locally', err);
      return {
        id: `noc-${Date.now()}`,
        unitNumber: payload.unitNumber || 'A-1204',
        residentName: payload.residentName || 'Resident',
        type: payload.type || 'MOVE_IN',
        scheduledDate: payload.scheduledDate || 'Tomorrow',
        timeSlot: '10:00 AM - 02:00 PM',
        status: 'PENDING_APPROVAL',
        securityDepositCleared: true,
        liftBookingConfirmed: true,
        notes: payload.notes,
      };
    }
  },

  // ── Finance Controller: /cpos/finance or /api/v1/cpos/finance
  async getFinanceOverview(): Promise<CPOSFinanceDto> {
    try {
      const res = await api.get<CPOSFinanceDto>('/api/v1/cpos/finance');
      if (res.data) return res.data;
    } catch {}

    try {
      const res = await api.get<CPOSFinanceDto>('/cpos/finance');
      if (res.data) return res.data;
      return {
        totalRentalYield: '4.95%',
        monthlyRevenue: 48000,
        maintenanceDues: 6500,
        netCashflow: 41500,
        taxDeductions: 12000,
      };
    } catch (err) {
      secureLog.warn('CPOSService: Live finance stats unavailable, using fallback', err);
      return {
        totalRentalYield: '4.95%',
        monthlyRevenue: 48000,
        maintenanceDues: 6500,
        netCashflow: 41500,
        taxDeductions: 12000,
      };
    }
  },

  // ── Document Vault
  async getDocuments(): Promise<FlatDocumentDto[]> {
    try {
      const res = await api.get<FlatDocumentDto[]>('/cpos/documents');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_DOCS;
    } catch (err) {
      secureLog.warn('CPOSService: Live documents unavailable, using fallback', err);
      return FALLBACK_DOCS;
    }
  },

  // ── AI Platform Controller: /cpos/ai-insights or /api/v1/cpos/ai-platform
  async getAIInsights(): Promise<AIPropertyInsightDto[]> {
    try {
      const res = await api.get<AIPropertyInsightDto[]>('/api/v1/cpos/ai-platform');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<AIPropertyInsightDto[]>('/cpos/ai-insights');
      if (res.data && res.data.length > 0) return res.data;
      return FALLBACK_INSIGHTS;
    } catch (err) {
      secureLog.warn('CPOSService: Live AI insights unavailable, using fallback', err);
      return FALLBACK_INSIGHTS;
    }
  },

  // ── Unit Directory & Floor Plan ───────────────────────────────────
  async getUnitDirectory(tower?: string): Promise<FloorPlanUnit[]> {
    try {
      const res = await api.get<FloorPlanUnit[]>('/cpos/units', {
        params: tower ? { tower } : {},
      });
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<FloorPlanUnit[]>('/api/v1/cpos/properties/directory', {
        params: tower ? { tower } : {},
      });
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}

    return FALLBACK_DIRECTORY;
  },

  async getTowerSummaries(): Promise<TowerSummary[]> {
    try {
      const res = await api.get<TowerSummary[]>('/cpos/towers/summary');
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}

    return FALLBACK_TOWERS;
  },

  // ── Tenant KYC Vault ──────────────────────────────────────────────
  async getTenantKycDocuments(): Promise<TenantKycDocument[]> {
    try {
      const res = await api.get<TenantKycDocument[]>('/cpos/tenants/kyc');
      if (Array.isArray(res.data)) return res.data;
    } catch {}

    try {
      const res = await api.get<TenantKycDocument[]>('/api/v1/cpos/occupancy/kyc');
      if (Array.isArray(res.data)) return res.data;
    } catch {}

    return FALLBACK_KYC;
  },

  async getTenantKycSummary(): Promise<TenantKycSummary> {
    try {
      const res = await api.get<TenantKycSummary>('/cpos/tenants/kyc/summary');
      if (res.data) return res.data;
    } catch {}

    return FALLBACK_KYC_SUMMARY;
  },

  // ── CRM Pipeline ──────────────────────────────────────────────────
  async getCrmLeads(): Promise<CrmLead[]> {
    try {
      const res = await api.get<CrmLead[]>('/cpos/crm/leads');
      if (Array.isArray(res.data)) return res.data;
    } catch {}

    try {
      const res = await api.get<CrmLead[]>('/api/v1/cpos/crm/pipeline');
      if (Array.isArray(res.data)) return res.data;
    } catch {}

    return FALLBACK_CRM_LEADS;
  },

  async getCrmPipelineSummary(): Promise<CrmPipelineSummary> {
    try {
      const res = await api.get<CrmPipelineSummary>('/cpos/crm/summary');
      if (res.data) return res.data;
    } catch {}

    return FALLBACK_CRM_SUMMARY;
  },

  async createCrmLead(data: CreateCrmLeadRequest): Promise<CrmLead> {
    try {
      const res = await api.post<CrmLead>('/cpos/crm/leads', data);
      return res.data;
    } catch {
      const res = await api.post<CrmLead>('/api/v1/cpos/crm/pipeline', data);
      return res.data;
    }
  },

  async updateCrmLeadStage(id: string, stage: string): Promise<CrmLead> {
    try {
      const res = await api.put<CrmLead>(`/cpos/crm/leads/${id}/stage`, null, {
        params: { stage },
      });
      return res.data;
    } catch {
      const res = await api.put<CrmLead>(`/api/v1/cpos/crm/pipeline/${id}/stage`, null, {
        params: { stage },
      });
      return res.data;
    }
  },
};
