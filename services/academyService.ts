import api from './apiClient';
import type {
  AcademyProgram,
  AcademyCategory,
  AcademyInstructor,
  UserEnrollment,
  DigitalCertificate,
  ClassAttendee,
  InstructorEarnings,
  HostWorkshopRequest,
  InstructorApplication,
  ProgramApprovalItem,
  AcademyAdminStats,
} from '@/types/academy';

// ── Mock Fallback Data ────────────────────────────────────────────────
const MOCK_CATEGORIES: AcademyCategory[] = [
  { id: 'cat-1', name: 'All Workshops', code: 'ALL', icon: 'apps', active: true, programCount: 14 },
  { id: 'cat-2', name: '🎵 Music & Instruments', code: 'MUSIC', icon: 'musical-notes', active: true, programCount: 3 },
  { id: 'cat-3', name: '🧘 Yoga & Wellness', code: 'YOGA', icon: 'leaf', active: true, programCount: 4 },
  { id: 'cat-4', name: '💻 Coding & AI', code: 'CODING', icon: 'code-slash', active: true, programCount: 3 },
  { id: 'cat-5', name: '🤖 Robotics & STEM Kids', code: 'STEM', icon: 'hardware-chip', active: true, programCount: 2 },
  { id: 'cat-6', name: '♟️ Chess Masterclass', code: 'CHESS', icon: 'trophy', active: true, programCount: 1 },
  { id: 'cat-7', name: '🎨 Fine Arts & Pottery', code: 'ARTS', icon: 'color-palette', active: true, programCount: 2 },
  { id: 'cat-8', name: '🍳 Gourmet Cooking', code: 'CULINARY', icon: 'restaurant', active: true, programCount: 1 },
];

const MOCK_INSTRUCTORS: AcademyInstructor[] = [];
const MOCK_PROGRAMS: AcademyProgram[] = [];
const MOCK_ENROLLMENTS: UserEnrollment[] = [];
const MOCK_CERTIFICATES: DigitalCertificate[] = [];
const MOCK_STUDENT_ROSTER: ClassAttendee[] = [];

const MOCK_INSTRUCTOR_EARNINGS: InstructorEarnings = {
  totalRevenue: 0,
  activeStudents: 0,
  completedWorkshops: 0,
  averageRating: 0,
  upcomingPayout: 0,
  nextPayoutDate: '',
};

const MOCK_ADMIN_STATS: AcademyAdminStats = {
  totalPrograms: 0,
  activeWorkshops: 0,
  totalEnrollments: 0,
  verifiedInstructors: 0,
  pendingApprovals: 0,
  monthlyGrossValue: 0,
};

const MOCK_PENDING_INSTRUCTORS: InstructorApplication[] = [];
const MOCK_PENDING_PROGRAMS: ProgramApprovalItem[] = [];

let memoryPrograms: AcademyProgram[] = [];
let memoryEnrollments: UserEnrollment[] = [];
let memoryCertificates: DigitalCertificate[] = [];
let memoryAttendees: ClassAttendee[] = [];
let memoryPendingInstructors: InstructorApplication[] = [];
let memoryPendingPrograms: ProgramApprovalItem[] = [];

