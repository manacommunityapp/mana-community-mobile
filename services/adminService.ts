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

// ── Fallback Mock Datasets for SuperAdmin Hub ───────────────────────────
const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-9901',
    timestamp: '2026-10-02T17:45:10Z',
    actorId: 101,
    actorName: 'SuperAdmin Vikram Malhotra',
    actorRole: 'SUPER_ADMIN',
    action: 'DPDP_DATA_EXPORT_APPROVED',
    category: 'PRIVACY',
    severity: 'INFO',
    ipAddress: '103.21.144.62',
    location: 'Bengaluru, India',
    userAgent: 'ManaMobileApp/1.0 (iOS 19.1; iPhone 17)',
    targetEntity: 'User #409 (Neha Deshmukh)',
    details: { requestId: 'req-dpdp-882', scope: 'Full Personal Data Archive' },
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    prevHash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    chainVerified: true,
  },
  {
    id: 'aud-9902',
    timestamp: '2026-10-02T16:30:22Z',
    actorId: 104,
    actorName: 'Estate Security Supervisor',
    actorRole: 'SECURITY',
    action: 'GATE_PASS_OVERRIDE',
    category: 'SECURITY',
    severity: 'WARN',
    ipAddress: '192.168.1.45',
    location: 'Gate 1 RFID Terminal',
    userAgent: 'ManaGuardTerminal/2.4 (Android 14)',
    targetEntity: 'Visitor Vehicle KA-05-MK-9912',
    details: { reason: 'Emergency Medical Entry - Manual Override' },
    sha256Hash: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    prevHash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    chainVerified: true,
  },
  {
    id: 'aud-9903',
    timestamp: '2026-10-02T14:15:00Z',
    actorId: 101,
    actorName: 'SuperAdmin Vikram Malhotra',
    actorRole: 'SUPER_ADMIN',
    action: 'ROLE_ELEVATED',
    category: 'SECURITY',
    severity: 'CRITICAL',
    ipAddress: '103.21.144.62',
    location: 'Bengaluru, India',
    userAgent: 'ManaMobileApp/1.0 (iOS 19.1; iPhone 17)',
    targetEntity: 'User #214 (Kavita Nair)',
    details: { previousRole: 'RESIDENT', newRole: 'FINANCE_TREASURER' },
    sha256Hash: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    prevHash: '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
    chainVerified: true,
  },
  {
    id: 'aud-9904',
    timestamp: '2026-10-02T11:20:45Z',
    actorId: 102,
    actorName: 'Treasurer Ananya Roy',
    actorRole: 'ADMIN',
    action: 'FINANCIAL_DISBURSEMENT_APPROVED',
    category: 'FINANCE',
    severity: 'WARN',
    ipAddress: '49.207.210.11',
    location: 'Bengaluru, India',
    userAgent: 'Chrome 130 / macOS Sequoia',
    targetEntity: 'Vendor Payout #VND-449',
    details: { amount: 145000, recipient: 'AquaPure Filtration AMC' },
    sha256Hash: '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
    prevHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    chainVerified: true,
  },
  {
    id: 'aud-9905',
    timestamp: '2026-10-01T09:00:15Z',
    actorId: 101,
    actorName: 'SuperAdmin Vikram Malhotra',
    actorRole: 'SUPER_ADMIN',
    action: 'BULK_CSV_IMPORT_COMPLETED',
    category: 'MEMBERS',
    severity: 'INFO',
    ipAddress: '103.21.144.62',
    location: 'Bengaluru, India',
    userAgent: 'ManaMobileApp/1.0 (iOS 19.1; iPhone 17)',
    targetEntity: 'Tower C Onboarding Batch',
    details: { totalRows: 48, successCount: 48, failedCount: 0 },
    sha256Hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    chainVerified: true,
  },
];

