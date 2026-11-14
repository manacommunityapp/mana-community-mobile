import { apiClient } from './apiClient';
import type {
  VendorCapabilityDto,
  VendorDocumentDto,
  UploadVendorDocumentRequest,
  FulfilmentGroupDto,
  RecordWeightRequest,
  WeightAdjustmentDto,
} from '@/types/freshVendor';

export const freshVendorService = {
  getVendorCapabilities: async (vendorId: number): Promise<VendorCapabilityDto[]> => {
    const res = await apiClient.get<VendorCapabilityDto[]>(`/v1/fresh/vendor/capabilities?vendorId=${vendorId}`);
    return res.data;
  },

  getVendorDocuments: async (vendorId: number): Promise<VendorDocumentDto[]> => {
    const res = await apiClient.get<VendorDocumentDto[]>(`/v1/fresh/vendor/documents?vendorId=${vendorId}`);
    return res.data;
  },

  uploadVendorDocument: async (data: UploadVendorDocumentRequest): Promise<VendorDocumentDto> => {
    const res = await apiClient.post<VendorDocumentDto>('/v1/fresh/vendor/documents', data);
    return res.data;
  },

  getVendorFulfilmentGroups: async (vendorId: number): Promise<FulfilmentGroupDto[]> => {
    const res = await apiClient.get<FulfilmentGroupDto[]>(`/v1/fresh/fulfilment/vendors/${vendorId}/groups`);
    return res.data;
  },

  verifyHandover: async (groupId: number, otp: string, qrCodeToken?: string): Promise<FulfilmentGroupDto> => {
    const res = await apiClient.post<FulfilmentGroupDto>(`/v1/fresh/fulfilment/groups/${groupId}/verify-handover`, {
      otp,
      qrCodeToken,
    });
    return res.data;
  },

  recordActualWeight: async (data: RecordWeightRequest): Promise<WeightAdjustmentDto> => {
    const res = await apiClient.post<WeightAdjustmentDto>('/v1/fresh/weight/adjust', data);
    return res.data;
  },
};
