import { apiClient } from '@/services/apiClient';
import type {
  CatalogueItem, ClaimCaseView, ConsentPurpose, ConsentView, GroupEnquiryInput, GroupEnquiryView,
  InsuranceCategory, PolicyCreateInput, PolicyView, QuoteRequestView,
} from '@/types/insurance';

/**
 * Insurance API client. Talks only to the Mana backend (/api/insurance/*). It never calls insurers directly
 * and contains NO mock fallback: failures propagate so the UI shows an error instead of fabricated data.
 */
export const insuranceService = {
  async catalogue(category: InsuranceCategory): Promise<CatalogueItem[]> {
    const { data } = await apiClient.get<CatalogueItem[]>('/insurance/catalogue', { params: { category } });
    return data;
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
    const { data } = await apiClient.get<ConsentView[]>('/insurance/consents');
    return data;
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
    const { data } = await apiClient.get<PolicyView[]>('/insurance/policies');
    return data;
  },

  async policy(id: number): Promise<PolicyView> {
    const { data } = await apiClient.get<PolicyView>(`/insurance/policies/${id}`);
    return data;
  },

  async createPolicy(input: PolicyCreateInput): Promise<PolicyView> {
    const { data } = await apiClient.post<PolicyView>('/insurance/policies', input);
    return data;
  },

  async deletePolicy(id: number): Promise<void> {
    await apiClient.delete(`/insurance/policies/${id}`);
  },

  async claimCases(): Promise<ClaimCaseView[]> {
    const { data } = await apiClient.get<ClaimCaseView[]>('/insurance/claims-assistance');
    return data;
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
    const { data } = await apiClient.get<GroupEnquiryView[]>('/insurance/group-enquiries');
    return data;
  },

  async createGroupEnquiry(input: GroupEnquiryInput): Promise<GroupEnquiryView> {
    const { data } = await apiClient.post<GroupEnquiryView>('/insurance/group-enquiries', input);
    return data;
  },
};
