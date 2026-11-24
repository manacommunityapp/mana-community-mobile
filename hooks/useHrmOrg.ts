import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hrmService } from '@/services/hrmService';
import type { HrOrganization } from '@/types/hrm';

const STORAGE_KEY = 'hrm_active_org_id';

interface HrmOrgState {
  organizations: HrOrganization[];
  activeOrgId: number | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  setActiveOrgId: (id: number) => Promise<void>;
}

export const useHrmOrg = create<HrmOrgState>((set, get) => ({
  organizations: [],
  activeOrgId: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    set({ loading: true });
    try {
      const [orgs, stored] = await Promise.all([
        hrmService.getMyOrganizations(),
        AsyncStorage.getItem(STORAGE_KEY).catch(() => null),
      ]);
      const storedId = stored ? Number(stored) : null;
      const validId = storedId && orgs.some((o) => o.id === storedId)
        ? storedId
        : orgs[0]?.id ?? null;
      set({ organizations: orgs, activeOrgId: validId, initialized: true });
    } catch {
      set({ initialized: true });
    } finally {
      set({ loading: false });
    }
  },

  setActiveOrgId: async (id: number) => {
    set({ activeOrgId: id });
    try { await AsyncStorage.setItem(STORAGE_KEY, String(id)); } catch {}
  },
}));
