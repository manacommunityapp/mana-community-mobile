import api from './apiClient';
import type {
  AcademyProgram, AcademyCategory, AcademyInstructor, UserEnrollment, DigitalCertificate,
  ClassAttendee, InstructorEarnings, HostWorkshopRequest, InstructorApplication,
  ProgramApprovalItem, AcademyAdminStats,
} from '@/types/academy';

export const academyService = {
  // ── Catalog & Programs ─────────────────────────────────────────────
  async getCategories(): Promise<AcademyCategory[]> {
    const res = await api.get<AcademyCategory[]>('/academy/categories');
    return Array.isArray(res.data) ? res.data : [];
  },

  async getPrograms(category?: string, query?: string): Promise<AcademyProgram[]> {
    try {
      const res = await api.get<AcademyProgram[]>('/academy/programs', {
        params: { category: category === 'ALL' ? undefined : category, q: query },
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getProgramById(id: string): Promise<AcademyProgram> {
    const res = await api.get<AcademyProgram>(`/academy/programs/${id}`);
    return res.data;
  },

  async enrollProgram(programId: string): Promise<UserEnrollment> {
    const res = await api.post<UserEnrollment>(`/academy/programs/${programId}/enroll`);
    return res.data;
  },

  // ── My Learning, Attendance & Certificates ──────────────────────────
  async getMyEnrollments(): Promise<UserEnrollment[]> {
    try {
      const res = await api.get<UserEnrollment[]>('/academy/my-enrollments');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getCertificates(): Promise<DigitalCertificate[]> {
    try {
      const res = await api.get<DigitalCertificate[]>('/academy/certificates');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getCertificateById(certId: string): Promise<DigitalCertificate> {
    const res = await api.get<DigitalCertificate>(`/academy/certificates/${certId}`);
    return res.data;
  },

  async checkInStudentSession(enrollmentId: string, token: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/academy/attendance/check-in', { enrollmentId, token });
    return res.data;
  },

  // ── Instructors Directory & Profile ────────────────────────────────
  async getInstructors(): Promise<AcademyInstructor[]> {
    try {
      const res = await api.get<AcademyInstructor[]>('/academy/instructors');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  // ── Instructor Hub (/academy/teaching) ──────────────────────────────
  async getInstructorHubData(): Promise<{
    stats: InstructorEarnings;
    hostedPrograms: AcademyProgram[];
    attendees: ClassAttendee[];
  }> {
    const res = await api.get('/academy/teaching/dashboard');
    return res.data;
  },

  async hostWorkshop(req: HostWorkshopRequest): Promise<AcademyProgram> {
    try {
      const res = await api.post<AcademyProgram>('/academy/teaching/workshops', req);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to host workshop. Please try again.');
    }
  },

  async toggleAttendeeAttendance(attendeeId: string): Promise<ClassAttendee> {
    const res = await api.post<ClassAttendee>(`/academy/teaching/attendees/${attendeeId}/toggle-attendance`);
    return res.data;
  },

  async applyAsInstructor(data: Omit<InstructorApplication, 'id' | 'status' | 'appliedDate'>): Promise<InstructorApplication> {
    const res = await api.post<InstructorApplication>('/academy/instructors/apply', data);
    return res.data;
  },

  // ── Academy Admin (/academy/admin) ──────────────────────────────────
  async getAdminStats(): Promise<AcademyAdminStats> {
    const res = await api.get<AcademyAdminStats>('/academy/admin/stats');
    return res.data;
  },

  async getPendingInstructorApplications(): Promise<InstructorApplication[]> {
    const res = await api.get<InstructorApplication[]>('/academy/admin/instructors/pending');
    return res.data;
  },

  async approveInstructorApplication(id: string, approved: boolean): Promise<void> {
    await api.post(`/academy/admin/instructors/${id}/${approved ? 'approve' : 'reject'}`);
  },

  async getPendingProgramApprovals(): Promise<ProgramApprovalItem[]> {
    const res = await api.get<ProgramApprovalItem[]>('/academy/admin/programs/pending');
    return res.data;
  },

  async approveProgramSubmission(id: string, approved: boolean): Promise<void> {
    await api.post(`/academy/admin/programs/${id}/${approved ? 'approve' : 'reject'}`);
  },
};

