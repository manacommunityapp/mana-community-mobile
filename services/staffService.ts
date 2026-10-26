import api from './apiClient';

export type StaffRole = 'MAID' | 'COOK' | 'DRIVER' | 'NANNY' | 'GARDENER' | 'SECURITY' | 'OTHER';
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type AttendanceAction = 'ENTRY' | 'EXIT';

export interface StaffMember {
  id: number;
  name: string;
  role: StaffRole;
  phone?: string;
  photo?: string;
  aadhaarLast4?: string;
  agencyName?: string;
  flatNumber?: string;
  residentId?: number;
  status: StaffStatus;
  policeVerified: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffAttendanceLog {
  id: number;
  staffId: number;
  staffName: string;
  action: AttendanceAction;
  timestamp: string;
  gate?: string;
  guardName?: string;
  photo?: string;
  notes?: string;
}

export interface StaffAttendanceSummary {
  staffId: number;
  staffName: string;
  role: StaffRole;
  month: number;
  year: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  attendancePercent: number;
  // legacy fields kept for backward compat
  totalDaysPresent?: number;
  totalDaysAbsent?: number;
  lastEntry?: string;
  lastExit?: string;
  monthlyLogs?: { date: string; entry?: string; exit?: string; present: boolean }[];
}

export interface RegisterStaffRequest {
  name: string;
  role: StaffRole;
  phone?: string;
  aadhaarLast4?: string;
  agencyName?: string;
  notes?: string;
}

export const staffService = {
  async getMyStaff(): Promise<StaffMember[]> {
    try {
      const res = await api.get<StaffMember[]>('/staff/my-staff');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getCommunityStaff(params?: { role?: StaffRole; status?: StaffStatus }): Promise<StaffMember[]> {
    try {
      const res = await api.get<StaffMember[]>('/staff', { params });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getStaffById(id: number): Promise<StaffMember | null> {
    try {
      const res = await api.get<StaffMember>(`/staff/${id}`);
      return res.data;
    } catch {
      return null;
    }
  },

  async registerStaff(data: RegisterStaffRequest): Promise<StaffMember> {
    try {
      const res = await api.post<StaffMember>('/staff/register', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to register staff. Please try again.');
    }
  },

  async updateStaff(id: number, data: Partial<RegisterStaffRequest>): Promise<StaffMember> {
    try {
      const res = await api.put<StaffMember>(`/staff/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update staff details.');
    }
  },

  async removeStaff(id: number): Promise<void> {
    try {
      await api.delete(`/staff/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to remove staff member.');
    }
  },

  async getTodayAttendance(): Promise<StaffAttendanceLog[]> {
    try {
      const res = await api.get<StaffAttendanceLog[]>('/staff/attendance/today');
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getStaffAttendanceLogs(staffId: number, params?: { from?: string; to?: string }): Promise<StaffAttendanceLog[]> {
    try {
      const res = await api.get<StaffAttendanceLog[]>(`/staff/${staffId}/attendance`, { params });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async getAttendanceSummary(staffId: number, month?: string): Promise<StaffAttendanceSummary | null> {
    try {
      const res = await api.get<StaffAttendanceSummary>(`/staff/${staffId}/attendance/summary`, {
        params: { month },
      });
      return res.data;
    } catch {
      return null;
    }
  },

  async getMonthlyPayrollSummaries(month: number, year: number): Promise<StaffAttendanceSummary[]> {
    try {
      const res = await api.get<StaffAttendanceSummary[]>('/staff/attendance/monthly-summary', {
        params: { month, year },
      });
      return res.data ?? [];
    } catch {
      return [];
    }
  },

  async markAttendance(staffId: number, action: AttendanceAction): Promise<StaffAttendanceLog> {
    try {
      const res = await api.post<StaffAttendanceLog>(`/staff/${staffId}/attendance`, { action });
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to mark attendance.');
    }
  },
};
