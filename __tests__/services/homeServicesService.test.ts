import { homeServicesService } from '@/services/homeServicesService';

jest.mock('@/services/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockRejectedValue(new Error('Network error')),
    post: jest.fn().mockRejectedValue(new Error('Network error')),
    put: jest.fn().mockRejectedValue(new Error('Network error')),
  },
}));

jest.mock('@/security', () => ({
  secureLog: { warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

describe('homeServicesService', () => {
  describe('getWorkers', () => {
    it('returns fallback workers when API is unavailable', async () => {
      const workers = await homeServicesService.getWorkers();
      expect(workers).toBeDefined();
      expect(Array.isArray(workers)).toBe(true);
      expect(workers.length).toBeGreaterThan(0);
      expect(workers[0]).toHaveProperty('id');
      expect(workers[0]).toHaveProperty('name');
      expect(workers[0]).toHaveProperty('phone');
    });

    it('filters workers by category', async () => {
      const plumbers = await homeServicesService.getWorkers('PLUMBING');
      expect(plumbers.length).toBeGreaterThan(0);
      plumbers.forEach((w) => {
        expect(w.category).toBe('PLUMBING');
      });
    });

    it('returns all workers for ALL category', async () => {
      const all = await homeServicesService.getWorkers('ALL');
      const unfiltered = await homeServicesService.getWorkers();
      expect(all.length).toBe(unfiltered.length);
    });
  });

  describe('getDomesticStaff', () => {
    it('returns fallback staff when API is unavailable', async () => {
      const staff = await homeServicesService.getDomesticStaff();
      expect(staff).toBeDefined();
      expect(Array.isArray(staff)).toBe(true);
      expect(staff.length).toBeGreaterThan(0);
    });

    it('each staff has required fields', async () => {
      const staff = await homeServicesService.getDomesticStaff();
      staff.forEach((s) => {
        expect(s).toHaveProperty('id');
        expect(s).toHaveProperty('name');
        expect(s).toHaveProperty('role');
        expect(s).toHaveProperty('phone');
        expect(s).toHaveProperty('monthlySalary');
        expect(typeof s.monthlySalary).toBe('number');
      });
    });

    it('filters by role', async () => {
      const maids = await homeServicesService.getDomesticStaff('MAID');
      expect(maids.length).toBeGreaterThan(0);
      maids.forEach((s) => {
        expect(s.role).toBe('MAID');
      });
    });
  });

  describe('getStaffAttendance', () => {
    it('returns fallback attendance records', async () => {
      const att = await homeServicesService.getStaffAttendance();
      expect(Array.isArray(att)).toBe(true);
      expect(att.length).toBeGreaterThan(0);
      att.forEach((a) => {
        expect(a).toHaveProperty('staffName');
        expect(a).toHaveProperty('status');
        expect(a).toHaveProperty('role');
      });
    });
  });

  describe('getAttendanceSummary', () => {
    it('returns attendance summary with correct fields', async () => {
      const summary = await homeServicesService.getAttendanceSummary();
      expect(summary).toHaveProperty('totalStaff');
      expect(summary).toHaveProperty('checkedIn');
      expect(summary).toHaveProperty('checkedOut');
      expect(summary).toHaveProperty('onLeave');
      expect(summary).toHaveProperty('absent');
      expect(typeof summary.totalStaff).toBe('number');
    });
  });

  describe('getServicePackages', () => {
    it('returns packages with payment info', async () => {
      const pkgs = await homeServicesService.getServicePackages();
      expect(Array.isArray(pkgs)).toBe(true);
      expect(pkgs.length).toBeGreaterThan(0);
      pkgs.forEach((p) => {
        expect(p).toHaveProperty('staffName');
        expect(p).toHaveProperty('monthlySalary');
        expect(p).toHaveProperty('paymentStatus');
        expect(['PAID', 'DUE', 'OVERDUE']).toContain(p.paymentStatus);
      });
    });
  });

  describe('getJobPosts', () => {
    it('returns job posts', async () => {
      const jobs = await homeServicesService.getJobPosts();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      jobs.forEach((j) => {
        expect(j).toHaveProperty('title');
        expect(j).toHaveProperty('role');
        expect(j).toHaveProperty('status');
      });
    });
  });

  describe('getMyBookings', () => {
    it('returns fallback bookings', async () => {
      const bookings = await homeServicesService.getMyBookings();
      expect(Array.isArray(bookings)).toBe(true);
      expect(bookings.length).toBeGreaterThan(0);
      bookings.forEach((b) => {
        expect(b).toHaveProperty('id');
        expect(b).toHaveProperty('providerName');
        expect(b).toHaveProperty('status');
      });
    });
  });
});
