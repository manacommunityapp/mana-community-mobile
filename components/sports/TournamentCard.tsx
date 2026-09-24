import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import type { TournamentDto } from '@/types/api';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { Ionicons } from '@expo/vector-icons';

export const SPORT_EMOJI: Record<string, string> = {
  CRICKET: '🏏', FOOTBALL: '⚽', BADMINTON: '🏸',
  TABLE_TENNIS: '🏓', BASKETBALL: '🏀', VOLLEYBALL: '🏐',
  CHESS: '♟️', CARROM: '🎯', OTHER: '🏅',
};

// ── Sport-specific color accent ───────────────────────────────────────────────
const SPORT_COLOR: Record<string, { bar: string; bg: string }> = {
  CRICKET:      { bar: '#059669', bg: '#D1FAE5' },
  FOOTBALL:     { bar: '#2563EB', bg: '#DBEAFE' },
  BADMINTON:    { bar: '#7C3AED', bg: '#EDE9FE' },
  TABLE_TENNIS: { bar: '#D97706', bg: '#FEF3C7' },
  BASKETBALL:   { bar: '#DC2626', bg: '#FEE2E2' },
  VOLLEYBALL:   { bar: '#0891B2', bg: '#CFFAFE' },
  CHESS:        { bar: '#374151', bg: '#F3F4F6' },
  CARROM:       { bar: '#EA580C', bg: '#FFEDD5' },
  OTHER:        { bar: COLORS.primary, bg: COLORS.primaryLight },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
  UPCOMING:          { label: 'Upcoming',          bg: COLORS.primaryLight, text: COLORS.primary,     icon: 'time-outline' },
  REGISTRATION_OPEN: { label: 'Registration Open', bg: '#D1FAE5',          text: '#065F46',           icon: 'clipboard-outline' },
  ONGOING:           { label: 'Ongoing',           bg: '#FEF3C7',          text: '#92400E',           icon: 'play-circle-outline' },
  COMPLETED:         { label: 'Completed',         bg: COLORS.surfaceAlt,  text: COLORS.textMuted,    icon: 'checkmark-circle-outline' },
  CANCELLED:         { label: 'Cancelled',         bg: COLORS.errorLight,  text: COLORS.error,        icon: 'close-circle-outline' },
};

const FORMAT_LABEL: Record<string, string> = {
  KNOCKOUT: 'Knockout', ROUND_ROBIN: 'Round Robin',
  LEAGUE:   'League',   SWISS:       'Swiss',
};

interface TournamentCardProps {
  tournament: TournamentDto;
  compact?:   boolean;
}

export function TournamentCard({ tournament: t, compact = false }: TournamentCardProps) {
  const router    = useRouter();
  const cfg       = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.UPCOMING;
  const sportCfg  = SPORT_COLOR[t.sport] ?? SPORT_COLOR.OTHER;
  const spotsLeft = t.maxTeams - t.registeredTeamsCount;
  const fillPct   = Math.min((t.registeredTeamsCount / Math.max(t.maxTeams, 1)) * 100, 100);

  return (
    <TouchableOpacity
      style={c.card}
      onPress={() => router.push(`/sports/tournament/${t.id}`)}
      activeOpacity={0.82}
    >
      {/* Sport color accent bar */}
      <View style={[c.topBar, { backgroundColor: sportCfg.bar }]} />

      <View style={c.inner}>
        {/* Header row: sport circle + title + status badge */}
        <View style={c.header}>
          <View style={[c.sportCircle, { backgroundColor: sportCfg.bg }]}>
            <Text style={c.sportEmoji}>{SPORT_EMOJI[t.sport] ?? '🏅'}</Text>
          </View>
          <View style={c.headerText}>
            <Text style={c.name} numberOfLines={2}>{t.name}</Text>
            <Text style={c.organizer}>by {t.organizerName}</Text>
          </View>
          <View style={[c.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={10} color={cfg.text} />
            <Text style={[c.statusText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Details: only shown when not compact */}
        {!compact && (
          <View style={c.details}>
            <View style={c.detailRow}>
              <View style={c.detailIconWrap}>
                <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
              </View>
              <Text style={c.detailText}>
                {format(new Date(t.startDate), 'dd MMM')} – {format(new Date(t.endDate), 'dd MMM yyyy')}
              </Text>
            </View>
            {t.venue && (
              <View style={c.detailRow}>
                <View style={c.detailIconWrap}>
                  <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                </View>
                <Text style={c.detailText} numberOfLines={1}>{t.venue}</Text>
              </View>
            )}
            <View style={c.detailRow}>
              <View style={c.detailIconWrap}>
                <Ionicons name="git-branch-outline" size={13} color={COLORS.textMuted} />
              </View>
              <Text style={c.detailText}>
                {FORMAT_LABEL[t.format] ?? t.format} · {t.teamSize}v{t.teamSize}
              </Text>
            </View>
            {t.prizes && (
              <View style={c.detailRow}>
                <View style={c.detailIconWrap}>
                  <Ionicons name="trophy-outline" size={13} color={COLORS.warning} />
                </View>
                <Text style={[c.detailText, { color: COLORS.warning }]} numberOfLines={1}>
                  {t.prizes}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer: progress bar + team count + my-team badge */}
        <View style={c.footer}>
          {/* Progress bar */}
          <View style={c.progressTrack}>
            <View style={[c.progressFill, { width: `${fillPct}%` as any, backgroundColor: sportCfg.bar }]} />
          </View>
          <View style={c.footerRow}>
            <View style={c.teamsInfo}>
              <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
              <Text style={c.teamsText}>
                <Text style={{ fontWeight: '800', color: COLORS.text }}>{t.registeredTeamsCount}</Text>
                /{t.maxTeams} teams ({Math.round(fillPct)}%)
              </Text>
              {t.status === 'REGISTRATION_OPEN' && spotsLeft > 0 && (
                <View style={c.spotsChip}>
                  <Text style={c.spotsText}>{spotsLeft} spots left</Text>
                </View>
              )}
            </View>
            <View style={c.footerRight}>
              {t.myTeamRegistered && (
                <View style={c.registeredBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#065F46" />
                  <Text style={c.registeredText}>Registered</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
            </View>
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
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  topBar: { height: 3.5 },
  inner:  { padding: 14, gap: 10 },
  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sportCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...SHADOWS.sm,
  },
  sportEmoji:   { fontSize: 22 },
  headerText:   { flex: 1, gap: 2 },
  name:         { fontSize: 15, fontWeight: '800', color: COLORS.text, lineHeight: 20 },
  organizer:    { fontSize: 11.5, color: COLORS.textMuted, fontWeight: '500' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  statusText:   { fontSize: 10, fontWeight: '700' },
  // ── Details ───────────────────────────────────────────────────
  details: {
    gap: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIconWrap: { width: 18, alignItems: 'center' },
  detailText:   { fontSize: 12.5, color: COLORS.textMuted, flex: 1, fontWeight: '500' },
  // ── Footer ────────────────────────────────────────────────────
  footer:       { gap: 8, paddingTop: 2 },
  progressTrack: {
    height: 5,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  progressFill:  { height: '100%', borderRadius: 3 },
  footerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamsInfo:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamsText:    { fontSize: 11.5, color: COLORS.textMuted },
  spotsChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: '#FDE68A',
  },
  spotsText:    { fontSize: 9.5, fontWeight: '800', color: '#92400E' },
  footerRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  registeredText: { fontSize: 10.5, fontWeight: '800', color: '#065F46' },
});
