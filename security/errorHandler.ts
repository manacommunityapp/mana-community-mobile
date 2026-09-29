import { AxiosError } from 'axios';
import { Alert } from 'react-native';

const GENERIC_ERROR = 'Unable to complete the request. Please try again.';

const SAFE_ERROR_CODES: Record<number, string> = {
  400: 'The request was invalid. Please check your input.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with the current state. Please refresh and try again.',
  413: 'The file is too large.',
  415: 'The file format is not supported.',
  422: 'Please check your input and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: GENERIC_ERROR,
  502: 'The service is temporarily unavailable. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
};

export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message;

    // 1. Prioritize safe, descriptive server rejection / validation messages
    if (
      typeof serverMessage === 'string' &&
      serverMessage.trim().length > 0 &&
      serverMessage.length < 250 &&
      !containsSensitiveInfo(serverMessage)
    ) {
      return serverMessage.trim();
    }

    // 2. Check for Spring Boot field errors list
    const fieldErrors = error.response?.data?.fieldErrors;
    if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
      const firstMsg = fieldErrors[0]?.message;
      if (typeof firstMsg === 'string' && !containsSensitiveInfo(firstMsg)) {
        return firstMsg.trim();
      }
    }

    // 3. Fall back to standard safe HTTP status descriptions
    if (status && SAFE_ERROR_CODES[status]) {
      return SAFE_ERROR_CODES[status]!;
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
      return 'Network error. Please check your connection and try again.';
    }
    return GENERIC_ERROR;
  }
  if (error instanceof Error) {
    if (!containsSensitiveInfo(error.message) && error.message.length < 200) {
      return error.message;
    }
  }
  return GENERIC_ERROR;
}

function containsSensitiveInfo(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('sql') ||
    lower.includes('exception') ||
    lower.includes('stack') ||
    lower.includes('hibernate') ||
    lower.includes('jdbc') ||
    lower.includes('postgres') ||
    lower.includes('database') ||
    lower.includes('internal server') ||
    lower.includes('null pointer') ||
    lower.includes('class not found') ||
    lower.includes('/home/') ||
    lower.includes('\\users\\') ||
    lower.includes('aws') ||
    lower.includes('secret') ||
    lower.includes('token') ||
    lower.includes('password') ||
    lower.includes('credential')
  );
}

export function showSafeError(titleOrError: unknown, errorOrTitle?: unknown): void {
  if (typeof titleOrError === 'string' && errorOrTitle !== undefined && typeof errorOrTitle !== 'string') {
    Alert.alert(titleOrError, getSafeErrorMessage(errorOrTitle));
  } else if (typeof errorOrTitle === 'string') {
    Alert.alert(errorOrTitle, getSafeErrorMessage(titleOrError));
  } else if (typeof titleOrError === 'string') {
    Alert.alert('Error', titleOrError);
  } else {
    Alert.alert('Error', getSafeErrorMessage(titleOrError));
  }
}

export function logSecurityEvent(event: string, details?: Record<string, unknown>): void {
  if (__DEV__) {
    console.log(`[Security] ${event}`, details ?? '');
    return;
  }
  // In production, these would go to a structured logging/SIEM endpoint.
  // For now, we suppress console output to avoid leaking info.
}
