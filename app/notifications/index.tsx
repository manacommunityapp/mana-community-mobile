import { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import { COLORS } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationDto } from '@/types/api';

// Map notification type → emoji icon
function typeIcon(type: string): string {
  if (type.includes('MESSAGE'))     return '💬';
  if (type.includes('POST'))        return '📝';
  if (type.includes('LIKE'))        return '❤️';
  if (type.includes('COMMENT'))     return '💭';
  if (type.includes('EVENT'))       return '📅';
  if (type.includes('SPORTS'))      return '🏆';
  if (type.includes('AUCTION'))     return '🔨';
  if (type.includes('MARKETPLACE')) return '🛒';
  if (type.includes('COMMUNITY'))   return '🏘️';
  return '🔔';
}

function NotificationItem({
  item,
  onPress,
}: {
  item: NotificationDto;
  onPress: (n: NotificationDto) => void;
}) {
  return (
    <TouchableOpacity
      style={[card.wrap, !item.read && card.unread]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {/* Unread dot */}
      {!item.read && <View style={card.dot} />}

      <View style={card.iconWrap}>
        <Text style={card.icon}>{typeIcon(item.type)}</Text>
      </View>

      <View style={card.body}>
        <Text style={[card.title, !item.read && card.titleBold]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={card.message} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={card.time}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, position: 'relative' },
  unread:    { backgroundColor: '#EEF2FF' },
  dot:       { position: 'absolute', top: 16, left: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  iconWrap:  { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:      { fontSize: 22 },
  body:      { flex: 1, gap: 3 },
  title:     { fontSize: 14, color: COLORS.text },
  titleBold: { fontWeight: '700' },
  message:   { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  time:      { fontSize: 11, color: COLORS.textMuted },
});

// ── Main screen ────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationService.getAll(),
  });

  const notifications = data?.content ?? [];
  const unreadCount   = notifications.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handlePress = useCallback(
    (n: NotificationDto) => {
      if (!n.read) markReadMutation.mutate(n.id);
      // Navigate based on type
      const t = n.type;
      if (t.includes('MESSAGE'))  router.push('/tabs/chat');
      else if (t.includes('EVENT')) router.push('/tabs/events');
      else if (t.includes('SPORTS')) router.push('/tabs/sports');
      else router.push('/tabs/feed');
    },
    [markReadMutation, router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<NotificationDto>) => (
      <NotificationItem item={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      {/* Header */}
      <View style={scr.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={scr.back}>‹</Text>
        </TouchableOpacity>
        <Text style={scr.title}>
          Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <Text style={scr.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={scr.empty}>
              <Text style={scr.emptyEmoji}>🔔</Text>
              <Text style={scr.emptyText}>You're all caught up!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  back:      { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  title:     { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  markAll:   { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  empty:     { alignItems: 'center', paddingTop: 100, gap: 10 },
  emptyEmoji:{ fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textMuted },
});
