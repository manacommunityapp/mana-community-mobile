import api from './apiClient';
import type { DomesticStaffDto, StaffAttendanceDto } from './homeServicesService';

/**
 * Live-only data for the Home screen's gate widgets.
 *
 * `homeServicesService.getDomesticStaff()` / `getStaffAttendance()` fall back to
 * bundled sample staff when the API is empty or unreachable, which is fine for a
 * demo-able management screen but wrong for a resident's "My Daily Help" strip:
 * it would show people who do not work for them. These helpers never fabricate
 * data - an empty or failed response is simply an empty list.
 */
async function firstArray<T>(paths: string[], params?: Record<string, string>): Promise<T[]> {
  for (const path of paths) {
    try {
      const res = await api.get<T[]>(path, { params: params ?? {} });
      if (Array.isArray(res.data)) return res.data;
    } catch {
      // try the next known path
    }
  }
  return [];
}

export const residentGateService = {
  getMyDailyHelp(): Promise<DomesticStaffDto[]> {
    return firstArray<DomesticStaffDto>(['/v1/home-services/domestic-staff', '/home-services/staff']);
  },

  getTodayStaffAttendance(): Promise<StaffAttendanceDto[]> {
    const today = new Date().toISOString().slice(0, 10);
    return firstArray<StaffAttendanceDto>(
      ['/v1/home-services/attendance', '/home-services/staff/attendance'],
      { date: today },
    );
  },
};
