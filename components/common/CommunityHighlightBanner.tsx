import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SHADOWS } from '@/constants/config';

// ── Types ─────────────────────────────────────────────────────────
export interface CommunityHighlightBannerProps {
  /** Short eyebrow label shown above the title */
  eyebrow?: string;
  /** Main headline of the highlight */
  title: string;
  /** Optional one-line description */
  description?: string;
  /** Emoji to show as a decorative accent (top-right) */
  decorEmoji?: string;
  /** Called when the user taps "Read more" */
  onPress?: () => void;
}

// ── Component ─────────────────────────────────────────────────────
export function CommunityHighlightBanner({
  eyebrow = 'COMMUNITY HIGHLIGHT',
  title,
  description,
  decorEmoji = '🏆',
  onPress,
}: CommunityHighlightBannerProps) {
  return (
    <View style={styles.wrapper}>
      {/* Subtle indigo→navy gradient background */}
      <LinearGradient
        colors={['#EEF2FF', '#E0E7FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Left accent bar */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.accentBar}
      />

      {/* Decorative emoji watermark */}
      <Text style={styles.decorEmoji} accessibilityElementsHidden>
        {decorEmoji}
      </Text>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.eyebrowRow}>
          <View style={styles.iconBadge}>
            <Ionicons name="megaphone-outline" size={13} color="#4F46E5" />
          </View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {!!description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}

        {onPress && (
          <TouchableOpacity style={styles.readMoreRow} onPress={onPress} activeOpacity={0.7}>
            <Text style={styles.readMore}>Read more</Text>
            <Ionicons name="arrow-forward" size={12} color="#4F46E5" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
    ...SHADOWS.sm,
  },
  accentBar: {
    width: 4,
    flexShrink: 0,
  },
  decorEmoji: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    fontSize: 52,
    opacity: 0.1,
    textAlignVertical: 'center',
    lineHeight: 80,
  },
  content: {
    flex: 1,
    padding: 14,
    paddingLeft: 12,
    gap: 4,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(99,102,241,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#4F46E5',
  },
  title: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    color: '#1E1B4B',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginTop: 1,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  readMore: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#4F46E5',
  },
});
