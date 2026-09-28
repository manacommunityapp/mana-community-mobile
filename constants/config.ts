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

// ── Theme Colors (matches web app Mana indigo palette) ────────
export const COLORS = {
  primary:      '#4F46E5',  // indigo-600
  primaryDark:  '#3730A3',  // indigo-800
  primaryLight: '#EEF2FF',  // indigo-50
  primaryMid:   '#C7D2FE',  // indigo-200
  secondary:    '#818CF8',  // indigo-400
  accent:       '#4F46E5',  // primary indigo
  accentDark:   '#3730A3',  // indigo-800
  accentLight:  '#EEF2FF',  // indigo-50
  background:   '#f0f4ff',  // web --mana-bg-base
  surface:      '#FFFFFF',  // web --mana-bg-card
  surfaceAlt:   '#e8edf8',  // web --mana-bg-elevated
  border:       'rgba(99, 102, 241, 0.18)',  // web --mana-border
  borderLight:  'rgba(99, 102, 241, 0.10)',  // lighter border
  text:         '#0d0d2b',  // web --mana-text-primary
  textSecondary:'#6b7094',  // web --mana-text-muted
  textMuted:    '#6b7094',  // web --mana-text-muted
  success:      '#10B981',  // emerald-500
  successLight: '#D1FAE5',  // emerald-100
  error:        '#EF4444',  // red-500
  errorLight:   '#FEE2E2',  // red-100
  warning:      '#F59E0B',  // amber-500 (status only)
  warningLight: '#FEF9C3',  // amber-50
  info:         '#06b6d4',  // web --mana-info
  infoLight:    '#CFFAFE',  // cyan-100
  overlay:      'rgba(13, 13, 43, 0.55)', // dark overlay
} as const;

// ── Gradient Pairs ─────────────────────────────────────────────
export const GRADIENTS = {
  primary:    ['#4F46E5', '#6366F1'] as const,
  primaryDeep:['#3730A3', '#4F46E5'] as const,
  hero:       ['#4338CA', '#4F46E5', '#6366F1'] as const,
  warm:       ['#F59E0B', '#D97706'] as const,
  success:    ['#059669', '#10B981'] as const,
  surface:    ['#FFFFFF', '#f0f4ff'] as const,
  card:       ['#f8f9ff', '#FFFFFF'] as const,
} as const;

// ── Typography ─────────────────────────────────────────────────
export const FONTS = {
  // Outfit — headings, numbers, prices, display
  displayBold:    'Outfit-Bold',
  displayEB:      'Outfit-ExtraBold',
  displaySemi:    'Outfit-SemiBold',
  displayReg:     'Outfit-Regular',
  // DM Sans — body, labels, metadata
  regular:        'DMSans-Regular',
  medium:         'DMSans-Medium',
  semiBold:       'DMSans-SemiBold',
  bold:           'DMSans-Bold',
} as const;

// ── Typography Scale ──────────────────────────────────────────
export const TEXT = {
  xs:   { fontSize: 11, lineHeight: 16 },
  sm:   { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },
  md:   { fontSize: 16, lineHeight: 24 },
  lg:   { fontSize: 18, lineHeight: 26 },
  xl:   { fontSize: 20, lineHeight: 28 },
  xxl:  { fontSize: 24, lineHeight: 32 },
  xxxl: { fontSize: 28, lineHeight: 36 },
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
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

// ── Shadows ───────────────────────────────────────────────────
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

// ── Avatar Color Palette ──────────────────────────────────────
// Used to assign distinct colors to avatars based on name hash
export const AVATAR_COLORS = [
  { bg: '#4F46E5', text: '#fff' }, // indigo
  { bg: '#059669', text: '#fff' }, // emerald
  { bg: '#0891B2', text: '#fff' }, // cyan
  { bg: '#DC2626', text: '#fff' }, // red
  { bg: '#7C3AED', text: '#fff' }, // violet
  { bg: '#4338CA', text: '#fff' }, // indigo-700
  { bg: '#DB2777', text: '#fff' }, // pink
  { bg: '#65A30D', text: '#fff' }, // lime
  { bg: '#0D9488', text: '#fff' }, // teal
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
