import { Platform } from 'react-native';
import api from './apiClient';
import type { ConversationDto, ChatMessageDto, PageResponse } from '@/types/api';

export interface PickedFile {
  uri: string;
  name: string;
  type: string;
}

export const chatService = {
  async getConversations(): Promise<ConversationDto[]> {
    const res = await api.get<ConversationDto[]>('/chat/conversations');
    return res.data;
  },

  async startDirect(userId: number): Promise<ConversationDto> {
    const res = await api.post<ConversationDto>('/chat/conversations/direct', { userId });
    return res.data;
  },

  async getMessages(conversationId: number, page = 0): Promise<PageResponse<ChatMessageDto>> {
    const res = await api.get<PageResponse<ChatMessageDto>>(
      `/chat/conversations/${conversationId}/messages`,
      { params: { page, size: 30, sort: 'createdAt,desc' } }
    );
    return res.data;
  },

  async sendMessage(conversationId: number, content: string): Promise<ChatMessageDto> {
    const res = await api.post<ChatMessageDto>(
      `/chat/conversations/${conversationId}/messages`,
      { content }
    );
    return res.data;
  },

  async sendWithAttachments(
    conversationId: number,
    files: PickedFile[],
    content?: string,
  ): Promise<ChatMessageDto> {
    const form = new FormData();
    if (content?.trim()) form.append('content', content.trim());
    for (const file of files) {
      form.append('files', {
        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
        name: file.name,
        type: file.type,
      } as any);
    }
    const res = await api.post<ChatMessageDto>(
      `/chat/conversations/${conversationId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
  },

  async markRead(conversationId: number): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/read`);
  },
};
