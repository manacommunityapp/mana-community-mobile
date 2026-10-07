// ── API Configuration ──────────────────────────────────────────
// Switch between dev (local Spring Boot) and prod (Lightsail) easily.

const DEV_API_URL  = "http://3.109.145.130:8081";   // dev Lightsail (PostgreSQL-backed)
const PROD_API_URL = "https://api.manacommunity.in";

export const CONFIG = {
  API_BASE_URL: __DEV__ ? DEV_API_URL : PROD_API_URL,
  WS_URL:       __DEV__ ? `ws://3.109.145.130:8081/ws` : `wss://api.manacommunity.in/ws`,
  APP_NAME:     "Mana Community",
  VERSION:      "1.0.0",
} as const;

// ── Theme Colors (matches web app Mana indigo palette) ────────
export const COLORS = {
  primary:      "#4F46E5",  // indigo-600
  primaryDark:  "#3730A3",  // indigo-800
  primaryLight: "#EEF2FF",  // indigo-50
  primaryMid:   "#C7D2FE",  // indigo-200
  secondary:    "#818CF8",  // indigo-400
  accent:       "#4F46E5",  // primary indigo
  accentDark:   "#3730A3",  // indigo-800
  accentLight:  "#EEF2FF",  // indigo-50
  background:   "#F8FAFC",  // modern slate-50 base
  backgroundAlt:"#F1F5F9",  // slate-100
  surface:      "#FFFFFF",  // white card
  surfaceAlt:   "#F8FAFC",  // soft slate surface
  surfaceCard:  "#FFFFFF",  // card surface
  border:       "rgba(99, 102, 241, 0.14)",  // refined border
  borderLight:  "rgba(99, 102, 241, 0.08)",  // subtle border
  borderSlate:  "#E2E8F0",  // slate-200 border
  text:         "#0F172A",  // slate-900 (ultra-crisp)
  textSecondary:"#475569",  // slate-600
  textMuted:    "#64748B",  // slate-500
  success:      "#10B981",  // emerald-500
  successLight: "#ECFDF5",  // emerald-50
  successDark:  "#059669",  // emerald-600
  error:        "#EF4444",  // red-500
  errorLight:   "#FEF2F2",  // red-50
  errorDark:    "#DC2626",  // red-600
  warning:      "#F59E0B",  // amber-500
  warningLight: "#FFFBEB",  // amber-50
  warningDark:  "#D97706",  // amber-600
  info:         "#06B6D4",  // cyan-500
  infoLight:    "#ECFEFF",  // cyan-50
  teal:         "#0D9488",  // teal-600
  tealLight:    "#F0FDFA",  // teal-50
  overlay:      "rgba(15, 23, 42, 0.65)", // dark obsidian backdrop
} as const;

// ── Domain-Specific Visual Themes ─────────────────────────────
export const THEMES = {
  mana: {
    primary: "#4F46E5",
    gradient: ["#4338CA", "#4F46E5", "#6366F1"] as const,
    bg: "#F8FAFC",
    card: "#FFFFFF",
    accentLight: "#EEF2FF",
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
} as const;

// ── Gradient Pairs ─────────────────────────────────────────────
export const GRADIENTS = {
  primary:     ["#4F46E5", "#6366F1"] as const,
  primaryDeep: ["#3730A3", "#4F46E5"] as const,
  hero:        ["#312E81", "#4338CA", "#4F46E5"] as const,
  warm:        ["#F59E0B", "#D97706"] as const,
  success:     ["#059669", "#10B981"] as const,
  teal:        ["#0F766E", "#0D9488"] as const,
  obsidian:    ["#0F172A", "#1E293B", "#334155"] as const,
  surface:     ["#FFFFFF", "#F8FAFC"] as const,
  card:        ["#FFFFFF", "#F8FAFC"] as const,
  avatar:      ["#6366F1", "#7C3AED"] as const,
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
  bold:           "DMSans-Bold",
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