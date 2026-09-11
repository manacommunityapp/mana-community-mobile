import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/config';

// Simple icon labels (replace with react-native-vector-icons or expo-symbols as needed)
function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.iconLabel, focused && styles.iconLabelActive]}>{label}</Text>
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
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏘️" label="Feed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" label="Shop" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" label="Events" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profile" focused={focused} />,
        }}
      />
      {/* Hidden tabs — accessible via stack navigation, not the tab bar */}
      <Tabs.Screen name="sports" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar:          { height: 72, paddingBottom: 8, paddingTop: 8, borderTopColor: COLORS.border, backgroundColor: COLORS.surface, elevation: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  iconWrap:        { alignItems: 'center', gap: 2 },
  emoji:           { fontSize: 22 },
  iconLabel:       { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  iconLabelActive: { color: COLORS.primary, fontWeight: '700' },
});
