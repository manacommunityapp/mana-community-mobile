import { create } from 'zustand';
import { authService } from '@/services/authService';
import { tokenStore } from '@/services/apiClient';
import type { UserProfileResponse, LoginRequest, RegisterRequest } from '@/types/api';

export type UserPersona = 'RESIDENT' | 'ADMIN' | 'STAFF' | 'VENDOR';

interface AuthState {
  user: UserProfileResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPending: boolean;
  isRejected: boolean;
  
  // Computed role & module state
  roles: string[];
  permissions: string[];
  enabledModules: string[];
  activePersona: UserPersona;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isGuard: boolean;
  isVendor: boolean;
  isAnyAdmin: boolean;

  // Evaluation helpers
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasModule: (moduleKey: string) => boolean;
  hasRole: (...roles: string[]) => boolean;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (user: UserProfileResponse) => void;
  switchPersona: (persona: UserPersona) => void;
}

function computeRoles(user: UserProfileResponse | null): string[] {
  if (!user) return [];
  if (user.roles && user.roles.length > 0) {
    return user.roles.map(r => r.trim().toUpperCase());
  }
  if (user.role) {
    return user.role.split(',').map(r => r.trim().toUpperCase()).filter(Boolean);
  }
  return [];
}

function resolvePrimaryPersona(roles: string[]): UserPersona {
  const roleSet = new Set(roles);
  if (roleSet.has('SUPER_ADMIN') || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN')) {
    return 'ADMIN';
  }
  if (roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD') || roleSet.has('STAFF') || roleSet.has('CASHIER')) {
    return 'STAFF';
  }
  if (roleSet.has('VENDOR')) {
    return 'VENDOR';
  }
  return 'RESIDENT';
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isPending: false,
  isRejected: false,

  roles: [],
  permissions: [],
  enabledModules: [],
  activePersona: 'RESIDENT',
  isAdmin: false,
  isSuperAdmin: false,
  isGuard: false,
  isVendor: false,
  isAnyAdmin: false,

  hasPermission: (permission: string): boolean => {
    const { permissions, isSuperAdmin } = get();
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  },

  hasAnyPermission: (...perms: string[]): boolean => {
    const { permissions, isSuperAdmin } = get();
    if (isSuperAdmin) return true;
    return perms.some(p => permissions.includes(p));
  },

  hasModule: (moduleKey: string): boolean => {
    const { enabledModules, isSuperAdmin } = get();
    if (isSuperAdmin) return true;
    if (!enabledModules || enabledModules.length === 0) return true;
    return enabledModules.includes(moduleKey);
  },

  hasRole: (...checkRoles: string[]): boolean => {
    const { roles, isSuperAdmin } = get();
    if (isSuperAdmin) return true;
    const upperRoles = checkRoles.map(r => r.trim().toUpperCase());
    return upperRoles.some(r => roles.includes(r));
  },

  switchPersona: (persona: UserPersona) => {
    set({ activePersona: persona });
  },

  loadUser: async () => {
    try {
      const token = await tokenStore.getAccess();
      if (!token) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          roles: [],
          permissions: [],
          enabledModules: [],
          isAdmin: false,
          isSuperAdmin: false,
          isGuard: false,
          isVendor: false,
          isAnyAdmin: false,
        });
        return;
      }
      const user = await authService.getProfile();
      const roles = computeRoles(user);
      const roleSet = new Set(roles);
      const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
      const isAdmin = isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN');
      const isGuard = roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD');
      const isVendor = roleSet.has('VENDOR');
      const isAnyAdmin = isSuperAdmin || roles.some(r => r.includes('ADMIN'));

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        roles,
        permissions: user.permissions || [],
        enabledModules: user.enabledModules || [],
        activePersona: resolvePrimaryPersona(roles),
        isAdmin,
        isSuperAdmin,
        isGuard,
        isVendor,
        isAnyAdmin,
      });
    } catch {
      await tokenStore.clearAll();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        roles: [],
        permissions: [],
        enabledModules: [],
        isAdmin: false,
        isSuperAdmin: false,
        isGuard: false,
        isVendor: false,
        isAnyAdmin: false,
      });
    }
  },

  login: async (data) => {
    await authService.login(data);
    try {
      const user = await authService.getProfile();
      const roles = computeRoles(user);
      const roleSet = new Set(roles);
      const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
      const isAdmin = isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN');
      const isGuard = roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD');
      const isVendor = roleSet.has('VENDOR');
      const isAnyAdmin = isSuperAdmin || roles.some(r => r.includes('ADMIN'));

      set({
        user,
        isAuthenticated: true,
        roles,
        permissions: user.permissions || [],
        enabledModules: user.enabledModules || [],
        activePersona: resolvePrimaryPersona(roles),
        isAdmin,
        isSuperAdmin,
        isGuard,
        isVendor,
        isAnyAdmin,
      });
    } catch {
      set({ isAuthenticated: true });
    }
  },

  register: async (data) => {
    await authService.register(data);
    try {
      const user = await authService.getProfile();
      const roles = computeRoles(user);
      const roleSet = new Set(roles);
      const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
      const isAdmin = isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN');
      const isGuard = roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD');
      const isVendor = roleSet.has('VENDOR');
      const isAnyAdmin = isSuperAdmin || roles.some(r => r.includes('ADMIN'));

      set({
        user,
        isAuthenticated: true,
        roles,
        permissions: user.permissions || [],
        enabledModules: user.enabledModules || [],
        activePersona: resolvePrimaryPersona(roles),
        isAdmin,
        isSuperAdmin,
        isGuard,
        isVendor,
        isAnyAdmin,
      });
    } catch {
      set({ isAuthenticated: true });
    }
  },

  logout: async () => {
    await authService.logout();
    set({
      user: null,
      isAuthenticated: false,
      roles: [],
      permissions: [],
      enabledModules: [],
      isAdmin: false,
      isSuperAdmin: false,
      isGuard: false,
      isVendor: false,
      isAnyAdmin: false,
    });
  },

  updateUser: (user) => {
    const roles = computeRoles(user);
    const roleSet = new Set(roles);
    const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
    const isAdmin = isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN');
    const isGuard = roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD');
    const isVendor = roleSet.has('VENDOR');
    const isAnyAdmin = isSuperAdmin || roles.some(r => r.includes('ADMIN'));

    set({
      user,
      roles,
      permissions: user.permissions || [],
      enabledModules: user.enabledModules || [],
      isAdmin,
      isSuperAdmin,
      isGuard,
      isVendor,
      isAnyAdmin,
    });
  },
}));
