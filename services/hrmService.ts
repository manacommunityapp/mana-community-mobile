import api from './apiClient';
import type {
  HrEmployee,
  HrEmployeeListItem,
  AttendanceRecord,
  AttendanceSummary,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  HrShift,
  HrEmployeeShift,
  HrDashboardData,
  HrEmployeeDocument,
  HrHoliday,
  ApplyLeaveRequest,
  CheckInOutRequest,
} from '@/types/hrm';

const BASE = '/v1/hr';

interface HrOrganizationSummary {
  id: number;
  organizationName: string;
  organizationType: string;
}

export const hrmService = {
  // Organizations - bootstrap to get orgId
  getMyOrganizations: () =>
    api.get<HrOrganizationSummary[]>(`${BASE}/organizations`).then(r => r.data),

  // Employee profile
  getMyProfile: (orgId: number) =>
    api.get<HrEmployee>(`${BASE}/employees/me`, { params: { orgId } }).then(r => r.data),

  // Attendance
  checkIn: (orgId: number, data: CheckInOutRequest) =>
    api.post<AttendanceRecord>(`${BASE}/attendance/check-in?orgId=${orgId}`, data).then(r => r.data),

  checkOut: (orgId: number, data: CheckInOutRequest) =>
    api.post<AttendanceRecord>(`${BASE}/attendance/check-out?orgId=${orgId}`, data).then(r => r.data),

  getMyAttendance: (orgId: number, from: string, to: string) =>
    api.get<AttendanceRecord[]>(`${BASE}/attendance/my`, { params: { orgId, from, to } }).then(r => r.data),

  getAttendanceSummary: (orgId: number, date: string) =>
    api.get<AttendanceSummary>(`${BASE}/attendance/organizations/${orgId}/summary`, { params: { date } }).then(r => r.data),

  // Leaves
  getLeaveTypes: (orgId: number) =>
    api.get<LeaveType[]>(`${BASE}/organizations/${orgId}/leave-types`).then(r => r.data),

  applyLeave: (data: ApplyLeaveRequest) =>
    api.post<LeaveRequest>(`${BASE}/leaves/apply`, data).then(r => r.data),

  getLeaveBalance: () =>
    api.get<LeaveBalance[]>(`${BASE}/leaves/balance`).then(r => r.data),

  getMyLeaveRequests: (page = 0, size = 20) =>
    api.get<{ content: LeaveRequest[]; totalElements: number; totalPages: number; page: number }>(
      `${BASE}/leaves/my-requests`, { params: { page, size } },
    ).then(r => r.data),

  cancelLeave: (id: number) =>
    api.post(`${BASE}/leaves/${id}/cancel`).then(r => r.data),

  // Manager leave approvals
  getPendingLeaveRequests: (orgId: number, page = 0, size = 20) =>
    api.get<{ content: LeaveRequest[]; totalElements: number; totalPages: number; page: number }>(
      `${BASE}/leaves/organizations/${orgId}/requests`,
      { params: { status: 'PENDING', page, size } },
    ).then(r => r.data),

  approveLeave: (id: number, remarks?: string) =>
    api.post(`${BASE}/leaves/${id}/approve`, { approverRemarks: remarks }).then(r => r.data),

  rejectLeave: (id: number, remarks?: string) =>
    api.post(`${BASE}/leaves/${id}/reject`, { approverRemarks: remarks }).then(r => r.data),

  // Shifts
  getMyShifts: (from: string, to: string) =>
    api.get<HrEmployeeShift[]>(`${BASE}/shifts/my-schedule`, { params: { from, to } }).then(r => r.data),

  // Dashboard (manager)
  getDashboard: (orgId: number) =>
    api.get<HrDashboardData>(`${BASE}/dashboard/organizations/${orgId}`).then(r => r.data),

  // Employees (manager)
  getEmployees: (orgId: number, page = 0, size = 20) =>
    api.get<{ content: HrEmployeeListItem[]; totalElements: number; totalPages: number; page: number }>(
      `${BASE}/organizations/${orgId}/employees`, { params: { page, size } },
    ).then(r => r.data),

  getEmployee: (orgId: number, employeeId: number) =>
    api.get<HrEmployee>(`${BASE}/organizations/${orgId}/employees/${employeeId}`).then(r => r.data),

  // Documents
  getMyDocuments: () =>
    api.get<HrEmployeeDocument[]>(`${BASE}/employees/me/documents`).then(r => r.data),

  // Holidays
  getHolidays: (orgId: number, year: number) =>
    api.get<HrHoliday[]>(`${BASE}/organizations/${orgId}/holidays`, { params: { year } }).then(r => r.data),
};