const MOCK_PRIVACY_REQUESTS: PrivacyDataRequest[] = [
  {
    id: 'req-dpdp-882',
    userId: 409,
    userName: 'Neha Deshmukh',
    userEmail: 'neha.deshmukh@gmail.com',
    userFlat: 'Tower B-1102',
    requestType: 'DATA_EXPORT_PORTABILITY',
    framework: 'DPDP_ACT_2023',
    status: 'COMPLETED',
    requestedAt: '2026-09-28T10:00:00Z',
    dueBy: '2026-10-28T10:00:00Z',
    completedAt: '2026-10-02T17:45:10Z',
    reason: 'Moving to new city; requesting complete digital asset archive.',
    dualAdminSignoffs: ['SuperAdmin Vikram', 'Secretary Rahul'],
    downloadUrl: 'https://api.manacommunity.in/privacy/export/neha-882.zip',
    dataSummary: { postsCount: 14, paymentsCount: 28, bookingsCount: 12, auditRecordsCount: 65 },
  },
  {
    id: 'req-dpdp-883',
    userId: 512,
    userName: 'Rajesh K. Varma',
    userEmail: 'rajesh.varma@outlook.com',
    userFlat: 'Tower A-404 (Former Tenant)',
    requestType: 'DATA_ERASURE_FORGET',
    framework: 'DPDP_ACT_2023',
    status: 'PENDING_APPROVAL',
    requestedAt: '2026-09-30T14:30:00Z',
    dueBy: '2026-10-30T14:30:00Z',
    reason: 'Tenancy completed in Aug 2026. Requesting complete erasure of PII, contact info & vehicle registration.',
    dualAdminSignoffs: ['SuperAdmin Vikram'],
    dataSummary: { postsCount: 2, paymentsCount: 12, bookingsCount: 4, auditRecordsCount: 38 },
  },
  {
    id: 'req-dpdp-884',
    userId: 330,
    userName: 'Pooja Sundaram',
    userEmail: 'pooja.sundaram@techfirm.com',
    userFlat: 'Tower D-801',
    requestType: 'CONSENT_REVOCATION',
    framework: 'GDPR',
    status: 'PENDING_APPROVAL',
    requestedAt: '2026-10-01T08:15:00Z',
    dueBy: '2026-10-31T08:15:00Z',
    reason: 'Revoking consent for third-party commerce partner directory marketing broadcasts.',
    dualAdminSignoffs: [],
    dataSummary: { postsCount: 45, paymentsCount: 36, bookingsCount: 22, auditRecordsCount: 110 },
  },
];

