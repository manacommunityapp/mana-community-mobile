import api from './apiClient';
import type {
  GovernanceStatsDto,
  MeetingDto,
  ProposalDto,
  BallotDto,
  ResolutionDto,
  VaultDocumentDto,
} from '@/types/governance';

// Fallback Mock Data for resilient offline / standalone experience
const MOCK_STATS: GovernanceStatsDto = {
  upcomingMeetings: 1,
  activeProposals: 4,
  openVotes: 2,
  passedResolutions: 16,
  actionItemsOpen: 3,
  myMeetingsAttended: 5,
  myVotesRecorded: 8,
};

const MOCK_MEETINGS: MeetingDto[] = [
  {
    id: 'agm-2025',
    type: 'AGM',
    status: 'LIVE_NOW',
    title: '5th Annual General Meeting (AGM 2025-26)',
    description: 'Mandatory society annual general meeting to review financial audits, elect the 2025-27 managing committee, and vote on major infrastructure motions.',
    date: 'Saturday, Oct 18, 2025',
    time: '10:00 AM - 1:30 PM IST',
    location: 'Clubhouse Grand Hall & Zoom Live Hybrid',
    meetingLink: 'https://zoom.us/j/9823418239?pwd=manaCommunityAGM',
    quorumConfirmed: 268,
    quorumRequired: 250,
    quorumPercentage: 53.6,
    isQuorumAchieved: true,
    hasUserConfirmed: true,
    attendanceMode: 'PHYSICAL',
    annualReportUrl: 'https://docs.manacommunity.org/reports/AGM_Annual_Report_2025.pdf',
    minutesUrl: 'https://docs.manacommunity.org/reports/AGM_2025_Live_Minutes.pdf',
    agenda: [
      {
        id: 1,
        order: 1,
        title: 'Welcome Address & Quorum Verification',
        presenter: 'Col. Rajesh Sharma (Secretary)',
        duration: '15 mins',
        description: 'Formal roll-call, quorum confirmation of registered flat owners, and welcome address by the MC.',
        status: 'DISCUSSED',
        notes: 'Quorum established at 10:14 AM with 268 verified owners present physically & virtually.',
      },
      {
        id: 2,
        order: 2,
        title: 'Adoption of FY 2024-25 Audited Financial Accounts',
        presenter: 'Mrs. Sunita Venkat (Treasurer)',
        duration: '30 mins',
        description: 'Detailed presentation of statutory audit report by M/s R.K. Associates, revenue collections, sinking fund reserves, and Capex expenditures.',
        status: 'IN_PROGRESS',
        notes: 'Statutory auditor gave unqualified clean opinion. Sinking fund balance is ₹1.84 Cr.',
        attachmentName: 'Audited_Financials_FY24_25.pdf',
      },
      {
        id: 3,
        order: 3,
        title: 'Rooftop Solar Plant Phase 2 (150 kWp) Proposal',
        presenter: 'Infrastructure Sub-Committee',
        duration: '25 mins',
        description: 'Detailed project review on CAPEX of ₹42 Lakhs, projected monthly electricity savings of ₹85,000, and 3.8-year payback period.',
        status: 'VOTING_OPEN',
        notes: 'Voting open on secret ballot portal for 48 hours.',
      },
      {
        id: 4,
        order: 4,
        title: 'EV Charging Infrastructure & Grid Load Augmentation',
        presenter: 'Technical Committee',
        duration: '20 mins',
        description: 'Installation of 40 shared Level-2 fast chargers in basement B1/B2 and transformer load upgrade with BESCOM.',
        status: 'PENDING',
        notes: 'Estimated budget: ₹18 Lakhs from Special Asset Fund.',
      },
      {
        id: 5,
        order: 5,
        title: 'Security Vendor Performance Review & AI CCTV Upgrades',
        presenter: 'Security & Safety Lead',
        duration: '15 mins',
        description: 'Evaluation of BlackRock Security agency SLA adherence and proposal for 24 new perimeter AI breach cameras.',
        status: 'PENDING',
      },
      {
        id: 6,
        order: 6,
        title: 'Managing Committee & Office Bearers Election (2025-2027)',
        presenter: 'Election Officer - Adv. P. K. Nair',
        duration: '35 mins',
        description: 'Declaration of candidates, secret ballot electronic election for President, Secretary, Treasurer, and 7 Committee members.',
        status: 'PENDING',
      },
      {
        id: 7,
        order: 7,
        title: 'Clubhouse Gymnasium & Badminton Court Refurbishment',
        presenter: 'Sports Committee',
        duration: '15 mins',
        description: 'Maple wood flooring replacement and high-grade cardio equipment procurement.',
        status: 'PENDING',
      },
      {
        id: 8,
        order: 8,
        title: 'Bylaw Amendment: Pet Policy & Leash Regulations in Elevators',
        presenter: 'Resident Welfare Group',
        duration: '15 mins',
        description: 'Proposal to mandate dedicated service lifts during peak school hours and mandatory pet registration.',
        status: 'PENDING',
      },
      {
        id: 9,
        order: 9,
        title: 'Appointment of Statutory Auditors for FY 2025-26',
        presenter: 'Treasurer',
        duration: '10 mins',
        description: 'Re-appointment of chartered accounting firm and fixing auditor remuneration.',
        status: 'PENDING',
      },
      {
        id: 10,
        order: 10,
        title: 'Open Floor Q&A, Grievance Discussion & Vote of Thanks',
        presenter: 'President',
        duration: '30 mins',
        description: 'Floor open for owner questions submitted prior to meeting, followed by presidential conclusion.',
        status: 'PENDING',
      },
    ],
    liveMinutes: [
      {
        id: 'lm-1',
        timestamp: '10:05 AM',
        speaker: 'Col. Rajesh Sharma (Secretary)',
        content: 'Meeting called to order. Registered quorum verified at 268 units (53.6%), meeting officially convened.',
      },
      {
        id: 'lm-2',
        timestamp: '10:22 AM',
        speaker: 'Mrs. Sunita Venkat (Treasurer)',
        content: 'Commenced presentation of FY24-25 audit report. Highlighting 98.4% maintenance recovery rate.',
      },
      {
        id: 'lm-3',
        timestamp: '10:48 AM',
        speaker: 'Election Officer',
        content: 'Electronic ballot opened for Motion #1 (Solar Capex) and Motion #2 (EV Hub). Residents can cast digital ballots.',
      },
    ],
  },
  {
    id: 'egm-2025-01',
    type: 'EGM',
    status: 'CONCLUDED',
    title: 'Extraordinary General Meeting (EGM): Rainwater Harvesting',
    description: 'Emergency body meeting convened to authorize urgent ₹12 Lakh borewell recharge and stormwater percolation pit renovation.',
    date: 'Sunday, July 14, 2025',
    time: '4:00 PM - 6:00 PM IST',
    location: 'Community Center Amphitheater',
    quorumConfirmed: 284,
    quorumRequired: 250,
    quorumPercentage: 56.8,
    isQuorumAchieved: true,
    hasUserConfirmed: true,
    attendanceMode: 'PHYSICAL',
    minutesUrl: 'https://docs.manacommunity.org/reports/EGM_Minutes_July_2025.pdf',
    agenda: [
      {
        id: 101,
        order: 1,
        title: 'Borewell Recharge Project Approval',
        presenter: 'Water Committee',
        duration: '45 mins',
        description: 'Execution plan and vendor sanction for 8 deep recharge wells.',
        status: 'APPROVED',
      },
    ],
  },
];

