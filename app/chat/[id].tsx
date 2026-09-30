import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, TouchableOpacity,
  ActivityIndicator, ListRenderItemInfo, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useChatWindow, type LocalMessage } from '@/hooks/useChatWindow';
import { useAuth } from '@/hooks/useAuth';
import { chatService } from '@/services/chatService';
import { MessageBubble } from '@/components/common/MessageBubble';
import { ChatInput } from '@/components/common/ChatInput';
import { TypingIndicator } from '@/components/common/TypingIndicator';
import { COLORS, getInitials } from '@/constants/config';

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
  onToggleSearch: () => void;
  isSearching: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  matchCount: number;
  currentMatch: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onCloseSearch: () => void;
}

function ChatHeader({
  name, subtitle, connected, onBack,
  onToggleSearch, isSearching, searchQuery, onSearchChange,
  matchCount, currentMatch, onNextMatch, onPrevMatch, onCloseSearch,
}: HeaderProps) {
  if (isSearching) {
    return (
      <View style={hdr.searchContainer}>
        <TouchableOpacity onPress={onCloseSearch} style={hdr.iconBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <View style={hdr.searchInputWrap}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput
            style={hdr.searchInput}
            placeholder="Search in chat..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.trim().length > 0 && (
          <View style={hdr.searchNav}>
            <Text style={hdr.matchCounter}>
              {matchCount === 0 ? '0' : currentMatch + 1}/{matchCount}
            </Text>
            <TouchableOpacity
              onPress={onPrevMatch}
              disabled={matchCount === 0}
              style={[hdr.arrowBtn, matchCount === 0 && hdr.btnDisabled]}
              hitSlop={6}
            >
              <Ionicons name="chevron-up" size={18} color={matchCount === 0 ? COLORS.textMuted : COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onNextMatch}
              disabled={matchCount === 0}
              style={[hdr.arrowBtn, matchCount === 0 && hdr.btnDisabled]}
              hitSlop={6}
            >
              <Ionicons name="chevron-down" size={18} color={matchCount === 0 ? COLORS.textMuted : COLORS.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={hdr.container}>
      <TouchableOpacity onPress={onBack} style={hdr.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={hdr.backText}>‹</Text>
      </TouchableOpacity>

      <View style={hdr.avatar}>
        <Text style={hdr.avatarText}>{getInitials(name)}</Text>
      </View>

      <View style={hdr.info}>
        <Text style={hdr.name} numberOfLines={1}>{name}</Text>
        <View style={hdr.statusRow}>
          <StatusDot connected={connected} />
          <Text style={hdr.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>

      <TouchableOpacity onPress={onToggleSearch} style={hdr.searchToggleBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="search-outline" size={22} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

const hdr = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  backBtn:   { padding: 4 },
  backText:  { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  avatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:{ color: '#fff', fontFamily: 'DMSans-Bold', fontWeight: '700', fontSize: 16 },
  info:      { flex: 1, gap: 2 },
  name:      { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  subtitle:  { fontSize: 12, color: COLORS.textMuted },
  searchToggleBtn: { padding: 6, borderRadius: 20 },
  // ── Search Mode Header
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  iconBtn: { padding: 4 },
  searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0 },
  searchNav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchCounter: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginRight: 2 },
  arrowBtn: { padding: 4, borderRadius: 12 },
  btnDisabled: { opacity: 0.35 },
});

// ── Main Screen ────────────────────────────────────────────────
export default function ChatWindowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const router  = useRouter();
  const { user } = useAuth();
  const listRef = useRef<FlatList<LocalMessage>>(null);

  // Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const {
    messages, isLoading, isSending, isLoadingMore,
    hasMore, typingNames, sendMessage, sendWithAttachments,
    loadMore, publishTyping, connected,
  } = useChatWindow(conversationId, user?.id ?? 0);

  // Load conversation metadata for header
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    staleTime: 60_000,
  });

  const conversation = conversations.find((c) => c.id === conversationId);
  const other = conversation?.participants?.find((p) => p.userId !== user?.id) || conversation?.contact;
  const isGroup = conversation?.isGroup ?? (conversation?.type !== 'DIRECT');
  const headerName = isGroup
    ? (conversation?.title || conversation?.name || 'Group Chat')
    : (other?.name || conversation?.name || 'Resident');
  const isOtherOnline = other ? Boolean((other as any).isOnline ?? (other as any).online) : false;
  const headerSubtitle = connected
    ? (isOtherOnline ? 'Online' : 'Active')
    : 'Connecting…';

  // Compute matching messages
  const matchIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    const indices: number[] = [];
    messages.forEach((msg, idx) => {
      if (msg.content && msg.content.toLowerCase().includes(q)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [messages, searchQuery]);

  // Reset or adjust current match index when matches change
  useEffect(() => {
    if (matchIndices.length > 0) {
      setCurrentMatchIndex(0);
      listRef.current?.scrollToIndex({
        index: matchIndices[0],
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [searchQuery]);

  const handleNextMatch = () => {
    if (matchIndices.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchIndices.length;
    setCurrentMatchIndex(nextIdx);
    listRef.current?.scrollToIndex({
      index: matchIndices[nextIdx],
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handlePrevMatch = () => {
    if (matchIndices.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchIndices.length) % matchIndices.length;
    setCurrentMatchIndex(prevIdx);
    listRef.current?.scrollToIndex({
      index: matchIndices[prevIdx],
      animated: true,
      viewPosition: 0.5,
    });
  };

  const handleCloseSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setCurrentMatchIndex(0);
  };

  // Scroll to bottom when new messages arrive (only if not searching)
  useEffect(() => {
    if (!isSearching && messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length, isSearching]);

  // ── Render each message ────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<LocalMessage>) => {
      const isMine     = item.senderId === user?.id;
      const prevMsg    = index > 0 ? messages[index - 1] : undefined;
      const nextMsg    = messages[index + 1];

      // Show avatar only for first message in a consecutive received group
      const showAvatar = !isMine && (
        !nextMsg || nextMsg.senderId !== item.senderId || nextMsg.senderId === user?.id
      );

      const isCurrentMatch = isSearching && matchIndices.length > 0 && matchIndices[currentMatchIndex] === index;

      return (
        <MessageBubble
          message={item}
          isMine={isMine}
          showAvatar={showAvatar}
          prevMessage={prevMsg}
          searchQuery={isSearching ? searchQuery : undefined}
          isCurrentMatch={isCurrentMatch}
        />
      );
    },
    [messages, user?.id, isSearching, searchQuery, matchIndices, currentMatchIndex],
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
          onToggleSearch={() => {}}
          isSearching={false}
          searchQuery=""
          onSearchChange={() => {}}
          matchCount={0}
          currentMatch={0}
          onNextMatch={() => {}}
          onPrevMatch={() => {}}
          onCloseSearch={() => {}}
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
        onToggleSearch={() => setIsSearching(true)}
        isSearching={isSearching}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchCount={matchIndices.length}
        currentMatch={currentMatchIndex}
        onNextMatch={handleNextMatch}
        onPrevMatch={handlePrevMatch}
        onCloseSearch={handleCloseSearch}
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
          keyExtractor={(m) => m._optimisticId ?? String(m.id)}
          renderItem={renderItem}
          contentContainerStyle={scr.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            // Wait and retry in case layout is measuring
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: true });
            }, 100);
          }}
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
          onSendAttachments={sendWithAttachments}
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
  emptyText:   { fontSize: 17, fontFamily: 'DMSans-SemiBold', fontWeight: '600', color: COLORS.text },
  emptyHint:   { fontSize: 14, color: COLORS.textMuted },
});
