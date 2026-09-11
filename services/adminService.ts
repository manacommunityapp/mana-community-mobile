import api from './apiClient';
import type {
  AdminStatsDto, AdminMemberDto, ReportDto,
  AnnouncementDto, CreateAnnouncementRequest,
  CommunitySettingsDto, PageResponse,
} from '@/types/api';

export const adminService = {
  // ── Dashboard ────────────────────────────────────────────────
  async getStats(): Promise<AdminStatsDto> {
    const res = await api.get<AdminStatsDto>('/admin/stats');
    return res.data;
  },

  // ── Members ──────────────────────────────────────────────────
  async getMembers(
    status: 'ALL' | 'PENDING' | 'ACTIVE' | 'SUSPENDED' = 'ALL',
    page = 0,
    search?: string,
  ): Promise<PageResponse<AdminMemberDto>> {
    const res = await api.get<PageResponse<AdminMemberDto>>('/admin/members', {
      params: { status, page, size: 20, search },
    });
    return res.data;
  },

  async approveMember(userId: number): Promise<void> {
    await api.put(`/admin/members/${userId}/approve`);
  },

  async rejectMember(userId: number, reason?: string): Promise<void> {
    await api.put(`/admin/members/${userId}/reject`, { reason });
  },

  async suspendMember(userId: number, reason?: string): Promise<void> {
    await api.put(`/admin/members/${userId}/suspend`, { reason });
  },

  async activateMember(userId: number): Promise<void> {
    await api.put(`/admin/members/${userId}/activate`);
  },

  async changeRole(userId: number, role: string): Promise<void> {
    await api.put(`/admin/members/${userId}/role`, { role });
  },

  // ── Content Moderation ───────────────────────────────────────
  async getReports(
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'ALL' = 'PENDING',
    page = 0,
  ): Promise<PageResponse<ReportDto>> {
    const res = await api.get<PageResponse<ReportDto>>('/admin/reports', {
      params: { status, page, size: 20 },
    });
    return res.data;
  },

  async removeContent(targetType: 'POST' | 'COMMENT', targetId: number): Promise<void> {
    await api.delete(`/admin/content/${targetType.toLowerCase()}/${targetId}`);
  },

  async resolveReport(reportId: number): Promise<void> {
    await api.put(`/admin/reports/${reportId}/resolve`);
  },

  async dismissReport(reportId: number): Promise<void> {
    await api.put(`/admin/reports/${reportId}/dismiss`);
  },

  // ── Announcements ────────────────────────────────────────────
  async getAnnouncements(page = 0): Promise<PageResponse<AnnouncementDto>> {
    const res = await api.get<PageResponse<AnnouncementDto>>('/admin/announcements', {
      params: { page, size: 20 },
    });
    return res.data;
  },

  async createAnnouncement(data: CreateAnnouncementRequest): Promise<AnnouncementDto> {
    const res = await api.post<AnnouncementDto>('/admin/announcements', data);
    return res.data;
  },

  async pinAnnouncement(id: number, pinned: boolean): Promise<void> {
    await api.put(`/admin/announcements/${id}/pin`, { pinned });
  },

  async deleteAnnouncement(id: number): Promise<void> {
    await api.delete(`/admin/announcements/${id}`);
  },

  // ── Community Settings ───────────────────────────────────────
  async getCommunitySettings(): Promise<CommunitySettingsDto> {
    const res = await api.get<CommunitySettingsDto>('/admin/community/settings');
    return res.data;
  },

  async updateCommunitySettings(
    data: Partial<Omit<CommunitySettingsDto, 'id' | 'inviteCode'>>,
  ): Promise<CommunitySettingsDto> {
    const res = await api.put<CommunitySettingsDto>('/admin/community/settings', data);
    return res.data;
  },

  async regenerateInviteCode(): Promise<{ inviteCode: string }> {
    const res = await api.post<{ inviteCode: string }>('/admin/community/regenerate-invite');
    return res.data;
  },
};
