/**
 * Backend (mana-community-service PermissionConstants) role names differ from the
 * names the mobile app uses for portals/permissions. Normalise once, here, so every
 * consumer (permissions, guards, role switcher, routing) sees the same names.
 */
const ROLE_ALIASES: Record<string, string> = {
  SUPERADMIN: 'SUPER_ADMIN',
  EVENTS_ADMIN: 'EVENT_ADMIN',
  FINANCE_MGMT_ADMIN: 'FINANCE_ADMIN',
  HELPDESK_ADMIN: 'HELPDESK_AGENT',
  FOOD_OS_ADMIN: 'FOOD_ADMIN',
  BOOKINGS_ADMIN: 'FACILITY_MANAGER',
  SECURITY_GUARD: 'GUARD',
};

export function normalizeRole(role: string | null | undefined): string {
  const upper = String(role ?? '').trim().toUpperCase();
  return ROLE_ALIASES[upper] ?? upper;
}

/** Normalise, drop blanks and de-duplicate while preserving order. */
export function normalizeRoles(roles: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const r of roles) {
    const n = normalizeRole(r);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Roles that mean "lives in the community" (resident home is the base workspace). */
export const RESIDENT_ROLES = new Set(['USER', 'MEMBER', 'RESIDENT', 'OWNER', 'TENANT']);
