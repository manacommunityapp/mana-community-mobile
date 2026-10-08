import { COLORS, SHADOWS, RADIUS } from './config';

export const ADMIN_COLORS = {
  accent: '#DC2626',
  accentDark: '#B91C1C',
  accentLight: '#FEE2E2',
  accentMid: '#F87171',
  heroBg: '#991B1B',
} as const;

export const ADMIN_SHADOWS = {
  accent: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
