import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '@/constants/config';

interface ModuleCard {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  gradient: readonly [string, string] | readonly [string, string, string];
  badge?: string;
}

const MODULES: ModuleCard[] = [
  {
    key: 'home-chefs',
    title: 'Home Chef Marketplace',
    subtitle: 'Fresh homemade meals by society chefs delivered to your flat',
    icon: 'restaurant',
    route: '/food/home-chefs',
    gradient: ['#F97316', '#EA580C'],
    badge: 'Popular',
  },
  {
    key: 'subscriptions',
    title: 'Tiffin Subscriptions',
    subtitle: 'Daily, weekly & monthly meal plans from trusted home cooks',
    icon: 'calendar',
    route: '/food/subscriptions',
    gradient: ['#8B5CF6', '#7C3AED'],
  },
  {
    key: 'grocery',
    title: 'Organic Grocery Market',
    subtitle: 'Farm-fresh produce & organic staples from society farmers',
    icon: 'leaf',
    route: '/food/grocery',
    gradient: ['#10B981', '#059669'],
    badge: 'Fresh',
  },
  {
    key: 'pantry',
    title: 'Smart Pantry Tracker',
    subtitle: 'Kitchen inventory, expiry alerts & auto-replenish reminders',
    icon: 'nutrition',
    route: '/food/pantry',
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    key: 'dining',
    title: 'Community Dining',
    subtitle: 'Society clubhouse events, potluck dinners & table reservations',
    icon: 'wine',
    route: '/food/dining',
    gradient: ['#EC4899', '#DB2777'],
  },
];

export default function FoodHubScreen() {
  const router = useRouter();

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goHome} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Food & Lifestyle</Text>
          <Text style={styles.headerSub}>Your society kitchen ecosystem</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <LinearGradient
          colors={GRADIENTS.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={12} color="#FEF3C7" />
                <Text style={styles.heroBadgeText}>FOOD & LIFESTYLE OS</Text>
              </View>
              <Text style={styles.heroTitle}>Society Kitchen{'\n'}Ecosystem</Text>
              <Text style={styles.heroSubtitle}>
                Home chefs, tiffin subscriptions, organic grocery, pantry tracking & community dining — all in one place
              </Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Ionicons name="fast-food" size={28} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>5</Text>
              <Text style={styles.heroStatLabel}>Modules</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>15+</Text>
              <Text style={styles.heroStatLabel}>Features</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatNumber}>24/7</Text>
              <Text style={styles.heroStatLabel}>Available</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Module Cards */}
        <View style={{ gap: SPACING.md }}>
          {MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.key}
              style={styles.moduleCard}
              onPress={() => router.push(mod.route as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={mod.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moduleIconWrap}
              >
                <Ionicons name={mod.icon} size={24} color="#FFFFFF" />
              </LinearGradient>

              <View style={styles.moduleContent}>
                <View style={styles.moduleTitleRow}>
                  <Text style={styles.moduleTitle}>{mod.title}</Text>
                  {mod.badge && (
                    <View style={styles.moduleBadge}>
                      <Text style={styles.moduleBadgeText}>{mod.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.moduleSub} numberOfLines={2}>
                  {mod.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb-outline" size={18} color={COLORS.primary} />
          <Text style={styles.tipsText}>
            Tip: Subscribe to a weekly tiffin plan and save up to 20% compared to daily orders from home chefs.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(99, 102, 241, 0.12)',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },

  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  heroBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEF3C7',
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#EEF2FF',
    marginTop: 4,
    lineHeight: 17,
    fontFamily: 'DMSans-Regular',
  },
  heroIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  heroStatCard: { alignItems: 'center' },
  heroStatNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Outfit-Bold',
  },
  heroStatLabel: {
    fontSize: 10,
    color: '#EEF2FF',
    marginTop: 1,
    fontFamily: 'DMSans-Medium',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.12)',
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  moduleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleContent: { flex: 1, gap: 2 },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'Outfit-Bold',
  },
  moduleBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  moduleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.3,
  },
  moduleSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: 'DMSans-Regular',
    lineHeight: 17,
  },

  tipsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
  },
  tipsText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'DMSans-Medium',
    lineHeight: 17,
  },
});
