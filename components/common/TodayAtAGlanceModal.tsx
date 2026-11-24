import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/hooks/useAuth';

export interface GlanceItem {
  id: string;
  category: 'alerts' | 'security' | 'sports' | 'events' | 'services';
  categoryLabel: string;
  label: string;
  description: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: string;
  isPass?: boolean;
  badge?: string;
  badgeColor?: string;
  pulse?: boolean;
  urgent?: boolean;
  module?: string;
}

export interface TodayAtAGlanceModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenPass?: () => void;
  data: {
    eventsCount?: number;
    eventsTodayCount?: number;
    sportsCount?: string | number;
    sportsSummary?: { liveCount: number; todayCount: number; tourneyCount: number } | null;
    pollsCount?: number;
    ticketsCount?: number;
    duesCount?: string | number;
    duesOverdueTotal?: number;
    facilitiesCount?: string | number;
    noticesCount?: string | number;
  };
}

type CategoryTab = 'all' | 'alerts' | 'security' | 'sports' | 'events' | 'services';

const TABS: { id: CategoryTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'All Updates', icon: 'apps-outline' },
  { id: 'alerts', label: 'Alerts & Live', icon: 'flash-outline' },
  { id: 'security', label: 'Gate & Pass', icon: 'shield-checkmark-outline' },
  { id: 'sports', label: 'Sports & Games', icon: 'trophy-outline' },
  { id: 'events', label: 'Events & Life', icon: 'sparkles-outline' },
  { id: 'services', label: 'Dues & Services', icon: 'construct-outline' },
];

