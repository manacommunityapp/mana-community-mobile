import React, { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Animated,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/constants/theme';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface Category {
  key: string;
  label: string;
  icon: IoniconsName;
  route: string;
  color: string;
  bgColor: string;
}

const CATEGORIES: Category[] = [
  { key: 'community', label: 'Community', icon: 'people', route: '/community', color: '#4F46E5', bgColor: '#EEF2FF' },
  { key: 'events', label: 'Events', icon: 'calendar', route: '/events', color: '#059669', bgColor: '#ECFDF5' },
  { key: 'sports', label: 'Sports', icon: 'football', route: '/sports', color: '#D97706', bgColor: '#FFFBEB' },
  { key: 'marketplace', label: 'Marketplace', icon: 'storefront', route: '/marketplace', color: '#7C3AED', bgColor: '#F5F3FF' },
  { key: 'food', label: 'Food', icon: 'restaurant', route: '/food', color: '#DC2626', bgColor: '#FEF2F2' },
  { key: 'health', label: 'Health', icon: 'heart', route: '/health', color: '#BE185D', bgColor: '#FDF2F8' },
  { key: 'services', label: 'Services', icon: 'construct', route: '/services', color: '#0369A1', bgColor: '#F0F9FF' },
  { key: 'rides', label: 'Rides', icon: 'car', route: '/commute', color: '#0D9488', bgColor: '#F0FDFA' },
  { key: 'trips', label: 'Trips', icon: 'airplane', route: '/trips', color: '#1D4ED8', bgColor: '#EFF6FF' },
  { key: 'security', label: 'Security', icon: 'shield-checkmark', route: '/security', color: '#B45309', bgColor: '#FFFBEB' },
  { key: 'academy', label: 'Academy', icon: 'school', route: '/academy', color: '#7E22CE', bgColor: '#FAF5FF' },
  { key: 'more', label: 'More', icon: 'apps', route: '/more', color: '#475569', bgColor: '#F8FAFC' },
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLS = 3;
const TILE_SIZE = (SCREEN_WIDTH - 32 - (NUM_COLS - 1) * 10) / NUM_COLS;

function CategoryTile({ item }: { item: Category }) {
  const scale = useRef(new Animated.Value(1)).current;
  const router = useRouter();

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
      <Animated.View style={[styles.tile, { transform: [{ scale }] }]}>
        <View style={[styles.tileIconWrap, { backgroundColor: item.bgColor }]}>
          <Ionicons name={item.icon} size={28} color={item.color} />
        </View>
        <Text style={styles.tileLabel} numberOfLines={1}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Everything in your community</Text>
      </View>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        numColumns={NUM_COLS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <CategoryTile item={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background ?? '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    ...SHADOWS.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text ?? '#1E293B',
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  list: {
    padding: 16,
    paddingBottom: 24,
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
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
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
