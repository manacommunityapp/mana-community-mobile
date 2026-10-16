import api from './apiClient';

export interface TicketTimelineItem {
  id: string;
  action: string;
  note: string;
  author: string;
  timestamp: string;
}

export interface HelpdeskTicketDto {
  id: string;
  ticketNumber: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'SECURITY' | 'LIFT' | 'OTHER';
  subCategory?: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  assignedPhone?: string;
  createdAt: string;
  mediaUrls?: string[];
  slaHours?: number;
  slaDeadline?: string;
  residentRating?: number;
  residentComment?: string;
  location?: string;
  locationArea?: string;
  closureOtp?: string;
  escalationLevel?: number;
  escalationNote?: string;
  timeline?: TicketTimelineItem[];
}

export interface TicketCommentDto {
  id: string;
  ticketId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

export interface SlaPolicyDto {
  id: string;
  category: string;
  priority: string;
  resolutionHours: number;
  firstResponseHours: number;
}

export interface WorkOrderDto {
  id: string;
  ticketId: string;
  vendorName: string;
  technicianName: string;
  status: string;
  scheduledAt: string;
  estimatedCost: number;
}

const FALLBACK_TICKETS: HelpdeskTicketDto[] = [
  {
    id: "tk-001",
    ticketNumber: "TKT-2026-0101",
    title: "Water leaking from master bathroom ceiling",
    description: "Continuous water seepage and dripping from bathroom ceiling, likely from the apartment above.",
    category: "PLUMBING",
    subCategory: "Water Leakage",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assignedTo: "Raju Sharma (Chief Plumber)",
    assignedPhone: "+91-98801-44332",
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    slaHours: 8,
    slaDeadline: new Date(Date.now() + 4 * 3600000).toISOString(),
    locationArea: "My Flat",
    location: "Tower A, Flat 1204, Master Bath",
    escalationLevel: 1,
    timeline: [
      { id: "tl-1", action: "CREATED", note: "Incident logged by resident via app", author: "Resident", timestamp: "09:00 AM" },
      { id: "tl-2", action: "ASSIGNED", note: "Assigned to on-duty plumbing team", author: "Helpdesk AI", timestamp: "09:05 AM" },
      { id: "tl-3", action: "IN_PROGRESS", note: "Technician inspecting overhead shaft", author: "Raju Sharma", timestamp: "10:15 AM" },
    ],
  },
  {
    id: "tk-002",
    ticketNumber: "TKT-2026-0098",
    title: "Lift B-2 making loud grinding noise",
    description: "Elevator B-2 is vibrating heavily between floors 4 and 8. Urgent check needed before someone gets stuck.",
    category: "LIFT",
    subCategory: "Strange Noise",
    status: "OPEN",
    priority: "URGENT",
    assignedTo: "Otis Elevator AMC Response",
    assignedPhone: "+91-98450-88123",
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    slaHours: 2,
    slaDeadline: new Date(Date.now() - 1 * 3600000).toISOString(),
    locationArea: "Corridor / Staircase",
    location: "Tower B, Passenger Lift 2",
    escalationLevel: 2,
    escalationNote: "SLA breached — auto-escalated to Facilities Manager",
    timeline: [
      { id: "tl-4", action: "CREATED", note: "Emergency elevator noise complaint", author: "Resident", timestamp: "11:30 AM" },
      { id: "tl-5", action: "ASSIGNED", note: "Auto-dispatched to Otis emergency support", author: "Helpdesk AI", timestamp: "11:32 AM" },
      { id: "tl-6", action: "ESCALATED", note: "SLA of 2h breached — escalated to L2: Facilities Manager notified", author: "System", timestamp: "01:32 PM" },
    ],
  },
  {
    id: "tk-003",
    ticketNumber: "TKT-2026-0075",
    title: "Balcony power socket sparking",
    description: "Balcony weatherproof 16A socket showed spark when plugging in washing machine. Tripped MCB once.",
    category: "ELECTRICAL",
    status: "RESOLVED",
    priority: "MEDIUM",
    assignedTo: "Suresh Kumar (Electrician)",
    assignedPhone: "+91-97400-55221",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    slaHours: 24,
    slaDeadline: new Date(Date.now() - 10 * 3600000).toISOString(),
    residentRating: 5,
    residentComment: "Replaced the burned terminal block cleanly and restored power in 20 minutes. Excellent service!",
    location: "Tower A, Flat 1204, Utility Balcony",
    timeline: [
      { id: "tl-6", action: "CREATED", note: "Ticket filed", author: "Resident", timestamp: "Yesterday, 10:00 AM" },
      { id: "tl-7", action: "RESOLVED", note: "Socket replaced, grounding checked", author: "Suresh Kumar", timestamp: "Yesterday, 11:30 AM" },
    ],
  },
];

let LOCAL_TICKETS: HelpdeskTicketDto[] = [...FALLBACK_TICKETS];

export const smartHelpdeskService = {
  /** Auto-escalation: mutates LOCAL_TICKETS in place when SLA is breached */
  _applyAutoEscalation(): void {
    const now = Date.now();
    for (const t of LOCAL_TICKETS) {
      if ((t.status !== 'OPEN' && t.status !== 'IN_PROGRESS') || !t.slaDeadline) continue;
      const breachMs = now - new Date(t.slaDeadline).getTime();
      if (breachMs <= 0) continue;
      const breachHours = breachMs / 3600000;
      const newLevel = breachHours > 24 ? 3 : breachHours > 4 ? 2 : 1;
      if ((t.escalationLevel ?? 1) >= newLevel) continue;
      t.escalationLevel = newLevel;
      const escalateTo = newLevel === 3 ? 'MD / Owner notified (L3 Critical)' : 'Facilities Manager notified (L2)';
      t.escalationNote = `SLA breached by ${Math.floor(breachHours)}h — ${escalateTo}`;
      t.timeline = [
        ...(t.timeline ?? []),
        {
          id: `esc-${Date.now()}`,
          action: 'ESCALATED',
          note: `Auto-escalated to L${newLevel}: ${escalateTo}`,
          author: 'System',
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ];
    }
  },

  /** 1. Get list of tickets (with optional status filter) */
  async getTickets(status?: string): Promise<HelpdeskTicketDto[]> {
    this._applyAutoEscalation();
    try {
      const res = await api.get<HelpdeskTicketDto[]>('/helpdesk/tickets', {
        params: status && status !== 'ALL' ? { status } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.content || [];
      if (list.length > 0) return list;
    } catch {
      // Fallback to local tickets
    }
    if (status && status !== 'ALL') {
      return LOCAL_TICKETS.filter(t => t.status === status);
    }
    return LOCAL_TICKETS;
  },

  /** 2. Create new service ticket */
  async createTicket(payload: {
    category: string;
    subCategory?: string;
    title: string;
    description: string;
    priority?: string;
    locationArea?: string;
    mediaUrls?: string[];
  }): Promise<HelpdeskTicketDto> {
    try {
      const res = await api.post<HelpdeskTicketDto>('/helpdesk/tickets', payload);
      const ticket = res.data;
      LOCAL_TICKETS.unshift(ticket);
      return ticket;
    } catch {
      const newTicket: HelpdeskTicketDto = {
        id: `tk-${Date.now()}`,
        ticketNumber: `TKT-${new Date().getFullYear()}-${String(LOCAL_TICKETS.length + 101).padStart(4, '0')}`,
        category: payload.category as HelpdeskTicketDto['category'],
        subCategory: payload.subCategory,
        title: payload.title,
        description: payload.description,
        status: 'OPEN',
        priority: (payload.priority as HelpdeskTicketDto['priority']) || 'MEDIUM',
        locationArea: payload.locationArea || 'My Flat',
        mediaUrls: payload.mediaUrls,
        createdAt: new Date().toISOString(),
        slaHours: payload.priority === 'URGENT' ? 2 : payload.priority === 'HIGH' ? 8 : payload.priority === 'MEDIUM' ? 24 : 72,
        slaDeadline: new Date(Date.now() + (payload.priority === 'URGENT' ? 2 : payload.priority === 'HIGH' ? 8 : 24) * 3600000).toISOString(),
        timeline: [
          { id: `tl-${Date.now()}`, action: 'CREATED', note: 'Request logged via Mana Community App', author: 'Resident', timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
        ],
      };
      LOCAL_TICKETS.unshift(newTicket);
      return newTicket;
    }
  },

  /** 3. Get single ticket details */
  async getTicket(id: string): Promise<HelpdeskTicketDto> {
    const res = await api.get<HelpdeskTicketDto>(`/helpdesk/tickets/${id}`);
    return res.data;
  },

  /** 4. Update ticket status */
  async updateTicketStatus(id: string, status: string, notes?: string): Promise<HelpdeskTicketDto> {
    const res = await api.put<HelpdeskTicketDto>(`/helpdesk/tickets/${id}/status`, { status, notes });
    return res.data;
  },

  /** 5. Submit resident rating and feedback */
  async submitFeedback(ticketId: string, rating: number, comments?: string): Promise<boolean> {
    try {
      await api.post(`/helpdesk/tickets/${ticketId}/feedback`, { rating, comments });
    } catch {
      // Local fallback
    }
    const found = LOCAL_TICKETS.find(t => t.id === ticketId);
    if (found) {
      found.residentRating = rating;
      found.residentComment = comments;
    }
    return true;
  },

  /** 6. Add contextual discussion comment */
  async addComment(ticketId: string, message: string): Promise<TicketCommentDto> {
    const res = await api.post<TicketCommentDto>(`/helpdesk/tickets/${ticketId}/comments`, { message });
    return res.data;
  },

  /** 7. Get ticket comments */
  async getComments(ticketId: string): Promise<TicketCommentDto[]> {
    const res = await api.get<TicketCommentDto[]>(`/helpdesk/tickets/${ticketId}/comments`);
    return res.data;
  },

  /** 8. Get SLA Policies */
  async getSlaPolicies(): Promise<SlaPolicyDto[]> {
    const res = await api.get<SlaPolicyDto[]>('/helpdesk/sla-policies');
    return res.data;
  },

  /** 9. Get Work Orders */
  async getWorkOrders(): Promise<WorkOrderDto[]> {
    const res = await api.get<WorkOrderDto[]>('/helpdesk/work-orders');
    return res.data;
  },

  /** 10. Get Helpdesk Dashboard Analytics */
  async getDashboardSummary(): Promise<any> {
    const res = await api.get<any>('/helpdesk/dashboard/resident');
    return res.data;
  },

  /** 11. Reopen a resolved or closed ticket */
  async reopenTicket(ticketId: string, reason?: string): Promise<HelpdeskTicketDto> {
    try {
      const res = await api.put<HelpdeskTicketDto>(`/helpdesk/tickets/${ticketId}/reopen`, { reason });
      const found = LOCAL_TICKETS.find(t => t.id === ticketId);
      if (found) { found.status = 'OPEN'; }
      return res.data;
    } catch {
      const found = LOCAL_TICKETS.find(t => t.id === ticketId);
      if (found) {
        found.status = 'OPEN';
        found.timeline = [
          ...(found.timeline || []),
          { id: `tl-${Date.now()}`, action: 'REOPENED', note: reason || 'Ticket reopened by resident — issue not fully resolved.', author: 'Resident', timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) },
        ];
        return { ...found };
      }
      throw new Error('Ticket not found');
    }
  },
};
