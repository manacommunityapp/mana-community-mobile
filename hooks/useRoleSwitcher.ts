import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRoles } from '@/constants/roleAliases';
import { ADMIN_ROLES, GUARD_ROLES, ROLE_ALIASES, type UserRole } from '@/constants/permissions';

export type PortalInfo = {
  role: UserRole;
  label: string;
  route: string;
  icon: string;
};

const ROLE_PORTAL_MAP: Record<string, PortalInfo> = {
  SUPER_ADMIN:          { role: 'SUPER_ADMIN',          label: 'Admin Console',       route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  ADMIN:                { role: 'ADMIN',                 label: 'Admin Console',       route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  COMMUNITY_ADMIN:      { role: 'COMMUNITY_ADMIN',       label: 'Admin Console',       route: '/admin-role/tabs/dashboard', icon: 'shield-checkmark' },
  MODERATOR:            { role: 'MODERATOR',              label: 'Moderator',           route: '/admin-role/tabs/dashboard', icon: 'shield-half' },
  GUARD:                { role: 'GUARD',                  label: 'Guard Portal',        route: '/guard/tabs/dashboard',      icon: 'eye' },
  SECURITY:             { role: 'SECURITY',               label: 'Security Portal',     route: '/guard/tabs/dashboard',      icon: 'eye' },
  VENDOR:               { role: 'VENDOR',                 label: 'Vendor Portal',       route: '/vendor/tabs/dashboard',     icon: 'construct' },
  SPORTS_ADMIN:         { role: 'SPORTS_ADMIN',           label: 'Sports Admin',        route: '/sports-admin/tabs/dashboard', icon: 'trophy' },
  SPORTS_REFEREE:       { role: 'SPORTS_REFEREE',         label: 'Referee Panel',       route: '/sports-admin/tabs/dashboard', icon: 'flag' },
  EVENT_ADMIN:          { role: 'EVENT_ADMIN',            label: 'Event Admin',         route: '/event-admin/tabs/dashboard',  icon: 'calendar' },
  EVENTS_ADMIN:         { role: 'EVENTS_ADMIN',           label: 'Event Admin',         route: '/event-admin/tabs/dashboard',  icon: 'calendar' },
  FINANCE_ADMIN:        { role: 'FINANCE_ADMIN',          label: 'Finance Admin',       route: '/admin-role/tabs/dashboard',   icon: 'cash' },
  FINANCE_MGMT_ADMIN:   { role: 'FINANCE_MGMT_ADMIN',     label: 'Finance Admin',       route: '/admin-role/tabs/dashboard',   icon: 'cash' },
  FACILITY_MANAGER:     { role: 'FACILITY_MANAGER',       label: 'Facility Manager',    route: '/admin-role/tabs/dashboard',  icon: 'business' },
  FOOD_ADMIN:           { role: 'FOOD_ADMIN',             label: 'Food Admin',          route: '/admin-role/tabs/dashboard',   icon: 'restaurant' },
  FOOD_OS_ADMIN:        { role: 'FOOD_OS_ADMIN',          label: 'Food Admin',          route: '/admin-role/tabs/dashboard',   icon: 'restaurant' },
  HELPDESK_AGENT:       { role: 'HELPDESK_AGENT',         label: 'Helpdesk',            route: '/admin-role/tabs/dashboard',   icon: 'headset' },
  HELPDESK_ADMIN:       { role: 'HELPDESK_ADMIN',         label: 'Helpdesk Admin',      route: '/admin-role/tabs/dashboard',   icon: 'headset' },
  COMMITTEE_MEMBER:     { role: 'COMMITTEE_MEMBER',       label: 'Committee',           route: '/admin-role/tabs/dashboard',   icon: 'people' },
  ACCOUNTANT:           { role: 'ACCOUNTANT',             label: 'Accountant',          route: '/admin-role/tabs/dashboard',   icon: 'calculator' },
  READONLY_ADMIN:       { role: 'READONLY_ADMIN',         label: 'View-Only Admin',     route: '/admin-role/tabs/dashboard',   icon: 'eye' },
  VISITORS_ADMIN:       { role: 'VISITORS_ADMIN',         label: 'Gate & Visitors',     route: '/admin-role/tabs/dashboard',   icon: 'shield-checkmark' },
  COMMUNITY_FEED_ADMIN: { role: 'COMMUNITY_FEED_ADMIN',     label: 'Feed Moderator',     route: '/admin-role/tabs/dashboard',   icon: 'chatbubbles' },
  MEMBER:               { role: 'MEMBER',                 label: 'Resident Home',       route: '/tabs/feed',                   icon: 'home' },
  USER:                 { role: 'USER',                   label: 'Home',                route: '/tabs/feed',                   icon: 'home' },
  RESIDENT:             { role: 'RESIDENT',               label: 'Resident Home',       route: '/tabs/feed',                   icon: 'home' },
  OWNER:                { role: 'OWNER',                  label: 'Owner Home',          route: '/tabs/feed',                   icon: 'home' },
  TENANT:               { role: 'TENANT',                 label: 'Tenant Home',         route: '/tabs/feed',                   icon: 'home' },
  SPORTS_VENDOR:        { role: 'SPORTS_VENDOR',          label: 'Sports Vendor',       route: '/vendor/tabs/dashboard',       icon: 'construct' },
  SPORTS_TRAINER:       { role: 'SPORTS_TRAINER',         label: 'Sports Trainer',      route: '/sports-admin/tabs/dashboard', icon: 'barbell' },
  STAFF:                { role: 'STAFF',                  label: 'Staff Portal',        route: '/admin-role/tabs/dashboard',   icon: 'id-badge-2' },
  CASHIER:              { role: 'CASHIER',                label: 'Cashier Portal',      route: '/admin-role/tabs/dashboard',   icon: 'cash' },
};

export function useRoleSwitcher() {
  const { user } = useAuth();
  const router = useRouter();

  const availableRoles = useMemo<UserRole[]>(() => {
    if (!user) return [];
    const rawRoles = (user.roles && user.roles.length > 0)
      ? user.roles
      : (user.role ? [user.role] : []);
    // Normalise backend names (EVENTS_ADMIN → EVENT_ADMIN …) so every role maps to a portal.
    return normalizeRoles(rawRoles.flatMap(r => String(r ?? '').split(','))) as UserRole[];
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
    const RESIDENT_ROLES = new Set(['USER', 'RESIDENT', 'MEMBER', 'OWNER', 'TENANT']);
    if (availableRoles.some((r) => RESIDENT_ROLES.has(r))) {
      return '/tabs/feed';
    }
    const primary = availableRoles[0];
    return getPortalForRole(primary)?.route ?? '/tabs/feed';
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
  if (!role) return null;
  const upper = String(role).trim().toUpperCase();
  if (ROLE_PORTAL_MAP[upper]) return ROLE_PORTAL_MAP[upper];
  const aliases = ROLE_ALIASES[upper] || [];
  for (const alias of aliases) {
    if (ROLE_PORTAL_MAP[alias]) return ROLE_PORTAL_MAP[alias];
  }
  return null;
}
