import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationService,
  inferPriority,
  inferCategory,
  type NotificationCategory,
} from '@/services/notificationService';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { syncAppBadge, clearAppBadge } from '@/hooks/usePushNotifications';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationDto } from '@/types/api';

type Filter = 'ALL' | NotificationCategory;

const FILTERS: Array<{ key: Filter; label: string; emoji: string }> = [
  { key: 'ALL',       label: 'All',       emoji: '🔔' },
  { key: 'SAFETY',    label: 'Safety',    emoji: '🚨' },
  { key: 'FINANCE',   label: 'Finance',   emoji: '💳' },
  { key: 'COMMUNITY', label: 'Community', emoji: '🏘️' },
  { key: 'SPORTS',    label: 'Sports',    emoji: '🏆' },
  { key: 'FOOD',      label: 'Food',      emoji: '🍱' },
  { key: 'VISITORS',  label: 'Visitors',  emoji: '🛡️' },
  { key: 'HELPDESK',  label: 'Helpdesk',  emoji: '🎫' },
  { key: 'EVENTS',    label: 'Events',    emoji: '📅' },
];

const TYPE_META: Record<string, { emoji: string; color: string; bg: string }> = {
  MESSAGE:     { emoji: '💬', color: '#2563EB', bg: '#DBEAFE' },
  POST:        { emoji: '📝', color: '#7C3AED', bg: '#EDE9FE' },
  LIKE:        { emoji: '❤️', color: '#DC2626', bg: '#FEE2E2' },
  COMMENT:     { emoji: '💭', color: '#059669', bg: '#D1FAE5' },
  EVENT:       { emoji: '📅', color: '#0891B2', bg: '#CFFAFE' },
  SPORTS:      { emoji: '🏆', color: '#059669', bg: '#D1FAE5' },
  AUCTION:     { emoji: '🔨', color: '#D97706', bg: '#FEF3C7' },
  VISITOR:     { emoji: '🛡️', color: '#059669', bg: '#D1FAE5' },
  PARKING:     { emoji: '🚗', color: '#2563EB', bg: '#DBEAFE' },
  FINANCE:     { emoji: '💳', color: '#4F46E5', bg: '#EEF2FF' },
  HELPDESK:    { emoji: '🎫', color: '#D97706', bg: '#FEF3C7' },
  SAFETY:      { emoji: '🚨', color: '#DC2626', bg: '#FEE2E2' },
  EMERGENCY:   { emoji: '🚨', color: '#DC2626', bg: '#FEE2E2' },
  SOS:         { emoji: '🆘', color: '#DC2626', bg: '#FEE2E2' },
  MARKETPLACE: { emoji: '🛒', color: '#DC2626', bg: '#FEE2E2' },
  COMMUNITY:   { emoji: '🏘️', color: '#4F46E5', bg: '#EEF2FF' },
  FOOD:        { emoji: '🍱', color: '#EA580C', bg: '#FFEDD5' },
  ORDER:       { emoji: '🛍️', color: '#7C3AED', bg: '#EDE9FE' },
};

function getTypeMeta(type: string) {
  for (const [key, val] of Object.entries(TYPE_META)) {
    if (type.toUpperCase().includes(key)) return val;
  }
  return { emoji: '🔔', color: COLORS.primary, bg: COLORS.primaryLight };
}

const PRIORITY_BORDER: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH:     '#D97706',
  MEDIUM:   COLORS.primary,
  LOW:      '#94A3B8',
};

