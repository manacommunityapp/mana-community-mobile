import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
  Modal, Share,
} from 'react-native';
import { CachedImage as Image } from '@/components/common/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTenantContext } from '@/context/TenantContext';
import { useAppTheme } from '@/context/ThemeContext';
import { authService } from '@/services/authService';
import { usePermissions } from '@/hooks/usePermissions';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { CONFIG, COLORS, SHADOWS, RADIUS, FONTS, GRADIENTS, getInitials } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { profileService } from '@/services/profileService';
import { eventService } from '@/services/eventService';
import { marketplaceService } from '@/services/marketplaceService';
import { sportsService } from '@/services/sportsService';
import { maintenanceDuesService } from '@/services/maintenanceDuesService';
import { smartHelpdeskService } from '@/services/smartHelpdeskService';
import { notificationService } from '@/services/notificationService';
import { ProfileImageModal } from '@/components/common/ProfileImageModal';
import { JoinCommunityModal } from '@/components/community/JoinCommunityModal';
import { resolveImageUrl, resolveUserAvatar } from '@/utils/imageUrlUtils';
import {
  VIEW_FEED,
  VIEW_HOME_SERVICE,
  VIEW_VISITORS,
  VIEW_AMENITIES,
  VIEW_NOTICES,
  VIEW_JOBS,
  VIEW_EVENTS,
  VIEW_FOOD_MENU,
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
  // Wealth & investments
  VIEW_PERSONAL_FINANCE,
  VIEW_FIXED_DEPOSITS,
  VIEW_DIGITAL_GOLD,
  VIEW_MUTUAL_FUNDS,
  VIEW_LOANS,
  // Payments & transfers
  VIEW_SPLIT_BILL,
  VIEW_SCAN_PAY,
  VIEW_SEND_MONEY,
  VIEW_UPI_HISTORY,
  // Lifestyle
  VIEW_MOVIES,
  VIEW_VEHICLE_CARE,
  VIEW_CALENDAR,
  VIEW_HEALTH_GUARD,
} from '@/constants/permissions';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface MenuItemProps {
  icon: IoniconsName;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  isLast?: boolean;
}

