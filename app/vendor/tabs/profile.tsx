import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, getAvatarColor, getInitials } from '@/constants/config';
import { VENDOR_COLORS } from '@/constants/vendorTheme';
import { vendorService, type VendorReview } from '@/services/vendorService';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface MenuItemProps {
  icon: IoniconsName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
  trailing?: string;
}

function MenuItem({ icon, label, onPress, danger, iconColor, iconBg, trailing }: MenuItemProps) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[s.menuIconWrap, { backgroundColor: iconBg || COLORS.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.error : (iconColor || VENDOR_COLORS.accent)} />
      </View>
      <Text style={[s.menuLabel, danger && s.dangerText]}>{label}</Text>
      {trailing && <Text style={s.menuTrailing}>{trailing}</Text>}
      <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
    </TouchableOpacity>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= Math.floor(rating) ? 'star' : i <= rating + 0.5 ? 'star-half' : 'star-outline'}
          size={16}
          color={VENDOR_COLORS.accent}
        />
      ))}
    </View>
  );
}

export default function VendorProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const displayName = user?.fullName || user?.name || (user?.email ? user.email.split('@')[0] : 'Vendor');
  const avatarColor = getAvatarColor(displayName);
  const [reviews, setReviews] = useState<VendorReview[]>([]);

  useEffect(() => {
    vendorService.getReviews().then(setReviews);
  }, []);

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroDot1} />
          <View style={s.heroDot2} />
          <View style={[s.heroAvatar, { backgroundColor: avatarColor.bg }]}>
            <Text style={[s.heroAvatarText, { color: avatarColor.text }]}>
              {getInitials(displayName)}
            </Text>
          </View>
          <Text style={s.heroName}>{displayName}</Text>
          <Text style={s.heroEmail}>{user?.email}</Text>
          <View style={s.heroTagRow}>
            <View style={s.heroTag}>
              <Ionicons name="briefcase" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroTagText}>Service Vendor</Text>
            </View>
            <View style={s.heroTag}>
              <Ionicons name="star" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroTagText}>{avgRating.toFixed(1)} Rating</Text>
            </View>
            <View style={s.heroStatusBadge}>
              <View style={s.statusDot} />
              <Text style={s.heroStatusText}>AVAILABLE</Text>
            </View>
          </View>
        </View>

        {/* Reviews summary */}
        <Text style={s.sectionHeader}>Recent Reviews</Text>
        <View style={s.reviewsSection}>
          {reviews.slice(0, 3).map(r => (
            <View key={r.id} style={s.reviewCard}>
              <View style={s.reviewTop}>
                <Text style={s.reviewCustomer}>{r.customerName}</Text>
                <StarRating rating={r.rating} />
              </View>
              <Text style={s.reviewComment} numberOfLines={2}>{r.comment}</Text>
              <Text style={s.reviewMeta}>{r.service} · {r.date}</Text>
            </View>
          ))}
        </View>

        {/* Business */}
        <Text style={s.sectionHeader}>Business</Text>
        <View style={s.menuSection}>
          <MenuItem icon="calendar-outline" label="My Availability" onPress={() => {}} iconColor={VENDOR_COLORS.accent} iconBg={VENDOR_COLORS.accentLight} />
          <MenuItem icon="pricetags-outline" label="Service Rates" onPress={() => {}} iconColor="#7C3AED" iconBg="#EDE9FE" />
          <MenuItem icon="document-text-outline" label="Invoice History" onPress={() => {}} iconColor="#2563EB" iconBg="#DBEAFE" />
          <MenuItem icon="stats-chart-outline" label="Earnings Report" onPress={() => {}} iconColor="#059669" iconBg="#D1FAE5" />
        </View>

        {/* Account */}
        <Text style={s.sectionHeader}>Account</Text>
        <View style={s.menuSection}>
          <MenuItem icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => {}} />
          <MenuItem icon="settings-outline" label="Settings" onPress={() => {}} />
        </View>

        {/* Sign Out */}
        <View style={[s.menuSection, { marginTop: 8 }]}>
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger iconBg={COLORS.errorLight} />
        </View>

        <Text style={s.version}>Mana Community v1.0.0 · Vendor</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 32 },
  hero: {
    backgroundColor: VENDOR_COLORS.heroBg,
    alignItems: 'center', paddingTop: 28, paddingBottom: 30, paddingHorizontal: 20,
    overflow: 'hidden',
  },
  heroDot1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -60,
  },
  heroDot2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -40, left: -40,
  },
  heroAvatar: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14, ...SHADOWS.md,
  },
  heroAvatarText: { fontWeight: '800', fontSize: 34 },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, textAlign: 'center' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3, textAlign: 'center' },
  heroTagRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroTagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  heroStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(16,185,129,0.25)',
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  heroStatusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 22, marginBottom: 8, marginLeft: 20,
  },
  reviewsSection: {
    marginHorizontal: 16, gap: 6,
  },
  reviewCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  reviewTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6,
  },
  reviewCustomer: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  starRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  reviewMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },
  menuSection: {
    backgroundColor: COLORS.surface, marginHorizontal: 16,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
  menuTrailing: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  dangerText: { color: COLORS.error },
  version: {
    textAlign: 'center', color: COLORS.textMuted,
    fontSize: 12, paddingTop: 24, paddingBottom: 8,
  },
});
