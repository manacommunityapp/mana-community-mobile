import api from './apiClient';
import type {
  CommunityProjectDto,
  ProjectMetricsDto,
  CreateProjectDto,
  ProjectMilestoneDto,
  ProjectExpenseDto,
  ProjectLifecycleStatus,
} from '@/types/projects';

export type {
  CommunityProjectDto,
  ProjectMetricsDto,
  CreateProjectDto,
  ProjectMilestoneDto,
  ProjectExpenseDto,
  ProjectLifecycleStatus,
};

// ─── In-Memory Fallback Data ─────────────────────────────────────────────────

let MOCK_PROJECTS: CommunityProjectDto[] = [
  {
    id: 'proj-001',
    title: 'Lift Replacement — Tower A & B',
    description: 'Complete replacement of two aging 15-year-old lifts in Tower A and Tower B with energy-efficient MRL (Machine Room-Less) lifts. Includes new control panels, ARD systems, and 5-year AMC.',
    category: 'INFRASTRUCTURE',
    status: 'IN_PROGRESS',
    priority: 'CRITICAL',
    governanceProposalId: 'prop-cctv-2025',
    governanceResolutionId: 'res-001',
    projectManager: 'Col. Rajesh Sharma',
    startDate: '2025-09-01',
    targetCompletionDate: '2025-12-15',
    budget: {
      approvedBudget: 1800000,
      spent: 1050000,
      committed: 400000,
      remaining: 350000,
      utilizationPercent: 58.3,
      contingencyPercent: 10,
      fundingSource: 'SINKING_FUND',
      approvedBy: 'Managing Committee — AGM Resolution 2025',
      approvedDate: '2025-08-18',
    },
    vendor: {
      id: 'vnd-001',
      vendorName: 'Otis Elevator Company (India)',
      category: 'Elevator & Escalator',
      contactPerson: 'Suresh Nair',
      phone: '9800123456',
      gstin: '29AABCO1234A1Z5',
      contractValue: 1620000,
      contractStartDate: '2025-09-01',
      contractEndDate: '2025-12-31',
      warrantyMonths: 60,
      tdsPercent: 1,
      rating: 4.7,
      notes: 'Includes 5-year AMC post installation.',
    },
    milestones: [
      { id: 'm1', title: 'Site Survey & Shaft Measurement', description: 'Detailed measurement and load assessment', dueDate: '2025-09-10', completedDate: '2025-09-08', status: 'COMPLETED', progressPercent: 100, assignedTo: 'Otis Engineering Team' },
      { id: 'm2', title: 'Procurement — MRL Lift Units', description: 'Factory manufacture and delivery of 2 lift units', dueDate: '2025-10-01', completedDate: '2025-10-03', status: 'COMPLETED', progressPercent: 100, assignedTo: 'Otis Supply Chain' },
      { id: 'm3', title: 'Tower A Installation', description: 'Remove old lift, install new MRL unit, rewiring', dueDate: '2025-11-01', completedDate: '2025-11-05', status: 'COMPLETED', progressPercent: 100, assignedTo: 'Otis Installation Crew' },
      { id: 'm4', title: 'Tower B Installation', description: 'Remove old lift, install new MRL unit, rewiring', dueDate: '2025-11-30', status: 'IN_PROGRESS', progressPercent: 65, assignedTo: 'Otis Installation Crew' },
      { id: 'm5', title: 'Govt Inspection & Certification', description: 'CMRS certification and load test by Dept. of Factories', dueDate: '2025-12-10', status: 'PENDING', progressPercent: 0 },
      { id: 'm6', title: 'Handover & AMC Sign-Off', description: 'Final handover with maintenance manual and AMC start', dueDate: '2025-12-15', status: 'PENDING', progressPercent: 0 },
    ],
    expenses: [
      { id: 'exp1', description: 'Advance payment — 30%', amount: 486000, date: '2025-09-05', category: 'MATERIAL', invoiceNumber: 'OTIS/2025/001', vendorName: 'Otis Elevator', approvedBy: 'Treasurer', paymentMode: 'RTGS', paymentRef: 'TXN20250905OTIS' },
      { id: 'exp2', description: 'Milestone 2 payment — 30%', amount: 486000, date: '2025-10-05', category: 'MATERIAL', invoiceNumber: 'OTIS/2025/002', vendorName: 'Otis Elevator', approvedBy: 'Treasurer', paymentMode: 'RTGS', paymentRef: 'TXN20251005OTIS' },
      { id: 'exp3', description: 'Tower A completion — 20%', amount: 324000, date: '2025-11-07', category: 'LABOUR', invoiceNumber: 'OTIS/2025/003', vendorName: 'Otis Elevator', approvedBy: 'Project Manager', paymentMode: 'RTGS', paymentRef: 'TXN20251107OTIS' },
    ],
    documents: [
      { id: 'doc1', name: 'AGM Resolution — Lift Replacement', type: 'APPROVAL', uploadedBy: 'Secretary', uploadedDate: '2025-08-20', fileSize: '245 KB' },
      { id: 'doc2', name: 'Otis Quotation & Tech Specs', type: 'QUOTE', uploadedBy: 'Project Manager', uploadedDate: '2025-09-02', fileSize: '1.2 MB' },
      { id: 'doc3', name: 'Work Contract — Signed', type: 'CONTRACT', uploadedBy: 'Secretary', uploadedDate: '2025-09-03', fileSize: '890 KB' },
    ],
    completionPercent: 61,
    tags: ['Lift', 'Infrastructure', 'Safety'],
    residentVotesFor: 348,
    residentVotesAgainst: 12,
    residentVotesTotal: 360,
    createdAt: '2025-08-01',
    updatedAt: '2025-11-10',
  },
  {
    id: 'proj-002',
    title: 'CCTV Upgrade — 32 AI Cameras',
    description: 'Replace legacy analog CCTV with 32 AI-powered IP cameras covering all entry/exit points, perimeter walls, lift lobbies, parking basement, and common areas.',
    category: 'SECURITY',
    status: 'PROCUREMENT',
    priority: 'HIGH',
    governanceResolutionId: 'res-002',
    projectManager: 'Vikram Singh (Security Lead)',
    targetCompletionDate: '2026-01-31',
    budget: {
      approvedBudget: 850000,
      spent: 95000,
      committed: 550000,
      remaining: 205000,
      utilizationPercent: 11.2,
      contingencyPercent: 8,
      fundingSource: 'MAINTENANCE_FUND',
      approvedBy: 'Managing Committee Resolution',
      approvedDate: '2025-10-01',
    },
    vendor: {
      id: 'vnd-002',
      vendorName: 'Hikvision Authorized Partner — SecureVision Hyd',
      category: 'CCTV & Surveillance',
      contactPerson: 'Arvind Reddy',
      phone: '9765432100',
      gstin: '29AABCH5678B2Z4',
      contractValue: 765000,
      contractStartDate: '2025-11-01',
      contractEndDate: '2026-01-31',
      warrantyMonths: 36,
      tdsPercent: 1,
      rating: 4.5,
    },
    milestones: [
      { id: 'm7', title: 'Survey & Camera Positioning Plan', description: 'Coverage gap analysis and camera placement map', dueDate: '2025-10-15', completedDate: '2025-10-14', status: 'COMPLETED', progressPercent: 100 },
      { id: 'm8', title: 'Procurement — 32 Cameras & NVR', description: 'Order and receive camera units and 128-channel NVR', dueDate: '2025-11-15', status: 'IN_PROGRESS', progressPercent: 40 },
      { id: 'm9', title: 'Cable Laying & Network Setup', description: 'Cat-6 cabling, POE switches, network backbone', dueDate: '2025-12-15', status: 'PENDING', progressPercent: 0 },
      { id: 'm10', title: 'Camera Installation & Configuration', description: 'Mount cameras, configure AI alerts, set retention policy', dueDate: '2026-01-15', status: 'PENDING', progressPercent: 0 },
      { id: 'm11', title: 'Security Team Training & Handover', description: 'Train security guards on new VMS software', dueDate: '2026-01-31', status: 'PENDING', progressPercent: 0 },
    ],
    expenses: [
      { id: 'exp4', description: 'Consultant fee — security audit', amount: 45000, date: '2025-10-10', category: 'PROFESSIONAL_FEES', vendorName: 'SafeAudit Consultants', approvedBy: 'Project Manager', paymentMode: 'NEFT', paymentRef: 'TXN20251010SEC' },
      { id: 'exp5', description: 'Advance — camera procurement', amount: 50000, date: '2025-11-05', category: 'MATERIAL', invoiceNumber: 'SV/2025/001', vendorName: 'SecureVision Hyd', approvedBy: 'Treasurer', paymentMode: 'RTGS', paymentRef: 'TXN20251105SV' },
    ],
    documents: [
      { id: 'doc4', name: 'MC Resolution — CCTV Upgrade', type: 'APPROVAL', uploadedBy: 'Secretary', uploadedDate: '2025-10-03', fileSize: '180 KB' },
      { id: 'doc5', name: 'SecureVision Quotation (3 vendors)', type: 'QUOTE', uploadedBy: 'Security Lead', uploadedDate: '2025-10-18', fileSize: '2.1 MB' },
    ],
    completionPercent: 20,
    tags: ['CCTV', 'Security', 'AI'],
    residentVotesFor: 312,
    residentVotesAgainst: 8,
    residentVotesTotal: 320,
    createdAt: '2025-09-15',
    updatedAt: '2025-11-12',
  },
  {
    id: 'proj-003',
    title: 'Swimming Pool Renovation',
    description: 'Full pool renovation including re-plastering, new filtration system, LED underwater lighting, pool heating system, water safety signage, and resurfacing of pool deck.',
    category: 'AMENITIES',
    status: 'APPROVED',
    priority: 'MEDIUM',
    governanceResolutionId: 'res-003',
    projectManager: 'Mrs. Sunita Venkat',
    targetCompletionDate: '2026-03-31',
    budget: {
      approvedBudget: 2200000,
      spent: 0,
      committed: 0,
      remaining: 2200000,
      utilizationPercent: 0,
      contingencyPercent: 12,
      fundingSource: 'CORPUS',
      approvedBy: 'AGM Resolution Oct 2025',
      approvedDate: '2025-10-18',
    },
    milestones: [
      { id: 'm12', title: 'Vendor Selection — Shortlist 3', description: 'Collect quotes, evaluate, shortlist top 3', dueDate: '2025-12-15', status: 'PENDING', progressPercent: 0 },
      { id: 'm13', title: 'Pool Dewatering & Demolition', description: 'Empty pool, break existing plaster', dueDate: '2026-01-15', status: 'PENDING', progressPercent: 0 },
      { id: 'm14', title: 'Replastering & Waterproofing', description: 'Diamond brite plaster, epoxy waterproofing', dueDate: '2026-02-15', status: 'PENDING', progressPercent: 0 },
      { id: 'm15', title: 'Filtration & Heating Install', description: 'Sand filter, UV system, heat pump', dueDate: '2026-03-01', status: 'PENDING', progressPercent: 0 },
      { id: 'm16', title: 'Testing, Filling & Commissioning', description: 'Water quality test, fill, final inspection', dueDate: '2026-03-31', status: 'PENDING', progressPercent: 0 },
    ],
    expenses: [],
    documents: [
      { id: 'doc6', name: 'AGM Resolution — Pool Renovation', type: 'APPROVAL', uploadedBy: 'Secretary', uploadedDate: '2025-10-20', fileSize: '210 KB' },
    ],
    completionPercent: 0,
    tags: ['Pool', 'Amenities', 'Renovation'],
    residentVotesFor: 289,
    residentVotesAgainst: 45,
    residentVotesTotal: 334,
    createdAt: '2025-09-20',
    updatedAt: '2025-10-20',
  },
  {
    id: 'proj-004',
    title: 'Solar Installation — 80kW Rooftop',
    description: '80kW grid-tied rooftop solar plant across Tower A, B, and C terraces. MNRE KUSUM scheme eligible for 30% capital subsidy. Projected savings: ₹95,000/month on common area electricity.',
    category: 'UTILITIES',
    status: 'VOTING',
    priority: 'HIGH',
    governanceProposalId: 'prop-solar-2025',
    projectManager: 'Infrastructure Sub-Committee',
    targetCompletionDate: '2026-06-30',
    budget: {
      approvedBudget: 4500000,
      spent: 0,
      committed: 0,
      remaining: 4500000,
      utilizationPercent: 0,
      contingencyPercent: 10,
      fundingSource: 'SINKING_FUND',
      approvedBy: 'Pending — Vote in Progress',
      approvedDate: '',
    },
    milestones: [
      { id: 'm17', title: 'MNRE Subsidy Application', description: 'File KUSUM scheme application online', dueDate: '2026-01-31', status: 'PENDING', progressPercent: 0 },
      { id: 'm18', title: 'Structural Load Analysis', description: 'Terrace load-bearing capacity verification', dueDate: '2026-02-28', status: 'PENDING', progressPercent: 0 },
      { id: 'm19', title: 'Panel & Inverter Procurement', description: 'Order Tier-1 panels (LONGi/Jinko) and string inverters', dueDate: '2026-04-01', status: 'PENDING', progressPercent: 0 },
      { id: 'm20', title: 'Installation & Grid Sync', description: 'Mounting, cabling, net-metering BESCOM application', dueDate: '2026-06-01', status: 'PENDING', progressPercent: 0 },
      { id: 'm21', title: 'BESCOM Commissioning & Net Metering', description: 'BESCOM inspection, net meter installation, grid sync', dueDate: '2026-06-30', status: 'PENDING', progressPercent: 0 },
    ],
    expenses: [],
    documents: [
      { id: 'doc7', name: 'Solar Feasibility Study', type: 'REPORT', uploadedBy: 'Infrastructure Committee', uploadedDate: '2025-10-05', fileSize: '3.4 MB' },
      { id: 'doc8', name: 'SunPower India Proposal', type: 'QUOTE', uploadedBy: 'Infrastructure Committee', uploadedDate: '2025-10-12', fileSize: '1.8 MB' },
    ],
    completionPercent: 0,
    tags: ['Solar', 'Green Energy', 'MNRE Subsidy'],
    residentVotesFor: 201,
    residentVotesAgainst: 38,
    residentVotesTotal: 239,
    createdAt: '2025-10-01',
    updatedAt: '2025-11-01',
  },
  {
    id: 'proj-005',
    title: 'Gym Upgrade — New Equipment & Flooring',
    description: 'Full gym overhaul: replace 8-year-old cardio machines, add strength training station, install rubber flooring, LED lighting upgrade, and AC servicing.',
    category: 'AMENITIES',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    governanceResolutionId: 'res-005',
    projectManager: 'Ananya Roy (Sports Committee)',
    startDate: '2025-10-15',
    targetCompletionDate: '2025-12-31',
    budget: {
      approvedBudget: 650000,
      spent: 380000,
      committed: 150000,
      remaining: 120000,
      utilizationPercent: 58.5,
      contingencyPercent: 8,
      fundingSource: 'MAINTENANCE_FUND',
      approvedBy: 'Committee Meeting Oct 2025',
      approvedDate: '2025-10-10',
    },
    vendor: {
      id: 'vnd-005',
      vendorName: 'FitWorld Equipment Pvt. Ltd.',
      category: 'Gym & Fitness Equipment',
      contactPerson: 'Raju Fitness',
      phone: '9876001234',
      contractValue: 580000,
      contractStartDate: '2025-10-15',
      contractEndDate: '2025-12-31',
      warrantyMonths: 24,
      tdsPercent: 2,
      rating: 4.3,
    },
    milestones: [
      { id: 'm22', title: 'Old Equipment Removal & Flooring Strip', description: 'Remove old machines, strip rubber floor', dueDate: '2025-10-25', completedDate: '2025-10-24', status: 'COMPLETED', progressPercent: 100 },
      { id: 'm23', title: 'New Rubber Flooring Installation', description: '10mm rubber tiles — 1500 sqft', dueDate: '2025-11-05', completedDate: '2025-11-06', status: 'COMPLETED', progressPercent: 100 },
      { id: 'm24', title: 'New Cardio Equipment Delivery & Setup', description: '4 treadmills, 2 ellipticals, 3 bikes', dueDate: '2025-11-20', status: 'IN_PROGRESS', progressPercent: 70 },
      { id: 'm25', title: 'Strength Station & Free Weights Install', description: 'Multi-gym station, dumbbell rack, barbell set', dueDate: '2025-12-10', status: 'PENDING', progressPercent: 0 },
      { id: 'm26', title: 'LED Lighting & AC Service', description: 'Replace fluorescent with LED, AC gas top-up', dueDate: '2025-12-20', status: 'PENDING', progressPercent: 0 },
    ],
    expenses: [
      { id: 'exp6', description: 'Flooring material — rubber tiles', amount: 120000, date: '2025-10-20', category: 'MATERIAL', invoiceNumber: 'FW/2025/001', vendorName: 'FitWorld Equipment', approvedBy: 'Committee', paymentMode: 'NEFT', paymentRef: 'TXN20251020FW' },
      { id: 'exp7', description: 'Labour — floor laying', amount: 25000, date: '2025-11-07', category: 'LABOUR', vendorName: 'Local Contractor', approvedBy: 'Project Manager', paymentMode: 'UPI', paymentRef: 'TXN20251107LAB' },
      { id: 'exp8', description: 'Advance — cardio machines', amount: 235000, date: '2025-11-10', category: 'MATERIAL', invoiceNumber: 'FW/2025/002', vendorName: 'FitWorld Equipment', approvedBy: 'Treasurer', paymentMode: 'RTGS', paymentRef: 'TXN20251110FW' },
    ],
    documents: [
      { id: 'doc9', name: 'Committee Resolution — Gym Upgrade', type: 'APPROVAL', uploadedBy: 'Secretary', uploadedDate: '2025-10-12', fileSize: '156 KB' },
      { id: 'doc10', name: 'FitWorld Quotation', type: 'QUOTE', uploadedBy: 'Sports Committee', uploadedDate: '2025-10-16', fileSize: '780 KB' },
    ],
    completionPercent: 52,
    tags: ['Gym', 'Fitness', 'Amenities'],
    residentVotesFor: 267,
    residentVotesAgainst: 23,
    residentVotesTotal: 290,
    createdAt: '2025-10-01',
    updatedAt: '2025-11-12',
  },
  {
    id: 'proj-006',
    title: 'Water Treatment Plant — RO + Softening Upgrade',
    description: 'Upgrade existing water treatment to add RO (Reverse Osmosis) polishing + water softening plant for domestic supply. Includes new SS storage tanks and IoT flow meters.',
    category: 'UTILITIES',
    status: 'PLANNING',
    priority: 'HIGH',
    governanceResolutionId: 'res-006',
    projectManager: 'Technical Committee',
    targetCompletionDate: '2026-04-30',
    budget: {
      approvedBudget: 1200000,
      spent: 18000,
      committed: 0,
      remaining: 1182000,
      utilizationPercent: 1.5,
      contingencyPercent: 10,
      fundingSource: 'SINKING_FUND',
      approvedBy: 'AGM Resolution Oct 2025',
      approvedDate: '2025-10-18',
    },
    milestones: [
      { id: 'm27', title: 'Water Quality Testing & Audit', description: 'Comprehensive lab water quality report', dueDate: '2025-12-01', status: 'IN_PROGRESS', progressPercent: 60 },
      { id: 'm28', title: 'Technical Design & Equipment Selection', description: 'RO capacity design, vendor shortlisting', dueDate: '2025-12-31', status: 'PENDING', progressPercent: 0 },
      { id: 'm29', title: 'Civil Work — Pump Room Expansion', description: 'Extend pump room for new RO equipment space', dueDate: '2026-02-28', status: 'PENDING', progressPercent: 0 },
      { id: 'm30', title: 'RO System Installation', description: 'Install RO membranes, pressure vessels, controls', dueDate: '2026-03-31', status: 'PENDING', progressPercent: 0 },
      { id: 'm31', title: 'Commissioning & Quality Certification', description: 'Final water quality test, BIS certification', dueDate: '2026-04-30', status: 'PENDING', progressPercent: 0 },
    ],
    expenses: [
      { id: 'exp9', description: 'Water quality lab test fee', amount: 18000, date: '2025-11-05', category: 'PROFESSIONAL_FEES', vendorName: 'AquaLab Testing Services', approvedBy: 'Technical Committee', paymentMode: 'NEFT', paymentRef: 'TXN20251105AQ' },
    ],
    documents: [
      { id: 'doc11', name: 'AGM Resolution — Water Plant Upgrade', type: 'APPROVAL', uploadedBy: 'Secretary', uploadedDate: '2025-10-20', fileSize: '192 KB' },
    ],
    completionPercent: 8,
    tags: ['Water', 'RO', 'Infrastructure', 'IoT'],
    residentVotesFor: 398,
    residentVotesAgainst: 5,
    residentVotesTotal: 403,
    createdAt: '2025-09-25',
    updatedAt: '2025-11-10',
  },
];

