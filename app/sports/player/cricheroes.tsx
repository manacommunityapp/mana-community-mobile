import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { sportsService } from '@/services/sportsService';
import type { SportsCricHeroesProfileResponse, CricHeroesFormatScope } from '@/types/api';

const FORMAT_OPTIONS: CricHeroesFormatScope[] = ['ALL', 'T20', 'ODI', 'TEST'];

function StatRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === null) return null;
  return (
    <View style={s.statRow}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function CricHeroesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const playerId = Number(id);

  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<CricHeroesFormatScope>('ALL');
  const [preview, setPreview] = useState<SportsCricHeroesProfileResponse | null>(null);
  const [linked, setLinked] = useState<SportsCricHeroesProfileResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadExisting = useCallback(async () => {
    setInitialLoading(true);
    const profile = await sportsService.getCricHeroesProfile(playerId);
    if (profile) {
      setLinked(profile);
      if (profile.cricHeroesUrl) setUrl(profile.cricHeroesUrl);
      if (profile.formatScope) setFormat(profile.formatScope);
    }
    setInitialLoaded(true);
    setInitialLoading(false);
  }, [playerId]);

  if (!initialLoaded) {
    loadExisting();
  }

  async function handlePreview() {
    if (!url.trim()) return;
    setPreviewLoading(true);
    setPreview(null);
    try {
      const data = await sportsService.previewCricHeroes(url.trim());
      setPreview(data);
    } catch (err: any) {
      Alert.alert('Preview failed', err?.response?.data?.message ?? 'Could not fetch profile');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleLink() {
    if (!url.trim()) return;
    setLinkLoading(true);
    try {
      const data = await sportsService.linkCricHeroes({ playerId, cricHeroesUrl: url.trim(), formatScope: format });
      setLinked(data);
      setPreview(null);
      Alert.alert('Linked!', 'CricHeroes profile linked successfully.');
    } catch (err: any) {
      Alert.alert('Link failed', err?.response?.data?.message ?? 'Could not link profile');
    } finally {
      setLinkLoading(false);
    }
  }

  async function handleUnlink() {
    Alert.alert('Unlink CricHeroes?', 'This will remove the linked profile stats.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink', style: 'destructive', onPress: async () => {
          try {
            await sportsService.unlinkCricHeroes(playerId);
            setLinked(null);
            setPreview(null);
            setUrl('');
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message ?? 'Could not unlink');
          }
        },
      },
    ]);
  }

  async function handleRefresh() {
    setRefreshLoading(true);
    try {
      const data = await sportsService.refreshCricHeroesProfile(playerId);
      setLinked(data);
    } catch (err: any) {
      Alert.alert('Refresh failed', err?.response?.data?.message ?? 'Could not refresh');
    } finally {
      setRefreshLoading(false);
    }
  }

  const displayProfile = linked ?? preview;

  if (initialLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>CricHeroes Profile</Text>
        {linked ? (
          <TouchableOpacity onPress={handleRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {refreshLoading
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>

        {/* Link form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{linked ? 'Linked Profile' : 'Link CricHeroes Profile'}</Text>

          <TextInput
            style={s.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://cricheroes.in/player-profile/..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="url"
          />

          <Text style={s.formatLabel}>Format scope</Text>
          <View style={s.formatRow}>
            {FORMAT_OPTIONS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[s.formatChip, format === f && s.formatChipActive]}
                onPress={() => setFormat(f)}
              >
                <Text style={[s.formatChipText, format === f && s.formatChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.btn, s.btnSecondary]}
              onPress={handlePreview}
              disabled={previewLoading || !url.trim()}
            >
              {previewLoading
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={s.btnSecondaryText}>Preview</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, (!url.trim() || linkLoading) && s.btnDisabled]}
              onPress={handleLink}
              disabled={!url.trim() || linkLoading}
            >
              {linkLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.btnPrimaryText}>{linked ? 'Re-link' : 'Link Profile'}</Text>}
            </TouchableOpacity>
          </View>

          {linked && (
            <TouchableOpacity style={s.unlinkBtn} onPress={handleUnlink}>
              <Ionicons name="unlink-outline" size={14} color="#dc2626" />
              <Text style={s.unlinkText}>Unlink profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Profile display */}
        {displayProfile && (
          <>
            {/* Bio */}
            <SectionCard title="🏏 Player Info">
              <View style={s.bioRow}>
                {displayProfile.avatarUrl ? (
                  <Image source={{ uri: displayProfile.avatarUrl }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, s.avatarFallback]}>
                    <Ionicons name="person-outline" size={28} color={COLORS.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  {displayProfile.fullName && (
                    <Text style={s.bioName}>{displayProfile.fullName}</Text>
                  )}
                  {displayProfile.primaryRole && (
                    <Text style={s.bioRole}>{displayProfile.primaryRole}</Text>
                  )}
                  <View style={s.bioChips}>
                    {displayProfile.battingStyle && (
                      <View style={s.bioChip}><Text style={s.bioChipText}>{displayProfile.battingStyle}</Text></View>
                    )}
                    {displayProfile.bowlingStyle && (
                      <View style={s.bioChip}><Text style={s.bioChipText}>{displayProfile.bowlingStyle}</Text></View>
                    )}
                  </View>
                  {displayProfile.mvpPoints !== undefined && (
                    <Text style={s.mvp}>⭐ {displayProfile.mvpPoints} MVP pts</Text>
                  )}
                </View>
              </View>
            </SectionCard>

            {/* Batting */}
            {(displayProfile.battingMatches ?? 0) > 0 && (
              <SectionCard title="🏏 Batting">
                <View style={s.statsGrid}>
                  <View style={s.statsCol}>
                    <StatRow label="Matches" value={displayProfile.battingMatches} />
                    <StatRow label="Innings" value={displayProfile.battingInnings} />
                    <StatRow label="Runs" value={displayProfile.battingRuns} />
                    <StatRow label="Highest" value={displayProfile.battingHighScore} />
                  </View>
                  <View style={s.statsDivider} />
                  <View style={s.statsCol}>
                    <StatRow label="Average" value={displayProfile.battingAverage?.toFixed(2)} />
                    <StatRow label="Strike Rate" value={displayProfile.battingStrikeRate?.toFixed(2)} />
                    <StatRow label="50s" value={displayProfile.battingFifties} />
                    <StatRow label="100s" value={displayProfile.battingHundreds} />
                  </View>
                </View>
              </SectionCard>
            )}

            {/* Bowling */}
            {(displayProfile.bowlingWickets ?? 0) > 0 && (
              <SectionCard title="🎯 Bowling">
                <View style={s.statsGrid}>
                  <View style={s.statsCol}>
                    <StatRow label="Matches" value={displayProfile.bowlingMatches} />
                    <StatRow label="Wickets" value={displayProfile.bowlingWickets} />
                    <StatRow label="Best" value={displayProfile.bowlingBest} />
                  </View>
                  <View style={s.statsDivider} />
                  <View style={s.statsCol}>
                    <StatRow label="Economy" value={displayProfile.bowlingEconomy?.toFixed(2)} />
                    <StatRow label="Average" value={displayProfile.bowlingAverage?.toFixed(2)} />
                    <StatRow label="Overs" value={displayProfile.bowlingOvers} />
                  </View>
                </View>
              </SectionCard>
            )}

            {/* Fielding */}
            {((displayProfile.catches ?? 0) + (displayProfile.stumpings ?? 0) + (displayProfile.runOuts ?? 0)) > 0 && (
              <SectionCard title="🧤 Fielding">
                <View style={s.statsGrid}>
                  <View style={s.statsCol}>
                    <StatRow label="Catches" value={displayProfile.catches} />
                  </View>
                  <View style={s.statsDivider} />
                  <View style={s.statsCol}>
                    <StatRow label="Stumpings" value={displayProfile.stumpings} />
                    <StatRow label="Run Outs" value={displayProfile.runOuts} />
                  </View>
                </View>
              </SectionCard>
            )}

            {/* Recent form */}
            {(displayProfile.recentForm?.length ?? 0) > 0 && (
              <SectionCard title="📋 Recent Form">
                {displayProfile.recentForm!.map((inning, i) => (
                  <View key={i} style={s.inningRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.inningOpponent} numberOfLines={1}>
                        vs {inning.opposition ?? 'Unknown'}
                      </Text>
                      {inning.matchDate && (
                        <Text style={s.inningDate}>{inning.matchDate}</Text>
                      )}
                    </View>
                    <View style={s.inningStats}>
                      {inning.runs !== undefined && (
                        <Text style={s.inningBat}>{inning.runs}{inning.balls ? `(${inning.balls})` : ''}</Text>
                      )}
                      {inning.wickets !== undefined && (
                        <Text style={s.inningBowl}>{inning.wickets}wkt</Text>
                      )}
                      {inning.format && (
                        <View style={s.formatTag}>
                          <Text style={s.formatTagText}>{inning.format}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </SectionCard>
            )}

            {preview && (
              <View style={s.previewBanner}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                <Text style={s.previewBannerText}>This is a preview — tap "Link Profile" to save</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  topBar:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  back:               { fontSize: 28, color: COLORS.primary, lineHeight: 32, width: 32 },
  title:              { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  card:               { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm, gap: 10 },
  cardTitle:          { fontSize: 14, fontWeight: '700', color: COLORS.text },
  input:              { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.background },
  formatLabel:        { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  formatRow:          { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  formatChip:         { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: COLORS.border },
  formatChipActive:   { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  formatChipText:     { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  formatChipTextActive: { color: COLORS.primary },
  actionRow:          { flexDirection: 'row', gap: 10 },
  btn:                { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: RADIUS.sm },
  btnPrimary:         { backgroundColor: COLORS.primary },
  btnSecondary:       { borderWidth: 1, borderColor: COLORS.primary },
  btnDisabled:        { opacity: 0.4 },
  btnPrimaryText:     { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnSecondaryText:   { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  unlinkBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', paddingVertical: 4 },
  unlinkText:         { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  bioRow:             { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar:             { width: 64, height: 64, borderRadius: 32 },
  avatarFallback:     { backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  bioName:            { fontSize: 16, fontWeight: '800', color: COLORS.text },
  bioRole:            { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  bioChips:           { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  bioChip:            { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  bioChipText:        { fontSize: 11, color: COLORS.textMuted },
  mvp:                { fontSize: 12, color: '#D97706', fontWeight: '600' },
  statsGrid:          { flexDirection: 'row', gap: 0 },
  statsCol:           { flex: 1, gap: 6 },
  statsDivider:       { width: 1, backgroundColor: COLORS.border, marginHorizontal: 12 },
  statRow:            { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel:          { fontSize: 12, color: COLORS.textMuted },
  statValue:          { fontSize: 12, fontWeight: '700', color: COLORS.text },
  inningRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inningOpponent:     { fontSize: 13, fontWeight: '600', color: COLORS.text },
  inningDate:         { fontSize: 11, color: COLORS.textMuted },
  inningStats:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inningBat:          { fontSize: 13, fontWeight: '700', color: COLORS.text },
  inningBowl:         { fontSize: 13, fontWeight: '700', color: '#059669' },
  formatTag:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${COLORS.primary}20` },
  formatTagText:      { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  previewBanner:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.sm, padding: 10 },
  previewBannerText:  { fontSize: 12, color: COLORS.primary, fontWeight: '500', flex: 1 },
});
