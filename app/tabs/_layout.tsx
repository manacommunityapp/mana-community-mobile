import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/context/ThemeContext';
import { SHADOWS, FONTS } from '@/constants/config';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface TabMeta {
  label: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

const TAB_META: Record<string, TabMeta> = {
  feed:     { label: 'Home',     icon: 'home-outline',     iconFocused: 'home' },
  discover: { label: 'Discover', icon: 'grid-outline',     iconFocused: 'grid' },
  pay:      { label: 'Pay',      icon: 'card-outline',     iconFocused: 'card' },
  bookings: { label: 'Bookings', icon: 'calendar-outline', iconFocused: 'calendar' },
  profile:  { label: 'Profile',  icon: 'person-outline',   iconFocused: 'person' },
};

interface FloatingTabRoute {
  key: string;
  name: string;
}

interface FloatingTabDescriptor {
  options: {
    tabBarAccessibilityLabel?: string;
    hidden?: boolean;
  };
  navigation?: {
    emit?: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
    navigate?: (name: string) => void;
  };
}

interface FloatingTabBarProps {
  state: {
    index: number;
    routes: FloatingTabRoute[];
  };
  descriptors: Record<string, FloatingTabDescriptor>;
  emitter?: {
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
  };
  navigateToTab?: (routeKey: string) => void;
  insets?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showPayTab: boolean;
  unreadCount: number;
}

function FloatingPillTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets: tabInsets,
  showPayTab,
  unreadCount,
}: FloatingTabBarProps) {
  const safeInsets = useSafeAreaInsets();
  const { palette } = useAppTheme();

  const bottomPadding = Math.max(
    tabInsets?.bottom ?? safeInsets.bottom,
    Platform.OS === 'ios' ? 16 : 10,
  );

  const visibleRoutes = state.routes.filter((route) => {
    if (!TAB_META[route.name]) return false;
    if (route.name === 'pay' && !showPayTab) return false;
    return true;
  });

  return (
    <View
      pointerEvents="box-none"
      style={styles.dockWrapper}
    >
      <View
        pointerEvents="auto"
        role="tablist"
        style={[
          styles.dockPill,
          {
            backgroundColor: palette.dockBg,
            borderColor: palette.dockBorder,
            paddingBottom: bottomPadding,
          },
        ]}
      >
        {visibleRoutes.map((route) => {
          const meta = TAB_META[route.name];
          const currentActiveRoute = state.routes[state.index]?.name;
          const isFocused = currentActiveRoute === route.name;
          const descriptor = descriptors[route.key];
          const options = descriptor?.options ?? {};

          const onPress = () => {
            const event = emitter
              ? emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
              : { defaultPrevented: false };
            if (!isFocused && !event.defaultPrevented) {
              if (navigateToTab) {
                navigateToTab(route.key);
              } else {
                descriptor?.navigation?.navigate?.(route.name);
              }
            }
          };

          const onLongPress = () => {
            emitter?.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const showDot = route.name === 'feed' && unreadCount > 0;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              <View style={styles.iconSlot}>
                <Ionicons
                  name={isFocused ? meta.iconFocused : meta.icon}
                  size={22}
                  color={isFocused ? palette.primary : palette.dockInactiveIcon}
                />
                {showDot && (
                  <View
                    style={[
                      styles.unreadDot,
                      { borderColor: palette.dockBg },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? palette.primary : palette.dockInactiveIcon,
                    fontFamily: isFocused ? FONTS.bold : FONTS.medium,
                  },
                ]}
                numberOfLines={1}
              >
                {meta.label}
              </Text>
              {isFocused && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: palette.primary },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { hasModule, isSuperAdmin } = useAuth();
  const { palette } = useAppTheme();
  // Pay tab is only meaningful when the community has payments or dues enabled.
  const showPayTab = isSuperAdmin || hasModule('PAYMENTS') || hasModule('FINANCE_MGMT');

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount().catch(() => 0),
    refetchInterval: 30_000,
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.appBg },
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props: any) => (
        <FloatingPillTabBar
          state={props.state}
          descriptors={props.descriptors}
          emitter={props.emitter}
          navigateToTab={props.navigateToTab}
          insets={props.insets}
          showPayTab={showPayTab}
          unreadCount={unreadCount}
        />
      )}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarAccessibilityLabel: unreadCount > 0 ? `Home, ${unreadCount} notifications` : 'Home',
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarAccessibilityLabel: 'Discover',
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          href: showPayTab ? undefined : null,
          tabBarAccessibilityLabel: 'Pay',
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          tabBarAccessibilityLabel: 'Bookings',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: 'Profile',
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
  dockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    zIndex: 50,
    elevation: 16,
  },
  dockPill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    ...SHADOWS.floating,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    minHeight: 46,
  },
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  activeIndicator: {
    width: 16,
    height: 2.5,
    borderRadius: 2,
    marginTop: 3,
  },
  unreadDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
  },
});