function MenuItem({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  iconColor,
  iconBg,
  badge,
  badgeBg,
  badgeColor,
  isLast,
}: MenuItemProps) {
  const { palette } = useAppTheme();
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        { borderBottomColor: palette.borderLight },
        isLast && styles.menuItemLast,
      ]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View
        style={[
          styles.menuIconWrap,
          { backgroundColor: palette.isDark && iconColor ? iconColor + '26' : (iconBg || palette.surfaceMuted) },
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={danger ? COLORS.error : iconColor || palette.link}
        />
      </View>

      <View style={styles.menuLabelWrap}>
        <Text style={[styles.menuLabel, { color: palette.text }, danger && styles.dangerText]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel && (
          <Text style={[styles.menuSublabel, { color: palette.textMuted }]} numberOfLines={1}>
            {sublabel}
          </Text>
        )}
      </View>

      {badge && (
        <View style={[styles.menuBadge, badgeBg ? { backgroundColor: badgeBg } : { backgroundColor: palette.primaryLight }]}>
          <Text
            style={[styles.menuBadgeText, badgeColor ? { color: badgeColor } : { color: palette.link }]}
          >
            {badge}
          </Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={15} color={palette.textMuted} />
    </TouchableOpacity>
  );
}

function HubSectionHeader({
  title,
  icon,
  iconColor,
}: {
  title: string;
  icon?: IoniconsName;
  iconColor?: string;
}) {
  const { palette } = useAppTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      {icon && (
        <Ionicons
          name={icon}
          size={15}
          color={iconColor || palette.link}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={[styles.sectionHeader, { color: palette.eyebrow }]}>{title}</Text>
    </View>
  );
}

type HubMenuItemConfig = Omit<MenuItemProps, 'isLast'> & { key: string; visible?: boolean };

function HubMenuSection({
  title,
  icon,
  iconColor,
  items,
  sectionStyle,
}: {
  title: string;
  icon?: IoniconsName;
  iconColor?: string;
  items: HubMenuItemConfig[];
  sectionStyle: any;
}) {
  const { palette } = useAppTheme();
  const visibleItems = items.filter((item) => item.visible !== false);
  if (visibleItems.length === 0) return null;

  return (
    <>
      <HubSectionHeader title={title} icon={icon} iconColor={iconColor} />
      <View style={[sectionStyle, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
        {visibleItems.map(({ key, visible: _visible, ...itemProps }, idx) => (
          <MenuItem key={key} {...itemProps} isLast={idx === visibleItems.length - 1} />
        ))}
      </View>
    </>
  );
}

export default function ProfileScreen() {
  const { user: authUser, logout, isLoading: isAuthLoading, loadUser, hasModule } = useAuth();
  const { communityName: tenantCommunityName } = useTenantContext();
  const { palette, isDark, toggleTheme } = useAppTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const { hasPerm, isAdmin, isSuperAdmin, hasMultiplePortals, availablePortals, switchToRole } = {
    ...usePermissions(),
    ...useRoleSwitcher(),
  };

  // Module-gated data: don't fetch (or show) activity for modules the
  // community has disabled.
  const modEvents   = hasModule('EVENTS');
  const modMarket   = hasModule('MARKETPLACE');
  const modSports   = hasModule('SPORTS');
  const modFinance  = hasModule('FINANCE_MGMT');
  const modHelpdesk = hasModule('HELPDESK');

  // ── Database Queries ──────────────────────────────────────────────
  // 1. Fresh Profile from /api/users/me
  const { data: dbProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.getProfile(),
    staleTime: 30_000,
  });

  const resolvedCommunityId = dbProfile?.communityId ?? authUser?.communityId;
  const knownCommunityName =
    dbProfile?.communityName ||
    authUser?.communityName ||
    tenantCommunityName ||
    (typeof (dbProfile as any)?.community === 'object' ? (dbProfile as any)?.community?.name : null) ||
    (typeof (authUser as any)?.community === 'object' ? (authUser as any)?.community?.name : null);

  const { data: communityDetails } = useQuery({
    queryKey: ['community-details', resolvedCommunityId],
    queryFn: () => authService.getCommunityDetails(Number(resolvedCommunityId)).catch(() => null),
    enabled: Boolean(!knownCommunityName && resolvedCommunityId),
    staleTime: 5 * 60_000,
  });

  // 2. My Events from /api/events/mine
  const { data: myEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: () => eventService.getMyEvents(),
    staleTime: 30_000,
    enabled: modEvents,
  });

  // 3. My Marketplace Listings from /api/marketplace/listings/mine
  const { data: myListingsPage, refetch: refetchListings } = useQuery({
    queryKey: ['marketplace', 'mine'],
    queryFn: () => marketplaceService.getMyListings(),
    staleTime: 30_000,
    enabled: modMarket,
  });

  // 4. My Sports Teams from /api/sports/teams/my
  const { data: myTeams = [], refetch: refetchTeams } = useQuery({
    queryKey: ['sports', 'my-teams'],
    queryFn: () => sportsService.getMyTeams(),
    staleTime: 30_000,
    enabled: modSports,
  });

  // 5. Maintenance Pending Bills from /api/finance/maintenance/bills/pending
  const { data: pendingBills = [], refetch: refetchBills } = useQuery({
    queryKey: ['finance', 'pending-bills'],
    queryFn: () => maintenanceDuesService.getPendingBills(),
    staleTime: 60_000,
    enabled: modFinance,
  });

  // 6. My Open Tickets from /api/helpdesk/tickets
  const { data: openTickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ['helpdesk', 'my-open'],
    queryFn: () => smartHelpdeskService.getTickets('OPEN'),
    staleTime: 60_000,
    enabled: modHelpdesk,
  });

  // 7. Unread Notifications Count
  const { data: unreadNotifsCount = 0, refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    staleTime: 30_000,
  });

  // Merge live DB profile with Zustand auth user
  const user = dbProfile || authUser;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchProfile(),
      modEvents && refetchEvents(),
      modMarket && refetchListings(),
      modSports && refetchTeams(),
      modFinance && refetchBills(),
      modHelpdesk && refetchTickets(),
      refetchNotifs(),
      loadUser(),
    ]);
    setRefreshing(false);
  }, [
    refetchProfile,
    refetchEvents,
    refetchListings,
    refetchTeams,
    refetchBills,
    refetchTickets,
    refetchNotifs,
    loadUser,
    modEvents,
    modMarket,
    modSports,
    modFinance,
    modHelpdesk,
  ]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from Mana Community?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleSharePass = async () => {
    try {
      const unitText = [tower, flatNumber].filter(Boolean).join(' - ') || 'Unit not assigned';
      const statusText = user?.status === 'ACTIVE' ? 'Verified Active' : (user?.status || 'Active');
      await Share.share({
        title: `${communityName} Pass`,
        message: `🛡️ *${communityName} Resident Pass*\nName: ${displayName}\nUnit: ${unitText}\nSociety: ${communityName}\nStatus: ${statusText}`,
      });
    } catch {
      // Ignored
    }
  };

  const [photoError, setPhotoError] = useState(false);

  if (isAuthLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const {
    showEmergency, showFinance, showHelpdesk, showGroupBuying, showTrips,
    showDiscover, showVisitors, showFeedItems, showAmenities, showHealth,
    showWellness, showHomeServices, showParking, showFood, showSmartHome,
    showNotices, showGovernance, showProcurement, showKittyCircles, showCommute,
    showPets, showOffers, showAcademy, showCpos, showJobs, showAiAssistant,
    showHousehold, showSports, showPolls, showMarketplace,
    showPersonalFinance, showFixedDeposits, showDigitalGold, showMutualFunds, showLoans,
    showSplitBill, showScanPay, showSendMoney, showUpiHistory, showPayments,
    showMovies, showVehicleCare, showCalendar, showHealthGuard,
  } = useMemo(() => {
    const p = (perm: string) => hasPerm(perm);
    const m = (mod: string) => hasModule(mod);
    const adm = isAdmin;
    const _showPersonalFinance = (p(VIEW_PERSONAL_FINANCE) || p('Manage Personal Finance')) && m('PERSONAL_FINANCE');
    const _showScanPay   = p(VIEW_SCAN_PAY) && m('PAYMENTS');
    const _showSendMoney = p(VIEW_SEND_MONEY) && m('PAYMENTS');
    const _showUpiHistory = p(VIEW_UPI_HISTORY) && m('PAYMENTS');
    return {
      showEmergency:      p(VIEW_EMERGENCY) && m('EMERGENCY'),
      showFinance:        p(VIEW_MAINTENANCE_DUES) && m('FINANCE_MGMT'),
      showHelpdesk:       p(VIEW_TICKETS) && m('HELPDESK'),
      showGroupBuying:    p(VIEW_GROUP_BUYING) && m('GROUP_BUYING'),
      showTrips:          p(VIEW_TRIPS) && m('TRIPS'),
      showDiscover:       p(VIEW_DISCOVER) && m('DISCOVER'),
      showVisitors:       (adm || p(VIEW_VISITORS)) && m('VISITORS'),
      showFeedItems:      (adm || p(VIEW_FEED)) && m('COMMUNITY_FEED'),
      showAmenities:      p(VIEW_AMENITIES) && m('FACILITIES'),
      showHealth:         (adm || p(VIEW_HEALTH_GUARD)) && m('HEALTH'),
      showWellness:       (adm || p(VIEW_HEALTH_GUARD)) && m('WELLNESS'),
      showHomeServices:   (adm || p(VIEW_HOME_SERVICE)) && m('SERVICE_PLATFORM'),
      showParking:        (adm || p(VIEW_VISITORS) || p(VIEW_AMENITIES)) && m('PARKING'),
      showFood:           (adm || p(VIEW_FOOD_MENU)) && m('FOOD_OS'),
      showSmartHome:      (adm || p(VIEW_AMENITIES)) && m('SMART_HOME'),
      showNotices:        p(VIEW_NOTICES) && m('NOTICES'),
      showGovernance:     (adm || p(VIEW_NOTICES) || p(VIEW_POLLS)) && m('GOVERNANCE'),
      showProcurement:    (adm || p(VIEW_HOME_SERVICE) || p(VIEW_MARKETPLACE)) && m('MAINTENANCE'),
      showKittyCircles:   (adm || p(VIEW_EVENTS) || p(VIEW_FEED)) && (m('EVENTS') || m('COMMUNITY_FEED')),
      showCommute:        (adm || p(VIEW_TRIPS) || p(VIEW_FEED)) && m('COMMUTE'),
      showPets:           (adm || p(VIEW_FEED)) && m('PETS'),
      showOffers:         (adm || p(VIEW_MARKETPLACE)) && m('COMMERCE'),
      showAcademy:        (adm || p(VIEW_FEED)) && m('ACADEMY'),
      showCpos:           (adm || p(VIEW_MARKETPLACE) || p(VIEW_AMENITIES)) && m('CPOS'),
      showJobs:           p(VIEW_JOBS) && m('JOBS'),
      showAiAssistant:    (adm || p(VIEW_FEED) || p(VIEW_VISITORS)) && m('AI_CONCIERGE'),
      showHousehold:      adm || p(VIEW_VISITORS) || p(VIEW_FEED),
      showSports:         p(VIEW_SPORTS_MENU) && m('SPORTS'),
      showPolls:          p(VIEW_POLLS) && m('POLLS'),
      showMarketplace:    p(VIEW_MARKETPLACE) && m('MARKETPLACE'),
      showPersonalFinance: _showPersonalFinance,
      showFixedDeposits:  (p(VIEW_FIXED_DEPOSITS) || _showPersonalFinance) && m('PERSONAL_FINANCE'),
      showDigitalGold:    (p(VIEW_DIGITAL_GOLD) || _showPersonalFinance) && m('PERSONAL_FINANCE'),
      showMutualFunds:    (p(VIEW_MUTUAL_FUNDS) || _showPersonalFinance) && m('PERSONAL_FINANCE'),
      showLoans:          (p(VIEW_LOANS) || _showPersonalFinance) && m('PERSONAL_FINANCE'),
      showSplitBill:      p(VIEW_SPLIT_BILL) && m('PAYMENTS'),
      showScanPay:        _showScanPay,
      showSendMoney:      _showSendMoney,
      showUpiHistory:     _showUpiHistory,
      showPayments:       (adm || _showScanPay || _showSendMoney || _showUpiHistory) && m('PAYMENTS'),
      showMovies:         p(VIEW_MOVIES) && m('ENTERTAINMENT'),
      showVehicleCare:    p(VIEW_VEHICLE_CARE) && m('VISITORS'),
      showCalendar:       p(VIEW_CALENDAR) && m('CALENDAR'),
      showHealthGuard:    p(VIEW_HEALTH_GUARD) && m('SAFETY'),
    };
  }, [isAdmin, hasPerm, hasModule]);

  const flatNumber = user.flatNumber || user.flatNo;
  const tower = user.tower || user.block;
  const hasCommunity = Boolean(resolvedCommunityId);
  const communityName =
    hasCommunity
      ? knownCommunityName ||
        communityDetails?.name ||
        communityDetails?.communityName ||
        'My Community'
      : 'Mana Standalone';
  const profilePhoto = resolveUserAvatar(user);
  const displayName =
    user.fullName || user.name || authUser?.fullName || authUser?.name || (user.email ? user.email.split('@')[0] : 'Member');
  const hasPhoto = !photoError && !!profilePhoto;
  const primaryRoleLabel = (user.role || 'RESIDENT').replace(/_/g, ' ').toUpperCase();
  const verifiedBadgeLabel =
    !hasCommunity
      ? 'STANDALONE ACCOUNT'
      : (user.status === 'ACTIVE' ? `VERIFIED ${primaryRoleLabel}` : 'PENDING VERIFICATION');

  const totalEventsCount = myEvents.length;
  const totalListingsCount =
    myListingsPage?.totalElements ?? myListingsPage?.content?.length ?? 0;
  const totalTeamsCount = myTeams.length;
  const totalTicketsCount = openTickets.length;

  // Total pending dues sum
  const pendingDuesTotal = pendingBills.reduce(
    (sum: number, b: any) => sum + (b.totalAmount || 0),
    0
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.dockBg }]} edges={['top']}>
      {/* ── Top Bar (Flush top dock, structured bottom curve matching Footer) ── */}
      <View style={[styles.topBar, { backgroundColor: palette.dockBg, borderColor: palette.dockBorder }]}>
        <View style={styles.topBarLeft}>
          <Text style={[styles.topBarTitle, { color: palette.text }]}>My Profile</Text>
          <Text style={[styles.topBarSubtitle, { color: palette.textSecondary }]} numberOfLines={1}>
            {communityName}
          </Text>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={[styles.topBarIconBtn, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
            onPress={toggleTheme}
            activeOpacity={0.75}
            accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={19} color={palette.link} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topBarIconBtn, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={20} color={palette.text} />
            {unreadNotifsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.topBarIconBtn, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
            onPress={() => router.push('/settings')}
            activeOpacity={0.75}
          >
            <Ionicons name="settings-outline" size={20} color={palette.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.bodyWrap, { backgroundColor: palette.appBg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.link}
            colors={[palette.link]}
          />
        }
      >
        {/* ── Executive Resident Identity Card ─────────────────────── */}
        <View style={styles.heroCardWrap}>
          <LinearGradient
            colors={isDark ? ['#1E1B4B', '#312E81', '#4338CA'] : ['#00174B', '#004AC6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Background geometric ambient glow */}
            <View style={styles.heroGlowCircle1} />
            <View style={styles.heroGlowCircle2} />

            {/* Profile Avatar & Quick Badges */}
            <View style={styles.heroHeaderRow}>
              <TouchableOpacity
                style={styles.avatarContainer}
                activeOpacity={0.85}
                onPress={() => setShowPhotoModal(true)}
              >
                {hasPhoto ? (
                  <Image
                    source={{ uri: profilePhoto }}
                    style={styles.avatarImage}
                    onError={() => setPhotoError(true)}
                  />
                ) : (
                  <LinearGradient
                    colors={['#6366F1', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarFallback}
                  >
                    <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
                  </LinearGradient>
                )}

                {/* Online verification dot */}
                <View style={styles.avatarOnlineDot} />
              </TouchableOpacity>

              <View style={styles.heroInfoWrap}>
                <View style={styles.verifiedRow}>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>

                <View style={styles.residentBadgeRow}>
                  <View style={styles.verifiedPill}>
                    <Ionicons name="shield-checkmark" size={11} color="#34D399" />
                    <Text style={styles.verifiedPillText}>{verifiedBadgeLabel}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      user.status === 'ACTIVE'
                        ? styles.statusPillActive
                        : styles.statusPillInactive,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        user.status === 'ACTIVE' ? styles.dotGreen : styles.dotAmber,
                      ]}
                    />
                    <Text style={styles.statusPillText}>{user.status || 'ACTIVE'}</Text>
                  </View>
                </View>

                <Text style={styles.heroEmail} numberOfLines={1}>
                  {user.email}
                </Text>
              </View>
            </View>

            {/* Unit Details & Tags Pill Row */}
            <View style={styles.unitPillsRow}>
              {!hasCommunity && (
                <View style={styles.unitPill}>
                  <Ionicons name="compass-outline" size={12} color="#A5B4FC" />
                  <Text style={styles.unitPillText}>Standalone Account</Text>
                </View>
              )}

              {hasCommunity && tower && flatNumber && (
                <View style={styles.unitPill}>
                  <Ionicons name="home" size={12} color="#A5B4FC" />
                  <Text style={styles.unitPillText}>
                    {tower} • Flat {flatNumber}
                  </Text>
                </View>
              )}

              {user.residentType && (
                <View style={styles.unitPill}>
                  <Ionicons name="person" size={12} color="#A5B4FC" />
                  <Text style={styles.unitPillText}>{user.residentType}</Text>
                </View>
              )}

              {user.profession && (
                <View style={styles.unitPill}>
                  <Ionicons name="briefcase-outline" size={12} color="#A5B4FC" />
                  <Text style={styles.unitPillText}>{user.profession}</Text>
                </View>
              )}
            </View>

            {/* Quick Hero Actions */}
            <View style={styles.heroActionsRow}>
              {!hasCommunity ? (
                <TouchableOpacity
                  style={styles.heroPassBtn}
                  onPress={() => setJoinModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.heroPassBtnText}>Join Community</Text>
                </TouchableOpacity>
              ) : showVisitors ? (
                <TouchableOpacity
                  style={styles.heroPassBtn}
                  onPress={() => setPassModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="qr-code-outline" size={16} color="#fff" />
                  <Text style={styles.heroPassBtnText}>Resident Pass</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.heroEditBtn}
                onPress={() => router.push('/profile/edit')}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={15} color="#1E1B4B" />
                <Text style={styles.heroEditBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* ── Standalone Join Community Action Card ────────────────── */}
        {!hasCommunity && (
          <View style={styles.joinCommCardWrap}>
            <View
              style={[
                styles.joinCommCard,
                { backgroundColor: palette.surface, borderColor: palette.primaryBorder },
              ]}
            >
              <View style={styles.joinCommRow}>
                <View style={[styles.joinCommIconWrap, { backgroundColor: palette.primaryLight }]}>
                  <Ionicons name="business" size={24} color={palette.link} />
                </View>
                <View style={styles.joinCommInfo}>
                  <Text style={[styles.joinCommTitle, { color: palette.text }]}>Join Your Community</Text>
                  <Text style={[styles.joinCommSub, { color: palette.textMuted }]}>
                    Have an invite code from your housing society or apartment? Link your flat now to access security gate passes, visitor approvals, society billing & amenities.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.joinCommBtnWrap}
                onPress={() => setJoinModalVisible(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={palette.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.joinCommBtn}
                >
                  <Ionicons name="key-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.joinCommBtnText}>Enter Invite Code</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Pending Dues Quick Alert Banner (Conditional) ───────── */}
        {showFinance && pendingDuesTotal > 0 && (
          <View style={styles.duesCardWrap}>
            <TouchableOpacity
              style={styles.duesCard}
              onPress={() => router.push('/finance')}
              activeOpacity={0.85}
            >
              <View style={styles.duesIconWrap}>
                <Ionicons name="receipt-outline" size={20} color="#D97706" />
              </View>

              <View style={styles.duesTextWrap}>
                <Text style={styles.duesTitle}>Pending Maintenance Dues</Text>
                <Text style={styles.duesAmount}>
                  ₹{pendingDuesTotal.toLocaleString()} unpaid balance
                </Text>
              </View>

              <View style={styles.duesPayBtn}>
                <Text style={styles.duesPayBtnText}>Pay Now</Text>
                <Ionicons name="arrow-forward" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Community Activity KPI Grid ─────────────────────────── */}
        {(modEvents || modMarket || modSports || modHelpdesk) && (
        <View style={styles.kpiSection}>
          <Text style={[styles.kpiHeading, { color: palette.eyebrow }]}>Community Activity</Text>
          <View style={styles.kpiRow}>
            {/* Events */}
            {modEvents && (
            <TouchableOpacity
              style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
              onPress={() => router.push('/tabs/events')}
              activeOpacity={0.75}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar-outline" size={16} color="#D97706" />
              </View>
              <Text style={[styles.kpiNumber, { color: palette.text }]}>{totalEventsCount}</Text>
              <Text style={[styles.kpiLabel, { color: palette.textMuted }]}>Events</Text>
            </TouchableOpacity>
            )}

            {/* Marketplace */}
            {modMarket && (
            <TouchableOpacity
              style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
              onPress={() => router.push('/tabs/marketplace')}
              activeOpacity={0.75}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: palette.primaryLight }]}>
                <Ionicons name="storefront-outline" size={16} color={palette.link} />
              </View>
              <Text style={[styles.kpiNumber, { color: palette.text }]}>{totalListingsCount}</Text>
              <Text style={[styles.kpiLabel, { color: palette.textMuted }]}>Listings</Text>
            </TouchableOpacity>
            )}

            {/* Sports Teams */}
            {modSports && (
            <TouchableOpacity
              style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
              onPress={() => router.push('/sports/my-teams')}
              activeOpacity={0.75}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="trophy-outline" size={16} color="#059669" />
              </View>
              <Text style={[styles.kpiNumber, { color: palette.text }]}>{totalTeamsCount}</Text>
              <Text style={[styles.kpiLabel, { color: palette.textMuted }]}>Teams</Text>
            </TouchableOpacity>
            )}

            {/* Helpdesk */}
            {modHelpdesk && (
            <TouchableOpacity
              style={[styles.kpiCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
              onPress={() => router.push('/helpdesk')}
              activeOpacity={0.75}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: '#FFE4E6' }]}>
                <Ionicons name="headset-outline" size={16} color="#E11D48" />
              </View>
              <Text style={[styles.kpiNumber, { color: palette.text }]}>{totalTicketsCount}</Text>
              <Text style={[styles.kpiLabel, { color: palette.textMuted }]}>Tickets</Text>
            </TouchableOpacity>
            )}
          </View>
        </View>
        )}

        {/* ── Role Portal Cards ─────────────────── */}
        {hasMultiplePortals && availablePortals.length > 1 && (
          <View style={styles.adminCardWrap}>
            {availablePortals.map((portal) => (
              <TouchableOpacity
                key={portal.role}
                style={[styles.adminCard, { marginBottom: 8 }]}
                onPress={() => switchToRole(portal.role)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#0F172A', '#1E293B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.adminGradient}
                >
                  <View style={styles.adminIconBox}>
                    <Ionicons name={portal.icon as IoniconsName} size={20} color="#FDE047" />
                  </View>
                  <View style={styles.adminInfo}>
                    <View style={styles.adminBadgeRow}>
                      <Text style={styles.adminTitle}>{portal.label}</Text>
                      <View style={styles.adminTag}>
                        <Text style={styles.adminTagText}>{portal.role.replace('_', ' ')}</Text>
                      </View>
                    </View>
                    <Text style={styles.adminSub}>
                      Switch to {portal.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!hasMultiplePortals && isAdmin && (isSuperAdmin || hasPerm(VIEW_ADMIN)) && (
          <View style={styles.adminCardWrap}>
            <TouchableOpacity
              style={styles.adminCard}
              onPress={() => router.push('/admin')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0F172A', '#1E293B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.adminGradient}
              >
                <View style={styles.adminIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#FDE047" />
                </View>
                <View style={styles.adminInfo}>
                  <View style={styles.adminBadgeRow}>
                    <Text style={styles.adminTitle}>Society Admin Console</Text>
                    <View style={styles.adminTag}>
                      <Text style={styles.adminTagText}>ADMIN</Text>
                    </View>
                  </View>
                  <Text style={styles.adminSub}>
                    Manage residents, notices, approvals & society finances
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Section 1: Community Living & Amenities ─────────────── */}
        <HubMenuSection
          title="Community Living & Amenities"
          icon="business-outline"
          iconColor="#4F46E5"
          sectionStyle={styles.menuSection}
          items={[
            { key: 'visitors', visible: showVisitors, icon: 'shield-checkmark-outline', label: 'Gate & Visitors', sublabel: 'Manage guest passes & delivery entry', onPress: () => router.push('/visitors'), iconColor: '#0891B2', iconBg: '#CFFAFE' },
            { key: 'entry-log', visible: showVisitors, icon: 'document-text-outline', label: 'Entry / Exit Log', sublabel: 'View all gate entry and exit records', onPress: () => router.push('/profile/entry-log'), iconColor: '#059669', iconBg: '#D1FAE5' },
            { key: 'directory', visible: showFeedItems, icon: 'people-circle-outline', label: 'Resident Directory', sublabel: 'Browse flat-wise residents in your society', onPress: () => router.push('/community/directory'), iconColor: '#6366F1', iconBg: '#EEF2FF' },
            { key: 'calendar', visible: showCalendar, icon: 'calendar-outline', label: 'Master Calendar', sublabel: 'Poojas, sports, events, maintenance & dues', onPress: () => router.push('/calendar'), iconColor: '#4F46E5', iconBg: '#EEF2FF', badge: 'NEW', badgeBg: '#EEF2FF', badgeColor: '#4F46E5' },
            { key: 'facilities', visible: showAmenities, icon: 'fitness-outline', label: 'Facility Bookings', sublabel: 'Clubhouse, tennis, gym & pool slots', onPress: () => router.push('/facilities'), iconColor: '#0D9488', iconBg: '#CCFBF1' },
            { key: 'health', visible: showHealth, icon: 'medkit-outline', label: 'Mana Health', sublabel: 'Doctors, appointments, records & emergency', onPress: () => router.push('/health'), iconColor: '#0D9488', iconBg: '#CCFBF1' },
            { key: 'wellness', visible: showWellness, icon: 'nutrition-outline', label: 'Health Buddy', sublabel: 'AI nutrition, meal tracking & wellness challenges', onPress: () => router.push('/wellness'), iconColor: '#10B981', iconBg: '#D1FAE5', badge: 'NEW', badgeBg: '#D1FAE5', badgeColor: '#059669' },
            { key: 'services', visible: showHomeServices, icon: 'construct-outline', label: 'Home Services & Techs', sublabel: 'Electrician, plumber, AC repair & maids', onPress: () => router.push('/services'), iconColor: '#DB2777', iconBg: '#FCE7F3' },
            { key: 'parking', visible: showParking, icon: 'car-outline', label: 'Parking Management', sublabel: 'Bay allocation & guest vehicle permits', onPress: () => router.push('/parking'), iconColor: '#4338CA', iconBg: '#E0E7FF' },
            { key: 'vehicles', visible: showParking, icon: 'car-sport-outline', label: 'My Vehicles', sublabel: 'Register plates for resident gate access', onPress: () => router.push('/profile/vehicles'), iconColor: '#2563EB', iconBg: '#DBEAFE' },
            { key: 'vehicle-care', visible: showVehicleCare, icon: 'car-sport-outline', label: 'Vehicle Care & Wash', sublabel: 'Doorstep wash, detailing & monthly plans', onPress: () => router.push('/vehicle-care'), iconColor: '#2563EB', iconBg: '#EFF6FF', badge: 'WASH', badgeBg: '#DBEAFE', badgeColor: '#2563EB' },
            { key: 'trusted', visible: showVisitors, icon: 'people-circle-outline', label: 'Trusted Visitors', sublabel: 'Recurring maid, driver and family entry', onPress: () => router.push('/visitors/trusted'), iconColor: '#059669', iconBg: '#D1FAE5' },
            { key: 'packages', visible: showVisitors, icon: 'cube-outline', label: 'Package Room', sublabel: 'Delivery collection and OTPs', onPress: () => router.push('/packages'), iconColor: '#D97706', iconBg: '#FEF3C7' },
            { key: 'intercom', visible: showVisitors, icon: 'videocam-outline', label: 'Resident Intercom', sublabel: 'Call the gate guard before entry', onPress: () => router.push('/intercom'), iconColor: '#4F46E5', iconBg: '#E0E7FF' },
            { key: 'helpdesk', visible: showHelpdesk, icon: 'headset-outline', label: 'Smart Helpdesk', sublabel: 'Society maintenance complaints & support', onPress: () => router.push('/helpdesk'), iconColor: '#D97706', iconBg: '#FEF3C7', badge: totalTicketsCount > 0 ? `${totalTicketsCount} Open` : undefined, badgeBg: '#FEF3C7', badgeColor: '#D97706' },
            { key: 'food', visible: showFood, icon: 'restaurant-outline', label: 'Community Kitchen', sublabel: 'Home chefs, catering & daily meal orders', onPress: () => router.push('/food'), iconColor: '#E11D48', iconBg: '#FFE4E6' },
            { key: 'automation', visible: showSmartHome, icon: 'hardware-chip-outline', label: 'Smart Home & IoT', sublabel: 'Automations, scenes & smart device schedules', onPress: () => router.push('/automation'), iconColor: '#7C3AED', iconBg: '#EDE9FE', badge: 'IoT', badgeBg: '#EDE9FE', badgeColor: '#7C3AED' },
          ]}
        />

        {/* ── Section 2: Finance & Society Governance ─────────────── */}
        <HubMenuSection
          title="Finance & Governance"
          icon="card-outline"
          iconColor="#059669"
          sectionStyle={styles.menuSection}
          items={[
            { key: 'finance', visible: showFinance, icon: 'card-outline', label: 'Maintenance & Bills', sublabel: 'Monthly dues, ledger & instant online pay', onPress: () => router.push('/finance'), iconColor: '#4F46E5', iconBg: '#EEF2FF', badge: pendingDuesTotal > 0 ? `₹${pendingDuesTotal}` : undefined, badgeBg: pendingDuesTotal > 0 ? '#FEE2E2' : '#DCFCE7', badgeColor: pendingDuesTotal > 0 ? '#DC2626' : '#059669' },
            { key: 'bbps', visible: showPayments, icon: 'flash-outline', label: 'Mana Pay (BBPS Bills)', sublabel: 'Electricity, water, gas & broadband payments', onPress: () => router.push('/bbps'), iconColor: '#2563EB', iconBg: '#EFF6FF', badge: 'BBPS', badgeBg: '#EDE9FE', badgeColor: '#4F46E5' },
            { key: 'recharge', visible: showPayments, icon: 'phone-portrait-outline', label: 'Mobile Recharge', sublabel: 'Jio, Airtel, Vi & BSNL instant plans', onPress: () => router.push('/recharge'), iconColor: '#0284C7', iconBg: '#F0F9FF', badge: 'NEW', badgeBg: '#DCFCE7', badgeColor: '#059669' },
            { key: 'personal-finance', visible: showPersonalFinance, icon: 'wallet-outline', label: 'My Finance (Personal)', sublabel: 'Track income, expenses, budgets & savings', onPress: () => router.push('/personal-finance'), iconColor: '#10B981', iconBg: '#D1FAE5', badge: 'NEW', badgeBg: '#D1FAE5', badgeColor: '#059669' },
            { key: 'fd', visible: showFixedDeposits, icon: 'business-outline', label: 'Fixed Deposits & Wealth', sublabel: 'Compare bank & NBFC rates', onPress: () => router.push('/fd'), iconColor: '#1D4ED8', iconBg: '#EFF6FF' },
            { key: 'gold', visible: showDigitalGold, icon: 'sparkles-outline', label: 'Digital Gold & Vault', sublabel: 'Live 24K gold rates, buy & sell instantly', onPress: () => router.push('/gold'), iconColor: '#D97706', iconBg: '#FFFBEB', badge: '24K', badgeBg: '#FEF3C7', badgeColor: '#D97706' },
            { key: 'mutual-funds', visible: showMutualFunds, icon: 'trending-up-outline', label: 'Mutual Funds & SIPs', sublabel: 'ELSS tax saving, index & equity funds', onPress: () => router.push('/mutual-funds'), iconColor: '#16A34A', iconBg: '#F0FDF4', badge: 'SIP', badgeBg: '#DCFCE7', badgeColor: '#16A34A' },
            { key: 'loans', visible: showLoans, icon: 'cash-outline', label: 'Personal Loans', sublabel: 'Check loan offers & EMI calculator', onPress: () => router.push('/loans'), iconColor: '#DC2626', iconBg: '#FEF2F2' },
            { key: 'split-bill', visible: showSplitBill, icon: 'pie-chart-outline', label: 'Mana Split (Group Bills)', sublabel: 'Split shared flat & event expenses with neighbors', onPress: () => router.push('/split-bill'), iconColor: '#7C3AED', iconBg: '#F5F3FF', badge: 'NEW', badgeBg: '#EDE9FE', badgeColor: '#7C3AED' },
            { key: 'notices', visible: showNotices, icon: 'newspaper-outline', label: 'Notices & Circulars', sublabel: 'Official RWA announcements & guidelines', onPress: () => router.push('/notices'), iconColor: '#0284C7', iconBg: '#E0F2FE' },
            { key: 'governance', visible: showGovernance, icon: 'business-outline', label: 'Society Governance & AGM', sublabel: 'Committee meetings, agenda & resolutions', onPress: () => router.push('/governance'), iconColor: '#7C3AED', iconBg: '#EDE9FE' },
            { key: 'polls', visible: showPolls, icon: 'bar-chart-outline', label: 'Polls & Voting', sublabel: 'Participate in community decisions', onPress: () => router.push('/polls'), iconColor: '#9333EA', iconBg: '#F3E8FF' },
          ]}
        />

        {/* ── Section 3: Commerce & Community Social ──────────────── */}
        <HubMenuSection
          title="Commerce & Social"
          icon="people-outline"
          iconColor="#DB2777"
          sectionStyle={styles.menuSection}
          items={[
            { key: 'marketplace', visible: showMarketplace, icon: 'storefront-outline', label: 'Resident Marketplace', sublabel: 'Buy & sell verified pre-owned items', onPress: () => router.push('/tabs/marketplace'), iconColor: '#059669', iconBg: '#D1FAE5', badge: totalListingsCount > 0 ? `${totalListingsCount} Active` : undefined },
            { key: 'group-buying', visible: showGroupBuying, icon: 'bag-handle-outline', label: 'Group Buying', sublabel: 'Wholesale bulk deals & discounts', onPress: () => router.push('/group-buying'), iconColor: '#059669', iconBg: '#ECFDF5' },
            { key: 'procurement', visible: showProcurement, icon: 'business-outline', label: 'Procurement Hub', sublabel: 'RFQs, supplier quotes & purchase orders', onPress: () => router.push('/procurement' as any), iconColor: '#2563EB', iconBg: '#EFF6FF' },
            { key: 'trips', visible: showTrips, icon: 'compass-outline', label: 'Community Trips & Treks', sublabel: 'Weekend getaways with fellow residents', onPress: () => router.push('/trips'), iconColor: '#0D9488', iconBg: '#CCFBF1' },
            { key: 'kitty', visible: showKittyCircles, icon: 'sparkles-outline', label: 'Kitty & Social Circles', sublabel: 'Monthly pools, meetups, Housie & party vendors', onPress: () => router.push('/kitty-party/kittyPartyIndex' as any), iconColor: '#BE185D', iconBg: '#FCE7F3', badge: 'NEW', badgeBg: '#FCE7F3', badgeColor: '#BE185D' },
            { key: 'sports', visible: showSports, icon: 'trophy-outline', label: 'Sports Leagues & Teams', sublabel: 'Cricket, badminton & football clubs', onPress: () => router.push('/sports'), iconColor: '#059669', iconBg: '#DCFCE7', badge: totalTeamsCount > 0 ? `${totalTeamsCount} Teams` : undefined },
            { key: 'mobility', visible: showCommute, icon: 'navigate-circle-outline', label: 'Mobility Hub', sublabel: 'Carpool, group rides & on-demand', onPress: () => router.push('/mobility' as any), iconColor: '#2563EB', iconBg: '#DBEAFE' },
            { key: 'commute', visible: showCommute, icon: 'car-sport-outline', label: 'Commute Carpool', sublabel: 'Rideshare with neighbors', onPress: () => router.push('/commute'), iconColor: '#0284C7', iconBg: '#CFFAFE' },
            { key: 'pets', visible: showPets, icon: 'paw-outline', label: 'Pet Corner', sublabel: 'Society pet directory & playdates', onPress: () => router.push('/pets'), iconColor: '#9333EA', iconBg: '#F3E8FF' },
            { key: 'auctions', visible: showMarketplace, icon: 'pricetag-outline', label: 'Live Auctions', sublabel: 'Bid on verified household goods', onPress: () => router.push('/auction'), iconColor: '#D97706', iconBg: '#FEF3C7' },
            { key: 'movies', visible: showMovies, icon: 'film-outline', label: 'Community Movie Night', sublabel: 'Weekend theater screenings & seat reservations', onPress: () => router.push('/movies'), iconColor: '#E11D48', iconBg: '#FFE4E6', badge: 'CINEMA', badgeBg: '#FFE4E6', badgeColor: '#E11D48' },
            { key: 'offers', visible: showOffers, icon: 'gift-outline', label: 'Offers & Deals', sublabel: 'Exclusive neighborhood partner perks', onPress: () => router.push('/offers'), iconColor: '#D97706', iconBg: '#FEF3C7', badge: 'NEW' },
            { key: 'academy', visible: showAcademy, icon: 'school-outline', label: 'Mana Academy', sublabel: 'Classes, workshops & tutoring', onPress: () => router.push('/academy'), iconColor: '#7C3AED', iconBg: '#F3E8FF', badge: 'NEW' },
            { key: 'cpos', visible: showCpos, icon: 'home-outline', label: 'Property OS (CPOS)', sublabel: 'Real estate & rental listings', onPress: () => router.push('/cpos'), iconColor: '#059669', iconBg: '#DCFCE7' },
            { key: 'discover', visible: showDiscover, icon: 'sparkles-outline', label: 'Community Discover', sublabel: 'Neighbor talent, sports buddies, and skills', onPress: () => router.push('/discover' as any), iconColor: '#7C3AED', iconBg: '#EDE9FE', badge: 'AI MATCH', badgeBg: '#EDE9FE', badgeColor: '#7C3AED' },
            { key: 'cpn', visible: showJobs, icon: 'briefcase-outline', label: 'Pro Network (CPN)', sublabel: 'Resident business directory', onPress: () => router.push('/cpn'), iconColor: '#2563EB', iconBg: '#EFF6FF' },
            { key: 'jobs', visible: showJobs, icon: 'megaphone-outline', label: 'Community Job Board', sublabel: 'Local society hiring, gigs & tutoring', onPress: () => router.push('/jobs'), iconColor: '#7C3AED', iconBg: '#F3E8FF', badge: 'NEW', badgeBg: '#F3E8FF', badgeColor: '#7C3AED' },
          ]}
        />

        {/* ── Section 4: Account & Security ───────────────────────── */}
        <HubMenuSection
          title="Account & Security"
          icon="lock-closed-outline"
          iconColor="#4B5563"
          sectionStyle={styles.menuSection}
          items={[
            { key: 'emergency', visible: showEmergency, icon: 'alert-circle', label: 'Emergency SOS', sublabel: 'Instant security alert & on-call contacts', onPress: () => router.push('/emergency'), iconColor: '#DC2626', iconBg: '#FEE2E2', badge: '24x7', badgeBg: '#FEE2E2', badgeColor: '#DC2626' },
            { key: 'ai-chat', visible: showAiAssistant, icon: 'sparkles-outline', label: 'Mana AI Assistant', sublabel: 'Society bylaws, amenities & instant answers', onPress: () => router.push('/ai-chat'), iconColor: '#6366F1', iconBg: '#EEF2FF', badge: 'AI', badgeBg: '#EEF2FF', badgeColor: '#6366F1' },
            { key: 'notifications', icon: 'notifications-outline', label: 'Notification Preferences', sublabel: 'Push alerts, SMS & WhatsApp delivery', onPress: () => router.push('/settings/notifications'), iconColor: '#4F46E5', iconBg: '#EEF2FF', badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined },
            { key: 'household', visible: showHousehold, icon: 'home-outline', label: 'My Household', sublabel: 'Flat, family members and vehicles in one place', onPress: () => router.push('/household'), iconColor: '#0D9488', iconBg: '#CCFBF1' },
            { key: 'family', visible: showHousehold, icon: 'people-outline', label: 'Family Members', sublabel: 'Register family so security knows who can enter', onPress: () => router.push('/profile/family'), iconColor: '#7C3AED', iconBg: '#F5F3FF' },
            { key: 'vehicles-anpr', visible: showVisitors, icon: 'car-outline', label: 'ANPR Vehicle Passes', sublabel: 'Register vehicles for ANPR auto gate entry', onPress: () => router.push('/vehicles'), iconColor: '#2563EB', iconBg: '#DBEAFE' },
            { key: 'kyc', icon: 'finger-print-outline', label: 'KYC Verification', sublabel: 'Submit Aadhaar / PAN for identity verification', onPress: () => router.push('/profile/kyc'), iconColor: '#059669', iconBg: '#D1FAE5' },
            { key: 'reputation', visible: showHousehold, icon: 'ribbon-outline', label: 'Reputation & Identity', sublabel: 'Community score, badges and moving token', onPress: () => router.push('/profile/reputation'), iconColor: '#6366F1', iconBg: '#EEF2FF' },
            { key: 'privacy', icon: 'shield-checkmark-outline', label: 'Privacy & GDPR Settings', sublabel: 'Directory visibility, data export & erasure', onPress: () => router.push('/settings/privacy'), iconColor: '#059669', iconBg: '#D1FAE5' },
            { key: 'security', icon: 'finger-print-outline', label: 'App Lock & Biometrics', sublabel: 'Fingerprint, Face ID, PIN & pattern protection', onPress: () => router.push('/settings/security' as any), iconColor: '#4F46E5', iconBg: '#EEF2FF' },
            { key: 'password', icon: 'lock-closed-outline', label: 'Change Password', sublabel: 'Update your login credentials', onPress: () => router.push('/settings/password'), iconColor: '#4B5563', iconBg: '#F3F4F6' },
            { key: 'community-info', icon: 'people-outline', label: 'My Community Info', sublabel: 'Society bylaws, contacts & office hours', onPress: () => router.push('/community'), iconColor: '#4B5563', iconBg: '#F3F4F6' },
            { key: 'activity', icon: 'time-outline', label: 'My Activity Log', sublabel: 'Recent logins, bookings & transactions', onPress: () => router.push('/activity'), iconColor: '#4B5563', iconBg: '#F3F4F6' },
            { key: 'appearance', icon: isDark ? 'sunny-outline' : 'moon-outline', label: 'App Theme Mode', sublabel: isDark ? 'Midnight Dark Theme active (tap for Light)' : 'Lavender Light & Cobalt Theme active (tap for Dark)', onPress: toggleTheme, iconColor: palette.link, iconBg: palette.primaryLight, badge: isDark ? 'DARK' : 'LIGHT', badgeBg: palette.primaryLight, badgeColor: palette.link },
            { key: 'settings', icon: 'settings-outline', label: 'General App Settings', sublabel: 'Language, theme & offline cache', onPress: () => router.push('/settings'), iconColor: '#4B5563', iconBg: '#F3F4F6' },
          ]}
        />

        {/* ── Sign Out ────────────────────────────────────────────── */}
        <View style={styles.signOutWrap}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text style={styles.signOutText}>Sign Out of Mana Community</Text>
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerAppTitle}>Mana Community Mobile</Text>
          <Text style={styles.footerVersion}>Version {CONFIG.VERSION}</Text>
          <Text style={styles.footerCopyright}>
            Connected to {communityName} • All rights reserved
          </Text>
        </View>
      </ScrollView>
      </View>

      {/* ── Digital Resident Pass Modal ──────────────────────────── */}
      <Modal visible={passModalVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.passCardContainer}>
            {/* Pass Header */}
            <LinearGradient
              colors={['#1E1B4B', '#312E81', '#4338CA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.passHeaderGradient}
            >
              <View style={styles.passTopRow}>
                <View style={styles.passLogoWrap}>
                  <Ionicons name="shield-checkmark" size={18} color="#FDE047" />
                  <Text style={styles.passLogoText}>{communityName.toUpperCase()}</Text>
                </View>
                <TouchableOpacity
                  style={styles.passCloseBtn}
                  onPress={() => setPassModalVisible(false)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.passSubtitle}>OFFICIAL DIGITAL RESIDENT PASS</Text>

              {/* Resident Identity in Pass */}
              <View style={styles.passProfileRow}>
                <View style={styles.passAvatarWrap}>
                  {hasPhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.passAvatarImage} />
                  ) : (
                    <View style={styles.passAvatarFallback}>
                      <Text style={styles.passAvatarInitials}>
                        {getInitials(displayName)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.passProfileInfo}>
                  <Text style={styles.passName}>{displayName}</Text>
                  <Text style={styles.passUnit}>
                    {[tower, flatNumber ? `Flat ${flatNumber}` : null].filter(Boolean).join(' • ') || 'Unit not assigned'}
                  </Text>
                  <View style={styles.passRoleTag}>
                    <Text style={styles.passRoleText}>
                      {user.residentType || primaryRoleLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Pass QR Barcode Section */}
            <View style={styles.passBarcodeSection}>
              <View style={styles.qrBox}>
                <Ionicons name="qr-code" size={140} color="#1E1B4B" />
              </View>

              <Text style={styles.passBarcodeInstruction}>
                Scan at Security Gate for Priority Entry
              </Text>

              <View style={styles.passMetaDetails}>
                <View style={styles.passMetaItem}>
                  <Text style={styles.passMetaLabel}>MEMBER ID</Text>
                  <Text style={styles.passMetaVal}>
                    {user.id ? `MANA-${String(user.id).padStart(4, '0')}` : 'PENDING'}
                  </Text>
                </View>
                <View style={styles.passMetaDivider} />
                <View style={styles.passMetaItem}>
                  <Text style={styles.passMetaLabel}>VALIDITY</Text>
                  <Text style={styles.passMetaVal}>
                    {`${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`}
                  </Text>
                </View>
                <View style={styles.passMetaDivider} />
                <View style={styles.passMetaItem}>
                  <Text style={styles.passMetaLabel}>STATUS</Text>
                  <Text style={[styles.passMetaVal, { color: user.status === 'ACTIVE' ? '#059669' : '#D97706' }]}>
                    {user.status === 'ACTIVE' ? 'VERIFIED' : (user.status || 'PENDING')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pass Footer Actions */}
            <View style={styles.passActionsRow}>
              <TouchableOpacity
                style={styles.passShareBtn}
                onPress={handleSharePass}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
                <Text style={styles.passShareText}>Share Pass</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.passDoneBtn}
                onPress={() => setPassModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.passDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enlarged Profile Photo Modal */}
      <ProfileImageModal
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        imageUrl={hasPhoto ? profilePhoto : null}
        name={displayName}
        subtitle={[tower, flatNumber].filter(Boolean).join(' • ') || communityName}
      />

      {/* Join Community Modal */}
      <JoinCommunityModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onSuccess={() => {
          refetchProfile();
          onRefresh();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Standalone Join Community Action Card ────────────────────────
  joinCommCardWrap: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  joinCommCard: {
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    padding: 16,
    ...SHADOWS.sm,
  },
  joinCommRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  joinCommIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinCommInfo: {
    flex: 1,
  },
  joinCommTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '700',
    marginBottom: 4,
  },
  joinCommSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  joinCommBtnWrap: {
    marginTop: 4,
  },
  joinCommBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
  },
  joinCommBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bodyWrap: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    paddingTop: 10,
    paddingBottom: 108,
  },

  // ── Top Navigation Bar ──────────────────────────────────────────
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.sm,
  },
  topBarLeft: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 19,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: 11.5,
    color: THEME.textSecondary,
    marginTop: 1,
    fontFamily: FONTS.medium,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#F2F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Hero Card ───────────────────────────────────────────────────
  heroCardWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.md,
  },
  heroGlowCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    top: -60,
    right: -60,
  },
  heroGlowCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(238, 242, 255, 0.08)',
    bottom: -40,
    left: -40,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  avatarInitials: {
    fontSize: 26,
    fontFamily: FONTS.displayEB,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#312E81',
  },
  heroInfoWrap: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  residentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
  },
  verifiedPillText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  statusPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusPillInactive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: '#34D399',
  },
  dotAmber: {
    backgroundColor: '#FDE047',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroEmail: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 4,
  },
  unitPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  unitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  unitPillText: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    color: '#E0E7FF',
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroPassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroPassBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: 10,
    ...SHADOWS.sm,
  },
  heroEditBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#1E1B4B',
  },

  // ── Pending Dues Banner ─────────────────────────────────────────
  duesCardWrap: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  duesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
    gap: 12,
    ...SHADOWS.sm,
  },
  duesIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duesTextWrap: {
    flex: 1,
  },
  duesTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#92400E',
  },
  duesAmount: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 1,
  },
  duesPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D97706',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  duesPayBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── KPI Community Footprint Row ─────────────────────────────────
  kpiSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  kpiHeading: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiNumber: {
    fontSize: 18,
    fontFamily: FONTS.displayEB,
    fontWeight: '800',
    color: '#111827',
  },
  kpiLabel: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 1,
  },

  // ── VIP Admin Console Card ──────────────────────────────────────
  adminCardWrap: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  adminCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  adminGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  adminIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(253, 224, 71, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(253, 224, 71, 0.3)',
  },
  adminInfo: {
    flex: 1,
  },
  adminBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  adminTag: {
    backgroundColor: '#FDE047',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminTagText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    color: '#0F172A',
  },
  adminSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },

  // ── Themed Menu Hubs ────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 8,
    paddingHorizontal: 18,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabelWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    color: '#111827',
  },
  menuSublabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  dangerText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  menuBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
  },
  menuBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 0.2,
  },

  // ── Sign Out Button ─────────────────────────────────────────────
  signOutWrap: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.xl,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    ...SHADOWS.sm,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#DC2626',
  },

  // ── Footer ──────────────────────────────────────────────────────
  footerWrap: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
    gap: 3,
  },
  footerAppTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  footerVersion: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  footerCopyright: {
    fontSize: 10,
    color: '#D1D5DB',
  },

  // ── Digital Resident Pass Modal ─────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  passCardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  passHeaderGradient: {
    padding: 20,
    paddingBottom: 22,
  },
  passTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passLogoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  passLogoText: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  passCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passSubtitle: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    color: '#A5B4FC',
    letterSpacing: 1.2,
    marginTop: 8,
  },
  passProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  passAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  passAvatarImage: {
    width: '100%',
    height: '100%',
  },
  passAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passAvatarInitials: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  passProfileInfo: {
    flex: 1,
  },
  passName: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  passUnit: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 2,
  },
  passRoleTag: {
    backgroundColor: 'rgba(52, 211, 153, 0.25)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  passRoleText: {
    fontSize: 8,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  passBarcodeSection: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  qrBox: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passBarcodeInstruction: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  passMetaDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 16,
    width: '100%',
  },
  passMetaItem: {
    flex: 1,
    alignItems: 'center',
  },
  passMetaLabel: {
    fontSize: 8,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  passMetaVal: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  passMetaDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  passActionsRow: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  passShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  passShareText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.primary,
  },
  passDoneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  passDoneText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
