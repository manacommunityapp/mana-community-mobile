import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import type { TournamentDto } from '@/types/api';

export const SPORT_EMOJI: Record<string, string> = {
  CRICKET: '🏏', FOOTBALL: '⚽', BADMINTON: '🏸',
  TABLE_TENNIS: '🏓', BASKETBALL: '🏀', VOLLEYBALL: '🏐',
  CHESS: '♟️', CARROM: '🎯', TENNIS: '🎾', SWIMMING: '🏊',
  PICKLEBALL: '🏓', OTHER: '🏅',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  UPCOMING:          { label: 'Upcoming',    bg: '#EEF2FF', text: '#4F46E5', dot: '#818CF8' },
  REGISTRATION_OPEN: { label: 'Registering', bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  ONGOING:           { label: 'Live Now',    bg: '#FEE2E2', text: '#DC2626', dot: '#EF4444' },
  COMPLETED:         { label: 'Completed',   bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' },
  CANCELLED:         { label: 'Cancelled',   bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
};

const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT: 'Knockout', ROUND_ROBIN: 'Round Robin', LEAGUE: 'League', SWISS: 'Swiss',
};

function getSportStr(sport: any): string {
  if (!sport) return 'OTHER';
  if (typeof sport === 'object') return (sport.name ?? '').toUpperCase();
  return String(sport).toUpperCase();
}

interface TournamentCardProps {
  tournament: TournamentDto;
  compact?: boolean;
}

export function TournamentCard({ tournament: t }: TournamentCardProps) {
  const router   = useRouter();
  const sportStr = getSportStr(t.sport);
  const cfg      = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.UPCOMING;
  const emoji    = SPORT_EMOJI[sportStr] ?? '🏅';
  const isLive   = t.status === 'ONGOING';

  const dateLabel = (() => {
    if (!(t as any).startDate) return null;
    const start = new Date((t as any).startDate);
    const end   = (t as any).endDate ? new Date((t as any).endDate) : null;
    const fmt   = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
  })();

  const venueStr = (() => {
    if (!t.venue) return null;
    if (typeof t.venue === 'object') {
      return [(t.venue as any).name, (t.venue as any).area].filter(Boolean).join(', ')
          || (t.venue as any).address || null;
    }
    return String(t.venue);
  })();

  const maxTeams = t.maxTeams ?? (t as any).maxParticipants ?? 0;
  const regCount = t.registeredTeamsCount ?? (t as any).currentParticipants ?? 0;

  return (
    <TouchableOpacity
      style={c.card}
      onPress={() => router.push(`/sports/tournament/${t.id}`)}
      activeOpacity={0.82}
    >
      {/* Left sport stripe */}
      <View style={c.row}>
        <View style={c.emojiCol}>
          <Text style={c.emoji}>{emoji}</Text>
        </View>

        <View style={c.body}>
          {/* Name row */}
          <View style={c.nameRow}>
            <Text style={c.name} numberOfLines={2}>{t.name}</Text>
            <View style={[c.badge, { backgroundColor: cfg.bg }]}>
              {isLive && <View style={[c.dot, { backgroundColor: cfg.dot }]} />}
              <Text style={[c.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
            </View>
          </View>

          {/* Organizer */}
          {t.organizerName ? (
            <Text style={c.organizer} numberOfLines={1}>by {t.organizerName}</Text>
          ) : null}

          {/* Meta row */}
          <View style={c.metaRow}>
            {t.format ? (
              <View style={c.chip}>
                <Ionicons name="git-branch-outline" size={9} color={COLORS.textMuted} />
                <Text style={c.chipText}>{FORMAT_LABEL[t.format] ?? t.format}</Text>
              </View>
            ) : null}
            {dateLabel ? (
              <View style={c.chip}>
                <Ionicons name="calendar-outline" size={9} color={COLORS.textMuted} />
                <Text style={c.chipText}>{dateLabel}</Text>
              </View>
            ) : null}
            {venueStr ? (
              <View style={c.chip}>
                <Ionicons name="location-outline" size={9} color={COLORS.textMuted} />
                <Text style={c.chipText} numberOfLines={1}>{venueStr}</Text>
              </View>
            ) : null}
            {maxTeams > 0 ? (
              <View style={c.chip}>
                <Ionicons name="people-outline" size={9} color={COLORS.textMuted} />
                <Text style={c.chipText}>{regCount}/{maxTeams} teams</Text>
              </View>
            ) : null}
          </View>

          {/* Registered badge or view-details link */}
          <View style={c.footer}>
            {t.myTeamRegistered ? (
              <View style={c.registeredBadge}>
                <Ionicons name="checkmark-circle" size={11} color="#065F46" />
                <Text style={c.registeredText}>Your team is in</Text>
              </View>
            ) : (
              <Text style={c.viewLink}>View Details</Text>
            )}
            <Ionicons name="chevron-forward" size={13} color={COLORS.textMuted} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const c = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  row: { flexDirection: 'row' },

  emojiCol: {
    width: 48, alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: 14, backgroundColor: COLORS.surfaceAlt,
  },
  emoji: { fontSize: 22 },

  body: { flex: 1, padding: 12, gap: 6 },

  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.text, lineHeight: 19 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3,
    alignSelf: 'flex-start', flexShrink: 0,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '800' },

  organizer: { fontSize: 10.5, color: COLORS.textMuted, fontWeight: '500' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 9.5, fontWeight: '600', color: COLORS.textMuted },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  registeredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  registeredText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  viewLink: { fontSize: 10.5, fontWeight: '700', color: COLORS.primary },
});
