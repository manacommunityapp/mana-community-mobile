import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { ADMIN_ROLES, GUARD_ROLES, type UserRole } from '@/constants/permissions';
import { secureLog } from '@/security';

type PortalType = 'admin' | 'guard' | 'vendor' | 'sports-admin' | 'event-admin';

const PORTAL_ROLES: Record<PortalType, Set<UserRole>> = {
  admin: ADMIN_ROLES,
  guard: GUARD_ROLES,
  vendor: new Set(['VENDOR']),
  'sports-admin': new Set(['SPORTS_ADMIN', 'SPORTS_REFEREE']),
  'event-admin': new Set(['EVENT_ADMIN']),
};

const PORTAL_FALLBACK: Record<PortalType, string> = {
  admin: '/tabs/feed',
  guard: '/tabs/feed',
  vendor: '/tabs/feed',
  'sports-admin': '/tabs/feed',
  'event-admin': '/tabs/feed',
};

function usePortalGuard(portal: PortalType) {
  const { user, isLoading } = useAuth();
  const { hasAnyRole } = usePermissions();
  const router = useRouter();

  const allowedRoles = PORTAL_ROLES[portal];
  const authorized = hasAnyRole([...allowedRoles]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (!authorized) {
      secureLog.security(`UNAUTHORIZED_${portal.toUpperCase().replace('-', '_')}_ACCESS`, {
        userId: user.id,
        role: user.role,
      });
      Alert.alert('Access Denied', 'You do not have permission to access this area.');
      router.replace(PORTAL_FALLBACK[portal]);
    }
  }, [isLoading, user, authorized, router]);

  return { authorized, isAuthorized: authorized, isAdmin: authorized, isLoading };
}

export function useAdminGuard() {
  return usePortalGuard('admin');
}

export function useGuardPortalGuard() {
  return usePortalGuard('guard');
}

export function useVendorGuard() {
  return usePortalGuard('vendor');
}

export function useSportsAdminGuard() {
  return usePortalGuard('sports-admin');
}

export function useEventAdminGuard() {
  return usePortalGuard('event-admin');
}

export function useRoleGuard(requiredRoles: UserRole[]) {
  const { user, isLoading } = useAuth();
  const { hasAnyRole } = usePermissions();
  const router = useRouter();

  const authorized = hasAnyRole(requiredRoles);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (!authorized) {
      secureLog.security('UNAUTHORIZED_ROLE_ACCESS', {
        userId: user.id,
        role: user.role,
        required: requiredRoles,
      });
      Alert.alert('Access Denied', 'You do not have permission to access this area.');
      router.replace('/tabs/feed');
    }
  }, [isLoading, user, authorized, router]);

  return { authorized, isAuthorized: authorized, isAdmin: authorized, isLoading };
}
