import api from './apiClient';

export interface HelpdeskTicketDto {
  id: string;
  ticketNumber: string;
  category: 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'SECURITY' | 'LIFT' | 'OTHER';
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  createdAt: string;
  mediaUrls?: string[];
  slaHours?: number;
  slaDeadline?: string;
  residentRating?: number;
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
    const res = await api.get<HelpdeskTicketDto[]>('/helpdesk/tickets', {
      params: status && status !== 'ALL' ? { status } : undefined,
    });
    return Array.isArray(res.data) ? res.data : (res.data as any)?.content || [];
  },

  /** 2. Create new service ticket */
  async createTicket(payload: {
    category: string;
    title: string;
    description: string;
    priority?: string;
    mediaUrls?: string[];
  }): Promise<HelpdeskTicketDto> {
    const res = await api.post<HelpdeskTicketDto>('/helpdesk/tickets', payload);
    return res.data;
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
    await api.post(`/helpdesk/tickets/${ticketId}/feedback`, { rating, comments });
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
};
