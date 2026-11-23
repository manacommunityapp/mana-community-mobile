import { create } from 'zustand';
import { authService } from '@/services/authService';
import { tokenStore, setTenantCommunityId } from '@/services/apiClient';
import type { UserProfileResponse, LoginRequest, RegisterRequest } from '@/types/api';

export type UserPersona = 'RESIDENT' | 'ADMIN' | 'STAFF' | 'VENDOR';

const MODULE_ALIASES: Record<string, string[]> = {
  COMMUNITY_FEED: ['COMMUNITY_FEED', 'FEED', 'FORUM', 'COMMUNITY'],
  SPORTS: ['SPORTS'],
  MARKETPLACE: ['MARKETPLACE', 'COMMERCE', 'AUCTIONS', 'MARKET'],
  VISITORS: ['VISITORS', 'SECURITY', 'GATE', 'SAFETY'],
  NOTICES: ['NOTICES', 'BROADCAST', 'ANNOUNCEMENT'],
  BOOKINGS: ['BOOKINGS', 'FACILITIES', 'AMENITIES'],
  FACILITIES: ['BOOKINGS', 'FACILITIES', 'AMENITIES'],
  HELPDESK: ['HELPDESK', 'COMPLAINTS', 'ISSUES'],
  POLLS: ['POLLS'],
  JOBS: ['JOBS', 'CPN'],
  EVENTS: ['EVENTS', 'CALENDAR', 'EXPERIENCES'],
  CALENDAR: ['EVENTS', 'CALENDAR'],
  ENTERTAINMENT: ['ENTERTAINMENT', 'MOVIES'],
  COMMUNITY_MGMT: ['COMMUNITY_MGMT', 'GOVERNANCE'],
  GOVERNANCE: ['COMMUNITY_MGMT', 'GOVERNANCE'],
  FINANCE_MGMT: ['FINANCE_MGMT', 'PAYMENTS', 'PERSONAL_FINANCE'],
  PERSONAL_FINANCE: ['FINANCE_MGMT', 'PAYMENTS', 'PERSONAL_FINANCE'],
  ADMIN_HUB: ['ADMIN_HUB'],
  FOOD_OS: ['FOOD_OS', 'FOOD', 'FRESH_KITCHEN', 'DAILY_BASKET'],
  FOOD: ['FOOD_OS', 'FOOD'],
  VENDOR_MANAGEMENT: ['VENDOR_MANAGEMENT', 'VENDOR'],
  GROUP_BUYING: ['GROUP_BUYING'],
  SERVICE_PLATFORM: ['SERVICE_PLATFORM', 'HOME_SERVICES', 'SERVICES'],
  HOME_SERVICES: ['SERVICE_PLATFORM', 'HOME_SERVICES', 'SERVICES'],
  SERVICES: ['SERVICE_PLATFORM', 'HOME_SERVICES', 'SERVICES'],
  EMERGENCY: ['EMERGENCY', 'SAFETY'],
  TRIPS: ['TRIPS', 'COMMUTE', 'MOBILITY'],
  COMMUTE: ['TRIPS', 'COMMUTE', 'MOBILITY'],
  DISCOVER: ['DISCOVER'],
  MAINTENANCE: ['MAINTENANCE', 'CPOS', 'AMC'],
  INSURANCE: ['INSURANCE'],
  COMMERCE: ['COMMERCE', 'MARKETPLACE'],
  ACADEMY: ['ACADEMY'],
  SAFETY: ['SAFETY', 'VISITORS', 'EMERGENCY'],
  PAYMENTS: ['PAYMENTS', 'MANA_PAY', 'FINANCE_MGMT'],
  MANA_PAY: ['PAYMENTS', 'MANA_PAY', 'FINANCE_MGMT'],
  CPOS: ['CPOS', 'MAINTENANCE'],
};

