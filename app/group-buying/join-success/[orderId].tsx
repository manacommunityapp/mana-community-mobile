import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Share, Animated, Easing, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { groupBuyingService } from '@/services/groupBuyingService';

const SHARE_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬', bg: '#DCFCE7', color: '#16A34A' },
  { id: 'community', label: 'Mana Chat', emoji: '🏘️', bg: '#EEF2FF', color: '#4F46E5' },
  { id: 'copy', label: 'Copy Link', emoji: '🔗', bg: '#F1F5F9', color: '#475569' },
  { id: 'more', label: 'More', emoji: '⬆️', bg: '#FFF7ED', color: '#D97706' },
] as const;

export default function JoinSuccessScreen() {
  const { orderId, dealId, qty, savings, dealTitle, nextUnits, nextPrice } =
    useLocalSearchParams<{
      orderId: string;
      dealId: string;
      qty: string;
      savings: string;
      dealTitle: string;
      nextUnits: string;
      nextPrice: string;
    }>();

  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [shared, setShared] = useState(false);

  const { data: deal } = useQuery({
    queryKey: ['deal-detail', dealId],
    queryFn: () => groupBuyingService.getDealById(dealId || ''),
    enabled: !!dealId,
  });

  const targetUnits = deal?.targetQty || 100;
  const committedUnits = deal?.committedQty || 0;
  const progressPct = Math.min(1, committedUnits / targetUnits);
  const qtyNum = parseInt(qty || '1', 10);
  const savingsNum = parseFloat(savings || '0');
  const unitsToNext = parseInt(nextUnits || '0', 10);
  const nextPriceNum = parseFloat(nextPrice || '0');

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 5, tension: 120, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: progressPct,
      duration: 1200,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressPct]);

  const handleShare = async (channel: string) => {
    const dealName = dealTitle || deal?.title || 'this group deal';
    const message = `Hey! I just joined a Community Group Buy for "${dealName}" on the Mana app. We need ${unitsToNext > 0 ? `just ${unitsToNext} more units` : 'a few more residents'} to unlock an even bigger discount (₹${nextPriceNum}/unit)! Join now and save together 🛍️`;

    if (channel === 'copy') {
      Alert.alert('Link Copied!', 'Share link copied to clipboard. Share it with neighbors!');
      setShared(true);
      return;
    }

    try {
      await Share.share({ message });
      setShared(true);
    } catch (e) {
      console.log('Share cancelled');
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero gradient */}
      <LinearGradient
        colors={['#312E81', '#4F46E5', '#6366F1']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        {/* Celebration badge */}
        <Animated.View style={[s.successBadge, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={s.successEmoji}>🎉</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', gap: 6 }}>
          <Text style={s.heroTitle}>You're In!</Text>
          <Text style={s.heroSub} numberOfLines={2}>
            {dealTitle || deal?.title || 'Group Deal'}
          </Text>
          <View style={s.heroPill}>
            <Ionicons name="people" size={13} color="#A5B4FC" />
            <Text style={s.heroPillText}>
              {committedUnits} of {targetUnits} units committed
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Savings summary */}
      <View style={s.savingsRow}>
        <View style={s.savingsBox}>
          <Text style={s.savingsLabel}>You Committed</Text>
          <Text style={s.savingsValue}>{qtyNum} unit{qtyNum > 1 ? 's' : ''}</Text>
        </View>
        <View style={[s.savingsBox, { borderLeftWidth: 1, borderColor: '#E2E8F0' }]}>
          <Text style={s.savingsLabel}>Saved So Far</Text>
          <Text style={[s.savingsValue, { color: '#059669' }]}>₹{savingsNum.toFixed(0)}</Text>
        </View>
        <View style={[s.savingsBox, { borderLeftWidth: 1, borderColor: '#E2E8F0' }]}>
          <Text style={s.savingsLabel}>Order ID</Text>
          <Text style={[s.savingsValue, { fontSize: 11 }]}>{orderId || '—'}</Text>
        </View>
      </View>

      {/* Live community progress */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Community Progress</Text>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progressWidth }]} />
        </View>
        <View style={s.progressMeta}>
          <Text style={s.progressLeft}>{committedUnits} units locked in</Text>
          <Text style={s.progressRight}>{targetUnits} target</Text>
        </View>

        {unitsToNext > 0 && nextPriceNum > 0 && (
          <View style={s.nextTierBanner}>
            <View style={s.nextTierLeft}>
              <Ionicons name="trending-down" size={16} color="#059669" />
              <View>
                <Text style={s.nextTierLabel}>Next Tier Unlocks at</Text>
                <Text style={s.nextTierPrice}>₹{nextPriceNum}/unit</Text>
              </View>
            </View>
            <View style={s.nextTierRight}>
              <Text style={s.nextTierUnits}>{unitsToNext}</Text>
              <Text style={s.nextTierUnitsLabel}>more{'\n'}units</Text>
            </View>
          </View>
        )}
      </View>

      {/* Invite section — the viral loop */}
      <View style={s.section}>
        <View style={s.inviteHeader}>
          <View style={s.inviteHeadLeft}>
            <Text style={s.sectionTitle}>Invite Neighbors</Text>
            <Text style={s.inviteSubtitle}>
              {unitsToNext > 0
                ? `${unitsToNext} more units unlocks ₹${nextPriceNum}/unit — that's everyone paying less!`
                : 'Share the deal — the more, the merrier!'}
            </Text>
          </View>
          {shared && (
            <View style={s.sharedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={s.sharedBadgeText}>Shared!</Text>
            </View>
          )}
        </View>

        <View style={s.shareGrid}>
          {SHARE_CHANNELS.map((ch) => (
            <TouchableOpacity
              key={ch.id}
              style={[s.shareBtn, { backgroundColor: ch.bg }]}
              onPress={() => handleShare(ch.id)}
              activeOpacity={0.75}
            >
              <Text style={s.shareEmoji}>{ch.emoji}</Text>
              <Text style={[s.shareLabel, { color: ch.color }]}>{ch.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Share message preview */}
        <View style={s.previewBox}>
          <Text style={s.previewLabel}>Message preview</Text>
          <Text style={s.previewText} numberOfLines={3}>
            {`Hey! I just joined a Community Group Buy for "${dealTitle || deal?.title || 'this deal'}" on the Mana app. We need ${unitsToNext > 0 ? `just ${unitsToNext} more units` : 'a few more residents'} to unlock a bigger discount! Join now 🛍️`}
          </Text>
        </View>
      </View>

      {/* Recent participant activity */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Who's In</Text>
        {[
          { flat: 'A-402', units: 2, mins: 3 },
          { flat: 'B-201', units: 1, mins: 8 },
          { flat: 'A-805', units: 3, mins: 15 },
          { flat: 'C-103', units: 1, mins: 22 },
          { flat: 'B-601', units: 2, mins: 31 },
        ].map((p, idx) => (
          <View key={idx} style={s.participantRow}>
            <View style={[s.avatar, { backgroundColor: idx % 2 === 0 ? '#EEF2FF' : '#ECFDF5' }]}>
              <Text style={s.avatarText}>
                {p.flat.split('-')[0]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.participantFlat}>Flat {p.flat}</Text>
              <Text style={s.participantUnits}>{p.units} unit{p.units > 1 ? 's' : ''} committed</Text>
            </View>
            <Text style={s.participantTime}>{p.mins}m ago</Text>
          </View>
        ))}
      </View>

      {/* CTA buttons */}
      <View style={s.ctas}>
        <TouchableOpacity
          style={s.primaryCta}
          onPress={() => router.replace(`/group-buying/orders` as any)}
        >
          <Ionicons name="receipt-outline" size={16} color="#fff" />
          <Text style={s.primaryCtaText}>View My Order & Pickup Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryCta}
          onPress={() => router.replace('/group-buying' as any)}
        >
          <Ionicons name="grid-outline" size={14} color="#4F46E5" />
          <Text style={s.secondaryCtaText}>Browse More Deals</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingBottom: 32 },

  hero: {
    paddingTop: 32, paddingBottom: 28,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center', gap: 10,
  },
  successBadge: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  successEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.82)', textAlign: 'center', fontWeight: '500' },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5,
  },
  heroPillText: { fontSize: 12, color: '#C7D2FE', fontWeight: '600' },

  savingsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderColor: '#E2E8F0',
  },
  savingsBox: {
    flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3,
  },
  savingsLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  savingsValue: { fontSize: 17, fontWeight: '900', color: COLORS.text },

  section: {
    backgroundColor: '#fff', marginTop: 8,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },

  progressTrack: {
    height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLeft: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  progressRight: { fontSize: 11, color: '#4F46E5', fontWeight: '700' },

  nextTierBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  nextTierLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  nextTierLabel: { fontSize: 10, color: '#059669', fontWeight: '600' },
  nextTierPrice: { fontSize: 18, fontWeight: '900', color: '#059669' },
  nextTierRight: { alignItems: 'center' },
  nextTierUnits: { fontSize: 22, fontWeight: '900', color: '#4F46E5' },
  nextTierUnitsLabel: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },

  inviteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  inviteHeadLeft: { flex: 1, gap: 3 },
  inviteSubtitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', lineHeight: 16 },
  sharedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#DCFCE7', borderRadius: RADIUS.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sharedBadgeText: { fontSize: 10, fontWeight: '700', color: '#059669' },

  shareGrid: { flexDirection: 'row', gap: 8 },
  shareBtn: {
    flex: 1, alignItems: 'center', gap: 5,
    borderRadius: RADIUS.md, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  shareEmoji: { fontSize: 20 },
  shareLabel: { fontSize: 10, fontWeight: '700' },

  previewBox: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md,
    padding: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 4,
  },
  previewLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewText: { fontSize: 11, color: COLORS.text, lineHeight: 17 },

  participantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6,
    borderBottomWidth: 1, borderColor: '#F1F5F9',
  },
  avatar: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#4F46E5' },
  participantFlat: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  participantUnits: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  participantTime: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },

  ctas: { gap: 10, paddingHorizontal: SPACING.md, marginTop: 8 },
  primaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#4F46E5', borderRadius: RADIUS.lg,
    paddingVertical: 14, ...SHADOWS.sm,
  },
  primaryCtaText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  secondaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.lg, paddingVertical: 12,
  },
  secondaryCtaText: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
});
