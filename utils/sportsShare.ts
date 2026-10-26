import { Share } from 'react-native';
import type { MatchDto, TournamentDto } from '@/types/api';
import { safeFormat } from '@/utils/dateUtils';

const SPORT_EMOJI: Record<string, string> = {
  CRICKET:      '🏏',
  FOOTBALL:     '⚽',
  BADMINTON:    '🏸',
  TABLE_TENNIS: '🏓',
  TENNIS:       '🎾',
  BASKETBALL:   '🏀',
  VOLLEYBALL:   '🏐',
  CHESS:        '♟️',
  CARROM:       '🎯',
  SQUASH:       '🎾',
  OTHER:        '🏅',
};

export function formatMatchShareText(match: MatchDto, extras?: { manOfMatch?: string }): string {
  const emoji = SPORT_EMOJI[match.sport] || '🏅';
  const sportName = match.sport ? match.sport.replace(/_/g, ' ') : 'Sports';
  const title = match.tournamentName
    ? `${emoji} ${match.tournamentName}`
    : `${emoji} ${sportName} Match`;
  const round = match.round ? `[${match.round}]` : '';

  const lines: string[] = [
    `${title} ${round}`.trim(),
    '━━━━━━━━━━━━━━━━━━━━',
  ];

  if (match.sport === 'CRICKET') {
    const homeLine = `${match.homeTeamEmoji || '🏏'} ${match.homeTeamName}: ${match.homeScore ?? 0}/${match.homeWickets ?? 0}${match.homeOvers ? ` (${match.homeOvers} ov)` : ''}`;
    const awayLine = `${match.awayTeamEmoji || '🏏'} ${match.awayTeamName}: ${match.awayScore ?? 0}/${match.awayWickets ?? 0}${match.awayOvers ? ` (${match.awayOvers} ov)` : ''}`;
    lines.push(homeLine, awayLine);
  } else if (match.sport === 'BADMINTON' || match.sport === 'TABLE_TENNIS' || match.sport === 'TENNIS') {
    const sets = match.homeSetsWon != null && match.awaySetsWon != null
      ? `Sets: ${match.homeSetsWon} - ${match.awaySetsWon}`
      : `Game Score: ${match.homeScore ?? 0} - ${match.awayScore ?? 0}`;
    lines.push(
      `${match.homeTeamEmoji || '🏸'} ${match.homeTeamName} vs ${match.awayTeamName} ${match.awayTeamEmoji || ''}`,
      sets,
    );
  } else {
    lines.push(
      `${match.homeTeamEmoji || emoji} ${match.homeTeamName} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeamName} ${match.awayTeamEmoji || ''}`,
    );
  }

  lines.push('────────────────────');

  // Match Status / Winner
  if (match.status === 'COMPLETED') {
    const winner = (match as any).winnerTeamName;
    if (winner) {
      lines.push(`🏆 Winner: ${winner}`);
    } else if (match.homeScore != null && match.awayScore != null) {
      if (match.homeScore > match.awayScore) {
        lines.push(`🏆 Winner: ${match.homeTeamName}`);
      } else if (match.awayScore > match.homeScore) {
        lines.push(`🏆 Winner: ${match.awayTeamName}`);
      } else {
        lines.push(`🤝 Match Drawn / Tied`);
      }
    } else {
      lines.push(`🏁 Match Completed`);
    }
  } else if (match.status === 'LIVE') {
    lines.push(`🔴 Currently LIVE${match.currentPeriod ? ` (${match.currentPeriod})` : ''}`);
  } else if (match.status === 'SCHEDULED' && match.scheduledAt) {
    lines.push(`📅 Scheduled: ${safeFormat(match.scheduledAt, 'dd MMM yyyy, h:mm a')}`);
  }

  if (extras?.manOfMatch) {
    lines.push(`⭐ Player of the Match: ${extras.manOfMatch}`);
  }

  const venueStr = typeof match.venue === 'object' && match.venue !== null
    ? [(match.venue as any).name, (match.venue as any).area].filter(Boolean).join(', ')
    : typeof match.venue === 'string' ? match.venue : '';

  if (venueStr) {
    lines.push(`📍 Venue: ${venueStr}`);
  }

  lines.push('', '📲 Shared via Mana Community App');
  return lines.join('\n');
}

export async function shareMatch(match: MatchDto, extras?: { manOfMatch?: string }): Promise<void> {
  const text = formatMatchShareText(match, extras);
  await Share.share({
    message: text,
    title: `${match.tournamentName || match.sport} Result`,
  });
}

export function formatTournamentShareText(tournament: TournamentDto, winnerTeam?: string): string {
  const emoji = SPORT_EMOJI[tournament.sport] || '🏅';
  const lines: string[] = [
    `${emoji} ${tournament.name}`,
    `Sport: ${(tournament.sport || 'Sports').replace(/_/g, ' ')} (${tournament.format || 'Tournament'})`,
    '━━━━━━━━━━━━━━━━━━━━',
  ];

  if (winnerTeam) {
    lines.push(`👑 Champion: ${winnerTeam}`);
  } else if (tournament.status === 'REGISTRATION_OPEN') {
    lines.push(`⚡ Registrations OPEN!`);
    lines.push(`👥 Max Teams: ${tournament.maxTeams} (${tournament.registeredTeamsCount || 0} registered)`);
    if (tournament.registrationDeadline) {
      lines.push(`⏰ Register by: ${safeFormat(tournament.registrationDeadline, 'dd MMM, h:mm a')}`);
    }
  } else if (tournament.status === 'ONGOING') {
    lines.push(`🔥 Matches Ongoing`);
  }

  const venueStr = typeof tournament.venue === 'object' && tournament.venue !== null
    ? [(tournament.venue as any).name, (tournament.venue as any).area].filter(Boolean).join(', ')
    : typeof tournament.venue === 'string' ? tournament.venue : '';

  if (venueStr) {
    lines.push(`📍 Venue: ${venueStr}`);
  }

  if (tournament.organizerName) {
    lines.push(`Organized by: ${tournament.organizerName}`);
  }

  lines.push('', '🏆 Join & track fixtures on Mana Community App');
  return lines.join('\n');
}

export async function shareTournament(tournament: TournamentDto, winnerTeam?: string): Promise<void> {
  const text = formatTournamentShareText(tournament, winnerTeam);
  await Share.share({
    message: text,
    title: tournament.name,
  });
}
