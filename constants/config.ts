export * from './theme';
// ── API Configuration ──────────────────────────────────────────
// Switch between dev (local Spring Boot) and prod (Lightsail) easily.

const DEFAULT_API_URL = "http://3.111.198.165:8081";
const DEFAULT_WS_URL  = "ws://3.111.198.165:8081/ws";

const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
const WS_URL: string       = process.env.EXPO_PUBLIC_WS_URL || DEFAULT_WS_URL;

export const CONFIG = {
  N8N_AI_WEBHOOK_URL: process.env.EXPO_PUBLIC_N8N_AI_WEBHOOK_URL || "",
  API_BASE_URL,
  WS_URL,
  APP_NAME:     "Mana Community",
  VERSION:      "1.0.0",

  // ── Flight affiliate IDs (replace with real IDs once registered) ──
  // EaseMyTrip: register at b2b.easemytrip.com (affiliate division)
  // MakeMyTrip: register at commission.makemytrip.com
  FLIGHT_AFFILIATE: {
    EMT_AFFILIATE_ID: "MANA_COMMUNITY",
    MMT_CAMPAIGN_ID:  "affiliate_mana",
  },
} as const;

// ── Theme Colors (Stitch Lavender-White + Cobalt Button Palette) ──────
export const COLORS = {
  primary:      "#004AC6",  // cobalt primary
  primaryDark:  "#003EA8",  // deep cobalt
  primaryLight: "#DBE1FF",  // primary-fixed tint
  primaryMid:   "#B4C5FF",  // primary-fixed-dim border/mid
  secondary:    "#2563EB",  // primary-container
  accent:       "#004AC6",  // primary cobalt
  accentDark:   "#003EA8",
  accentLight:  "#DBE1FF",
  background:   "#FAF8FF",  // Stitch lavender-white surface/background
  backgroundAlt:"#F2F3FF",  // surface-container-low
  surface:      "#FFFFFF",  // surface-container-lowest
  surfaceAlt:   "#F2F3FF",  // surface-container-low
  surfaceCard:  "#FFFFFF",  // card surface
  white:        "#FFFFFF",  // alias for surface
  card:         "#FFFFFF",  // alias for surfaceCard
  border:       "#E2E7FF",  // surface-container-high hairline border
  borderLight:  "#EAEDFF",  // subtle border
  borderSlate:  "#C3C6D7",  // outline-variant hairline
  text:         "#131B2E",  // on-surface deep navy
  textSecondary:"#434655",  // on-surface-variant
  textMuted:    "#737686",  // outline muted
  success:      "#006247",  // tertiary emerald
  successLight: "#E3FFF4",  // mint surface
  successDark:  "#00513B",  // deep emerald
  error:        "#BA1A1A",  // error red
  errorLight:   "#FFDAD6",  // error-container
  errorDark:    "#93000A",  // on-error-container
  warning:      "#855300",  // secondary amber ink
  warningLight: "#FFDDB8",  // secondary-fixed
  warningDark:  "#653E00",
  info:         "#2563EB",
  infoLight:    "#DBE1FF",
  teal:         "#007D5C",  // tertiary-container
  tealLight:    "#E3FFF4",
  overlay:      "rgba(19, 27, 46, 0.58)", // midnight backdrop
} as const;

// ── Domain-Specific Visual Themes ─────────────────────────────
export const THEMES = {
  mana: {
    primary: "#004AC6",
    gradient: ["#004AC6", "#2563EB", "#4F46E5"] as const,
    bg: "#FAF8FF",
    card: "#FFFFFF",
    accentLight: "#DBE1FF",
  },
  finance: {
    heroDark: ["#0F172A", "#1E293B"] as const,
    emerald: "#10B981",
    emeraldGradient: ["#059669", "#10B981"] as const,
    gold: "#F59E0B",
    card: "#FFFFFF",
    bg: "#F8FAFC",
  },
  health: {
    teal: "#0D9488",
    tealGradient: ["#0F766E", "#0D9488", "#14B8A6"] as const,
    mintBg: "#F0FDFA",
    mintBorder: "#99F6E4",
    verifiedBlue: "#2563EB",
  },
  projects: {
    purple: "#7C3AED",
    purpleGradient: ["#6D28D9", "#7C3AED"] as const,
    accentLight: "#F5F3FF",
  },
  commerce: {
    amber: "#D97706",
    amberGradient: ["#D97706", "#F59E0B"] as const,
    accentLight: "#FEF3C7",
  },
  wellness: {
    primary: "#10B981",
    primaryDark: "#059669",
    gradient: ["#059669", "#10B981", "#34D399"] as const,
    bg: "#ECFDF5",
    bgSubtle: "#F0FDF4",
    card: "#FFFFFF",
    accentLight: "#D1FAE5",
    accentBorder: "#A7F3D0",
    orange: "#F97316",
    orangeLight: "#FFF7ED",
    blue: "#3B82F6",
    blueLight: "#EFF6FF",
    purple: "#8B5CF6",
    purpleLight: "#F5F3FF",
    rose: "#F43F5E",
    roseLight: "#FFF1F2",
  },
} as const;

