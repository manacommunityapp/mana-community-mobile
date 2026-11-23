import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Animated, StatusBar, NativeSyntheticEvent,
  NativeScrollEvent, Image, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { FONTS, SHADOWS, RADIUS } from '@/constants/config';
import {
  platformPublicService,
  DEFAULT_PUBLIC_OVERVIEW,
  formatPublicCount,
} from '@/services/platformPublicService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return `rgba(99, 102, 241, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function WelcomeScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  const {
    data: overview = DEFAULT_PUBLIC_OVERVIEW,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['public-platform-overview'],
    queryFn: () => platformPublicService.getOverview(),
    staleTime: 60_000,
    retry: 1,
  });

  const showcaseItems = overview.showcaseItems;
  const featuredSocieties = overview.featuredSocieties;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 550, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const CARD_STEP = CARD_WIDTH + 10;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_STEP);
    if (index >= 0 && index < showcaseItems.length && index !== activeSlide) {
      setActiveSlide(index);
    }
  };

  const scrollToSlide = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * CARD_STEP, animated: true });
    setActiveSlide(idx);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={['#09071E', '#13103A', '#1E1B4B', '#312E81', '#4338CA']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.ambientGlowTop} />
      <View style={s.ambientGlowCenter} />
      <View style={s.ambientGlowBottom} />

      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
        {/* ── Top Utility Bar ── */}
        <Animated.View style={[s.topBar, { opacity: fadeAnim }]}>
          <View style={s.societyPill}>
            <View
              style={[
                s.societyPillDot,
                { backgroundColor: overview.isLive ? '#10B981' : '#94A3B8' },
              ]}
            />
            <Text style={s.societyPillText} numberOfLines={1}>
              {overview.topBadgeText}
            </Text>
          </View>

          <TouchableOpacity
            style={s.tourBtn}
            onPress={() => router.push('/onboarding/tour')}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={11} color="#FBBF24" />
            <Text style={s.tourBtnText}>App Tour</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Single-Screen Body (No Vertical Scroll) ── */}
        <View style={s.pageBody}>
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
            <View style={s.emblemWrapper}>
              <Animated.View
                style={[
                  s.emblemGlow,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <LinearGradient
                colors={['#3730A3', '#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.emblemBox}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={s.emblemImg}
                  resizeMode="cover"
                />
              </LinearGradient>
            </View>

            <View style={s.titleWrap}>
              <View style={s.badgeCapsule}>
                <Text style={s.badgeCapsuleText}>✦ {overview.heroCapsuleText} ✦</Text>
              </View>
              <Text style={s.heroTitle}>{overview.heroTitle}</Text>
              <Text style={s.heroSub} numberOfLines={2}>
                {overview.heroSubtitle}
              </Text>
            </View>
          </Animated.View>

          {/* ── Live Community Pulse (DB-backed Stats) ── */}
          <Animated.View style={[s.pulseCardWrap, { opacity: fadeAnim }]}>
            <View style={s.pulseCard}>
              <View style={s.pulseStatsRow}>
                <View style={s.pulseStatCol}>
                  <View style={s.pulseIconRow}>
                    <Ionicons name="people" size={12} color="#60A5FA" />
                    <Text style={s.pulseStatLabel}>RESIDENTS</Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#93C5FD" style={{ marginTop: 2 }} />
                  ) : (
                    <Text style={s.pulseStatValue}>
                      {formatPublicCount(overview.totalResidents)}
                    </Text>
                  )}
                </View>

                <View style={s.pulseDivider} />

                <View style={s.pulseStatCol}>
                  <View style={s.pulseIconRow}>
                    <Ionicons name="business" size={12} color="#FBBF24" />
                    <Text style={s.pulseStatLabel}>SOCIETIES</Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FDE68A" style={{ marginTop: 2 }} />
                  ) : (
                    <Text style={s.pulseStatValue}>
                      {formatPublicCount(overview.totalSocieties)}
                    </Text>
                  )}
                </View>

                <View style={s.pulseDivider} />

                <View style={s.pulseStatCol}>
                  <View style={s.pulseIconRow}>
                    <Ionicons name="location" size={12} color="#34D399" />
                    <Text style={s.pulseStatLabel}>CITIES</Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#6EE7B7" style={{ marginTop: 2 }} />
                  ) : (
                    <Text style={s.pulseStatValue}>
                      {formatPublicCount(overview.totalCities)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={s.pulseTrustStrip}>
                <View style={s.trustItem}>
                  <Ionicons name="shield-checkmark" size={11} color="#10B981" />
                  <Text style={s.trustText}>{overview.securityLabel}</Text>
                </View>
                <TouchableOpacity
                  style={s.livePill}
                  onPress={() => { void refetch(); }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      s.liveDot,
                      { backgroundColor: overview.isLive ? '#10B981' : '#94A3B8' },
                    ]}
                  />
                  <Text style={s.livePillText}>
                    {isRefetching ? 'Refreshing…' : overview.isLive ? 'Live metrics' : 'Offline'}
                  </Text>
                  <Ionicons name="refresh" size={10} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ── Active Societies from Database (Compact Horizontal Strip) ── */}
          {featuredSocieties.length > 0 && (
            <Animated.View style={[s.societiesSection, { opacity: fadeAnim }]}>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>ACTIVE COMMUNITIES</Text>
                <Text style={s.sectionCounter}>{featuredSocieties.length} featured</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.societiesScroll}
              >
                {featuredSocieties.map((soc) => {
                  const metaParts = [
                    soc.area || soc.city,
                    typeof soc.residentCount === 'number' && soc.residentCount > 0
                      ? `${soc.residentCount.toLocaleString('en-IN')} residents`
                      : soc.type || null,
                  ].filter(Boolean);
                  return (
                    <View key={soc.id} style={s.societyChipCard}>
                      <View style={s.societyAvatar}>
                        <Ionicons name="business-outline" size={13} color="#A5B4FC" />
                      </View>
                      <View style={s.societyChipBody}>
                        <Text style={s.societyChipName} numberOfLines={1}>
                          {soc.name}
                        </Text>
                        <Text style={s.societyChipMeta} numberOfLines={1}>
                          {metaParts.join(' · ') || 'Verified society'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </Animated.View>
          )}

          {/* ── Interactive Feature Showcase Carousel (Compact) ── */}
          <Animated.View style={[s.showcaseSection, { opacity: fadeAnim }]}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>DISCOVER THE ECOSYSTEM</Text>
              <Text style={s.sectionCounter}>
                {Math.min(activeSlide + 1, showcaseItems.length)} of {showcaseItems.length}
              </Text>
            </View>

            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              decelerationRate="fast"
              snapToInterval={CARD_STEP}
              snapToAlignment="center"
              contentContainerStyle={s.showcaseScroll}
            >
              {showcaseItems.map((item) => (
                <View key={item.itemKey} style={[s.showcaseCard, { width: CARD_WIDTH }]}>
                  <View style={s.cardTopRow}>
                    <View
                      style={[
                        s.cardEmojiBox,
                        {
                          backgroundColor: hexToRgba(item.accentColor, 0.16),
                          borderColor: hexToRgba(item.accentColor, 0.34),
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                    </View>
                    <View style={s.cardTitleBlock}>
                      <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={[s.cardTagline, { color: item.accentColor }]} numberOfLines={1}>
                        {item.tagline}
                      </Text>
                    </View>
                  </View>

                  <Text style={s.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View style={s.tagRow}>
                    {item.tags.slice(0, 4).map((tag) => (
                      <View key={tag} style={s.featureTag}>
                        <Ionicons name="checkmark-circle" size={10} color={item.accentColor} />
                        <Text style={s.featureTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={s.dotsRow}>
              {showcaseItems.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => scrollToSlide(i)}
                  style={[s.dot, i === activeSlide ? s.dotActive : s.dotInactive]}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Primary Action Deck (CTAs) ── */}
          <Animated.View style={[s.actionDeck, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => router.push('/onboarding/account')}
              activeOpacity={0.9}
            >
              <View style={s.primaryBtnContent}>
                <View style={{ flex: 1 }}>
                  <Text style={s.primaryBtnTitle}>Get Started</Text>
                  <Text style={s.primaryBtnSub} numberOfLines={1}>
                    New resident? Join with society invite code
                  </Text>
                </View>
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.primaryBtnIconCircle}
                >
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.88}
              style={s.signInBtnOuter}
            >
              <LinearGradient
                colors={['rgba(99, 102, 241, 0.36)', 'rgba(139, 92, 246, 0.24)', 'rgba(49, 46, 129, 0.55)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.signInBtnGrad}
              >
                <LinearGradient
                  colors={['#6366F1', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.signInIconBadge}
                >
                  <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.signInBtnTitle}>Sign In to Existing Account</Text>
                  <Text style={s.signInBtnSub} numberOfLines={1}>
                    Already a member? Access your flat, pass & dues
                  </Text>
                </View>
                <View style={s.signInArrowPill}>
                  <Ionicons name="chevron-forward" size={15} color="#E0E7FF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.footerMetaRow}>
              <Ionicons name="lock-closed" size={9} color="rgba(255,255,255,0.4)" />
              <Text style={s.footerMetaText} numberOfLines={1}>
                {overview.certificationNote}
              </Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09071E',
  },
  safeArea: {
    flex: 1,
  },
  pageBody: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingBottom: 8,
  },

  ambientGlowTop: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
  },
  ambientGlowCenter: {
    position: 'absolute',
    top: 240,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -50,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(79, 70, 229, 0.20)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 8,
  },
  societyPill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  societyPillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  societyPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E2E8F0',
    fontFamily: FONTS.medium,
  },
  tourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  tourBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE68A',
    fontFamily: FONTS.bold,
  },

  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 2,
  },
  emblemWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emblemGlow: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: 'rgba(99, 102, 241, 0.45)',
  },
  emblemBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  emblemImg: {
    width: 86,
    height: 86,
  },
  titleWrap: {
    alignItems: 'center',
    gap: 3,
  },
  badgeCapsule: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  badgeCapsuleText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#C7D2FE',
    letterSpacing: 0.8,
    fontFamily: FONTS.displayBold,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    fontFamily: FONTS.displayEB,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 11,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 15,
    fontFamily: FONTS.regular,
    maxWidth: 300,
  },

  // Live Pulse Card
  pulseCardWrap: {
    paddingHorizontal: 16,
  },
  pulseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
    gap: 6,
  },
  pulseStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  pulseStatCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  pulseIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pulseStatLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#A5B4FC',
    fontFamily: FONTS.bold,
  },
  pulseStatValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: FONTS.displayEB,
  },
  pulseDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  pulseTrustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#E2E8F0',
    fontFamily: FONTS.semiBold,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  livePillText: {
    fontSize: 9,
    color: '#CBD5E1',
    fontFamily: FONTS.medium,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.7,
    fontFamily: FONTS.bold,
  },
  sectionCounter: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A5B4FC',
    fontFamily: FONTS.medium,
  },

  // Active Societies Compact Strip
  societiesSection: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 4,
  },
  societiesScroll: {
    gap: 8,
  },
  societyChipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 175,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  societyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  societyChipBody: {
    flex: 1,
    gap: 1,
  },
  societyChipName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
  },
  societyChipMeta: {
    fontSize: 9.5,
    color: '#CBD5E1',
    fontFamily: FONTS.regular,
  },

  // Showcase Section
  showcaseSection: {
    paddingHorizontal: 16,
    gap: 5,
  },
  showcaseScroll: {
    gap: 10,
  },
  showcaseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    gap: 6,
    ...SHADOWS.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardEmojiBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 1,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
  },
  cardTagline: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: FONTS.semiBold,
  },
  cardDesc: {
    fontSize: 10.5,
    color: '#E2E8F0',
    lineHeight: 14.5,
    fontFamily: FONTS.regular,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.medium,
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },

  // Action Deck
  actionDeck: {
    paddingHorizontal: 16,
    gap: 8,
    flexShrink: 0,
  },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 15,
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  primaryBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  primaryBtnTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1E1B4B',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.2,
  },
  primaryBtnSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
    fontFamily: FONTS.medium,
  },
  primaryBtnIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  signInBtnOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(165, 180, 252, 0.45)',
    ...SHADOWS.md,
  },
  signInBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  signInIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
    letterSpacing: -0.1,
  },
  signInBtnSub: {
    fontSize: 10,
    color: '#C7D2FE',
    marginTop: 1,
    fontFamily: FONTS.regular,
  },
  signInArrowPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerMetaText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: FONTS.regular,
  },
});
