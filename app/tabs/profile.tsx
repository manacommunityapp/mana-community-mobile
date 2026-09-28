import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, FONTS, GRADIENTS, getAvatarColor } from '@/constants/config';
import {
  VIEW_EMERGENCY,
  VIEW_GROUP_BUYING,
  VIEW_TRIPS,
  VIEW_TICKETS,
  VIEW_DISCOVER,
  VIEW_MAINTENANCE_DUES,
  VIEW_SPORTS_MENU,
  VIEW_POLLS,
  VIEW_MARKETPLACE,
  VIEW_ADMIN,
} from '@/constants/permissions';

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

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const hasPerm = (perm: string) => isSuperAdmin || (user?.permissions || []).includes(perm);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(user.role);
  const avatarColor = getAvatarColor(user.name);

  // Check if any community service items are visible
  const showEmergency = hasPerm(VIEW_EMERGENCY);
  const showFinance = hasPerm(VIEW_MAINTENANCE_DUES);
  const showHelpdesk = hasPerm(VIEW_TICKETS);
  const showGroupBuying = hasPerm(VIEW_GROUP_BUYING);
  const showTrips = hasPerm(VIEW_TRIPS);
  const showDiscover = hasPerm(VIEW_DISCOVER);
  const hasCommunityServices = showEmergency || showFinance || showHelpdesk || showGroupBuying || showTrips || showDiscover;

  // Explore items permission check
  const showSports = hasPerm(VIEW_SPORTS_MENU);
  const showPolls = hasPerm(VIEW_POLLS);
  const showMarketplace = hasPerm(VIEW_MARKETPLACE);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero Banner ─────────────────────────────────────── */}
        <LinearGradient
          colors={['#4338CA', '#4F46E5', '#6366F1']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.hero}
        >
          {/* Background pattern dots */}
          <View style={styles.heroBgDot1} />
          <View style={styles.heroBgDot2} />

          {/* Avatar */}
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroAvatar}
          >
            <Text style={[styles.heroAvatarText, { color: '#FFFFFF' }]}>
              {user.name[0].toUpperCase()}
            </Text>
          </LinearGradient>

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
        </LinearGradient>

        {/* ── Profile Stats Row ─────────────────────────────────────── */}
        <View style={styles.profileStatsRow}>
          <View style={[styles.profileStatTile, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[styles.profileStatNum, { color: '#D97706' }]}>12</Text>
            <Text style={[styles.profileStatLabel, { color: '#D97706' }]}>Events</Text>
          </View>
          <View style={[styles.profileStatTile, { backgroundColor: COLORS.primaryLight }]}>
            <Text style={[styles.profileStatNum, { color: COLORS.primary }]}>8</Text>
            <Text style={[styles.profileStatLabel, { color: COLORS.primary }]}>Listings</Text>
          </View>
          <View style={[styles.profileStatTile, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.profileStatNum, { color: '#059669' }]}>3</Text>
            <Text style={[styles.profileStatLabel, { color: '#059669' }]}>Teams</Text>
          </View>
        </View>

        {/* ── Community Services ────────────────────────────────── */}
        {hasCommunityServices && (
          <>
            <SectionHeader title="Community Services" />
            <View style={styles.menuSection}>
              {showEmergency && (
                <MenuItem
                  icon="alert-circle-outline"
                  label="Emergency SOS"
                  onPress={() => router.push('/emergency')}
                  iconColor="#EF4444"
                  iconBg="#FEE2E2"
                />
              )}
              {showFinance && (
                <MenuItem
                  icon="card-outline"
                  label="Maintenance & Dues"
                  onPress={() => router.push('/finance')}
                  iconColor="#10B981"
                  iconBg="#D1FAE5"
                />
              )}
              {showHelpdesk && (
                <MenuItem
                  icon="headset-outline"
                  label="Smart Helpdesk"
                  onPress={() => router.push('/helpdesk')}
                  iconColor="#D97706"
                  iconBg="#FEF3C7"
                />
              )}
              {showGroupBuying && (
                <MenuItem
                  icon="bag-handle-outline"
                  label="Group Buying"
                  onPress={() => router.push('/group-buying')}
                  iconColor="#059669"
                  iconBg="#ECFDF5"
                />
              )}
              {showTrips && (
                <MenuItem
                  icon="compass-outline"
                  label="Community Trips"
                  onPress={() => router.push('/trips')}
                  iconColor="#0D9488"
                  iconBg="#CCFBF1"
                />
              )}
              {showDiscover && (
                <MenuItem
                  icon="sparkles-outline"
                  label="Community Discover"
                  onPress={() => router.push('/discover')}
                  iconColor="#7C3AED"
                  iconBg="#EDE9FE"
                />
              )}
            </View>
          </>
        )}

        {/* ── Explore ─────────────────────────────────────────── */}
        <SectionHeader title="Explore" />
        <View style={styles.menuSection}>
          {showSports && (
            <MenuItem icon="trophy-outline"      label="Sports Leagues"    onPress={() => router.push('/sports')}      iconColor="#059669" iconBg="#DCFCE7" />
          )}
          <MenuItem icon="car-sport-outline"   label="Commute Pool"      onPress={() => router.push('/commute')}     iconColor="#2563EB" iconBg="#DBEAFE" />
          {showPolls && (
            <MenuItem icon="bar-chart-outline"   label="Polls & Voting"    onPress={() => router.push('/polls')}       iconColor="#7C3AED" iconBg="#EDE9FE" />
          )}
          <MenuItem icon="pricetag-outline"    label="Auctions"          onPress={() => router.push('/auction')}     iconColor="#D97706" iconBg="#FEF3C7" />
          {showMarketplace && (
            <MenuItem icon="storefront-outline"  label="Marketplace"       onPress={() => router.push('/tabs/marketplace')} iconColor="#059669" iconBg="#D1FAE5" />
          )}
          <MenuItem icon="restaurant-outline"  label="Community Kitchen" onPress={() => router.push('/food')}        iconColor="#E11D48" iconBg="#FFE4E6" />
          <MenuItem icon="shield-checkmark-outline" label="Gate & Visitors" onPress={() => router.push('/visitors')}  iconColor="#0891B2" iconBg="#CFFAFE" />
          <MenuItem icon="car-outline"         label="Parking"           onPress={() => router.push('/parking')}      iconColor="#4338CA" iconBg="#E0E7FF" />
          <MenuItem icon="fitness-outline"     label="Facilities"        onPress={() => router.push('/facilities')}  iconColor="#0D9488" iconBg="#CCFBF1" />
          <MenuItem icon="construct-outline"   label="Home Services"     onPress={() => router.push('/services')}    iconColor="#DB2777" iconBg="#FCE7F3" />
          <MenuItem icon="paw-outline"         label="Pet Corner"        onPress={() => router.push('/pets')}        iconColor="#9333EA" iconBg="#F3E8FF" />
          <MenuItem icon="business-outline"    label="Governance & AGM"  onPress={() => router.push('/governance')}  iconColor="#7C3AED" iconBg="#EDE9FE" badge="NEW" />
          <MenuItem icon="pricetag-outline"    label="Offers & Deals"    onPress={() => router.push('/offers')}      iconColor="#D97706" iconBg="#FEF3C7" badge="NEW" />
          <MenuItem icon="school-outline"      label="Mana Academy"      onPress={() => router.push('/academy')}     iconColor="#7C3AED" iconBg="#F3E8FF" badge="NEW" />
          <MenuItem icon="home-outline"        label="Property OS (CPOS)" onPress={() => router.push('/cpos')}      iconColor="#059669" iconBg="#DCFCE7" badge="NEW" />
          <MenuItem icon="briefcase-outline"   label="Pro Network (CPN)" onPress={() => router.push('/cpn')}        iconColor="#2563EB" iconBg="#EFF6FF" badge="NEW" />
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
        {(isAdmin && (isSuperAdmin || (user?.permissions || []).includes(VIEW_ADMIN))) && (
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
    fontFamily: FONTS.displayEB,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    textAlign: 'center',
    fontFamily: FONTS.displayEB,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: FONTS.regular,
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
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  heroStatusActive: {
    backgroundColor: 'rgba(16,185,129,0.22)',
  },
  heroStatusInactive: {
    backgroundColor: 'rgba(245,158,11,0.22)',
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
    fontFamily: FONTS.bold,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: RADIUS.full,
    paddingHorizontal: 20,
    paddingVertical: 9,
    marginTop: 18,
    ...SHADOWS.md,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  // ── Profile Stats Row ─────────────────────────────────────────────
  profileStatsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 2,
  },
  profileStatTile: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
  },
  profileStatNum: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.5,
  },
  profileStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: FONTS.semiBold,
    marginTop: 1,
  },
  // ── Menu sections ─────────────────────────────────────────────
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 8,
    marginLeft: 18,
    fontFamily: FONTS.bold,
  },
  menuSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  dangerText: {
    color: COLORS.error,
  },
  menuBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  menuBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    letterSpacing: 0.3,
  },
  version: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    paddingTop: 24,
    paddingBottom: 8,
    fontFamily: FONTS.regular,
  },
});
