import { create } from 'zustand';
import { authService } from '@/services/authService';
import { tokenStore } from '@/services/apiClient';
import type { UserProfileResponse, LoginRequest, RegisterRequest } from '@/types/api';

interface AuthState {
  user:            UserProfileResponse | null;
  isLoading:       boolean;
  isAuthenticated: boolean;
  /** Derived — true when logged in but kycStatus is PENDING (awaiting admin approval). */
  isPending:       boolean;
  /** Derived — true when kycStatus is REJECTED. */
  isRejected:      boolean;

  login:      (data: LoginRequest)    => Promise<void>;
  register:   (data: RegisterRequest) => Promise<void>;
  logout:     ()                      => Promise<void>;
  loadUser:   ()                      => Promise<void>;
  updateUser: (user: UserProfileResponse) => void;
}

function deriveStatus(user: UserProfileResponse | null) {
  return {
    isPending:  !!user && user.kycStatus === 'PENDING',
    isRejected: !!user && user.kycStatus === 'REJECTED',
  };
}

export const useAuth = create<AuthState>((set) => ({
  user:            null,
  isLoading:       true,
  isAuthenticated: false,
  isPending:       false,
  isRejected:      false,

  loadUser: async () => {
    try {
      const token = await tokenStore.getAccess();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await authService.getProfile();
      set({ user, isAuthenticated: true, isLoading: false, ...deriveStatus(user) });
    } catch {
      await tokenStore.clearAll();
      set({ user: null, isAuthenticated: false, isLoading: false,
            isPending: false, isRejected: false });
    }
  },

  login: async (data) => {
    const res = await authService.login(data);
    set({ user: res.user, isAuthenticated: true, ...deriveStatus(res.user) });
  },

  register: async (data) => {
    const res = await authService.register(data);
    set({ user: res.user, isAuthenticated: true, ...deriveStatus(res.user) });
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false, isPending: false, isRejected: false });
  },

  updateUser: (user) => set({ user, ...deriveStatus(user) }),
}));
