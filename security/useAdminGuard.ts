import { useAdminGuard as useAdminGuardInternal } from '@/hooks/useRoleGuard';

export function useAdminGuard(): { isAdmin: boolean; isLoading: boolean; authorized: boolean } {
  const result = useAdminGuardInternal();
  return { isAdmin: result.authorized, isLoading: result.isLoading, authorized: result.authorized };
}
