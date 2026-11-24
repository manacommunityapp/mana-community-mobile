import api from './apiClient';

export type FamilyMemberType = 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';

export interface FamilyMember {
  id: number;
  name: string;
  phone?: string;
  relation: FamilyMemberType;
  photo?: string;
  dateOfBirth?: string;
  isMinor: boolean;
  isEmergencyContact: boolean;
  addedAt: string;
}

export interface AddFamilyMemberRequest {
  name: string;
  phone?: string;
  relation: FamilyMemberType;
  dateOfBirth?: string;
  isEmergencyContact?: boolean;
  isMinor?: boolean;
}

const MOCK_FAMILY: FamilyMember[] = [
  { id: 1, name: 'Priya Kumar', relation: 'SPOUSE', phone: '9876543210', isMinor: false, isEmergencyContact: true,  addedAt: new Date().toISOString() },
  { id: 2, name: 'Aarav Kumar', relation: 'CHILD',  phone: undefined,    isMinor: true,  isEmergencyContact: false, addedAt: new Date().toISOString() },
  { id: 3, name: 'Sneha Kumar', relation: 'CHILD',  phone: undefined,    isMinor: true,  isEmergencyContact: false, addedAt: new Date().toISOString() },
];

export const familyService = {
  async getMyFamily(): Promise<FamilyMember[]> {
    try {
      const res = await api.get<FamilyMember[]>('/family/members');
      if (res.data?.length > 0) return res.data;
    } catch {}
    return MOCK_FAMILY;
  },

  async addFamilyMember(data: AddFamilyMemberRequest): Promise<FamilyMember> {
    try {
      const res = await api.post<FamilyMember>('/family/members', data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to add family member.');
    }
  },

  async updateFamilyMember(id: number, data: Partial<AddFamilyMemberRequest>): Promise<FamilyMember> {
    try {
      const res = await api.put<FamilyMember>(`/family/members/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to update family member.');
    }
  },

  async removeFamilyMember(id: number): Promise<void> {
    try {
      await api.delete(`/family/members/${id}`);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Failed to remove family member.');
    }
  },
};
