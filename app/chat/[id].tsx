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
import {
  COLORS, SHADOWS, RADIUS, SPACING, FONTS,
  getInitials, getAvatarColor,
} from '@/constants/config';

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
  const avatarColor = getAvatarColor(name);

  if (isSearching) {
    return (
      <View style={hdr.searchContainer}>
        <TouchableOpacity onPress={onCloseSearch} style={hdr.navBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
        </TouchableOpacity>

        <View style={hdr.searchInputWrap}>
          <Text style={hdr.searchEmoji}>🔍</Text>
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
              <Ionicons name="chevron-up" size={16} color={matchCount === 0 ? COLORS.textMuted : COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onNextMatch}
              disabled={matchCount === 0}
              style={[hdr.arrowBtn, matchCount === 0 && hdr.btnDisabled]}
              hitSlop={6}
            >
              <Ionicons name="chevron-down" size={16} color={matchCount === 0 ? COLORS.textMuted : COLORS.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={hdr.container}>
      <TouchableOpacity onPress={onBack} style={hdr.navBtn} hitSlop={8}>
        <Ionicons name="arrow-back" size={18} color={COLORS.text} />
      </TouchableOpacity>

      <View style={[hdr.avatar, { backgroundColor: avatarColor.bg }]}>
        <Text style={[hdr.avatarText, { color: avatarColor.text }]}>{getInitials(name)}</Text>
      </View>

      <View style={hdr.info}>
        <Text style={hdr.name} numberOfLines={1}>{name}</Text>
        <View style={hdr.statusRow}>
          <StatusDot connected={connected} />
          <Text style={hdr.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onToggleSearch}
        style={hdr.actionBtn}
        hitSlop={8}
      >
        <Text style={hdr.actionEmoji}>🔍</Text>
      </TouchableOpacity>
    </View>
  );
}

const hdr = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
    gap: 10,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 16,
  },
  info: { flex: 1, gap: 2 },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.2,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  actionEmoji: { fontSize: 16 },
  // ── Search Mode
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  searchEmoji: { fontSize: 13 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
    fontFamily: FONTS.regular,
  },
  searchNav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  matchCounter: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginRight: 2,
    fontFamily: FONTS.bold,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  btnDisabled: { opacity: 0.35 },
});

// ── Main Screen ────────────────────────────────────────────────
export default function ChatWindowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Number(id);
  const router  = useRouter();
  const { user } = useAuth();
  const listRef = useRef<FlatList<LocalMessage>>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const {
    messages, isLoading, isSending, isLoadingMore,
    hasMore, typingNames, sendMessage, sendWithAttachments,
    loadMore, publishTyping, connected,
  } = useChatWindow(conversationId, user?.id ?? 0);

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

  useEffect(() => {
    if (!isSearching && messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [messages.length, isSearching]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<LocalMessage>) => {
      const isMine     = item.senderId === user?.id;
      const prevMsg    = index > 0 ? messages[index - 1] : undefined;
      const nextMsg    = messages[index + 1];
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

  const handleScroll = useCallback(
    ({ nativeEvent }: any) => {
      if (nativeEvent.contentOffset.y < 60 && hasMore && !isLoadingMore) {
        loadMore();
      }
    },
    [hasMore, isLoadingMore, loadMore],
  );

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
        <View style={scr.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
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
        {isLoadingMore && (
          <ActivityIndicator
            style={{ paddingVertical: 8 }}
            color={COLORS.primary}
            size="small"
          />
        )}

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
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: true });
            }, 100);
          }}
          ListEmptyComponent={
            <View style={scr.empty}>
              <View style={scr.emptyCircle}>
                <Text style={scr.emptyEmoji}>💬</Text>
              </View>
              <Text style={scr.emptyTitle}>No messages yet</Text>
              <Text style={scr.emptyHint}>Say hello! 👋</Text>
            </View>
          }
        />

        <TypingIndicator names={typingNames} />

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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingVertical: 12, paddingBottom: 4 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 8,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyEmoji: { fontSize: 30 },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    fontWeight: '700',
    color: COLORS.text,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
});