export const academyService = {
  // ── Catalog & Programs ─────────────────────────────────────────────
  async getCategories(): Promise<AcademyCategory[]> {
    try {
      const res = await api.get<AcademyCategory[]>('/academy/categories');
      return res.data?.length ? res.data : MOCK_CATEGORIES;
    } catch {
      return MOCK_CATEGORIES;
    }
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
    try {
      const res = await api.get<AcademyProgram>(`/academy/programs/${id}`);
      return res.data;
    } catch {
      const found = memoryPrograms.find((p) => p.id === id);
      if (!found) throw new Error('Program not found');
      return found;
    }
  },

  async enrollProgram(programId: string): Promise<UserEnrollment> {
    try {
      const res = await api.post<UserEnrollment>(`/academy/programs/${programId}/enroll`);
      if (res.data) return res.data;
    } catch {
      // Offline simulation
    }
    const prog = memoryPrograms.find((p) => p.id === programId);
    if (!prog) throw new Error('Program not found');

    prog.userEnrolled = true;
    prog.enrolledCount += 1;

    const newEnrollment: UserEnrollment = {
      id: `enr-${Date.now()}`,
      programId: prog.id,
      programTitle: prog.title,
      instructorName: prog.instructorName,
      instructorTower: `${prog.instructorTower || 'Tower A'} - ${prog.instructorFlat || '101'}`,
      categoryName: prog.categoryName,
      startDate: prog.startDate,
      startTime: prog.startTime,
      location: prog.location || 'Clubhouse',
      mode: prog.mode,
      status: 'CONFIRMED',
      qrCheckInToken: `MANA-ACAD-${Math.floor(1000 + Math.random() * 9000)}`,
      attendanceMarked: false,
      attendedSessions: 0,
      totalSessions: prog.totalSessions || 4,
      pricePaid: prog.price,
      attendanceHistory: prog.syllabus?.map((s, idx) => ({
        sessionId: `sess-${idx + 1}`,
        sessionNumber: s.sessionNumber,
        title: s.title,
        date: prog.startDate,
        time: prog.startTime,
        status: idx === 0 ? 'UPCOMING' : 'UPCOMING',
        attended: false,
      })) || [],
    };

    memoryEnrollments = [newEnrollment, ...memoryEnrollments];
    return newEnrollment;
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
    try {
      const res = await api.get<DigitalCertificate>(`/academy/certificates/${certId}`);
      return res.data;
    } catch {
      const found = memoryCertificates.find((c) => c.id === certId || c.certificateNumber === certId);
      if (!found) throw new Error('Certificate not found');
      return found;
    }
  },

  async checkInStudentSession(enrollmentId: string, token: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await api.post(`/academy/attendance/check-in`, { enrollmentId, token });
      return res.data;
    } catch {
      const enr = memoryEnrollments.find((e) => e.id === enrollmentId);
      if (enr) {
        enr.attendanceMarked = true;
        enr.attendedSessions = Math.min(enr.totalSessions, enr.attendedSessions + 1);
        if (enr.attendanceHistory && enr.attendanceHistory.length > 0) {
          const firstUpcoming = enr.attendanceHistory.find((s) => s.status === 'UPCOMING');
          if (firstUpcoming) {
            firstUpcoming.status = 'COMPLETED';
            firstUpcoming.attended = true;
          }
        }
      }
      return { success: true, message: 'Class check-in recorded successfully!' };
    }
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
    try {
      const res = await api.get('/academy/teaching/dashboard');
      return res.data;
    } catch {
      return {
        stats: MOCK_INSTRUCTOR_EARNINGS,
        hostedPrograms: memoryPrograms.filter((p) => p.instructorId === 'inst-1'),
        attendees: memoryAttendees,
      };
    }
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
    try {
      const res = await api.post<ClassAttendee>(`/academy/teaching/attendees/${attendeeId}/toggle-attendance`);
      return res.data;
    } catch {
      const att = memoryAttendees.find((a) => a.id === attendeeId);
      if (att) {
        att.checkedInToday = !att.checkedInToday;
        att.attendedCount += att.checkedInToday ? 1 : -1;
      }
      return att || memoryAttendees[0];
    }
  },

  async applyAsInstructor(data: Omit<InstructorApplication, 'id' | 'status' | 'appliedDate'>): Promise<InstructorApplication> {
    try {
      const res = await api.post<InstructorApplication>('/academy/instructors/apply', data);
      return res.data;
    } catch {
      const newApp: InstructorApplication = {
        id: `app-${Date.now()}`,
        ...data,
        status: 'PENDING',
        appliedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
      memoryPendingInstructors = [newApp, ...memoryPendingInstructors];
      return newApp;
    }
  },

  // ── Academy Admin (/academy/admin) ──────────────────────────────────
  async getAdminStats(): Promise<AcademyAdminStats> {
    try {
      const res = await api.get<AcademyAdminStats>('/academy/admin/stats');
      return res.data;
    } catch {
      return {
        ...MOCK_ADMIN_STATS,
        pendingInstructorApplications: memoryPendingInstructors.filter((i) => i.status === 'PENDING').length,
        pendingProgramApprovals: memoryPendingPrograms.filter((p) => p.status === 'PENDING_APPROVAL').length,
      };
    }
  },

  async getPendingInstructorApplications(): Promise<InstructorApplication[]> {
    try {
      const res = await api.get<InstructorApplication[]>('/academy/admin/instructors/pending');
      return res.data;
    } catch {
      return memoryPendingInstructors;
    }
  },

  async approveInstructorApplication(id: string, approved: boolean): Promise<void> {
    try {
      await api.post(`/academy/admin/instructors/${id}/${approved ? 'approve' : 'reject'}`);
    } catch {
      const target = memoryPendingInstructors.find((i) => i.id === id);
      if (target) target.status = approved ? 'APPROVED' : 'REJECTED';
    }
  },

  async getPendingProgramApprovals(): Promise<ProgramApprovalItem[]> {
    try {
      const res = await api.get<ProgramApprovalItem[]>('/academy/admin/programs/pending');
      return res.data;
    } catch {
      return memoryPendingPrograms;
    }
  },

  async approveProgramSubmission(id: string, approved: boolean): Promise<void> {
    try {
      await api.post(`/academy/admin/programs/${id}/${approved ? 'approve' : 'reject'}`);
    } catch {
      const target = memoryPendingPrograms.find((p) => p.id === id);
      if (target) target.status = approved ? 'APPROVED' : 'REJECTED';

      const liveTarget = memoryPrograms.find((p) => p.id === id);
      if (liveTarget) liveTarget.status = approved ? 'REGISTRATION_OPEN' : 'COMPLETED';
    }
  },
};

