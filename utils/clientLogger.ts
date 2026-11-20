interface LogContext {
  correlationId?: string;
  [key: string]: unknown;
}

export const clientLogger = {
  error(message: string, context?: LogContext): void {
    const { correlationId, ...rest } = context ?? {};
    const parts: unknown[] = [`[ERROR] ${message}`];
    if (correlationId) parts.push(`(ref: ${correlationId})`);
    if (Object.keys(rest).length) parts.push(rest);
    console.error(...parts);
    // TODO: forward to Sentry/Datadog:
    // Sentry.captureMessage(message, { level: 'error', extra: context });
  },

  warn(message: string, context?: Record<string, unknown>): void {
    const parts: unknown[] = [`[WARN] ${message}`];
    if (context && Object.keys(context).length) parts.push(context);
    console.warn(...parts);
  },
};
