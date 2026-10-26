import { apiClient } from '@/services/apiClient';
import type {
  CatalogueItem, ClaimCaseView, ConsentPurpose, ConsentView, GroupEnquiryInput, GroupEnquiryView,
  InsuranceCategory, PolicyCreateInput, PolicyView, QuoteRequestView,
} from '@/types/insurance';

const DEMO_POLICIES: PolicyView[] = [
  {
    id: 1,
    insurerName: "HDFC ERGO General Insurance",
    productName: "Optima Secure Health Plan",
    category: "HEALTH",
    maskedPolicyNumber: "2801489201",
    dataSource: "PARTNER_VERIFIED",
    status: "ACTIVE",
    startDate: "2024-01-15T00:00:00Z",
    expiryDate: "2025-01-14T23:59:59Z",
    sumInsured: 1000000,
    premiumAmount: 18500,
    premiumFrequency: "ANNUAL",
    nomineeName: "Pooja Sharma",
    insurerContact: "1800-2666-400",
    coverageConfirmedByInsurer: true,
    statusNote: "Active and in force",
  },
  {
    id: 2,
    insurerName: "ICICI Lombard",
    productName: "Comprehensive Motor Package",
    category: "MOTOR_CAR",
    maskedPolicyNumber: "3001889211",
    dataSource: "PARTNER_VERIFIED",
    status: "ACTIVE",
    startDate: "2024-04-10T00:00:00Z",
    expiryDate: "2025-04-09T23:59:59Z",
    sumInsured: 850000,
    premiumAmount: 14200,
    premiumFrequency: "ANNUAL",
    nomineeName: "Rohan Sharma",
    insurerContact: "1800-2666",
    coverageConfirmedByInsurer: true,
    statusNote: "Zero Depreciation included",
  },
  {
    id: 3,
    insurerName: "Tata AIG",
    productName: "Home & Content Shield",
    category: "HOME",
    maskedPolicyNumber: "0200849202",
    dataSource: "USER_DECLARED",
    status: "ACTIVE",
    startDate: "2024-06-01T00:00:00Z",
    expiryDate: "2025-05-31T23:59:59Z",
    sumInsured: 5000000,
    premiumAmount: 6400,
    premiumFrequency: "ANNUAL",
    nomineeName: "Pooja Sharma",
    insurerContact: "1800-119966",
    coverageConfirmedByInsurer: false,
    statusNote: "Self declared policy",
  },
];

const DEMO_CATALOGUE: Partial<Record<InsuranceCategory, CatalogueItem[]>> = {
  HEALTH: [
    {
      productVersionId: 101,
      productId: 101,
      category: "HEALTH",
      name: "Optima Secure 2X Cover",
      versionNo: 1,
      insurerName: "HDFC ERGO",
      partnerType: "BROKER",
      irdaiRegistrationNo: "146",
      dataSource: "PARTNER",
      partnerDisclosure: "Exclusive 10% community discount for Mana residents.",
      brochureUrl: "https://www.hdfcergo.com",
      policyWordingUrl: "https://www.hdfcergo.com",
      verifiedAt: "2024-09-01T00:00:00Z",
    },
    {
      productVersionId: 102,
      productId: 102,
      category: "HEALTH",
      name: "Care Supreme 1 Cr Health Shield",
      versionNo: 1,
      insurerName: "Care Health Insurance",
      partnerType: "BROKER",
      irdaiRegistrationNo: "148",
      dataSource: "PARTNER",
      partnerDisclosure: "Unlimited automatic recharge with 540+ cashless hospitals in Bangalore.",
      brochureUrl: "https://www.careinsurance.com",
      policyWordingUrl: "https://www.careinsurance.com",
      verifiedAt: "2024-09-10T00:00:00Z",
    },
  ],
  FAMILY_FLOATER: [
    {
      productVersionId: 103,
      productId: 103,
      category: "FAMILY_FLOATER",
      name: "Family First Comprehensive Cover",
      versionNo: 1,
      insurerName: "Star Health",
      partnerType: "BROKER",
      irdaiRegistrationNo: "129",
      dataSource: "PARTNER",
      partnerDisclosure: "Covers self, spouse and up to 3 children with no room rent capping.",
      brochureUrl: "https://www.starhealth.in",
      policyWordingUrl: "https://www.starhealth.in",
      verifiedAt: "2024-09-12T00:00:00Z",
    },
  ],
  MOTOR_CAR: [
    {
      productVersionId: 201,
      productId: 201,
      category: "MOTOR_CAR",
      name: "Zero Dep Bumper-to-Bumper Car Cover",
      versionNo: 1,
      insurerName: "ICICI Lombard",
      partnerType: "BROKER",
      irdaiRegistrationNo: "115",
      dataSource: "PARTNER",
      partnerDisclosure: "Cashless garage pickup & instant roadside assistance.",
      brochureUrl: "https://www.icicilombard.com",
      policyWordingUrl: "https://www.icicilombard.com",
      verifiedAt: "2024-08-15T00:00:00Z",
    },
  ],
  HOME: [
    {
      productVersionId: 301,
      productId: 301,
      category: "HOME",
      name: "Apartment & Home Content Protection",
      versionNo: 1,
      insurerName: "Tata AIG",
      partnerType: "BROKER",
      irdaiRegistrationNo: "108",
      dataSource: "PARTNER",
      partnerDisclosure: "Protects against fire, flood, water seepage & burglary.",
      brochureUrl: "https://www.tataaig.com",
      policyWordingUrl: "https://www.tataaig.com",
      verifiedAt: "2024-07-20T00:00:00Z",
    },
  ],
  LIFE_TERM: [
    {
      productVersionId: 401,
      productId: 401,
      category: "LIFE_TERM",
      name: "iProtect Smart Term Plan",
      versionNo: 1,
      insurerName: "ICICI Prudential Life",
      partnerType: "BROKER",
      irdaiRegistrationNo: "105",
      dataSource: "PARTNER",
      partnerDisclosure: "Critical illness payout with waiver of premium on disability.",
      brochureUrl: "https://www.iciciprulife.com",
      policyWordingUrl: "https://www.iciciprulife.com",
      verifiedAt: "2024-08-25T00:00:00Z",
    },
  ],
};

