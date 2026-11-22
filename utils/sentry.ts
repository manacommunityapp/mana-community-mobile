import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn || '';

/**
 * Keys whose values must never leave the device in crash telemetry.
 * Matching is done on a normalised key (lowercased, `_`/`-`/space stripped).
 */
const SENSITIVE_KEY_PATTERNS = [
  'aadhaar', 'aadhar', 'uidai',
  'documentnumber', 'govtidnumber', 'govtid', 'idnumber', 'nationalid',
  'pan', 'passportnumber', 'drivinglicense', 'voterid',
  'password', 'pin', 'otp', 'token', 'secret', 'apikey', 'authorization',
  'credential', 'privatekey',
  'cardnumber', 'cvv', 'cvc', 'expiry', 'upiid', 'vpa', 'accountnumber', 'ifsc',
  'email', 'phone', 'mobile',
];

const REDACTED = '[REDACTED]';
const MAX_SCRUB_DEPTH = 8;

function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[_\-\s]/g, '');
  return SENSITIVE_KEY_PATTERNS.some((p) => normalised.includes(p));
}

/**
 * Values that look like a government ID even when the key does not say so,
 * e.g. a 12-digit Aadhaar pasted into a free-text field, or a PAN.
 */
function looksLikeGovernmentId(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '');
  if (/^\d{12}$/.test(compact)) return true;                 // Aadhaar
  if (/^[A-Z]{5}\d{4}[A-Z]$/i.test(compact)) return true;    // PAN
  if (/^[A-Z]{3}\d{7}$/i.test(compact)) return true;         // Voter ID (EPIC)
  return false;
}

function scrub(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > MAX_SCRUB_DEPTH) return '[TRUNCATED]';
  if (typeof value === 'string') {
    return looksLikeGovernmentId(value) ? REDACTED : value;
  }
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value as object)) return '[CIRCULAR]';
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => scrub(item, depth + 1, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? REDACTED : scrub(val, depth + 1, seen);
  }
  return out;
}

/**
 * Last line of defence before an event leaves the device. Screenshots are off
 * (they would capture the Aadhaar / card input fields), but extras, breadcrumbs
 * and request bodies can still carry PII, so they are scrubbed here.
 */
function beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  try {
    if (event.user) {
      // Only an opaque id is needed to correlate issues.
      event.user = event.user.id ? { id: String(event.user.id) } : undefined;
    }
    if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
    if (event.tags) event.tags = scrub(event.tags) as typeof event.tags;
    if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;
    if (event.request?.data) event.request.data = scrub(event.request.data);
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) =>
        b.data ? { ...b, data: scrub(b.data) as typeof b.data } : b
      );
    }
  } catch {
    // Never let scrubbing throw away an otherwise useful crash report.
  }
  return event;
}

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    // Screenshots of KYC / payment screens would ship images of the Aadhaar
    // and card input fields to Sentry. Never enable this.
    attachScreenshot: false,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30_000,
    sendDefaultPii: false,
    beforeSend,
  });
}

/**
 * Identify the user by opaque id only. The `email` parameter is accepted for
 * backwards compatibility with existing call sites but is deliberately ignored
 * and never sent to Sentry.
 */
export function setUser(userId: string, _email?: string) {
  Sentry.setUser({ id: userId });
}

export function clearUser() {
  Sentry.setUser(null);
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(scrub(context) as Record<string, unknown>);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data: data ? (scrub(data) as Record<string, unknown>) : undefined,
    level: 'info',
  });
}

export { Sentry };
