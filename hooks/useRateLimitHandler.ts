import { useState, useEffect, useCallback } from 'react';
import { ApiError } from '@/services/apiClient';

interface RateLimitState {
  isLimited: boolean;
  secondsRemaining: number;
  type: string;
}

function extractRetryAfter(error: ApiError): number | undefined {
  try {
    const body = (error as any).responseBody;
    if (body?.retryAfterSeconds) return Number(body.retryAfterSeconds);
  } catch {}
  return undefined;
}

function extractType(error: ApiError): string | undefined {
  try {
    const body = (error as any).responseBody;
    return body?.type;
  } catch {}
  return undefined;
}

export function useRateLimitHandler() {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState | null>(null);

  useEffect(() => {
    if (!rateLimitState?.isLimited || rateLimitState.secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setRateLimitState(prev =>
        prev && prev.secondsRemaining > 1
          ? { ...prev, secondsRemaining: prev.secondsRemaining - 1 }
          : null,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitState?.isLimited]);

  const handleError = useCallback((error: unknown): boolean => {
    if (error instanceof ApiError && error.statusCode === 429) {
      const seconds = extractRetryAfter(error) ?? 60;
      setRateLimitState({
        isLimited: true,
        secondsRemaining: seconds,
        type: extractType(error) ?? 'REQUEST',
      });
      return true;
    }
    return false;
  }, []);

  return {
    rateLimitState,
    handleError,
    isLimited: !!rateLimitState?.isLimited,
  };
}
