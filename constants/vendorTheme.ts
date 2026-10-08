import { COLORS, SHADOWS, RADIUS } from './config';

export const VENDOR_COLORS = {
  accent: '#7C3AED',
  accentDark: '#6D28D9',
  accentLight: '#EDE9FE',
  accentMid: '#A78BFA',
  heroBg: '#5B21B6',
} as const;

export const VENDOR_SHADOWS = {
  accent: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