// ─── Computed Metrics ─────────────────────────────────────────────────────────
function computeMetrics(): ProjectMetricsDto {
  const active = MOCK_PROJECTS.filter(p => !['COMPLETED', 'PROPOSAL', 'VOTING'].includes(p.status));
  const completed = MOCK_PROJECTS.filter(p => p.status === 'COMPLETED');
  const totalBudget = MOCK_PROJECTS.reduce((s, p) => s + p.budget.approvedBudget, 0);
  const totalSpent = MOCK_PROJECTS.reduce((s, p) => s + p.budget.spent, 0);
  const avgCompletion = Math.round(MOCK_PROJECTS.reduce((s, p) => s + p.completionPercent, 0) / MOCK_PROJECTS.length);
  const overBudget = MOCK_PROJECTS.filter(p => p.budget.spent > p.budget.approvedBudget).length;
  const delayedMilestones = MOCK_PROJECTS.flatMap(p => p.milestones).filter(m => m.status === 'DELAYED').length;
  return {
    totalProjects: MOCK_PROJECTS.length,
    activeProjects: active.length,
    completedProjects: completed.length,
    totalApprovedBudget: totalBudget,
    totalSpent,
    avgCompletionPercent: avgCompletion,
    overBudgetProjects: overBudget,
    delayedMilestones,
  };
}