export function TodayAtAGlanceModal({
  visible,
  onClose,
  onOpenPass,
  data,
}: TodayAtAGlanceModalProps) {
  const router = useRouter();
  const { hasModule, isSuperAdmin } = useAuth();
  const { palette, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    eventsCount = 0,
    eventsTodayCount = 0,
    sportsCount = 'Active',
    sportsSummary,
    pollsCount = 0,
    ticketsCount = 0,
    duesCount,
    duesOverdueTotal = 0,
    facilitiesCount = 'Available',
    noticesCount = 'New',
  } = data;

  // ── Build comprehensive list of all glance items ───────────────────────────
  const allGlanceItems = useMemo<GlanceItem[]>(() => {
    const items: GlanceItem[] = [];

    const isAllowed = (mod?: string) => isSuperAdmin || !mod || hasModule(mod);

    // 1. Gate & Security (VISITORS)
    if (isAllowed('VISITORS')) {
      items.push({
        id: 'pass_qr',
        category: 'security',
        categoryLabel: 'Security',
        label: 'Digital Resident Pass',
        description: 'Instant QR code for quick scan at security gate',
        value: 'Instant QR',
        icon: 'qr-code-outline',
        color: '#2563EB',
        isPass: true,
        badge: 'GATE',
        badgeColor: '#2563EB',
        module: 'VISITORS',
      });
      items.push({
        id: 'pass_guest',
        category: 'security',
        categoryLabel: 'Security',
        label: 'Pre-Approve Guest',
        description: 'Generate gate entry pass for upcoming visitors',
        value: 'Pass +',
        icon: 'person-add-outline',
        color: '#3B82F6',
        route: '/visitors?action=preapprove&type=GUEST',
        module: 'VISITORS',
      });
      items.push({
        id: 'pass_delivery',
        category: 'security',
        categoryLabel: 'Security',
        label: 'Delivery & Cab Entry',
        description: 'Authorize courier, Swiggy, Zomato, or cab driver',
        value: 'Pre-clear',
        icon: 'car-outline',
        color: '#0284C7',
        route: '/visitors?action=preapprove&type=DELIVERY',
        module: 'VISITORS',
      });
    }

    // 2. Sports & Matches (SPORTS)
    if (isAllowed('SPORTS')) {
      const liveMatches = sportsSummary?.liveCount ?? 0;
      const todayMatches = sportsSummary?.todayCount ?? 0;
      const tourneyMatches = sportsSummary?.tourneyCount ?? 0;

      if (liveMatches > 0) {
        items.push({
          id: 'sports_live',
          category: 'sports',
          categoryLabel: 'Sports',
          label: 'Live Matches Underway',
          description: 'Ball-by-ball scoring & tournament action happening now',
          value: `${liveMatches} Live`,
          icon: 'flame-outline',
          color: '#EF4444',
          route: '/sports/matches',
          badge: 'LIVE',
          badgeColor: '#EF4444',
          pulse: true,
          urgent: true,
          module: 'SPORTS',
        });
      }

      if (todayMatches > 0) {
        items.push({
          id: 'sports_today',
          category: 'sports',
          categoryLabel: 'Sports',
          label: "Today's Scheduled Games",
          description: 'Upcoming society sports fixtures for today',
          value: `${todayMatches} Today`,
          icon: 'football-outline',
          color: '#F59E0B',
          route: '/sports/matches',
          badge: 'TODAY',
          badgeColor: '#F59E0B',
          module: 'SPORTS',
        });
      }

      if (tourneyMatches > 0) {
        items.push({
          id: 'sports_tourneys',
          category: 'sports',
          categoryLabel: 'Sports',
          label: 'Active Tournaments',
          description: 'Community leagues, standings & bracket progress',
          value: `${tourneyMatches} Active`,
          icon: 'trophy-outline',
          color: '#D97706',
          route: '/sports/tournaments',
          module: 'SPORTS',
        });
      }

      items.push({
        id: 'sports_courts',
        category: 'sports',
        categoryLabel: 'Sports',
        label: 'Court & Pitch Booking',
        description: 'Reserve badminton, tennis, squash, or turf slots',
        value: 'Book Slot',
        icon: 'tennisball-outline',
        color: '#6366F1',
        route: '/sports/facility/my-bookings',
        module: 'SPORTS',
      });
    }

    // 3. Events & Celebrations (EVENTS)
    if (isAllowed('EVENTS')) {
      if (eventsTodayCount > 0) {
        items.push({
          id: 'events_today',
          category: 'events',
          categoryLabel: 'Events',
          label: "Today's Community Events",
          description: 'Society festivals, workshops, or gatherings today',
          value: `${eventsTodayCount} Today`,
          icon: 'sparkles-outline',
          color: '#8B5CF6',
          route: '/events',
          badge: 'TODAY',
          badgeColor: '#8B5CF6',
          urgent: true,
          module: 'EVENTS',
        });
      }

      items.push({
        id: 'events_upcoming',
        category: 'events',
        categoryLabel: 'Events',
        label: 'Upcoming Society Events',
        description: 'Browse upcoming celebrations, cultural & kids events',
        value: eventsCount > 0 ? `${eventsCount} Events` : 'Explore',
        icon: 'calendar-outline',
        color: '#4F46E5',
        route: '/events',
        module: 'EVENTS',
      });

      items.push({
        id: 'events_calendar',
        category: 'events',
        categoryLabel: 'Events',
        label: 'Event Calendar & Schedule',
        description: 'Full monthly community calendar view',
        value: 'Schedule',
        icon: 'calendar-number-outline',
        color: '#0284C7',
        route: '/events',
        module: 'EVENTS',
      });
    }

    // 4. Society Dues & Payments (FINANCE_MGMT)
    if (isAllowed('FINANCE_MGMT')) {
      const hasOverdue = duesOverdueTotal > 0;
      items.push({
        id: 'dues_status',
        category: 'services',
        categoryLabel: 'Finance',
        label: hasOverdue ? 'Overdue Maintenance Dues' : 'Society Maintenance Dues',
        description: hasOverdue
          ? 'Pending invoice requires immediate clearance'
          : 'All society maintenance and utility bills are up to date',
        value: hasOverdue ? `₹${duesOverdueTotal.toLocaleString('en-IN')}` : (duesCount ?? 'Paid ✓'),
        icon: hasOverdue ? 'alert-circle-outline' : 'card-outline',
        color: hasOverdue ? '#DC2626' : '#059669',
        route: '/tabs/pay',
        badge: hasOverdue ? 'DUE' : 'PAID',
        badgeColor: hasOverdue ? '#DC2626' : '#059669',
        urgent: hasOverdue,
        module: 'FINANCE_MGMT',
      });

      items.push({
        id: 'dues_history',
        category: 'services',
        categoryLabel: 'Finance',
        label: 'Payment Receipts & Ledgers',
        description: 'Download past receipts and monthly billing breakdown',
        value: 'Receipts',
        icon: 'receipt-outline',
        color: '#0D9488',
        route: '/finance',
        module: 'FINANCE_MGMT',
      });
    }

    // 5. Helpdesk & Complaints (HELPDESK)
    if (isAllowed('HELPDESK')) {
      const hasTickets = ticketsCount > 0;
      items.push({
        id: 'tickets_status',
        category: 'services',
        categoryLabel: 'Helpdesk',
        label: hasTickets ? 'Active Service Tickets' : 'Helpdesk & Maintenance',
        description: hasTickets
          ? `${ticketsCount} unresolved maintenance or complaint request(s)`
          : 'No open tickets. Need electrical, plumbing, or carpentery help?',
        value: hasTickets ? `${ticketsCount} Open` : 'Resolved ✓',
        icon: hasTickets ? 'headset-outline' : 'shield-checkmark-outline',
        color: '#0891B2',
        route: '/helpdesk',
        badge: hasTickets ? 'OPEN' : undefined,
        badgeColor: '#0891B2',
        urgent: hasTickets,
        module: 'HELPDESK',
      });

      items.push({
        id: 'tickets_raise',
        category: 'services',
        categoryLabel: 'Helpdesk',
        label: 'Raise New Service Ticket',
        description: 'Submit an issue with photos directly to the management office',
        value: 'New +',
        icon: 'create-outline',
        color: '#06B6D4',
        route: '/helpdesk',
        module: 'HELPDESK',
      });
    }

    // 6. Democracy & Polls (POLLS)
    if (isAllowed('POLLS')) {
      const hasPolls = pollsCount > 0;
      items.push({
        id: 'polls_active',
        category: 'events',
        categoryLabel: 'Governance',
        label: 'Society Votes & Polls',
        description: hasPolls
          ? 'Active resolutions open for your resident vote'
          : 'View past community decisions and voting archives',
        value: hasPolls ? `${pollsCount} Open` : '0 Active',
        icon: 'bar-chart-outline',
        color: '#7C3AED',
        route: '/polls',
        badge: hasPolls ? 'VOTE' : undefined,
        badgeColor: '#7C3AED',
        urgent: hasPolls,
        module: 'POLLS',
      });
    }

    // 7. Amenities & Facilities (FACILITIES)
    if (isAllowed('FACILITIES')) {
      items.push({
        id: 'facilities_status',
        category: 'services',
        categoryLabel: 'Amenities',
        label: 'Clubhouse Amenities',
        description: 'Check operating timings & slots for gym, pool, party hall',
        value: facilitiesCount,
        icon: 'business-outline',
        color: '#6366F1',
        route: '/facilities',
        module: 'FACILITIES',
      });

      items.push({
        id: 'facilities_book',
        category: 'services',
        categoryLabel: 'Amenities',
        label: 'Reserve Clubhouse Facility',
        description: 'Book banquet hall, clubhouse room or BBQ area',
        value: 'Reserve',
        icon: 'add-circle-outline',
        color: '#4F46E5',
        route: '/tabs/bookings',
        module: 'FACILITIES',
      });
    }

    // 8. Notices & Circulars (NOTICES)
    if (isAllowed('NOTICES')) {
      items.push({
        id: 'notices_recent',
        category: 'events',
        categoryLabel: 'Notices',
        label: 'Society Circulars & Notices',
        description: 'Official announcements, AGM notices & RWA updates',
        value: noticesCount,
        icon: 'megaphone-outline',
        color: '#EA580C',
        route: '/notices',
        badge: 'NOTICE',
        badgeColor: '#EA580C',
        module: 'NOTICES',
      });
    }

    // 9. Marketplace & Group Buying (MARKETPLACE / GROUP_BUYING)
    if (isAllowed('MARKETPLACE') || isAllowed('GROUP_BUYING')) {
      items.push({
        id: 'marketplace_deals',
        category: 'services',
        categoryLabel: 'Marketplace',
        label: 'Resident Buy & Sell',
        description: 'Classifieds, second-hand items & neighbor offers',
        value: 'Explore',
        icon: 'pricetag-outline',
        color: '#059669',
        route: '/marketplace',
        module: 'MARKETPLACE',
      });
      items.push({
        id: 'jewellery_hub',
        category: 'services',
        categoryLabel: 'Jewellery',
        label: 'Jewellery Hub & Virtual Try-On',
        description: 'BIS Hallmarked gold, diamond & bridal collections with virtual try-on',
        value: 'Try On',
        icon: 'diamond-outline',
        color: '#B45309',
        route: '/jewellery',
        badge: 'TRY-ON',
        badgeColor: '#B45309',
        module: 'MARKETPLACE',
      });
    }

    // 10. Commute & Carpool (TRIPS)
    if (isAllowed('TRIPS')) {
      items.push({
        id: 'trips_carpool',
        category: 'services',
        categoryLabel: 'Commute',
        label: 'Community Carpool & Rides',
        description: 'Share rides to tech parks and schools with neighbors',
        value: 'Ride Pool',
        icon: 'car-outline',
        color: '#2563EB',
        route: '/trips',
        module: 'TRIPS',
      });
    }

    return items;
  }, [
    isSuperAdmin,
    hasModule,
    eventsCount,
    eventsTodayCount,
    sportsSummary,
    pollsCount,
    ticketsCount,
    duesCount,
    duesOverdueTotal,
    facilitiesCount,
    noticesCount,
  ]);

  // ── Filter by active tab & search query ─────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = allGlanceItems;

    if (activeTab === 'alerts') {
      result = result.filter(
        (i) => i.urgent || i.pulse || i.badge === 'LIVE' || i.badge === 'DUE' || i.badge === 'TODAY' || i.badge === 'OPEN' || i.badge === 'VOTE'
      );
    } else if (activeTab !== 'all') {
      result = result.filter((i) => i.category === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.categoryLabel.toLowerCase().includes(q) ||
          String(i.value).toLowerCase().includes(q)
      );
    }

    return result;
  }, [allGlanceItems, activeTab, searchQuery]);

  // ── Stats highlights for the live HUD ──────────────────────────────────────
  const liveCount = sportsSummary?.liveCount ?? 0;
  const overdueTotal = duesOverdueTotal ?? 0;

  const handleItemPress = (item: GlanceItem) => {
    onClose();
    if (item.isPass) {
      onOpenPass?.();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: palette.overlay }]}
        onPress={onClose}
      >
        <Pressable
          style={[styles.sheet, { backgroundColor: palette.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Top Drag Indicator */}
          <View style={styles.dragPillWrap}>
            <View style={[styles.dragPill, { backgroundColor: palette.border }]} />
          </View>

          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: palette.primaryLight }]}>
                <Ionicons name="sparkles" size={20} color={palette.link} />
              </View>
              <View>
                <View style={styles.headerTitleRow}>
                  <Text style={[styles.title, { color: palette.text }]}>Today at a Glance</Text>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live HUD</Text>
                  </View>
                </View>
                <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                  All activities, live alerts & community services
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: palette.surfaceSubtle }]}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={palette.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick HUD Highlights Ticker (if any alerts or active items) */}
          {(liveCount > 0 || overdueTotal > 0 || eventsTodayCount > 0 || ticketsCount > 0 || pollsCount > 0) && (
            <View style={[styles.hudBanner, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: palette.borderLight }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hudScroll}>
                {liveCount > 0 && (
                  <View style={[styles.hudChip, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                    <View style={styles.hudPulseRed} />
                    <Text style={[styles.hudChipText, { color: '#DC2626' }]}>
                      {liveCount} Match{liveCount > 1 ? 'es' : ''} Live
                    </Text>
                  </View>
                )}
                {overdueTotal > 0 && (
                  <View style={[styles.hudChip, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
                    <Ionicons name="alert-circle" size={13} color="#E11D48" />
                    <Text style={[styles.hudChipText, { color: '#BE123C' }]}>
                      ₹{overdueTotal.toLocaleString('en-IN')} Due
                    </Text>
                  </View>
                )}
                {eventsTodayCount > 0 && (
                  <View style={[styles.hudChip, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}>
                    <Ionicons name="sparkles" size={13} color="#7C3AED" />
                    <Text style={[styles.hudChipText, { color: '#6D28D9' }]}>
                      {eventsTodayCount} Event{eventsTodayCount > 1 ? 's' : ''} Today
                    </Text>
                  </View>
                )}
                {ticketsCount > 0 && (
                  <View style={[styles.hudChip, { backgroundColor: '#ECFEFF', borderColor: '#A5F3FC' }]}>
                    <Ionicons name="headset" size={13} color="#0891B2" />
                    <Text style={[styles.hudChipText, { color: '#0E7490' }]}>
                      {ticketsCount} Ticket{ticketsCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {pollsCount > 0 && (
                  <View style={[styles.hudChip, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                    <Ionicons name="bar-chart" size={13} color="#9333EA" />
                    <Text style={[styles.hudChipText, { color: '#7E22CE' }]}>
                      {pollsCount} Active Poll{pollsCount > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Search Box */}
          <View style={[styles.searchWrap, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}>
            <Ionicons name="search" size={17} color={palette.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search services, pass, matches, dues..."
              placeholderTextColor={palette.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={palette.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabChip,
                    {
                      backgroundColor: isActive ? palette.link : palette.surfaceSubtle,
                      borderColor: isActive ? palette.link : palette.borderLight,
                    },
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={tab.icon}
                    size={13}
                    color={isActive ? '#FFFFFF' : palette.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      { color: isActive ? '#FFFFFF' : palette.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Items List */}
          <ScrollView
            style={styles.itemsList}
            contentContainerStyle={styles.itemsListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={38} color={palette.textMuted} />
                <Text style={[styles.emptyTitle, { color: palette.text }]}>No items found</Text>
                <Text style={[styles.emptySub, { color: palette.textMuted }]}>
                  {searchQuery ? `No updates matching "${searchQuery}"` : 'No items available in this category'}
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: item.urgent ? '#FCA5A5' : palette.borderLight,
                    },
                    item.urgent && styles.itemCardUrgent,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.7}
                >
                  {/* Left: Icon Box */}
                  <View style={[styles.itemIconBox, { backgroundColor: item.color + '1A' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>

                  {/* Middle: Details */}
                  <View style={styles.itemContent}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemLabel, { color: palette.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      {item.badge && (
                        <View
                          style={[
                            styles.itemBadge,
                            { backgroundColor: item.badgeColor || item.color },
                          ]}
                        >
                          {item.pulse && <View style={styles.itemPulseDot} />}
                          <Text style={styles.itemBadgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.itemDesc, { color: palette.textMuted }]} numberOfLines={2}>
                      {item.description}
                    </Text>

                    <View style={styles.itemMetaRow}>
                      <View style={[styles.categoryTag, { backgroundColor: palette.surfaceSubtle }]}>
                        <Text style={[styles.categoryTagText, { color: palette.textMuted }]}>
                          {item.categoryLabel}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Right: Value & Action Arrow */}
                  <View style={styles.itemRight}>
                    <Text
                      style={[
                        styles.itemValue,
                        { color: item.urgent ? '#DC2626' : item.color },
                      ]}
                      numberOfLines={1}
                    >
                      {item.value}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Bottom Footer Note */}
          <View style={[styles.footer, { borderTopColor: palette.borderLight }]}>
            <Text style={[styles.footerText, { color: palette.textMuted }]}>
              Tap any item to jump straight into the service
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 18,
    maxHeight: '90%',
    ...SHADOWS.lg,
  } as any,
  dragPillWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragPill: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudBanner: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  hudScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  hudPulseRed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  hudChipText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    height: '100%',
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  itemsList: {
    maxHeight: 460,
  },
  itemsListContent: {
    paddingBottom: 16,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    ...SHADOWS.sm,
  } as any,
  itemCardUrgent: {
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    flex: 1,
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  itemPulseDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#FFFFFF',
  },
  itemBadgeText: {
    fontSize: 8,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  itemDesc: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    lineHeight: 16,
    marginBottom: 6,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryTagText: {
    fontSize: 9.5,
    fontFamily: FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  itemValue: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontFamily: FONTS.regular,
  },
});
