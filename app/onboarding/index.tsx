import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/config';

const { height } = Dimensions.get('window');

const VALUE_PROPS = [
  { emoji: '🏘️', title: 'Stay Connected',    desc: 'Community feed, events and announcements' },
  { emoji: '🛒', title: 'Buy & Sell Locally', desc: 'Marketplace, auctions and free giveaways' },
  { emoji: '⚽', title: 'Sports & More',      desc: 'Tournaments, polls, jobs and live scores'  },
];

export default function WelcomeScreen() {
  const router   = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Hero */}
        <View style={s.hero}>
          <Animated.View style={[s.logoWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.logoEmoji}>🏡</Text>
            <Text style={s.logoTitle}>Mana Community</Text>
            <Text style={s.logoSub}>Your community, in your pocket</Text>
          </Animated.View>
        </View>

        {/* Value props */}
        <Animated.View style={[s.card, { opacity: fadeAnim }]}>
          {VALUE_PROPS.map((vp, i) => (
            <View key={i} style={s.vpRow}>
              <View style={s.vpIcon}>
                <Text style={s.vpEmoji}>{vp.emoji}</Text>
              </View>
              <View style={s.vpText}>
                <Text style={s.vpTitle}>{vp.title}</Text>
                <Text style={s.vpDesc}>{vp.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* CTAs */}
        <Animated.View style={[s.ctas, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push('/onboarding/account')}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>Join my Community</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.8}
          >
            <Text style={s.secondaryBtnText}>I already have an account</Text>
          </TouchableOpacity>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.primary },
  hero:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoWrap:       { alignItems: 'center', gap: 10 },
  logoEmoji:      { fontSize: 72 },
  logoTitle:      { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  logoSub:        { fontSize: 16, color: 'rgba(255,255,255,0.75)', textAlign: 'center', fontWeight: '400' },
  card:           { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20, padding: 20, gap: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  vpRow:          { flexDirection: 'row', alignItems: 'center', gap: 14 },
  vpIcon:         { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  vpEmoji:        { fontSize: 22 },
  vpText:         { flex: 1 },
  vpTitle:        { fontSize: 15, fontWeight: '700', color: COLORS.text },
  vpDesc:         { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  ctas:           { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 20, gap: 12 },
  primaryBtn:     { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  secondaryBtn:   { paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText:{ fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
});
