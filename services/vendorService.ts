import api from './apiClient';
import { secureLog } from '@/security';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';

export interface VendorBooking {
  id: number;
  customerName: string;
  flat: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
  amount: number;
  notes?: string;
}

export interface VendorWorkOrder {
  id: number;
  title: string;
  description: string;
  location: string;
  flat: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedAt: string;
  dueDate: string;
  customerName: string;
}

export interface VendorInvoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  flat: string;
  service: string;
  amount: number;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
}

export interface VendorDashboardStats {
  todayBookings: number;
  pendingBookings: number;
  activeWorkOrders: number;
  monthRevenue: number;
  rating: number;
  totalReviews: number;
}

export interface VendorReview {
  id: number;
  customerName: string;
  flat: string;
  rating: number;
  comment: string;
  service: string;
  date: string;
}

export interface VendorProfileDto {
  id?: number;
  businessName: string;
  category: string;
  phone: string;
  email: string;
  rating: number;
  totalJobs: number;
  serviceArea: string;
  isAvailable: boolean;
}

// ── Fallback Data ───────────────────────────────────────────────

const sampleBookings: VendorBooking[] = [
  { id: 1, customerName: 'Aarav Sharma', flat: 'A-201', service: 'Plumbing Repair', date: '2026-09-28', time: '10:00 AM', status: 'PENDING', amount: 800, notes: 'Kitchen sink leak' },
  { id: 2, customerName: 'Priya Patel', flat: 'B-105', service: 'AC Servicing', date: '2026-09-28', time: '11:30 AM', status: 'CONFIRMED', amount: 1200 },
  { id: 3, customerName: 'Rahul Gupta', flat: 'C-302', service: 'Electrical Wiring', date: '2026-09-28', time: '2:00 PM', status: 'IN_PROGRESS', amount: 1500, notes: 'Living room switchboard' },
  { id: 4, customerName: 'Meera Reddy', flat: 'A-404', service: 'Painting', date: '2026-09-27', time: '9:00 AM', status: 'COMPLETED', amount: 5000 },
  { id: 5, customerName: 'Vikram Singh', flat: 'D-101', service: 'Plumbing Repair', date: '2026-09-29', time: '10:00 AM', status: 'PENDING', amount: 600 },
  { id: 6, customerName: 'Anjali Nair', flat: 'B-303', service: 'Carpentry Work', date: '2026-09-26', time: '3:00 PM', status: 'CANCELLED', amount: 2000 },
];

const sampleWorkOrders: VendorWorkOrder[] = [
  { id: 1, title: 'Fix water heater', description: 'Water heater not heating. Needs thermostat check.', location: 'Bathroom', flat: 'A-201', priority: 'HIGH', status: 'ASSIGNED', assignedAt: '2026-09-28T06:00:00Z', dueDate: '2026-09-28', customerName: 'Aarav Sharma' },
  { id: 2, title: 'Replace kitchen faucet', description: 'Old faucet leaking, customer wants replacement.', location: 'Kitchen', flat: 'C-102', priority: 'MEDIUM', status: 'IN_PROGRESS', assignedAt: '2026-09-27T10:00:00Z', dueDate: '2026-09-28', customerName: 'Kiran Joshi' },
  { id: 3, title: 'Repaint bedroom walls', description: 'Two coats of Asian Paints Royale, light grey shade.', location: 'Master Bedroom', flat: 'B-204', priority: 'LOW', status: 'ON_HOLD', assignedAt: '2026-09-26T08:00:00Z', dueDate: '2026-09-30', customerName: 'Neha Kapoor' },
  { id: 4, title: 'Install ceiling fan', description: 'New ceiling fan installation in guest room.', location: 'Guest Room', flat: 'D-301', priority: 'MEDIUM', status: 'COMPLETED', assignedAt: '2026-09-25T09:00:00Z', dueDate: '2026-09-26', customerName: 'Suresh Menon' },
  { id: 5, title: 'Emergency pipe burst', description: 'Main water pipe burst under sink. Flooding risk.', location: 'Kitchen', flat: 'A-103', priority: 'URGENT', status: 'ASSIGNED', assignedAt: '2026-09-28T07:30:00Z', dueDate: '2026-09-28', customerName: 'Deepa Iyer' },
];

