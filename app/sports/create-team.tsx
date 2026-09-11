import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS } from '@/constants/config';
import { SPORT_EMOJI } from '@/components/sports/TournamentCard';
import api from '@/services/apiClient';
import type { UserProfileResponse } from '@/types/api';

const LOGO_EMOJIS = ['⚽','🏏','🏸','🏓','🏀','🏐','♟️','🎯','🦁','🐯','🦅','🔥','⚡','🌟','🏆','💪'];

export default function CreateTeamScreen() {
  const { tournamentId } = useLocalSearchParams<{ tournamentId: string }>();
  const router = useRouter();
  const qc     = useQueryClient();

  const [teamName,  setTeamName]  = useState('');
  const [logoEmoji, setLogoEmoji] = useState('⚽');
  const [memberIds, setMemberIds] = useState<number[]>([]);
  const [search,    setSearch]    = useState('');

  const { data: tournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn:  () => sportsService.getTournament(Number(tournamentId)),
    enabled:  !!tournamentId,
  });

  // Search community members
  const { data: memberResults = [] } = useQuery({
    queryKey: ['member-search', search],
    queryFn:  async () => {
      if (!search.trim()) return [];
      const res = await api.get<UserProfileResponse[]>('/users/search', { params: { q: search, size: 10 } });
      return res.data;
    },
    enabled: search.trim().length >= 2,
  });

  const createMutation = useMutation({
    mutationFn: () => sportsService.registerTeam({
      teamName:      teamName.trim(),
      tournamentId:  Number(tournamentId),
      memberUserIds: memberIds,
      logoEmoji,
    }),
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ['my-teams'] });
      qc.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      Alert.alert('Team Registered!', `"${team.name}" has been submitted for approval.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to register team.'),
  });

  const toggleMember = (userId: number) => {
    setMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const maxMembers  = tournament?.teamSize ?? 11;
  const canSubmit   = teamName.trim().length > 0 && memberIds.length > 0 && memberIds.length <= maxMembers;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Register Team</Text>
        <TouchableOpacity onPress={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
          {createMutation.isPending
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={[s.save, !canSubmit && s.saveDisabled]}>Submit</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Tournament info */}
          {tournament && (
            <View style={s.tournamentCard}>
              <Text style={s.tournamentEmoji}>{SPORT_EMOJI[tournament.sport]}</Text>
              <View style={s.tournamentInfo}>
                <Text style={s.tournamentName}>{tournament.name}</Text>
                <Text style={s.tournamentMeta}>
                  {tournament.teamSize}v{tournament.teamSize} · {tournament.sport.replace('_',' ')}
                </Text>
              </View>
            </View>
          )}

          {/* Team name */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Team Details</Text>
            <Text style={s.label}>Team Name *</Text>
            <TextInput
              style={s.input}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="e.g. Tower A Warriors"
              placeholderTextColor={COLORS.textMuted}
              maxLength={40}
            />
          </View>

          {/* Logo emoji */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Team Logo</Text>
            <View style={s.logoGrid}>
              {LOGO_EMOJIS.map((e) => (
                <TouchableOpacity
                  key={e}
                  style={[s.logoOption, logoEmoji === e && s.logoOptionActive]}
                  onPress={() => setLogoEmoji(e)}
                >
                  <Text style={s.logoEmoji}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Member search */}
          <View style={s.section}>
            <View style={s.memberHeader}>
              <Text style={s.sectionTitle}>Add Players</Text>
              <Text style={s.memberCount}>{memberIds.length}/{maxMembers} selected</Text>
            </View>
            <TextInput
              style={s.input}
              value={search}
              onChangeText={setSearch}
              placeholder="Search residents by name…"
              placeholderTextColor={COLORS.textMuted}
              clearButtonMode="while-editing"
            />
            {memberResults.length > 0 && (
              <View style={s.searchResults}>
                {memberResults.map((user) => {
                  const selected = memberIds.includes(user.id);
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[s.memberRow, selected && s.memberRowSelected]}
                      onPress={() => toggleMember(user.id)}
                    >
                      <View style={s.memberAvatar}>
                        <Text style={s.memberAvatarText}>{user.name[0]}</Text>
                      </View>
                      <View style={s.memberInfo}>
                        <Text style={s.memberName}>{user.name}</Text>
                        {user.flatNumber && <Text style={s.memberFlat}>🏠 {user.flatNumber}</Text>}
                      </View>
                      <Text style={s.memberCheck}>{selected ? '✓' : '+'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {memberIds.length > 0 && (
              <View style={s.selectedWrap}>
                <Text style={s.selectedLabel}>Selected players: {memberIds.length}</Text>
              </View>
            )}
          </View>

          <View style={s.note}>
            <Text style={s.noteText}>
              ℹ️ Your team registration will be reviewed by the tournament organiser before approval.
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel:             { fontSize: 16, color: COLORS.textMuted },
  title:              { fontSize: 17, fontWeight: '700', color: COLORS.text },
  save:               { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  saveDisabled:       { color: COLORS.textMuted },
  scroll:             { padding: 16, gap: 16 },
  tournamentCard:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#C7D2FE' },
  tournamentEmoji:    { fontSize: 30 },
  tournamentInfo:     { flex: 1 },
  tournamentName:     { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  tournamentMeta:     { fontSize: 12, color: COLORS.primary, opacity: 0.7 },
  section:            { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle:       { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  label:              { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input:              { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  logoGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  logoOption:         { width: 48, height: 48, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  logoOptionActive:   { backgroundColor: '#EEF2FF', borderColor: COLORS.primary, borderWidth: 2 },
  logoEmoji:          { fontSize: 24 },
  memberHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberCount:        { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  searchResults:      { gap: 2 },
  memberRow:          { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: COLORS.border },
  memberRowSelected:  { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  memberAvatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  memberInfo:         { flex: 1 },
  memberName:         { fontSize: 14, fontWeight: '600', color: COLORS.text },
  memberFlat:         { fontSize: 12, color: COLORS.textMuted },
  memberCheck:        { fontSize: 18, color: COLORS.primary, fontWeight: '700', width: 24, textAlign: 'center' },
  selectedWrap:       { backgroundColor: '#D1FAE5', borderRadius: 8, padding: 10 },
  selectedLabel:      { fontSize: 13, color: '#065F46', fontWeight: '600' },
  note:               { backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12 },
  noteText:           { fontSize: 13, color: COLORS.primary, lineHeight: 19 },
});
