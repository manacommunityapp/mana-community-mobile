import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '@/constants/config';
import type { BadgeDto } from '@/types/api';

const RARITY_STYLE: Record<string, { border: string; bg: string; label: string; glow: string }> = {
  common:    { border: '#D1D5DB', bg: '#F9FAFB', label: '#6B7280', glow: 'transparent' },
  rare:      { border: '#3B82F6', bg: '#EFF6FF', label: '#1D4ED8', glow: '#BFDBFE'    },
  epic:      { border: '#8B5CF6', bg: '#F5F3FF', label: '#6D28D9', glow: '#DDD6FE'    },
  legendary: { border: '#F59E0B', bg: '#FFFBEB', label: '#B45309', glow: '#FDE68A'    },
};

interface BadgeCardProps {
  badge:     BadgeDto;
  size?:     'sm' | 'md' | 'lg';
  onPress?:  () => void;
}

export function BadgeCard({ badge, size = 'md', onPress }: BadgeCardProps) {
  const style  = RARITY_STYLE[badge.rarity] ?? RARITY_STYLE.common;
  const earned = badge.isEarned;

  const emojiSize  = size === 'sm' ? 20 : size === 'lg' ? 36 : 28;
  const cardWidth  = size === 'sm' ? 64  : size === 'lg' ? 100 : 80;
  const nameLines  = size === 'sm' ? 1   : 2;

  return (
    <TouchableOpacity
      style={[
        c.badge,
        { width: cardWidth, borderColor: earned ? style.border : '#E5E7EB', backgroundColor: earned ? style.bg : '#F3F4F6' },
      ]}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
    >
      {/* Rarity glow dot */}
      {earned && badge.rarity !== 'common' && (
        <View style={[c.glowDot, { backgroundColor: style.glow }]} />
      )}

      <Text style={[c.emoji, { fontSize: emojiSize, opacity: earned ? 1 : 0.35 }]}>
        {badge.emoji}
      </Text>

      <Text
        style={[c.name, { color: earned ? style.label : COLORS.textMuted }, size === 'sm' && c.nameSm]}
        numberOfLines={nameLines}
      >
        {badge.name}
      </Text>

      {earned && badge.rarity !== 'common' && (
        <Text style={[c.rarity, { color: style.label }]}>
          {badge.rarity.toUpperCase()}
        </Text>
      )}

      {!earned && <View style={c.lockedOverlay}><Text style={c.lockedIcon}>🔒</Text></View>}
    </TouchableOpacity>
  );
}

/** Horizontal scrollable badge row */
export function BadgeRow({ badges, maxVisible = 6 }: { badges: BadgeDto[]; maxVisible?: number }) {
  const earned = badges.filter((b) => b.isEarned);
  const shown  = earned.slice(0, maxVisible);
  const extra  = earned.length - maxVisible;

  if (earned.length === 0) {
    return (
      <View style={c.emptyRow}>
        <Text style={c.emptyText}>No badges earned yet — play more matches!</Text>
      </View>
    );
  }

  return (
    <View style={c.row}>
      {shown.map((b) => <BadgeCard key={b.id} badge={b} size="sm" />)}
      {extra > 0 && (
        <View style={c.extraBadge}>
          <Text style={c.extraText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  badge:       { borderRadius: 12, borderWidth: 1.5, padding: 8, alignItems: 'center', gap: 4, position: 'relative', overflow: 'hidden' },
  glowDot:     { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  emoji:       { textAlign: 'center' },
  name:        { fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 13 },
  nameSm:      { fontSize: 9 },
  rarity:      { fontSize: 7, fontWeight: '900', letterSpacing: 0.3, marginTop: -2 },
  lockedOverlay:{ position: 'absolute', top: 4, right: 4 },
  lockedIcon:  { fontSize: 10 },
  row:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyRow:    { paddingVertical: 10 },
  emptyText:   { fontSize: 13, color: COLORS.textMuted },
  extraBadge:  { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  extraText:   { fontSize: 14, fontWeight: '800', color: COLORS.textMuted },
});