// ── Gradient Pairs ─────────────────────────────────────────────
export const GRADIENTS = {
  primary:     ["#004AC6", "#2563EB"] as const,
  primaryDeep: ["#003EA8", "#004AC6"] as const,
  brandAvatar: ["#004AC6", "#2563EB"] as const,
  hero:        ["#00174B", "#004AC6", "#2563EB"] as const,
  warm:        ["#FEA619", "#855300"] as const,
  success:     ["#006247", "#007D5C"] as const,
  teal:        ["#006247", "#007D5C"] as const,
  obsidian:    ["#06081A", "#0B0F2E", "#161B47"] as const,
  surface:     ["#FFFFFF", "#F2F3FF"] as const,
  card:        ["#FFFFFF", "#F2F3FF"] as const,
  avatar:      ["#004AC6", "#2563EB"] as const,
} as const;

// ── Typography ─────────────────────────────────────────────────
export const FONTS = {
  // Outfit — headings, numbers, prices, display
  displayBold:    "Outfit-Bold",
  displayEB:      "Outfit-ExtraBold",
  displaySemi:    "Outfit-SemiBold",
  displayReg:     "Outfit-Regular",
  // DM Sans — body, labels, metadata
  regular:        "DMSans-Regular",
  medium:         "DMSans-Medium",
  semiBold:       "DMSans-SemiBold",
  semibold:       "DMSans-SemiBold",  // alias (case-insensitive compat)
  bold:           "DMSans-Bold",
  // Typography scale objects — use as spreads in StyleSheet: { ...FONTS.sm, color: X }
  xs:   { fontSize: 11, lineHeight: 16 },
  sm:   { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },
  body: { fontSize: 14, lineHeight: 20 },
  heading: { fontSize: 18, lineHeight: 26 },
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  squircle: 18,
  xxl: 28,
  full: 9999,
} as const;

// ── Shadows (Multi-Layer Ambient & Directional Depth) ──────────
export const SHADOWS = {
  sm: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  primary: {
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonGlow: {
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  authCard: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
  },
  glowTeal: {
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  glowEmerald: {
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 5,
  },
  // Aliases
  small: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  xs: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
} as const;

// ── Avatar Color Palette ──────────────────────────────────────
export const AVATAR_COLORS = [
  { bg: "#4F46E5", text: "#fff" }, // indigo
  { bg: "#059669", text: "#fff" }, // emerald
  { bg: "#0891B2", text: "#fff" }, // cyan
  { bg: "#DC2626", text: "#fff" }, // red
  { bg: "#7C3AED", text: "#fff" }, // violet
  { bg: "#4338CA", text: "#fff" }, // indigo-700
  { bg: "#DB2777", text: "#fff" }, // pink
  { bg: "#65A30D", text: "#fff" }, // lime
  { bg: "#0D9488", text: "#fff" }, // teal
  { bg: "#2563EB", text: "#fff" }, // blue
] as const;

export function getAvatarColor(seed: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name?: string | null): string {
  if (!name || typeof name !== "string") return "U";
  const clean = name.trim();
  if (!clean) return "U";
  const nameOnly = clean.includes("@") ? clean.split("@")[0] : clean;
  const parts = nameOnly
    .split(/[\s._\-@,/]+/)
    .map((p) => p.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((p) => p.length > 0);
  if (parts.length === 0) return "U";
  if (parts.length === 1) {
    const word = parts[0];
    const camelParts = word.match(/[A-Z][a-z0-9]*/g);
    if (camelParts && camelParts.length >= 2) {
      return (camelParts[0].charAt(0) + camelParts[camelParts.length - 1].charAt(0)).toUpperCase();
    }
    return word.charAt(0).toUpperCase();
  }
  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
}