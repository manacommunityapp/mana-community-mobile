import { useRef, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, TouchableOpacity,
  ActivityIndicator, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useChatWindow } from '@/hooks/useChatWindow';
import { useAuth } from '@/hooks/useAuth';
import { chatService } from '@/services/chatService';
import { MessageBubble } from '@/components/common/MessageBubble';
import { ChatInput } from '@/components/common/ChatInput';
import { TypingIndicator } from '@/components/common/TypingIndicator';
import { COLORS } from '@/constants/config';
import type { ChatMessageDto } from '@/types/api';

// ── Connection status badge ────────────────────────────────────
function StatusDot({ connected }: { connected: boolean }) {
  return (
    <View style={[dot.base, connected ? dot.online : dot.offline]} />
  );
}
const dot = StyleSheet.create({
  base:    { width: 8, height: 8, borderRadius: 4 },
  online:  { backgroundColor: '#10B981' },
  offline: { backgroundColor: '#9CA3AF' },
});

// ── Header ─────────────────────────────────────────────────────
interface HeaderProps {
  name: string;
  subtitle: string;
  connected: boolean;
  onBack: () => void;
}

function ChatHeader({ name, subtitle, connected, onBack }: HeaderProps) {
  return (
    <View style={hdr.container}>
      <TouchableOpacity onPress={onBack} style={hdr.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={hdr.backText}>‹</Text>
      </TouchableOpacity>

      <View style={hdr.avatar}>
        <Text style={hdr.avatarText}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>

      <View style={hdr.info}>
        <Text style={hdr.name} numberOfLines={1}>{name}</Text>
        <View style={hdr.statusRow}>
          <StatusDot connected={connected} />
          <Text style={hdr.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

const hdr = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  backBtn:   { padding: 4 },
  backText:  { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  avatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  info:      { flex: 1, gap: 2 },
  name:      { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  subtitle:  { fontSize: 12, color: COLORS.textMuted },
});

// ── Main Screen ────────────────────────────────────────────────
export default function ChatWindowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const router  = useRouter();
  const { user } = useAuth();
  const listRef = useRef<FlatList<ChatMessageDto>>(null);

  const {
    messages, isLoading, isSending, isLoadingMore,
    hasMore, typingNames, sendMessage, loadMore,
    publishTyping, connected,
  } = useChatWindow(conversationId, user?.id ?? 0);

  // Load conversation metadata for header
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    staleTime: 60_000,
  });

  const conversation = conversations.find((c) => c.id === conversationId);
  const other = conversation?.participants?.find((p) => p.userId !== user?.id);
  const headerName = conversation?.type === 'DIRECT'
    ? (other?.name ?? 'Chat')
    : (conversation?.name ?? 'Group');
  const headerSubtitle = connected
    ? (other?.online ? 'Online' : 'Offline')
    : 'Connecting…';

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to let the FlatList render first
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length]);

  // ── Render each message ────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ChatMessageDto>) => {
      const isMine     = item.senderId === user?.id;
      const prevMsg    = index > 0 ? messages[index - 1] : undefined;
      const nextMsg    = messages[index + 1];

      // Show avatar only for first message in a consecutive received group
      const showAvatar = !isMine && (
        !nextMsg || nextMsg.senderId !== item.senderId || nextMsg.senderId === user?.id
      );

      return (
        <MessageBubble
          message={item}
          isMine={isMine}
          showAvatar={showAvatar}
          prevMessage={prevMsg}
        />
      );
    },
    [messages, user?.id],
  );

  // ── Load more on scroll to top ─────────────────────────────────
  const handleScroll = useCallback(
    ({ nativeEvent }: any) => {
      if (nativeEvent.contentOffset.y < 60 && hasMore && !isLoadingMore) {
        loadMore();
      }
    },
    [hasMore, isLoadingMore, loadMore],
  );

  // ── Empty / loading state ──────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={scr.container} edges={['top']}>
        <ChatHeader
          name={headerName}
          subtitle="Loading…"
          connected={false}
          onBack={() => router.back()}
        />
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      <ChatHeader
        name={headerName}
        subtitle={headerSubtitle}
        connected={connected}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={scr.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <ActivityIndicator
            style={{ paddingVertical: 8 }}
            color={COLORS.primary}
            size="small"
          />
        )}

        {/* Messages list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={scr.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={scr.empty}>
              <Text style={scr.emptyEmoji}>💬</Text>
              <Text style={scr.emptyText}>No messages yet.</Text>
              <Text style={scr.emptyHint}>Say hello!</Text>
            </View>
          }
        />

        {/* Typing indicator */}
        <TypingIndicator names={typingNames} />

        {/* Input bar */}
        <ChatInput
          onSend={sendMessage}
          onTyping={publishTyping}
          isSending={isSending}
          disabled={!user}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F0F2F5' },
  flex:        { flex: 1 },
  listContent: { paddingVertical: 12, paddingBottom: 4 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 6 },
  emptyEmoji:  { fontSize: 48 },
  emptyText:   { fontSize: 17, fontWeight: '600', color: COLORS.text },
  emptyHint:   { fontSize: 14, color: COLORS.textMuted },
});
