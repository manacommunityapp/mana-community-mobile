import { create } from 'zustand';
import { authService } from '@/services/authService';
import { tokenStore } from '@/services/apiClient';
import type { UserProfileResponse, LoginRequest, RegisterRequest } from '@/types/api';

interface AuthState {
  user: UserProfileResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (user: UserProfileResponse) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  loadUser: async () => {
    try {
      const token = await tokenStore.getAccess();
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      const user = await authService.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      await tokenStore.clearAll();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (data) => {
    const res = await authService.login(data);
    set({ user: res.user, isAuthenticated: true });
  },

  register: async (data) => {
    const res = await authService.register(data);
    set({ user: res.user, isAuthenticated: true });
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (user) => set({ user }),
}));
