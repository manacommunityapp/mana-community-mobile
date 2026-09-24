import { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationDto } from '@/types/api';

const TYPE_META: Record<string, { emoji: string; color: string; bg: string }> = {
  MESSAGE:     { emoji: '💬', color: '#2563EB', bg: '#DBEAFE' },
  POST:        { emoji: '📝', color: '#7C3AED', bg: '#EDE9FE' },
  LIKE:        { emoji: '❤️', color: '#DC2626', bg: '#FEE2E2' },
  COMMENT:     { emoji: '💭', color: '#059669', bg: '#D1FAE5' },
  EVENT:       { emoji: '📅', color: '#0891B2', bg: '#CFFAFE' },
  SPORTS:      { emoji: '🏆', color: '#059669', bg: '#D1FAE5' },
  AUCTION:     { emoji: '🔨', color: '#D97706', bg: '#FEF3C7' },
  MARKETPLACE: { emoji: '🛒', color: '#DC2626', bg: '#FEE2E2' },
  COMMUNITY:   { emoji: '🏘️', color: '#4F46E5', bg: '#EEF2FF' },
};

function getTypeMeta(type: string) {
  for (const [key, val] of Object.entries(TYPE_META)) {
    if (type.includes(key)) return val;
  }
  return { emoji: '🔔', color: COLORS.primary, bg: COLORS.primaryLight };
}

function NotificationItem({
  item,
  onPress,
}: {
  item: NotificationDto;
  onPress: (n: NotificationDto) => void;
}) {
  const meta = getTypeMeta(item.type);
  return (
    <TouchableOpacity
      style={[card.wrap, !item.read && card.unread]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {!item.read && <View style={[card.unreadBar, { backgroundColor: meta.color }]} />}
      <View style={[card.iconWrap, { backgroundColor: meta.bg }]}>
        <Text style={card.icon}>{meta.emoji}</Text>
      </View>
      <View style={card.body}>
        <Text style={[card.title, !item.read && card.titleBold]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={card.message} numberOfLines={2}>{item.body}</Text>
        <Text style={card.time}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
      {!item.read && <View style={[card.dot, { backgroundColor: meta.color }]} />}
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 13, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  unread:    { backgroundColor: '#F5F7FF' },
  unreadBar: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3.5, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  iconWrap:  { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:      { fontSize: 22 },
  body:      { flex: 1, gap: 2 },
  title:     { fontSize: 14, color: COLORS.text },
  titleBold: { fontWeight: '700' },
  message:   { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  time:      { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  dot:       { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
});

export default function NotificationsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
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
      const t = n.type;
      if (t.includes('MESSAGE'))     router.push('/tabs/chat');
      else if (t.includes('EVENT'))  router.push('/tabs/events');
      else if (t.includes('SPORTS')) router.push('/sports');
      else                           router.push('/tabs/feed');
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
      <View style={scr.header}>
        <TouchableOpacity
          style={scr.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={scr.title}>Notifications</Text>
          {unreadCount > 0 && <Text style={scr.subtitle}>{unreadCount} unread</Text>}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={scr.markAllBtn}
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <Ionicons name="checkmark-done" size={14} color={COLORS.primary} />
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
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={scr.empty}>
              <View style={scr.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={scr.emptyTitle}>All caught up!</Text>
              <Text style={scr.emptyText}>No new notifications right now.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title:        { fontSize: 17, fontWeight: '700', color: COLORS.text },
  subtitle:     { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 1 },
  markAllBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  markAll:      { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  empty:        { alignItems: 'center', paddingTop: 100, gap: 10, paddingHorizontal: 32 },
  emptyIconWrap:{ width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText:    { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
