import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FONTS, RADIUS, SHADOWS } from '@/constants/config';

// ── Types ────────────────────────────────────────────────────────
export interface KpiChip {
  id: string;
  label: string;
  value: number | string;
  emoji: string;
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Accent colour for the value text and icon tint */
  color: string;
  /** Soft background colour for the chip */
  bg: string;
  /** Slightly darker version of bg used for the icon badge */
  iconBg: string;
  /** Expo Router route to push to when tapped */
  route: string;
}

interface TodayAtAGlanceProps {
  chips: KpiChip[];
}

// ── Component ─────────────────────────────────────────────────────
export function TodayAtAGlance({ chips }: TodayAtAGlanceProps) {
  const router = useRouter();
  const displayChips = chips.slice(0, 6);

  const renderCard = (chip: KpiChip) => (
    <TouchableOpacity
      key={chip.id}
      style={[styles.card, { backgroundColor: chip.bg }]}
      onPress={() => router.push(chip.route as any)}
      activeOpacity={0.75}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.iconBadge, { backgroundColor: chip.iconBg }]}>
          <Ionicons name={chip.icon} size={11} color={chip.color} />
        </View>
        <Text style={[styles.value, { color: chip.color }]}>
          {typeof chip.value === 'number' && chip.value > 99 ? '99+' : chip.value}
        </Text>
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {chip.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      {/* Section heading */}
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Today at a Glance</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {/* Compact 3x2 Grid: 3 in row 1, 3 in row 2 */}
      <View style={styles.grid}>
        {/* Row 1 */}
        {displayChips.length >= 3 && (
          <View style={styles.gridRow}>
            {renderCard(displayChips[0])}
            {renderCard(displayChips[1])}
            {renderCard(displayChips[2])}
          </View>
        )}

        {/* Row 2 */}
        {displayChips.length >= 6 && (
          <View style={styles.gridRow}>
            {renderCard(displayChips[3])}
            {renderCard(displayChips[4])}
            {renderCard(displayChips[5])}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 1,
    paddingBottom: 2,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  heading: {
    fontFamily: FONTS.displayBold,
    fontSize: 12.5,
    color: '#1E293B',
    letterSpacing: -0.2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  liveDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  grid: {
    paddingHorizontal: 16,
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  card: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    gap: 2,
    ...SHADOWS.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: FONTS.displayEB,
    fontSize: 14,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 9.5,
    color: '#64748B',
    letterSpacing: 0.05,
  },
});
