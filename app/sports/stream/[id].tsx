import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Share, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { sportsService } from '@/services/sportsService';
import type { SportsStreamResponse } from '@/types/api';

const POLL_MS = 5000;

export default function StreamViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuth();
  const matchId  = Number(id);

  const [stream, setStream]       = useState<SportsStreamResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [activeCamId, setActiveCamId] = useState<number | null>(null);
  const [chatMsg, setChatMsg]     = useState('');
  const [sending, setSending]     = useState(false);
  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchStream() {
    try {
      const data = await sportsService.getStream(matchId);
      setStream(data);
      if (!activeCamId) {
        const active = data.cameras.find((c) => c.active);
        if (active) setActiveCamId(active.id);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => {
    fetchStream();
    pollRef.current = setInterval(fetchStream, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [matchId]);

  useEffect(() => {
    if ((stream?.messages.length ?? 0) > 0) {
      flatRef.current?.scrollToEnd({ animated: true });
    }
  }, [stream?.messages.length]);

  async function sendChat() {
    if (!chatMsg.trim() || !user) return;
    setSending(true);
    try {
      const updated = await sportsService.postStreamMessage(matchId, { text: chatMsg.trim(), commentary: false });
      setStream(updated);
      setChatMsg('');
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  async function shareStream() {
    await Share.share({ message: `Watch the live match stream: https://app.mana.community/sports/match/${matchId}/stream` });
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!stream || stream.status === 'OFFLINE') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.back}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>Live Stream</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={s.offlineWrap}>
          <Ionicons name="tv-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.offlineTitle}>Stream not started yet</Text>
          <Text style={s.offlineSub}>The organiser hasn't gone live for this match.</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (stream.status === 'ENDED') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.back}>‹</Text>
          </TouchableOpacity>
          <Text style={s.title}>Stream Ended</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={s.offlineWrap}>
          <Ionicons name="stop-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.offlineTitle}>Broadcast has ended</Text>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.replace(`/sports/match/${matchId}` as never)}
          >
            <Text style={s.backBtnText}>View Scorecard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeCam = stream.cameras.find((c) => c.id === activeCamId) ?? stream.cameras[0];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: '#000' }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Top bar */}
        <View style={s.darkTopBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={s.darkTitle} numberOfLines={1}>{stream.title ?? `Match #${matchId}`}</Text>
          </View>
          <View style={s.topRight}>
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>LIVE</Text>
            </View>
            <TouchableOpacity onPress={shareStream} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera switcher */}
        {stream.cameras.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.camBar}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 6 }}
          >
            {stream.cameras.map((cam) => (
              <TouchableOpacity
                key={cam.id}
                style={[s.camBtn, cam.id === activeCamId && s.camBtnActive]}
                onPress={() => setActiveCamId(cam.id)}
              >
                <Ionicons name="videocam-outline" size={12} color={cam.id === activeCamId ? '#fff' : COLORS.textMuted} />
                <Text style={[s.camLabel, cam.id === activeCamId && s.camLabelActive]}>{cam.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Video player */}
        {activeCam ? (
          <View style={s.playerWrap}>
            <WebView
              source={{ uri: activeCam.embedUrl }}
              style={s.webview}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
              javaScriptEnabled
            />
          </View>
        ) : (
          <View style={[s.playerWrap, s.noFeed]}>
            <Ionicons name="videocam-off-outline" size={36} color="#444" />
            <Text style={{ color: '#555', marginTop: 8, fontSize: 13 }}>No camera feed yet</Text>
          </View>
        )}

        {/* Chat */}
        <View style={s.chatWrap}>
          <FlatList
            ref={flatRef}
            data={stream.messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={({ item: m }) => (
              <View style={[s.bubble, m.commentary && s.commentaryBubble]}>
                {m.commentary && (
                  <Text style={s.commentaryLabel}>📢 Commentary</Text>
                )}
                <Text style={s.bubbleAuthor}>{m.authorName}</Text>
                <Text style={s.bubbleText}>{m.text}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={s.emptyChat}>No messages yet.</Text>}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={chatMsg}
              onChangeText={setChatMsg}
              placeholder="Type a message…"
              placeholderTextColor="#555"
              maxLength={200}
              returnKeyType="send"
              onSubmitEditing={sendChat}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!chatMsg.trim() || sending) && s.sendBtnDisabled]}
              onPress={sendChat}
              disabled={!chatMsg.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  topBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: COLORS.border },
  back:        { fontSize: 28, color: COLORS.primary, lineHeight: 32 },
  title:       { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  darkTopBar:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#000' },
  darkTitle:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  topRight:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dc2626', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText:    { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  camBar:      { backgroundColor: '#111', maxHeight: 42 },
  camBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
  camBtnActive:{ backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  camLabel:    { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  camLabelActive: { color: '#fff' },
  playerWrap:  { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  webview:     { flex: 1, backgroundColor: '#000' },
  noFeed:      { justifyContent: 'center', alignItems: 'center' },
  chatWrap:    { flex: 1, backgroundColor: '#0d0d0d' },
  bubble:      { paddingHorizontal: 12, paddingVertical: 4 },
  commentaryBubble: { backgroundColor: '#1e1b4b', borderRadius: 8, marginHorizontal: 8, marginVertical: 2, paddingVertical: 6 },
  commentaryLabel: { fontSize: 9, fontWeight: '900', color: '#818cf8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 1 },
  bubbleAuthor:{ fontSize: 11, fontWeight: '700', color: '#818cf8', marginRight: 4 },
  bubbleText:  { fontSize: 12, color: '#d1d5db', lineHeight: 16 },
  emptyChat:   { textAlign: 'center', color: '#444', fontSize: 12, paddingTop: 16 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: '#1f1f1f' },
  input:       { flex: 1, height: 36, backgroundColor: '#1a1a1a', borderRadius: 18, paddingHorizontal: 14, fontSize: 13, color: '#fff', borderWidth: 1, borderColor: '#2d2d2d' },
  sendBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  offlineWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  offlineTitle:{ fontSize: 17, fontWeight: '800', color: COLORS.text },
  offlineSub:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  backBtn:     { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
