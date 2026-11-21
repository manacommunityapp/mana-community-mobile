import * as Crypto from 'expo-crypto';
import api from './apiClient';

export type KycDocumentType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE' | 'VOTER_ID';
export type KycStatus = 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

/**
 * Normalise a government ID before hashing: strip all whitespace and hyphens
 * and upper-case it, so the same Aadhaar/PAN always produces the same digest.
 * THE BACKEND MUST NORMALISE IDENTICALLY or hash lookups will never match.
 */
export function normalizeGovtIdNumber(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * SHA-256 (lowercase hex) of the normalised ID number.
 *
 * Aadhaar Act s.29 / the DPDP Act restrict storing and transmitting the literal
 * digits, so only this digest leaves the device. Note that an unsalted SHA-256
 * of a 12-digit number is brute-forceable (10^12 candidates), so this is not a
 * confidentiality control on its own — the backend must re-protect the value
 * with a salted KDF or an HMAC under a server-held key.
 */
export async function hashGovtIdNumber(raw: string): Promise<string> {
  const normalized = normalizeGovtIdNumber(raw);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalized,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return digest.toLowerCase();
}

/** Last 4 characters of the normalised ID, kept for display only. */
export function govtIdLast4(raw: string): string {
  return normalizeGovtIdNumber(raw).slice(-4);
}

export interface KycDocument {
  id: number;
  documentType: KycDocumentType;
  /** SHA-256 of the ID number. The raw number is never stored or returned. */
  idNumberHash?: string;
  /** Last 4 characters, for display (e.g. rendered as "•••• •••• 4521"). */
  idNumberLast4?: string;
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

/**
 * What actually goes over the wire. There is deliberately no field carrying the
 * raw ID number — build this with `buildSubmitKycRequest` rather than by hand.
 */
export interface SubmitKycRequest {
  documentType: KycDocumentType;
  idNumberHash: string;
  idNumberLast4: string;
  frontImageBase64?: string;
  backImageBase64?: string;
}

/** Form state held in the component only, never sent and never persisted. */
export interface KycFormInput {
  documentType: KycDocumentType;
  documentNumber: string;
}

/** Hashes the raw number and returns the request body to submit. */
export async function buildSubmitKycRequest(
  form: KycFormInput,
  images?: { frontImageBase64?: string; backImageBase64?: string }
): Promise<SubmitKycRequest> {
  return {
    documentType: form.documentType,
    idNumberHash: await hashGovtIdNumber(form.documentNumber),
    idNumberLast4: govtIdLast4(form.documentNumber),
    ...images,
  };
}

const MOCK_KYC: KycSummary = {
  overallStatus: 'PENDING_REVIEW',
  submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  documents: [
    { id: 1, documentType: 'AADHAAR', idNumberLast4: '4521', status: 'PENDING_REVIEW', submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
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
