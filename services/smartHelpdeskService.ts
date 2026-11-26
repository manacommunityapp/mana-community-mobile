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

export const smartHelpdeskService = {
  /** 1. Get list of tickets (with optional status filter) */
  async getTickets(status?: string): Promise<HelpdeskTicketDto[]> {
    const res = await api.get<HelpdeskTicketDto[]>('/v1/helpdesk/tickets', {
      params: status && status !== 'ALL' ? { status } : undefined,
    });
    const list = Array.isArray(res.data) ? res.data : (res.data as any)?.content || [];
    return list;
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
      return res.data;
    } catch (error) {
      throw error;
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
    const { data } = await api.post<{ success: boolean }>(`/v1/helpdesk/tickets/${ticketId}/feedback`, { rating, comments });
    return data.success;
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
    const res = await api.patch<HelpdeskTicketDto>(`/v1/helpdesk/tickets/${ticketId}/status`, null, { params: { status: 'OPEN', remarks: reason } });
    return res.data;
  },
};