const MOCK_PROPOSALS: ProposalDto[] = [
  {
    id: 'prop-101',
    title: 'Installation of 150 kWp Rooftop Solar Panels (Phase 2)',
    description: 'Transition common area lighting and lift power backup to solar energy to slash monthly electricity bills by ₹85,000 and earn green society credits.',
    category: 'ENVIRONMENT',
    type: 'PROPOSAL',
    estimatedCost: '₹42,00,000',
    submittedBy: 'Dr. Anand Ramanathan',
    submittedByFlat: 'Tower B - 1204',
    submittedDate: 'Sep 24, 2025',
    supportCount: 68,
    supportThreshold: 50,
    hasUserSupported: true,
    status: 'APPROVED_FOR_AGM',
    pros: [
      'Reduces society common electricity tariff by up to 35%',
      '3.8-year breakeven period with 25-year manufacturer solar warranty',
      'Govt subsidy of ₹6.2 Lakhs under PM Surya Ghar Muft Bijli Yojana',
    ],
    cons: [
      'Upfront CapEx outlay required from reserve fund',
      'Requires rooftop waterproofing certification prior to mounting',
    ],
    committeeNotes: 'Reviewed by Technical Committee. Placed on Agenda item #3 for AGM 2025 ballot vote.',
  },
  {
    id: 'prop-102',
    title: 'Biometric RFID Access Barrier for Basement 2 Visitor Parking',
    description: 'Prevent unauthorized long-term parking by cabs and non-residents with automated FASTag RFID boom barriers linked to security kiosk.',
    category: 'SECURITY',
    type: 'PROPOSAL',
    estimatedCost: '₹3,50,000',
    submittedBy: 'Meenakshi Iyer',
    submittedByFlat: 'Tower A - 402',
    submittedDate: 'Oct 02, 2025',
    supportCount: 42,
    supportThreshold: 50,
    hasUserSupported: false,
    status: 'UNDER_REVIEW',
    pros: [
      'Eliminates tailgating and illegal parking in allocated resident slots',
      'Instant logging of guest entry/exit timestamps',
    ],
    cons: [
      'Requires resident vehicles to affix ₹150 RFID tags',
    ],
    committeeNotes: 'Under technical feasibility review by security sub-committee.',
  },
  {
    id: 'prop-103',
    title: 'All-Weather Covered Pathway between Tower C and Clubhouse',
    description: 'Construct a weather-proof tensile fabric covered walkway so senior citizens and kids can access the clubhouse and clinic safely during monsoons.',
    category: 'INFRASTRUCTURE',
    type: 'PROPOSAL',
    estimatedCost: '₹6,80,000',
    submittedBy: 'Capt. Harish Chandra',
    submittedByFlat: 'Tower C - 801',
    submittedDate: 'Oct 06, 2025',
    supportCount: 54,
    supportThreshold: 50,
    hasUserSupported: true,
    status: 'APPROVED_FOR_AGM',
    pros: [
      'High safety for elders walking in heavy rains',
      'Modern aesthetic canopy with integrated LED solar strip lights',
    ],
    cons: [
      'Minor lawn area alteration along the 80-meter walkway',
    ],
    committeeNotes: 'Reached endorsement threshold. Endorsed by MC for General Body discussion.',
  },
  {
    id: 'prop-104',
    title: 'Grievance: Frequent Water Pressure Fluctuations on Upper Floors (10+)',
    description: 'Hydro-pneumatic booster pump #3 trips frequently during peak morning hours (6:30 AM - 8:30 AM), causing low pressure in high-rise master toilets.',
    category: 'INFRASTRUCTURE',
    type: 'GRIEVANCE',
    estimatedCost: '₹85,000',
    submittedBy: 'Vikas Agarwal',
    submittedByFlat: 'Tower D - 1403',
    submittedDate: 'Oct 09, 2025',
    supportCount: 38,
    supportThreshold: 30,
    hasUserSupported: true,
    status: 'UNDER_REVIEW',
    pros: [
      'Standardized 3.5 bar water pressure across all 18 floors',
      'Variable Frequency Drive (VFD) replacement prevents motor burnout',
    ],
    cons: [],
    committeeNotes: 'Facility maintenance team assigned work order #WO-891 to replace VFD controller.',
  },
];