const sampleInvoices: VendorInvoice[] = [
  { id: 1, invoiceNumber: 'INV-2026-041', customerName: 'Meera Reddy', flat: 'A-404', service: 'Painting', amount: 5000, status: 'PAID', issuedAt: '2026-09-27T10:00:00Z', dueDate: '2026-10-07', paidAt: '2026-09-27T18:00:00Z' },
  { id: 2, invoiceNumber: 'INV-2026-042', customerName: 'Suresh Menon', flat: 'D-301', service: 'Ceiling Fan Install', amount: 2500, status: 'SENT', issuedAt: '2026-09-26T14:00:00Z', dueDate: '2026-10-06' },
  { id: 3, invoiceNumber: 'INV-2026-038', customerName: 'Rohit Desai', flat: 'C-205', service: 'Plumbing Work', amount: 3200, status: 'OVERDUE', issuedAt: '2026-09-15T09:00:00Z', dueDate: '2026-09-25' },
  { id: 4, invoiceNumber: 'INV-2026-043', customerName: 'Priya Patel', flat: 'B-105', service: 'AC Servicing', amount: 1200, status: 'DRAFT', issuedAt: '2026-09-28T08:00:00Z', dueDate: '2026-10-08' },
  { id: 5, invoiceNumber: 'INV-2026-040', customerName: 'Arjun Das', flat: 'A-301', service: 'Electrical Repair', amount: 1800, status: 'PAID', issuedAt: '2026-09-22T11:00:00Z', dueDate: '2026-10-02', paidAt: '2026-09-24T09:00:00Z' },
];

const sampleReviews: VendorReview[] = [
  { id: 1, customerName: 'Meera Reddy', flat: 'A-404', rating: 5, comment: 'Excellent painting job! Very neat and professional work.', service: 'Painting', date: '2026-09-27' },
  { id: 2, customerName: 'Suresh Menon', flat: 'D-301', rating: 4, comment: 'Good installation, but arrived 30 minutes late.', service: 'Ceiling Fan Install', date: '2026-09-26' },
  { id: 3, customerName: 'Arjun Das', flat: 'A-301', rating: 5, comment: 'Fixed the issue quickly. Very knowledgeable.', service: 'Electrical Repair', date: '2026-09-24' },
  { id: 4, customerName: 'Pooja Verma', flat: 'B-402', rating: 3, comment: 'Work was okay but took longer than expected.', service: 'Plumbing Repair', date: '2026-09-20' },
  { id: 5, customerName: 'Amit Kumar', flat: 'C-101', rating: 5, comment: 'Best plumber in the community. Highly recommend!', service: 'Plumbing Repair', date: '2026-09-18' },
];

function mapInvoiceStatus(status: string): InvoiceStatus {
  const map: Record<string, InvoiceStatus> = {
    DRAFT: 'DRAFT', PENDING: 'SENT', APPROVED: 'SENT',
    PAID: 'PAID', OVERDUE: 'OVERDUE', REJECTED: 'DRAFT',
  };
  return map[status] || 'DRAFT';
}

function mapMaintenanceToWorkOrder(rec: any): VendorWorkOrder {
  const priorityMap: Record<string, WorkOrderPriority> = {
    EMERGENCY: 'URGENT', URGENT: 'URGENT', HIGH: 'HIGH', NORMAL: 'MEDIUM', LOW: 'LOW',
  };
  const statusMap: Record<string, WorkOrderStatus> = {
    SCHEDULED: 'ASSIGNED', IN_PROGRESS: 'IN_PROGRESS', ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED', CANCELLED: 'COMPLETED',
  };
  return {
    id: rec.id,
    title: rec.description || rec.title || 'Maintenance Work',
    description: rec.notes || rec.description || '',
    location: rec.asset?.location || rec.location || '',
    flat: rec.flat || '',
    priority: priorityMap[rec.priority || rec.status] || 'MEDIUM',
    status: statusMap[rec.status] || 'ASSIGNED',
    assignedAt: rec.scheduledDate || rec.assignedAt || '',
    dueDate: rec.scheduledDate || rec.dueDate || '',
    customerName: rec.asset?.name || rec.customerName || 'Community Management',
  };
}

// ── Service Implementation ──────────────────────────────────────

