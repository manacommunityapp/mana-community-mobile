import { Platform } from 'react-native';
import api from './apiClient';
import type { ConversationDto, ChatMessageDto, PageResponse, ChatContactDto } from '@/types/api';

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

  async getContacts(): Promise<ChatContactDto[]> {
    try {
      const res = await api.get<ChatContactDto[]>('/chat/contacts');
      return res.data;
    } catch {
      return [];
    }
  },

  async startDirect(userId: number): Promise<ConversationDto> {
    const res = await api.post<ConversationDto>('/chat/conversations/direct', { userId });
    return res.data;
  },

  async createGroup(title: string, userIds: number[]): Promise<ConversationDto> {
    try {
      const res = await api.post<ConversationDto>('/chat/conversations/group', { title, userIds });
      return res.data;
    } catch {
      try {
        const res = await api.post<any>('/groups', { name: title, description: `Group chat: ${title}` });
        return {
          id: res.data.id || Date.now(),
          type: 'GROUP',
          title,
          name: title,
          isGroup: true,
          unreadCount: 0,
          participants: userIds.map((id) => ({ userId: id, name: `Member ${id}`, online: false })),
        };
      } catch {
        if (userIds.length > 0) {
          return await chatService.startDirect(userIds[0]);
        }
        throw new Error('Unable to create group chat');
      }
    }
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
