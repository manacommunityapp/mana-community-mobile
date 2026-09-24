import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS } from '@/constants/config';
import type { BattingEntryDto, BowlingEntryDto, InningsDto } from '@/types/api';

// ── Batting Table ─────────────────────────────────────────────
function BattingRow({ entry, isTopScorer }: { entry: BattingEntryDto; isTopScorer: boolean }) {
  return (
    <View style={[bt.row, isTopScorer && bt.rowHighlight]}>
      <View style={bt.playerCol}>
        <Text style={[bt.playerName, isTopScorer && bt.playerNameTop]} numberOfLines={1}>
          {entry.playerName}
          {isTopScorer ? ' ⭐' : ''}
        </Text>
        <Text style={bt.dismissal} numberOfLines={1}>{entry.dismissal}</Text>
      </View>
      <Text style={[bt.cell, bt.runsCell, entry.runs >= 50 && bt.milestone]}>
        {entry.runs}{entry.isNotOut ? '*' : ''}
      </Text>
      <Text style={bt.cell}>{entry.balls}</Text>
      <Text style={bt.cell}>{entry.fours}</Text>
      <Text style={bt.cell}>{entry.sixes}</Text>
      <Text style={bt.cell}>{entry.strikeRate.toFixed(1)}</Text>
    </View>
  );
}

// ── Bowling Table ─────────────────────────────────────────────
function BowlingRow({ entry, isBestBowler }: { entry: BowlingEntryDto; isBestBowler: boolean }) {
  return (
    <View style={[bt.row, isBestBowler && bt.rowHighlight]}>
      <Text style={[bt.bowlerName, isBestBowler && bt.playerNameTop]} numberOfLines={1}>
        {entry.playerName}{isBestBowler ? ' ⭐' : ''}
      </Text>
      <Text style={bt.cell}>{entry.overs}</Text>
      <Text style={bt.cell}>{entry.maidens}</Text>
      <Text style={bt.cell}>{entry.runs}</Text>
      <Text style={[bt.cell, entry.wickets >= 3 && bt.milestone]}>
        {entry.wickets}
      </Text>
      <Text style={bt.cell}>{entry.economy.toFixed(1)}</Text>
    </View>
  );
}

// ── Innings card ──────────────────────────────────────────────
export function InningsCard({ innings, title }: { innings: InningsDto; title?: string }) {
  const topScorer   = innings.batting.reduce((a, b) => a.runs > b.runs ? a : b, innings.batting[0]);
  const bestBowler  = innings.bowling.reduce((a, b) =>
    a.wickets > b.wickets || (a.wickets === b.wickets && a.runs < b.runs) ? a : b,
    innings.bowling[0]);

  return (
    <View style={ic.card}>
      {/* Innings header */}
      <View style={ic.header}>
        <Text style={ic.teamName}>{innings.battingTeamName}</Text>
        <Text style={ic.score}>
          {innings.totalRuns}/{innings.wickets}
          <Text style={ic.overs}> ({innings.overs} ov)</Text>
        </Text>
      </View>
      {title && <Text style={ic.subTitle}>{title}</Text>}
      {innings.extras > 0 && (
        <Text style={ic.extras}>Extras: {innings.extras}</Text>
      )}

      {/* Batting */}
      <Text style={ic.tableTitle}>BATTING</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[bt.row, bt.headerRow]}>
            <Text style={[bt.playerCol, bt.headerText]}>Batter</Text>
            <Text style={[bt.cell, bt.headerText]}>R</Text>
            <Text style={[bt.cell, bt.headerText]}>B</Text>
            <Text style={[bt.cell, bt.headerText]}>4s</Text>
            <Text style={[bt.cell, bt.headerText]}>6s</Text>
            <Text style={[bt.cell, bt.headerText]}>SR</Text>
          </View>
          {innings.batting.map((entry) => (
            <BattingRow
              key={entry.id}
              entry={entry}
              isTopScorer={topScorer && entry.id === topScorer.id}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bowling */}
      {innings.bowling.length > 0 && (
        <>
          <Text style={ic.tableTitle}>BOWLING</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={[bt.row, bt.headerRow]}>
                <Text style={[bt.bowlerName, bt.headerText]}>Bowler</Text>
                <Text style={[bt.cell, bt.headerText]}>O</Text>
                <Text style={[bt.cell, bt.headerText]}>M</Text>
                <Text style={[bt.cell, bt.headerText]}>R</Text>
                <Text style={[bt.cell, bt.headerText]}>W</Text>
                <Text style={[bt.cell, bt.headerText]}>Eco</Text>
              </View>
              {innings.bowling.map((entry) => (
                <BowlingRow
                  key={entry.id}
                  entry={entry}
                  isBestBowler={bestBowler && entry.id === bestBowler.id && entry.wickets > 0}
                />
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const ic = StyleSheet.create({
  card:      { backgroundColor: COLORS.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#1E1B4B' },
  teamName:  { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
  score:     { fontSize: 22, fontWeight: '900', color: '#fff' },
  overs:     { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.7)' },
  subTitle:  { fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 14, paddingTop: 6 },
  extras:    { fontSize: 12, color: COLORS.textMuted, paddingHorizontal: 14, paddingBottom: 4 },
  tableTitle:{ fontSize: 11, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 1, padding: 10, paddingBottom: 0 },
});

const bt = StyleSheet.create({
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  headerRow:     { backgroundColor: '#F9FAFB', borderTopWidth: 0 },
  rowHighlight:  { backgroundColor: '#FFF7ED' },
  playerCol:     { width: 130, paddingRight: 6 },
  playerName:    { fontSize: 13, fontWeight: '600', color: COLORS.text },
  playerNameTop: { color: '#D97706' },
  dismissal:     { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  bowlerName:    { width: 130, fontSize: 13, fontWeight: '600', color: COLORS.text, paddingRight: 6 },
  cell:          { width: 40, textAlign: 'center', fontSize: 13, color: COLORS.text },
  headerText:    { fontWeight: '700', color: COLORS.textMuted, fontSize: 11 },
  runsCell:      { fontWeight: '800', fontSize: 14 },
  milestone:     { color: '#D97706', fontWeight: '900' },
});
