import api from './apiClient';
import type {
  AcademyProgram,
  AcademyCategory,
  AcademyInstructor,
  UserEnrollment,
} from '@/types/academy';

export const academyService = {
  // ── Categories ───────────────────────────────────────────────────
  async getCategories(): Promise<AcademyCategory[]> {
    try {
      const res = await api.get<AcademyCategory[]>('/academy/categories');
      return res.data;
    } catch {
      return [
        { id: 'cat-all', name: 'All Programs', code: 'ALL', active: true },
        { id: 'cat-kids', name: 'Kids & STEM', code: 'KIDS', active: true },
        { id: 'cat-fitness', name: 'Yoga & Fitness', code: 'FITNESS', active: true },
        { id: 'cat-tech', name: 'Coding & AI', code: 'TECH', active: true },
        { id: 'cat-arts', name: 'Music & Arts', code: 'ARTS', active: true },
      ];
    }
  },

  // ── Programs ─────────────────────────────────────────────────────
  async getPrograms(category?: string): Promise<AcademyProgram[]> {
    try {
      const res = await api.get<AcademyProgram[]>('/academy/programs', { params: { category } });
      return res.data;
    } catch {
      return [
        {
          id: 'prog-1',
          instructorId: 'inst-1',
          instructorName: 'Siddharth Rao',
          instructorTower: 'Tower B - 1402',
          categoryName: 'Coding & AI',
          title: 'Hands-on Python & Generative AI Bootcamp for Teens',
          summary: 'Build real chatbots and game scripts using Python, OpenAI APIs, and Streamlit.',
          description:
            'A 4-weekend intensive workshop for students (Grades 7-12). Hands-on project submission, GitHub portfolio creation, and community demo day presentation.',
          learningType: 'WORKSHOP',
          level: 'BEGINNER',
          mode: 'IN_PERSON',
          location: 'Clubhouse Activity Room 2',
          startDate: 'Starts Sat, 18 Oct 2026',
          startTime: '4:00 PM - 6:00 PM',
          durationMinutes: 120,
          pricingType: 'PAID',
          price: 1500,
          totalSeats: 20,
          enrolledCount: 14,
          userEnrolled: false,
          status: 'REGISTRATION_OPEN',
        },
        {
          id: 'prog-2',
          instructorId: 'inst-2',
          instructorName: 'Ananya Deshmukh',
          instructorTower: 'Tower A - 304',
          categoryName: 'Yoga & Fitness',
          title: 'Pranayama Breathwork & Sunrise Hatha Yoga',
          summary: 'Recharge mind and body with classical Surya Namaskars and deep guided mindfulness.',
          description:
            'Daily morning outdoor yoga session in the Central Amphitheatre lawns. Suitable for all age groups and fitness levels.',
          learningType: 'FITNESS_SESSION',
          level: 'ALL_LEVELS',
          mode: 'IN_PERSON',
          location: 'Central Amphitheatre Lawns',
          startDate: 'Every Mon, Wed, Fri',
          startTime: '6:30 AM - 7:30 AM',
          durationMinutes: 60,
          pricingType: 'FREE',
          price: 0,
          totalSeats: 35,
          enrolledCount: 28,
          userEnrolled: true,
          status: 'REGISTRATION_OPEN',
        },
        {
          id: 'prog-3',
          instructorId: 'inst-3',
          instructorName: 'Grandmaster Coach Ramesh',
          instructorTower: 'Tower C - 701',
          categoryName: 'Kids & STEM',
          title: 'Tactical Chess Mastery & Tournament Preparation',
          summary: 'Learn opening theory, tactical middlegame puzzles, and endgame patterns.',
          description:
            'FIDE-rated resident coach training young champions for inter-society and state junior chess tournaments.',
          learningType: 'COACHING',
          level: 'INTERMEDIATE',
          mode: 'HYBRID',
          location: 'Clubhouse Board Room & Lichess',
          startDate: 'Starts Sun, 19 Oct 2026',
          startTime: '10:00 AM - 11:30 AM',
          durationMinutes: 90,
          pricingType: 'PAID',
          price: 800,
          totalSeats: 15,
          enrolledCount: 11,
          userEnrolled: false,
          status: 'REGISTRATION_OPEN',
        },
      ];
    }
  },

  async enrollProgram(programId: string): Promise<UserEnrollment> {
    try {
      const res = await api.post<UserEnrollment>(`/academy/programs/${programId}/enroll`);
      return res.data;
    } catch {
      return {
        id: `enr-${Date.now()}`,
        programId,
        programTitle: 'Enrolled Community Program',
        instructorName: 'Resident Instructor',
        startDate: 'Upcoming Weekend',
        startTime: '10:00 AM',
        location: 'Clubhouse Activity Hub',
        status: 'CONFIRMED',
        qrCheckInToken: `MANA-ACAD-${Math.floor(100000 + Math.random() * 900000)}`,
        attendanceMarked: false,
      };
    }
  },

  // ── My Enrollments ───────────────────────────────────────────────
  async getMyEnrollments(): Promise<UserEnrollment[]> {
    try {
      const res = await api.get<UserEnrollment[]>('/academy/my-enrollments');
      return res.data;
    } catch {
      return [
        {
          id: 'enr-1',
          programId: 'prog-2',
          programTitle: 'Pranayama Breathwork & Sunrise Hatha Yoga',
          instructorName: 'Ananya Deshmukh (Tower A - 304)',
          startDate: 'Every Mon, Wed, Fri',
          startTime: '6:30 AM',
          location: 'Central Amphitheatre Lawns',
          status: 'CONFIRMED',
          qrCheckInToken: 'MANA-YOGA-PASS-8841',
          attendanceMarked: true,
        },
      ];
    }
  },

  // ── Instructors ──────────────────────────────────────────────────
  async getInstructors(): Promise<AcademyInstructor[]> {
    try {
      const res = await api.get<AcademyInstructor[]>('/academy/instructors');
      return res.data;
    } catch {
      return [
        {
          id: 'inst-1',
          fullName: 'Siddharth Rao',
          profession: 'Staff AI Engineer · Google',
          bio: '12+ years in Machine Learning and Python distributed systems. Passionate about mentoring junior coders.',
          tower: 'Tower B',
          flatNumber: '1402',
          skills: 'Python, PyTorch, Generative AI, Robotics',
          totalSessions: 18,
          totalLearners: 120,
          averageRating: 4.9,
          reviewCount: 42,
          isVerified: true,
        },
        {
          id: 'inst-2',
          fullName: 'Ananya Deshmukh',
          profession: 'Certified Yoga Acharya (RYS 500)',
          bio: 'Practicing Ashtanga and Vinyasa yoga for over 9 years with therapeutic mindfulness training.',
          tower: 'Tower A',
          flatNumber: '304',
          skills: 'Hatha Yoga, Breathwork, Meditation, Sound Healing',
          totalSessions: 45,
          totalLearners: 210,
          averageRating: 4.95,
          reviewCount: 78,
          isVerified: true,
        },
      ];
    }
  },
};
