import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  bg: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'events',     icon: 'calendar',         label: 'Events',     route: '/tabs/events',       bg: '#EEF2FF', color: '#4F46E5' },
  { id: 'sports',     icon: 'trophy',           label: 'Sports',     route: '/sports',            bg: '#FEF3C7', color: '#D97706' },
  { id: 'market',     icon: 'storefront',       label: 'Market',     route: '/tabs/marketplace',  bg: '#D1FAE5', color: '#059669' },
  { id: 'food',       icon: 'restaurant',       label: 'Food',       route: '/food',              bg: '#FFE4E6', color: '#E11D48' },
  { id: 'visitors',   icon: 'shield-checkmark', label: 'Visitors',   route: '/visitors',          bg: '#DBEAFE', color: '#2563EB' },
  { id: 'parking',    icon: 'car',              label: 'Parking',    route: '/parking',           bg: '#E0E7FF', color: '#4338CA' },
  { id: 'facilities', icon: 'fitness',          label: 'Facilities', route: '/facilities',        bg: '#CCFBF1', color: '#0D9488' },
  { id: 'services',   icon: 'construct',        label: 'Services',   route: '/services',          bg: '#FEE2E2', color: '#DC2626' },
  { id: 'pets',       icon: 'paw',              label: 'Pets',       route: '/pets',              bg: '#FCE7F3', color: '#DB2777' },
  { id: 'commute',    icon: 'car-sport',        label: 'Commute',    route: '/commute',           bg: '#F3E8FF', color: '#7C3AED' },
  { id: 'polls',      icon: 'stats-chart',      label: 'Polls',      route: '/polls',             bg: '#FFF7ED', color: '#EA580C' },
  { id: 'auction',    icon: 'pricetag',         label: 'Auction',    route: '/auction',           bg: '#ECFDF5', color: '#10B981' },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <View style={s.wrapper}>
      <View style={s.headerRow}>
        <Text style={s.heading}>Services</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={s.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={s.item}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.7}
          >
            <View style={[s.iconCircle, { backgroundColor: action.bg }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={s.label} numberOfLines={1}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    paddingTop: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heading: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  item: {
    alignItems: 'center',
    width: 72,
    gap: 6,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
