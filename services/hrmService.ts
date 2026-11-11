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
  JobPosting,
  Applicant,
  Interview,
  Offer,
  AppraisalCycle,
  Goal,
  AppraisalForm,
  Okr,
  OkrKeyResult,
  FeedbackRequest,
  FeedbackResponse,
  TrainingProgram,
  TrainingEnrollment,
  Certification,
  CareerPath,
  Recognition,
  PageResponse,
  Payslip,
  ExpenseClaim,
  ExpenseItem,
  TravelRequest,
  HrAsset,
  HrTask,
  HelpDeskTicket,
  HrComplianceAlert,
  HrAnalyticsDashboard,
  MwSkillPassport,
  MwPassportSkill,
  MwPassportCertification,
  MwPassportWorkHistory,
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

  // ── Recruitment ──
  getJobPostings: (orgId: number, status?: string) => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return api.get<PageResponse<JobPosting>>(`${BASE}/recruitment/organizations/${orgId}/postings`, { params }).then(r => r.data);
  },
  createJobPosting: (orgId: number, data: Partial<JobPosting>) =>
    api.post<JobPosting>(`${BASE}/recruitment/organizations/${orgId}/postings`, data).then(r => r.data),

  getApplicants: (orgId: number, postingId: number, status?: string) => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return api.get<PageResponse<Applicant>>(`${BASE}/recruitment/organizations/${orgId}/postings/${postingId}/applicants`, { params }).then(r => r.data);
  },
  updateApplicantStatus: (orgId: number, applicantId: number, status: string, notes?: string) => {
    const params: Record<string, string> = { status };
    if (notes) params.notes = notes;
    return api.patch<Applicant>(`${BASE}/recruitment/organizations/${orgId}/applicants/${applicantId}/status`, null, { params }).then(r => r.data);
  },
  scheduleInterview: (orgId: number, applicantId: number, data: Partial<Interview>) =>
    api.post<Interview>(`${BASE}/recruitment/organizations/${orgId}/applicants/${applicantId}/interviews`, data).then(r => r.data),
  createOffer: (orgId: number, applicantId: number, data: Partial<Offer>) =>
    api.post<Offer>(`${BASE}/recruitment/organizations/${orgId}/applicants/${applicantId}/offers`, data).then(r => r.data),

  // ── Performance ──
  getAppraisalCycles: (orgId: number) =>
    api.get<AppraisalCycle[]>(`${BASE}/performance/organizations/${orgId}/cycles`).then(r => r.data),
  getGoals: (employeeId: number, cycleId?: number) => {
    const params: Record<string, string> = {};
    if (cycleId !== undefined) params.cycleId = String(cycleId);
    return api.get<Goal[]>(`${BASE}/performance/employees/${employeeId}/goals`, { params }).then(r => r.data);
  },
  createGoal: (orgId: number, employeeId: number, data: Partial<Goal>) =>
    api.post<Goal>(`${BASE}/performance/organizations/${orgId}/employees/${employeeId}/goals`, data).then(r => r.data),
  updateGoalProgress: (goalId: number, achievementPercent: number) =>
    api.patch<Goal>(`${BASE}/performance/goals/${goalId}/progress`, null, { params: { achievementPercent } }).then(r => r.data),
  submitSelfAppraisal: (employeeId: number, cycleId: number, rating: number, comments: string) =>
    api.post<AppraisalForm>(`${BASE}/performance/employees/${employeeId}/self-appraisal`, { cycleId, rating, comments }).then(r => r.data),
  getOkrs: (employeeId: number) =>
    api.get<Okr[]>(`${BASE}/performance/employees/${employeeId}/okrs`).then(r => r.data),
  createOkr: (orgId: number, data: { objective: string; quarter?: string; year?: number; keyResults: Partial<OkrKeyResult>[] }) =>
    api.post<Okr>(`${BASE}/performance/organizations/${orgId}/okrs`, data).then(r => r.data),
  updateKeyResult: (keyResultId: number, progressPercent: number, currentValue?: string) =>
    api.patch<OkrKeyResult>(`${BASE}/performance/key-results/${keyResultId}/progress`, { progressPercent, currentValue }).then(r => r.data),
  submitFeedback: (requestId: number, data: Partial<FeedbackResponse>) =>
    api.post<FeedbackResponse>(`${BASE}/performance/feedback-requests/${requestId}/respond`, data).then(r => r.data),

  // ── Learning ──
  getTrainingPrograms: (orgId: number) =>
    api.get<PageResponse<TrainingProgram>>(`${BASE}/learning/organizations/${orgId}/programs`).then(r => r.data),
  enrollInTraining: (orgId: number, employeeId: number, programId: number) =>
    api.post<TrainingEnrollment>(`${BASE}/learning/organizations/${orgId}/programs/${programId}/enroll`, null, { params: { employeeId } }).then(r => r.data),
  getMyEnrollments: (employeeId: number) =>
    api.get<TrainingEnrollment[]>(`${BASE}/learning/employees/${employeeId}/enrollments`).then(r => r.data),
  getMyCertifications: (employeeId: number) =>
    api.get<Certification[]>(`${BASE}/learning/employees/${employeeId}/certifications`).then(r => r.data),
  addCertification: (orgId: number, employeeId: number, data: Partial<Certification>) =>
    api.post<Certification>(`${BASE}/learning/organizations/${orgId}/employees/${employeeId}/certifications`, data).then(r => r.data),
  getCareerPath: (employeeId: number) =>
    api.get<CareerPath>(`${BASE}/learning/employees/${employeeId}/career-path`).then(r => r.data),
  getPublicRecognitions: (orgId: number) =>
    api.get<PageResponse<Recognition>>(`${BASE}/learning/organizations/${orgId}/recognitions`).then(r => r.data),
  giveRecognition: (orgId: number, data: { receiverEmployeeId: number; recognitionType: string; message: string; points?: number; isPublic?: boolean; category?: string }) =>
    api.post<Recognition>(`${BASE}/learning/organizations/${orgId}/recognitions`, data).then(r => r.data),

  // ── Payroll ──
  getMyPayslips: (orgId: number) =>
    api.get<Payslip[]>(`${BASE}/payroll/my-payslips?orgId=${orgId}`).then(r => r.data),

  // ── Expenses ──
  getMyClaims: (orgId: number) =>
    api.get<PageResponse<ExpenseClaim>>(`${BASE}/expenses/my-claims?orgId=${orgId}`).then(r => r.data),
  createExpenseClaim: (orgId: number, data: { claimTitle: string; claimType: string; claimDate: string; description?: string; items: Partial<ExpenseItem>[] }) =>
    api.post<ExpenseClaim>(`${BASE}/expenses/organizations/${orgId}/claims`, data).then(r => r.data),
  submitExpenseClaim: (orgId: number, claimId: number) =>
    api.post<ExpenseClaim>(`${BASE}/expenses/claims/${claimId}/submit?orgId=${orgId}`, {}).then(r => r.data),
  getMyTravelRequests: (orgId: number) =>
    api.get<PageResponse<TravelRequest>>(`${BASE}/expenses/my-travel?orgId=${orgId}`).then(r => r.data),
  createTravelRequest: (orgId: number, data: { destination: string; purpose: string; travelFrom: string; travelTo: string; modeOfTravel?: string; estimatedCost?: number }) =>
    api.post<TravelRequest>(`${BASE}/expenses/organizations/${orgId}/travel`, data).then(r => r.data),

  // ── Assets ──
  getMyAssets: (orgId: number, employeeId: number) =>
    api.get<HrAsset[]>(`${BASE}/operations/employees/${employeeId}/assets?orgId=${orgId}`).then(r => r.data),

  // ── Tasks ──
  getMyTasks: (orgId: number) =>
    api.get<HrTask[]>(`${BASE}/operations/my-tasks?orgId=${orgId}`).then(r => r.data),
  updateTaskStatus: (orgId: number, taskId: number, status: string) =>
    api.patch<HrTask>(`${BASE}/operations/tasks/${taskId}/status?orgId=${orgId}`, { status }).then(r => r.data),

  // ── Help Desk ──
  getMyTickets: (orgId: number) =>
    api.get<PageResponse<HelpDeskTicket>>(`${BASE}/operations/my-tickets?orgId=${orgId}`).then(r => r.data),
  createTicket: (orgId: number, data: { subject: string; description: string; category: string; priority: string }) =>
    api.post<HelpDeskTicket>(`${BASE}/operations/organizations/${orgId}/tickets`, data).then(r => r.data),

  // ── Compliance ──
  getComplianceAlerts: (orgId: number) =>
    api.get<HrComplianceAlert[]>(`${BASE}/compliance/${orgId}/alerts`).then(r => r.data),
  generateComplianceAlerts: (orgId: number) =>
    api.post<{ generated: number }>(`${BASE}/compliance/${orgId}/alerts/generate`).then(r => r.data),
  acknowledgeAlert: (orgId: number, alertId: number) =>
    api.put<HrComplianceAlert>(`${BASE}/compliance/${orgId}/alerts/${alertId}/acknowledge`).then(r => r.data),
  dismissAlert: (orgId: number, alertId: number) =>
    api.put<HrComplianceAlert>(`${BASE}/compliance/${orgId}/alerts/${alertId}/dismiss`).then(r => r.data),

  // ── Analytics ──
  getHrAnalyticsDashboard: (orgId: number) =>
    api.get<HrAnalyticsDashboard>(`${BASE}/analytics/${orgId}/dashboard`).then(r => r.data),
  getDepartmentBreakdown: (orgId: number) =>
    api.get<{ departmentId: number; departmentName: string; employeeCount: number }[]>(`${BASE}/analytics/${orgId}/department-breakdown`).then(r => r.data),
  getWorkforceMetrics: (orgId: number) =>
    api.get<{ totalActive: number; tenureBands: Record<string, number> }>(`${BASE}/analytics/${orgId}/workforce-metrics`).then(r => r.data),
  resolveComplianceAlert: (orgId: number, alertId: number) =>
    api.put<HrComplianceAlert>(`${BASE}/compliance/${orgId}/alerts/${alertId}/resolve`).then(r => r.data),

  // ── Workforce 360 — Skill Passport ──
  getMyPassport: () =>
    api.get<MwSkillPassport>('/api/v1/mw/passport/me').then(r => r.data),
  updatePassport: (data: Partial<Pick<MwSkillPassport, 'bio' | 'location' | 'preferredRoles' | 'availability' | 'isPublic'>>) =>
    api.put<MwSkillPassport>('/api/v1/mw/passport/me', data).then(r => r.data),
  addSkill: (data: { skillName: string; category?: string; proficiency?: string; yearsExp?: number }) =>
    api.post<MwPassportSkill>('/api/v1/mw/passport/skills', data).then(r => r.data),
  removeSkill: (skillId: number) =>
    api.delete<void>(`/api/v1/mw/passport/skills/${skillId}`).then(r => r.data),
  addCertification: (data: { name: string; issuingBody?: string; issueDate?: string; expiryDate?: string; credentialUrl?: string }) =>
    api.post<MwPassportCertification>('/api/v1/mw/passport/certifications', data).then(r => r.data),
  removeCertification: (certId: number) =>
    api.delete<void>(`/api/v1/mw/passport/certifications/${certId}`).then(r => r.data),
  addWorkHistory: (data: { employerName: string; role?: string; startDate?: string; endDate?: string; isCurrent?: boolean }) =>
    api.post<MwPassportWorkHistory>('/api/v1/mw/passport/work-history', data).then(r => r.data),
  removeWorkHistory: (whId: number) =>
    api.delete<void>(`/api/v1/mw/passport/work-history/${whId}`).then(r => r.data),
};
