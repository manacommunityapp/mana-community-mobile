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
import { usePermissions } from '@/hooks/usePermissions';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { COLORS, SHADOWS, RADIUS, FONTS, GRADIENTS, getInitials } from '@/constants/config';
import { profileService } from '@/services/profileService';
import { eventService } from '@/services/eventService';
import { marketplaceService } from '@/services/marketplaceService';
import { sportsService } from '@/services/sportsService';
import { maintenanceDuesService } from '@/services/maintenanceDuesService';
import { smartHelpdeskService } from '@/services/smartHelpdeskService';
import { notificationService } from '@/services/notificationService';
import { ProfileImageModal } from '@/components/common/ProfileImageModal';
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
  return (
    <TouchableOpacity
      style={[styles.menuItem, isLast && styles.menuItemLast]}
      onPress={onPress}
      activeOpacity={0.65}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg || '#F3F4F6' }]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? COLORS.error : iconColor || COLORS.primary}
        />
      </View>

      <View style={styles.menuLabelWrap}>
        <Text style={[styles.menuLabel, danger && styles.dangerText]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel && (
          <Text style={styles.menuSublabel} numberOfLines={1}>
            {sublabel}
          </Text>
        )}
      </View>

      {badge && (
        <View style={[styles.menuBadge, badgeBg ? { backgroundColor: badgeBg } : undefined]}>
          <Text
            style={[styles.menuBadgeText, badgeColor ? { color: badgeColor } : undefined]}
          >
            {badge}
          </Text>
        </View>
      )}

      <Ionicons name="chevron-forward" size={15} color="#D1D5DB" />
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
  return (
    <View style={styles.sectionHeaderRow}>
      {icon && (
        <Ionicons
          name={icon}
          size={15}
          color={iconColor || COLORS.primary}
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={styles.sectionHeader}>{title}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user: authUser, logout, isLoading: isAuthLoading, loadUser } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // ── Database Queries ──────────────────────────────────────────────
  // 1. Fresh Profile from /api/users/me
  const { data: dbProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.getProfile(),
    staleTime: 30_000,
  });

  // 2. My Events from /api/events/mine
  const { data: myEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ['events', 'mine'],
    queryFn: () => eventService.getMyEvents(),
    staleTime: 30_000,
  });

  // 3. My Marketplace Listings from /api/marketplace/listings/mine
  const { data: myListingsPage, refetch: refetchListings } = useQuery({
    queryKey: ['marketplace', 'mine'],
    queryFn: () => marketplaceService.getMyListings(),
    staleTime: 30_000,
  });

  // 4. My Sports Teams from /api/sports/teams/my
  const { data: myTeams = [], refetch: refetchTeams } = useQuery({
    queryKey: ['sports', 'my-teams'],
    queryFn: () => sportsService.getMyTeams(),
    staleTime: 30_000,
  });

  // 5. Maintenance Pending Bills from /api/finance/maintenance/bills/pending
  const { data: pendingBills = [], refetch: refetchBills } = useQuery({
    queryKey: ['finance', 'pending-bills'],
    queryFn: () => maintenanceDuesService.getPendingBills(),
    staleTime: 60_000,
  });

  // 6. My Open Tickets from /api/helpdesk/tickets
  const { data: openTickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ['helpdesk', 'my-open'],
    queryFn: () => smartHelpdeskService.getTickets('OPEN'),
    staleTime: 60_000,
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
      refetchEvents(),
      refetchListings(),
      refetchTeams(),
      refetchBills(),
      refetchTickets(),
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
      await Share.share({
        title: 'Mana Community Resident Pass',
        message: `🛡️ *Mana Community Resident Pass*\nName: ${displayName}\nUnit: ${tower || 'Tower'} - ${flatNumber || 'Flat'}\nSociety: ${communityName || 'Mana Residency'}\nStatus: Verified Active Resident`,
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

  const { hasPerm, isAdmin, isSuperAdmin, hasMultiplePortals, availablePortals, switchToRole } = {
    ...usePermissions(),
    ...useRoleSwitcher(),
  };

  // Community service permissions
  const showEmergency = hasPerm(VIEW_EMERGENCY);
  const showFinance = hasPerm(VIEW_MAINTENANCE_DUES);
  const showHelpdesk = hasPerm(VIEW_TICKETS);
  const showGroupBuying = hasPerm(VIEW_GROUP_BUYING);
  const showTrips = hasPerm(VIEW_TRIPS);
  const showDiscover = hasPerm(VIEW_DISCOVER);

  // Explore items permissions
  const showSports = hasPerm(VIEW_SPORTS_MENU);
  const showPolls = hasPerm(VIEW_POLLS);
  const showMarketplace = hasPerm(VIEW_MARKETPLACE);

  const flatNumber = user.flatNumber || user.flatNo;
  const tower = user.tower || user.block;
  const communityName = user.communityName || 'Mana Residency';
  const profilePhoto = user.profilePicUrl || user.profilePhoto;
  const displayName =
    user.fullName || user.name || (user.email ? user.email.split('@')[0] : 'Resident');
  const hasPhoto =
    !photoError &&
    !!profilePhoto &&
    typeof profilePhoto === 'string' &&
    profilePhoto.trim().length > 0 &&
    !profilePhoto.includes('null') &&
    !profilePhoto.includes('undefined') &&
    (profilePhoto.startsWith('http') ||
      profilePhoto.startsWith('/') ||
      profilePhoto.startsWith('file://') ||
      profilePhoto.startsWith('data:'));

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarTitle}>My Profile</Text>
          <Text style={styles.topBarSubtitle}>
            {communityName} • ID #{user.id || '104'}
          </Text>
        </View>

        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.topBarIconBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
            {unreadNotifsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.topBarIconBtn}
            onPress={() => router.push('/settings')}
            activeOpacity={0.75}
          >
            <Ionicons name="settings-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Executive Resident Identity Card ─────────────────────── */}
        <View style={styles.heroCardWrap}>
          <LinearGradient
            colors={['#1E1B4B', '#312E81', '#4338CA']}
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
                    <Text style={styles.verifiedPillText}>VERIFIED RESIDENT</Text>
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
              {tower && flatNumber && (
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
              <TouchableOpacity
                style={styles.heroPassBtn}
                onPress={() => setPassModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="qr-code-outline" size={16} color="#fff" />
                <Text style={styles.heroPassBtnText}>Resident Pass</Text>
              </TouchableOpacity>

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

        {/* ── Pending Dues Quick Alert Banner (Conditional) ───────── */}
        {pendingDuesTotal > 0 && (
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
        <View style={styles.kpiSection}>
          <Text style={styles.kpiHeading}>Community Activity</Text>
          <View style={styles.kpiRow}>
            {/* Events */}
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => router.push('/tabs/events')}
              activeOpacity={0.75}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar-outline" size={16} color="#D97706" />
              </View>
              <Text style={styles.kpiNumber}>{totalEventsCount}</Text>
              <Text style={styles.kpiLabel}>Events</Text>
            </TouchableOpacity>

            {/* Marketplace */}
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => router.push('/tabs/marketplace')}
              activeOpacity={0.75}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="storefront-outline" size={16} color="#4F46E5" />
              </View>
              <Text style={styles.kpiNumber}>{totalListingsCount}</Text>
              <Text style={styles.kpiLabel}>Listings</Text>
            </TouchableOpacity>

            {/* Sports Teams */}
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => router.push('/sports/my-teams')}
              activeOpacity={0.75}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="trophy-outline" size={16} color="#059669" />
              </View>
              <Text style={styles.kpiNumber}>{totalTeamsCount}</Text>
              <Text style={styles.kpiLabel}>Teams</Text>
            </TouchableOpacity>

            {/* Helpdesk */}
            <TouchableOpacity
              style={styles.kpiCard}
              onPress={() => router.push('/helpdesk')}
              activeOpacity={0.75}
            >
              <View style={[styles.kpiIconWrap, { backgroundColor: '#FFE4E6' }]}>
                <Ionicons name="headset-outline" size={16} color="#E11D48" />
              </View>
              <Text style={styles.kpiNumber}>{totalTicketsCount}</Text>
              <Text style={styles.kpiLabel}>Tickets</Text>
            </TouchableOpacity>
          </View>
        </View>

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
        <HubSectionHeader
          title="Community Living & Amenities"
          icon="business-outline"
          iconColor="#4F46E5"
        />
        <View style={styles.menuSection}>
          <MenuItem
            icon="shield-checkmark-outline"
            label="Gate & Visitors"
            sublabel="Manage guest passes & delivery entry"
            onPress={() => router.push('/visitors')}
            iconColor="#0891B2"
            iconBg="#CFFAFE"
          />
          <MenuItem
            icon="fitness-outline"
            label="Facility Bookings"
            sublabel="Clubhouse, tennis, gym & pool slots"
            onPress={() => router.push('/facilities')}
            iconColor="#0D9488"
            iconBg="#CCFBF1"
          />
                    <MenuItem
            icon="medkit-outline"
            label="Mana Health"
            sublabel="Doctors, appointments, records & emergency"
            onPress={() => router.push('/health')}
            iconColor="#0D9488"
            iconBg="#CCFBF1"
            badge="NEW"
            badgeBg="#CCFBF1"
            badgeColor="#0F766E"
          />
          <MenuItem
            icon="construct-outline"
            label="Home Services & Techs"
            sublabel="Electrician, plumber, AC repair & maids"
            onPress={() => router.push('/services')}
            iconColor="#DB2777"
            iconBg="#FCE7F3"
          />
          <MenuItem
            icon="car-outline"
            label="Parking Management"
            sublabel="Bay allocation & guest vehicle permits"
            onPress={() => router.push('/parking')}
            iconColor="#4338CA"
            iconBg="#E0E7FF"
          />
          {showHelpdesk && (
            <MenuItem
              icon="headset-outline"
              label="Smart Helpdesk"
              sublabel="Society maintenance complaints & support"
              onPress={() => router.push('/helpdesk')}
              iconColor="#D97706"
              iconBg="#FEF3C7"
              badge={totalTicketsCount > 0 ? `${totalTicketsCount} Open` : undefined}
              badgeBg="#FEF3C7"
              badgeColor="#D97706"
            />
          )}
          <MenuItem
            icon="restaurant-outline"
            label="Community Kitchen"
            sublabel="Home chefs, catering & daily meal orders"
            onPress={() => router.push('/food')}
            iconColor="#E11D48"
            iconBg="#FFE4E6"
            isLast
          />
        </View>

        {/* ── Section 2: Finance & Society Governance ─────────────── */}
        <HubSectionHeader
          title="Finance & Governance"
          icon="card-outline"
          iconColor="#059669"
        />
        <View style={styles.menuSection}>
          {showFinance && (
            <MenuItem
              icon="card-outline"
              label="Maintenance & Bills"
              sublabel="Monthly dues, ledger & instant online pay"
              onPress={() => router.push('/finance')}
              iconColor="#4F46E5"
              iconBg="#EEF2FF"
              badge={pendingDuesTotal > 0 ? `₹${pendingDuesTotal}` : undefined}
              badgeBg={pendingDuesTotal > 0 ? '#FEE2E2' : '#DCFCE7'}
              badgeColor={pendingDuesTotal > 0 ? '#DC2626' : '#059669'}
            />
          )}
          <MenuItem
            icon="wallet-outline"
            label="My Finance (Personal)"
            sublabel="Track income, expenses, budgets & savings"
            onPress={() => router.push('/personal-finance')}
            iconColor="#10B981"
            iconBg="#D1FAE5"
            badge="NEW"
            badgeBg="#D1FAE5"
            badgeColor="#059669"
          />
          <MenuItem
            icon="newspaper-outline"
            label="Notices & Circulars"
            sublabel="Official RWA announcements & guidelines"
            onPress={() => router.push('/notices')}
            iconColor="#0284C7"
            iconBg="#E0F2FE"
            badge="ACTIVE"
            badgeBg="#E0F2FE"
            badgeColor="#0284C7"
          />
          <MenuItem
            icon="business-outline"
            label="Society Governance & AGM"
            sublabel="Committee meetings, agenda & resolutions"
            onPress={() => router.push('/governance')}
            iconColor="#7C3AED"
            iconBg="#EDE9FE"
          />
          {showPolls && (
            <MenuItem
              icon="bar-chart-outline"
              label="Polls & Voting"
              sublabel="Participate in community decisions"
              onPress={() => router.push('/polls')}
              iconColor="#9333EA"
              iconBg="#F3E8FF"
              isLast
            />
          )}
        </View>

        {/* ── Section 3: Commerce & Community Social ──────────────── */}
        <HubSectionHeader
          title="Commerce & Social"
          icon="people-outline"
          iconColor="#DB2777"
        />
        <View style={styles.menuSection}>
          {showMarketplace && (
            <MenuItem
              icon="storefront-outline"
              label="Resident Marketplace"
              sublabel="Buy & sell verified pre-owned items"
              onPress={() => router.push('/tabs/marketplace')}
              iconColor="#059669"
              iconBg="#D1FAE5"
              badge={totalListingsCount > 0 ? `${totalListingsCount} Active` : undefined}
            />
          )}
          {showGroupBuying && (
            <MenuItem
              icon="bag-handle-outline"
              label="Group Buying"
              sublabel="Wholesale bulk deals & discounts"
              onPress={() => router.push('/group-buying')}
              iconColor="#059669"
              iconBg="#ECFDF5"
            />
          )}
          {showTrips && (
            <MenuItem
              icon="compass-outline"
              label="Community Trips & Treks"
              sublabel="Weekend getaways with fellow residents"
              onPress={() => router.push('/trips')}
              iconColor="#0D9488"
              iconBg="#CCFBF1"
            />
          )}
          {showSports && (
            <MenuItem
              icon="trophy-outline"
              label="Sports Leagues & Teams"
              sublabel="Cricket, badminton & football clubs"
              onPress={() => router.push('/sports')}
              iconColor="#059669"
              iconBg="#DCFCE7"
              badge={totalTeamsCount > 0 ? `${totalTeamsCount} Teams` : undefined}
            />
          )}
          <MenuItem
            icon="car-sport-outline"
            label="Commute Carpool"
            sublabel="Rideshare with neighbors"
            onPress={() => router.push('/commute')}
            iconColor="#0284C7"
            iconBg="#CFFAFE"
          />
          <MenuItem
            icon="paw-outline"
            label="Pet Corner"
            sublabel="Society pet directory & playdates"
            onPress={() => router.push('/pets')}
            iconColor="#9333EA"
            iconBg="#F3E8FF"
          />
          <MenuItem
            icon="pricetag-outline"
            label="Live Auctions"
            sublabel="Bid on verified household goods"
            onPress={() => router.push('/auction')}
            iconColor="#D97706"
            iconBg="#FEF3C7"
          />
          <MenuItem
            icon="gift-outline"
            label="Offers & Deals"
            sublabel="Exclusive neighborhood partner perks"
            onPress={() => router.push('/offers')}
            iconColor="#D97706"
            iconBg="#FEF3C7"
            badge="NEW"
          />
          <MenuItem
            icon="school-outline"
            label="Mana Academy"
            sublabel="Classes, workshops & tutoring"
            onPress={() => router.push('/academy')}
            iconColor="#7C3AED"
            iconBg="#F3E8FF"
            badge="NEW"
          />
          <MenuItem
            icon="home-outline"
            label="Property OS (CPOS)"
            sublabel="Real estate & rental listings"
            onPress={() => router.push('/cpos')}
            iconColor="#059669"
            iconBg="#DCFCE7"
          />
          <MenuItem
            icon="briefcase-outline"
            label="Pro Network (CPN)"
            sublabel="Resident business directory"
            onPress={() => router.push('/cpn')}
            iconColor="#2563EB"
            iconBg="#EFF6FF"
            isLast
          />
        </View>

        {/* ── Section 4: Account & Security ───────────────────────── */}
        <HubSectionHeader
          title="Account & Security"
          icon="lock-closed-outline"
          iconColor="#4B5563"
        />
        <View style={styles.menuSection}>
          {showEmergency && (
            <MenuItem
              icon="alert-circle"
              label="Emergency SOS"
              sublabel="Instant security alert & on-call contacts"
              onPress={() => router.push('/emergency')}
              iconColor="#DC2626"
              iconBg="#FEE2E2"
              badge="24x7"
              badgeBg="#FEE2E2"
              badgeColor="#DC2626"
            />
          )}
          <MenuItem
            icon="sparkles-outline"
            label="Mana AI Assistant"
            sublabel="Society bylaws, amenities & instant answers"
            onPress={() => router.push('/ai-chat')}
            iconColor="#6366F1"
            iconBg="#EEF2FF"
            badge="AI"
            badgeBg="#EEF2FF"
            badgeColor="#6366F1"
          />
          <MenuItem
            icon="notifications-outline"
            label="Notification Preferences"
            sublabel="Push alerts, SMS & WhatsApp delivery"
            onPress={() => router.push('/settings/notifications')}
            iconColor="#4F46E5"
            iconBg="#EEF2FF"
            badge={unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Privacy & GDPR Settings"
            sublabel="Directory visibility, data export & erasure"
            onPress={() => router.push('/settings/privacy')}
            iconColor="#059669"
            iconBg="#D1FAE5"
          />
          <MenuItem
            icon="finger-print-outline"
            label="App Lock & Biometrics"
            sublabel="Fingerprint, Face ID, PIN & pattern protection"
            onPress={() => router.push('/settings/security' as any)}
            iconColor="#4F46E5"
            iconBg="#EEF2FF"
          />
          <MenuItem
            icon="lock-closed-outline"
            label="Change Password"
            sublabel="Update your login credentials"
            onPress={() => router.push('/settings/password')}
            iconColor="#4B5563"
            iconBg="#F3F4F6"
          />
          <MenuItem
            icon="people-outline"
            label="My Community Info"
            sublabel="Society bylaws, contacts & office hours"
            onPress={() => router.push('/community')}
            iconColor="#4B5563"
            iconBg="#F3F4F6"
          />
          <MenuItem
            icon="time-outline"
            label="My Activity Log"
            sublabel="Recent logins, bookings & transactions"
            onPress={() => router.push('/activity')}
            iconColor="#4B5563"
            iconBg="#F3F4F6"
          />
          <MenuItem
            icon="settings-outline"
            label="General App Settings"
            sublabel="Language, theme & offline cache"
            onPress={() => router.push('/settings')}
            iconColor="#4B5563"
            iconBg="#F3F4F6"
            isLast
          />
        </View>

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
          <Text style={styles.footerVersion}>Version 1.0.0 (Build 2026.09)</Text>
          <Text style={styles.footerCopyright}>
            Connected to {communityName} • All rights reserved
          </Text>
        </View>
      </ScrollView>

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
                  <Text style={styles.passLogoText}>MANA RESIDENCY</Text>
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
                    {tower || 'Tower A'} • Flat {flatNumber || '402'}
                  </Text>
                  <View style={styles.passRoleTag}>
                    <Text style={styles.passRoleText}>
                      {user.residentType || 'RESIDENT OWNER'}
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
                Scan at Security Gate 1 & 2 for Priority Entry
              </Text>

              <View style={styles.passMetaDetails}>
                <View style={styles.passMetaItem}>
                  <Text style={styles.passMetaLabel}>MEMBER ID</Text>
                  <Text style={styles.passMetaVal}>
                    MANA-{user.id ? String(user.id).padStart(4, '0') : '0104'}
                  </Text>
                </View>
                <View style={styles.passMetaDivider} />
                <View style={styles.passMetaItem}>
                  <Text style={styles.passMetaLabel}>VALIDITY</Text>
                  <Text style={styles.passMetaVal}>2026 - 2027</Text>
                </View>
                <View style={styles.passMetaDivider} />
                <View style={styles.passMetaItem}>
                  <Text style={styles.passMetaLabel}>STATUS</Text>
                  <Text style={[styles.passMetaVal, { color: '#059669' }]}>VERIFIED</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    paddingBottom: 40,
  },

  // ── Top Navigation Bar ──────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topBarLeft: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 20,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
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
