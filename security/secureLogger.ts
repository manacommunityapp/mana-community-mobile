type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

const REDACT_KEYS = new Set([
  'password', 'token', 'accesstoken', 'refreshtoken', 'authorization',
  'secret', 'apikey', 'otp', 'pin', 'cvv', 'cardnumber', 'aadhar',
  'aadhaar', 'ssn', 'credential', 'privatekey',
]);

function redactValue(key: string, value: unknown): unknown {
  if (REDACT_KEYS.has(key.toLowerCase().replace(/[_-]/g, ''))) {
    return '[REDACTED]';
  }
  return value;
}

function sanitizeForLog(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return data.slice(0, 500);
  if (typeof data !== 'object') return data;
  if (data instanceof Error) {
    return { name: data.name, message: data.message.slice(0, 300) };
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    result[key] = redactValue(key, val);
  }
  return result;
}

export const secureLog = {
  debug(message: string, data?: unknown): void {
    if (!__DEV__) return;
    console.log(`[DEBUG] ${message}`, data ? sanitizeForLog(data) : '');
  },

  info(message: string, data?: unknown): void {
    if (!__DEV__) return;
    console.log(`[INFO] ${message}`, data ? sanitizeForLog(data) : '');
  },

  warn(message: string, data?: unknown): void {
    if (!__DEV__) return;
    console.warn(`[WARN] ${message}`, data ? sanitizeForLog(data) : '');
  },

  error(message: string, data?: unknown): void {
    if (!__DEV__) return;
    console.error(`[ERROR] ${message}`, data ? sanitizeForLog(data) : '');
  },

  security(event: string, details?: Record<string, unknown>): void {
    const sanitized = details ? sanitizeForLog(details) : undefined;
    if (__DEV__) {
      console.warn(`[SECURITY] ${event}`, sanitized ?? '');
    }
    // In production, security events should be sent to a backend audit endpoint.
    // This is a stub for integration with a centralized security monitoring service.
  },
};