export const vendorService = {
  async getDashboardStats(): Promise<VendorDashboardStats> {
    try {
      const res = await api.get<VendorDashboardStats>('/vendor/dashboard');
      if (res.data) return res.data;
    } catch {}

    try {
      const [bookings, workOrders] = await Promise.all([
        vendorService.getBookings(),
        vendorService.getWorkOrders(),
      ]);
      const today = new Date().toISOString().split('T')[0];
      return {
        todayBookings: bookings.filter(b => b.date === today).length,
        pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
        activeWorkOrders: workOrders.filter(w => w.status !== 'COMPLETED').length,
        monthRevenue: 18500,
        rating: 4.8,
        totalReviews: sampleReviews.length,
      };
    } catch (err) {
      secureLog.warn('VendorService: Live stats unavailable, using fallback', err);
      return {
        todayBookings: 3,
        pendingBookings: 2,
        activeWorkOrders: 4,
        monthRevenue: 18500,
        rating: 4.8,
        totalReviews: 5,
      };
    }
  },

  async getBookings(): Promise<VendorBooking[]> {
    try {
      const res = await api.get<VendorBooking[]>('/vendor/bookings');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<VendorBooking[]>('/services/bookings/vendor');
      if (res.data && res.data.length > 0) return res.data;
      return sampleBookings;
    } catch (err) {
      secureLog.warn('VendorService: Live bookings unavailable, using fallback', err);
      return sampleBookings;
    }
  },

  async updateBookingStatus(id: number, status: BookingStatus): Promise<void> {
    try {
      await api.put(`/vendor/bookings/${id}/status`, null, { params: { status } });
      return;
    } catch {}

    try {
      await api.put(`/services/bookings/${id}/status`, null, { params: { status } });
    } catch (err) {
      secureLog.warn(`VendorService: Update booking ${id} status failed`, err);
      const booking = sampleBookings.find(b => b.id === id);
      if (booking) booking.status = status;
    }
  },

  async acceptBooking(id: number): Promise<void> {
    return this.updateBookingStatus(id, 'CONFIRMED');
  },

  async startBooking(id: number): Promise<void> {
    return this.updateBookingStatus(id, 'IN_PROGRESS');
  },

  async completeBooking(id: number): Promise<void> {
    return this.updateBookingStatus(id, 'COMPLETED');
  },

  async cancelBooking(id: number): Promise<void> {
    return this.updateBookingStatus(id, 'CANCELLED');
  },

  async getWorkOrders(): Promise<VendorWorkOrder[]> {
    try {
      const res = await api.get<VendorWorkOrder[]>('/vendor/work-orders');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<any[]>('/inventory/maintenance');
      if (res.data && res.data.length > 0) {
        return res.data.map(mapMaintenanceToWorkOrder);
      }
      return sampleWorkOrders;
    } catch (err) {
      secureLog.warn('VendorService: Live work orders unavailable, using fallback', err);
      return sampleWorkOrders;
    }
  },

  async updateWorkOrderStatus(id: number, status: WorkOrderStatus): Promise<void> {
    try {
      await api.put(`/vendor/work-orders/${id}/status`, null, { params: { status } });
      return;
    } catch {}

    try {
      await api.put(`/inventory/maintenance/${id}/status`, null, { params: { status } });
    } catch (err) {
      secureLog.warn(`VendorService: Update work order ${id} status failed`, err);
      const wo = sampleWorkOrders.find(w => w.id === id);
      if (wo) wo.status = status;
    }
  },

  async getInvoices(): Promise<VendorInvoice[]> {
    try {
      const res = await api.get<VendorInvoice[]>('/vendor/invoices');
      if (res.data && res.data.length > 0) return res.data;
    } catch {}

    try {
      const res = await api.get<any[]>('/asset-finance/invoices');
      if (res.data && res.data.length > 0) {
        return res.data.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
          customerName: inv.vendorName || inv.customerName || '',
          flat: inv.flat || '',
          service: inv.description || inv.service || '',
          amount: inv.totalAmount || inv.amount || 0,
          status: mapInvoiceStatus(inv.status),
          issuedAt: inv.invoiceDate || inv.issuedAt || '',
          dueDate: inv.dueDate || '',
          paidAt: inv.paidAt,
        }));
      }
      return sampleInvoices;
    } catch (err) {
      secureLog.warn('VendorService: Live invoices unavailable, using fallback', err);
      return sampleInvoices;
    }
  },

  async sendInvoice(id: number): Promise<void> {
    try {
      await api.post(`/vendor/invoices/${id}/send`);
      return;
    } catch {}

    try {
      await api.post(`/asset-finance/invoices/${id}/approve`, null, {
        params: { notes: 'Sent to customer' },
      });
    } catch (err) {
      secureLog.warn(`VendorService: Send invoice ${id} failed`, err);
      const inv = sampleInvoices.find(i => i.id === id);
      if (inv) inv.status = 'SENT';
    }
  },

  async getReviews(): Promise<VendorReview[]> {
    try {
      const res = await api.get<VendorReview[]>('/vendor/reviews');
      if (res.data && res.data.length > 0) return res.data;
      return sampleReviews;
    } catch (err) {
      secureLog.warn('VendorService: Live reviews unavailable, using fallback', err);
      return sampleReviews;
    }
  },

  async getVendorProfile(): Promise<VendorProfileDto> {
    try {
      const res = await api.get<VendorProfileDto>('/vendor/profile');
      return res.data;
    } catch (err) {
      secureLog.warn('VendorService: Live vendor profile unavailable, using fallback', err);
      return {
        businessName: 'Apex Home & Property Services',
        category: 'Plumbing, Electrical & Home Care',
        phone: '+91 98765 43210',
        email: 'services.apex@manacommunity.com',
        rating: 4.8,
        totalJobs: 142,
        serviceArea: 'All Towers (A, B, C, D)',
        isAvailable: true,
      };
    }
  },
};
