import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRoles } from '@/constants/roleAliases';
import { ROLE_PERMISSIONS, ADMIN_ROLES, GUARD_ROLES, ROLE_ALIASES, type UserRole } from '@/constants/permissions';

function resolvePermissions(roles: UserRole[]): Set<string> {
  const perms = new Set<string>();
  for (const role of roles) {
    const rp = ROLE_PERMISSIONS[role];
    if (!rp) continue;
    if (rp.includes('*')) return new Set(['*']);
    rp.forEach((p) => perms.add(p));
  }
  return perms;
}

export function usePermissions() {
  const { user } = useAuth();

  const activeRoles = useMemo<UserRole[]>(() => {
    if (!user) return [];
    const rawRoles = (user.roles && user.roles.length > 0)
      ? user.roles
      : (user.role ? [user.role] : []);
    const flat = rawRoles.flatMap((r) => String(r ?? '').split(','));
    return normalizeRoles(flat) as UserRole[];
  }, [user?.role, user?.roles]);

  const grantedPermissions = useMemo(
    () => resolvePermissions(activeRoles),
    [activeRoles],
  );

  const isSuperAdmin = activeRoles.includes('SUPER_ADMIN');

  const hasPerm = (perm: string): boolean => {
    if (isSuperAdmin || grantedPermissions.has('*')) return true;
    if (user?.permissions?.includes(perm)) return true;
    return grantedPermissions.has(perm);
  };

  const hasRole = (role: UserRole): boolean => {
    const target = String(role).trim().toUpperCase();
    if (activeRoles.includes(target as UserRole)) return true;
    const aliases = ROLE_ALIASES[target] || [];
    return aliases.some((a) => activeRoles.includes(a as UserRole));
  };

  const hasAnyRole = (roles: UserRole[]): boolean =>
    roles.some((r) => hasRole(r));

  const isAdmin = activeRoles.some((r) => ADMIN_ROLES.has(r));
  const isGuard = activeRoles.some((r) => GUARD_ROLES.has(r));

  const primaryRole: UserRole | null = (user?.role as UserRole) ?? null;

  return {
    activeRoles,
    primaryRole,
    isSuperAdmin,
    isAdmin,
    isGuard,
    hasPerm,
    hasRole,
    hasAnyRole,
    grantedPermissions,
  };
}
