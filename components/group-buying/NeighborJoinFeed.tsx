import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '@/constants/config';

export interface NeighborActivity {
  flat: string;
  units: number;
  minsAgo: number;
  tower?: string;
}

interface Props {
  activities: NeighborActivity[];
  totalParticipants: number;
  nextTierUnits?: number;
  nextTierPrice?: number;
}

function ActivityRow({ activity, delay }: { activity: NeighborActivity; delay: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, [delay]);

  const isRecent = activity.minsAgo <= 5;
  const towerColors: Record<string, string> = {
    A: '#4F46E5', B: '#059669', C: '#D97706', D: '#DC2626',
  };
  const towerKey = activity.tower || activity.flat.charAt(0);
  const color = towerColors[towerKey] || '#4F46E5';

  return (
    <Animated.View
      style={[s.row, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={[s.avatar, { backgroundColor: color + '18' }]}>
        <Text style={[s.avatarText, { color }]}>
          {towerKey}
        </Text>
        {isRecent && <View style={s.liveDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.flatText}>
          Flat <Text style={{ fontWeight: '800' }}>{activity.flat}</Text>
          {' '}joined for{' '}
          <Text style={{ fontWeight: '800', color }}>
            {activity.units} unit{activity.units > 1 ? 's' : ''}
          </Text>
        </Text>
        <Text style={s.timeText}>{activity.minsAgo}m ago</Text>
      </View>
      {isRecent && (
        <View style={s.recentBadge}>
          <Text style={s.recentBadgeText}>New</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function NeighborJoinFeed({ activities, totalParticipants, nextTierUnits, nextTierPrice }: Props) {
  if (!activities || activities.length === 0) return null;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.livePill}>
            <View style={s.liveDotLg} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
          <Text style={s.title}>Neighbors Joining</Text>
        </View>
        <View style={s.countChip}>
          <Ionicons name="people" size={12} color="#4F46E5" />
          <Text style={s.countText}>{totalParticipants} in</Text>
        </View>
      </View>

      {/* Next tier callout */}
      {nextTierUnits !== undefined && nextTierUnits > 0 && nextTierPrice && (
        <View style={s.nextTierBanner}>
          <Ionicons name="flash" size={13} color="#D97706" />
          <Text style={s.nextTierText}>
            <Text style={{ fontWeight: '800' }}>{nextTierUnits} more units</Text>
            {' '}drops price to{' '}
            <Text style={{ fontWeight: '900', color: '#059669' }}>₹{nextTierPrice}</Text>
            /unit for everyone
          </Text>
        </View>
      )}

      {/* Activity list */}
      <ScrollView
        style={s.list}
        scrollEnabled={false}
        nestedScrollEnabled={false}
      >
        {activities.slice(0, 6).map((a, idx) => (
          <ActivityRow key={idx} activity={a} delay={idx * 80} />
        ))}
      </ScrollView>

      {activities.length > 6 && (
        <Text style={s.moreText}>+{activities.length - 6} more neighbors joined</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.sm, paddingVertical: 10,
    backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderColor: '#F1F5F9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEE2E2', borderRadius: RADIUS.full,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  liveDotLg: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626' },
  liveText: { fontSize: 9, fontWeight: '900', color: '#DC2626', letterSpacing: 0.5 },
  title: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  countChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  countText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },

  nextTierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', paddingHorizontal: SPACING.sm, paddingVertical: 8,
    borderBottomWidth: 1, borderColor: '#FDE68A',
  },
  nextTierText: { flex: 1, fontSize: 11, color: COLORS.text, lineHeight: 16 },

  list: { paddingHorizontal: SPACING.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderColor: '#F8FAFC',
  },
  avatar: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { fontSize: 14, fontWeight: '900' },
  liveDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#16A34A', borderWidth: 1.5, borderColor: '#fff',
  },
  flatText: { fontSize: 12, color: COLORS.text, lineHeight: 17 },
  timeText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  recentBadge: {
    backgroundColor: '#DCFCE7', borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  recentBadgeText: { fontSize: 9, fontWeight: '800', color: '#059669' },
  moreText: {
    fontSize: 11, color: COLORS.textMuted, fontWeight: '600',
    textAlign: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderColor: '#F1F5F9',
  },
});
