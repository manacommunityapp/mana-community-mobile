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
  if (roleSet.has('VENDOR') || roleSet.has('SPORTS_VENDOR')) {
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
    const res = await authService.login(data);
    const resolvedName = res.fullName || res.userId || 'Neighbor';
    const roles = res.role ? [res.role.toUpperCase()] : ['RESIDENT'];
    const roleSet = new Set(roles);
    const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
    const isAdmin = isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN');
    const isGuard = roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD');
    const isVendor = roleSet.has('VENDOR');
    const isAnyAdmin = isSuperAdmin || roles.some(r => r.includes('ADMIN'));

    const initialUser: UserProfileResponse = {
      id: Number(res.userId) || 0,
      name: resolvedName,
      fullName: resolvedName,
      email: res.email || '',
      role: res.role || 'RESIDENT',
      roles,
      communityId: res.communityId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      enabledModules: res.enabledModules || [],
      permissions: [],
    };

    set({
      user: initialUser,
      isAuthenticated: true,
      roles,
      permissions: [],
      enabledModules: initialUser.enabledModules || [],
      activePersona: resolvePrimaryPersona(roles),
      isAdmin,
      isSuperAdmin,
      isGuard,
      isVendor,
      isAnyAdmin,
    });

    // Background profile hydration
    authService.getProfile()
      .then((fullUser) => {
        const fullRoles = computeRoles(fullUser);
        const fullRoleSet = new Set(fullRoles);
        set({
          user: fullUser,
          roles: fullRoles,
          permissions: fullUser.permissions || [],
          enabledModules: fullUser.enabledModules || [],
          activePersona: resolvePrimaryPersona(fullRoles),
          isAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoleSet.has('ADMIN') || fullRoleSet.has('COMMUNITY_ADMIN'),
          isSuperAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoleSet.has('SUPERADMIN'),
          isGuard: fullRoleSet.has('GUARD') || fullRoleSet.has('SECURITY_GUARD'),
          isVendor: fullRoleSet.has('VENDOR'),
          isAnyAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoles.some(r => r.includes('ADMIN')),
        });
      })
      .catch(() => {});
  },

  register: async (data) => {
    const res = await authService.register(data);
    const resolvedName = res.fullName || res.userId || 'Neighbor';
    const roles = res.role ? [res.role.toUpperCase()] : ['RESIDENT'];
    const roleSet = new Set(roles);
    const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
    const isAdmin = isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN');
    const isGuard = roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD');
    const isVendor = roleSet.has('VENDOR');
    const isAnyAdmin = isSuperAdmin || roles.some(r => r.includes('ADMIN'));

    const initialUser: UserProfileResponse = {
      id: Number(res.userId) || 0,
      name: resolvedName,
      fullName: resolvedName,
      email: res.email || '',
      role: res.role || 'RESIDENT',
      roles,
      communityId: res.communityId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      enabledModules: res.enabledModules || [],
      permissions: [],
    };

    set({
      user: initialUser,
      isAuthenticated: true,
      roles,
      permissions: [],
      enabledModules: initialUser.enabledModules || [],
      activePersona: resolvePrimaryPersona(roles),
      isAdmin,
      isSuperAdmin,
      isGuard,
      isVendor,
      isAnyAdmin,
    });

    // Background profile hydration
    authService.getProfile()
      .then((fullUser) => {
        const fullRoles = computeRoles(fullUser);
        const fullRoleSet = new Set(fullRoles);
        set({
          user: fullUser,
          roles: fullRoles,
          permissions: fullUser.permissions || [],
          enabledModules: fullUser.enabledModules || [],
          activePersona: resolvePrimaryPersona(fullRoles),
          isAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoleSet.has('ADMIN') || fullRoleSet.has('COMMUNITY_ADMIN'),
          isSuperAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoleSet.has('SUPERADMIN'),
          isGuard: fullRoleSet.has('GUARD') || fullRoleSet.has('SECURITY_GUARD'),
          isVendor: fullRoleSet.has('VENDOR'),
          isAnyAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoles.some(r => r.includes('ADMIN')),
        });
      })
      .catch(() => {});
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
