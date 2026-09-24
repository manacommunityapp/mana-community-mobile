import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { chatService } from '@/services/chatService';
import { ConversationDto } from '@/types/api';
import { Header } from '@/components/common/Header';
import { COLORS, SHADOWS, RADIUS, getAvatarColor } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';

// ── ConversationItem ───────────────────────────────────────────────────────────
function ConversationItem({ item }: { item: ConversationDto }) {
  const router = useRouter();
  const isGroup = item.type !== 'DIRECT';
  const other = item.participants?.[0];
  const name = isGroup ? (item.name ?? 'Group') : (other?.name ?? 'Unknown');
  const hasUnread = item.unreadCount > 0;
  const avatarColor = getAvatarColor(name);

  return (
    <TouchableOpacity
      style={[styles.item, hasUnread && styles.itemUnread]}
      onPress={() => router.push(`/chat/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: avatarColor.bg }]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }]}>
            {name[0].toUpperCase()}
          </Text>
        </View>
        {other?.online && <View style={styles.onlineDot} />}
        {isGroup && (
          <View style={styles.groupBadge}>
            <Ionicons name="people" size={9} color="#fff" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemName, hasUnread && styles.itemNameBold]} numberOfLines={1}>
            {name}
          </Text>
          {item.lastMessageTime && (
            <Text style={[styles.itemTime, hasUnread && styles.itemTimeActive]}>
              {formatDistanceToNow(new Date(item.lastMessageTime), { addSuffix: false })}
            </Text>
          )}
        </View>
        <View style={styles.itemFooter}>
          <Text style={[styles.itemLast, hasUnread && styles.itemLastBold]} numberOfLines={1}>
            {item.lastMessage ?? 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── ChatScreen ─────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const [search, setSearch] = useState('');
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    refetchInterval: 10_000,
  });

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const filtered = search
    ? conversations.filter((c) => {
        const name = c.type === 'DIRECT'
          ? (c.participants?.[0]?.name ?? '')
          : (c.name ?? '');
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Messages"
        subtitle={totalUnread > 0 ? `${totalUnread} unread` : undefined}
        actions={[{ icon: 'create-outline', onPress: () => {} }]}
      />

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
          <TextInput
            style={styles.search}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => <ConversationItem item={item} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="chatbubbles-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? 'No results' : 'No conversations yet'}
              </Text>
              <Text style={styles.emptyText}>
                {search ? 'Try a different search term.' : 'Start chatting with your neighbors!'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  // ── Search
  searchWrap:   { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 0, borderWidth: 1, borderColor: COLORS.border },
  search:       { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  // ── List item
  item:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  itemUnread:   { backgroundColor: '#F5F7FF' },
  // ── Avatar
  avatarWrap:   { position: 'relative', width: 50, height: 50, flexShrink: 0 },
  avatar:       { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontWeight: '700', fontSize: 19 },
  onlineDot:    { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 2.5, borderColor: COLORS.surface },
  groupBadge:   { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface },
  // ── Item body
  itemBody:     { flex: 1, gap: 4 },
  itemHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName:     { fontSize: 15, fontWeight: '500', color: COLORS.text, flex: 1 },
  itemNameBold: { fontWeight: '700' },
  itemTime:     { fontSize: 12, color: COLORS.textMuted, marginLeft: 8 },
  itemTimeActive:{ color: COLORS.primary, fontWeight: '600' },
  itemFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLast:     { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  itemLastBold: { color: COLORS.textSecondary, fontWeight: '500' },
  badge:        { backgroundColor: COLORS.primary, borderRadius: 12, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 },
  badgeText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  // ── Empty
  empty:        { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyIconWrap:{ width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText:    { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
});
