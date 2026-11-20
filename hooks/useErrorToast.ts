import { useState, useCallback } from 'react';
import { ApiError } from '@/services/apiClient';

interface ToastState {
  visible: boolean;
  message: string;
  correlationId?: string;
}

export function useErrorToast() {
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });

  const show = useCallback((error: unknown) => {
    const message =
      error instanceof ApiError || error instanceof Error
        ? (error as Error).message
        : typeof error === 'string'
        ? error
        : 'An unexpected error occurred';
    const correlationId = error instanceof ApiError ? error.correlationId : undefined;
    setToast({ visible: true, message, correlationId });
  }, []);

  const dismiss = useCallback(() => {
    setToast({ visible: false, message: '' });
  }, []);

  return { toast, show, dismiss };
}
