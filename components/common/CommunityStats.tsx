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
      icon: 'calendar-outline',
      value: 2,
      color: '#4F46E5',
      labelColor: '#3730A3',
      bg: '#EEF2FF',
      route: '/tabs/events',
    },
    {
      id: 'messages',
      label: 'Unread Msgs',
      icon: 'chatbubbles-outline',
      value: unreadMsgs,
      color: '#2563EB',
      labelColor: '#1E40AF',
      bg: '#DBEAFE',
      route: '/tabs/chat',
    },
    {
      id: 'polls',
      label: 'Active Polls',
      icon: 'bar-chart-outline',
      value: 3,
      color: '#7C3AED',
      labelColor: '#5B21B6',
      bg: '#EDE9FE',
      route: '/polls',
    },
    {
      id: 'tickets',
      label: 'Open Tickets',
      icon: 'headset-outline',
      value: 0,
      color: '#0891B2',
      labelColor: '#155E75',
      bg: '#CFFAFE',
      route: '/helpdesk',
    },
    {
      id: 'sports',
      label: 'Live Matches',
      icon: 'trophy-outline',
      value: 1,
      color: '#059669',
      labelColor: '#065F46',
      bg: '#DCFCE7',
      route: '/sports',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'notifications-outline',
      value: unreadNotifs,
      color: '#2563EB',
      labelColor: '#1E40AF',
      bg: '#DBEAFE',
      route: '/notifications',
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
  scroll: { paddingHorizontal: 14, paddingVertical: 5, gap: 6 },
  tile: {
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 84,
    ...SHADOWS.sm,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tileValue: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  tileIcon: { opacity: 0.75 },
  tileLabel: {
    fontSize: 11.5,
    fontFamily: 'DMSans-SemiBold',
    fontWeight: '600',
    lineHeight: 15,
  },
});
