import api from './apiClient';
import type {
  AdminStatsDto, AdminMemberDto, ReportDto,
  AnnouncementDto, CreateAnnouncementRequest,
  CommunitySettingsDto, PageResponse,
} from '@/types/api';
import type {
  AuditLogEntry,
  AuditStats,
  AuditCategory,
  AuditSeverity,
  BulkResidentRecord,
  BulkUploadJob,
  PrivacyDataRequest,
  PrivacyRequestStatus,
} from '@/types/adminSecurity';

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

  // ── Security & Audit Trail Logs ──────────────────────────────
  async getAuditLogs(
    category?: AuditCategory | 'ALL',
    severity?: AuditSeverity | 'ALL',
    search?: string,
  ): Promise<AuditLogEntry[]> {
    const res = await api.get<AuditLogEntry[]>('/admin/audit-logs', {
      params: { category, severity, search },
    });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getAuditStats(): Promise<AuditStats> {
    const res = await api.get<AuditStats>('/admin/audit-logs/stats');
    return res.data;
  },

  async verifyAuditChainIntegrity(): Promise<{ isTamperFree: boolean; verifiedBlocks: number; latestHash: string }> {
    const res = await api.post<{ isTamperFree: boolean; verifiedBlocks: number; latestHash: string }>(
      '/admin/audit-logs/verify-chain'
    );
    return res.data;
  },

  // ── Bulk Resident Onboarding ─────────────────────────────────
  async parseAndValidateCsv(csvText: string): Promise<BulkResidentRecord[]> {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const records: BulkResidentRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (row.length === 0 || row.every((c) => !c)) continue;

      const fullName = row[0] || '';
      const email = row[1] || '';
      const phone = row[2] || '';
      const tower = row[3] || '';
      const flatNumber = row[4] || '';
      const occupancyStatus = (row[5]?.toUpperCase() === 'TENANT' ? 'TENANT' : row[5]?.toUpperCase() === 'FAMILY' ? 'FAMILY' : 'OWNER') as any;
      const role = (row[6]?.toUpperCase() === 'COMMITTEE_MEMBER' ? 'COMMITTEE_MEMBER' : 'RESIDENT') as any;

      const errors: string[] = [];
      if (!fullName) errors.push('Name missing');
      if (!email || !email.includes('@')) errors.push('Invalid email');
      if (!phone || phone.replace(/\D/g, '').length < 10) errors.push('Invalid 10-digit phone');
      if (!tower) errors.push('Tower missing');
      if (!flatNumber) errors.push('Flat number missing');

      records.push({
        id: `row-${i}`,
        fullName,
        email,
        phone,
        tower,
        flatNumber,
        occupancyStatus,
        role,
        isValid: errors.length === 0,
        validationErrors: errors.length > 0 ? errors : undefined,
      });
    }

    return records;
  },

  async executeBulkUpload(records: BulkResidentRecord[]): Promise<BulkUploadJob> {
    const res = await api.post<BulkUploadJob>('/admin/members/bulk-upload', { records });
    return res.data;
  },

  // ── GDPR & DPDP Privacy Compliance ───────────────────────────
  async getPrivacyRequests(status?: PrivacyRequestStatus | 'ALL'): Promise<PrivacyDataRequest[]> {
    const res = await api.get<PrivacyDataRequest[]>('/admin/privacy/requests', { params: { status } });
    return Array.isArray(res.data) ? res.data : [];
  },

  async approvePrivacyRequest(requestId: string, adminPin: string): Promise<PrivacyDataRequest> {
    const res = await api.post<PrivacyDataRequest>(`/admin/privacy/requests/${requestId}/approve`, { adminPin });
    return res.data;
  },

  async rejectPrivacyRequest(requestId: string, reason: string): Promise<void> {
    await api.post(`/admin/privacy/requests/${requestId}/reject`, { reason });
  },
};

export {
  adminRoleService,
  type ApprovalType,
  type ApprovalStatus,
  type SecurityAlertLevel,
  type GovernanceItemType,
  type GovernanceStatus,
  type AdminApproval,
  type FinanceEntry,
  type SecurityAlert,
  type GovernanceItem,
  type AdminDashboardStats,
  type AnalyticsData,
} from './adminRoleService';

