import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { COLORS, RADIUS, SHADOWS, FONTS } from '@/constants/config';

type IoniconsName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  icon,
  iconFocused,
  label,
  focused,
  badgeCount,
}: {
  icon: IoniconsName;
  iconFocused: IoniconsName;
  label: string;
  focused: boolean;
  badgeCount?: number;
}) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.iconBg, focused && styles.iconBgActive]}>
        <Ionicons
          name={focused ? iconFocused : icon}
          size={22}
          color={focused ? COLORS.primary : COLORS.textMuted}
        />
        {badgeCount != null && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.iconLabel, focused && styles.iconLabelActive]}>
        {label}
      </Text>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabsLayout() {
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    refetchInterval: 15_000,
  });

  const chatUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarAccessibilityLabel: 'Home feed',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home-outline" iconFocused="home" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          tabBarAccessibilityLabel: 'Marketplace',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="storefront-outline" iconFocused="storefront" label="Shop" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          tabBarAccessibilityLabel: 'Home services',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="construct-outline" iconFocused="construct" label="Services" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          tabBarAccessibilityLabel: 'Events calendar',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="calendar-outline" iconFocused="calendar" label="Events" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarAccessibilityLabel: chatUnreadCount > 0 ? `Chat, ${chatUnreadCount} unread` : 'Chat',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="chatbubbles-outline"
              iconFocused="chatbubbles"
              label="Chat"
              focused={focused}
              badgeCount={chatUnreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="person-outline" iconFocused="person" label="Profile" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="sports" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 86 : 66,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 22 : 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,102,241,0.12)',
    backgroundColor: COLORS.surface,
    ...SHADOWS.lg,
    elevation: 20,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    minWidth: 54,
    gap: 2,
  },
  iconBg: {
    width: 46,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBgActive: {
    backgroundColor: COLORS.primaryLight,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.1,
    fontFamily: FONTS.semiBold,
  },
  iconLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: 1,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    fontFamily: FONTS.bold,
  },
});
