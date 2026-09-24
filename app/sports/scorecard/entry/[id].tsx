import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import { COLORS } from '@/constants/config';

type BattingRow = { playerName: string; runs: string; balls: string; fours: string; sixes: string; dismissal: string; isNotOut: boolean };
type BowlingRow = { playerName: string; overs: string; maidens: string; runs: string; wickets: string };

const emptyBatter = (): BattingRow => ({ playerName: '', runs: '', balls: '', fours: '0', sixes: '0', dismissal: '', isNotOut: false });
const emptyBowler = (): BowlingRow => ({ playerName: '', overs: '', maidens: '0', runs: '', wickets: '' });

function BatterInput({ row, onChange, onRemove }: { row: BattingRow; onChange: (r: BattingRow) => void; onRemove: () => void }) {
  return (
    <View style={ei.row}>
      <View style={{ flex: 1 }}>
        <View style={ei.nameRow}>
          <TextInput style={[ei.input, { flex: 1 }]} value={row.playerName} onChangeText={(v) => onChange({ ...row, playerName: v })} placeholder="Batter name" placeholderTextColor={COLORS.textMuted} />
          <TouchableOpacity onPress={() => onChange({ ...row, isNotOut: !row.isNotOut })} style={[ei.notOutBtn, row.isNotOut && ei.notOutBtnActive]}>
            <Text style={[ei.notOutText, row.isNotOut && ei.notOutTextActive]}>N/O</Text>
          </TouchableOpacity>
        </View>
        <View style={ei.statsRow}>
          {[
            { label: 'R', key: 'runs', width: 50 },
            { label: 'B', key: 'balls', width: 50 },
            { label: '4s', key: 'fours', width: 44 },
            { label: '6s', key: 'sixes', width: 44 },
          ].map(({ label, key, width }) => (
            <View key={key} style={{ width }}>
              <Text style={ei.statLabel}>{label}</Text>
              <TextInput
                style={ei.statInput}
                value={(row as any)[key]}
                onChangeText={(v) => onChange({ ...row, [key]: v.replace(/\D/g, '') })}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          ))}
          <View style={{ flex: 1 }}>
            <Text style={ei.statLabel}>Dismissal</Text>
            <TextInput style={ei.statInput} value={row.dismissal} onChangeText={(v) => onChange({ ...row, dismissal: v })} placeholder={row.isNotOut ? 'not out' : 'c Smith b Jones'} placeholderTextColor={COLORS.textMuted} />
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} style={ei.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={ei.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function BowlerInput({ row, onChange, onRemove }: { row: BowlingRow; onChange: (r: BowlingRow) => void; onRemove: () => void }) {
  return (
    <View style={ei.row}>
      <View style={{ flex: 1 }}>
        <TextInput style={ei.input} value={row.playerName} onChangeText={(v) => onChange({ ...row, playerName: v })} placeholder="Bowler name" placeholderTextColor={COLORS.textMuted} />
        <View style={ei.statsRow}>
          {[
            { label: 'O', key: 'overs', width: 50 },
            { label: 'M', key: 'maidens', width: 44 },
            { label: 'R', key: 'runs', width: 50 },
            { label: 'W', key: 'wickets', width: 44 },
          ].map(({ label, key, width }) => (
            <View key={key} style={{ width }}>
              <Text style={ei.statLabel}>{label}</Text>
              <TextInput
                style={ei.statInput}
                value={(row as any)[key]}
                onChangeText={(v) => onChange({ ...row, [key]: v.replace(/[^\d.]/g, '') })}
                keyboardType="decimal-pad"
                maxLength={5}
              />
            </View>
          ))}
        </View>
      </View>
      <TouchableOpacity onPress={onRemove} style={ei.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={ei.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const ei = StyleSheet.create({
  row:              { flexDirection: 'row', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  nameRow:          { flexDirection: 'row', gap: 8, marginBottom: 6 },
  statsRow:         { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  input:            { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.surface },
  statLabel:        { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, marginBottom: 2 },
  statInput:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 6, fontSize: 14, color: COLORS.text, textAlign: 'center' },
  notOutBtn:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#F3F4F6' },
  notOutBtnActive:  { backgroundColor: '#D1FAE5', borderColor: COLORS.success },
  notOutText:       { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  notOutTextActive: { color: COLORS.success },
  removeBtn:        { paddingTop: 2 },
  removeText:       { fontSize: 18, color: COLORS.error, fontWeight: '700' },
});

export default function ScorecardEntryScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const qc       = useQueryClient();

  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [team1Total, setTeam1Total] = useState('');
  const [team1Wkts,  setTeam1Wkts]  = useState('');
  const [team1Overs, setTeam1Overs] = useState('');
  const [team2Total, setTeam2Total] = useState('');
  const [team2Wkts,  setTeam2Wkts]  = useState('');
  const [team2Overs, setTeam2Overs] = useState('');
  const [batters1, setBatters1] = useState<BattingRow[]>([emptyBatter(), emptyBatter()]);
  const [bowlers1, setBowlers1] = useState<BowlingRow[]>([emptyBowler()]);
  const [batters2, setBatters2] = useState<BattingRow[]>([emptyBatter(), emptyBatter()]);
  const [bowlers2, setBowlers2] = useState<BowlingRow[]>([emptyBowler()]);
  const [manOfMatch, setManOfMatch] = useState('');
  const [result,     setResult]     = useState('');

  const saveMutation = useMutation({
    mutationFn: () => sportsService.saveScorecard(Number(id), {
      firstInnings: {
        battingTeamName: team1Name, totalRuns: Number(team1Total),
        wickets: Number(team1Wkts), overs: team1Overs,
        batting: batters1.filter((b) => b.playerName).map((b, i) => ({
          playerName: b.playerName, runs: Number(b.runs), balls: Number(b.balls),
          fours: Number(b.fours), sixes: Number(b.sixes),
          strikeRate: b.balls ? (Number(b.runs) / Number(b.balls)) * 100 : 0,
          dismissal: b.isNotOut ? 'not out' : b.dismissal,
          isNotOut: b.isNotOut, position: i + 1,
        })),
        bowling: bowlers1.filter((b) => b.playerName).map((b) => ({
          playerName: b.playerName, overs: Number(b.overs),
          maidens: Number(b.maidens), runs: Number(b.runs),
          wickets: Number(b.wickets),
          economy: b.overs ? Number(b.runs) / Number(b.overs) : 0,
          wides: 0, noBalls: 0,
        })),
      },
      secondInnings: team2Name ? {
        battingTeamName: team2Name, totalRuns: Number(team2Total),
        wickets: Number(team2Wkts), overs: team2Overs,
        batting: batters2.filter((b) => b.playerName).map((b, i) => ({
          playerName: b.playerName, runs: Number(b.runs), balls: Number(b.balls),
          fours: Number(b.fours), sixes: Number(b.sixes),
          strikeRate: b.balls ? (Number(b.runs) / Number(b.balls)) * 100 : 0,
          dismissal: b.isNotOut ? 'not out' : b.dismissal,
          isNotOut: b.isNotOut, position: i + 1,
        })),
        bowling: bowlers2.filter((b) => b.playerName).map((b) => ({
          playerName: b.playerName, overs: Number(b.overs),
          maidens: Number(b.maidens), runs: Number(b.runs),
          wickets: Number(b.wickets),
          economy: b.overs ? Number(b.runs) / Number(b.overs) : 0,
          wides: 0, noBalls: 0,
        })),
      } : undefined,
      result,
      manOfMatchName: manOfMatch || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scorecard', id] });
      Alert.alert('Saved!', 'Scorecard saved successfully.', [
        { text: 'View Scorecard', onPress: () => router.replace(`/sports/scorecard/${id}`) },
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.message ?? 'Failed to save scorecard.'),
  });

  function InningsSection({
    label, teamName, setTeamName, total, setTotal, wkts, setWkts, overs, setOvers,
    batters, setBatters, bowlers, setBowlers,
  }: any) {
    return (
      <View style={sec.wrap}>
        <Text style={sec.inningsLabel}>{label}</Text>
        <TextInput style={sec.teamInput} value={teamName} onChangeText={setTeamName} placeholder="Batting team name" placeholderTextColor={COLORS.textMuted} />
        <View style={sec.scoreRow}>
          <View style={sec.scoreField}><Text style={sec.scoreLabel}>Total</Text><TextInput style={sec.scoreInput} value={total} onChangeText={setTotal} keyboardType="numeric" maxLength={3} /></View>
          <View style={sec.scoreField}><Text style={sec.scoreLabel}>Wkts</Text><TextInput style={sec.scoreInput} value={wkts} onChangeText={setWkts} keyboardType="numeric" maxLength={2} /></View>
          <View style={sec.scoreField}><Text style={sec.scoreLabel}>Overs</Text><TextInput style={sec.scoreInput} value={overs} onChangeText={setOvers} placeholder="20.0" placeholderTextColor={COLORS.textMuted} /></View>
        </View>
        <Text style={sec.subLabel}>Batting</Text>
        {batters.map((b: BattingRow, i: number) => (
          <BatterInput key={i} row={b} onChange={(r) => setBatters((prev: BattingRow[]) => prev.map((x, j) => j === i ? r : x))} onRemove={() => setBatters((prev: BattingRow[]) => prev.filter((_: any, j: number) => j !== i))} />
        ))}
        <TouchableOpacity style={sec.addBtn} onPress={() => setBatters((p: BattingRow[]) => [...p, emptyBatter()])}>
          <Text style={sec.addBtnText}>+ Add batter</Text>
        </TouchableOpacity>
        <Text style={sec.subLabel}>Bowling</Text>
        {bowlers.map((b: BowlingRow, i: number) => (
          <BowlerInput key={i} row={b} onChange={(r) => setBowlers((prev: BowlingRow[]) => prev.map((x, j) => j === i ? r : x))} onRemove={() => setBowlers((prev: BowlingRow[]) => prev.filter((_: any, j: number) => j !== i))} />
        ))}
        <TouchableOpacity style={sec.addBtn} onPress={() => setBowlers((p: BowlingRow[]) => [...p, emptyBowler()])}>
          <Text style={sec.addBtnText}>+ Add bowler</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
        <Text style={s.title}>Enter Scorecard</Text>
        <TouchableOpacity onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={s.save}>Save</Text>}
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <InningsSection
            label="1st Innings" teamName={team1Name} setTeamName={setTeam1Name}
            total={team1Total} setTotal={setTeam1Total} wkts={team1Wkts} setWkts={setTeam1Wkts}
            overs={team1Overs} setOvers={setTeam1Overs}
            batters={batters1} setBatters={setBatters1}
            bowlers={bowlers1} setBowlers={setBowlers1}
          />
          <InningsSection
            label="2nd Innings" teamName={team2Name} setTeamName={setTeam2Name}
            total={team2Total} setTotal={setTeam2Total} wkts={team2Wkts} setWkts={setTeam2Wkts}
            overs={team2Overs} setOvers={setTeam2Overs}
            batters={batters2} setBatters={setBatters2}
            bowlers={bowlers2} setBowlers={setBowlers2}
          />
          <View style={s.section}>
            <Text style={s.label}>Match result</Text>
            <TextInput style={s.input} value={result} onChangeText={setResult} placeholder="e.g. Team A won by 23 runs" placeholderTextColor={COLORS.textMuted} />
            <Text style={[s.label, { marginTop: 10 }]}>Man of the Match</Text>
            <TextInput style={s.input} value={manOfMatch} onChangeText={setManOfMatch} placeholder="Player name" placeholderTextColor={COLORS.textMuted} />
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const sec = StyleSheet.create({
  wrap:       { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  inningsLabel:{ fontSize: 14, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  teamInput:  { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.text },
  scoreRow:   { flexDirection: 'row', gap: 10 },
  scoreField: { flex: 1 },
  scoreLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3 },
  scoreInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, color: COLORS.text, fontWeight: '700', textAlign: 'center' },
  subLabel:   { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  addBtn:     { borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderStyle: 'dashed' },
  addBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel:    { fontSize: 16, color: COLORS.textMuted },
  title:     { fontSize: 17, fontWeight: '700', color: COLORS.text },
  save:      { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  scroll:    { padding: 12 },
  section:   { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  label:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.text },
});
