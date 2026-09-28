import api from './apiClient';
import type {
  PropertyUnitDto,
  MoveInOutNocDto,
  FlatDocumentDto,
  AIPropertyInsightDto,
} from '@/types/cpos';

export const cposService = {
  async getMyProperties(): Promise<PropertyUnitDto[]> {
    const res = await api.get<PropertyUnitDto[]>('/cpos/properties/mine');
    return res.data;
  },

  async getNocRequests(): Promise<MoveInOutNocDto[]> {
    const res = await api.get<MoveInOutNocDto[]>('/cpos/nocs');
    return res.data;
  },

  async requestNoc(payload: Partial<MoveInOutNocDto>): Promise<MoveInOutNocDto> {
    const res = await api.post<MoveInOutNocDto>('/cpos/nocs', payload);
    return res.data;
  },

  async getDocuments(): Promise<FlatDocumentDto[]> {
    const res = await api.get<FlatDocumentDto[]>('/cpos/documents');
    return res.data;
  },

  async getAIInsights(): Promise<AIPropertyInsightDto[]> {
    const res = await api.get<AIPropertyInsightDto[]>('/cpos/ai-insights');
    return res.data;
  },
};