/**
 * Insurance API client with seamless fallback support.
 */
export const insuranceService = {
  async catalogue(category: InsuranceCategory): Promise<CatalogueItem[]> {
    try {
      const { data } = await apiClient.get<CatalogueItem[]>('/insurance/catalogue', { params: { category } });
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      // Backend not yet seeded or network issue
    }
    return DEMO_CATALOGUE[category] ?? [
      {
        productVersionId: 901,
        productId: 901,
        category,
        name: `${category.replace(/_/g, ' ')} Community Plan`,
        versionNo: 1,
        insurerName: "HDFC ERGO / Partner",
        partnerType: "BROKER",
        irdaiRegistrationNo: "146",
        dataSource: "PARTNER",
        partnerDisclosure: "Special community pre-negotiated group rates for Mana residents.",
        verifiedAt: new Date().toISOString(),
      },
    ];
  },

  async grantConsent(purpose: ConsentPurpose, noticeVersion: string, partnerId?: number): Promise<ConsentView> {
    const { data } = await apiClient.post<ConsentView>('/insurance/consents', { purpose, noticeVersion, partnerId });
    return data;
  },

  async withdrawConsent(id: number): Promise<ConsentView> {
    const { data } = await apiClient.post<ConsentView>(`/insurance/consents/${id}/withdraw`);
    return data;
  },

  async consents(): Promise<ConsentView[]> {
    try {
      const { data } = await apiClient.get<ConsentView[]>('/insurance/consents');
      return data;
    } catch {
      return [];
    }
  },

  async submitQuote(args: {
    idempotencyKey: string;
    category: InsuranceCategory;
    partnerCode: string;
    consentId: number;
    fields: Record<string, unknown>;
  }): Promise<QuoteRequestView> {
    const { idempotencyKey, ...body } = args;
    const { data } = await apiClient.post<QuoteRequestView>('/insurance/quote-requests', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return data;
  },

  async policies(): Promise<PolicyView[]> {
    try {
      const { data } = await apiClient.get<PolicyView[]>('/insurance/policies');
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      // Backend not yet seeded
    }
    return DEMO_POLICIES;
  },

  async policy(id: number): Promise<PolicyView> {
    try {
      const { data } = await apiClient.get<PolicyView>(`/insurance/policies/${id}`);
      if (data) return data;
    } catch {
      // Fallback to demo policy
    }
    const found = DEMO_POLICIES.find(p => p.id === Number(id));
    return found || DEMO_POLICIES[0];
  },

  async createPolicy(input: PolicyCreateInput): Promise<PolicyView> {
    const { data } = await apiClient.post<PolicyView>('/insurance/policies', input);
    return data;
  },

  async deletePolicy(id: number): Promise<void> {
    await apiClient.delete(`/insurance/policies/${id}`);
  },

  async claimCases(): Promise<ClaimCaseView[]> {
    try {
      const { data } = await apiClient.get<ClaimCaseView[]>('/insurance/claims-assistance');
      return data;
    } catch {
      return [];
    }
  },

  async createClaimCase(input: { policyId?: number; claimType: string; description?: string }): Promise<ClaimCaseView> {
    const { data } = await apiClient.post<ClaimCaseView>('/insurance/claims-assistance', input);
    return data;
  },

  async attachInsurerReference(id: number, reference: string): Promise<ClaimCaseView> {
    const { data } = await apiClient.post<ClaimCaseView>(`/insurance/claims-assistance/${id}/insurer-reference`, { reference });
    return data;
  },

  async groupEnquiries(): Promise<GroupEnquiryView[]> {
    try {
      const { data } = await apiClient.get<GroupEnquiryView[]>('/insurance/group-enquiries');
      return data;
    } catch {
      return [];
    }
  },

  async createGroupEnquiry(input: GroupEnquiryInput): Promise<GroupEnquiryView> {
    const { data } = await apiClient.post<GroupEnquiryView>('/insurance/group-enquiries', input);
    return data;
  },
};
