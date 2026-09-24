import { create } from 'zustand';
import type { CommunityPreviewDto } from '@/types/api';

/**
 * Holds the multi-step onboarding form state across screens.
 * Data is committed to the backend only at the end of Step 3
 * (register API call) and Step 4 (KYC API call).
 */
interface OnboardingState {
  // Step 1 — Account
  name:     string;
  email:    string;
  phone:    string;
  password: string;

  // Step 2 — Community
  inviteCode: string;
  community:  CommunityPreviewDto | null;

  // Step 3 — Resident details
  flatNo:     string;
  block:      string;
  familySize: number;

  // Actions
  setAccount:   (v: { name: string; email: string; phone: string; password: string }) => void;
  setCommunity: (inviteCode: string, community: CommunityPreviewDto) => void;
  setDetails:   (v: { flatNo: string; block: string; familySize: number }) => void;
  reset:        () => void;
}

const DEFAULT: Omit<OnboardingState, keyof Pick<OnboardingState,
  'setAccount' | 'setCommunity' | 'setDetails' | 'reset'>> = {
  name: '', email: '', phone: '', password: '',
  inviteCode: '', community: null,
  flatNo: '', block: '', familySize: 1,
};

export const useOnboarding = create<OnboardingState>((set) => ({
  ...DEFAULT,

  setAccount:   (v) => set(v),
  setCommunity: (inviteCode, community) => set({ inviteCode, community }),
  setDetails:   (v) => set(v),
  reset:        () => set(DEFAULT),
}));
