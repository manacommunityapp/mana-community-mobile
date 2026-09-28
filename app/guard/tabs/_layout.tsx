import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { GUARD_COLORS } from '@/constants/guardTheme';

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
          color={focused ? GUARD_COLORS.accent : COLORS.textMuted}
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
    </View>
  );
}

export default function GuardTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: GUARD_COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="grid-outline" iconFocused="grid" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="people-outline" iconFocused="people" label="Visitors" focused={focused} badgeCount={4} />
          ),
        }}
      />
      <Tabs.Screen
        name="incidents"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="warning-outline" iconFocused="warning" label="Incidents" focused={focused} badgeCount={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="patrol"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="shield-outline" iconFocused="shield" label="Patrol" focused={focused} />
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
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    borderTopWidth: 0,
    backgroundColor: COLORS.surface,
    ...SHADOWS.lg,
    elevation: 16,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    minWidth: 54,
  },
  iconBg: {
    width: 44,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBgActive: {
    backgroundColor: GUARD_COLORS.accentLight,
  },
  iconLabel: {
    fontSize: 10,
    fontFamily: 'DMSans-SemiBold', fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  iconLabelActive: {
    color: GUARD_COLORS.accent,
    fontFamily: 'DMSans-Bold', fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: 0,
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
    fontFamily: 'DMSans-Bold', fontWeight: '800',
  },
});
