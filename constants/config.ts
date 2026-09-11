// ── API Configuration ──────────────────────────────────────────
// Switch between dev (local Spring Boot) and prod (Lightsail) easily.

const DEV_API_URL  = 'http://192.168.1.x:8082';   // ← replace with your local IP when testing
const PROD_API_URL = 'https://api.manacommunity.in'; // ← replace with your production domain

export const CONFIG = {
  API_BASE_URL: __DEV__ ? DEV_API_URL : PROD_API_URL,
  WS_URL:       __DEV__ ? `ws://192.168.1.x:8082/ws` : `wss://api.manacommunity.in/ws`,
  APP_NAME:     'Mana Community',
  VERSION:      '1.0.0',
} as const;

// ── Theme Colors (matches your Tailwind indigo palette) ────────
export const COLORS = {
  primary:    '#4F46E5',  // indigo-600
  primaryDark:'#3730A3',  // indigo-800
  secondary:  '#818CF8',  // indigo-400
  background: '#F9FAFB',  // gray-50
  surface:    '#FFFFFF',
  border:     '#E5E7EB',  // gray-200
  text:       '#111827',  // gray-900
  textMuted:  '#6B7280',  // gray-500
  success:    '#10B981',  // emerald-500
  error:      '#EF4444',  // red-500
  warning:    '#F59E0B',  // amber-500
} as const;

// ── Typography ─────────────────────────────────────────────────
export const FONTS = {
  regular: 'System',
  medium:  'System',
  bold:    'System',
} as const;
