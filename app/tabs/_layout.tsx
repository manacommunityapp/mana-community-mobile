import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';

type IoniconsName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  icon,
  iconFocused,
  label,
  focused,
}: {
  icon: IoniconsName;
  iconFocused: IoniconsName;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      {/* Active pill indicator above icon */}
      <View style={[styles.pill, focused && styles.pillActive]} />
      <View style={[styles.iconBg, focused && styles.iconBgActive]}>
        <Ionicons
          name={focused ? iconFocused : icon}
          size={22}
          color={focused ? COLORS.primary : COLORS.textMuted}
        />
      </View>
      <Text style={[styles.iconLabel, focused && styles.iconLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home-outline" iconFocused="home" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="storefront-outline" iconFocused="storefront" label="Shop" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="calendar-outline" iconFocused="calendar" label="Events" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="chatbubbles-outline" iconFocused="chatbubbles" label="Chat" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="person-outline" iconFocused="person" label="Profile" focused={focused} />
          ),
        }}
      />
      {/* Hidden tabs — accessible via stack navigation, not the tab bar */}
      <Tabs.Screen name="sports" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 86 : 70,
    paddingTop: 0,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    // Stronger shadow so the bar floats above content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
    gap: 3,
    minWidth: 56,
  },
  /** Slim pill indicator shown above the icon when focused */
  pill: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
  },
  iconBg: {
    width: 38,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgActive: {
    backgroundColor: COLORS.primaryLight,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    letterSpacing: 0.1,
  },
  iconLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