const MOCK_BALLOTS: BallotDto[] = [
  {
    id: 'ballot-2025-01',
    title: 'Motion #1: Approval of 150 kWp Rooftop Solar Capex (₹42 Lakhs)',
    category: 'INFRASTRUCTURE & ENVIRONMENT',
    description: 'Resolution to authorize Managing Committee to award contract to Tata Power Solar for 150 kWp solar array across Towers A, B, and C terraces.',
    resolutionMotionText: 'RESOLVED THAT the general body approves the allocation of ₹42,00,000 from the Society Special Infrastructure Reserve Fund for the turnkey installation of 150 kWp Rooftop Solar Grid.',
    startDate: 'Oct 15, 2025',
    endDate: 'Oct 22, 2025 (Closes in 4 days)',
    totalEligibleVoters: 500,
    totalVotesCast: 312,
    turnoutPercentage: 62.4,
    minQuorumPercentage: 50.0,
    isQuorumReached: true,
    hasUserVoted: true,
    userVotedOptionId: 'opt-for',
    voteReceiptHash: '0x8f7d9a3b2c1e4f50689bcf2e8910dca34b8c91038e7f',
    status: 'ACTIVE',
    options: [
      { id: 'opt-for', text: 'FOR / APPROVE', votesCount: 278, percentage: 89.1, description: 'Support the project as drafted and authorize Capex disbursement.' },
      { id: 'opt-against', text: 'AGAINST / REJECT', votesCount: 24, percentage: 7.7, description: 'Reject the proposal; retain current grid power tariff.' },
      { id: 'opt-abstain', text: 'ABSTAIN', votesCount: 10, percentage: 3.2, description: 'Record presence without casting an affirmative or negative vote.' },
    ],
    wingBreakdown: [
      { wing: 'Tower A', voted: 82, total: 125 },
      { wing: 'Tower B', voted: 89, total: 125 },
      { wing: 'Tower C', voted: 74, total: 125 },
      { wing: 'Tower D', voted: 67, total: 125 },
    ],
  },
  {
    id: 'ballot-2025-02',
    title: 'Motion #2: EV Charging Grid Policy & Monthly Subscription Model',
    category: 'FACILITIES & AMENITIES',
    description: 'Adoption of dedicated EV charging policy mandating automated per-kWh billing at ₹8.50/unit + ₹150 monthly connector maintenance fee.',
    resolutionMotionText: 'RESOLVED THAT the EV charging policy guidelines as circulated in Document REF-EV-2025 be adopted effective November 1, 2025.',
    startDate: 'Oct 15, 2025',
    endDate: 'Oct 22, 2025 (Closes in 4 days)',
    totalEligibleVoters: 500,
    totalVotesCast: 285,
    turnoutPercentage: 57.0,
    minQuorumPercentage: 50.0,
    isQuorumReached: true,
    hasUserVoted: false,
    status: 'ACTIVE',
    options: [
      { id: 'opt-ev-for', text: 'FOR / APPROVE', votesCount: 236, percentage: 82.8, description: 'Approve EV policy guidelines and smart metering.' },
      { id: 'opt-ev-against', text: 'AGAINST / REJECT', votesCount: 38, percentage: 13.3, description: 'Request revision of monthly maintenance rate.' },
      { id: 'opt-ev-abstain', text: 'ABSTAIN', votesCount: 11, percentage: 3.9, description: 'Neutral abstention.' },
    ],
    wingBreakdown: [
      { wing: 'Tower A', voted: 75, total: 125 },
      { wing: 'Tower B', voted: 79, total: 125 },
      { wing: 'Tower C', voted: 68, total: 125 },
      { wing: 'Tower D', voted: 63, total: 125 },
    ],
  },
  {
    id: 'ballot-2024-03',
    title: 'Motion #3: Comprehensive Clubhouse Badminton Synthetic Court Upgrade',
    category: 'SPORTS & AMENITIES',
    description: 'Sanction ₹8.5 Lakhs for BWF-certified 8mm synthetic court resurfacing.',
    resolutionMotionText: 'RESOLVED THAT synthetic badminton court refurbishment work order be awarded to Olympic Surfaces Pvt Ltd.',
    startDate: 'Nov 10, 2024',
    endDate: 'Nov 17, 2024',
    totalEligibleVoters: 500,
    totalVotesCast: 394,
    turnoutPercentage: 78.8,
    minQuorumPercentage: 50.0,
    isQuorumReached: true,
    hasUserVoted: true,
    userVotedOptionId: 'opt-spt-for',
    voteReceiptHash: '0x12a9bc4389df0123fe56ba78901234cde56789a012bc',
    status: 'CLOSED',
    options: [
      { id: 'opt-spt-for', text: 'FOR / APPROVE', votesCount: 362, percentage: 91.9, description: 'Passed by supermajority' },
      { id: 'opt-spt-against', text: 'AGAINST / REJECT', votesCount: 22, percentage: 5.6, description: 'Rejected' },
      { id: 'opt-spt-abstain', text: 'ABSTAIN', votesCount: 10, percentage: 2.5, description: 'Abstained' },
    ],
  },
];

