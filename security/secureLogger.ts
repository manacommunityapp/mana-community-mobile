type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

const REDACT_KEYS = new Set([
  'password', 'token', 'accesstoken', 'refreshtoken', 'authorization',
  'secret', 'apikey', 'otp', 'pin', 'cvv', 'cardnumber', 'aadhar',
  'aadhaar', 'ssn', 'credential', 'privatekey',
  // Government / national ID fields used by the KYC flows.
  'documentnumber', 'govtidnumber', 'idnumber', 'pan',
]);

const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '');
}

function shouldRedactKey(key: string): boolean {
  return REDACT_KEYS.has(normalizeKey(key));
}

/**
 * Recursively redacts sensitive keys at any nesting level. Previously only
 * top-level keys were checked, so `{ payload: { aadhaar } }` logged the value
 * verbatim. Depth is capped and visited objects are tracked so a deep or
 * self-referential object cannot hang or blow the stack.
 */
function sanitizeForLog(data: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return data.slice(0, 500);
  if (typeof data !== 'object') return data;

  if (data instanceof Error) {
    return { name: data.name, message: data.message.slice(0, 300) };
  }

  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';
  if (seen.has(data as object)) return '[CIRCULAR]';
  seen.add(data as object);

  if (Array.isArray(data)) {
    const items = data
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeForLog(item, depth + 1, seen));
    if (data.length > MAX_ARRAY_ITEMS) {
      items.push(`[+${data.length - MAX_ARRAY_ITEMS} more]`);
    }
    return items;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    result[key] = shouldRedactKey(key) ? '[REDACTED]' : sanitizeForLog(val, depth + 1, seen);
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
