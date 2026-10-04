import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROLES, GUARD_ROLES, type UserRole } from '@/constants/permissions';

export type PortalInfo = {
  role: UserRole;
  label: string;
  route: string;
  icon: string;
};

const ROLE_PORTAL_MAP: Record<string, PortalInfo> = {
  SUPER_ADMIN:      { role: 'SUPER_ADMIN',      label: 'Admin Console',   route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  ADMIN:            { role: 'ADMIN',             label: 'Admin Console',   route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  COMMUNITY_ADMIN:  { role: 'COMMUNITY_ADMIN',   label: 'Admin Console',   route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  MODERATOR:        { role: 'MODERATOR',          label: 'Moderator',       route: '/admin-role/tabs/dashboard', icon: 'shield-half' },
  GUARD:            { role: 'GUARD',              label: 'Guard Portal',    route: '/guard/tabs/dashboard',      icon: 'eye' },
  SECURITY:         { role: 'SECURITY',           label: 'Security Portal', route: '/guard/tabs/dashboard',      icon: 'eye' },
  VENDOR:           { role: 'VENDOR',             label: 'Vendor Portal',   route: '/vendor/tabs/dashboard',     icon: 'construct' },
  SPORTS_ADMIN:     { role: 'SPORTS_ADMIN',       label: 'Sports Admin',    route: '/sports-admin/tabs/dashboard', icon: 'trophy' },
  SPORTS_REFEREE:   { role: 'SPORTS_REFEREE',     label: 'Referee Panel',   route: '/sports-admin/tabs/dashboard', icon: 'flag' },
  EVENT_ADMIN:      { role: 'EVENT_ADMIN',        label: 'Event Admin',     route: '/event-admin/tabs/dashboard',  icon: 'calendar' },
  FINANCE_ADMIN:    { role: 'FINANCE_ADMIN',      label: 'Finance Admin',   route: '/admin-role/tabs/dashboard',   icon: 'cash' },
  FACILITY_MANAGER: { role: 'FACILITY_MANAGER',   label: 'Facility Manager', route: '/admin-role/tabs/dashboard',  icon: 'business' },
  FOOD_ADMIN:       { role: 'FOOD_ADMIN',         label: 'Food Admin',      route: '/admin-role/tabs/dashboard',   icon: 'restaurant' },
  HELPDESK_AGENT:   { role: 'HELPDESK_AGENT',     label: 'Helpdesk',        route: '/admin-role/tabs/dashboard',   icon: 'headset' },
  COMMITTEE_MEMBER: { role: 'COMMITTEE_MEMBER',   label: 'Committee',       route: '/admin-role/tabs/dashboard',   icon: 'people' },
  MEMBER:           { role: 'MEMBER',             label: 'Resident Home',   route: '/tabs/feed',                   icon: 'home' },
  USER:             { role: 'USER',               label: 'Home',            route: '/tabs/feed',                   icon: 'home' },
};

export function useRoleSwitcher() {
  const { user } = useAuth();
  const router = useRouter();

  const availableRoles = useMemo<UserRole[]>(() => {
    if (!user) return [];
    return (user.roles ?? []).length > 0
      ? (user.roles as UserRole[])
      : [user.role as UserRole];
  }, [user?.role, user?.roles]);

  const availablePortals = useMemo<PortalInfo[]>(() => {
    const seen = new Set<string>();
    const portals: PortalInfo[] = [];
    for (const role of availableRoles) {
      const portal = ROLE_PORTAL_MAP[role];
      if (portal && !seen.has(portal.route)) {
        seen.add(portal.route);
        portals.push({ ...portal, role });
      }
    }
    return portals;
  }, [availableRoles]);

  const hasMultiplePortals = availablePortals.length > 1;

  const switchToRole = useCallback((role: UserRole) => {
    const portal = ROLE_PORTAL_MAP[role];
    if (portal) {
      router.replace(portal.route as any);
    }
  }, [router]);

  const getDefaultRoute = useCallback((): string => {
    if (availableRoles.length === 0) return '/tabs/feed';
    const primary = availableRoles[0];
    return ROLE_PORTAL_MAP[primary]?.route ?? '/tabs/feed';
  }, [availableRoles]);

  return {
    availableRoles,
    availablePortals,
    hasMultiplePortals,
    switchToRole,
    getDefaultRoute,
  };
}

export function getPortalForRole(role: string): PortalInfo | null {
  return ROLE_PORTAL_MAP[role] ?? null;
}