const MOCK_RESOLUTIONS: ResolutionDto[] = [
  {
    id: 'res-2025-01',
    resolutionNumber: 'RES-AGM-2025-01',
    title: 'Enactment of Rainwater Harvesting & Ground Recharge Mandate',
    meetingReference: 'Passed at EGM on July 14, 2025',
    passedDate: 'July 14, 2025',
    category: 'INFRASTRUCTURE & WATER',
    approvedBudget: '₹12,00,000',
    status: 'COMPLETED',
    votingSummary: {
      forVotes: 268,
      againstVotes: 12,
      abstained: 4,
      totalPercentageFor: 94.4,
    },
    keyProvisions: [
      'Construction of 8 specialized recharge borewells across perimeter drain lines.',
      'Mandatory desilting of dual 100KL stormwater retention sumps every 6 months.',
      'Water audit compliance certificate to be filed with Central Ground Water Board.',
    ],
    presidingOfficer: 'Col. Rajesh Sharma (General Secretary)',
    legalBindingStatement: 'This resolution is legally binding on all current and future members under Section 19 of Society Bylaws.',
    documentUrl: 'https://docs.manacommunity.org/resolutions/RES-AGM-2025-01.pdf',
  },
  {
    id: 'res-2025-02',
    resolutionNumber: 'RES-AGM-2025-02',
    title: 'Adoption of Zero Single-Use Plastic Society Code & Organic Composting',
    meetingReference: 'Passed at General Body Meeting on April 20, 2025',
    passedDate: 'April 20, 2025',
    category: 'ENVIRONMENT & BYLAWS',
    approvedBudget: '₹4,50,000',
    status: 'IN_IMPLEMENTATION',
    votingSummary: {
      forVotes: 310,
      againstVotes: 18,
      abstained: 6,
      totalPercentageFor: 92.8,
    },
    keyProvisions: [
      'Complete ban on single-use non-biodegradable garbage liners.',
      'Commissioning of 500kg/day in-situ aerobic Organic Waste Converter (OWC).',
      'Free distribution of society-branded organic compost to resident gardening club.',
    ],
    presidingOfficer: 'Mrs. Rekha Sundaram (President)',
    legalBindingStatement: 'Registered with Karnataka Societies Registrar pursuant to KCS Act 1959.',
    documentUrl: 'https://docs.manacommunity.org/resolutions/RES-AGM-2025-02.pdf',
  },
  {
    id: 'res-2024-04',
    resolutionNumber: 'RES-AGM-2024-04',
    title: 'Establishment of 24/7 Paramedic Emergency Response & Defibrillator Station',
    meetingReference: 'Passed at AGM 2024 on Oct 27, 2024',
    passedDate: 'October 27, 2024',
    category: 'HEALTH & SAFETY',
    approvedBudget: '₹6,00,000',
    status: 'COMPLETED',
    votingSummary: {
      forVotes: 355,
      againstVotes: 5,
      abstained: 8,
      totalPercentageFor: 96.5,
    },
    keyProvisions: [
      'Installation of automated external defibrillator (AED) in Clubhouse & Tower A lobbies.',
      'MOU with Apollo Cradle for on-call ambulance arrival within 12 minutes.',
      'Mandatory annual CPR training workshop for estate security and housekeeping staff.',
    ],
    presidingOfficer: 'Col. Rajesh Sharma (General Secretary)',
    legalBindingStatement: 'Enacted under statutory Society Safety Guidelines.',
    documentUrl: 'https://docs.manacommunity.org/resolutions/RES-AGM-2024-04.pdf',
  },
];

