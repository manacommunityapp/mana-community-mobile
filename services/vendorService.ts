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

// TODO: Replace sample data with actual API calls
export const vendorService = {
  async getDashboardStats(): Promise<VendorDashboardStats> {
    return {
      todayBookings: sampleBookings.filter(b => b.date === '2026-09-28').length,
      pendingBookings: sampleBookings.filter(b => b.status === 'PENDING').length,
      activeWorkOrders: sampleWorkOrders.filter(w => w.status !== 'COMPLETED').length,
      monthRevenue: 18500,
      rating: 4.6,
      totalReviews: sampleReviews.length,
    };
  },

  async getBookings(): Promise<VendorBooking[]> {
    return sampleBookings;
  },

  async acceptBooking(id: number): Promise<void> {
    const booking = sampleBookings.find(b => b.id === id);
    if (booking) booking.status = 'CONFIRMED';
  },

  async startBooking(id: number): Promise<void> {
    const booking = sampleBookings.find(b => b.id === id);
    if (booking) booking.status = 'IN_PROGRESS';
  },

  async completeBooking(id: number): Promise<void> {
    const booking = sampleBookings.find(b => b.id === id);
    if (booking) booking.status = 'COMPLETED';
  },

  async cancelBooking(id: number): Promise<void> {
    const booking = sampleBookings.find(b => b.id === id);
    if (booking) booking.status = 'CANCELLED';
  },

  async getWorkOrders(): Promise<VendorWorkOrder[]> {
    return sampleWorkOrders;
  },

  async updateWorkOrderStatus(id: number, status: WorkOrderStatus): Promise<void> {
    const wo = sampleWorkOrders.find(w => w.id === id);
    if (wo) wo.status = status;
  },

  async getInvoices(): Promise<VendorInvoice[]> {
    return sampleInvoices;
  },

  async sendInvoice(id: number): Promise<void> {
    const inv = sampleInvoices.find(i => i.id === id);
    if (inv) inv.status = 'SENT';
  },

  async getReviews(): Promise<VendorReview[]> {
    return sampleReviews;
  },
};
