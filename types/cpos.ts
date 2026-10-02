export interface PropertyUnitDto {
  id: string;
  unitNumber: string;
  tower: string;
  floor: number;
  carpetAreaSqFt: number;
  configuration: '1BHK' | '2BHK' | '3BHK' | '4BHK' | 'PENTHOUSE' | 'VILLA';
  ownershipType: 'OWNER_OCCUPIED' | 'RENTED_OUT' | 'VACANT';
  currentTenant?: {
    name: string;
    phone: string;
    leaseStartDate: string;
    leaseEndDate: string;
    monthlyRent: number;
    depositAmount: number;
    policeVerificationDone: boolean;
  };
  estimatedMarketValue: string;
  rentalYield: string;
  parkingSlotsAssigned: string[];
}

export interface MoveInOutNocDto {
  id: string;
  unitNumber: string;
  residentName: string;
  type: 'MOVE_IN' | 'MOVE_OUT';
  scheduledDate: string;
  timeSlot: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED';
  securityDepositCleared: boolean;
  liftBookingConfirmed: boolean;
  notes?: string;
}

export interface FlatDocumentDto {
  id: string;
  title: string;
  category: 'SALE_DEED' | 'LEASE_AGREEMENT' | 'PROPERTY_TAX' | 'ELECTRICITY' | 'POSSESSION_LETTER';
  fileSize: string;
  lastUpdated: string;
  documentUrl: string;
}

export interface AIPropertyInsightDto {
  id: string;
  type: 'YIELD' | 'LEASE' | 'VALUE' | 'MAINTENANCE';
  title: string;
  insight: string;
  recommendation: string;
  confidenceScore: number;
}

// ── Floor Plan / Unit Directory ────────────────────────────────

export interface FloorPlanUnit {
  id: string;
  unitNumber: string;
  tower: string;
  floor: number;
  configuration: string;
  status: 'OCCUPIED' | 'VACANT' | 'RENTED' | 'UNDER_RENOVATION';
  ownerName?: string;
  carpetAreaSqFt?: number;
}

export interface TowerSummary {
  tower: string;
  totalFloors: number;
  totalUnits: number;
  occupiedCount: number;
  vacantCount: number;
  rentedCount: number;
}

// ── Tenant KYC ─────────────────────────────────────────────────

export type KycDocType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'VOTER_ID' | 'POLICE_VERIFICATION' | 'RENTAL_AGREEMENT';
export type KycStatus = 'VERIFIED' | 'PENDING' | 'REJECTED' | 'EXPIRED';

export interface TenantKycDocument {
  id: string;
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  docType: KycDocType;
  status: KycStatus;
  documentNumber?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  expiryDate?: string;
  notes?: string;
}

export interface TenantKycSummary {
  totalTenants: number;
  fullyVerified: number;
  pendingKyc: number;
  expiredDocs: number;
}

// ── CRM Pipeline ───────────────────────────────────────────────

export type CrmLeadStage = 'INQUIRY' | 'SITE_VISIT' | 'NEGOTIATION' | 'AGREEMENT' | 'CLOSED_WON' | 'CLOSED_LOST';
export type CrmLeadSource = 'REFERRAL' | 'PORTAL' | 'WALK_IN' | 'BROKER' | 'SOCIAL_MEDIA';
export type CrmDealType = 'SALE' | 'RENTAL';

export interface CrmLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  unitNumber: string;
  dealType: CrmDealType;
  stage: CrmLeadStage;
  source: CrmLeadSource;
  askingPrice?: number;
  offeredPrice?: number;
  monthlyRent?: number;
  notes?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export interface CrmPipelineSummary {
  totalLeads: number;
  inquiry: number;
  siteVisit: number;
  negotiation: number;
  agreement: number;
  closedWon: number;
  closedLost: number;
  totalPipelineValue: number;
}

export interface CreateCrmLeadRequest {
  name: string;
  phone: string;
  email?: string;
  unitNumber: string;
  dealType: CrmDealType;
  source: CrmLeadSource;
  askingPrice?: number;
  monthlyRent?: number;
  notes?: string;
}
