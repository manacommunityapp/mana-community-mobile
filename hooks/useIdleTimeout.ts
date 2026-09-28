import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useIdleTimeout(isAuthenticated: boolean, logout: () => Promise<void>) {
  const router = useRouter();
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (nextState === 'active' && backgroundedAt.current !== null) {
        const elapsed = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (elapsed >= IDLE_TIMEOUT_MS) {
          await logout();
          router.replace('/auth/login');
        }
      }
    };

    const sub = AppState.addEventListener('change', handleStateChange);
    return () => sub.remove();
  }, [isAuthenticated, logout, router]);
}
