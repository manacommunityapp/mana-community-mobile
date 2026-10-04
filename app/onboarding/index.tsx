import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '@/constants/config';

const VALUE_PROPS = [
  { icon: 'home-outline' as const,         color: '#4F46E5', bg: '#EEF2FF', title: 'Stay Connected',     desc: 'Community feed, events and live announcements' },
  { icon: 'storefront-outline' as const,   color: '#059669', bg: '#D1FAE5', title: 'Buy & Sell Locally', desc: 'Marketplace, auctions and free giveaways' },
  { icon: 'trophy-outline' as const,       color: '#D97706', bg: '#FEF3C7', title: 'Sports & More',       desc: 'Tournaments, polls, jobs and live scores'  },
];

export default function WelcomeScreen() {
  const router      = useRouter();
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(40)).current;
  const cardAnim    = useRef(new Animated.Value(0)).current;
  const negOne      = useRef(new Animated.Value(-1)).current;
  const negTwenty   = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 700, delay: 150, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
      ]),
      Animated.timing(cardAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#3730A3', '#4F46E5', '#6366F1']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={s.decCircle1} />
      <View style={s.decCircle2} />
      <View style={s.decCircle3} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Hero */}
        <View style={s.hero}>
          <Animated.View style={[s.logoWrap, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }]}>
            <View style={s.logoBox}>
              <Text style={s.logoText}>M</Text>
            </View>
            <Text style={s.logoTitle}>Mana Community</Text>
            <Text style={s.logoSub}>Your community, in your pocket</Text>

            {/* Trust badges */}
            <View style={s.badgeRow}>
              <View style={s.trustBadge}>
                <Ionicons name="shield-checkmark" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={s.trustBadgeText}>Verified & Secure</Text>
              </View>
              <View style={s.trustBadge}>
                <Ionicons name="people" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={s.trustBadgeText}>10,000+ Residents</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Value props card */}
        <Animated.View style={[s.card, {
          opacity: cardAnim,
          transform: [{ translateY: Animated.multiply(Animated.add(cardAnim, negOne), negTwenty) }],
        }]}>
          <Text style={s.cardHeading}>Everything your community needs</Text>
          {VALUE_PROPS.map((vp, i) => (
            <View key={i} style={s.vpRow}>
              <View style={[s.vpIcon, { backgroundColor: vp.bg }]}>
                <Ionicons name={vp.icon} size={20} color={vp.color} />
              </View>
              <View style={s.vpText}>
                <Text style={s.vpTitle}>{vp.title}</Text>
                <Text style={s.vpDesc}>{vp.desc}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            </View>
          ))}
        </Animated.View>

        {/* CTAs */}
        <Animated.View style={[s.ctas, { opacity: cardAnim }]}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push('/onboarding/account')}
            activeOpacity={0.9}
          >
            <View style={s.primaryBtnInner}>
              <Text style={s.primaryBtnText}>Join my Community</Text>
              <View style={s.primaryBtnArrow}>
                <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.85}
          >
            <View style={s.secondaryBtnInner}>
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
              <Text style={s.secondaryBtnText}>I already have an account</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  // Decorative background circles
  decCircle1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -80,
  },
  decCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 120,
    left: -80,
  },
  decCircle3: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 180,
    right: -50,
  },

  // Hero
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...SHADOWS.lg,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    fontFamily: FONTS.displayEB,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.6,
    fontFamily: FONTS.displayEB,
  },
  logoSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  trustBadgeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 18,
    borderRadius: 24,
    padding: 22,
    gap: 14,
    ...SHADOWS.lg,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.1,
    fontFamily: FONTS.bold,
    marginBottom: 2,
  },
  vpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  vpIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vpText: { flex: 1 },
  vpTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  vpDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 17,
    fontFamily: FONTS.regular,
  },

  // CTAs
  ctas: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 20,
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.3,
  },
  primaryBtnArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  secondaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  secondaryBtnText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FONTS.bold,
    letterSpacing: -0.2,
  },
});
