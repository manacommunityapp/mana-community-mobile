import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import { chatService } from '@/services/chatService';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

interface StatTile {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  color: string;
  labelColor: string;
  bg: string;
  route: string;
}

export function CommunityStats() {
  const router = useRouter();

  const { data: unreadNotifs = 0 } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 30_000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    refetchInterval: 15_000,
  });

  const unreadMsgs = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const tiles: StatTile[] = [
    {
      id: 'events',
      label: 'Events Today',
      icon: 'calendar',
      value: 2,
      color: '#D97706',
      labelColor: '#92400E',
      bg: '#FEF3C7',
      route: '/tabs/events',
    },
    {
      id: 'messages',
      label: 'Unread Msgs',
      icon: 'chatbubbles',
      value: unreadMsgs,
      color: '#2563EB',
      labelColor: '#1E40AF',
      bg: '#DBEAFE',
      route: '/tabs/chat',
    },
    {
      id: 'polls',
      label: 'Active Polls',
      icon: 'stats-chart',
      value: 3,
      color: '#7C3AED',
      labelColor: '#5B21B6',
      bg: '#EDE9FE',
      route: '/polls',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications',
      value: unreadNotifs,
      color: '#EF4444',
      labelColor: '#991B1B',
      bg: '#FEE2E2',
      route: '/notifications',
    },
    {
      id: 'sports',
      label: 'Live Matches',
      icon: 'trophy',
      value: 1,
      color: '#059669',
      labelColor: '#065F46',
      bg: '#D1FAE5',
      route: '/sports',
    },
    {
      id: 'tickets',
      label: 'Open Tickets',
      icon: 'construct',
      value: 0,
      color: '#0891B2',
      labelColor: '#155E75',
      bg: '#CFFAFE',
      route: '/helpdesk',
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.scroll}
      style={s.container}
    >
      {tiles.map(tile => (
        <TouchableOpacity
          key={tile.id}
          style={[s.tile, { backgroundColor: tile.bg }]}
          onPress={() => router.push(tile.route as any)}
          activeOpacity={0.7}
        >
          <View style={s.tileTop}>
            <Text style={[s.tileValue, { color: tile.color }]}>{tile.value}</Text>
            <Ionicons name={tile.icon} size={16} color={tile.color} style={s.tileIcon} />
          </View>
          <Text style={[s.tileLabel, { color: tile.labelColor }]} numberOfLines={1}>
            {tile.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 0 },
  scroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  tile: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 110,
    ...SHADOWS.sm,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tileValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tileIcon: { opacity: 0.7 },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
