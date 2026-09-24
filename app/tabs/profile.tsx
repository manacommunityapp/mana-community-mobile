import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, getAvatarColor } from '@/constants/config';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface MenuItemProps {
  icon: IoniconsName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
  badge?: string;
}

function MenuItem({ icon, label, onPress, danger, iconColor, iconBg, badge }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg || COLORS.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.error : (iconColor || COLORS.primary)} />
      </View>
      <Text style={[styles.menuLabel, danger && styles.dangerText]}>{label}</Text>
      {badge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await logout(); },
      },
    ]);
  };

  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(user.role);
  const avatarColor = getAvatarColor(user.name);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero Banner ─────────────────────────────────────── */}
        <View style={styles.hero}>
          {/* Background pattern dots */}
          <View style={styles.heroBgDot1} />
          <View style={styles.heroBgDot2} />

          {/* Avatar */}
          <View style={[styles.heroAvatar, { backgroundColor: avatarColor.bg }]}>
            <Text style={[styles.heroAvatarText, { color: avatarColor.text }]}>
              {user.name[0].toUpperCase()}
            </Text>
          </View>

          {/* Name & info */}
          <Text style={styles.heroName}>{user.name}</Text>
          <Text style={styles.heroEmail}>{user.email}</Text>

          {/* Flat / Tower tags */}
          <View style={styles.heroTagRow}>
            {user.flatNumber && (
              <View style={styles.heroTag}>
                <Ionicons name="home-outline" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroTagText}>{user.flatNumber}</Text>
              </View>
            )}
            {user.tower && (
              <View style={styles.heroTag}>
                <Ionicons name="business-outline" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.heroTagText}>{user.tower}</Text>
              </View>
            )}
            {/* Status badge */}
            <View style={[styles.heroStatusBadge, user.status === 'ACTIVE' ? styles.heroStatusActive : styles.heroStatusInactive]}>
              <View style={[styles.statusDot, user.status === 'ACTIVE' ? styles.dotActive : styles.dotInactive]} />
              <Text style={styles.heroStatusText}>{user.status}</Text>
            </View>
          </View>

          {/* Edit profile button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/profile/edit')}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Explore ─────────────────────────────────────────── */}
        <SectionHeader title="Explore" />
        <View style={styles.menuSection}>
          <MenuItem icon="football-outline"    label="Sports"      onPress={() => router.push('/sports')}      iconColor="#059669" iconBg="#D1FAE5" />
          <MenuItem icon="car-outline"         label="Commute"     onPress={() => router.push('/commute')}     iconColor="#2563EB" iconBg="#DBEAFE" />
          <MenuItem icon="stats-chart-outline" label="Polls"       onPress={() => router.push('/polls')}       iconColor="#7C3AED" iconBg="#EDE9FE" />
          <MenuItem icon="pricetag-outline"    label="Auction"     onPress={() => router.push('/auction')}     iconColor="#D97706" iconBg="#FEF3C7" />
          <MenuItem icon="storefront-outline"  label="Marketplace" onPress={() => router.push('/tabs/marketplace')} iconColor="#DC2626" iconBg="#FEE2E2" />
        </View>

        {/* ── Account ─────────────────────────────────────────── */}
        <SectionHeader title="Account" />
        <View style={styles.menuSection}>
          <MenuItem icon="notifications-outline"  label="Notifications"   onPress={() => router.push('/notifications')} />
          <MenuItem icon="lock-closed-outline"    label="Change Password"  onPress={() => router.push('/settings/password')} />
          <MenuItem icon="people-outline"         label="My Community"    onPress={() => router.push('/community')} />
          <MenuItem icon="time-outline"           label="My Activity"     onPress={() => router.push('/activity')} />
          <MenuItem icon="settings-outline"       label="Settings"        onPress={() => router.push('/settings')} />
        </View>

        {/* ── Admin ───────────────────────────────────────────── */}
        {isAdmin && (
          <>
            <SectionHeader title="Admin" />
            <View style={styles.menuSection}>
              <MenuItem
                icon="shield-checkmark-outline"
                label="Admin Panel"
                onPress={() => router.push('/admin')}
                badge="ADMIN"
                iconColor={COLORS.primary}
                iconBg={COLORS.primaryLight}
              />
            </View>
          </>
        )}

        {/* ── Sign Out ─────────────────────────────────────────── */}
        <View style={[styles.menuSection, { marginTop: 8 }]}>
          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleLogout}
            danger
            iconBg={COLORS.errorLight}
          />
        </View>

        <Text style={styles.version}>Mana Community v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingBottom: 32,
  },
  // ── Hero ──────────────────────────────────────────────────────
  hero: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  /** Decorative circles in hero background */
  heroBgDot1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -60,
    right: -60,
  },
  heroBgDot2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -40,
    left: -40,
  },
  heroAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 14,
    ...SHADOWS.md,
  },
  heroAvatarText: {
    fontWeight: '800',
    fontSize: 34,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
    textAlign: 'center',
  },
  heroTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroTagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroStatusActive: {
    backgroundColor: 'rgba(16,185,129,0.25)',
  },
  heroStatusInactive: {
    backgroundColor: 'rgba(245,158,11,0.25)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#34D399',
  },
  dotInactive: {
    backgroundColor: COLORS.warning,
  },
  heroStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: RADIUS.full,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginTop: 18,
    ...SHADOWS.sm,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // ── Menu sections ─────────────────────────────────────────────
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 20,
  },
  menuSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  dangerText: {
    color: COLORS.error,
  },
  menuBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  version: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    paddingTop: 24,
    paddingBottom: 8,
  },
});
