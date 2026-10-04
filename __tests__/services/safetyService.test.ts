import { safetyService } from '@/services/safetyService';

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

describe('safetyService', () => {
  describe('getActiveAlerts', () => {
    it('returns fallback SOS alerts', async () => {
      const alerts = await safetyService.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getAnprEvents', () => {
    it('returns paginated structure when API unavailable', async () => {
      const result = await safetyService.getAnprEvents();
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result).toHaveProperty('totalElements');
    });
  });

  describe('getIncidents', () => {
    it('returns empty array when API unavailable (no local fallback)', async () => {
      const incidents = await safetyService.getIncidents();
      expect(Array.isArray(incidents)).toBe(true);
      expect(incidents.length).toBe(0);
    });
  });

  describe('getGuardShifts', () => {
    it('returns empty array when API unavailable (no local fallback)', async () => {
      const shifts = await safetyService.getGuardShifts();
      expect(Array.isArray(shifts)).toBe(true);
      expect(shifts.length).toBe(0);
    });
  });
});
