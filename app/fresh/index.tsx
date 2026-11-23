import { THEME } from '@/constants/theme';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';

export default function ManaFreshScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mana Fresh</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <Text style={styles.illustrationEmoji}>🥦</Text>
          <Text style={styles.illustrationEmoji2}>🥕</Text>
          <View style={styles.leafCircle}>
            <Ionicons name="leaf" size={56} color="#059669" />
          </View>
          <Text style={styles.illustrationEmoji3}>🍅</Text>
          <Text style={styles.illustrationEmoji4}>🧅</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Mana Fresh</Text>
        <Text style={styles.subtitle}>
          Fresh groceries &amp; hyperlocal delivery
        </Text>

        {/* Feature chips */}
        <View style={styles.chipRow}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.chip}>
              <Ionicons name={f.icon as any} size={15} color={f.color} />
              <Text style={[styles.chipText, { color: f.color }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Coming soon badge */}
        <View style={styles.comingSoonBadge}>
          <Ionicons name="time-outline" size={16} color="#B45309" />
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>

        <Text style={styles.description}>
          We're working hard to bring fresh produce and daily essentials right to
          your doorstep — straight from local farmers and trusted vendors in your
          community.
        </Text>

        {/* CTA */}
        <TouchableOpacity
          style={styles.notifyBtn}
          activeOpacity={0.8}
          onPress={() =>
            Alert.alert(
              'Mana Fresh',
              "You're on the list! We'll notify you when Mana Fresh launches in your community.",
              [{ text: 'Great!' }],
            )
          }
        >
          <Ionicons name="notifications-outline" size={18} color="#fff" />
          <Text style={styles.notifyBtnText}>Get Notified at Launch</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  { label: 'Farm Fresh',    icon: 'leaf-outline',       color: '#059669' },
  { label: 'Same-day',      icon: 'bicycle-outline',    color: '#2563EB' },
  { label: 'Zero Waste',    icon: 'earth-outline',      color: '#7C3AED' },
  { label: 'Local Vendors', icon: 'storefront-outline', color: '#D97706' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    gap: 16,
  },
  illustrationWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  leafCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  illustrationEmoji: {
    position: 'absolute',
    top: 10,
    left: 15,
    fontSize: 32,
  },
  illustrationEmoji2: {
    position: 'absolute',
    top: 10,
    right: 15,
    fontSize: 28,
  },
  illustrationEmoji3: {
    position: 'absolute',
    bottom: 10,
    right: 20,
    fontSize: 28,
  },
  illustrationEmoji4: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    fontSize: 26,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.xs,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: 8,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    fontFamily: FONTS.bold,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginTop: 8,
    ...SHADOWS.md,
  },
  notifyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontFamily: FONTS.bold,
  },
});
