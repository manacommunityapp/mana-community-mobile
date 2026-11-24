import api from './apiClient';
import { CONFIG } from '@/constants/config';

export interface MobileWorkflowRequest {
  module: string;
  route: string;
  action: string;
  message: string;
  conversationId?: number;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: Record<string, unknown>;
}

export interface MobileWorkflowResponse {
  reply: string;
  conversationId: number;
  timestamp: string;
}

export const n8nWorkflowService = {
  isConfigured(): boolean {
    return Boolean(CONFIG.N8N_AI_WEBHOOK_URL.trim());
  },

  async invokeAssistant(request: MobileWorkflowRequest): Promise<MobileWorkflowResponse> {
    const webhookUrl = CONFIG.N8N_AI_WEBHOOK_URL.trim();
    if (!webhookUrl) throw new Error('N8N AI webhook URL is not configured.');

    const response = await api.post<MobileWorkflowResponse>(webhookUrl, request, { timeout: 45_000 });
    if (!response.data || typeof response.data.reply !== 'string' || !response.data.reply.trim()) {
      throw new Error('n8n workflow returned an invalid assistant response.');
    }
    return response.data;
  },
};