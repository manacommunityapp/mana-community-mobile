// ── API Configuration ──────────────────────────────────────────
// Switch between dev (local Spring Boot) and prod (Lightsail) easily.

const DEV_API_URL  = 'http://3.109.145.130:8081';   // dev Lightsail (PostgreSQL-backed)
const PROD_API_URL = 'https://api.manacommunity.in';

export const CONFIG = {
  API_BASE_URL: __DEV__ ? DEV_API_URL : PROD_API_URL,
  WS_URL:       __DEV__ ? `ws://3.109.145.130:8081/ws` : `wss://api.manacommunity.in/ws`,
  APP_NAME:     'Mana Community',
  VERSION:      '1.0.0',
} as const;

// ── Theme Colors (matches your Tailwind indigo palette) ────────
export const COLORS = {
  primary:      '#4F46E5',  // indigo-600
  primaryDark:  '#3730A3',  // indigo-800
  primaryLight: '#EEF2FF',  // indigo-50
  primaryMid:   '#C7D2FE',  // indigo-200
  secondary:    '#818CF8',  // indigo-400
  accent:       '#E67E22',  // warm amber-orange (Figma accent)
  accentDark:   '#D35400',
  accentLight:  '#FFF5EB',  // amber-orange tint
  background:   '#F9FAFB',  // gray-50
  surface:      '#FFFFFF',
  surfaceAlt:   '#F3F4F6',  // gray-100
  border:       '#E5E7EB',  // gray-200
  text:         '#111827',  // gray-900
  textSecondary:'#374151',  // gray-700
  textMuted:    '#6B7280',  // gray-500
  success:      '#10B981',  // emerald-500
  successLight: '#D1FAE5',  // emerald-100
  error:        '#EF4444',  // red-500
  errorLight:   '#FEE2E2',  // red-100
  warning:      '#F59E0B',  // amber-500
  warningLight: '#FEF3C7',  // amber-100
  info:         '#3B82F6',  // blue-500
  infoLight:    '#DBEAFE',  // blue-100
} as const;

// ── Typography ─────────────────────────────────────────────────
export const FONTS = {
  regular: 'System',
  medium:  'System',
  bold:    'System',
} as const;

// ── Spacing ───────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ── Border Radius ─────────────────────────────────────────────
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// ── Shadows ───────────────────────────────────────────────────
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ── Avatar Color Palette ──────────────────────────────────────
// Used to assign distinct colors to avatars based on name hash
export const AVATAR_COLORS = [
  { bg: '#4F46E5', text: '#fff' }, // indigo
  { bg: '#059669', text: '#fff' }, // emerald
  { bg: '#D97706', text: '#fff' }, // amber
  { bg: '#DC2626', text: '#fff' }, // red
  { bg: '#7C3AED', text: '#fff' }, // violet
  { bg: '#0891B2', text: '#fff' }, // cyan
  { bg: '#DB2777', text: '#fff' }, // pink
  { bg: '#65A30D', text: '#fff' }, // lime
  { bg: '#EA580C', text: '#fff' }, // orange
  { bg: '#2563EB', text: '#fff' }, // blue
] as const;

/** Returns a stable avatar color for a given string (name, id, etc.) */
export function getAvatarColor(seed: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
