export interface HrEmployee {
  id: number;
  organizationId: number;
  branchId?: number;
  departmentId?: number;
  designationId?: number;
  manaUserId: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  personalEmail?: string;
  workEmail?: string;
  phone?: string;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  joiningDate?: string;
  confirmationDate?: string;
  exitDate?: string;
  reportingManagerId?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  departmentName?: string;
  designationName?: string;
  branchName?: string;
  reportingManagerName?: string;
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrEmployeeListItem {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentName?: string;
  designationName?: string;
  employmentStatus: EmploymentStatus;
  joiningDate?: string;
  phone?: string;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  attendanceDate: string;
  firstCheckIn?: string;
  lastCheckOut?: string;
  totalWorkMinutes: number;
  attendanceStatus: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceSummary {
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  totalHalfDay: number;
  totalWorkingDays: number;
}

export interface LeaveType {
  id: number;
  leaveTypeName: string;
  defaultBalance: number;
  isPaid: boolean;
  isCarryForward?: boolean;
  maxCarryForward?: number;
  isActive?: boolean;
  approvalLevels?: number;
  requiresHrApproval?: boolean;
  minNoticeDays?: number;
  maxConsecutiveDays?: number;
  allowNegativeBalance?: boolean;
}

export interface LeaveBalance {
  leaveTypeId: number;
  leaveTypeName: string;
  totalBalance: number;
  usedBalance: number;
  remainingBalance: number;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName?: string;
  leaveTypeId: number;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason?: string;
  approvalStatus: LeaveApprovalStatus;
  approverRemarks?: string;
  approvedAt?: string;
  createdAt: string;
  halfDay?: boolean;
  leaveSession?: LeaveSession;
  approvalLevel?: number;
  l1ApprovedBy?: number;
  l1ApprovedAt?: string;
  l1Remarks?: string;
}

export interface HrShift {
  id: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isActive: boolean;
}

export interface HrEmployeeShift {
  id: number;
  employeeId: number;
  employeeName?: string;
  shiftId: number;
  shiftName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  status: string;
}

export interface HrDashboardData {
  totalEmployees: number;
  activeEmployees: number;
  onLeaveToday: number;
  presentToday: number;
  absentToday: number;
  pendingLeaveApprovals: number;
  newJoinersThisMonth: number;
  upcomingHolidays: number;
}

export interface HrEmployeeDocument {
  id: number;
  documentType: string;
  documentName: string;
  fileUrl: string;
  expiryDate?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface HrHoliday {
  id: number;
  holidayName: string;
  holidayDate: string;
  isOptional: boolean;
}

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY' | 'GIG';
export type EmploymentStatus = 'ACTIVE' | 'ON_NOTICE' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED' | 'RETIRED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEK_OFF' | 'NOT_MARKED';
export type LeaveApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'L1_APPROVED' | 'L1_REJECTED';
export type LeaveSession = 'FIRST_HALF' | 'SECOND_HALF' | 'FULL_DAY';

export interface ApplyLeaveRequest {
  leaveTypeId: number;
  fromDate: string;
  toDate: string;
  totalDays: number;
  reason?: string;
  halfDay?: boolean;
  leaveSession?: LeaveSession;
}

export interface CheckInOutRequest {
  latitude?: number;
  longitude?: number;
  deviceId?: string;
  source?: string;
}
