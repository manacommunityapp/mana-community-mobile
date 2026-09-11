import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import type { TournamentDto } from '@/types/api';
import { COLORS } from '@/constants/config';

export const SPORT_EMOJI: Record<string, string> = {
  CRICKET: '🏏', FOOTBALL: '⚽', BADMINTON: '🏸',
  TABLE_TENNIS: '🏓', BASKETBALL: '🏀', VOLLEYBALL: '🏐',
  CHESS: '♟️', CARROM: '🎯', OTHER: '🏅',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  UPCOMING:          { label: 'Upcoming',           bg: '#EEF2FF', text: COLORS.primary },
  REGISTRATION_OPEN: { label: 'Registration Open',  bg: '#D1FAE5', text: '#065F46' },
  ONGOING:           { label: 'Ongoing',             bg: '#FEF3C7', text: '#92400E' },
  COMPLETED:         { label: 'Completed',           bg: '#F3F4F6', text: COLORS.textMuted },
  CANCELLED:         { label: 'Cancelled',           bg: '#FEE2E2', text: COLORS.error },
};

const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT:    'Knockout', ROUND_ROBIN: 'Round Robin',
  LEAGUE:      'League',   SWISS:       'Swiss',
};

interface TournamentCardProps {
  tournament: TournamentDto;
  compact?:   boolean;
}

export function TournamentCard({ tournament: t, compact = false }: TournamentCardProps) {
  const router  = useRouter();
  const cfg     = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.UPCOMING;
  const spotsLeft = t.maxTeams - t.registeredTeamsCount;

  return (
    <TouchableOpacity
      style={c.card}
      onPress={() => router.push(`/sports/tournament/${t.id}`)}
      activeOpacity={0.85}
    >
      <View style={c.header}>
        <Text style={c.sportEmoji}>{SPORT_EMOJI[t.sport] ?? '🏅'}</Text>
        <View style={c.headerText}>
          <Text style={c.name} numberOfLines={2}>{t.name}</Text>
          <Text style={c.organizer}>by {t.organizerName}</Text>
        </View>
        <View style={[c.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[c.statusText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      {!compact && (
        <View style={c.details}>
          <View style={c.detailRow}>
            <Text style={c.detailIcon}>🗓</Text>
            <Text style={c.detailText}>
              {format(new Date(t.startDate), 'dd MMM')} – {format(new Date(t.endDate), 'dd MMM yyyy')}
            </Text>
          </View>
          {t.venue && (
            <View style={c.detailRow}>
              <Text style={c.detailIcon}>📍</Text>
              <Text style={c.detailText} numberOfLines={1}>{t.venue}</Text>
            </View>
          )}
          <View style={c.detailRow}>
            <Text style={c.detailIcon}>📐</Text>
            <Text style={c.detailText}>{FORMAT_LABEL[t.format]} · {t.teamSize}v{t.teamSize}</Text>
          </View>
        </View>
      )}

      <View style={c.footer}>
        <View style={c.teamsBar}>
          <View style={[c.teamsProgress, { width: `${Math.min((t.registeredTeamsCount / t.maxTeams) * 100, 100)}%` }]} />
        </View>
        <Text style={c.teamsText}>
          {t.registeredTeamsCount}/{t.maxTeams} teams
          {t.status === 'REGISTRATION_OPEN' && spotsLeft > 0
            ? ` · ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`
            : ''
          }
        </Text>

        {t.myTeamRegistered && (
          <View style={c.registeredBadge}>
            <Text style={c.registeredText}>✓ Registered</Text>
          </View>
        )}
        {t.prizes && !compact && (
          <Text style={c.prize} numberOfLines={1}>🏆 {t.prizes}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card:             { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  header:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sportEmoji:       { fontSize: 28, flexShrink: 0, marginTop: 2 },
  headerText:       { flex: 1, gap: 2 },
  name:             { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  organizer:        { fontSize: 12, color: COLORS.textMuted },
  statusBadge:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', flexShrink: 0 },
  statusText:       { fontSize: 11, fontWeight: '700' },
  details:          { gap: 5 },
  detailRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailIcon:       { fontSize: 13, width: 18 },
  detailText:       { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  footer:           { gap: 6 },
  teamsBar:         { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' },
  teamsProgress:    { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  teamsText:        { fontSize: 12, color: COLORS.textMuted },
  registeredBadge:  { backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  registeredText:   { fontSize: 11, fontWeight: '700', color: '#065F46' },
  prize:            { fontSize: 12, color: COLORS.warning, fontWeight: '500' },
});
