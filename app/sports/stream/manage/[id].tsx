import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/config';
import { sportsService } from '@/services/sportsService';
import type { SportsStreamResponse } from '@/types/api';

type Panel = 'overview' | 'cameras' | 'commentary';

export default function StreamManageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const matchId = Number(id);

  const [stream, setStream]     = useState<SportsStreamResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);
  const [panel, setPanel]       = useState<Panel>('overview');

  const [camLabel, setCamLabel] = useState('');
  const [camUrl, setCamUrl]     = useState('');
  const [camErr, setCamErr]     = useState('');

  const [commentary, setCommentary] = useState('');

  async function fetch() {
    try { setStream(await sportsService.getStream(matchId)); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { fetch(); }, [matchId]);

  async function goLive() {
    if (!stream?.cameras.length) {
      Alert.alert('No cameras', 'Add at least one camera feed before going live.');
      return;
    }
    setBusy(true);
    try { setStream(await sportsService.startStream(matchId, stream?.title ?? undefined)); }
    catch { Alert.alert('Error', 'Could not start stream.'); }
    finally { setBusy(false); }
  }

  async function endStream() {
    Alert.alert('End Stream', 'Are you sure you want to end the broadcast?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Stream', style: 'destructive', onPress: async () => {
          setBusy(true);
          try { setStream(await sportsService.endStream(matchId)); }
          catch { Alert.alert('Error', 'Could not end stream.'); }
          finally { setBusy(false); }
        },
      },
    ]);
  }

  async function addCamera() {
    if (!camLabel.trim()) { setCamErr('Camera label required'); return; }
    if (!camUrl.trim())   { setCamErr('Stream URL required'); return; }
    const isValid = /youtube\.com|youtu\.be|twitch\.tv|^https?:\/\//.test(camUrl.trim());
    if (!isValid) { setCamErr('Enter a YouTube, Twitch, or HTTPS URL'); return; }
    setCamErr('');
    setBusy(true);
    try {
      setStream(await sportsService.addStreamCamera(matchId, { label: camLabel.trim(), url: camUrl.trim() }));
      setCamLabel(''); setCamUrl('');
    } catch { Alert.alert('Error', 'Could not add camera.'); }
    finally { setBusy(false); }
  }

  async function removeCamera(cameraId: number) {
    setBusy(true);
    try { setStream(await sportsService.removeStreamCamera(matchId, cameraId)); }
    catch { Alert.alert('Error', 'Could not remove camera.'); }
    finally { setBusy(false); }
  }

  async function postCommentary() {
    if (!commentary.trim()) return;
    setBusy(true);
    try {
      setStream(await sportsService.postStreamMessage(matchId, { text: commentary.trim(), commentary: true }));
      setCommentary('');
    } catch { Alert.alert('Error', 'Could not post commentary.'); }
    finally { setBusy(false); }
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  const isLive  = stream?.status === 'LIVE';
  const isEnded = stream?.status === 'ENDED';

  const PANELS: { id: Panel; icon: string; label: string }[] = [
    { id: 'overview',   icon: 'settings-outline',  label: 'Overview'   },
    { id: 'cameras',    icon: 'videocam-outline',   label: 'Cameras'    },
    { id: 'commentary', icon: 'mic-outline',        label: 'Commentary' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={s.title}>Stream Control</Text>
          <Text style={s.sub}>Match #{matchId}</Text>
        </View>
        {isLive && (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={s.statsRow}>
          <StatCard label="Status" value={stream?.status ?? 'OFFLINE'} accent={isLive ? '#dc2626' : COLORS.textMuted} />
          <StatCard label="Cameras" value={String(stream?.cameras.length ?? 0)} />
          <StatCard label="Messages" value={String(stream?.messages.length ?? 0)} />
        </View>

        {/* Go Live / End */}
        {!isEnded && (
          <View style={s.actionRow}>
            {!isLive ? (
              <TouchableOpacity
                style={[s.goLiveBtn, (busy || !stream?.cameras.length) && s.btnDisabled]}
                onPress={goLive}
                disabled={busy || !stream?.cameras.length}
              >
                {busy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="radio-outline" size={18} color="#fff" />}
                <Text style={s.goLiveTxt}>Go Live</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.endBtn, busy && s.btnDisabled]} onPress={endStream} disabled={busy}>
                <Ionicons name="stop-circle-outline" size={18} color="#fff" />
                <Text style={s.endTxt}>End Stream</Text>
              </TouchableOpacity>
            )}
            {isLive && (
              <TouchableOpacity
                style={s.previewBtn}
                onPress={() => router.push(`/sports/stream/${matchId}` as never)}
              >
                <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                <Text style={s.previewTxt}>Preview</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!stream?.cameras.length && !isLive && (
          <View style={s.warnBox}>
            <Ionicons name="warning-outline" size={14} color="#b45309" />
            <Text style={s.warnTxt}>Add at least one camera feed before going live.</Text>
          </View>
        )}

        {/* Panel tabs */}
        <View style={s.tabRow}>
          {PANELS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[s.tabBtn, panel === p.id && s.tabBtnActive]}
              onPress={() => setPanel(p.id)}
            >
              <Ionicons name={p.icon as never} size={13} color={panel === p.id ? COLORS.primary : COLORS.textMuted} />
              <Text style={[s.tabLabel, panel === p.id && s.tabLabelActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Panel: Overview */}
        {panel === 'overview' && (
          <View style={s.card}>
            <Text style={s.cardLabel}>Stream Link</Text>
            <Text style={s.linkText} selectable>
              https://app.mana.community/sports/match/{matchId}/stream
            </Text>
            {stream?.messages.slice(-4).map((m) => (
              <View key={m.id} style={s.msgRow}>
                <Text style={s.msgAuthor}>{m.authorName}</Text>
                <Text style={s.msgText} numberOfLines={1}>{m.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Panel: Cameras */}
        {panel === 'cameras' && (
          <>
            {stream?.cameras.map((cam) => (
              <View key={cam.id} style={[s.camCard, cam.active && s.camCardActive]}>
                <Ionicons name="videocam-outline" size={18} color={cam.active ? COLORS.primary : COLORS.textMuted} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.camName}>{cam.label}</Text>
                  <Text style={s.camPlatform}>{cam.platform}</Text>
                </View>
                {cam.active && <Text style={s.activePill}>Active</Text>}
                <TouchableOpacity onPress={() => removeCamera(cam.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={s.card}>
              <Text style={s.cardLabel}>Add Camera Feed</Text>
              <TextInput
                style={s.textInput}
                value={camLabel}
                onChangeText={setCamLabel}
                placeholder="Label (e.g. Main Camera)"
                placeholderTextColor={COLORS.textMuted}
              />
              <TextInput
                style={[s.textInput, { marginTop: 8 }]}
                value={camUrl}
                onChangeText={setCamUrl}
                placeholder="YouTube / Twitch / HTTPS URL"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
              {!!camErr && <Text style={s.errText}>{camErr}</Text>}
              <TouchableOpacity
                style={[s.addBtn, busy && s.btnDisabled]}
                onPress={addCamera}
                disabled={busy}
              >
                <Text style={s.addBtnTxt}>Add Camera</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Panel: Commentary */}
        {panel === 'commentary' && (
          <View style={s.card}>
            <Text style={s.cardLabel}>Post Live Commentary</Text>
            <TextInput
              style={[s.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
              value={commentary}
              onChangeText={setCommentary}
              placeholder="e.g. SIX! Ravi Kumar hammers it over long-on…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.addBtn, (!commentary.trim() || busy) && s.btnDisabled]}
              onPress={postCommentary}
              disabled={!commentary.trim() || busy}
            >
              <Text style={s.addBtnTxt}>Post Commentary</Text>
            </TouchableOpacity>

            {stream?.messages.filter((m) => m.commentary).slice(-10).reverse().map((m) => (
              <View key={m.id} style={s.commentaryRow}>
                <Ionicons name="checkmark-circle" size={13} color={COLORS.primary} />
                <Text style={s.commentaryTxt} numberOfLines={2}>{m.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, accent ? { color: accent } : {}]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  back:         { fontSize: 28, color: COLORS.primary, lineHeight: 32 },
  title:        { fontSize: 16, fontWeight: '800', color: COLORS.text },
  sub:          { fontSize: 11, color: COLORS.textMuted },
  liveBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dc2626', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText:     { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  scroll:       { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  statsRow:     { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard:     { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statLabel:    { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  statValue:    { fontSize: 20, fontWeight: '900', color: COLORS.text, marginTop: 2 },
  actionRow:    { flexDirection: 'row', gap: 10 },
  goLiveBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#dc2626', borderRadius: RADIUS.lg, paddingVertical: 14 },
  goLiveTxt:    { color: '#fff', fontWeight: '900', fontSize: 15 },
  endBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#374151', borderRadius: RADIUS.lg, paddingVertical: 14 },
  endTxt:       { color: '#fff', fontWeight: '900', fontSize: 15 },
  previewBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary },
  previewTxt:   { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  btnDisabled:  { opacity: 0.45 },
  warnBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fefce8', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#fde68a' },
  warnTxt:      { fontSize: 12, color: '#b45309', flex: 1 },
  tabRow:       { flexDirection: 'row', gap: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 4 },
  tabBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: RADIUS.md },
  tabBtnActive: { backgroundColor: COLORS.background, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabLabel:     { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.primary, fontWeight: '700' },
  card:         { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  cardLabel:    { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  linkText:     { fontSize: 12, color: COLORS.primary, fontFamily: 'monospace' },
  msgRow:       { flexDirection: 'row', gap: 6, alignItems: 'center' },
  msgAuthor:    { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  msgText:      { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  camCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  camCardActive:{ borderColor: COLORS.primary },
  camName:      { fontSize: 13, fontWeight: '700', color: COLORS.text },
  camPlatform:  { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  activePill:   { fontSize: 10, fontWeight: '800', color: COLORS.primary, backgroundColor: '#eef2ff', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  textInput:    { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: COLORS.text },
  errText:      { fontSize: 11, color: '#ef4444' },
  addBtn:       { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  addBtnTxt:    { color: '#fff', fontWeight: '800', fontSize: 14 },
  commentaryRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentaryTxt:{ fontSize: 12, color: COLORS.text, flex: 1, lineHeight: 16 },
});
