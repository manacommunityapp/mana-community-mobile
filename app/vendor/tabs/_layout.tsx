import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const TAB_ITEMS: { name: string; title: string; icon: IoniconsName; badge?: number }[] = [
  { name: 'dashboard', title: 'Dashboard', icon: 'grid' },
  { name: 'bookings', title: 'Bookings', icon: 'calendar', badge: 2 },
  { name: 'work-orders', title: 'Jobs', icon: 'construct', badge: 4 },
  { name: 'payments', title: 'Payments', icon: 'wallet' },
  { name: 'profile', title: 'Profile', icon: 'person' },
];

export default function VendorTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: VENDOR_COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: s.tabBar,
        tabBarLabelStyle: s.tabLabel,
      }}
    >
      {TAB_ITEMS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, size }) => (
              <View style={[s.iconWrap, focused && s.iconWrapActive]}>
                <Ionicons
                  name={focused ? tab.icon : (`${tab.icon}-outline` as IoniconsName)}
                  size={size - 2}
                  color={focused ? VENDOR_COLORS.accent : COLORS.textMuted}
                />
              </View>
            ),
            tabBarBadge: tab.badge,
            tabBarBadgeStyle: s.badge,
          }}
        />
      ))}
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 60,
    paddingBottom: 6,
  },
  tabLabel: { fontSize: 10, fontWeight: '600' },
  iconWrap: {
    width: 36, height: 28, borderRadius: RADIUS.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: VENDOR_COLORS.accentLight,
    borderRadius: RADIUS.full,
  },
  badge: {
    backgroundColor: VENDOR_COLORS.accent,
    fontSize: 10, fontWeight: '700',
    minWidth: 18, height: 18,
  },
});
