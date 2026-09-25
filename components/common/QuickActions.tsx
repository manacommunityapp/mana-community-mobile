import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tag?: string;
  route: string;
  color: string;
  bgColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'sports',  icon: 'trophy',       label: 'Sports Hub',  tag: 'Live',  route: '/sports',           color: '#059669', bgColor: '#ECFDF5' },
  { id: 'commute', icon: 'car-sport',    label: 'Commute',     tag: 'Rides', route: '/commute',          color: '#2563EB', bgColor: '#EFF6FF' },
  { id: 'polls',   icon: 'stats-chart',  label: 'Polls',       tag: 'Vote',  route: '/polls',            color: '#7C3AED', bgColor: '#F5F3FF' },
  { id: 'auction', icon: 'pricetag',     label: 'Auction',     tag: 'Bids',  route: '/auction',          color: '#D97706', bgColor: '#FFFBEB' },
  { id: 'market',  icon: 'storefront',   label: 'Market',      tag: 'Shop',  route: '/tabs/marketplace', color: '#DC2626', bgColor: '#FEF2F2' },
  { id: 'events',  icon: 'calendar',     label: 'Events',      tag: 'RSVP',  route: '/tabs/events',      color: '#0891B2', bgColor: '#ECFEFF' },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Explore Services</Text>
        <Text style={styles.sectionSub}>All society features</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.card}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: action.bgColor }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
              {action.tag && (
                <View style={[styles.tagBadge, { backgroundColor: action.color }]}>
                  <Text style={styles.tagText}>{action.tag}</Text>
                </View>
              )}
            </View>
            <Text style={styles.label} numberOfLines={1}>
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
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    alignItems: 'center',
    width: 68,
    gap: 6,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    ...SHADOWS.sm,
  },
  tagBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    borderRadius: RADIUS.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  tagText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
});
