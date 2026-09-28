import { COLORS, SHADOWS, RADIUS } from './config';

export const GUARD_COLORS = {
  accent: '#0891B2',
  accentDark: '#0E7490',
  accentLight: '#CFFAFE',
  accentMid: '#67E8F9',
  heroBg: '#0E7490',
} as const;

export const GUARD_SHADOWS = {
  accent: {
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
