/**
 * Playo Design System & Theme Tokens
 * Extracted and adapted from https://playo.co/
 */
export const PLAYO_THEME = {
  colors: {
    primary: "#00B562",       // Playo Signature Sports Green
    primaryDark: "#00914E",   // Playo Dark Green / Button shadow
    primaryLight: "#E6F8F0",  // Playo Soft Green Glow / Tint
    primaryHover: "#15803D",  // Deep active green
    surface: "#F1F3F2",       // Playo Court Background (warm muted grey)
    background: "#FFFFFF",    // Clean Card White
    textMain: "#3B4540",      // Deep Forest Slate Text
    textMuted: "#758A80",     // Sage Muted Grey Text
    borderSubtle: "#E3E8E6",  // Subtle Card & Pill Border
    borderDivider: "#E5E7EB", // Standard Gray Divider
    liveRed: "#EF4444",       // Match Live Red indicator
    warningAmber: "#F59E0B",  // Karma / Karma Points Gold
  },
  shadows: {
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    pill: {
      shadowColor: "#D6D6DB",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.8,
      shadowRadius: 2,
      elevation: 2,
    },
    buttonGreen: {
      shadowColor: "#00914E",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    }
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
};

export const POPULAR_SPORTS = [
  {
    id: "badminton",
    name: "Badminton",
    emoji: "🏸",
    activePlayers: 48,
    courtsAvailable: 4,
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80",
  },
  {
    id: "cricket",
    name: "Box Cricket",
    emoji: "🏏",
    activePlayers: 64,
    courtsAvailable: 2,
    imageUrl: "https://images.unsplash.com/photo-1531415074868-036b1c5d53ec?w=400&q=80",
  },
  {
    id: "pickleball",
    name: "Pickleball",
    emoji: "🏓",
    activePlayers: 28,
    courtsAvailable: 2,
    imageUrl: "https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=400&q=80",
  },
  {
    id: "football",
    name: "Football / Turf",
    emoji: "⚽",
    activePlayers: 36,
    courtsAvailable: 1,
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&q=80",
  },
  {
    id: "swimming",
    name: "Swimming",
    emoji: "🏊",
    activePlayers: 22,
    courtsAvailable: 2,
    imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&q=80",
  },
  {
    id: "tennis",
    name: "Lawn Tennis",
    emoji: "🎾",
    activePlayers: 18,
    courtsAvailable: 2,
    imageUrl: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&q=80",
  },
  {
    id: "basketball",
    name: "Basketball",
    emoji: "🏀",
    activePlayers: 30,
    courtsAvailable: 1,
    imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=80",
  },
  {
    id: "table-tennis",
    name: "Table Tennis",
    emoji: "🏓",
    activePlayers: 16,
    courtsAvailable: 3,
    imageUrl: "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=400&q=80",
  }
];