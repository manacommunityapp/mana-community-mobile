import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS } from '@/constants/config';
import { SPORT_EMOJI } from '@/components/sports/TournamentCard';
import type { TeamDto } from '@/types/api';

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pending Approval', color: COLORS.warning,   bg: '#FEF3C7' },
  APPROVED:   { label: 'Active',           color: COLORS.success,   bg: '#D1FAE5' },
  ELIMINATED: { label: 'Eliminated',       color: COLORS.textMuted, bg: '#F3F4F6' },
  WINNER:     { label: '🏆 Winner',        color: '#92400E',        bg: '#FEF3C7' },
  RUNNER_UP:  { label: '🥈 Runner-up',     color: COLORS.primary,   bg: '#EEF2FF' },
};

function TeamCard({
  team,
  onLeave,
  onDissolve,
}: { team: TeamDto; onLeave: (t: TeamDto) => void; onDissolve: (t: TeamDto) => void }) {
  const router  = useRouter();
  const badge   = STATUS_BADGE[team.status] ?? STATUS_BADGE.PENDING;

  return (
    <View style={c.card}>
      <View style={c.header}>
        <Text style={c.emoji}>{team.logoEmoji}</Text>
        <View style={c.headerInfo}>
          <Text style={c.name}>{team.name}</Text>
          <Text style={c.sport}>{SPORT_EMOJI[team.sport]} {team.sport.replace('_', ' ')}</Text>
          {team.isCaptain && (
            <View style={c.captainBadge}><Text style={c.captainText}>⚡ Captain</Text></View>
          )}
        </View>
        <View style={[c.statusBadge, { backgroundColor: badge.bg }]}>
          <Text style={[c.statusText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Members */}
      <View style={c.membersRow}>
        {team.members.slice(0, 6).map((m) => (
          <View key={m.userId} style={c.member}>
            <Text style={c.memberInitial}>{m.name[0]}</Text>
          </View>
        ))}
        {team.members.length > 6 && (
          <View style={[c.member, c.memberMore]}>
            <Text style={c.memberMoreText}>+{team.members.length - 6}</Text>
          </View>
        )}
        <Text style={c.memberCount}>{team.members.length} players</Text>
      </View>

      {/* Record */}
      {(team.wins + team.losses + team.draws) > 0 && (
        <View style={c.record}>
          <View style={c.recordStat}><Text style={c.recordNum}>{team.wins}</Text><Text style={c.recordLabel}>W</Text></View>
          <View style={c.recordStat}><Text style={c.recordNum}>{team.draws}</Text><Text style={c.recordLabel}>D</Text></View>
          <View style={c.recordStat}><Text style={c.recordNum}>{team.losses}</Text><Text style={c.recordLabel}>L</Text></View>
          <View style={c.recordStat}><Text style={[c.recordNum, { color: COLORS.primary }]}>{team.points}</Text><Text style={c.recordLabel}>Pts</Text></View>
        </View>
      )}

      {/* Actions */}
      <View style={c.actions}>
        <TouchableOpacity
          style={c.actionBtn}
          onPress={() => router.push(`/sports/tournament/${team.tournamentId}`)}
        >
          <Text style={c.actionText}>View Tournament</Text>
        </TouchableOpacity>
        {team.isCaptain ? (
          <TouchableOpacity
            style={[c.actionBtn, c.actionBtnDanger]}
            onPress={() => onDissolve(team)}
          >
            <Text style={[c.actionText, { color: COLORS.error }]}>Dissolve Team</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[c.actionBtn, c.actionBtnDanger]}
            onPress={() => onLeave(team)}
          >
            <Text style={[c.actionText, { color: COLORS.error }]}>Leave Team</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const c = StyleSheet.create({
  card:           { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 12, marginVertical: 5 },
  header:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  emoji:          { fontSize: 30, flexShrink: 0 },
  headerInfo:     { flex: 1, gap: 3 },
  name:           { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sport:          { fontSize: 12, color: COLORS.textMuted },
  captainBadge:   { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  captainText:    { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  statusBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', flexShrink: 0 },
  statusText:     { fontSize: 11, fontWeight: '700' },
  membersRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  member:         { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface },
  memberInitial:  { color: '#fff', fontWeight: '700', fontSize: 12 },
  memberMore:     { backgroundColor: '#F3F4F6', borderColor: COLORS.border },
  memberMoreText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  memberCount:    { fontSize: 12, color: COLORS.textMuted, marginLeft: 4 },
  record:         { flexDirection: 'row', gap: 16, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10 },
  recordStat:     { alignItems: 'center', flex: 1 },
  recordNum:      { fontSize: 20, fontWeight: '800', color: COLORS.text },
  recordLabel:    { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  actions:        { flexDirection: 'row', gap: 10 },
  actionBtn:      { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  actionBtnDanger:{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  actionText:     { fontSize: 13, fontWeight: '600', color: COLORS.text },
});

// ── Screen ─────────────────────────────────────────────────────
export default function MyTeamsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const { data: teams = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-teams'],
    queryFn:  sportsService.getMyTeams,
  });

  const leaveMutation   = useMutation({ mutationFn: (id: number) => sportsService.leaveTeam(id),   onSuccess: () => qc.invalidateQueries({ queryKey: ['my-teams'] }) });
  const dissolveMutation = useMutation({ mutationFn: (id: number) => sportsService.dissolveTeam(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['my-teams'] }) });

  const handleLeave   = (t: TeamDto) => Alert.alert('Leave Team', `Leave "${t.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate(t.id) },
  ]);
  const handleDissolve = (t: TeamDto) => Alert.alert('Dissolve Team', `Permanently dissolve "${t.name}"? All members will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Dissolve', style: 'destructive', onPress: () => dissolveMutation.mutate(t.id) },
  ]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>My Teams</Text>
        <TouchableOpacity style={s.joinBtn} onPress={() => router.push('/sports/tournaments')}>
          <Text style={s.joinBtnText}>+ Join</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(t) => String(t.id)}
          renderItem={({ item }) => <TeamCard team={item} onLeave={handleLeave} onDissolve={handleDissolve} />}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>👥</Text>
              <Text style={s.emptyTitle}>No teams yet</Text>
              <Text style={s.emptySub}>Join a tournament and register your team.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/sports/tournaments')}>
                <Text style={s.emptyBtnText}>Browse Tournaments</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:         { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:        { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  joinBtn:      { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  joinBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty:        { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySub:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn:     { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
