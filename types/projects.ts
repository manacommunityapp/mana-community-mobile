export type ProjectLifecycleStatus =
  | 'PROPOSAL'
  | 'VOTING'
  | 'APPROVED'
  | 'PLANNING'
  | 'PROCUREMENT'
  | 'IN_PROGRESS'
  | 'QUALITY_CHECK'
  | 'COMPLETED';

export type ProjectCategory =
  | 'INFRASTRUCTURE'
  | 'SECURITY'
  | 'AMENITIES'
  | 'UTILITIES'
  | 'ENVIRONMENT'
  | 'RENOVATION';

export interface ProjectMilestoneDto {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completedDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  progressPercent: number;
  assignedTo?: string;
  notes?: string;
}

export interface ProjectBudgetDto {
  approvedBudget: number;
  spent: number;
  committed: number;
  remaining: number;
  utilizationPercent: number;
  contingencyPercent: number;
  fundingSource: 'SINKING_FUND' | 'MAINTENANCE_FUND' | 'SPECIAL_LEVY' | 'CORPUS';
  approvedBy: string;
  approvedDate: string;
}

export interface ProjectVendorDto {
  id: string;
  vendorName: string;
  category: string;
  contactPerson: string;
  phone: string;
  gstin?: string;
  contractValue: number;
  contractStartDate: string;
  contractEndDate: string;
  warrantyMonths?: number;
  panNumber?: string;
  bankName?: string;
  tdsPercent: number;
  rating?: number;
  notes?: string;
}

export interface ProjectExpenseDto {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'MATERIAL' | 'LABOUR' | 'PROFESSIONAL_FEES' | 'EQUIPMENT' | 'MISC';
  invoiceNumber?: string;
  vendorName?: string;
  approvedBy: string;
  paymentMode: 'NEFT' | 'RTGS' | 'CHEQUE' | 'UPI';
  paymentRef?: string;
}

export interface ProjectDocumentDto {
  id: string;
  name: string;
  type: 'QUOTE' | 'CONTRACT' | 'INVOICE' | 'PHOTO' | 'REPORT' | 'APPROVAL' | 'WARRANTY';
  uploadedBy: string;
  uploadedDate: string;
  fileSize: string;
  url?: string;
}

export interface CommunityProjectDto {
  id: string;
  title: string;
  description: string;
  category: ProjectCategory;
  status: ProjectLifecycleStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  governanceProposalId?: string;
  governanceResolutionId?: string;
  projectManager: string;
  startDate?: string;
  targetCompletionDate: string;
  actualCompletionDate?: string;
  budget: ProjectBudgetDto;
  vendor?: ProjectVendorDto;
  milestones: ProjectMilestoneDto[];
  expenses: ProjectExpenseDto[];
  documents: ProjectDocumentDto[];
  completionPercent: number;
  tags?: string[];
  coverPhotoUrl?: string;
  residentVotesFor?: number;
  residentVotesAgainst?: number;
  residentVotesTotal?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMetricsDto {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalApprovedBudget: number;
  totalSpent: number;
  avgCompletionPercent: number;
  overBudgetProjects: number;
  delayedMilestones: number;
}

export interface CreateProjectDto {
  title: string;
  description: string;
  category: ProjectCategory;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedBudget: number;
  fundingSource: 'SINKING_FUND' | 'MAINTENANCE_FUND' | 'SPECIAL_LEVY' | 'CORPUS';
  targetCompletionDate: string;
  governanceProposalId?: string;
}