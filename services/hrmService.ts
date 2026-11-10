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
  EmploymentHistory,
  OnboardingTask,
  OffboardingTask,
  SelfServiceUpdateRequest,
  AttendanceCorrectionRequest,
  Timesheet,
  ShiftSwapRequest,
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
    api.get<HrEmployee>(`${BASE}/organizations/${orgId}/employees/me`, { params: { orgId } }).then(r => r.data),

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

  applyLeave: (orgId: number, data: ApplyLeaveRequest) =>
    api.post<LeaveRequest>(`${BASE}/leaves/apply?orgId=${orgId}`, data).then(r => r.data),

  getLeaveBalance: (orgId: number) =>
    api.get<LeaveBalance[]>(`${BASE}/leaves/balance`, { params: { orgId } }).then(r => r.data),

  getMyLeaveRequests: (orgId: number, page = 0, size = 20) =>
    api.get<{ content: LeaveRequest[]; totalElements: number; totalPages: number; page: number }>(
      `${BASE}/leaves/my-requests`, { params: { orgId, page, size } },
    ).then(r => r.data),

  cancelLeave: (id: number, orgId: number) =>
    api.post(`${BASE}/leaves/${id}/cancel?orgId=${orgId}`).then(r => r.data),

  // Manager leave approvals
  getPendingLeaveRequests: (orgId: number, page = 0, size = 20) =>
    api.get<{ content: LeaveRequest[]; totalElements: number; totalPages: number; page: number }>(
      `${BASE}/leaves/organizations/${orgId}/requests`,
      { params: { status: 'PENDING', page, size } },
    ).then(r => r.data),

  approveLeave: (id: number, orgId: number, remarks?: string) =>
    api.post(`${BASE}/leaves/${id}/approve?orgId=${orgId}`, { approverRemarks: remarks }).then(r => r.data),

  rejectLeave: (id: number, orgId: number, remarks?: string) =>
    api.post(`${BASE}/leaves/${id}/reject?orgId=${orgId}`, { approverRemarks: remarks }).then(r => r.data),

  l2ApproveLeave: (id: number, orgId: number, remarks?: string) =>
    api.post(`${BASE}/leaves/${id}/l2-approve?orgId=${orgId}`, { approverRemarks: remarks }).then(r => r.data),

  grantCompOff: (orgId: number, employeeId: number, workedDate: string, reason?: string) => {
    const params = new URLSearchParams({ employeeId: String(employeeId), workedDate });
    if (reason) params.set('reason', reason);
    return api.post(`${BASE}/leaves/organizations/${orgId}/comp-off?${params}`).then((r: any) => r.data);
  },

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

  // Self-service
  updateMyProfile: (orgId: number, data: SelfServiceUpdateRequest) =>
    api.patch<HrEmployee>(`${BASE}/employees/me`, data, { params: { orgId } }).then(r => r.data),

  // Employment history
  getEmploymentHistory: (orgId: number, employeeId: number) =>
    api.get<EmploymentHistory[]>(`${BASE}/organizations/${orgId}/employees/${employeeId}/history`).then(r => r.data),

  // Onboarding
  getOnboardingTasks: (orgId: number, employeeId: number) =>
    api.get<OnboardingTask[]>(`${BASE}/onboarding/employees/${employeeId}/tasks`, { params: { orgId } }).then(r => r.data),

  completeOnboardingTask: (orgId: number, taskId: number) =>
    api.post<OnboardingTask>(`${BASE}/onboarding/tasks/${taskId}/complete`, null, { params: { orgId } }).then(r => r.data),

  getPendingOnboarding: (orgId: number) =>
    api.get<OnboardingTask[]>(`${BASE}/onboarding/organizations/${orgId}/pending`).then(r => r.data),

  // Offboarding
  getOffboardingTasks: (orgId: number, employeeId: number) =>
    api.get<OffboardingTask[]>(`${BASE}/offboarding/employees/${employeeId}/tasks`, { params: { orgId } }).then(r => r.data),

  completeOffboardingTask: (orgId: number, taskId: number) =>
    api.post<OffboardingTask>(`${BASE}/offboarding/tasks/${taskId}/complete`, null, { params: { orgId } }).then(r => r.data),

  // Attendance correction
  correctAttendance: (orgId: number, attendanceId: number, data: AttendanceCorrectionRequest) =>
    api.post<AttendanceRecord>(`${BASE}/attendance/${attendanceId}/correct`, data, { params: { orgId } }).then(r => r.data),

  // Overtime
  approveOvertime: (orgId: number, attendanceId: number) =>
    api.post<AttendanceRecord>(`${BASE}/attendance/${attendanceId}/approve-overtime`, null, { params: { orgId } }).then(r => r.data),

  // Timesheets
  generateTimesheet: (orgId: number, weekDate?: string) =>
    api.post<Timesheet>(`${BASE}/timesheets/generate`, null, { params: weekDate ? { orgId, weekDate } : { orgId } }).then(r => r.data),

  getMyTimesheets: (orgId: number) =>
    api.get<Timesheet[]>(`${BASE}/timesheets/my`, { params: { orgId } }).then(r => r.data),

  submitTimesheet: (orgId: number, timesheetId: number) =>
    api.post<Timesheet>(`${BASE}/timesheets/${timesheetId}/submit`, null, { params: { orgId } }).then(r => r.data),

  approveTimesheet: (orgId: number, timesheetId: number, remarks?: string) =>
    api.post<Timesheet>(`${BASE}/timesheets/${timesheetId}/approve`, null, { params: remarks ? { orgId, remarks } : { orgId } }).then(r => r.data),

  getPendingTimesheets: (orgId: number) =>
    api.get<{ content: Timesheet[] }>(`${BASE}/timesheets/organizations/${orgId}/pending`).then(r => r.data),

  // Shift swaps
  requestShiftSwap: (orgId: number, data: { targetEmployeeId: number; requesterShiftDate: string; targetShiftDate: string; reason?: string }) =>
    api.post<ShiftSwapRequest>(`${BASE}/shifts/swap/request`, data, { params: { orgId } }).then(r => r.data),

  respondToSwap: (orgId: number, swapId: number, accepted: boolean, rejectionReason?: string) =>
    api.post<ShiftSwapRequest>(`${BASE}/shifts/swap/${swapId}/colleague-respond`, null, { params: rejectionReason ? { orgId, accepted, rejectionReason } : { orgId, accepted } }).then(r => r.data),

  managerApproveSwap: (orgId: number, swapId: number, approved: boolean, reason?: string) =>
    api.post<ShiftSwapRequest>(`${BASE}/shifts/swap/${swapId}/manager-approve`, null, { params: reason ? { orgId, approved, reason } : { orgId, approved } }).then(r => r.data),

  getMySwapRequests: (orgId: number) =>
    api.get<ShiftSwapRequest[]>(`${BASE}/shifts/swap/my`, { params: { orgId } }).then(r => r.data),

  getIncomingSwapRequests: (orgId: number) =>
    api.get<ShiftSwapRequest[]>(`${BASE}/shifts/swap/incoming`, { params: { orgId } }).then(r => r.data),

  getPendingSwapApprovals: (orgId: number) =>
    api.get<ShiftSwapRequest[]>(`${BASE}/shifts/swap/organizations/${orgId}/pending`).then(r => r.data),
};