interface AuthState {
  user: UserProfileResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPending: boolean;
  isRejected: boolean;
  /** True when the app launched offline and is showing a cached profile */
  isOffline: boolean;

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

async function enrichUserProfile(
  user: UserProfileResponse,
  fallbackCid?: number,
  fallbackModules?: string[]
): Promise<UserProfileResponse> {
  const cid = user.communityId ?? fallbackCid ?? null;
  let enabledMods = (user.enabledModules && user.enabledModules.length > 0)
    ? user.enabledModules
    : (fallbackModules || []);
  let commName = user.communityName ?? (typeof user.community === 'object' ? (user.community as any)?.name : null);

  if (cid) {
    setTenantCommunityId(cid);
    if (!commName || enabledMods.length === 0) {
      try {
        const comm = await authService.getCommunityDetails(cid);
        if (comm?.name) commName = comm.name;
        if (enabledMods.length === 0 && comm?.enabledModules?.length) {
          enabledMods = comm.enabledModules;
        }
      } catch {
        // Graceful fallback if offline or backend route fails
      }
    }
  }

  return {
    ...user,
    communityId: cid ?? undefined,
    communityName: commName,
    enabledModules: enabledMods,
  };
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isPending: false,
  isRejected: false,
  isOffline: false,

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
    const normalizedKey = moduleKey.trim().toUpperCase();
    if (enabledModules.includes(normalizedKey)) return true;
    const aliases = MODULE_ALIASES[normalizedKey] || [];
    return aliases.some(alias => enabledModules.includes(alias));
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
    const clearAndSignOut = async () => {
      await tokenStore.clearAll();
      setTenantCommunityId(null);
      set({
        user: null, isAuthenticated: false, isLoading: false, isOffline: false,
        roles: [], permissions: [], enabledModules: [],
        isAdmin: false, isSuperAdmin: false, isGuard: false, isVendor: false, isAnyAdmin: false,
      });
    };

    const applyUser = (user: UserProfileResponse, offline: boolean) => {
      const roles = computeRoles(user);
      const roleSet = new Set(roles);
      const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
      setTenantCommunityId(user.communityId ?? null);
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isOffline: offline,
        roles,
        permissions: user.permissions || [],
        enabledModules: user.enabledModules || [],
        activePersona: resolvePrimaryPersona(roles),
        isAdmin: isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN'),
        isSuperAdmin,
        isGuard: roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD'),
        isVendor: roleSet.has('VENDOR'),
        isAnyAdmin: isSuperAdmin || roles.some(r => r.includes('ADMIN')),
      });
    };

    try {
      const token = await tokenStore.getAccess();
      if (!token) {
        await clearAndSignOut();
        return;
      }

      try {
        let user = await authService.getProfile();
        user = await enrichUserProfile(user);
        applyUser(user, false);
      } catch (err: any) {
        const status: number | undefined = err?.response?.status;

        // 401/403 means the server explicitly rejected the token — sign out.
        if (status === 401 || status === 403) {
          await clearAndSignOut();
          return;
        }

        // Network error or other non-auth failure: try the encrypted profile cache so
        // the user stays logged in and can use cached screens offline.
        const cached = await tokenStore.getCachedProfile().catch(() => null);
        if (cached) {
          try {
            const cachedUser = JSON.parse(cached) as UserProfileResponse;
            const enriched = await enrichUserProfile(cachedUser).catch(() => cachedUser);
            applyUser(enriched, true);
            return;
          } catch {
            // Corrupt JSON (schema change from an app update) — clear and re-login.
            await clearAndSignOut();
            return;
          }
        }

        // No cache available — cannot restore session offline.
        await clearAndSignOut();
      }
    } catch {
      await clearAndSignOut();
    }
  },

  login: async (data) => {
    const res = await authService.login(data);
    if (res?.communityId != null) {
      setTenantCommunityId(res.communityId);
    }
    const resolvedName = res.fullName || res.userId || 'Neighbor';
    const roles = (res as any)?.roles && (res as any).roles.length > 0
      ? (res as any).roles
      : (res.role ? [res.role.toUpperCase()] : ['RESIDENT']);
    const roleSet = new Set(roles);
    const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
    const isAdmin = isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN');
    const isGuard = roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD');
    const isVendor = roleSet.has('VENDOR');
    const isAnyAdmin = isSuperAdmin || roles.some((r: string) => r.includes('ADMIN'));

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
      permissions: res.permissions || [],
    };

    set({
      user: initialUser,
      isAuthenticated: true,
      isLoading: false,
      roles,
      permissions: initialUser.permissions || [],
      enabledModules: initialUser.enabledModules || [],
      activePersona: resolvePrimaryPersona(roles),
      isAdmin,
      isSuperAdmin,
      isGuard,
      isVendor,
      isAnyAdmin,
    });

    // Background profile hydration with community enrichment
    authService.getProfile()
      .then(async (fullUser) => {
        const enrichedUser = await enrichUserProfile(fullUser, res.communityId, res.enabledModules);
        const fullRoles = computeRoles(enrichedUser);
        const fullRoleSet = new Set(fullRoles);
        setTenantCommunityId(enrichedUser.communityId ?? null);
        set({
          user: enrichedUser,
          roles: fullRoles,
          permissions: (enrichedUser.permissions && enrichedUser.permissions.length > 0) ? enrichedUser.permissions : (res.permissions || []),
          enabledModules: enrichedUser.enabledModules || res.enabledModules || [],
          activePersona: resolvePrimaryPersona(fullRoles),
          isAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoleSet.has('ADMIN') || fullRoleSet.has('COMMUNITY_ADMIN'),
          isSuperAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoleSet.has('SUPERADMIN'),
          isGuard: fullRoleSet.has('GUARD') || fullRoleSet.has('SECURITY_GUARD'),
          isVendor: fullRoleSet.has('VENDOR'),
          isAnyAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoles.some(r => r.includes('ADMIN')),
        });
      })
      .catch(async () => {
        const enriched = await enrichUserProfile(initialUser, res.communityId, res.enabledModules);
        setTenantCommunityId(enriched.communityId ?? null);
        set({ user: enriched });
      });
  },

  register: async (data) => {
    const res = await authService.register(data);
    if (res?.communityId != null) {
      setTenantCommunityId(res.communityId);
    }
    const resolvedName = res.fullName || res.userId || 'Neighbor';
    const roles = (res as any)?.roles && (res as any).roles.length > 0
      ? (res as any).roles
      : (res.role ? [res.role.toUpperCase()] : ['RESIDENT']);
    const roleSet = new Set(roles);
    const isSuperAdmin = roleSet.has('SUPER_ADMIN') || roleSet.has('SUPERADMIN');
    const isAdmin = isSuperAdmin || roleSet.has('ADMIN') || roleSet.has('COMMUNITY_ADMIN');
    const isGuard = roleSet.has('GUARD') || roleSet.has('SECURITY_GUARD');
    const isVendor = roleSet.has('VENDOR');
    const isAnyAdmin = isSuperAdmin || roles.some((r: string) => r.includes('ADMIN'));

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
      permissions: res.permissions || [],
    };

    set({
      user: initialUser,
      isAuthenticated: true,
      isLoading: false,
      roles,
      permissions: initialUser.permissions || [],
      enabledModules: initialUser.enabledModules || [],
      activePersona: resolvePrimaryPersona(roles),
      isAdmin,
      isSuperAdmin,
      isGuard,
      isVendor,
      isAnyAdmin,
    });

    // Background profile hydration with community enrichment
    authService.getProfile()
      .then(async (fullUser) => {
        const enrichedUser = await enrichUserProfile(fullUser, res.communityId, res.enabledModules);
        const fullRoles = computeRoles(enrichedUser);
        const fullRoleSet = new Set(fullRoles);
        setTenantCommunityId(enrichedUser.communityId ?? null);
        set({
          user: enrichedUser,
          roles: fullRoles,
          permissions: (enrichedUser.permissions && enrichedUser.permissions.length > 0) ? enrichedUser.permissions : (res.permissions || []),
          enabledModules: enrichedUser.enabledModules || res.enabledModules || [],
          activePersona: resolvePrimaryPersona(fullRoles),
          isAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoleSet.has('ADMIN') || fullRoleSet.has('COMMUNITY_ADMIN'),
          isSuperAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoleSet.has('SUPERADMIN'),
          isGuard: fullRoleSet.has('GUARD') || fullRoleSet.has('SECURITY_GUARD'),
          isVendor: fullRoleSet.has('VENDOR'),
          isAnyAdmin: fullRoleSet.has('SUPER_ADMIN') || fullRoles.some(r => r.includes('ADMIN')),
        });
      })
      .catch(async () => {
        const enriched = await enrichUserProfile(initialUser, res.communityId, res.enabledModules);
        setTenantCommunityId(enriched.communityId ?? null);
        set({ user: enriched });
      });
  },

  logout: async () => {
    await authService.logout(); // also calls tokenStore.clearAll() which clears the cached profile
    setTenantCommunityId(null);
    set({
      user: null,
      isAuthenticated: false,
      isOffline: false,
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
    const isAnyAdmin = isSuperAdmin || roles.some((r: string) => r.includes('ADMIN'));

    if (user.communityId != null) {
      setTenantCommunityId(user.communityId);
    }

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

