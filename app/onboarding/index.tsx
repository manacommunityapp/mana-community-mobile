import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Animated, StatusBar, NativeSyntheticEvent,
  NativeScrollEvent, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

const SHOWCASE_ITEMS = [
  {
    id: 'security',
    emoji: '🛡️',
    color: '#10B981',
    accentBg: 'rgba(16, 185, 129, 0.16)',
    accentBorder: 'rgba(16, 185, 129, 0.32)',
    title: 'Smart Gate & 24/7 Security',
    tagline: 'Instant QR Entry Passes & SOS Alert',
    desc: 'Digital gate passes for visitors, delivery PINs, automated staff clock-in, and one-tap emergency guard hotline.',
    tags: ['Guest QR Pass', 'Delivery PIN', 'Maid Log', 'Emergency SOS'],
  },
  {
    id: 'sports',
    emoji: '🏟️',
    color: '#F59E0B',
    accentBg: 'rgba(245, 158, 11, 0.16)',
    accentBorder: 'rgba(245, 158, 11, 0.32)',
    title: 'Sports Arena & Tournaments',
    tagline: 'Live Scores · Court Booking · Leagues',
    desc: 'Book clubhouse courts in seconds, register for community tournaments, and track real-time scoreboards.',
    tags: ['Court Booking', 'Live Scoreboard', 'Society Cups', 'Player Ratings'],
  },
  {
    id: 'marketplace',
    emoji: '🛒',
    color: '#A855F7',
    accentBg: 'rgba(168, 85, 247, 0.16)',
    accentBorder: 'rgba(168, 85, 247, 0.32)',
    title: 'Local Market & Live Auctions',
    tagline: 'Buy, Sell & Save with Verified Neighbors',
    desc: 'Trade pre-loved goods, bid in resident auctions, and unlock bulk discounts with community group buying.',
    tags: ['Classifieds', 'Live Auctions', 'Group Deals', 'Free Giveaways'],
  },
  {
    id: 'living',
    emoji: '⚡',
    color: '#06B6D4',
    accentBg: 'rgba(6, 182, 212, 0.16)',
    accentBorder: 'rgba(6, 182, 212, 0.32)',
    title: 'Maintenance Dues & Amenities',
    tagline: 'Seamless Clubhouse Living',
    desc: 'Pay monthly maintenance in one tap, reserve party halls, and track helpdesk tickets with automated resolution SLAs.',
    tags: ['Maintenance Pay', 'Clubhouse Booking', 'Quick Helpdesk', 'Polls & Notices'],
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();

    // Subtle breathing pulse for brand emblem glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Handle horizontal scroll pagination
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_WIDTH);
    if (index >= 0 && index < SHOWCASE_ITEMS.length && index !== activeSlide) {
      setActiveSlide(index);
    }
  };

  const scrollToSlide = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * CARD_WIDTH, animated: true });
    setActiveSlide(idx);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Signature Deep Royal Indigo Full-Bleed Gradient */}
      <LinearGradient
        colors={['#09071E', '#13103A', '#1E1B4B', '#312E81', '#4338CA']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Ambient Radial Glows */}
      <View style={s.ambientGlowTop} />
      <View style={s.ambientGlowCenter} />
      <View style={s.ambientGlowBottom} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* ── Top Utility Bar ── */}
        <Animated.View style={[s.topBar, { opacity: fadeAnim }]}>
          <View style={s.societyPill}>
            <View style={s.societyPillDot} />
            <Text style={s.societyPillText}>Verified Gated Communities</Text>
          </View>

          <TouchableOpacity
            style={s.tourBtn}
            onPress={() => router.push('/onboarding/tour')}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={13} color="#FBBF24" />
            <Text style={s.tourBtnText}>App Tour</Text>
          </TouchableOpacity>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          bounces={false}
        >
          {/* ── Hero Brand Emblem & Typography ── */}
          <Animated.View
            style={[
              s.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* 3D Glowing Glass Mana Emblem */}
            <View style={s.emblemWrapper}>
              <Animated.View
                style={[
                  s.emblemGlow,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <LinearGradient
                colors={['#3730A3', '#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.emblemBox}
              >
                <Text style={s.emblemLetter}>M</Text>
              </LinearGradient>
            </View>

            {/* Title & Tagline */}
            <View style={s.titleWrap}>
              <View style={s.badgeCapsule}>
                <Text style={s.badgeCapsuleText}>✦ ELEVATING GATED LIVING ✦</Text>
              </View>
              <Text style={s.heroTitle}>Mana Community</Text>
              <Text style={s.heroSub}>
                Your home, neighbors, and society operations — seamlessly connected in your pocket.
              </Text>
            </View>
          </Animated.View>

          {/* ── Interactive Feature Showcase Carousel ── */}
          <Animated.View style={[s.showcaseSection, { opacity: fadeAnim }]}>
            <View style={s.showcaseHeaderRow}>
              <Text style={s.showcaseSectionTitle}>DISCOVER THE ECOSYSTEM</Text>
              <Text style={s.showcaseCounter}>
                {activeSlide + 1} of {SHOWCASE_ITEMS.length}
              </Text>
            </View>

            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              decelerationRate="fast"
              snapToInterval={CARD_WIDTH}
              snapToAlignment="center"
              contentContainerStyle={s.showcaseScroll}
            >
              {SHOWCASE_ITEMS.map((item) => (
                <View key={item.id} style={[s.showcaseCard, { width: CARD_WIDTH }]}>
                  {/* Card Header */}
                  <View style={s.cardTopRow}>
                    <View style={[s.cardEmojiBox, { backgroundColor: item.accentBg, borderColor: item.accentBorder }]}>
                      <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                    </View>
                    <View style={s.cardTitleBlock}>
                      <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={[s.cardTagline, { color: item.color }]} numberOfLines={1}>{item.tagline}</Text>
                    </View>
                  </View>

                  {/* Card Description */}
                  <Text style={s.cardDesc}>{item.desc}</Text>

                  {/* Feature Tags */}
                  <View style={s.tagRow}>
                    {item.tags.map((tag) => (
                      <View key={tag} style={s.featureTag}>
                        <Ionicons name="checkmark-circle" size={11} color={item.color} />
                        <Text style={s.featureTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Pagination Indicator Dots */}
            <View style={s.dotsRow}>
              {SHOWCASE_ITEMS.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => scrollToSlide(i)}
                  style={[s.dot, i === activeSlide ? s.dotActive : s.dotInactive]}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Community Trust & Security Bar ── */}
          <Animated.View style={[s.trustBarWrap, { opacity: fadeAnim }]}>
            <View style={s.trustBar}>
              <View style={s.trustItem}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={s.trustText}>Bank-Grade Secure</Text>
              </View>
              <View style={s.trustDivider} />
              <View style={s.trustItem}>
                <Ionicons name="people" size={14} color="#60A5FA" />
                <Text style={s.trustText}>10,000+ Residents</Text>
              </View>
              <View style={s.trustDivider} />
              <View style={s.trustItem}>
                <Ionicons name="business" size={14} color="#FBBF24" />
                <Text style={s.trustText}>50+ Societies</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Primary Action Deck (CTAs) ── */}
          <Animated.View style={[s.actionDeck, { opacity: fadeAnim }]}>
            {/* Primary CTA: Join / Get Started */}
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => router.push('/onboarding/account')}
              activeOpacity={0.9}
            >
              <View style={s.primaryBtnContent}>
                <View style={{ flex: 1 }}>
                  <Text style={s.primaryBtnTitle}>Get Started</Text>
                  <Text style={s.primaryBtnSub}>Join with society invite code or register flat</Text>
                </View>
                <View style={s.primaryBtnIconCircle}>
                  <Ionicons name="arrow-forward" size={18} color="#1E1B4B" />
                </View>
              </View>
            </TouchableOpacity>

            {/* Secondary CTA: Existing Member Sign In */}
            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
              <Text style={s.secondaryBtnText}>Sign In to Existing Account</Text>
            </TouchableOpacity>

            {/* Fine print footer */}
            <View style={s.footerMetaRow}>
              <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.4)" />
              <Text style={s.footerMetaText}>
                Encrypted · RWA & Apartment Association Certified
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles (Option 1: Signature Royal Indigo Theme) ───────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09071E',
  },

  // Ambient Glows
  ambientGlowTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
  },
  ambientGlowCenter: {
    position: 'absolute',
    top: 260,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -50,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(79, 70, 229, 0.20)',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  societyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  societyPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  societyPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E2E8F0',
    fontFamily: FONTS.medium,
  },
  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  tourBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
    fontFamily: FONTS.bold,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
  },
  emblemWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emblemGlow: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.45)',
  },
  emblemBox: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    ...SHADOWS.lg,
  },
  emblemLetter: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: FONTS.displayEB,
    letterSpacing: -1,
  },
  titleWrap: {
    alignItems: 'center',
    gap: 6,
  },
  badgeCapsule: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 2,
  },
  badgeCapsuleText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#C7D2FE',
    letterSpacing: 1,
    fontFamily: FONTS.displayBold,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    fontFamily: FONTS.displayEB,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 13,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: FONTS.regular,
    maxWidth: 320,
  },

  // Showcase Section
  showcaseSection: {
    marginTop: 6,
    paddingHorizontal: 20,
    gap: 10,
  },
  showcaseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  showcaseSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    fontFamily: FONTS.bold,
  },
  showcaseCounter: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A5B4FC',
    fontFamily: FONTS.medium,
  },
  showcaseScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  showcaseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 10,
    ...SHADOWS.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardEmojiBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
  },
  cardTagline: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  cardDesc: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.medium,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  // Trust Bar
  trustBarWrap: {
    paddingHorizontal: 20,
    marginTop: 14,
  },
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E2E8F0',
    fontFamily: FONTS.semiBold,
  },
  trustDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Action Deck
  actionDeck: {
    paddingHorizontal: 20,
    marginTop: 18,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...SHADOWS.lg,
  },
  primaryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  primaryBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B4B',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.2,
  },
  primaryBtnSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    fontFamily: FONTS.medium,
  },
  primaryBtnIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },

  footerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
  },
  footerMetaText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: FONTS.regular,
  },
});
