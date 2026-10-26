import api from './apiClient';

export type SecurityRecordType = 'TRUSTED_VISITOR' | 'PACKAGE' | 'BLACKLIST' | 'INTERCOM_CALL' | 'GUARD_DAILY_LOG' | 'SHIFT_HANDOVER';
export interface SecurityRecord {
  id: number;
  recordType: SecurityRecordType;
  name?: string;
  phone?: string;
  vehicleNumber?: string;
  validFrom?: string;
  validUntil?: string;
  timeWindow?: string;
  purpose?: string;
  location?: string;
  status: string;
  notes?: string;
  createdAt: string;
  generatedOtp?: string;
}
export interface SecurityRecordRequest { name?: string; phone?: string; vehicleNumber?: string; validFrom?: string; validUntil?: string; timeWindow?: string; purpose?: string; location?: string; status?: string; notes?: string; }

const scoped = (path: string) => api.get<SecurityRecord[]>(`/security/${path}`).then(r => Array.isArray(r.data) ? r.data : []);
export const securityOperationsService = {
  getTrustedVisitors: () => scoped('trusted-visitors'),
  createTrustedVisitor: (request: SecurityRecordRequest) => api.post<SecurityRecord>('/security/trusted-visitors', request).then(r => r.data),
  updateTrustedVisitor: (id: number, request: SecurityRecordRequest) => api.put<SecurityRecord>(`/security/trusted-visitors/${id}`, request).then(r => r.data),
  deleteTrustedVisitor: (id: number) => api.delete(`/security/trusted-visitors/${id}`),
  getPackages: () => scoped('packages'),
  createPackage: (request: SecurityRecordRequest) => api.post<SecurityRecord>('/security/packages', request).then(r => r.data),
  collectPackage: (id: number, otp: string) => api.post<SecurityRecord>(`/security/packages/${id}/collect`, null, { params: { otp } }).then(r => r.data),
  getBlacklist: () => scoped('blacklist'),
  createBlacklist: (request: SecurityRecordRequest) => api.post<SecurityRecord>('/security/blacklist', request).then(r => r.data),
  updateBlacklist: (id: number, request: SecurityRecordRequest) => api.put<SecurityRecord>(`/security/blacklist/${id}`, request).then(r => r.data),
  deleteBlacklist: (id: number) => api.delete(`/security/blacklist/${id}`),
  requestIntercom: (request: SecurityRecordRequest) => api.post<SecurityRecord>('/security/intercom/calls', request).then(r => r.data),
  getIntercomCalls: () => scoped('intercom/calls'),
  decideIntercom: (id: number, request: SecurityRecordRequest) => api.put<SecurityRecord>(`/security/intercom/calls/${id}`, request).then(r => r.data),
  getGuardLogs: () => scoped('guard/logs'),
  createGuardLog: (request: SecurityRecordRequest) => api.post<SecurityRecord>('/security/guard/logs', request).then(r => r.data),
  getHandovers: () => scoped('guard/handover'),
  createHandover: (request: SecurityRecordRequest) => api.post<SecurityRecord>('/security/guard/handover', request).then(r => r.data),
};
