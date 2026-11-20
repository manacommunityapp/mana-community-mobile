import { THEME } from '@/constants/theme';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
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
          color={focused ? THEME.brandDark : THEME.textSecondary}
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
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount().catch(() => 0),
    refetchInterval: 30_000,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: THEME.brandDark,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarAccessibilityLabel: unreadCount > 0 ? `Home, ${unreadCount} notifications` : 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="home-outline"
              iconFocused="home"
              label="Home"
              focused={focused}
              badgeCount={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarAccessibilityLabel: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="grid-outline" iconFocused="grid" label="Discover" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          tabBarAccessibilityLabel: 'Pay',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="card-outline" iconFocused="card" label="Pay" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          tabBarAccessibilityLabel: 'Bookings',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="calendar-outline" iconFocused="calendar" label="Bookings" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: 'My Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="person-circle-outline" iconFocused="person-circle" label="My Profile" focused={focused} />
          ),
        }}
      />
      {/* Hidden screens — accessible via deep link / router.push */}
      <Tabs.Screen name="marketplace" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
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
    borderTopColor: THEME.border,
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
    backgroundColor: THEME.brandLight,
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
