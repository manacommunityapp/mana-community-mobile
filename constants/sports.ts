export const SPORT_EMOJI: Record<string, string> = {
  CRICKET: '🏏',
  FOOTBALL: '⚽',
  BADMINTON: '🏸',
  TABLE_TENNIS: '🏓',
  PICKLEBALL: '🏓',
  TENNIS: '🎾',
  BASKETBALL: '🏀',
  VOLLEYBALL: '🏐',
  SWIMMING: '🏊',
  CHESS: '♟️',
  CARROM: '🎯',
  OTHER: '🏅',
} as const;

export const FACILITY_EMOJI: Record<string, string> = {
  BADMINTON: '🏸',
  TENNIS: '🎾',
  SWIMMING_POOL: '🏊',
  GYM: '💪',
  CRICKET: '🏏',
  FOOTBALL: '⚽',
  BASKETBALL: '🏀',
  PARTY_HALL: '🎉',
  SQUASH: '🎾',
  TABLE_TENNIS: '🏓',
  CLUBHOUSE: '🏠',
  PICKLEBALL: '🏓',
  COURT: '🏟️',
  TURF: '⚽',
  POOL: '🏊',
} as const;

export function getVenueName(
  venue?: string | { name: string; area?: string; city?: string; address?: string } | null,
): string {
  if (!venue) return '';
  if (typeof venue === 'string') return venue;
  return [venue.name, venue.area].filter(Boolean).join(', ') || venue.address || '';
}

export function getVenueDisplay(
  venue?: string | { name: string; area?: string; city?: string; address?: string } | null,
): string {
  if (!venue) return '';
  if (typeof venue === 'string') return venue;
  return [venue.name, venue.area, venue.city].filter(Boolean).join(', ') || venue.address || '';
}
