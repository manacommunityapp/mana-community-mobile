type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface TelemetryEvent {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

type TelemetryTransport = (event: TelemetryEvent) => void;

const transports: TelemetryTransport[] = [];

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const event: TelemetryEvent = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (__DEV__) {
    const prefix = { debug: '[D]', info: '[I]', warn: '[W]', error: '[E]' }[level];
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, context ?? '');
  }

  for (const t of transports) {
    try { t(event); } catch { /* never crash on telemetry */ }
  }
}

export const telemetry = {
  addTransport(transport: TelemetryTransport): void {
    transports.push(transport);
  },

  debug(message: string, context?: Record<string, unknown>): void {
    log('debug', message, context);
  },

  info(message: string, context?: Record<string, unknown>): void {
    log('info', message, context);
  },

  warn(message: string, context?: Record<string, unknown>): void {
    log('warn', message, context);
  },

  error(message: string, context?: Record<string, unknown>): void {
    log('error', message, context);
  },

  captureException(error: unknown, context?: Record<string, unknown>): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    log('error', message, { ...context, stack });
  },
};
