import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { chatService } from '@/services/chatService';
import { ConversationDto } from '@/types/api';
import { COLORS } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';

function ConversationItem({ item }: { item: ConversationDto }) {
  const router = useRouter();
  const other = item.participants?.[0];
  const name  = item.type === 'DIRECT' ? (other?.name ?? 'Unknown') : (item.name ?? 'Group');

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/chat/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name[0]}</Text>
        {other?.online && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
          {item.lastMessageTime && (
            <Text style={styles.itemTime}>
              {formatDistanceToNow(new Date(item.lastMessageTime), { addSuffix: false })}
            </Text>
          )}
        </View>
        <View style={styles.itemFooter}>
          <Text style={styles.itemLast} numberOfLines={1}>
            {item.lastMessage ?? 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    refetchInterval: 10_000,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search conversations…"
          placeholderTextColor={COLORS.textMuted}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => <ConversationItem item={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No conversations yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  header:      { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  searchWrap:  { padding: 12, backgroundColor: COLORS.surface },
  search:      { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.text },
  item:        { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 18 },
  onlineDot:   { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.surface },
  itemBody:    { flex: 1, gap: 4 },
  itemHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName:    { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  itemTime:    { fontSize: 12, color: COLORS.textMuted },
  itemFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLast:    { fontSize: 13, color: COLORS.textMuted, flex: 1 },
  badge:       { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:   { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty:       { alignItems: 'center', paddingTop: 80 },
  emptyText:   { color: COLORS.textMuted, fontSize: 15 },
});
