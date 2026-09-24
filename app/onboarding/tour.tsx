import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, NativeScrollEvent, NativeSyntheticEvent, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants/config';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji:    '🏘️',
    color:    '#4F46E5',
    title:    'Stay Connected',
    desc:     'Share updates, discover community announcements, create polls, and never miss a neighbourhood event.',
    features: ['Community Feed', 'Events & RSVP', 'Polls & Voting', 'Push Notifications'],
  },
  {
    emoji:    '🛒',
    color:    '#059669',
    title:    'Buy · Sell · Trade',
    desc:     'A full marketplace just for your community — buy items, list what you no longer need, and bid in live auctions.',
    features: ['Listings & Marketplace', 'Live Auctions', 'Wishlist & Offers', 'Safe Handover'],
  },
  {
    emoji:    '⚽',
    color:    '#DC2626',
    title:    'More to Explore',
    desc:     'From tournaments and live scores to the job board and admin tools — there\'s something for every resident.',
    features: ['Sports & Tournaments', 'Job Board', 'Admin Panel', 'Chat & Messaging'],
  },
];

export default function TourScreen() {
  const router   = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  }

  function goNext() {
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
    } else {
      router.replace('/tabs/feed');
    }
  }

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Skip button */}
      <TouchableOpacity style={s.skip} onPress={() => router.replace('/tabs/feed')}>
        <Text style={s.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slide scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[s.slide, { width }]}>
            {/* Big colored icon */}
            <View style={[s.iconCircle, { backgroundColor: slide.color }]}>
              <Text style={s.slideEmoji}>{slide.emoji}</Text>
            </View>

            <Text style={s.slideTitle}>{slide.title}</Text>
            <Text style={s.slideDesc}>{slide.desc}</Text>

            {/* Feature chips */}
            <View style={s.featureRow}>
              {slide.features.map((f) => (
                <View key={f} style={[s.featureChip, { borderColor: slide.color + '40' }]}>
                  <Text style={[s.featureText, { color: slide.color }]}>✓ {f}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={s.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[s.dot, i === activeIndex && s.dotActive]}
            onPress={() => scrollRef.current?.scrollTo({ x: i * width, animated: true })}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: SLIDES[activeIndex].color }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={s.nextBtnText}>
            {isLast ? '🚀 Enter Community' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background },
  skip:         { alignSelf: 'flex-end', padding: 16 },
  skipText:     { fontSize: 15, color: COLORS.textMuted, fontWeight: '500' },
  slide:        { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  iconCircle:   { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  slideEmoji:   { fontSize: 56 },
  slideTitle:   { fontSize: 28, fontWeight: '900', color: COLORS.text, textAlign: 'center', lineHeight: 34 },
  slideDesc:    { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', lineHeight: 24 },
  featureRow:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 4 },
  featureChip:  { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  featureText:  { fontSize: 13, fontWeight: '600' },
  dots:         { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  dotActive:    { width: 24, backgroundColor: COLORS.primary },
  footer:       { paddingHorizontal: 24, paddingBottom: 16 },
  nextBtn:      { borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  nextBtnText:  { color: '#fff', fontWeight: '800', fontSize: 17 },
});