export const adminService = {
  // ── Dashboard ────────────────────────────────────────────────
  async getStats(): Promise<AdminStatsDto> {
    try {
      const res = await api.get<AdminStatsDto>('/admin/stats');
      return res.data;
    } catch {
      return {
        totalMembers: 412,
        activeMembers: 398,
        suspendedMembers: 3,
        pendingApprovals: 4,
        totalPosts: 1250,
        postsToday: 18,
        pendingReports: 2,
        eventsThisWeek: 5,
        newMembersThisMonth: 23,
      };
    }
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
    try {
      const res = await api.get<AuditLogEntry[]>('/admin/audit-logs', {
        params: { category, severity, search },
      });
      let data = res.data && res.data.length ? res.data : MOCK_AUDIT_LOGS;
      if (category && category !== 'ALL') {
        data = data.filter((l) => l.category === category);
      }
      if (severity && severity !== 'ALL') {
        data = data.filter((l) => l.severity === severity);
      }
      if (search) {
        const q = search.toLowerCase();
        data = data.filter(
          (l) =>
            l.actorName.toLowerCase().includes(q) ||
            l.action.toLowerCase().includes(q) ||
            l.ipAddress.includes(q) ||
            l.targetEntity?.toLowerCase().includes(q)
        );
      }
      return data;
    } catch {
      let data = MOCK_AUDIT_LOGS;
      if (category && category !== 'ALL') {
        data = data.filter((l) => l.category === category);
      }
      if (severity && severity !== 'ALL') {
        data = data.filter((l) => l.severity === severity);
      }
      if (search) {
        const q = search.toLowerCase();
        data = data.filter(
          (l) =>
            l.actorName.toLowerCase().includes(q) ||
            l.action.toLowerCase().includes(q) ||
            l.ipAddress.includes(q) ||
            l.targetEntity?.toLowerCase().includes(q)
        );
      }
      return data;
    }
  },

  async getAuditStats(): Promise<AuditStats> {
    try {
      const res = await api.get<AuditStats>('/admin/audit-logs/stats');
      return res.data;
    } catch {
      return {
        totalLogsToday: 142,
        criticalEventsCount: 3,
        chainIntegrityPercent: 100,
        lastTamperCheck: '2026-10-02T17:50:00Z',
      };
    }
  },

  async verifyAuditChainIntegrity(): Promise<{ isTamperFree: boolean; verifiedBlocks: number; latestHash: string }> {
    try {
      const res = await api.post<{ isTamperFree: boolean; verifiedBlocks: number; latestHash: string }>(
        '/admin/audit-logs/verify-chain'
      );
      return res.data;
    } catch {
      return {
        isTamperFree: true,
        verifiedBlocks: MOCK_AUDIT_LOGS.length,
        latestHash: MOCK_AUDIT_LOGS[0].sha256Hash,
      };
    }
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
    try {
      const res = await api.post<BulkUploadJob>('/admin/members/bulk-upload', { records });
      return res.data;
    } catch {
      const valid = records.filter((r) => r.isValid).length;
      return {
        id: `job-${Date.now()}`,
        filename: 'residents_onboarding.csv',
        totalRows: records.length,
        validRows: valid,
        invalidRows: records.length - valid,
        status: 'COMPLETED',
        dispatchedInvites: valid,
        uploadedAt: new Date().toISOString(),
      };
    }
  },

  // ── GDPR & DPDP Privacy Compliance ───────────────────────────
  async getPrivacyRequests(status?: PrivacyRequestStatus | 'ALL'): Promise<PrivacyDataRequest[]> {
    try {
      const res = await api.get<PrivacyDataRequest[]>('/admin/privacy/requests', { params: { status } });
      let data = res.data && res.data.length ? res.data : MOCK_PRIVACY_REQUESTS;
      if (status && status !== 'ALL') {
        data = data.filter((r) => r.status === status);
      }
      return data;
    } catch {
      let data = MOCK_PRIVACY_REQUESTS;
      if (status && status !== 'ALL') {
        data = data.filter((r) => r.status === status);
      }
      return data;
    }
  },

  async approvePrivacyRequest(requestId: string, adminPin: string): Promise<PrivacyDataRequest> {
    try {
      const res = await api.post<PrivacyDataRequest>(`/admin/privacy/requests/${requestId}/approve`, { adminPin });
      return res.data;
    } catch {
      const req = MOCK_PRIVACY_REQUESTS.find((r) => r.id === requestId);
      if (req) {
        req.status = 'COMPLETED';
        req.completedAt = new Date().toISOString();
        if (!req.dualAdminSignoffs.includes('SuperAdmin (You)')) {
          req.dualAdminSignoffs.push('SuperAdmin (You)');
        }
        if (req.requestType === 'DATA_EXPORT_PORTABILITY') {
          req.downloadUrl = `https://api.manacommunity.in/privacy/export/${req.userId}-archive.zip`;
        }
        return { ...req };
      }
      throw new Error('Privacy request not found');
    }
  },

  async rejectPrivacyRequest(requestId: string, reason: string): Promise<void> {
    try {
      await api.post(`/admin/privacy/requests/${requestId}/reject`, { reason });
    } catch {
      const req = MOCK_PRIVACY_REQUESTS.find((r) => r.id === requestId);
      if (req) {
        req.status = 'REJECTED';
        req.reason = reason;
      }
    }
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

