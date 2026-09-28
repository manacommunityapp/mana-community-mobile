import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_COMMUNITY_ADMIN } from '@/constants/permissions';
import { secureLog } from './secureLogger';

const ADMIN_ROLES = new Set([ROLE_SUPER_ADMIN, ROLE_ADMIN, ROLE_COMMUNITY_ADMIN]);

export function useAdminGuard(): { isAdmin: boolean; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isAdmin = !!user && ADMIN_ROLES.has(user.role);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (!isAdmin) {
      secureLog.security('UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT', {
        userId: user.id,
        role: user.role,
      });
      Alert.alert('Access Denied', 'You do not have permission to access this area.');
      router.replace('/tabs/feed');
    }
  }, [isLoading, user, isAdmin, router]);

  return { isAdmin, isLoading };
}