// ─── Service Methods ──────────────────────────────────────────────────────────

export async function getProjects(): Promise<CommunityProjectDto[]> {
  try {
    const res = await api.get<CommunityProjectDto[]>('/projects');
    return res.data;
  } catch {}
  return [...MOCK_PROJECTS];
}

export async function getProjectById(id: string): Promise<CommunityProjectDto | null> {
  try {
    const res = await api.get<CommunityProjectDto>('/projects/' + id);
    return res.data;
  } catch {}
  return MOCK_PROJECTS.find(p => p.id === id) ?? null;
}

export async function getProjectMetrics(): Promise<ProjectMetricsDto> {
  try {
    const res = await api.get<ProjectMetricsDto>('/projects/metrics');
    return res.data;
  } catch {}
  return computeMetrics();
}

export async function advanceProjectStage(projectId: string): Promise<CommunityProjectDto | null> {
  const stageOrder: ProjectLifecycleStatus[] = [
    'PROPOSAL', 'VOTING', 'APPROVED', 'PLANNING', 'PROCUREMENT', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED',
  ];
  try {
    const res = await api.post<CommunityProjectDto>('/projects/' + projectId + '/advance');
    return res.data;
  } catch {}
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  const idx = stageOrder.indexOf(project.status);
  if (idx < stageOrder.length - 1) {
    project.status = stageOrder[idx + 1];
    project.updatedAt = new Date().toISOString().split('T')[0];
  }
  return { ...project };
}

