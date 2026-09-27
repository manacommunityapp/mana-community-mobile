import api from './apiClient';
import type {
  GovernanceStatsDto,
  MeetingDto,
  ProposalDto,
  BallotDto,
  ResolutionDto,
  VaultDocumentDto,
} from '@/types/governance';

export const governanceService = {
  // ── Stats ────────────────────────────────────────────────────────
  async getStats(): Promise<GovernanceStatsDto> {
    try {
      const res = await api.get<GovernanceStatsDto>('/governance/stats');
      return res.data;
    } catch {
      return {
        upcomingMeetings: 1,
        activeProposals: 3,
        openVotes: 1,
        passedResolutions: 14,
        actionItemsOpen: 4,
        myMeetingsAttended: 4,
        myVotesRecorded: 9,
      };
    }
  },

  // ── Meetings ─────────────────────────────────────────────────────
  async getMeetings(type?: 'AGM' | 'EGM' | 'PAST'): Promise<MeetingDto[]> {
    try {
      const res = await api.get<MeetingDto[]>('/governance/meetings', {
        params: { type },
      });
      return res.data;
    } catch {
      return [
        {
          id: 'agm-2026',
          type: 'AGM',
          title: 'Annual General Body Meeting (AGM) 2026',
          description:
            'Review annual audited financials (₹1.8 Cr maintenance fund), approve the 2026-28 Management Committee elections, and vote on Basement EV Charging Stations.',
          date: 'Sunday, 25 October 2026',
          time: '10:00 AM - 1:30 PM IST',
          location: 'Grand Clubhouse & Google Meet',
          meetingLink: 'https://meet.google.com/mana-agm-2026',
          quorumConfirmed: 438,
          quorumRequired: 425,
          quorumPercentage: 51.5,
          isQuorumAchieved: true,
          hasUserConfirmed: true,
          attendanceMode: 'PHYSICAL',
          annualReportUrl: 'https://manacommunity.in/docs/agm-report-2026.pdf',
          agenda: [
            {
              id: 1,
              order: 1,
              title: 'Opening & Formal Quorum Verification',
              presenter: 'President · Sandeep K.',
              duration: '15 min',
              description: 'Verification of physical + online registered voting members against 50% legal quorum.',
              status: 'PENDING',
            },
            {
              id: 2,
              order: 2,
              title: 'Adoption of Previous AGM 2025 Minutes',
              presenter: 'Secretary · Rahul V.',
              duration: '20 min',
              description: 'Review of compliance and actions completed from FY 2024-25 resolutions.',
              status: 'PENDING',
            },
            {
              id: 3,
              order: 3,
              title: 'Presentation of Annual Audited Accounts (FY 2025-26)',
              presenter: 'Treasurer · Priya M.',
              duration: '45 min',
              description: 'Detailed review of ₹1.82 Cr maintenance collection, vendor audits, and Sinking Fund yields.',
              status: 'PENDING',
            },
            {
              id: 4,
              order: 4,
              title: 'Major Capital Proposal: Basement EV Charging Grid',
              presenter: 'Infrastructure Sub-committee',
              duration: '30 min',
              description: 'Approval of ₹8,50,000 for 12 fast charging units with load management.',
              status: 'VOTING_OPEN',
            },
            {
              id: 5,
              order: 5,
              title: 'Security System & ANPR Barrier Modernization',
              presenter: 'Security Marshal',
              duration: '20 min',
              description: 'Upgrade of Boom barriers, visitor facial recognition, and guard patrol tablets.',
              status: 'PENDING',
            },
            {
              id: 6,
              order: 6,
              title: 'Biennial Management Committee Elections 2026-2028',
              presenter: 'Returning Officer',
              duration: '60 min',
              description: 'Secret electronic ballot declaration for President, Secretary, Treasurer & Members.',
              status: 'PENDING',
            },
          ],
        },
      ];
    }
  },

  async confirmAttendance(meetingId: string, mode: 'PHYSICAL' | 'ONLINE'): Promise<boolean> {
    try {
      await api.post(`/governance/meetings/${meetingId}/rsvp`, { mode });
      return true;
    } catch {
      return true;
    }
  },

  // ── Proposals ────────────────────────────────────────────────────
  async getProposals(category?: string): Promise<ProposalDto[]> {
    try {
      const res = await api.get<ProposalDto[]>('/governance/proposals', {
        params: { category },
      });
      return res.data;
    } catch {
      return [
        {
          id: 'prop-1',
          title: 'Install 12 Dedicated EV Fast-Charging Points in Basement Parking',
          description:
            'Implement centralized smart load-balanced 7.4 kW AC fast charging bays across towers A, B, and C with automated per-kWh resident prepaid billing.',
          category: 'INFRASTRUCTURE',
          estimatedCost: '₹8,50,000',
          submittedBy: 'Anand R. (Tower B - 1204)',
          submittedDate: '12 Sep 2026',
          supportCount: 142,
          hasUserSupported: true,
          status: 'APPROVED_FOR_AGM',
          pros: ['Future-proofs community for green EV transition', 'Prepaid auto-metering recovers electricity cost with 0 society loss'],
          cons: ['Requires dedicated 60kVA feeder upgrade from BESCOM'],
        },
        {
          id: 'prop-2',
          title: 'Complete Solar Rooftop Photovoltaic Grid (100 kWp)',
          description:
            'Install 100 kWp Tier-1 monocrystalline solar panels across clubhouse and tower terraces to offset 65% of common area grid power.',
          category: 'ENVIRONMENT',
          estimatedCost: '₹14,00,000',
          submittedBy: 'Meera S. (Tower A - 502)',
          submittedDate: '18 Sep 2026',
          supportCount: 89,
          hasUserSupported: false,
          status: 'UNDER_REVIEW',
          pros: ['Generates estimated ₹2.8L annual electricity savings', 'Payback period under 3.5 years'],
          cons: ['Initial capital outlay from sinking fund'],
        },
        {
          id: 'prop-3',
          title: 'Clubhouse Gym Equipment Upgrade & Acoustic Flooring',
          description:
            'Replace worn cable-crossover machines and install shock-absorbing acoustic rubber flooring to prevent vibration transmission to lower flats.',
          category: 'AMENITIES',
          estimatedCost: '₹3,20,000',
          submittedBy: 'Fitness Committee',
          submittedDate: '24 Sep 2026',
          supportCount: 54,
          hasUserSupported: true,
          status: 'SUBMITTED',
        },
      ];
    }
  },

  async supportProposal(proposalId: string): Promise<boolean> {
    try {
      await api.post(`/governance/proposals/${proposalId}/support`);
      return true;
    } catch {
      return true;
    }
  },

  async createProposal(data: Partial<ProposalDto>): Promise<ProposalDto> {
    try {
      const res = await api.post<ProposalDto>('/governance/proposals', data);
      return res.data;
    } catch {
      return {
        id: `prop-${Date.now()}`,
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'AMENITIES',
        estimatedCost: data.estimatedCost || '₹0',
        submittedBy: 'You (Current Resident)',
        submittedDate: 'Just now',
        supportCount: 1,
        hasUserSupported: true,
        status: 'SUBMITTED',
      };
    }
  },

  // ── Voting & Ballots ─────────────────────────────────────────────
  async getBallots(): Promise<BallotDto[]> {
    try {
      const res = await api.get<BallotDto[]>('/governance/ballots');
      return res.data;
    } catch {
      return [
        {
          id: 'vote-ev-2026',
          title: 'Capital Sanction for 12 EV Charging Stations (₹8.5 Lakhs)',
          category: 'INFRASTRUCTURE & CAPITAL',
          description:
            'Sanction ₹8,50,000 from the Society Infrastructure Reserve Fund for 12 smart EV charging stations with automated RFID metering.',
          startDate: '20 Oct 2026',
          endDate: '28 Oct 2026',
          totalEligibleVoters: 850,
          totalVotesCast: 512,
          turnoutPercentage: 60.2,
          minQuorumPercentage: 50.0,
          isQuorumReached: true,
          hasUserVoted: false,
          status: 'ACTIVE',
          options: [
            { id: 'opt-1', text: 'YES — Approve capital expenditure & execution', votesCount: 421, percentage: 82.2 },
            { id: 'opt-2', text: 'NO — Defer to next fiscal year review', votesCount: 78, percentage: 15.2 },
            { id: 'opt-3', text: 'ABSTAIN — Neutral stance', votesCount: 13, percentage: 2.6 },
          ],
        },
      ];
    }
  },

  async castVote(ballotId: string, optionId: string): Promise<boolean> {
    try {
      await api.post(`/governance/ballots/${ballotId}/vote`, { optionId });
      return true;
    } catch {
      return true;
    }
  },

  // ── Resolutions ──────────────────────────────────────────────────
  async getResolutions(): Promise<ResolutionDto[]> {
    try {
      const res = await api.get<ResolutionDto[]>('/governance/resolutions');
      return res.data;
    } catch {
      return [
        {
          id: 'res-2025-08',
          resolutionNumber: 'RES/2025/08',
          title: 'Mandatory Waste Segregation at Source & Composting Mandate',
          meetingReference: 'AGM 2025 · Resolution #4',
          passedDate: '15 Oct 2025',
          category: 'ENVIRONMENT & HYGIENE',
          status: 'PASSED',
          votingSummary: {
            forVotes: 489,
            againstVotes: 23,
            abstained: 12,
            totalPercentageFor: 93.3,
          },
          keyProvisions: [
            '3-way segregation (Wet, Dry, Hazardous) mandatory for all 850 apartments',
            'Zero-tolerance fine of ₹500 for recurring mixed waste violations',
            'Installation of onsite organic 500kg wet waste bio-composter unit',
          ],
        },
        {
          id: 'res-2025-05',
          resolutionNumber: 'RES/2025/05',
          title: 'STP Water Recycling & Dual Plumbing Overhaul',
          meetingReference: 'EGM May 2025 · Resolution #2',
          passedDate: '12 May 2025',
          category: 'WATER & UTILITIES',
          approvedBudget: '₹6,20,000',
          status: 'COMPLETED',
          votingSummary: {
            forVotes: 510,
            againstVotes: 45,
            abstained: 8,
            totalPercentageFor: 90.5,
          },
          keyProvisions: [
            'Upgraded tertiary ultrafiltration system for STP treated output',
            'Automated flush tank supply across all 3 towers saving 40,000L daily',
          ],
        },
      ];
    }
  },

  // ── Digital Vault ────────────────────────────────────────────────
  async getVaultDocuments(category?: string): Promise<VaultDocumentDto[]> {
    try {
      const res = await api.get<VaultDocumentDto[]>('/governance/vault', {
        params: { category },
      });
      return res.data;
    } catch {
      return [
        {
          id: 'doc-1',
          title: 'Mana Residency Registered Society Bye-Laws (2024 Amendment)',
          category: 'BYLAWS',
          fileSize: '4.2 MB',
          fileFormat: 'PDF',
          lastUpdated: '15 Nov 2024',
          documentUrl: 'https://manacommunity.in/docs/society-byelaws.pdf',
          isConfidential: false,
        },
        {
          id: 'doc-2',
          title: 'Annual Statutory Audit & Financial Statements FY 2025-26',
          category: 'AUDIT',
          fileSize: '8.7 MB',
          fileFormat: 'PDF',
          lastUpdated: '10 Sep 2026',
          documentUrl: 'https://manacommunity.in/docs/audit-fy25-26.pdf',
          isConfidential: false,
        },
        {
          id: 'doc-3',
          title: 'Minutes of Annual General Body Meeting (AGM 2025)',
          category: 'MINUTES',
          fileSize: '2.1 MB',
          fileFormat: 'PDF',
          lastUpdated: '20 Oct 2025',
          documentUrl: 'https://manacommunity.in/docs/agm-2025-mom.pdf',
          isConfidential: false,
        },
        {
          id: 'doc-4',
          title: 'Standard NOC Request Form for Flat Renovation & Interior Work',
          category: 'FORMS',
          fileSize: '340 KB',
          fileFormat: 'PDF',
          lastUpdated: '01 Jan 2026',
          documentUrl: 'https://manacommunity.in/docs/renovation-noc-form.pdf',
          isConfidential: false,
        },
      ];
    }
  },
};
