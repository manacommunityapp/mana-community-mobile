import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

interface QuickAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
  bgColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: 'football',          label: 'Sports',    route: '/sports',      color: '#059669', bgColor: '#D1FAE5' },
  { icon: 'car',               label: 'Commute',   route: '/commute',     color: '#2563EB', bgColor: '#DBEAFE' },
  { icon: 'stats-chart',       label: 'Polls',     route: '/polls',       color: '#7C3AED', bgColor: '#EDE9FE' },
  { icon: 'pricetag',          label: 'Auction',   route: '/auction',          color: '#D97706', bgColor: '#FEF3C7' },
  { icon: 'storefront',        label: 'Market',    route: '/tabs/marketplace', color: '#DC2626', bgColor: '#FEE2E2' },
  { icon: 'calendar',          label: 'Events',    route: '/tabs/events',      color: '#0891B2', bgColor: '#CFFAFE' },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={styles.item}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconCircle, { backgroundColor: action.bgColor }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
              {/* Bottom color accent line */}
              <View style={[styles.iconAccent, { backgroundColor: action.color }]} />
            </View>
            <Text style={[styles.label, { color: action.color }]} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  item: {
    alignItems: 'center',
    width: 60,
    gap: 7,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,          // fully circular
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  iconAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
