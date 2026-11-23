import React, { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/constants/theme';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface Category {
  key: string;
  label: string;
  icon: IoniconsName;
  route: string;
  color: string;
  bgColor: string;
  moduleKey?: string;
}

const CATEGORIES: Category[] = [
  { key: 'community', label: 'Community', icon: 'people', route: '/community', color: '#4F46E5', bgColor: '#EEF2FF', moduleKey: 'COMMUNITY_FEED' },
  { key: 'ev-charging', label: 'EV Charging', icon: 'flash', route: '/parking/ev-charging', color: '#10B981', bgColor: '#ECFDF5', moduleKey: 'VISITORS' },
  { key: 'ai-concierge', label: 'AI Concierge', icon: 'sparkles', route: '/ai-chat', color: '#8B5CF6', bgColor: '#F5F3FF' },
  { key: 'emergency', label: 'Emergency SOS', icon: 'alert-circle', route: '/emergency', color: '#EF4444', bgColor: '#FEF2F2', moduleKey: 'EMERGENCY' },
  { key: 'events', label: 'Events', icon: 'calendar', route: '/events', color: '#059669', bgColor: '#ECFDF5', moduleKey: 'EVENTS' },
  { key: 'sports', label: 'Sports', icon: 'football', route: '/sports', color: '#D97706', bgColor: '#FFFBEB', moduleKey: 'SPORTS' },
  { key: 'marketplace', label: 'Marketplace', icon: 'storefront', route: '/marketplace', color: '#7C3AED', bgColor: '#F5F3FF', moduleKey: 'MARKETPLACE' },
  { key: 'food', label: 'Food', icon: 'restaurant', route: '/food', color: '#DC2626', bgColor: '#FEF2F2', moduleKey: 'FOOD_OS' },
  { key: 'health', label: 'Health', icon: 'heart', route: '/health', color: '#BE185D', bgColor: '#FDF2F8', moduleKey: 'SAFETY' },
  { key: 'services', label: 'Services', icon: 'construct', route: '/services', color: '#0369A1', bgColor: '#F0F9FF', moduleKey: 'SERVICE_PLATFORM' },
  { key: 'rides', label: 'Rides', icon: 'car', route: '/commute', color: '#0D9488', bgColor: '#F0FDFA', moduleKey: 'TRIPS' },
  { key: 'school-bus', label: 'School Bus', icon: 'bus', route: '/school-bus', color: '#F59E0B', bgColor: '#FFFBEB', moduleKey: 'VISITORS' },
  { key: 'bbps', label: 'Bills & BBPS', icon: 'card', route: '/bbps', color: '#0284C7', bgColor: '#F0F9FF', moduleKey: 'PAYMENTS' },
  { key: 'trips', label: 'Trips', icon: 'airplane', route: '/trips', color: '#1D4ED8', bgColor: '#EFF6FF', moduleKey: 'TRIPS' },
  { key: 'security', label: 'Security', icon: 'shield-checkmark', route: '/visitors', color: '#B45309', bgColor: '#FFFBEB', moduleKey: 'VISITORS' },
  { key: 'academy', label: 'Academy', icon: 'school', route: '/academy', color: '#7E22CE', bgColor: '#FAF5FF', moduleKey: 'ACADEMY' },
  { key: 'social', label: 'Social', icon: 'chatbubbles', route: '/social', color: '#0891B2', bgColor: '#ECFEFF', moduleKey: 'COMMUNITY_FEED' },
  { key: 'devices', label: 'Devices', icon: 'hardware-chip', route: '/devices', color: '#64748B', bgColor: '#F1F5F9', moduleKey: 'SERVICE_PLATFORM' },
  { key: 'infrastructure', label: 'Infrastructure', icon: 'cellular-outline', route: '/community/iot', color: '#0369A1', bgColor: '#F0F9FF', moduleKey: 'SERVICE_PLATFORM' },
  { key: 'more', label: 'More', icon: 'apps', route: '/tabs/profile', color: '#475569', bgColor: '#F8FAFC' },
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLS = 3;
const TILE_SIZE = (SCREEN_WIDTH - 32 - (NUM_COLS - 1) * 10) / NUM_COLS;

function CategoryTile({ item }: { item: Category }) {
  const scale = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { palette } = useAppTheme();

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 30, bounciness: 0 }).start();

  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }).start();

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => router.push(item.route as any)}
      accessibilityLabel={item.label}
      accessibilityRole="button"
      style={styles.tilePressable}
    >
      <Animated.View
        style={[
          styles.tile,
          {
            transform: [{ scale }],
            backgroundColor: palette.surface,
            borderColor: palette.borderLight,
          },
        ]}
      >
        <View
          style={[
            styles.tileIconWrap,
            { backgroundColor: palette.isDark ? item.color + '26' : item.bgColor },
          ]}
        >
          <Ionicons name={item.icon} size={27} color={item.color} />
        </View>
        <Text style={[styles.tileLabel, { color: palette.text }]} numberOfLines={1}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const { hasRole, hasModule, isSuperAdmin, user } = useAuth();
  const { palette } = useAppTheme();
  const isAdmin = hasRole('ADMIN', 'COMMUNITY_ADMIN', 'SUPER_ADMIN');
  const isGuard = hasRole('GUARD', 'SECURITY');
  const isVendor = hasRole('VENDOR');

  const categories = React.useMemo(() => {
    const list: Category[] = [];

    if (isAdmin) {
      list.push(
        { key: 'admin-console', label: 'Admin Console', icon: 'shield-checkmark', route: '/admin-role/tabs/dashboard', color: '#1E293B', bgColor: '#F1F5F9', moduleKey: 'ADMIN_HUB' },
        { key: 'governance', label: 'Governance', icon: 'ribbon', route: '/governance', color: '#0F766E', bgColor: '#CCFBF1', moduleKey: 'COMMUNITY_MGMT' },
      );
    }

    if (isGuard) {
      list.push(
        { key: 'guard-portal', label: 'Gate Portal', icon: 'shield', route: '/guard/tabs/dashboard', color: '#B45309', bgColor: '#FEF3C7', moduleKey: 'VISITORS' },
        { key: 'walk-in', label: 'Walk-In', icon: 'person-add', route: '/guard/walk-in', color: '#4338CA', bgColor: '#EEF2FF', moduleKey: 'VISITORS' },
        { key: 'cctv', label: 'CCTV Live', icon: 'videocam', route: '/guard/cctv', color: '#DC2626', bgColor: '#FEE2E2', moduleKey: 'VISITORS' },
      );
    }

    if (isVendor) {
      list.push(
        { key: 'vendor-portal', label: 'Vendor Portal', icon: 'construct', route: '/vendor/tabs/dashboard', color: '#7C3AED', bgColor: '#F5F3FF', moduleKey: 'VENDOR_MANAGEMENT' },
        { key: 'vendor-payouts', label: 'Payouts', icon: 'cash', route: '/vendor/settlements', color: '#059669', bgColor: '#D1FAE5', moduleKey: 'VENDOR_MANAGEMENT' },
      );
    }

    // Common categories filtered by enabled modules
    const enabledMods = user?.enabledModules ?? [];
    const filteredCommon = (isSuperAdmin || enabledMods.length === 0)
      ? CATEGORIES
      : CATEGORIES.filter(c => !c.moduleKey || hasModule(c.moduleKey));
    list.push(...filteredCommon);
    return list;
  }, [isAdmin, isGuard, isVendor, hasModule, isSuperAdmin, user?.enabledModules]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.dockBg }]} edges={['top']}>
      <StatusBar barStyle={palette.isDark ? 'light-content' : 'dark-content'} />
      <View style={[styles.header, { backgroundColor: palette.dockBg, borderBottomColor: palette.dockBorder }]}>
        <Text style={[styles.title, { color: palette.text }]}>Discover</Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          {isGuard ? 'Security & Gate Operations' : isVendor ? 'Vendor Tools & Services' : isAdmin ? 'Administration & Community' : 'Everything in your community'}
        </Text>
      </View>
      <View style={{ flex: 1, backgroundColor: palette.appBg }}>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.key}
          numColumns={NUM_COLS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <CategoryTile item={item} />}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background ?? '#FAF8FF',
  },
  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    backgroundColor: THEME.surface,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: 25,
    color: COLORS.text ?? '#131B2E',
    fontFamily: FONTS.displayBold,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  list: {
    padding: 16,
    paddingBottom: 108,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tilePressable: {
    width: TILE_SIZE,
  },
  tile: {
    width: TILE_SIZE,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.sm,
  },
  tileIconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text ?? '#1E293B',
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
    paddingHorizontal: 4,
  },
});
