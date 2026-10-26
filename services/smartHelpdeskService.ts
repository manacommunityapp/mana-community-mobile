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

const FALLBACK_TICKETS: HelpdeskTicketDto[] = [];

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
      const res = await api.get<HelpdeskTicketDto[]>('/v1/helpdesk/tickets', {
        params: status && status !== 'ALL' ? { status } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.content || [];
      return list;
    } catch {
      // API unavailable or error
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
      const res = await api.post<HelpdeskTicketDto>('/v1/helpdesk/tickets', payload);
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
    const res = await api.get<HelpdeskTicketDto>(`/v1/helpdesk/tickets/${id}`);
    return res.data;
  },

  /** 4. Update ticket status */
  async updateTicketStatus(id: string, status: string, notes?: string): Promise<HelpdeskTicketDto> {
    const res = await api.patch<HelpdeskTicketDto>(`/v1/helpdesk/tickets/${id}/status`, null, { params: { status, remarks: notes } });
    return res.data;
  },

  /** 5. Submit resident rating and feedback */
  async submitFeedback(ticketId: string, rating: number, comments?: string): Promise<boolean> {
    try {
      await api.post(`/v1/helpdesk/tickets/${ticketId}/feedback`, { rating, comments });
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
    const res = await api.post<TicketCommentDto>(`/v1/helpdesk/tickets/${ticketId}/comments`, null, { params: { message } });
    return res.data;
  },

  /** 7. Get ticket comments */
  async getComments(ticketId: string): Promise<TicketCommentDto[]> {
    const res = await api.get<TicketCommentDto[]>(`/v1/helpdesk/tickets/${ticketId}/comments`);
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

  /** 11. Reopen a resolved or closed ticket via status update */
  async reopenTicket(ticketId: string, reason?: string): Promise<HelpdeskTicketDto> {
    try {
      const res = await api.patch<HelpdeskTicketDto>(`/v1/helpdesk/tickets/${ticketId}/status`, null, { params: { status: 'OPEN', remarks: reason } });
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
