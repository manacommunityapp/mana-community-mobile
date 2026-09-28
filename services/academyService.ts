import api from './apiClient';
import type {
  AcademyProgram,
  AcademyCategory,
  AcademyInstructor,
  UserEnrollment,
} from '@/types/academy';

export const academyService = {
  async getCategories(): Promise<AcademyCategory[]> {
    const res = await api.get<AcademyCategory[]>('/academy/categories');
    return res.data;
  },

  async getPrograms(category?: string): Promise<AcademyProgram[]> {
    const res = await api.get<AcademyProgram[]>('/academy/programs', { params: { category } });
    return res.data;
  },

  async enrollProgram(programId: string): Promise<UserEnrollment> {
    const res = await api.post<UserEnrollment>(`/academy/programs/${programId}/enroll`);
    return res.data;
  },

  async getMyEnrollments(): Promise<UserEnrollment[]> {
    const res = await api.get<UserEnrollment[]>('/academy/my-enrollments');
    return res.data;
  },

  async getInstructors(): Promise<AcademyInstructor[]> {
    const res = await api.get<AcademyInstructor[]>('/academy/instructors');
    return res.data;
  },
};
