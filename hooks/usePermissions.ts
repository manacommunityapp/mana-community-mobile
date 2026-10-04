import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_PERMISSIONS, ADMIN_ROLES, GUARD_ROLES, type UserRole } from '@/constants/permissions';

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
    const roles = (user.roles ?? []).length > 0
      ? (user.roles as UserRole[])
      : [user.role as UserRole];
    return roles;
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

  const hasRole = (role: UserRole): boolean =>
    activeRoles.includes(role);

  const hasAnyRole = (roles: UserRole[]): boolean =>
    roles.some((r) => activeRoles.includes(r));

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
