// Insurance Hub types. Mirror backend DTOs (mana-community-service: insurance/dto/InsuranceDtos.java).

export type InsuranceCategory =
  | 'HEALTH' | 'FAMILY_FLOATER' | 'PARENTS' | 'LIFE_TERM' | 'MOTOR_CAR' | 'MOTOR_TWO_WHEELER'
  | 'HOME' | 'TRAVEL' | 'PERSONAL_ACCIDENT' | 'OTHER';

export type ConsentPurpose =
  | 'QUOTE_SHARING' | 'POLICY_STORAGE' | 'CLAIMS_ASSISTANCE' | 'GROUP_ENQUIRY' | 'MARKETING';

export interface CatalogueItem {
  productVersionId: number;
  productId: number;
  category: InsuranceCategory;
  subtype?: string | null;
  name: string;
  versionNo: number;
  insurerName: string;
  partnerType: string;
  irdaiRegistrationNo?: string | null;
  dataSource: string;
  brochureUrl?: string | null;
  policyWordingUrl?: string | null;
  eligibilityJson?: string | null;
  coverageJson?: string | null;
  benefitsJson?: string | null;
  waitingPeriodsJson?: string | null;
  exclusionsJson?: string | null;
  networkJson?: string | null;
  disclosuresJson?: string | null;
  partnerDisclosure?: string | null;
  commercialDisclosure?: string | null;
  verifiedAt?: string | null;
}

export interface ConsentView {
  id: number;
  purpose: ConsentPurpose;
  partnerId?: number | null;
  noticeVersion: string;
  eventType: 'GRANTED' | 'WITHDRAWN';
  createdAt: string;
}

export interface QuoteView {
  id: number;
  partnerName: string;
  dataSource: 'PARTNER' | 'SANDBOX';
  premiumAmount: number;
  premiumFrequency: string;
  sumInsured?: number | null;
  quotedAt: string;
  validUntil: string;
  expired: boolean;
  label?: string | null;
}

export interface QuoteRequestView {
  id: number;
  category: InsuranceCategory;
  status: 'SUBMITTED' | 'QUOTED' | 'PARTNER_UNAVAILABLE' | 'FAILED' | 'CANCELLED';
  failureCode?: string | null;
  replayed: boolean;
  quotes: QuoteView[];
  notice?: string | null;
}

export interface PolicyView {
  id: number;
  insurerName: string;
  productName: string;
  category: InsuranceCategory;
  maskedPolicyNumber?: string | null;
  dataSource: 'USER_DECLARED' | 'PARTNER_VERIFIED';
  status: string;
  startDate?: string | null;
  expiryDate?: string | null;
  sumInsured?: number | null;
  premiumAmount?: number | null;
  premiumFrequency?: string | null;
  nomineeName?: string | null;
  insurerContact?: string | null;
  coverageConfirmedByInsurer: boolean;
  statusNote: string;
}

export interface PolicyCreateInput {
  insurerName: string;
  productName: string;
  category: InsuranceCategory;
  policyNumber?: string;
  startDate?: string;
  expiryDate?: string;
  sumInsured?: number;
  premiumAmount?: number;
  premiumFrequency?: string;
  nomineeName?: string;
  insurerContact?: string;
}

export interface ClaimCaseView {
  id: number;
  caseRef: string;
  policyId?: number | null;
  claimType: string;
  description?: string | null;
  /** Mana assistance status only. Never an insurer claim decision. */
  assistanceStatus: 'OPEN' | 'IN_REVIEW' | 'AWAITING_USER' | 'CLOSED';
  assignedTeam?: string | null;
  insurerClaimReference?: string | null;
  insurerClaimReferenceSource?: string | null;
  /** Always null until an authorised partner integration supplies it. */
  insurerClaimStatus?: string | null;
  createdAt: string;
  notice: string;
}

export interface GroupEnquiryInput {
  organisationName: string;
  organisationType: string;
  coverageScope: 'COMMON_PROPERTY' | 'INDIVIDUAL_RESIDENT' | 'GROUP_POLICY';
  coverageSought: string;
  approxMembers: number;
  requirements?: string;
  contactMethod: 'PHONE' | 'EMAIL';
  consentId: number;
}

export interface GroupEnquiryView {
  id: number;
  enquiryRef: string;
  organisationName: string;
  organisationType: string;
  coverageScope: string;
  coverageSought: string;
  approxMembers: number;
  status: string;
  createdAt: string;
  notice: string;
}
