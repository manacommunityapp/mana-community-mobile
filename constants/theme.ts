// ── Mana Community Design System (Stitch Lavender-White + Midnight Dark) ───────
export type ThemeMode = 'light' | 'dark';

export interface ManaThemePalette {
  mode: ThemeMode;
  isDark: boolean;
  appBg: string;
  appBgEnd: string;
  surface: string;
  surfaceSubtle: string;
  surfaceMuted: string;
  surfaceGlass: string;
  border: string;
  borderLight: string;
  borderHighlight: string;
  primary: string;
  primaryMid: string;
  primaryGradient: readonly [string, string];
  primaryLight: string;
  primaryBorder: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  eyebrow: string;
  link: string;
  success: string;
  successLight: string;
  successGradient: readonly [string, string];
  danger: string;
  dangerLight: string;
  dangerGradient: readonly [string, string];
  warning: string;
  warningLight: string;
  highlightCardBg: string;
  highlightCardBorder: string;
  dockBg: string;
  dockBorder: string;
  dockInactiveIcon: string;
  overlay: string;
  statusBar: 'dark' | 'light';
}

export const LIGHT_PALETTE: ManaThemePalette = {
  mode: 'light',
  isDark: false,
  appBg: '#FAF8FF',
  appBgEnd: '#F2F3FF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F2F3FF',
  surfaceMuted: '#EAEDFF',
  surfaceGlass: '#FFFFFF',
  border: '#C3C6D7',
  borderLight: '#E2E7FF',
  borderHighlight: '#FEA61999',
  primary: '#004AC6',
  primaryMid: '#2563EB',
  primaryGradient: ['#004AC6', '#2563EB'] as const,
  primaryLight: '#DBE1FF',
  primaryBorder: '#B4C5FF',
  accent: '#2563EB',
  text: '#131B2E',
  textSecondary: '#434655',
  textMuted: '#737686',
  eyebrow: '#434655',
  link: '#004AC6',
  success: '#006247',
  successLight: '#E3FFF4',
  successGradient: ['#006247', '#007D5C'] as const,
  danger: '#BA1A1A',
  dangerLight: '#FFDAD6',
  dangerGradient: ['#BA1A1A', '#DC2626'] as const,
  warning: '#855300',
  warningLight: '#FFDDB8',
  highlightCardBg: '#131B2E',
  highlightCardBorder: '#2563EB66',
  dockBg: '#FFFFFF',
  dockBorder: '#E2E7FF',
  dockInactiveIcon: '#737686',
  overlay: 'rgba(19, 27, 46, 0.56)',
  statusBar: 'dark',
};

export const DARK_PALETTE: ManaThemePalette = {
  mode: 'dark',
  isDark: true,
  appBg: '#06081A',
  appBgEnd: '#0B0F2E',
  surface: '#111638',
  surfaceSubtle: '#171E48',
  surfaceMuted: '#1E2656',
  surfaceGlass: '#141B42',
  border: 'rgba(129, 140, 248, 0.22)',
  borderLight: 'rgba(129, 140, 248, 0.12)',
  borderHighlight: 'rgba(254, 166, 25, 0.55)',
  primary: '#2563EB',
  primaryMid: '#4F46E5',
  primaryGradient: ['#1D4ED8', '#6366F1'] as const,
  primaryLight: 'rgba(37, 99, 235, 0.20)',
  primaryBorder: 'rgba(129, 140, 248, 0.38)',
  accent: '#818CF8',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  eyebrow: '#94A3B8',
  link: '#93C5FD',
  success: '#2FE0AA',
  successLight: 'rgba(0, 125, 92, 0.22)',
  successGradient: ['#006247', '#007D5C'] as const,
  danger: '#F87171',
  dangerLight: 'rgba(186, 26, 26, 0.24)',
  dangerGradient: ['#BA1A1A', '#DC2626'] as const,
  warning: '#FFB95F',
  warningLight: 'rgba(254, 166, 25, 0.18)',
  highlightCardBg: '#161B47',
  highlightCardBorder: 'rgba(129, 140, 248, 0.34)',
  dockBg: '#111638',
  dockBorder: 'rgba(129, 140, 248, 0.25)',
  dockInactiveIcon: '#94A3B8',
  overlay: 'rgba(2, 4, 16, 0.78)',
  statusBar: 'light',
};

export function getPalette(mode: ThemeMode): ManaThemePalette {
  return mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

// Backward-compatible static THEME alias used across screens
export const THEME = {
  brand:         "#2563EB",  // Cobalt Primary Container
  brandDark:     "#004AC6",  // Deep Cobalt Primary
  brandLight:    "#DBE1FF",  // Primary Fixed tint
  brandBorder:   "#B4C5FF",  // Primary Fixed Dim border
  loss:          "#BA1A1A",  // Error Crimson
  lossDark:      "#93000A",
  lossLight:     "#FFDAD6",
  lossBorder:    "#FCA5A5",
  surface:       "#FFFFFF",  // Surface Container Lowest
  surfaceSubtle: "#F2F3FF",  // Surface Container Low
  surfaceMuted:  "#EAEDFF",  // Surface Container
  background:    "#FAF8FF",  // Stitch Lavender-White Background
  backgroundAlt: "#F2F3FF",  // Secondary background
  headerBg:      "#FAF8FF",  // Stitch Header Surface
  headerBorder:  "#E2E7FF",  // Surface Container High border
  border:        "#E2E7FF",  // Hairline border
  borderMedium:  "#C3C6D7",  // Outline Variant
  textPrimary:   "#131B2E",  // On-Surface deep navy
  textSecondary: "#434655",  // On-Surface Variant
  textMuted:     "#737686",  // Outline muted text
  indigo:        "#2563EB",  // Cobalt accent
  indigoLight:   "#DBE1FF",
  amber:         "#FEA619",  // Secondary Container amber
  amberLight:    "#FFDDB8",
  text:          "#131B2E",
  muted:         "#737686",
  primary:       "#004AC6",
  card:          "#FFFFFF",  // card surface alias
} as const;

export default THEME;
