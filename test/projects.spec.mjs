import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

// ─── Minimal Mock Shims ───────────────────────────────────────────────────────
const mockAxios = { get: async () => { throw new Error('offline'); }, post: async () => { throw new Error('offline'); } };

// ─── In-Memory Fallback Dataset ──────────────────────────────────────────────
const STAGES = ['PROPOSAL','VOTING','APPROVED','PLANNING','PROCUREMENT','IN_PROGRESS','QUALITY_CHECK','COMPLETED'];

let MOCK_PROJECTS = [
  {
    id: 'proj-001', title: 'Lift Replacement — Tower A & B',
    status: 'IN_PROGRESS', category: 'INFRASTRUCTURE', priority: 'CRITICAL',
    budget: { approvedBudget: 1800000, spent: 1050000, committed: 400000, remaining: 350000, utilizationPercent: 58.3, contingencyPercent: 10, fundingSource: 'SINKING_FUND', approvedBy: 'MC', approvedDate: '2025-08-18' },
    milestones: [
      { id: 'm1', title: 'Survey', status: 'COMPLETED', progressPercent: 100, dueDate: '2025-09-10' },
      { id: 'm2', title: 'Procurement', status: 'COMPLETED', progressPercent: 100, dueDate: '2025-10-01' },
      { id: 'm3', title: 'Tower A', status: 'COMPLETED', progressPercent: 100, dueDate: '2025-11-01' },
      { id: 'm4', title: 'Tower B', status: 'IN_PROGRESS', progressPercent: 65, dueDate: '2025-11-30' },
      { id: 'm5', title: 'Inspection', status: 'PENDING', progressPercent: 0, dueDate: '2025-12-10' },
      { id: 'm6', title: 'Handover', status: 'PENDING', progressPercent: 0, dueDate: '2025-12-15' },
    ],
    expenses: [
      { id: 'exp1', description: 'Advance 30%', amount: 486000, date: '2025-09-05', category: 'MATERIAL', approvedBy: 'Treasurer', paymentMode: 'RTGS' },
    ],
    documents: [], completionPercent: 61, vendor: { vendorName: 'Otis Elevator', contractValue: 1620000, tdsPercent: 1, contractStartDate: '2025-09-01', contractEndDate: '2025-12-31', id: 'v1', category: 'Elevator', contactPerson: 'Suresh', phone: '9800000001' },
    governanceResolutionId: 'res-001', projectManager: 'Col. Rajesh', targetCompletionDate: '2025-12-15', createdAt: '2025-08-01', updatedAt: '2025-11-10',
    residentVotesFor: 348, residentVotesAgainst: 12, residentVotesTotal: 360,
  },
  {
    id: 'proj-004', title: 'Solar Installation',
    status: 'VOTING', category: 'UTILITIES', priority: 'HIGH',
    budget: { approvedBudget: 4500000, spent: 0, committed: 0, remaining: 4500000, utilizationPercent: 0, contingencyPercent: 10, fundingSource: 'SINKING_FUND', approvedBy: 'Pending', approvedDate: '' },
    milestones: [], expenses: [], documents: [], completionPercent: 0,
    projectManager: 'Infra Committee', targetCompletionDate: '2026-06-30', createdAt: '2025-10-01', updatedAt: '2025-11-01',
  },
];

// ─── Service Logic (pure, no file import needed) ──────────────────────────────
function getProjects() { return [...MOCK_PROJECTS]; }

function getProjectById(id) { return MOCK_PROJECTS.find(p => p.id === id) ?? null; }

function advanceProjectStage(projectId) {
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  const idx = STAGES.indexOf(project.status);
  if (idx < STAGES.length - 1) {
    project.status = STAGES[idx + 1];
    project.updatedAt = new Date().toISOString().split('T')[0];
  }
  return { ...project };
}

function createProjectFromGovernanceResolution(resolutionId, proposalId, details) {
  const newProject = {
    id: 'proj-new-' + Date.now(),
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
      spent: 0, committed: 0,
      remaining: details.estimatedBudget,
      utilizationPercent: 0, contingencyPercent: 10,
      fundingSource: details.fundingSource,
      approvedBy: 'Governance Resolution ' + resolutionId,
      approvedDate: new Date().toISOString().split('T')[0],
    },
    milestones: [], expenses: [], documents: [],
    completionPercent: 0,
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };
  MOCK_PROJECTS.unshift(newProject);
  return newProject;
}

