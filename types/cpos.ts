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
