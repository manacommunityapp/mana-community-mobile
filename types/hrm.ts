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

export interface EmploymentHistory {
  id: number;
  changeType: string;
  effectiveDate: string;
  previousDesignation?: string;
  newDesignation?: string;
  previousDepartment?: string;
  newDepartment?: string;
  previousBranch?: string;
  newBranch?: string;
  reason?: string;
  remarks?: string;
  changedBy: number;
  createdAt: string;
}

export interface OnboardingTask {
  id: number;
  taskTitle: string;
  taskDescription?: string;
  category: string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  assignedTo?: number;
  employeeId?: number;
  employeeName?: string;
}

export interface OffboardingTask {
  id: number;
  taskTitle: string;
  taskDescription?: string;
  category: string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  employeeId?: number;
}

export interface SelfServiceUpdateRequest {
  personalEmail?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface OrgHierarchyNode {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName?: string;
  designation?: string;
  department?: string;
  directReports: OrgHierarchyNode[];
}

export interface AttendanceCorrectionRequest {
  correctedCheckIn?: string;
  correctedCheckOut?: string;
  correctedStatus?: string;
  reason: string;
}

export interface Timesheet {
  id: number;
  weekStartDate: string;
  weekEndDate: string;
  totalMinutes: number;
  totalOvertimeMinutes: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  approvedBy?: number;
  approvedAt?: string;
  remarks?: string;
}

export interface ShiftSwapRequest {
  id: number;
  requesterEmployee: { id: number; firstName: string; lastName?: string; employeeCode: string };
  targetEmployee: { id: number; firstName: string; lastName?: string; employeeCode: string };
  requesterShiftDate: string;
  targetShiftDate: string;
  reason?: string;
  status: 'PENDING_COLLEAGUE' | 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
}

// ── Recruitment ──
export interface JobPosting {
  id: number;
  title: string;
  departmentId?: number;
  description?: string;
  requirements?: string;
  openings: number;
  location?: string;
  employmentType?: string;
  minSalary?: number;
  maxSalary?: number;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
  postedDate?: string;
  closingDate?: string;
  createdAt: string;
}

export interface Applicant {
  id: number;
  jobPosting: { id: number; title: string };
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  currentEmployer?: string;
  experienceYears?: number;
  expectedSalary?: number;
  status: 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
  notes?: string;
  createdAt: string;
}

export interface Interview {
  id: number;
  applicant: { id: number; firstName: string; lastName?: string };
  interviewer?: { id: number; firstName: string };
  interviewType: string;
  scheduledAt?: string;
  durationMinutes: number;
  status: string;
  feedback?: string;
  rating?: number;
  outcome?: string;
}

export interface Offer {
  id: number;
  applicant: { id: number; firstName: string; lastName?: string };
  offeredSalary: number;
  proposedJoiningDate?: string;
  expiryDate?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  responseDate?: string;
}

// ── Performance ──
export interface AppraisalCycle {
  id: number;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  description?: string;
}

export interface Goal {
  id: number;
  title: string;
  description?: string;
  isKra: boolean;
  weightage: number;
  targetValue?: string;
  achievementPercent: number;
  dueDate?: string;
  status: string;
}

export interface AppraisalForm {
  id: number;
  employee: { id: number; firstName: string; lastName?: string };
  appraisalCycle: { id: number; name: string };
  selfRating?: number;
  selfComments?: string;
  managerRating?: number;
  managerComments?: string;
  finalRating?: number;
  status: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface Okr {
  id: number;
  objective: string;
  quarter?: string;
  year?: number;
  overallProgress: number;
  status: string;
  keyResults?: OkrKeyResult[];
}

export interface OkrKeyResult {
  id: number;
  title: string;
  targetValue?: string;
  currentValue?: string;
  progressPercent: number;
}

export interface FeedbackRequest {
  id: number;
  subjectEmployee: { id: number; firstName: string; lastName?: string };
  deadline?: string;
  status: string;
  isAnonymous: boolean;
}

export interface FeedbackResponse {
  id: number;
  overallRating?: number;
  communicationRating?: number;
  teamworkRating?: number;
  technicalRating?: number;
  leadershipRating?: number;
  strengths?: string;
  improvements?: string;
  generalComments?: string;
  submittedAt?: string;
}

// ── Learning & Development ──
export interface TrainingProgram {
  id: number;
  title: string;
  description?: string;
  trainingType?: string;
  provider?: string;
  durationHours?: number;
  isMandatory: boolean;
  status: string;
}

export interface TrainingEnrollment {
  id: number;
  trainingProgram: { id: number; title: string };
  status: 'ENROLLED' | 'COMPLETED' | 'FAILED';
  enrolledDate?: string;
  completionDate?: string;
  score?: number;
}

export interface Certification {
  id: number;
  name: string;
  issuingBody?: string;
  credentialId?: string;
  issuedDate?: string;
  expiryDate?: string;
  certificateUrl?: string;
  isVerified: boolean;
}

export interface CareerPath {
  id: number;
  currentRole?: string;
  targetRole?: string;
  targetDate?: string;
  developmentActivities?: string;
  skillsToDevelop?: string;
  status: string;
}

export interface Recognition {
  id: number;
  giverEmployee: { id: number; firstName: string; lastName?: string };
  receiverEmployee: { id: number; firstName: string; lastName?: string };
  recognitionType: 'KUDOS' | 'AWARD' | 'MILESTONE';
  message: string;
  points: number;
  isPublic: boolean;
  category?: string;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// ── Payroll ──
export interface Payslip {
  id: number;
  payrollRun: { id: number; payrollMonth: number; payrollYear: number };
  workingDays: number;
  paidDays: number;
  lopDays: number;
  basicSalary: number;
  hra: number;
  da: number;
  specialAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  pfEmployee: number;
  esiEmployee: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  isPublished: boolean;
}

// ── Expenses ──
export interface ExpenseItem {
  id: number;
  description: string;
  amount: number;
  expenseDate?: string;
}

export interface ExpenseClaim {
  id: number;
  claimTitle: string;
  claimType: string;
  totalAmount: number;
  claimDate: string;
  description?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';
  items: ExpenseItem[];
}

export interface TravelRequest {
  id: number;
  destination: string;
  purpose: string;
  travelFrom: string;
  travelTo: string;
  modeOfTravel: string;
  estimatedCost?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// ── Assets ──
export interface HrAsset {
  id: number;
  assetName: string;
  assetType: string;
  serialNumber?: string;
  make?: string;
  model?: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED';
  assignedDate?: string;
}

// ── Tasks ──
export interface HrTask {
  id: number;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  dueDate?: string;
  completedAt?: string;
  assignedBy?: { id: number; firstName: string; lastName?: string };
}

// ── Help Desk ──
export interface HelpDeskTicket {
  id: number;
  ticketNumber: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

// ── Security & Compliance ──
export interface HrmRole {
  id: number;
  employeeId: number;
  employeeName?: string;
  role: 'HR_ADMIN' | 'HR_MANAGER' | 'MANAGER' | 'EMPLOYEE';
  isActive: boolean;
  grantedAt: string;
}

export interface HrAuditLog {
  id: number;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: number;
  entityDescription?: string;
  createdAt: string;
}

export interface HrComplianceAlert {
  id: number;
  employee?: { id: number; fullName: string };
  alertType: 'PROBATION_ENDING' | 'CONTRACT_EXPIRY' | 'DOCUMENT_EXPIRY' | 'VISA_EXPIRY' | 'BIRTHDAY' | 'WORK_ANNIVERSARY';
  title: string;
  description?: string;
  dueDate: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface HrAnalyticsDashboard {
  totalEmployees: number;
  activeEmployees: number;
  newHiresThisMonth: number;
  attritionThisMonth: number;
  attritionRate: number;
  avgTenureMonths: number;
  departmentBreakdown: { department: string; count: number }[];
  genderRatio: { male: number; female: number; other: number };
}

export interface HrReportConfig {
  id: number;
  name: string;
  reportType: string;
  createdAt: string;
}

// ── Mana Workforce 360 — Skill Passport ──

export interface MwPassportSkill {
  id: number;
  skillName: string;
  category?: string;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
  yearsExp?: number;
  isVerified: boolean;
  verifiedBy?: string;
  createdAt: string;
}

export interface MwPassportCertification {
  id: number;
  name: string;
  issuingBody?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface MwPassportWorkHistory {
  id: number;
  employerName: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  isManaVerified: boolean;
  createdAt: string;
}

export interface MwSkillPassport {
  id: number;
  manaUserId: number;
  isPublic: boolean;
  bio?: string;
  location?: string;
  preferredRoles?: string;
  availability: 'FULL_TIME' | 'PART_TIME' | 'GIG' | 'UNAVAILABLE';
  skills: MwPassportSkill[];
  certifications: MwPassportCertification[];
  workHistory: MwPassportWorkHistory[];
  createdAt: string;
  updatedAt: string;
}

// ── Workforce Pool (Mana Workforce 360) ─────────────────────────────
export type PayType = 'HOURLY' | 'DAILY' | 'FIXED';
export type PoolListingStatus = 'OPEN' | 'FILLED' | 'CLOSED';
export type PoolApplicationStatus = 'APPLIED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export type ContractStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface MwPoolListing {
  id: number;
  organizationId: number;
  title: string;
  description?: string;
  requiredSkills?: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  location?: string;
  payRate?: number;
  payType: PayType;
  maxWorkers: number;
  acceptedCount: number;
  status: PoolListingStatus;
  createdBy: number;
  createdAt: string;
}

export interface MwPoolApplication {
  id: number;
  listingId: number;
  manaUserId: number;
  passportId?: number;
  status: PoolApplicationStatus;
  workerNote?: string;
  employerNote?: string;
  appliedAt: string;
  respondedAt?: string;
}

export interface MwEngagementContract {
  id: number;
  applicationId: number;
  termsSummary?: string;
  workerConsented: boolean;
  consentedAt?: string;
  hoursWorked?: number;
  amountDue?: number;
  status: ContractStatus;
  completedAt?: string;
}

// ── Mana Jobs ────────────────────────────────────────────────────────
export type JobStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';
export type JobApplicationStatus = 'APPLIED' | 'SHORTLISTED' | 'REJECTED' | 'OFFERED' | 'WITHDRAWN';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'GIG';

export interface MwJobListing {
  id: number;
  organizationId: number;
  title: string;
  description?: string;
  employmentType: EmploymentType;
  location?: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  requiredSkills?: string;
  experienceYears?: number;
  status: JobStatus;
  expiresAt?: string;
  createdBy: number;
  createdAt: string;
}

export interface MwJobApplication {
  id: number;
  jobId: number;
  manaUserId: number;
  passportId?: number;
  coverNote?: string;
  status: JobApplicationStatus;
  appliedAt: string;
  respondedAt?: string;
  employerNote?: string;
}

// ── Duty Handover + Operational Assignments ──────────────────────────
export interface MwDutyHandover {
  id: number;
  organizationId: number;
  shiftAssignmentId?: number;
  handoverFrom?: { id: number; firstName: string; lastName: string };
  handoverTo?: { id: number; firstName: string; lastName: string };
  location?: string;
  notes?: string;
  pendingTasks?: string;
  equipmentStatus?: string;
  incidentFlag: boolean;
  incidentDesc?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  createdAt: string;
}

export interface MwOperationalAssignment {
  id: number;
  organizationId: number;
  sourceModule: string;
  sourceRefId: number;
  employeeId: number;
  assignmentType?: string;
  status: string;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
  incentiveAmount?: number;
  performanceScore?: number;
  notes?: string;
}

// ── Sprint 4: Integration Config + Mana Fresh ─────────────────────────
export interface MwIntegrationConfig {
  id: number;
  organizationId: number;
  freshEnabled: boolean;
  homesEnabled: boolean;
  sportsEnabled: boolean;
  baseDeliveryPay: number;
  perKmRate: number;
  onTimeBonus: number;
}

export interface MwFreshAssignment {
  id: number;
  freshOrderId: string;
  pickupLocation?: string;
  dropLocation?: string;
  estimatedKm?: number;
  actualKm?: number;
  onTime?: boolean;
  basePay: number;
  kmBonus: number;
  timeBonus: number;
  totalIncentive: number;
  operationalAssignment: {
    id: number;
    employeeId: number;
    status: string;
    incentiveAmount?: number;
    performanceScore?: number;
    assignedAt: string;
    completedAt?: string;
  };
  createdAt: string;
}

// ── Sprint 5: Workforce Forecasting ──────────────────────────────────
export interface MwForecastConfig {
  id: number;
  organizationId: number;
  horizonWeeks: number;
  minWorkersPerShift: number;
  peakDayMultiplier: number;
  sourceModules: string;
  autoSnapshotEnabled: boolean;
}

export interface MwForecastSnapshot {
  id: number;
  organizationId: number;
  weekStartDate: string;
  sourceModule: string;
  demandUnits: number;
  fulfilledUnits: number;
  avgPayRate?: number;
  workerCount: number;
  notes?: string;
  snapshotAt: string;
}

export interface MwForecastProjection {
  id: number;
  projectedWeek: string;
  sourceModule: string;
  projectedDemand: number;
  confidencePct: number;
}

export interface MwForecastSummary {
  config: MwForecastConfig;
  recentSnapshots: MwForecastSnapshot[];
  projections: MwForecastProjection[];
  gapByModule: Record<string, number>;
}