function computeProjectCompletion(milestones) {
  if (!milestones.length) return 0;
  const total = milestones.reduce((s, m) => s + m.progressPercent, 0);
  return Math.round(total / milestones.length);
}

function addExpense(projectId, expense) {
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  const newExpense = { ...expense, id: 'exp-new-' + Date.now() };
  project.expenses.unshift(newExpense);
  project.budget.spent += expense.amount;
  project.budget.remaining -= expense.amount;
  project.budget.utilizationPercent = Math.round((project.budget.spent / project.budget.approvedBudget) * 100);
  return newExpense;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Community Project Management — Lifecycle', () => {

  it('loads all 2 seed projects correctly', () => {
    const projects = getProjects();
    assert.equal(projects.length, 2, 'Should have 2 seed projects');
    const lift = projects.find(p => p.id === 'proj-001');
    assert.ok(lift, 'Lift project should exist');
    assert.equal(lift.status, 'IN_PROGRESS');
    assert.equal(lift.budget.approvedBudget, 1800000);
    assert.equal(lift.vendor.vendorName, 'Otis Elevator');
  });

  it('advances project stage correctly: VOTING → APPROVED', () => {
    const updated = advanceProjectStage('proj-004');
    assert.ok(updated, 'Should return updated project');
    assert.equal(updated.status, 'APPROVED', 'Solar should advance from VOTING to APPROVED');
  });

  it('advances project through full lifecycle: APPROVED → PLANNING → PROCUREMENT', () => {
    advanceProjectStage('proj-004'); // APPROVED → PLANNING
    const result = advanceProjectStage('proj-004'); // PLANNING → PROCUREMENT
    assert.equal(result.status, 'PROCUREMENT');
  });

  it('computes milestone completion percentage correctly', () => {
    const lift = getProjectById('proj-001');
    const pct = computeProjectCompletion(lift.milestones);
    // 100+100+100+65+0+0 = 365 / 6 = 60.83 → 61
    assert.equal(pct, 61, 'Lift completion should be 61%');
  });

  it('tracks budget utilization after adding expense', () => {
    const expense = {
      description: 'Final milestone payment',
      amount: 324000,
      date: '2025-11-15',
      category: 'MATERIAL',
      approvedBy: 'Treasurer',
      paymentMode: 'RTGS',
    };
    addExpense('proj-001', expense);
    const proj = getProjectById('proj-001');
    // 1050000 + 324000 = 1374000
    assert.equal(proj.budget.spent, 1374000, 'Spent should update after adding expense');
    assert.equal(proj.budget.remaining, 26000, 'Remaining should decrease accordingly');
    const expectedUtil = Math.round((1374000 / 1800000) * 100); // 76
    assert.equal(proj.budget.utilizationPercent, expectedUtil);
  });

  it('createProjectFromGovernanceResolution links resolution and creates APPROVED project', () => {
    const newProject = createProjectFromGovernanceResolution('res-007', 'prop-007', {
      title: 'Children\'s Play Area Upgrade',
      description: 'New swings, slide, rubber flooring for play area',
      category: 'AMENITIES',
      priority: 'MEDIUM',
      estimatedBudget: 350000,
      fundingSource: 'MAINTENANCE_FUND',
      targetCompletionDate: '2026-03-31',
    });
    assert.equal(newProject.status, 'APPROVED', 'New project from resolution should be APPROVED');
    assert.equal(newProject.governanceResolutionId, 'res-007');
    assert.equal(newProject.budget.approvedBudget, 350000);
    assert.equal(newProject.budget.spent, 0, 'New project should have zero spend');
    assert.ok(newProject.budget.approvedBy.includes('res-007'), 'ApprovedBy should reference resolution');
    // Verify it was added to the store
    const all = getProjects();
    const found = all.find(p => p.governanceResolutionId === 'res-007');
    assert.ok(found, 'New project should appear in project list');
  });

  it('COMPLETED stage does not advance further', () => {
    // Manually set proj-001 to COMPLETED for this test
    const proj = MOCK_PROJECTS.find(p => p.id === 'proj-001');
    proj.status = 'COMPLETED';
    const result = advanceProjectStage('proj-001');
    assert.equal(result.status, 'COMPLETED', 'COMPLETED project should not advance');
  });
});