const MOCK_VAULT_DOCS: VaultDocumentDto[] = [
  {
    id: 'vault-1',
    title: 'Mana Community Registered Society Bylaws (Amended 2024)',
    category: 'BYLAWS',
    fileSize: '4.2 MB',
    fileFormat: 'PDF (Certified)',
    lastUpdated: 'Nov 15, 2024',
    documentUrl: 'https://docs.manacommunity.org/vault/Society_Bylaws_2024.pdf',
    isConfidential: false,
    resolutionRef: 'RES-BYLAW-2024-01',
    digitalSealVerified: true,
  },
  {
    id: 'vault-2',
    title: 'Statutory Financial Audit Report FY 2024-25 by M/s R.K. Associates',
    category: 'AUDIT',
    fileSize: '8.7 MB',
    fileFormat: 'PDF (Signed)',
    lastUpdated: 'Sep 10, 2025',
    documentUrl: 'https://docs.manacommunity.org/vault/Audit_Report_FY24_25.pdf',
    isConfidential: false,
    resolutionRef: 'RES-AUDIT-2025',
    digitalSealVerified: true,
  },
  {
    id: 'vault-3',
    title: '4th AGM Official Minutes of Meeting (MoM) & Attendance Register',
    category: 'MINUTES',
    fileSize: '3.1 MB',
    fileFormat: 'PDF (Official)',
    lastUpdated: 'Nov 02, 2024',
    documentUrl: 'https://docs.manacommunity.org/vault/AGM_2024_MoM_Signed.pdf',
    isConfidential: false,
    resolutionRef: 'AGM-2024-MIN',
    digitalSealVerified: true,
  },
  {
    id: 'vault-4',
    title: 'Pollution Control Board & Fire Department NOC Compliance Certificates',
    category: 'LEGAL',
    fileSize: '2.4 MB',
    fileFormat: 'PDF (Govt Certified)',
    lastUpdated: 'Jan 18, 2025',
    documentUrl: 'https://docs.manacommunity.org/vault/Fire_KSPCB_NOC_2025.pdf',
    isConfidential: false,
    resolutionRef: 'NOC-2025-FIRE',
    digitalSealVerified: true,
  },
  {
    id: 'vault-5',
    title: 'Resident Grievance Redressal & Committee Nomination Form Template',
    category: 'FORMS',
    fileSize: '650 KB',
    fileFormat: 'PDF (Fillable)',
    lastUpdated: 'Aug 05, 2025',
    documentUrl: 'https://docs.manacommunity.org/vault/Nomination_Form_2025.pdf',
    isConfidential: false,
    digitalSealVerified: true,
  },
  {
    id: 'vault-6',
    title: 'Elevator & Lift Safety License Renewal Order (ThyssenKrupp)',
    category: 'LEGAL',
    fileSize: '1.8 MB',
    fileFormat: 'PDF (Govt Certified)',
    lastUpdated: 'May 30, 2025',
    documentUrl: 'https://docs.manacommunity.org/vault/Lift_Safety_License.pdf',
    isConfidential: false,
    digitalSealVerified: true,
  },
];