export async function createProjectFromGovernanceResolution(
  resolutionId: string,
  proposalId: string,
  details: CreateProjectDto
): Promise<CommunityProjectDto> {
  try {
    const res = await api.post<CommunityProjectDto>('/projects/from-resolution', { resolutionId, proposalId, ...details });
    return res.data;
  } catch {}
  const newProject: CommunityProjectDto = {
    id: 'proj-' + Date.now(),
    title: details.title,
    description: details.description,
    category: details.category,
    status: 'APPROVED',
    priority: details.priority,
    governanceProposalId: proposalId,
    governanceResolutionId: resolutionId,
    projectManager: 'Managing Committee',
    targetCompletionDate: details.targetCompletionDate,
    budget: {
      approvedBudget: details.estimatedBudget,
      spent: 0,
      committed: 0,
      remaining: details.estimatedBudget,
      utilizationPercent: 0,
      contingencyPercent: 10,
      fundingSource: details.fundingSource,
      approvedBy: 'Governance Resolution ' + resolutionId,
      approvedDate: new Date().toISOString().split('T')[0],
    },
    milestones: [],
    expenses: [],
    documents: [],
    completionPercent: 0,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };
  MOCK_PROJECTS.unshift(newProject);
  return newProject;
}

export async function addProjectExpense(
  projectId: string,
  expense: Omit<ProjectExpenseDto, 'id'>
): Promise<ProjectExpenseDto> {
  try {
    const res = await api.post<ProjectExpenseDto>('/projects/' + projectId + '/expenses', expense);
    return res.data;
  } catch {}
  const newExpense = { ...expense, id: 'exp-' + Date.now() };
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  if (project) {
    project.expenses.unshift(newExpense);
    project.budget.spent += expense.amount;
    project.budget.remaining -= expense.amount;
    project.budget.utilizationPercent = Math.round((project.budget.spent / project.budget.approvedBudget) * 100);
  }
  return newExpense;
}

export async function addProjectMilestone(
  projectId: string,
  milestone: Omit<ProjectMilestoneDto, 'id'>
): Promise<ProjectMilestoneDto> {
  try {
    const res = await api.post<ProjectMilestoneDto>('/projects/' + projectId + '/milestones', milestone);
    return res.data;
  } catch {}
  const newMilestone = { ...milestone, id: 'ms-' + Date.now() };
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  if (project) project.milestones.push(newMilestone);
  return newMilestone;
}

export function computeProjectCompletion(milestones: ProjectMilestoneDto[]): number {
  if (!milestones.length) return 0;
  const total = milestones.reduce((s, m) => s + m.progressPercent, 0);
  return Math.round(total / milestones.length);
}

export type { ProjectMetricsDto as ProjectMetrics };