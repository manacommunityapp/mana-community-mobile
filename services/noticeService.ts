import api from './apiClient';

export interface NoticeDto {
  id: string;
  title: string;
  content: string;
  category: 'GENERAL' | 'MAINTENANCE' | 'EVENT' | 'SECURITY' | 'URGENT';
  publishedAt: string;
  publisherName: string;
  isPinned: boolean;
  attachmentUrl?: string;
}

export const noticeService = {
  async getNotices(): Promise<NoticeDto[]> {
    const res = await api.get<NoticeDto[]>('/notices');
    return res.data;
  },

  async getNotice(id: string): Promise<NoticeDto> {
    const res = await api.get<NoticeDto>(`/notices/${id}`);
    return res.data;
  },
};