let inMemoryProposals = [...MOCK_PROPOSALS];
let inMemoryBallots = [...MOCK_BALLOTS];
let inMemoryMeetings = [...MOCK_MEETINGS];

export const governanceService = {
  async getStats(): Promise<GovernanceStatsDto> {
    try {
      const res = await api.get<GovernanceStatsDto>('/governance/stats');
      return res.data;
    } catch {
      return {
        ...MOCK_STATS,
        activeProposals: inMemoryProposals.length,
        openVotes: inMemoryBallots.filter((b) => b.status === 'ACTIVE').length,
        passedResolutions: MOCK_RESOLUTIONS.length,
      };
    }
  },

  async getMeetings(type?: 'AGM' | 'EGM' | 'PAST'): Promise<MeetingDto[]> {
    try {
      const res = await api.get<MeetingDto[]>('/governance/meetings', {
        params: { type },
      });
      return res.data;
    } catch {
      if (type === 'AGM') return inMemoryMeetings.filter((m) => m.type === 'AGM');
      if (type === 'EGM') return inMemoryMeetings.filter((m) => m.type === 'EGM');
      return inMemoryMeetings;
    }
  },

  async getMeetingById(id: string): Promise<MeetingDto | undefined> {
    try {
      const res = await api.get<MeetingDto>(`/governance/meetings/${id}`);
      return res.data;
    } catch {
      return inMemoryMeetings.find((m) => m.id === id) || inMemoryMeetings[0];
    }
  },

  async confirmAttendance(meetingId: string, mode: 'PHYSICAL' | 'ONLINE' | 'PROXY', proxyNominee?: string): Promise<void> {
    try {
      await api.post(`/governance/meetings/${meetingId}/rsvp`, { mode, proxyNominee });
    } catch {
      inMemoryMeetings = inMemoryMeetings.map((m) => {
        if (m.id === meetingId) {
          const wasConfirmed = m.hasUserConfirmed;
          const nextCount = wasConfirmed ? m.quorumConfirmed : m.quorumConfirmed + 1;
          const nextPct = Number(((nextCount / m.quorumRequired) * 50).toFixed(1));
          return {
            ...m,
            hasUserConfirmed: true,
            attendanceMode: mode,
            proxyNominee: proxyNominee || m.proxyNominee,
            quorumConfirmed: nextCount,
            quorumPercentage: nextPct,
            isQuorumAchieved: nextCount >= m.quorumRequired,
          };
        }
        return m;
      });
    }
  },

  async getProposals(category?: string): Promise<ProposalDto[]> {
    try {
      const res = await api.get<ProposalDto[]>('/governance/proposals', {
        params: { category },
      });
      return res.data;
    } catch {
      if (category && category !== 'ALL') {
        return inMemoryProposals.filter((p) => p.category === category);
      }
      return inMemoryProposals;
    }
  },

  async supportProposal(proposalId: string): Promise<{ success: boolean; supportCount: number; hasUserSupported: boolean }> {
    try {
      const res = await api.post<{ success: boolean; supportCount: number; hasUserSupported: boolean }>(
        `/governance/proposals/${proposalId}/support`
      );
      return res.data;
    } catch {
      let count = 0;
      let supported = false;
      inMemoryProposals = inMemoryProposals.map((p) => {
        if (p.id === proposalId) {
          const willSupport = !p.hasUserSupported;
          const nextCount = willSupport ? p.supportCount + 1 : p.supportCount - 1;
          count = nextCount;
          supported = willSupport;
          return {
            ...p,
            supportCount: nextCount,
            hasUserSupported: willSupport,
            status: nextCount >= p.supportThreshold ? 'APPROVED_FOR_AGM' : p.status,
          };
        }
        return p;
      });
      return { success: true, supportCount: count, hasUserSupported: supported };
    }
  },

  async createProposal(data: Partial<ProposalDto>): Promise<ProposalDto> {
    try {
      const res = await api.post<ProposalDto>('/governance/proposals', data);
      return res.data;
    } catch {
      const newProp: ProposalDto = {
        id: `prop-${Date.now().toString().slice(-4)}`,
        title: data.title || 'Untitled Proposal',
        description: data.description || '',
        category: data.category || 'AMENITIES',
        type: data.type || 'PROPOSAL',
        estimatedCost: data.estimatedCost || '₹0',
        submittedBy: 'You (Owner)',
        submittedByFlat: 'Tower B - 1204',
        submittedDate: 'Just now',
        supportCount: 1,
        supportThreshold: 50,
        hasUserSupported: true,
        status: 'SUBMITTED',
        pros: data.pros && data.pros.length > 0 ? data.pros : ['Community enhancement initiative'],
        cons: data.cons && data.cons.length > 0 ? data.cons : [],
        committeeNotes: 'Awaiting initial sub-committee review.',
      };
      inMemoryProposals = [newProp, ...inMemoryProposals];
      return newProp;
    }
  },

  async getBallots(status?: 'ACTIVE' | 'CLOSED' | 'UPCOMING'): Promise<BallotDto[]> {
    try {
      const res = await api.get<BallotDto[]>('/governance/ballots', {
        params: { status },
      });
      return res.data;
    } catch {
      if (status) {
        return inMemoryBallots.filter((b) => b.status === status);
      }
      return inMemoryBallots;
    }
  },

  async castVote(ballotId: string, optionId: string): Promise<{ receiptHash: string }> {
    const generatedHash = `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    try {
      const res = await api.post<{ receiptHash: string }>(`/governance/ballots/${ballotId}/vote`, { optionId });
      return res.data;
    } catch {
      inMemoryBallots = inMemoryBallots.map((b) => {
        if (b.id === ballotId) {
          const totalVotes = b.totalVotesCast + 1;
          const nextTurnout = Number(((totalVotes / b.totalEligibleVoters) * 100).toFixed(1));
          const updatedOptions = b.options.map((opt) => {
            const isChosen = opt.id === optionId;
            const votes = isChosen ? opt.votesCount + 1 : opt.votesCount;
            return {
              ...opt,
              votesCount: votes,
              percentage: Number(((votes / totalVotes) * 100).toFixed(1)),
            };
          });
          return {
            ...b,
            hasUserVoted: true,
            userVotedOptionId: optionId,
            voteReceiptHash: generatedHash,
            totalVotesCast: totalVotes,
            turnoutPercentage: nextTurnout,
            isQuorumReached: nextTurnout >= b.minQuorumPercentage,
            options: updatedOptions,
          };
        }
        return b;
      });
      return { receiptHash: generatedHash };
    }
  },

  async getResolutions(search?: string): Promise<ResolutionDto[]> {
    try {
      const res = await api.get<ResolutionDto[]>('/governance/resolutions', {
        params: { search },
      });
      return res.data;
    } catch {
      if (search && search.trim()) {
        const q = search.toLowerCase();
        return MOCK_RESOLUTIONS.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.resolutionNumber.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q)
        );
      }
      return MOCK_RESOLUTIONS;
    }
  },

  async getVaultDocuments(category?: string, search?: string): Promise<VaultDocumentDto[]> {
    try {
      const res = await api.get<VaultDocumentDto[]>('/governance/vault', {
        params: { category, search },
      });
      return res.data;
    } catch {
      let list = MOCK_VAULT_DOCS;
      if (category && category !== 'ALL') {
        list = list.filter((d) => d.category === category);
      }
      if (search && search.trim()) {
        const q = search.toLowerCase();
        list = list.filter((d) => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
      }
      return list;
    }
  },
};

