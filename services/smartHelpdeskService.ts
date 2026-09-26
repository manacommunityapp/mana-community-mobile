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
}

export const smartHelpdeskService = {
  async getTickets(status?: string): Promise<HelpdeskTicketDto[]> {
    const res = await api.get<HelpdeskTicketDto[]>('/helpdesk/tickets', {
      params: status ? { status } : undefined,
    });
    return res.data;
  },

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

  async getTicket(id: string): Promise<HelpdeskTicketDto> {
    const res = await api.get<HelpdeskTicketDto>(`/helpdesk/tickets/${id}`);
    return res.data;
  },
};
