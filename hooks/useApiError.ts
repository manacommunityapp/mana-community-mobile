import { ApiError } from '@/services/apiClient';

export function useApiError() {
  function formatError(e: unknown): string {
    if (e instanceof ApiError) return e.message;
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return 'An unexpected error occurred';
  }

  function getCorrelationId(e: unknown): string | undefined {
    if (e instanceof ApiError) return e.correlationId;
    return undefined;
  }

  return { formatError, getCorrelationId };
}
