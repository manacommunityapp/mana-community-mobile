import api from './apiClient';

export type KycDocumentType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE' | 'VOTER_ID';
export type KycStatus = 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface KycDocument {
  id: number;
  documentType: KycDocumentType;
  documentNumber: string;
  status: KycStatus;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
}

export interface KycSummary {
  overallStatus: KycStatus;
  documents: KycDocument[];
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface SubmitKycRequest {
  documentType: KycDocumentType;
  documentNumber: string;
  frontImageBase64?: string;
  backImageBase64?: string;
}

const MOCK_KYC: KycSummary = {
  overallStatus: 'PENDING_REVIEW',
  submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  documents: [
    { id: 1, documentType: 'AADHAAR', documentNumber: 'XXXX XXXX 4521', status: 'PENDING_REVIEW', submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
  ],
};

export const kycService = {
  async getKycStatus(): Promise<KycSummary> {
    try {
      const res = await api.get<KycSummary>('/kyc/status');
      if (res.data) return res.data;
    } catch {}
    return MOCK_KYC;
  },

  async submitDocument(data: SubmitKycRequest): Promise<KycDocument> {
    try {
      const res = await api.post<KycDocument>('/kyc/submit', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to submit document. Please try again.');
    }
  },

  async resubmitDocument(id: number, data: SubmitKycRequest): Promise<KycDocument> {
    try {
      const res = await api.put<KycDocument>(`/kyc/documents/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to resubmit document. Please try again.');
    }
  },
};
