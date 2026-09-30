import api from './apiClient';
import type { AiChatRequest, AiChatResponse } from '@/types/api';

export const aiChatService = {
  /**
   * Send a query to the Mana Community AI Assistant
   */
  async sendMessage(
    message: string,
    conversationId?: number,
    auctionConfigId?: number,
  ): Promise<AiChatResponse> {
    const payload: AiChatRequest = {
      message,
      conversationId,
      auctionConfigId,
    };

    const res = await api.post<AiChatResponse>('/ai/chat', payload);
    return res.data;
  },
};