function NotificationItem({
  item,
  onPress,
}: {
  item: NotificationDto;
  onPress: (n: NotificationDto) => void;
}) {
  const meta     = getTypeMeta(item.type);
  const priority = inferPriority(item.type);
  const isCritical = priority === 'CRITICAL';

  return (
    <TouchableOpacity
      style={[card.wrap, !item.read && card.unread, isCritical && card.critical]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      {!item.read && (
        <View style={[card.unreadBar, { backgroundColor: PRIORITY_BORDER[priority] }]} />
      )}
      <View style={[card.iconWrap, { backgroundColor: meta.bg }]}>
        <Text style={card.icon}>{meta.emoji}</Text>
      </View>
      <View style={card.body}>
        <View style={card.titleRow}>
          <Text style={[card.title, !item.read && card.titleBold]} numberOfLines={1}>
            {item.title}
          </Text>
          {(priority === 'CRITICAL' || priority === 'HIGH') && (
            <View style={[card.priorityBadge, { backgroundColor: isCritical ? '#FEE2E2' : '#FEF3C7' }]}>
              <Text style={[card.priorityText, { color: isCritical ? '#DC2626' : '#D97706' }]}>
                {isCritical ? '🚨 URGENT' : '⚠️ HIGH'}
              </Text>
            </View>
          )}
        </View>
        <Text style={card.message} numberOfLines={2}>{item.body}</Text>
        <Text style={card.time}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
      {!item.read && <View style={[card.dot, { backgroundColor: PRIORITY_BORDER[priority] }]} />}
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 13, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  unread:        { backgroundColor: '#F5F7FF' },
  critical:      { backgroundColor: '#FFF5F5', borderLeftWidth: 0 },
  unreadBar:     { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3.5, borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  iconWrap:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:          { fontSize: 22 },
  body:          { flex: 1, gap: 2 },
  titleRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:         { flex: 1, fontSize: 14, color: COLORS.text },
  titleBold:     { fontFamily: 'DMSans-Bold', fontWeight: '700' },
  message:       { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  time:          { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, flexShrink: 0 },
  priorityText:  { fontSize: 10, fontWeight: '700' },
  dot:           { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
});

export default function NotificationsScreen() {
  const router = useRouter();
  const qc     = useQueryClient();
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notificationService.getAll(),
  });

  const notifications = data?.content ?? [];
  const unreadCount   = notifications.filter((n) => !n.read).length;

  useEffect(() => { syncAppBadge(unreadCount); }, [unreadCount]);

  const filtered = filter === 'ALL'
    ? notifications
    : notifications.filter((n) => inferCategory(n.type) === filter);

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await notificationService.markAllRead();
      await clearAppBadge();
    },
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handlePress = useCallback(
    (n: NotificationDto) => {
      if (!n.read) markReadMutation.mutate(n.id);
      const t = n.type?.toUpperCase() ?? '';
      if (t.includes('MESSAGE'))             router.push('/tabs/chat');
      else if (t.includes('VISITOR'))        router.push('/visitors');
      else if (t.includes('AUCTION'))        router.push('/auction');
      else if (t.includes('SPORTS') || t.includes('TOURNAMENT')) router.push('/sports');
      else if (t.includes('EVENT'))          router.push('/tabs/events');
      else if (t.includes('SAFETY') || t.includes('EMERGENCY') || t.includes('SOS')) router.push('/safety');
      else if (t.includes('FINANCE') || t.includes('BILLING') || t.includes('INVOICE') || t.includes('PAYMENT')) router.push('/finance');
      else if (t.includes('PARKING'))        router.push('/parking');
      else if (t.includes('HELPDESK') || t.includes('TICKET')) router.push('/helpdesk');
      else if (t.includes('FACILITY'))       router.push('/facilities');
      else if (t.includes('FOOD') || t.includes('ORDER')) router.push('/food');
      else if (t.includes('MARKETPLACE'))    router.push('/tabs/marketplace');
      else                                   router.push('/tabs/feed');
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
        <View style={scr.headerActions}>
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
          <TouchableOpacity
            style={scr.settingsBtn}
            onPress={() => router.push('/notifications/preferences')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filters */}
      <View style={scr.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={scr.filterScroll}
        >
          {FILTERS.map((f) => {
            const count = f.key === 'ALL'
              ? notifications.filter(n => !n.read).length
              : notifications.filter(n => inferCategory(n.type) === f.key && !n.read).length;
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[scr.chip, active && scr.chipActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.75}
              >
                <Text style={scr.chipEmoji}>{f.emoji}</Text>
                <Text style={[scr.chipLabel, active && scr.chipLabelActive]}>{f.label}</Text>
                {count > 0 && (
                  <View style={[scr.chipBadge, active && scr.chipBadgeActive]}>
                    <Text style={[scr.chipBadgeText, active && scr.chipBadgeTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={COLORS.primary} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={scr.empty}>
              <View style={scr.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={36} color={COLORS.primary} />
              </View>
              <Text style={scr.emptyTitle}>All caught up!</Text>
              <Text style={scr.emptyText}>
                {filter === 'ALL' ? 'No new notifications.' : `No ${filter.toLowerCase()} notifications.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  backBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  title:              { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text },
  subtitle:           { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 1 },
  headerActions:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markAllBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  markAll:            { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  settingsBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  filterWrap:         { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterScroll:       { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  chip:               { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: '#F1F5F9' },
  chipActive:         { backgroundColor: COLORS.primary },
  chipEmoji:          { fontSize: 13 },
  chipLabel:          { fontSize: 12, fontWeight: '600', color: '#475569' },
  chipLabelActive:    { color: '#FFFFFF', fontWeight: '700' },
  chipBadge:          { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipBadgeActive:    { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipBadgeText:      { fontSize: 10, fontWeight: '700', color: '#475569' },
  chipBadgeTextActive:{ color: '#FFFFFF' },
  empty:              { alignItems: 'center', paddingTop: 100, gap: 10, paddingHorizontal: 32 },
  emptyIconWrap:      { width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:         { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText:          { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
