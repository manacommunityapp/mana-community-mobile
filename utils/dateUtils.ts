import { format, formatDistanceToNow } from 'date-fns';

export function parseSafeDate(val: any): Date | null {
  if (val == null || val === '') return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (Array.isArray(val) && val.length >= 3) {
    const [y, m, d, h = 0, min = 0, s = 0] = val;
    const dt = new Date(y, m - 1, d, h, min, s);
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-').map(Number);
      const dt = new Date(year, month - 1, day);
      return isNaN(dt.getTime()) ? null : dt;
    }
    const dt = new Date(trimmed);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

export function safeFormat(val: any, formatStr: string, fallback = ''): string {
  const d = parseSafeDate(val);
  if (!d) return fallback;
  try {
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}

export function safeFormatDistanceToNow(
  val: any,
  options?: Parameters<typeof formatDistanceToNow>[1],
  fallback = ''
): string {
  const d = parseSafeDate(val);
  if (!d) return fallback;
  try {
    return formatDistanceToNow(d, options);
  } catch {
    return fallback;
  }
}

export function safeIsPast(val: any): boolean {
  const d = parseSafeDate(val);
  if (!d) return false;
  return d.getTime() < Date.now();
}

export function formatTournamentDateRange(startDateVal: any, endDateVal: any, fallback = 'Dates TBD'): string {
  const startFmt = safeFormat(startDateVal, 'dd MMM');
  const endFmt = safeFormat(endDateVal, 'dd MMM yyyy');
  if (startFmt && endFmt) {
    return `${startFmt} – ${endFmt}`;
  }
  return startFmt || endFmt || fallback;
}

