import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
  Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOWS, getInitials } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { useTenantContext } from '@/context/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { useRoleSwitcher } from '@/hooks/useRoleSwitcher';
import { feedService } from '@/services/feedService';
import { eventService } from '@/services/eventService';
import { facilityService } from '@/services/facilityService';
import { societyFinanceService } from '@/services/societyFinanceService';
import { visitorService } from '@/services/visitorService';
import { residentGateService } from '@/services/residentGateService';
import { paymentsService } from '@/services/paymentsService';
import { notificationService } from '@/services/notificationService';
import { insightsService } from '@/services/insightsService';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/authService';
import { smartHelpdeskService } from '@/services/smartHelpdeskService';
import { pollService } from '@/services/pollService';
import { adminService } from '@/services/adminService';
import { sportsService } from '@/services/sportsService';
import { noticeService } from '@/services/noticeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { EmergencySosModal } from '@/components/feed/EmergencySosModal';
import { LiveMatchesStrip } from '@/components/feed/LiveMatchesStrip';
import { JoinCommunityModal } from '@/components/community/JoinCommunityModal';
import { resolveImageUrl, resolveUserAvatar } from '@/utils/imageUrlUtils';
import type { PostDto, EventDto } from '@/types/api';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ─── Types ────────────────────────────────────────────────────────────────────

type HomeCat = 'Safety & Help' | 'Living & Bills' | 'Facilities' | 'Social & Sports' | 'Commerce & Food';

// ─── Action Grid Data ─────────────────────────────────────────────────────────

const HOME_CATS: HomeCat[] = ['Safety & Help', 'Living & Bills', 'Facilities', 'Social & Sports', 'Commerce & Food'];

type HomeAction = {
  id: string;
  icon: IoniconsName;
  label: string;
  color: string;
  cat: HomeCat;
  badge?: string;
  route?: string;
  module?: string;
  permission?: string;
  roles?: string[];
};

const HOME_ACTIONS: HomeAction[] = [
  // ── Safety & Help ─────────────────────────────────────────────────────────
  { id: 'pre_approve_guest', icon: 'person-add-outline',       label: 'Pre-Approve Guest', color: '#4F46E5', cat: 'Safety & Help',   route: '/visitors?action=preapprove&type=GUEST', module: 'VISITORS' },
  { id: 'emergency',         icon: 'alert-circle-outline',     label: 'SOS',               color: '#DC2626', cat: 'Safety & Help',   badge: '24x7', route: '/emergency', module: 'EMERGENCY' },
  { id: 'cab_entry',         icon: 'car-outline',              label: 'Cab Entry',         color: '#0284C7', cat: 'Safety & Help',   route: '/visitors?action=preapprove&type=CAB', module: 'VISITORS' },
  { id: 'delivery_pass',     icon: 'bag-handle-outline',       label: 'Delivery Pass',     color: '#D97706', cat: 'Safety & Help',   route: '/visitors?action=preapprove&type=DELIVERY', module: 'VISITORS' },
  { id: 'intercom',          icon: 'call-outline',             label: 'Intercom',          color: '#0D9488', cat: 'Safety & Help',   route: '/visitors/intercom', module: 'VISITORS' },
  { id: 'gate_pass',         icon: 'shield-checkmark-outline', label: 'Gate Pass',         color: '#0891B2', cat: 'Safety & Help',   route: '/visitors', module: 'VISITORS' },
  { id: 'turnstiles',        icon: 'qr-code-outline',          label: 'Smart Locks',       color: '#0284C7', cat: 'Safety & Help',   route: '/access/turnstiles', module: 'VISITORS' },
  { id: 'packages',          icon: 'cube-outline',             label: 'Package Room',      color: '#B45309', cat: 'Safety & Help',   route: '/visitors/packages', module: 'VISITORS' },
  { id: 'helpdesk',          icon: 'headset-outline',          label: 'Helpdesk',          color: '#D97706', cat: 'Safety & Help',   route: '/helpdesk', module: 'HELPDESK' },
  { id: 'insta_help',        icon: 'flash-outline',            label: 'Insta-Help',        color: '#D97706', cat: 'Safety & Help',   badge: '15m', route: '/services', module: 'SERVICE_PLATFORM' },
  { id: 'health',            icon: 'medkit-outline',           label: 'Health',            color: '#0D9488', cat: 'Safety & Help',   route: '/health', module: 'SAFETY' },
  { id: 'health_buddy',      icon: 'nutrition-outline',        label: 'Health Buddy',      color: '#10B981', cat: 'Safety & Help',   badge: 'NEW', route: '/wellness', module: 'SAFETY' },
  { id: 'ai_chat',           icon: 'sparkles-outline',         label: 'Mana AI',           color: '#6366F1', cat: 'Safety & Help',   badge: 'AI',  route: '/ai-chat', module: 'SAFETY' },

  // ── Living & Bills ────────────────────────────────────────────────────────
  { id: 'dues',              icon: 'card-outline',             label: 'Pay Maintenance',   color: '#4F46E5', cat: 'Living & Bills',  route: '/finance', module: 'FINANCE_MGMT' },
  { id: 'my_money',          icon: 'wallet-outline',           label: 'My Money',          color: '#059669', cat: 'Living & Bills',  badge: 'NEW', route: '/personal-finance', module: 'PERSONAL_FINANCE' },
  { id: 'society_erp',       icon: 'business-outline',         label: 'Society ERP',       color: '#4F46E5', cat: 'Living & Bills',  badge: 'ERP', route: '/finance/society-dashboard', module: 'FINANCE_MGMT', roles: ['SUPER_ADMIN', 'ADMIN', 'COMMUNITY_ADMIN', 'FINANCE_ADMIN'] },
  { id: 'budget',            icon: 'bar-chart-outline',        label: 'Budgeting',         color: '#EA580C', cat: 'Living & Bills',  route: '/finance/budget', module: 'FINANCE_MGMT' },
  { id: 'electricity',       icon: 'flash-outline',            label: 'Electricity',       color: '#F59E0B', cat: 'Living & Bills',  badge: 'BBPS', route: '/bbps', module: 'PAYMENTS' },
  { id: 'documents',         icon: 'document-text-outline',    label: 'Documents',         color: '#0284C7', cat: 'Living & Bills',  route: '/documents', module: 'DOCUMENTS' },
  { id: 'mana_pay',          icon: 'receipt-outline',          label: 'Mana Pay',          color: '#2563EB', cat: 'Living & Bills',  badge: 'BBPS', route: '/bbps', module: 'PAYMENTS' },
  { id: 'recharge',          icon: 'phone-portrait-outline',   label: 'Recharge',          color: '#0284C7', cat: 'Living & Bills',  badge: 'NEW', route: '/recharge', module: 'PAYMENTS' },
  { id: 'parking',           icon: 'car-outline',              label: 'Parking',           color: '#4338CA', cat: 'Living & Bills',  route: '/parking', module: 'VISITORS' },
  { id: 'home_services',     icon: 'construct-outline',        label: 'Home Services',     color: '#DB2777', cat: 'Living & Bills',  route: '/home-services', module: 'SERVICE_PLATFORM' },

  // ── Facilities ────────────────────────────────────────────────────────────
  { id: 'facilities',        icon: 'calendar-outline',         label: 'Book Amenity',      color: '#0284C7', cat: 'Facilities',      route: '/facilities', module: 'BOOKINGS' },
  { id: 'maintenance',       icon: 'build-outline',            label: 'Maintenance CPOS',  color: '#EA580C', cat: 'Facilities',      route: '/maintenance', module: 'MAINTENANCE' },
  { id: 'amc',               icon: 'construct-outline',        label: 'Assets & AMC',      color: '#16A34A', cat: 'Facilities',      badge: 'AMC', route: '/amc', module: 'AMC' },
  { id: 'submeters',         icon: 'speedometer-outline',      label: 'Sub-Meters',        color: '#059669', cat: 'Facilities',      route: '/iot/meters', module: 'IOT' },
  { id: 'projects',          icon: 'hammer-outline',           label: 'Projects',          color: '#7C3AED', cat: 'Facilities',      badge: 'NEW', route: '/projects', module: 'COMMUNITY_MGMT' },
  { id: 'property_os',       icon: 'home-outline',             label: 'Property OS',       color: '#059669', cat: 'Facilities',      badge: 'NEW', route: '/cpos', module: 'FACILITIES' },
  { id: 'inventory',         icon: 'cube-outline',             label: 'Inventory',         color: '#D97706', cat: 'Facilities',      badge: 'NEW', route: '/inventory', module: 'FACILITIES' },
  { id: 'automation',        icon: 'hardware-chip-outline',    label: 'Smart Home',        color: '#7C3AED', cat: 'Facilities',      badge: 'IoT', route: '/automation', module: 'FACILITIES' },
  { id: 'iot_hub',           icon: 'pulse-outline',            label: 'IoT Hub',           color: '#0D9488', cat: 'Facilities',      route: '/iot', module: 'IOT' },

  // ── Social & Sports ───────────────────────────────────────────────────────
  { id: 'sports',            icon: 'trophy-outline',           label: 'Sports Hub',        color: '#059669', cat: 'Social & Sports', route: '/sports', module: 'SPORTS' },
  { id: 'tournaments',       icon: 'medal-outline',            label: 'Tournaments',       color: '#D97706', cat: 'Social & Sports', route: '/sports/tournaments', module: 'SPORTS' },
  { id: 'commute',           icon: 'car-sport-outline',        label: 'Commute',           color: '#0284C7', cat: 'Social & Sports', route: '/commute', module: 'TRIPS' },
  { id: 'governance',        icon: 'business-outline',         label: 'Governance',        color: '#7C3AED', cat: 'Social & Sports', badge: 'NEW', route: '/governance', module: 'COMMUNITY_MGMT' },
  { id: 'academy',           icon: 'school-outline',           label: 'Academy',           color: '#9333EA', cat: 'Social & Sports', badge: 'NEW', route: '/academy', module: 'ACADEMY' },
  { id: 'daily_trips',       icon: 'navigate-outline',         label: 'Daily Trips',       color: '#0EA5E9', cat: 'Social & Sports', route: '/mobility/journeys', module: 'TRIPS' },
  { id: 'events',            icon: 'calendar-outline',         label: 'Events',            color: '#4F46E5', cat: 'Social & Sports', route: '/events', module: 'EVENTS' },
  { id: 'polls',             icon: 'bar-chart-outline',        label: 'Polls & Votes',     color: '#7C3AED', cat: 'Social & Sports', route: '/polls', module: 'POLLS' },
  { id: 'jobs',              icon: 'megaphone-outline',        label: 'Job Board',         color: '#7C3AED', cat: 'Social & Sports', badge: 'NEW', route: '/jobs', module: 'JOBS' },
  { id: 'pets',              icon: 'paw-outline',              label: 'Pet Care',          color: '#9333EA', cat: 'Social & Sports', route: '/pets', module: 'PETS' },

  // ── Commerce & Food ───────────────────────────────────────────────────────
  { id: 'bazaar',            icon: 'basket-outline',           label: 'Bazaar',            color: '#EC4899', cat: 'Commerce & Food', badge: 'NEW', route: '/bazaar', module: 'BAZAAR' },
  { id: 'marketplace',       icon: 'storefront-outline',       label: 'Marketplace',       color: '#059669', cat: 'Commerce & Food', route: '/marketplace', module: 'MARKETPLACE' },
  { id: 'food_os',           icon: 'restaurant-outline',       label: 'Food OS',           color: '#EA580C', cat: 'Commerce & Food', route: '/food', module: 'FOOD_OS' },
  { id: 'offers',            icon: 'pricetag-outline',         label: 'Flash Offers',      color: '#D97706', cat: 'Commerce & Food', badge: 'NEW', route: '/offers', module: 'MARKETPLACE' },
  { id: 'group_buying',      icon: 'bag-handle-outline',       label: 'Bulk Deals',        color: '#059669', cat: 'Commerce & Food', route: '/group-buying', module: 'GROUP_BUYING' },
  { id: 'fresh_produce',     icon: 'leaf-outline',             label: 'Fresh Produce',     color: '#16A34A', cat: 'Commerce & Food', route: '/fresh', module: 'MANA_FRESH' },
  { id: 'fresh_kitchen',     icon: 'flame-outline',            label: 'Fresh Kitchen',     color: '#DC2626', cat: 'Commerce & Food', route: '/fresh-kitchen', module: 'FOOD_OS' },
  { id: 'daily_basket',      icon: 'cart-outline',             label: 'Daily Basket',      color: '#0284C7', cat: 'Commerce & Food', route: '/daily-basket', module: 'FOOD_OS' },
  { id: 'lost_found',        icon: 'search-outline',           label: 'Lost & Found',      color: '#DC2626', cat: 'Commerce & Food', route: '/marketplace/lost-found', module: 'MARKETPLACE' },
];

// ─── KPI Chips Data ───────────────────────────────────────────────────────────

export type KpiItem = {
  id: string;
  label: string;
  icon: IoniconsName;
  color: string;
  route?: string;
  isPass?: boolean;
  module: string;
  defaultVal: string | number;
};

export const KPI_ITEMS: KpiItem[] = [
  // 1. Pass / Gate (VISITORS) - Instant QR pass modal trigger
  { id: 'pass',        label: 'Pass',       icon: 'qr-code-outline',        color: '#2563EB', isPass: true,       module: 'VISITORS',    defaultVal: 'QR' },
  // 2. Events (EVENTS) - Upcoming events
  { id: 'events',      label: 'Events',     icon: 'calendar-outline',       color: '#4F46E5', route: '/events',   module: 'EVENTS',      defaultVal: 0 },
  // 3. Sports (SPORTS) - Tournaments, live matches, games
  { id: 'sports',      label: 'Sports',     icon: 'trophy-outline',         color: '#D97706', route: '/sports',   module: 'SPORTS',      defaultVal: 'Active' },
  // 4. Dues / Billing (PAYMENTS / FINANCE_MGMT) - Overdue dues & invoices
  { id: 'dues',        label: 'Dues',       icon: 'card-outline',           color: '#059669', route: '/finance',  module: 'FINANCE_MGMT', defaultVal: 'Paid' },
  // 5. Polls & Voting (POLLS) - Active community polls
  { id: 'polls',       label: 'Polls',      icon: 'bar-chart-outline',      color: '#7C3AED', route: '/polls',    module: 'POLLS',       defaultVal: 0 },
  // 6. Helpdesk / Complaints (HELPDESK) - Open complaint tickets
  { id: 'tickets',     label: 'Tickets',    icon: 'headset-outline',        color: '#0891B2', route: '/helpdesk', module: 'HELPDESK',    defaultVal: 0 },
  // 7. Facilities / Amenities (FACILITIES / BOOKINGS) - Amenity bookings
  { id: 'facilities',  label: 'Facilities', icon: 'business-outline',       color: '#6366F1', route: '/facilities', module: 'FACILITIES', defaultVal: 'Book' },
  // 8. Notices / Announcements (NOTICES) - Broadcast announcements
  { id: 'notices',     label: 'Notices',    icon: 'megaphone-outline',      color: '#EA580C', route: '/notices',  module: 'NOTICES',     defaultVal: 'New' },
  // 9. Community Marketplace (MARKETPLACE) - Resident buy/sell deals
  { id: 'marketplace', label: 'Market',     icon: 'storefront-outline',     color: '#0D9488', route: '/marketplace', module: 'MARKETPLACE', defaultVal: 'Deals' },
  // 10. Group Buying (GROUP_BUYING) - Wholesale neighbor deals
  { id: 'group_buying',label: 'Group Buy',  icon: 'bag-handle-outline',     color: '#10B981', route: '/group-buying', module: 'GROUP_BUYING', defaultVal: 'Deals' },
  // 11. Trips & Commute (TRIPS) - Community rides & carpools
  { id: 'trips',       label: 'Trips',      icon: 'car-outline',            color: '#0284C7', route: '/trips',    module: 'TRIPS',       defaultVal: 'Pool' },
  // 12. Food OS (FOOD_OS) - Fresh kitchen & daily basket
  { id: 'food',        label: 'Food OS',    icon: 'restaurant-outline',     color: '#E11D48', route: '/food',     module: 'FOOD_OS',     defaultVal: 'Daily' },
];

// ─── Pre-approve buttons ──────────────────────────────────────────────────────

type PreApprove = { label: string; icon: IoniconsName; color: string; route: string };
const PRE_APPROVE: PreApprove[] = [
  { label: 'Guest',    icon: 'person-add-outline',  color: '#4F46E5', route: '/visitors?action=preapprove&type=GUEST' },
  { label: 'Delivery', icon: 'bag-handle-outline',  color: '#D97706', route: '/visitors?action=preapprove&type=DELIVERY' },
  { label: 'Cab',      icon: 'car-outline',          color: '#0284C7', route: '/visitors?action=preapprove&type=CAB' },
  { label: 'Service',  icon: 'construct-outline',   color: '#DB2777', route: '/visitors?action=preapprove&type=SERVICE' },
];

// ─── GateBlocks ───────────────────────────────────────────────────────────────

function toStamp(date: string | undefined, time?: string): string | undefined {
  if (!time) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(time)) return time;
  const day = date || new Date().toISOString().slice(0, 10);
  return `${day}T${time.length === 5 ? `${time}:00` : time}`;
}

function formatClock(ts?: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

function isToday(ts?: string): boolean {
  if (!ts) return false;
  const d = new Date(ts);
  return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
}

function initialsOf(name?: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
}

const VISITOR_ICON: Record<string, IoniconsName> = {
  DELIVERY: 'bag-handle-outline',
  COURIER: 'bag-handle-outline',
  CAB: 'car-outline',
  SERVICE: 'construct-outline',
};

type GateEvent = { key: string; ts: string; icon: IoniconsName; color: string; title: string; sub: string };

function GateBlocks({ unit }: { unit?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { palette } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  // All of this is live data - nothing here is sample content. When the backend
  // has nothing to report the widgets simply show their empty state.
  const { data: pendingAll = [] } = useQuery({
    queryKey: ['gate', 'pending'],
    queryFn: () => visitorService.getPendingApprovals(),
    refetchInterval: 15_000,
  });
  const { data: myVisitors = [] } = useQuery({
    queryKey: ['gate', 'mine'],
    queryFn: () => visitorService.getMyVisitors(),
    staleTime: 30_000,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['gate', 'daily-help'],
    queryFn: () => residentGateService.getMyDailyHelp(),
    staleTime: 60_000,
  });
  const { data: attendance = [] } = useQuery({
    queryKey: ['gate', 'attendance'],
    queryFn: () => residentGateService.getTodayStaffAttendance(),
    staleTime: 30_000,
  });

  const decide = useMutation({
    mutationFn: ({ id, allow }: { id: number; allow: boolean }) =>
      allow ? visitorService.approve(id) : visitorService.denyEntry(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gate'] });
    },
    // A failed approval must never look like it worked.
    onError: (err: any) => Alert.alert('Could not update visitor', err?.message || 'Please try again.'),
  });

  const myId = user?.id;
  const pending = pendingAll.filter(
    (v) => v.residentId == null || myId == null || String(v.residentId) === String(myId),
  );
  const current = pending[0];

  const activeStaff = staff.filter((s) => s.status !== 'TERMINATED');
  const attByStaff = new Map(attendance.map((a) => [String(a.staffId), a]));
  const insideCount = activeStaff.filter((s) => attByStaff.get(String(s.id))?.status === 'CHECKED_IN').length;

  const events: GateEvent[] = [];
  myVisitors.forEach((v) => {
    const icon = VISITOR_ICON[String(v.passType).toUpperCase()] ?? 'person-outline';
    if (isToday(v.checkedInAt)) {
      events.push({
        key: `v${v.id}-in`,
        ts: v.checkedInAt!,
        icon,
        color: '#059669',
        title: `${v.visitorName} entered`,
        sub: [formatClock(v.checkedInAt), v.gateIn, v.guardIn ? `Guard ${v.guardIn}` : ''].filter(Boolean).join(' · '),
      });
    }
    if (isToday(v.checkedOutAt)) {
      events.push({
        key: `v${v.id}-out`,
        ts: v.checkedOutAt!,
        icon: 'log-out-outline',
        color: '#0284C7',
        title: `${v.visitorName} exited`,
        sub: [formatClock(v.checkedOutAt), v.gateOut, v.guardOut ? `Guard ${v.guardOut}` : ''].filter(Boolean).join(' · '),
      });
    }
  });
  attendance.forEach((a) => {
    const inTs = toStamp(a.date, a.checkInTime);
    const outTs = toStamp(a.date, a.checkOutTime);
    if (inTs) {
      events.push({
        key: `a${a.id}-in`,
        ts: inTs,
        icon: 'log-in-outline',
        color: '#059669',
        title: `${a.staffName} (${a.role}) entered`,
        sub: [formatClock(inTs), a.checkInGate].filter(Boolean).join(' · '),
      });
    }
    if (outTs) {
      events.push({
        key: `a${a.id}-out`,
        ts: outTs,
        icon: 'log-out-outline',
        color: '#0284C7',
        title: `${a.staffName} (${a.role}) exited`,
        sub: [formatClock(outTs), a.checkOutGate].filter(Boolean).join(' · '),
      });
    }
  });
  events.sort((x, y) => new Date(y.ts).getTime() - new Date(x.ts).getTime());
  const latest = events[0];
  const earlier = events.slice(1, 6);

  return (
    <View style={styles.gateSection}>
      {/* Live gate approval card - only when a visitor is actually waiting */}
      {current && (
        <View
          style={[
            styles.gateCard,
            styles.gateCardPending,
            { backgroundColor: palette.surface, borderColor: palette.borderHighlight },
          ]}
        >
          <View style={styles.gateRow}>
            <View style={[styles.gateIconBox, { backgroundColor: palette.warningLight }]}>
              <Ionicons
                name={VISITOR_ICON[String(current.passType).toUpperCase()] ?? 'person-outline'}
                size={22}
                color={palette.warning}
              />
            </View>
            <View style={styles.gateInfo}>
              <View style={styles.gateLabelRow}>
                <View style={styles.liveDot} />
                <Text style={[styles.gateStatus, { color: palette.warning }]}>
                  AT THE GATE NOW{pending.length > 1 ? ` · ${pending.length} waiting` : ''}
                </Text>
              </View>
              <Text style={[styles.gateTitle, { color: palette.text }]}>{current.visitorName}</Text>
              <Text style={[styles.gateMeta, { color: palette.textMuted }]}>
                {[String(current.passType), current.purpose].filter(Boolean).join(' · ')} for{' '}
                {current.flatNumber ?? unit ?? 'your flat'}
              </Text>
            </View>
          </View>
          <View style={styles.gateActions}>
            <Pressable
              disabled={decide.isPending}
              onPress={() => decide.mutate({ id: current.id, allow: true })}
              style={[styles.gateBtn, { backgroundColor: palette.successLight }]}
            >
              <LinearGradient colors={palette.successGradient} style={styles.gateBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.gateBtnTextWhite}>{decide.isPending ? 'Please wait…' : 'Allow'}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              disabled={decide.isPending}
              onPress={() => decide.mutate({ id: current.id, allow: false })}
              style={[styles.gateBtn, styles.gateBtnDeny, { backgroundColor: palette.dangerLight }]}
            >
              <Text style={[styles.gateBtnTextRed, { color: palette.danger }]}>Deny</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Pre-approve row */}
      <View style={styles.subSection}>
        <View style={styles.subSectionHeader}>
          <Text style={[styles.subSectionLabel, { color: palette.eyebrow }]}>PRE-APPROVE</Text>
          <TouchableOpacity onPress={() => router.push('/visitors' as any)}>
            <Text style={[styles.subSectionLink, { color: palette.link }]}>All visitors</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.preApproveGrid}>
          {PRE_APPROVE.map((p) => (
            <Pressable
              key={p.label}
              style={[styles.preApproveBtn, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
              onPress={() => router.push(p.route as any)}
            >
              <View style={[styles.preApproveIcon, { backgroundColor: p.color + '1D' }]}>
                <Ionicons name={p.icon} size={20} color={p.color} />
              </View>
              <Text style={[styles.preApproveLabel, { color: palette.textSecondary }]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Daily help horizontal scroll */}
      <View style={styles.subSection}>
        <View style={styles.subSectionHeader}>
          <Text style={[styles.subSectionLabel, { color: palette.eyebrow }]}>MY DAILY HELP</Text>
          {activeStaff.length > 0 && (
            <Text style={[styles.subSectionMeta, { color: palette.textMuted }]}>{insideCount} inside</Text>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dailyHelpScroll}
        >
          {activeStaff.map((h) => {
            const att = attByStaff.get(String(h.id));
            const inside = att?.status === 'CHECKED_IN';
            let timeText = 'Not marked yet';
            if (att?.status === 'CHECKED_IN') timeText = `In · ${formatClock(toStamp(att.date, att.checkInTime)) || 'today'}`;
            else if (att?.status === 'CHECKED_OUT') timeText = `Out · ${formatClock(toStamp(att.date, att.checkOutTime)) || 'today'}`;
            else if (att?.status === 'ABSENT') timeText = 'Absent today';
            else if (att?.status === 'ON_LEAVE') timeText = 'On leave';
            return (
              <View
                key={h.id}
                style={[styles.helpCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}
              >
                <View style={styles.helpCardTop}>
                  <View style={styles.helpAvatarWrap}>
                    <LinearGradient
                      colors={['#4F46E5', '#7C3AED']}
                      style={styles.helpAvatar}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.helpAvatarText}>{initialsOf(h.name)}</Text>
                    </LinearGradient>
                    <View
                      style={[
                        styles.helpOnlineDot,
                        { backgroundColor: inside ? '#10B981' : '#94A3B8', borderColor: palette.surface },
                      ]}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={[styles.helpName, { color: palette.text }]} numberOfLines={1}>{h.name}</Text>
                    <Text style={[styles.helpRole, { color: palette.textMuted }]}>{h.role}</Text>
                  </View>
                </View>
                <View style={styles.helpTimeRow}>
                  <Ionicons name="time-outline" size={11} color={palette.textMuted} />
                  <Text style={[styles.helpTime, { color: palette.textMuted }]}>{timeText}</Text>
                </View>
              </View>
            );
          })}
          <Pressable
            style={[
              styles.helpAddBtn,
              { backgroundColor: palette.primaryLight, borderColor: palette.primaryBorder },
            ]}
            onPress={() => router.push('/household' as any)}
          >
            <Ionicons name="person-add-outline" size={18} color={palette.link} />
            <Text style={[styles.helpAddLabel, { color: palette.link }]}>Add help</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Gate activity row */}
      <Pressable
        style={[
          styles.gateActivityRow,
          { backgroundColor: palette.surface, borderColor: palette.borderLight },
          expanded && earlier.length > 0 && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
        ]}
        onPress={() => earlier.length > 0 && setExpanded((v) => !v)}
      >
        <View style={[styles.gateIconBox, { backgroundColor: palette.successLight }]}>
          <Ionicons name={latest?.icon ?? 'log-in-outline'} size={18} color={palette.success} />
        </View>
        <View style={styles.gateActivityInfo}>
          <Text style={[styles.subSectionLabel, { color: palette.eyebrow }]}>TODAY AT THE GATE</Text>
          <Text style={[styles.gateActivityTitle, { color: palette.text }]}>
            {latest ? latest.title : 'No gate activity yet today'}
          </Text>
        </View>
        {earlier.length > 0 && (
          <Pressable onPress={() => setExpanded((v) => !v)} style={styles.moreBtn}>
            <Text style={[styles.moreText, { color: palette.link }]}>{expanded ? 'Less' : 'More'}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={palette.link} />
          </Pressable>
        )}
      </Pressable>
      {expanded && earlier.length > 0 && (
        <View
          style={[
            styles.gateActivityExpanded,
            { backgroundColor: palette.surface, borderColor: palette.borderLight },
          ]}
        >
          {earlier.map((l) => (
            <View key={l.key} style={[styles.gateActivityItem, { borderTopColor: palette.borderLight }]}>
              <View style={[styles.gateIconBox, { backgroundColor: l.color + '22', width: 36, height: 36 }]}>
                <Ionicons name={l.icon} size={16} color={l.color} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.gateActivityTitle, { color: palette.text }]}>{l.title}</Text>
                <Text style={[styles.gateMeta, { color: palette.textMuted }]}>{l.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Resident QR Pass Card ────────────────────────────────────────────────────

function ResidentPassCard({
  unit,
  residentName,
  duesLabel,
  points,
}: {
  unit?: string;
  residentName?: string;
  duesLabel?: string;
  points?: number;
}) {
  const [showPass, setShowPass] = useState(false);
  const { palette } = useAppTheme();
  return (
    <View style={[styles.passCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
      <View style={styles.passRow}>
        <View style={[styles.gateIconBox, { backgroundColor: palette.primaryLight }]}>
          <Ionicons name="qr-code-outline" size={18} color={palette.link} />
        </View>
        <View style={styles.flex1}>
          <Text style={[styles.passTitle, { color: palette.text }]}>Resident pass</Text>
          <Text style={[styles.passMeta, { color: palette.textMuted }]}>{unit ?? 'Unit Assigned'} · Verified</Text>
        </View>
        <Pressable onPress={() => setShowPass((v) => !v)}>
          <LinearGradient
            colors={palette.primaryGradient}
            style={styles.showQrBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.showQrText}>{showPass ? 'Hide' : 'Show QR'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
      {showPass && (
        <View style={[styles.qrExpanded, { borderTopColor: palette.borderLight }]}>
          <View style={[styles.qrBox, { borderColor: palette.borderLight }]}>
            <Ionicons name="qr-code" size={72} color="#0D0D2B" />
          </View>
          <View style={styles.qrMeta}>
            {residentName ? <Text style={[styles.qrMetaName, { color: palette.text }]}>{residentName}</Text> : null}
            <Text style={[styles.qrMetaRow, { color: palette.textSecondary }]}>
              Unit: <Text style={[styles.qrBoldText, { color: palette.text }]}>{unit ?? 'Assigned'}</Text>
            </Text>
            {duesLabel ? <Text style={[styles.qrMetaRow, { color: palette.textSecondary }]}>Dues <Text style={styles.qrPaid}>{duesLabel}</Text></Text> : null}
            {points != null ? (
              <Text style={[styles.qrMetaRow, { color: palette.textSecondary }]}>
                Mana Points <Text style={[styles.qrPoints, { color: palette.link }]}>{points.toLocaleString('en-IN')}</Text>
              </Text>
            ) : null}
            <Text style={[styles.qrGate, { color: palette.textMuted }]}>Show this at the gate</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Resident Pass Modal ──────────────────────────────────────────────────────

function ResidentPassModal({
  visible,
  onClose,
  unit,
  residentName,
  communityDisplay,
  duesLabel,
  points,
}: {
  visible: boolean;
  onClose: () => void;
  unit?: string;
  residentName?: string;
  communityDisplay?: string;
  duesLabel?: string;
  points?: number;
}) {
  const { palette } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.modalOverlay, { backgroundColor: palette.overlay }]} onPress={onClose}>
        <Pressable style={[styles.qrModalSheet, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Resident Gate Pass</Text>
              <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>Present this QR at security check-post</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: palette.surfaceMuted }]} hitSlop={8}>
              <Ionicons name="close" size={20} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {/* QR Container */}
          <View style={styles.modalQrContainer}>
            <View style={[styles.modalQrBox, { borderColor: palette.border }]}>
              <Ionicons name="qr-code" size={130} color="#0D0D2B" />
            </View>
            {residentName ? <Text style={[styles.modalQrName, { color: palette.text }]}>{residentName}</Text> : null}

            <View style={styles.modalQrBadgeRow}>
              <View style={[styles.modalQrBadgeVerified, { backgroundColor: palette.successLight, borderColor: palette.primaryBorder }]}>
                <Ionicons name="shield-checkmark" size={13} color={palette.success} />
                <Text style={[styles.modalQrBadgeVerifiedText, { color: palette.success }]}>Verified Resident</Text>
              </View>
              <View style={[styles.modalQrBadgeUnit, { backgroundColor: palette.primaryLight, borderColor: palette.primaryBorder }]}>
                <Ionicons name="home-outline" size={13} color={palette.link} />
                <Text style={[styles.modalQrBadgeUnitText, { color: palette.link }]}>{unit ?? 'Unit Assigned'}</Text>
              </View>
            </View>

            <View style={[styles.modalQrInfoTable, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}>
              <View style={styles.modalQrInfoRow}>
                <Text style={[styles.modalQrInfoLabel, { color: palette.textMuted }]}>Community</Text>
                <Text style={[styles.modalQrInfoValue, { color: palette.text }]}>{communityDisplay ?? 'Mana Community'}</Text>
              </View>
              {duesLabel ? (
                <View style={styles.modalQrInfoRow}>
                  <Text style={[styles.modalQrInfoLabel, { color: palette.textMuted }]}>Maintenance Dues</Text>
                  <Text style={styles.modalQrInfoValuePaid}>{duesLabel}</Text>
                </View>
              ) : null}
              {points != null ? (
                <View style={styles.modalQrInfoRow}>
                  <Text style={[styles.modalQrInfoLabel, { color: palette.textMuted }]}>Mana Points</Text>
                  <Text style={[styles.modalQrInfoValuePoints, { color: palette.link }]}>{points.toLocaleString('en-IN')} pts</Text>
                </View>
              ) : null}
            </View>
          </View>

          <TouchableOpacity onPress={onClose} activeOpacity={0.85}>
            <LinearGradient colors={palette.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalDoneBtn}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

// ─── KPI Strip ────────────────────────────────────────────────────────────────

export type DisplayKpiItem = {
  id: string;
  label: string;
  value: string | number;
  icon: IoniconsName;
  color: string;
  route?: string;
  isPass?: boolean;
  badge?: string;
  badgeColor?: string;
  pulse?: boolean;
  urgent?: boolean;
  priority: number;
};

function KpiStrip({
  eventsCount,
  eventsTodayCount,
  sportsCount,
  sportsSummary,
  pollsCount,
  ticketsCount,
  duesCount,
  duesOverdueTotal,
  facilitiesCount,
  noticesCount,
  onOpenPass,
}: {
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
  onOpenPass?: () => void;
}) {
  const router = useRouter();
  const { hasModule, isSuperAdmin } = useAuth();
  const { palette } = useAppTheme();

  const allowedMacroItems = useMemo(() => {
    return KPI_ITEMS.filter((item) => isSuperAdmin || !item.module || hasModule(item.module));
  }, [isSuperAdmin, hasModule]);

  const isAdaptiveMode = allowedMacroItems.length > 0 && allowedMacroItems.length <= 3;

  const visibleKpis = useMemo<DisplayKpiItem[]>(() => {
    if (allowedMacroItems.length === 0) return [];

    // ── ADAPTIVE SUB-KPI MODE (Sparse community module access <= 3 modules) ──
    if (isAdaptiveMode) {
      const subItems: DisplayKpiItem[] = [];

      for (const macro of allowedMacroItems) {
        switch (macro.module) {
          case 'SPORTS': {
            if (sportsSummary && sportsSummary.liveCount > 0) {
              subItems.push({
                id: 'sports_live',
                label: 'Live Match',
                value: `${sportsSummary.liveCount} Live`,
                icon: 'flame-outline',
                color: '#EF4444',
                route: '/sports/matches',
                badge: 'LIVE',
                pulse: true,
                priority: 95,
              });
            }
            if (sportsSummary && sportsSummary.todayCount > 0) {
              subItems.push({
                id: 'sports_today',
                label: "Today's Games",
                value: `${sportsSummary.todayCount} Today`,
                icon: 'football-outline',
                color: '#F59E0B',
                route: '/sports/matches',
                badge: 'TODAY',
                priority: 80,
              });
            }
            if (sportsSummary && sportsSummary.tourneyCount > 0) {
              subItems.push({
                id: 'sports_tourneys',
                label: 'Tournaments',
                value: `${sportsSummary.tourneyCount} Active`,
                icon: 'trophy-outline',
                color: '#D97706',
                route: '/sports/tournaments',
                priority: 70,
              });
            }
            // Always ensure at least one baseline sports hub chip
            if (subItems.filter((s) => s.id.startsWith('sports_')).length === 0) {
              subItems.push({
                id: 'sports_hub',
                label: 'Sports Hub',
                value: typeof sportsCount === 'string' && sportsCount !== 'Active' ? sportsCount : 'Active',
                icon: 'trophy-outline',
                color: '#D97706',
                route: '/sports',
                priority: 60,
              });
            }
            // Add court booking quick trigger
            subItems.push({
              id: 'sports_courts',
              label: 'Court Slots',
              value: 'Book',
              icon: 'tennisball-outline',
              color: '#6366F1',
              route: '/sports/facility/my-bookings',
              priority: 45,
            });
            break;
          }

          case 'EVENTS': {
            if (eventsTodayCount && eventsTodayCount > 0) {
              subItems.push({
                id: 'events_today',
                label: "Today's Events",
                value: `${eventsTodayCount} Today`,
                icon: 'sparkles-outline',
                color: '#8B5CF6',
                route: '/events',
                badge: 'TODAY',
                priority: 85,
              });
            }
            subItems.push({
              id: 'events_upcoming',
              label: 'Upcoming',
              value: (eventsCount ?? 0) > 0 ? `${eventsCount} Events` : 'Explore',
              icon: 'calendar-outline',
              color: '#4F46E5',
              route: '/events',
              priority: 65,
            });
            subItems.push({
              id: 'events_calendar',
              label: 'Calendar',
              value: 'Schedule',
              icon: 'calendar-number-outline',
              color: '#0284C7',
              route: '/events',
              priority: 40,
            });
            break;
          }

          case 'VISITORS': {
            subItems.push({
              id: 'pass_qr',
              label: 'Gate Pass',
              value: 'Instant',
              icon: 'qr-code-outline',
              color: '#2563EB',
              isPass: true,
              badge: 'QR',
              priority: 90,
            });
            subItems.push({
              id: 'pass_invite',
              label: 'Pre-Approve',
              value: 'Guest',
              icon: 'person-add-outline',
              color: '#3B82F6',
              route: '/visitors?action=preapprove&type=GUEST',
              priority: 55,
            });
            break;
          }

          case 'FINANCE_MGMT': {
            const hasOverdue = Boolean(duesOverdueTotal && duesOverdueTotal > 0);
            subItems.push({
              id: 'dues_status',
              label: hasOverdue ? 'Overdue Dues' : 'Society Dues',
              value: hasOverdue ? `₹${duesOverdueTotal!.toLocaleString('en-IN')}` : (duesCount ?? 'Paid ✓'),
              icon: hasOverdue ? 'alert-circle-outline' : 'card-outline',
              color: hasOverdue ? '#DC2626' : '#059669',
              route: '/tabs/pay',
              badge: hasOverdue ? 'DUE' : 'PAID',
              urgent: hasOverdue,
              priority: hasOverdue ? 100 : 40,
            });
            subItems.push({
              id: 'dues_history',
              label: 'Receipts',
              value: 'History',
              icon: 'receipt-outline',
              color: '#0D9488',
              route: '/finance',
              priority: 35,
            });
            break;
          }

          case 'HELPDESK': {
            const hasTickets = Boolean((ticketsCount ?? 0) > 0);
            subItems.push({
              id: 'tickets_open',
              label: 'Complaints',
              value: hasTickets ? `${ticketsCount} Open` : 'Resolved ✓',
              icon: hasTickets ? 'headset-outline' : 'shield-checkmark-outline',
              color: '#0891B2',
              route: '/helpdesk',
              badge: hasTickets ? 'OPEN' : undefined,
              priority: hasTickets ? 80 : 40,
            });
            subItems.push({
              id: 'tickets_raise',
              label: 'Raise Ticket',
              value: 'New +',
              icon: 'create-outline',
              color: '#06B6D4',
              route: '/helpdesk',
              priority: 35,
            });
            break;
          }

          case 'POLLS': {
            const hasPolls = Boolean((pollsCount ?? 0) > 0);
            subItems.push({
              id: 'polls_active',
              label: 'Community Votes',
              value: hasPolls ? `${pollsCount} Open` : '0 Active',
              icon: 'bar-chart-outline',
              color: '#7C3AED',
              route: '/polls',
              badge: hasPolls ? 'VOTE' : undefined,
              priority: hasPolls ? 75 : 30,
            });
            break;
          }

          case 'FACILITIES': {
            subItems.push({
              id: 'facilities_status',
              label: 'Amenities',
              value: facilitiesCount ?? 'Available',
              icon: 'business-outline',
              color: '#6366F1',
              route: '/facilities',
              priority: 45,
            });
            subItems.push({
              id: 'facilities_book',
              label: 'Book Amenity',
              value: 'Book +',
              icon: 'add-circle-outline',
              color: '#4F46E5',
              route: '/tabs/bookings',
              priority: 40,
            });
            break;
          }

          case 'NOTICES': {
            subItems.push({
              id: 'notices_recent',
              label: 'Circulars',
              value: noticesCount ?? 'New',
              icon: 'megaphone-outline',
              color: '#EA580C',
              route: '/notices',
              badge: 'NEW',
              priority: 50,
            });
            break;
          }

          default: {
            subItems.push({
              id: macro.id,
              label: macro.label,
              value: macro.defaultVal,
              icon: macro.icon,
              color: macro.color,
              route: macro.route,
              isPass: macro.isPass,
              priority: 30,
            });
            break;
          }
        }
      }

      return subItems.sort((a, b) => b.priority - a.priority);
    }

    // ── MACRO OVERVIEW MODE (Standard / full community access >= 4 modules) ──
    const valueMap: Record<string, string | number> = {
      pass: 'QR',
      events: eventsCount ?? 0,
      sports: sportsCount ?? 'Active',
      dues: duesCount ?? 'Paid',
      polls: pollsCount ?? 0,
      tickets: ticketsCount ?? 0,
      facilities: facilitiesCount ?? 'Book',
      notices: noticesCount ?? 'New',
      marketplace: 'Deals',
      group_buying: 'Deals',
      trips: 'Pool',
      food: 'Daily',
    };

    return allowedMacroItems
      .map((item) => {
        const val = valueMap[item.id] ?? item.defaultVal;
        const isLiveSports = item.id === 'sports' && Boolean(sportsSummary?.liveCount && sportsSummary.liveCount > 0);
        const isDuesOverdue = item.id === 'dues' && Boolean(duesOverdueTotal && duesOverdueTotal > 0);
        const hasActivePolls = item.id === 'polls' && Boolean((pollsCount ?? 0) > 0);
        const hasActiveTickets = item.id === 'tickets' && Boolean((ticketsCount ?? 0) > 0);
        const hasEventsToday = item.id === 'events' && Boolean(eventsTodayCount && eventsTodayCount > 0);

        let badge: string | undefined = undefined;
        let pulse = false;
        let urgent = false;
        let priority = 30;

        if (isDuesOverdue) {
          badge = 'DUE';
          urgent = true;
          priority = 100;
        } else if (isLiveSports) {
          badge = 'LIVE';
          pulse = true;
          priority = 95;
        } else if (item.isPass) {
          badge = 'QR';
          priority = 90;
        } else if (hasEventsToday) {
          badge = 'TODAY';
          priority = 85;
        } else if (hasActiveTickets) {
          badge = 'OPEN';
          priority = 80;
        } else if (hasActivePolls) {
          badge = 'VOTE';
          priority = 75;
        } else if (item.id === 'notices') {
          badge = 'NEW';
          priority = 50;
        }

        return {
          id: item.id,
          label: item.label,
          value: val,
          icon: item.icon,
          color: item.color,
          route: item.route,
          isPass: item.isPass,
          badge,
          pulse,
          urgent,
          priority,
        };
      })
      .sort((a, b) => b.priority - a.priority);
  }, [
    allowedMacroItems,
    isAdaptiveMode,
    sportsSummary,
    sportsCount,
    eventsCount,
    eventsTodayCount,
    pollsCount,
    ticketsCount,
    duesCount,
    duesOverdueTotal,
    facilitiesCount,
    noticesCount,
  ]);

  if (visibleKpis.length === 0) return null;

  return (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiHeaderRow}>
        <Text style={[styles.kpiSectionTitle, { color: palette.textMuted }]}>Today at a Glance</Text>
        {isAdaptiveMode && (
          <View style={[styles.kpiAdaptivePill, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}>
            <Text style={[styles.kpiAdaptiveText, { color: palette.textMuted }]}>
              {allowedMacroItems.map((m) => m.label).join(' • ')}
            </Text>
          </View>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.kpiScroll}
      >
        {visibleKpis.map((k) => (
          <Pressable
            key={k.id}
            style={[
              styles.kpiChip,
              { backgroundColor: palette.surface, borderColor: k.urgent ? '#F87171' : palette.borderLight },
              k.urgent && styles.kpiChipUrgent,
            ]}
            onPress={() => {
              if (k.isPass) {
                onOpenPass?.();
              } else if (k.route) {
                router.push(k.route as any);
              }
            }}
          >
            {k.badge && (
              <View
                style={[
                  styles.kpiBadge,
                  { backgroundColor: k.badgeColor || (k.pulse ? '#EF4444' : k.urgent ? '#DC2626' : k.color) },
                ]}
              >
                {k.pulse && <View style={styles.kpiPulseDot} />}
                <Text style={styles.kpiBadgeText}>{k.badge}</Text>
              </View>
            )}
            <View style={[styles.kpiIconBox, { backgroundColor: k.color + '1A' }]}>
              <Ionicons name={k.icon} size={16} color={k.color} />
            </View>
            <View style={styles.kpiTextBox}>
              <Text
                style={[styles.kpiValue, { color: k.urgent ? '#DC2626' : palette.text }]}
                numberOfLines={1}
              >
                {k.value}
              </Text>
              <Text
                style={[styles.kpiLabel, { color: palette.textMuted }]}
                numberOfLines={1}
              >
                {k.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Quick Actions Grid ───────────────────────────────────────────────────────

function QuickActionsGrid({ onOpenSos }: { onOpenSos: () => void }) {
  const router = useRouter();
  const { hasModule, hasRole, hasPermission, isSuperAdmin } = useAuth();
  const { palette } = useAppTheme();
  const [cat, setCat] = useState<HomeCat>('Safety & Help');
  const [showAll, setShowAll] = useState(false);

  const filteredActions = useMemo(() => {
    return HOME_ACTIONS.filter((a) => {
      if (isSuperAdmin) return true;
      if (a.roles && a.roles.length > 0 && !hasRole(...a.roles)) return false;
      if (a.module && !hasModule(a.module)) return false;
      if (a.permission && !hasPermission(a.permission)) return false;
      return true;
    });
  }, [hasModule, hasRole, hasPermission, isSuperAdmin]);

  const availableCats = useMemo(() => {
    const presentCats = new Set(filteredActions.map((a) => a.cat));
    return HOME_CATS.filter((c) => presentCats.has(c));
  }, [filteredActions]);

  const activeCat = availableCats.includes(cat) ? cat : (availableCats[0] || 'Safety & Help');

  const catActions = filteredActions.filter((a) => a.cat === activeCat);
  const visible = showAll ? catActions : catActions.slice(0, 8);

  const handleAction = (a: HomeAction) => {
    if (a.id === 'emergency') {
      onOpenSos();
      return;
    }
    if (a.route) router.push(a.route as any);
  };

  if (filteredActions.length === 0) return null;

  return (
    <View style={styles.qaSection}>
      <View style={styles.qaSectionHeader}>
        <Text style={[styles.subSectionLabel, { color: palette.eyebrow }]}>QUICK ACTIONS</Text>
        <Text style={[styles.subSectionMeta, { color: palette.textMuted }]}>{filteredActions.length} services</Text>
      </View>
      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catTabsScroll}
      >
        {availableCats.map((c) => {
          const isSelected = activeCat === c;
          return (
            <Pressable
              key={c}
              onPress={() => { setCat(c); setShowAll(false); }}
              style={[
                styles.catTabBase,
                !isSelected && [styles.catTabInactive, { backgroundColor: palette.surface, borderColor: palette.borderLight }],
              ]}
            >
              {isSelected ? (
                <LinearGradient colors={palette.primaryGradient} style={styles.catTabActive} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.catTabTextActive}>{c}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.catTabInner}>
                  <Text style={[styles.catTabTextInactive, { color: palette.textSecondary }]}>{c}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Grid */}
      <View style={[styles.qaGrid, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
        <View style={styles.qaGridInner}>
          {visible.map((a) => (
            <Pressable key={a.id} style={styles.qaItem} onPress={() => handleAction(a)}>
              <View style={[styles.qaIconBox, { backgroundColor: a.color + '1A', borderColor: a.color + '26' }]}>
                <Ionicons name={a.icon} size={23} color={a.color} />
                {a.badge && (
                  <View style={[styles.qaBadge, { backgroundColor: a.color }]}>
                    <Text style={styles.qaBadgeText}>{a.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.qaLabel, { color: palette.textSecondary }]} numberOfLines={2}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
        {catActions.length > 8 && (
          <Pressable
            style={[styles.qaShowMore, { borderTopColor: palette.borderLight }]}
            onPress={() => setShowAll((v) => !v)}
          >
            <Text style={[styles.qaShowMoreText, { color: palette.link }]}>
              {showAll ? 'Show Less' : `View All (${catActions.length})`}
            </Text>
            <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={13} color={palette.link} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Payments Due Banner ──────────────────────────────────────────────────────

function PaymentsDueBanner({ count, total }: { count: number; total: number }) {
  const router = useRouter();
  if (count === 0) return null;
  return (
    <Pressable style={styles.dueBanner} onPress={() => router.push('/payments' as any)}>
      <View style={styles.dueLeft}>
        <Ionicons name="alert-circle" size={22} color="#DC2626" />
        <View>
          <Text style={styles.dueTitle}>{count} payment{count > 1 ? 's' : ''} overdue</Text>
          <Text style={styles.dueAmount}>₹{total.toLocaleString('en-IN')} total due</Text>
        </View>
      </View>
      <LinearGradient colors={['#DC2626', '#B91C1C']} style={styles.payNowBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.payNowText}>Pay Now</Text>
      </LinearGradient>
    </Pressable>
  );
}

// ─── Community Highlight Banner ───────────────────────────────────────────────

function CommunityHighlightBanner({
  post,
  event,
  communityDisplay,
  visible = true,
}: {
  post?: PostDto;
  event?: EventDto;
  communityDisplay: string;
  visible?: boolean;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();

  if (!visible) return null;

  let title = `${communityDisplay} Highlights`;
  let subtitle = 'Tap to view notices, announcements & community updates';
  let route: string = '/community/feed';
  let badgeIcon: IoniconsName = 'trophy-outline';

  if (post) {
    title = post.title || post.content;
    subtitle = post.title ? post.content : (post.authorName ? `Posted by ${post.authorName}` : '');
    route = '/community/feed';
  } else if (event) {
    title = event.title;
    const eventWhen = event.startDate
      ? new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    subtitle = [eventWhen, event.location].filter(Boolean).join(' · ') || 'Upcoming community event';
    route = `/events/${event.id}`;
    badgeIcon = 'calendar-outline';
  }

  return (
    <Pressable
      style={[
        styles.announcementBanner,
        { backgroundColor: palette.highlightCardBg, borderColor: palette.highlightCardBorder },
      ]}
      onPress={() => router.push(route as any)}
    >
      <View style={styles.announcementBannerHeader}>
        <View style={styles.announcementBannerIcon}>
          <Ionicons name={badgeIcon} size={14} color="#FBBF24" />
        </View>
        <Text style={styles.announcementBannerEyebrow}>COMMUNITY HIGHLIGHT</Text>
      </View>
      <Text style={styles.announcementBannerTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={styles.announcementBannerMeta} numberOfLines={2}>{subtitle}</Text> : null}
    </Pressable>
  );
}

// ─── Feed Post Card ───────────────────────────────────────────────────────────

function FeedPostCard({ post, liked, onLike }: { post: PostDto; liked: boolean; onLike: () => void }) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const initials = (post.authorName ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const gradColors: readonly [string, string] = post.official ? palette.primaryGradient : ['#EC4899', '#F43F5E'];
  const [imageError, setImageError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [votedOption, setVotedOption] = useState<number | null>(null);

  // Format relative timestamp
  const timeDisplay = useMemo(() => {
    if (!post.createdAt) return '';
    try {
      const dt = new Date(post.createdAt);
      const diffMs = Date.now() - dt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }, [post.createdAt]);

  const authorSubtitle = [post.authorFlat, timeDisplay].filter(Boolean).join(' · ');
  const rawImage = post.imageUrl || post.mediaUrls?.[0];
  const displayImage = !imageError && rawImage ? resolveImageUrl(rawImage) : null;
  const authorAvatar = !avatarError ? resolveUserAvatar(post) : null;

  return (
    <View style={[styles.feedCard, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
      {/* Header */}
      <View style={styles.feedCardHeader}>
        {authorAvatar ? (
          <Image
            source={{ uri: authorAvatar }}
            style={styles.feedAvatarImage}
            onError={() => setAvatarError(true)}
          />
        ) : (
          <LinearGradient colors={gradColors} style={styles.feedAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.feedAvatarText}>{initials}</Text>
          </LinearGradient>
        )}
        <View style={styles.flex1}>
          <View style={styles.feedAuthorRow}>
            <Text style={[styles.feedAuthorName, { color: palette.text }]} numberOfLines={1}>{post.authorName}</Text>
            {post.official && <Ionicons name="checkmark-circle" size={14} color={palette.link} />}
            {post.authorRole && (
              <View style={[styles.roleBadge, { backgroundColor: palette.primaryLight }]}>
                <Text style={[styles.roleBadgeText, { color: palette.link }]}>{post.authorRole}</Text>
              </View>
            )}
          </View>
          {authorSubtitle ? <Text style={[styles.feedPostTime, { color: palette.textMuted }]}>{authorSubtitle}</Text> : null}
        </View>
        {post.official && (
          <View style={[styles.feedOfficialBadge, { backgroundColor: palette.primaryLight, borderColor: palette.primaryBorder }]}>
            <Text style={[styles.feedOfficialText, { color: palette.link }]}>Official</Text>
          </View>
        )}
      </View>

      {/* Title */}
      {post.title ? (
        <Text style={[styles.feedPostTitle, { color: palette.text }]}>{post.title}</Text>
      ) : null}

      {/* Body */}
      <Text style={[styles.feedContent, { color: palette.textSecondary }]} numberOfLines={4}>{post.content}</Text>

      {/* Image Attachment */}
      {displayImage ? (
        <View style={[styles.postMediaWrap, { backgroundColor: palette.surfaceMuted }]}>
          <Image
            source={{ uri: displayImage }}
            style={styles.postImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        </View>
      ) : null}

      {/* Poll Options */}
      {post.poll && post.poll.options && post.poll.options.length > 0 && (
        <View style={[styles.pollContainer, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}>
          {post.poll.options.map((opt) => {
            const isSelected = votedOption === opt.id;
            const pct = post.poll!.totalVotes > 0 ? Math.round((opt.voteCount / post.poll!.totalVotes) * 100) : 0;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.pollOptionBox,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                  isSelected && { borderColor: palette.link, backgroundColor: palette.primaryLight },
                ]}
                onPress={() => setVotedOption(opt.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.pollProgressFill, { width: `${pct}%`, backgroundColor: palette.primaryLight }]} />
                <View style={styles.pollOptionContent}>
                  <Text style={[styles.pollOptionText, { color: palette.text }, isSelected && { color: palette.link }]}>
                    {opt.text}
                  </Text>
                  <Text style={[styles.pollVoteCount, { color: palette.textMuted }]}>
                    {opt.voteCount} ({pct}%)
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <Text style={[styles.pollTotalText, { color: palette.textMuted }]}>
            {post.poll.totalVotes} vote{post.poll.totalVotes !== 1 ? 's' : ''}
            {post.poll.deadline ? ` · Closes ${new Date(post.poll.deadline).toLocaleDateString()}` : ''}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.feedActions, { borderTopColor: palette.borderLight }]}>
        <Pressable onPress={onLike} style={[styles.feedActionBtn, { backgroundColor: palette.surfaceSubtle }]}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#F43F5E' : palette.textMuted} />
          <Text style={[styles.feedActionText, { color: palette.textMuted }, liked && { color: '#F43F5E', fontWeight: '700' }]}>
            {Math.max(0, (post.likeCount ?? 0) + (liked && !post.liked ? 1 : !liked && post.liked ? -1 : 0))}
          </Text>
        </Pressable>
        <Pressable style={[styles.feedActionBtn, { backgroundColor: palette.surfaceSubtle }]} onPress={() => router.push(`/community/feed` as any)}>
          <Ionicons name="chatbubble-outline" size={15} color={palette.textMuted} />
          <Text style={[styles.feedActionText, { color: palette.textMuted }]}>{post.commentCount ?? 0}</Text>
        </Pressable>
        <Pressable
          style={[styles.feedActionBtn, { backgroundColor: palette.surfaceSubtle }]}
          onPress={() => {
            Alert.alert('Share', `Share "${post.title || post.content.slice(0, 30)}..." with your network.`);
          }}
        >
          <Ionicons name="share-social-outline" size={15} color={palette.textMuted} />
        </Pressable>
        <View style={styles.flex1} />
        <Pressable onPress={() => router.push('/community/feed' as any)}>
          <Text style={[styles.viewAllText, { color: palette.link }]}>Discussion →</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Unit & Community Dropdown Selector Modal ─────────────────────────────────

function UnitSelectorModal({
  visible,
  onClose,
  activeUser,
  unitDisplay,
  communityDisplay,
  residentName,
}: {
  visible: boolean;
  onClose: () => void;
  activeUser: any;
  unitDisplay: string;
  communityDisplay: string;
  residentName: string;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const kycVerified = activeUser?.kycStatus === 'VERIFIED';
  const roleName = activeUser?.role || activeUser?.userType || 'Resident';
  const { availablePortals, hasMultiplePortals, switchToRole } = useRoleSwitcher();
  const otherPortals = availablePortals.filter((p) => p.route !== '/tabs/feed');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.modalOverlay, { backgroundColor: palette.overlay }]} onPress={onClose}>
        <Pressable style={[styles.modalSheet, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Your Community & Unit</Text>
              <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>Assigned property residence & tenancy details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: palette.surfaceMuted }]} hitSlop={8}>
              <Ionicons name="close" size={20} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Active Community & Unit Card */}
          <LinearGradient
            colors={palette.isDark ? ['#1E1B4B', '#312E81', '#4338CA'] : ['#00174B', '#004AC6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalActiveCard}
          >
            <View style={styles.modalActiveCardTop}>
              <View style={styles.modalCommunityPill}>
                <Ionicons name="business" size={12} color="#FBBF24" />
                <Text style={styles.modalCommunityPillText}>PRIMARY COMMUNITY</Text>
              </View>
              <View style={styles.modalVerifiedBadge}>
                <Ionicons name={kycVerified ? 'checkmark-circle' : 'shield-checkmark'} size={13} color="#10B981" />
                <Text style={styles.modalVerifiedText}>{kycVerified ? 'KYC Verified' : 'Resident Active'}</Text>
              </View>
            </View>

            <Text style={styles.modalCommName}>{communityDisplay}</Text>
            <Text style={styles.modalUnitText}>{unitDisplay}</Text>

            <View style={styles.modalResidentRow}>
              <View style={styles.modalAvatarBox}>
                <Text style={styles.modalAvatarText}>{getInitials(residentName)}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.modalResidentName}>{residentName}</Text>
                <Text style={styles.modalResidentRole}>
                  {activeUser?.occupancyStatus || activeUser?.residentType || 'Resident'} · {roleName}
                </Text>
              </View>
              <View style={styles.modalActiveDot} />
            </View>
          </LinearGradient>

          {/* Workspaces — only for users holding admin / vendor / staff roles besides resident */}
          {hasMultiplePortals && otherPortals.length > 0 && (
            <View style={styles.modalActionsList}>
              <Text style={[styles.modalSubtitle, { color: palette.textMuted, marginBottom: 6 }]}>SWITCH WORKSPACE</Text>
              {otherPortals.map((portal) => (
                <TouchableOpacity
                  key={portal.route}
                  style={[styles.modalActionItem, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
                  onPress={() => {
                    onClose();
                    switchToRole(portal.role);
                  }}
                >
                  <View style={[styles.modalActionIcon, { backgroundColor: palette.primaryLight }]}>
                    <Ionicons name={portal.icon as any} size={20} color={palette.link} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={[styles.modalActionTitle, { color: palette.text }]}>{portal.label}</Text>
                    <Text style={[styles.modalActionSub, { color: palette.textMuted }]}>Open your {portal.label.toLowerCase()} workspace</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Unit Quick Actions */}
          <View style={styles.modalActionsList}>
            <TouchableOpacity
              style={[styles.modalActionItem, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
              onPress={() => {
                onClose();
                router.push('/tabs/profile' as any);
              }}
            >
              <View style={[styles.modalActionIcon, { backgroundColor: palette.primaryLight }]}>
                <Ionicons name="person-circle-outline" size={20} color={palette.link} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.modalActionTitle, { color: palette.text }]}>Resident Profile & KYC</Text>
                <Text style={[styles.modalActionSub, { color: palette.textMuted }]}>Manage flat address, family members and documents</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalActionItem, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
              onPress={() => {
                onClose();
                router.push('/governance' as any);
              }}
            >
              <View style={[styles.modalActionIcon, { backgroundColor: palette.successLight }]}>
                <Ionicons name="shield-outline" size={20} color={palette.success} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.modalActionTitle, { color: palette.text }]}>Society Governance & MC</Text>
                <Text style={[styles.modalActionSub, { color: palette.textMuted }]}>Association directory, bye-laws and committee</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalActionItem, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
              onPress={() => {
                onClose();
                Alert.alert(
                  'Switch Property Unit',
                  'If you own or rent multiple units in this community, contact society admin to link additional units to your account.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <View style={[styles.modalActionIcon, { backgroundColor: palette.warningLight }]}>
                <Ionicons name="swap-horizontal" size={20} color={palette.warning} />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.modalActionTitle, { color: palette.text }]}>Switch / Add Another Flat</Text>
                <Text style={[styles.modalActionSub, { color: palette.textMuted }]}>Link multiple flats or properties in this community</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Close button */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.85}>
            <LinearGradient colors={palette.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalDoneBtn}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Home Screen ─────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, hasRole, hasModule, hasPermission, isAdmin, isSuperAdmin, isAnyAdmin } = useAuth();
  const { communityName: tenantCommunityName } = useTenantContext();
  const { palette, isDark, toggleTheme } = useAppTheme();

  // Fresh profile from backend (resolves flatNo, block, tower, fullName, community)
  const { data: dbProfile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: profileService.getProfile,
    staleTime: 30_000,
  });

  const activeUser = dbProfile || user;
  const resolvedCommunityId = activeUser?.communityId ?? user?.communityId;
  const directCommunityName =
    dbProfile?.communityName ||
    user?.communityName ||
    tenantCommunityName ||
    (typeof activeUser?.community === 'object' ? (activeUser?.community as any)?.name : null) ||
    (typeof (user as any)?.community === 'object' ? (user as any)?.community?.name : null);

  const { data: communityDetails } = useQuery({
    queryKey: ['community-details', resolvedCommunityId],
    queryFn: () => authService.getCommunityDetails(Number(resolvedCommunityId)).catch(() => null),
    enabled: Boolean(!directCommunityName && resolvedCommunityId),
    staleTime: 5 * 60_000,
  });

  const isResident = hasRole('RESIDENT', 'OWNER', 'TENANT', 'MEMBER', 'USER');

  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const canUseSos = hasModule('EMERGENCY') || hasModule('SAFETY');

  // Server data - dynamically enabled when user is loaded
  const { data: feedPage, isLoading, isError: feedError, refetch: refetchFeed } = useQuery({
    queryKey: ['home-feed', activeUser?.communityId],
    queryFn: () => feedService.getPosts(0, 20),
    staleTime: 60_000,
    enabled: Boolean(activeUser),
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['home-events', activeUser?.communityId],
    queryFn: () => eventService.getUpcomingEvents(),
    staleTime: 60_000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['home-invoices-overdue'],
    queryFn: () => societyFinanceService.getInvoices('OVERDUE'),
    staleTime: 60_000,
    enabled: isResident && (hasModule('PAYMENTS') || hasModule('FINANCE_MGMT')),
  });

  const { data: unreadNotifsCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount().catch(() => 0),
    refetchInterval: 30_000,
  });

  const { data: openTickets = [] } = useQuery({
    queryKey: ['helpdesk', 'tickets-open'],
    queryFn: () => smartHelpdeskService.getTickets('OPEN').catch(() => []),
    staleTime: 60_000,
  });

  const { data: activePolls } = useQuery({
    queryKey: ['polls', 'active'],
    queryFn: () => pollService.getPolls('ACTIVE').catch(() => ({ content: [], totalElements: 0 } as any)),
    staleTime: 60_000,
  });

  const { data: sportsSummary } = useQuery({
    queryKey: ['home-sports-kpi', activeUser?.communityId],
    queryFn: async () => {
      try {
        const [live, today, tourneys] = await Promise.all([
          sportsService.getFeedLiveMatches(activeUser?.communityId).catch(() => []),
          sportsService.getTodayMatches(activeUser?.communityId).catch(() => []),
          sportsService.getTournaments(undefined, undefined, 0, activeUser?.communityId).catch(() => ({ content: [], totalElements: 0 })),
        ]);
        const liveCount = Array.isArray(live) ? live.length : 0;
        const todayCount = Array.isArray(today) ? today.length : 0;
        const tourneyCount = (tourneys as any)?.totalElements ?? (tourneys as any)?.content?.length ?? (Array.isArray(tourneys) ? tourneys.length : 0);
        return { liveCount, todayCount, tourneyCount };
      } catch {
        return { liveCount: 0, todayCount: 0, tourneyCount: 0 };
      }
    },
    enabled: hasModule('SPORTS'),
    staleTime: 30_000,
  });

  const { data: facilitiesList = [] } = useQuery({
    queryKey: ['home-facilities-kpi', activeUser?.communityId],
    queryFn: () => facilityService.getFacilities().catch(() => []),
    enabled: hasModule('FACILITIES') || hasModule('BOOKINGS'),
    staleTime: 120_000,
  });

  const { data: noticesList = [] } = useQuery({
    queryKey: ['home-notices-kpi', activeUser?.communityId],
    queryFn: () => noticeService.getNotices().catch(() => []),
    enabled: hasModule('NOTICES'),
    staleTime: 60_000,
  });

  // Check if community highlight is explicitly enabled by admin
  const { data: adminSettings } = useQuery({
    queryKey: ['admin-community-settings', resolvedCommunityId],
    queryFn: () => adminService.getCommunitySettings().catch(() => null),
    enabled: Boolean(isAdmin && resolvedCommunityId),
    staleTime: 60_000,
  });

  const { data: cachedHighlightEnabled = false } = useQuery({
    queryKey: ['community-highlight-enabled', resolvedCommunityId],
    queryFn: async () => {
      if (resolvedCommunityId) {
        try {
          const stored = await AsyncStorage.getItem(`@mana/community_highlight_${resolvedCommunityId}`);
          if (stored !== null) return stored === 'true';
        } catch {}
      }
      return false;
    },
    staleTime: 30_000,
  });

  // Highlight banner is hidden by default until explicitly enabled from admin side
  const showCommunityHighlight = Boolean(
    adminSettings?.features?.communityHighlight ??
    adminSettings?.showCommunityHighlight ??
    (communityDetails as any)?.features?.communityHighlight ??
    (communityDetails as any)?.settings?.communityHighlight ??
    (communityDetails as any)?.showCommunityHighlight ??
    (hasModule('COMMUNITY_HIGHLIGHT') && (activeUser?.enabledModules?.length ?? 0) > 0) ??
    cachedHighlightEnabled
  );

  // Real reward balance for the Resident Pass (no balance is shown if unavailable).
  const { data: rewardBalance } = useQuery({
    queryKey: ['home-reward-balance'],
    queryFn: () => paymentsService.rewardBalance(),
    staleTime: 60_000,
    retry: false,
    enabled: isResident && hasModule('PAYMENTS'),
  });
  const passPoints = typeof rewardBalance?.points === 'number' ? rewardBalance.points : undefined;

  const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE');
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.balanceDue ?? 0), 0);
  // Only state dues when we actually know about overdue invoices; never claim "Paid".
  const passDuesLabel = overdueTotal > 0 ? `₹${overdueTotal.toLocaleString('en-IN')} overdue` : undefined;
  const allPosts = feedPage?.content ?? [];
  const announcements = allPosts.filter((p) => p.official || p.postType === 'ANNOUNCEMENT' || p.type === 'ANNOUNCEMENT').slice(0, 2);

  // Check if admin has given this user access to post anything
  const canCreatePost = isSuperAdmin || isAdmin || isAnyAdmin || hasPermission('Create Post') || hasPermission('Create Notice') || hasPermission('Create Poll');

  // Complete feed filter chips matching web (with requested All, Notices, Polls, Community first)
  const filters = [
    { id: 'All',          label: 'All',          icon: 'grid-outline' as const },
    { id: 'Notices',      label: 'Notices',      icon: 'megaphone-outline' as const },
    { id: 'Polls',        label: 'Polls',        icon: 'bar-chart-outline' as const },
    { id: 'Community',    label: 'Community',    icon: 'chatbubbles-outline' as const },
    { id: 'Sports',       label: 'Sports',       icon: 'trophy-outline' as const },
    { id: 'Events',       label: 'Events',       icon: 'calendar-outline' as const },
    { id: 'Classifieds',  label: 'Classifieds',  icon: 'pricetag-outline' as const },
    { id: 'Lost & Found', label: 'Lost & Found', icon: 'search-outline' as const },
    { id: 'Emergency',    label: 'Emergency',    icon: 'alert-circle-outline' as const },
    { id: 'Saved',        label: 'Saved',        icon: 'bookmark-outline' as const },
  ] as const;

  type FilterId = typeof filters[number]['id'];
  const [activeFilter, setActiveFilter] = useState<FilterId>('All');

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'Notices') {
      return allPosts.filter((p) => p.official || p.postType === 'ANNOUNCEMENT' || p.type === 'ANNOUNCEMENT' || p.postType === 'COMMITTEE_NOTICE');
    }
    if (activeFilter === 'Polls') {
      return allPosts.filter((p) => Boolean(p.poll || (p as any).pollQuestion || p.postType === 'POLL' || p.type === 'POLL'));
    }
    if (activeFilter === 'Community') {
      return allPosts.filter((p) => !p.official && p.postType !== 'ANNOUNCEMENT' && p.type !== 'ANNOUNCEMENT' && p.postType !== 'POLL' && p.type !== 'POLL');
    }
    if (activeFilter === 'Sports') {
      return allPosts.filter((p) => p.postType === 'SPORTS' || p.type === 'SPORTS');
    }
    if (activeFilter === 'Events') {
      return allPosts.filter((p) => p.postType === 'EVENT' || p.type === 'EVENT');
    }
    if (activeFilter === 'Classifieds') {
      return allPosts.filter((p) => p.postType === 'CLASSIFIED' || p.type === 'CLASSIFIED');
    }
    if (activeFilter === 'Lost & Found') {
      return allPosts.filter((p) => p.postType === 'LOST_FOUND' || p.type === 'LOST_FOUND');
    }
    if (activeFilter === 'Emergency') {
      return allPosts.filter((p) => p.postType === 'EMERGENCY' || p.type === 'EMERGENCY' || (p as any).priority === 'EMERGENCY');
    }
    if (activeFilter === 'Saved') {
      return allPosts.filter((p) => Boolean(p.bookmarked));
    }
    return allPosts;
  }, [allPosts, activeFilter]);

  const feedPosts = filteredPosts.slice(0, 6);
  const eventsCount = upcomingEvents.length;
  const eventsTodayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return upcomingEvents.filter((e) => e.startDate?.startsWith(today)).length;
  }, [upcomingEvents]);
  const pollsCount = activePolls?.totalElements ?? activePolls?.content?.length ?? 0;
  const ticketsCount = openTickets.length;
  const facilitiesCount = facilitiesList.length > 0 ? facilitiesList.length : 'Book';
  const noticesCount = noticesList.length > 0 ? noticesList.length : (announcements.length > 0 ? announcements.length : 'New');

  const sportsCount = useMemo(() => {
    if (!sportsSummary) return 'Active';
    if (sportsSummary.liveCount > 0) return `${sportsSummary.liveCount} Live`;
    if (sportsSummary.todayCount > 0) return `${sportsSummary.todayCount}`;
    if (sportsSummary.tourneyCount > 0) return `${sportsSummary.tourneyCount}`;
    return 'Active';
  }, [sportsSummary]);

  // Local liked state
  const [liked, setLiked] = useState<Record<string | number, boolean>>({});
  const toggleLike = useCallback((id: string | number) => {
    setLiked((prev) => {
      const current = prev[id] !== undefined
        ? prev[id]
        : Boolean(allPosts.find((p) => p.id === id)?.liked);
      const next = !current;
      if (typeof id === 'number') {
        feedService.likePost(id).catch(() => {});
      }
      return { ...prev, [id]: next };
    });
  }, [allPosts]);

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['profile', 'me'] });
    qc.invalidateQueries({ queryKey: ['home-feed'] });
    qc.invalidateQueries({ queryKey: ['home-events'] });
    qc.invalidateQueries({ queryKey: ['home-invoices-overdue'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    qc.invalidateQueries({ queryKey: ['helpdesk', 'tickets-open'] });
    qc.invalidateQueries({ queryKey: ['polls', 'active'] });
    qc.invalidateQueries({ queryKey: ['gate'] });
    qc.invalidateQueries({ queryKey: ['home-reward-balance'] });
    qc.invalidateQueries({ queryKey: ['feed-live-strip'] });
    qc.invalidateQueries({ queryKey: ['feed-live-recent'] });
    qc.invalidateQueries({ queryKey: ['feed-live-all'] });
    qc.invalidateQueries({ queryKey: ['home-sports-kpi'] });
    qc.invalidateQueries({ queryKey: ['home-facilities-kpi'] });
    qc.invalidateQueries({ queryKey: ['home-notices-kpi'] });
  }, [qc]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: palette.appBg }]}>
        <ActivityIndicator size="large" color={palette.link} />
      </SafeAreaView>
    );
  }

  // Dynamic user, unit and community resolution
  const rawBlock = activeUser?.block || activeUser?.tower;
  const rawFlat = activeUser?.flatNo || activeUser?.flatNumber || (activeUser as any)?.unitNumber;

  const hasCommunity = Boolean(resolvedCommunityId);
  const hasUnit = Boolean(rawBlock || rawFlat);
  let unitDisplay = hasCommunity ? 'Unit not set' : '+ Join Community';
  if (hasCommunity && rawBlock && rawFlat) {
    const cleanBlock = String(rawBlock).replace(/^(block|tower)\s*[-:]?\s*/i, '').trim();
    const cleanFlat = String(rawFlat).replace(new RegExp(`^${cleanBlock}[\\s-_]*`, 'i'), '').trim();
    unitDisplay = `Block - ${cleanBlock} ${cleanFlat}`;
  } else if (hasCommunity && rawBlock) {
    const cleanBlock = String(rawBlock).replace(/^(block|tower)\s*[-:]?\s*/i, '').trim();
    unitDisplay = `Block - ${cleanBlock}`;
  } else if (hasCommunity && rawFlat) {
    const flatStr = String(rawFlat).trim();
    const match = flatStr.match(/^([A-Za-z0-9]+)[\s-_]+(\d+)$/);
    if (match) {
      unitDisplay = `Block - ${match[1]} ${match[2]}`;
    } else {
      unitDisplay = `Block - ${flatStr}`;
    }
  }

  const communityDisplay =
    hasCommunity
      ? directCommunityName ||
        communityDetails?.name ||
        communityDetails?.communityName ||
        'My Community'
      : 'Explore Mana';

  const residentName = activeUser?.fullName || activeUser?.name || user?.fullName || user?.name || activeUser?.email?.split('@')[0] || 'Resident';
  const residentInitials = getInitials(residentName);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.dockBg }]} edges={['top']}>

      {/* ── Top Header (Flush top dock, structured bottom curve matching Footer) ── */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: palette.dockBg,
            borderColor: palette.dockBorder,
          },
        ]}
      >
        <Pressable
          onPress={() => router.push('/tabs/profile' as any)}
          style={[styles.avatarRing, { borderColor: palette.primary, backgroundColor: palette.surface }]}
        >
          <LinearGradient colors={palette.primaryGradient} style={styles.headerAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.headerAvatarText}>{residentInitials}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={styles.headerMeta}
          onPress={() => {
            if (!hasCommunity) {
              setShowJoinModal(true);
            } else {
              setShowUnitModal(true);
            }
          }}
          hitSlop={8}
        >
          <Text style={[styles.headerCommunity, { color: palette.textMuted }]} numberOfLines={1}>{communityDisplay}</Text>
          <View style={styles.headerFlatRow}>
            <Text style={[styles.headerFlat, { color: !hasCommunity ? palette.link : palette.text }]} numberOfLines={1}>{unitDisplay}</Text>
            <Ionicons
              name={!hasCommunity ? 'add-circle-outline' : 'chevron-down'}
              size={13}
              color={!hasCommunity ? palette.link : palette.textMuted}
              style={{ marginLeft: 3 }}
            />
          </View>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.circleActionBtn, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
            onPress={() => router.push('/search' as any)}
            accessibilityLabel="Search community"
          >
            <Ionicons name="search-outline" size={18} color={palette.textSecondary} />
          </Pressable>
          <Pressable
            style={[styles.circleActionBtn, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
            onPress={toggleTheme}
            accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={palette.link} />
          </Pressable>
          <Pressable
            style={[styles.circleActionBtn, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={19} color={palette.textSecondary} />
            {unreadNotifsCount > 0 && (
              <View style={[styles.notifBadge, { borderColor: palette.surface }]}>
                <Text style={styles.notifBadgeText}>{unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}</Text>
              </View>
            )}
          </Pressable>
          {canUseSos && (
            <Pressable
              onPress={() => setShowSosModal(true)}
              accessibilityLabel="Emergency SOS and Safety Modules"
            >
              <LinearGradient
                colors={palette.dangerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sosBtn}
              >
                <View style={styles.sosDot} />
                <Text style={styles.sosBtnText}>SOS</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Scroll Content ── */}
      <View style={[styles.bodyWrap, { backgroundColor: palette.appBg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={palette.link} />}
      >
        {/* Community Highlight / Web LiveStrip — live matches on top; community highlight fallback only when enabled by admin */}
        <LiveMatchesStrip
          communityId={activeUser?.communityId}
          enabled={Boolean(activeUser)}
          fallback={
            showCommunityHighlight ? (
              <CommunityHighlightBanner
                post={announcements[0] || allPosts[0]}
                event={upcomingEvents[0]}
                communityDisplay={communityDisplay}
                visible={showCommunityHighlight}
              />
            ) : null
          }
        />

        {/* Standalone Join Community Banner */}
        {!hasCommunity && (
          <View style={[styles.joinBanner, { backgroundColor: palette.surface, borderColor: palette.primaryBorder }]}>
            <View style={styles.joinBannerRow}>
              <View style={[styles.joinBannerIconBox, { backgroundColor: palette.primaryLight }]}>
                <Ionicons name="business-outline" size={24} color={palette.link} />
              </View>
              <View style={styles.flex1}>
                <View style={styles.joinBadgeRow}>
                  <Text style={[styles.joinBadgeText, { color: palette.link }]}>STANDALONE RESIDENT</Text>
                </View>
                <Text style={[styles.joinBannerTitle, { color: palette.text }]}>Join Your Community</Text>
                <Text style={[styles.joinBannerSub, { color: palette.textMuted }]}>
                  Have an invite code from your society or apartment? Link your unit to unlock security gate passes, visitor approvals, society billing & amenities.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.joinBannerBtnWrap}
              onPress={() => setShowJoinModal(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={palette.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.joinBannerBtn}
              >
                <Ionicons name="key-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.joinBannerBtnText}>Enter Invite Code</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* GateBlocks (Resident/Admin only) */}
        {hasCommunity && (isResident || isAdmin) && hasModule('VISITORS') && (
          <GateBlocks unit={hasUnit ? unitDisplay : undefined} />
        )}

        {/* Resident QR Pass */}
        {hasCommunity && isResident && hasModule('VISITORS') && (
          <ResidentPassCard
            unit={hasUnit ? unitDisplay : undefined}
            residentName={residentName}
            duesLabel={passDuesLabel}
            points={passPoints}
          />
        )}

        {/* KPI Strip */}
        <KpiStrip
          eventsCount={eventsCount}
          eventsTodayCount={eventsTodayCount}
          sportsCount={sportsCount}
          sportsSummary={sportsSummary}
          pollsCount={pollsCount}
          ticketsCount={ticketsCount}
          duesCount={overdueInvoices.length > 0 ? `${overdueInvoices.length} Due` : 'Paid'}
          duesOverdueTotal={overdueTotal}
          facilitiesCount={facilitiesCount}
          noticesCount={noticesCount}
          onOpenPass={() => setShowPassModal(true)}
        />

        {/* Quick Actions Grid */}
        <QuickActionsGrid onOpenSos={() => setShowSosModal(true)} />

        {/* Payments Due */}
        {hasModule('FINANCE_MGMT') && overdueInvoices.length > 0 && (
          <PaymentsDueBanner count={overdueInvoices.length} total={overdueTotal} />
        )}

        {/* Feed section header & filter chips */}
        <View style={styles.feedHeaderRow}>
          <Text style={[styles.feedSectionTitle, { color: palette.text }]}>Community Feed</Text>
          <View style={styles.feedHeaderRightActions}>
            <TouchableOpacity
              onPress={() => router.push('/community/feed' as any)}
              hitSlop={8}
            >
              <Text style={[styles.viewAllText, { color: palette.link }]}>View All</Text>
            </TouchableOpacity>
            {canCreatePost ? (
              <TouchableOpacity
                style={[styles.createPostBtn, { backgroundColor: palette.primaryLight, borderColor: palette.primaryBorder }]}
                onPress={() => setShowCreatePostModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={palette.link} />
                <Text style={[styles.createPostBtnText, { color: palette.link }]}>Create Post</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {filters.map((f) => {
            const isSelected = activeFilter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setActiveFilter(f.id)}
                style={[
                  styles.filterChipBase,
                  !isSelected && [styles.filterChipInactive, { backgroundColor: palette.surface, borderColor: palette.borderLight }],
                ]}
              >
                {isSelected ? (
                  <LinearGradient
                    colors={palette.primaryGradient}
                    style={styles.filterChipActive}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name={f.icon} size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.filterChipTextActive}>{f.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.filterChipInner}>
                    <Ionicons name={f.icon} size={12} color={palette.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={[styles.filterChipTextInactive, { color: palette.textSecondary }]}>{f.label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Feed Posts */}
        {feedPosts.length > 0 ? (
          feedPosts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              liked={liked[post.id] !== undefined ? liked[post.id] : Boolean(post.liked)}
              onLike={() => toggleLike(post.id)}
            />
          ))
        ) : feedError ? (
          <View style={[styles.emptyFeedBox, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
            <Ionicons name="cloud-offline-outline" size={32} color={palette.danger} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyFeedTitle, { color: palette.text }]}>Couldn't load the feed</Text>
            <Text style={[styles.emptyFeedSub, { color: palette.textMuted }]}>Check your connection and try again</Text>
            <TouchableOpacity style={[styles.emptyPostBtn, { backgroundColor: palette.primary }]} onPress={() => refetchFeed()}>
              <Text style={styles.emptyPostBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.emptyFeedBox, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
            <Ionicons name={!hasCommunity ? 'business-outline' : 'chatbubbles-outline'} size={32} color={palette.link} style={{ marginBottom: 6 }} />
            <Text style={[styles.emptyFeedTitle, { color: palette.text }]}>
              {!hasCommunity ? 'Welcome to Mana!' : `No posts in ${activeFilter}`}
            </Text>
            <Text style={[styles.emptyFeedSub, { color: palette.textMuted }]}>
              {!hasCommunity
                ? 'Join your residential community to see neighborhood posts, committee notices and poll discussions.'
                : 'Share an update or question with your neighbors'}
            </Text>
            {!hasCommunity ? (
              <TouchableOpacity
                style={[styles.emptyPostBtn, { backgroundColor: palette.primary }]}
                onPress={() => setShowJoinModal(true)}
              >
                <Text style={styles.emptyPostBtnText}>+ Join a Community</Text>
              </TouchableOpacity>
            ) : canCreatePost ? (
              <TouchableOpacity
                style={[styles.emptyPostBtn, { backgroundColor: palette.primary }]}
                onPress={() => setShowCreatePostModal(true)}
              >
                <Text style={styles.emptyPostBtnText}>+ Create Post</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
      </View>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePostModal}
        initialFilter={activeFilter}
        onClose={() => {
          setShowCreatePostModal(false);
          onRefresh();
        }}
      />

      {/* Unit & Community Dropdown Selector Modal */}
      <UnitSelectorModal
        visible={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        activeUser={activeUser}
        unitDisplay={unitDisplay}
        communityDisplay={communityDisplay}
        residentName={residentName}
      />

      {/* Resident QR Pass Modal */}
      <ResidentPassModal
        visible={showPassModal}
        onClose={() => setShowPassModal(false)}
        unit={hasUnit ? unitDisplay : undefined}
        residentName={residentName}
        communityDisplay={communityDisplay}
        duesLabel={passDuesLabel}
        points={passPoints}
      />

      {/* Emergency SOS & Safety Modules Modal */}
      <EmergencySosModal
        visible={showSosModal}
        onClose={() => setShowSosModal(false)}
        unit={hasUnit ? unitDisplay : undefined}
        tower={rawBlock ? String(rawBlock) : undefined}
        flatNumber={rawFlat ? String(rawFlat) : undefined}
        communityDisplay={communityDisplay}
      />

      {/* Join Community Modal */}
      <JoinCommunityModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['profile', 'me'] });
          onRefresh();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#FFFFFF' },
  bodyWrap:         { flex: 1, backgroundColor: '#FAF8FF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8FF' },
  flex1:            { flex: 1 },
  scrollContent:    { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 24 },
  bottomPad:        { height: 96 },

  // ── Standalone Join Banner ────────────────────────────────────────────────
  joinBanner: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.sm,
  },
  joinBannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  joinBannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBadgeRow: {
    marginBottom: 2,
  },
  joinBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  joinBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  joinBannerSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  joinBannerBtnWrap: {
    marginTop: 4,
  },
  joinBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
  },
  joinBannerBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
    ...SHADOWS.sm,
  } as any,
  avatarRing:        { width: 41, height: 41, borderRadius: 14, padding: 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerAvatar:      { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText:  { color: '#fff', fontSize: 13, fontFamily: FONTS.displayBold },
  headerMeta:        { flex: 1 },
  headerCommunity:   { fontSize: 11.5, color: '#434655', fontFamily: FONTS.medium },
  headerFlatRow:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  headerFlat:        { fontSize: 15, fontWeight: '800', color: '#131B2E', fontFamily: FONTS.displayBold },
  headerRight:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  circleActionBtn:   { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F2F3FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  notifBadge:        { position: 'absolute', top: -2, right: -2, backgroundColor: '#DC2626', borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' },
  notifBadgeText:    { color: '#fff', fontSize: 8.5, fontFamily: FONTS.bold },
  sosBtn:            { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 10, borderRadius: 11, ...SHADOWS.sm } as any,
  sosDot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FCA5A5' },
  sosBtnText:        { color: '#fff', fontSize: 12.5, fontFamily: FONTS.displayBold, letterSpacing: 0.3 },

  // ── GateBlocks ───────────────────────────────────────────────────────────
  gateSection:       { gap: 8, marginBottom: 8 },
  gateCard:          { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 15, borderWidth: 1, borderColor: '#E5EFEC', ...SHADOWS.sm } as any,
  gateCardPending:   { borderColor: '#F59E0B99', borderWidth: 1.2 },
  gateRow:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gateIconBox:       { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  gateInfo:          { flex: 1 },
  gateLabelRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  liveDot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
  gateStatus:        { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.6 },
  gateTitle:         { fontSize: 15, color: '#0D0D2B', fontFamily: FONTS.displayBold },
  gateMeta:          { fontSize: 11.5, color: '#64748B', fontFamily: FONTS.regular, marginTop: 1 },
  gateActions:       { flexDirection: 'row', gap: 8, marginTop: 12 },
  gateBtn:           { flex: 1, borderRadius: 14, overflow: 'hidden' },
  gateBtnGrad:       { paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  gateBtnTextWhite:  { color: '#fff', fontSize: 12.5, fontFamily: FONTS.bold },
  gateBtnDeny:       { backgroundColor: '#FEE2E2', paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  gateBtnTextRed:    { color: '#DC2626', fontSize: 12.5, fontFamily: FONTS.bold },
  gateBtnLeave:      { backgroundColor: '#E6EEEC', paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  gateBtnTextGray:   { color: '#52655F', fontSize: 12, fontFamily: FONTS.regular },
  undoBtn:           { marginTop: 10, alignItems: 'center' },
  undoText:          { color: '#134E41', fontSize: 12, fontFamily: FONTS.bold },

  // ── Sub sections ─────────────────────────────────────────────────────────
  subSection:        { },
  subSectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  subSectionLabel:   { fontSize: 10.5, fontFamily: FONTS.bold, color: '#52655F', letterSpacing: 0.7 },
  subSectionLink:    { fontSize: 11.5, fontFamily: FONTS.bold, color: '#134E41' },
  subSectionMeta:    { fontSize: 11, color: '#64748B', fontFamily: FONTS.medium },

  // Pre-approve
  preApproveGrid:    { flexDirection: 'row', gap: 10 },
  preApproveBtn:     { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E5EFEC', ...SHADOWS.sm } as any,
  preApproveIcon:    { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  preApproveLabel:   { fontSize: 11, color: '#0D0D2B', fontFamily: FONTS.bold },

  // Daily help
  dailyHelpScroll:   { gap: 10, paddingBottom: 2 },
  helpCard:          { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, minWidth: 142, borderWidth: 1, borderColor: '#E5EFEC', ...SHADOWS.sm } as any,
  helpCardTop:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  helpAvatarWrap:    { position: 'relative' },
  helpAvatar:        { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  helpAvatarText:    { color: '#fff', fontSize: 11.5, fontFamily: FONTS.displayBold },
  helpOnlineDot:     { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  helpName:          { fontSize: 12.5, color: '#0D0D2B', fontFamily: FONTS.bold },
  helpRole:          { fontSize: 10.5, color: '#64748B', fontFamily: FONTS.regular },
  helpTimeRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpTime:          { fontSize: 10.5, color: '#64748B', fontFamily: FONTS.regular },
  helpAddBtn:        { minWidth: 96, backgroundColor: '#E6F2EE', borderRadius: 18, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#A7D3C5', borderStyle: 'dashed' } as any,
  helpAddLabel:      { fontSize: 11, color: '#134E41', fontFamily: FONTS.bold },

  // Gate activity
  gateActivityRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 13, gap: 10, borderWidth: 1, borderColor: '#E5EFEC', ...SHADOWS.sm } as any,
  gateActivityInfo:  { flex: 1 },
  gateActivityTitle: { fontSize: 13, color: '#0D0D2B', fontFamily: FONTS.bold, marginTop: 2 },
  moreBtn:           { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText:          { fontSize: 11.5, color: '#134E41', fontFamily: FONTS.bold },
  gateActivityExpanded: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 12, gap: 10, marginTop: 0, borderWidth: 1, borderTopWidth: 1, borderColor: '#E5EFEC' },
  gateActivityItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E5EFEC' },

  // ── Resident Pass ─────────────────────────────────────────────────────────
  passCard:          { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5EFEC', ...SHADOWS.sm } as any,
  passRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passTitle:         { fontSize: 13.5, color: '#0D0D2B', fontFamily: FONTS.bold },
  passMeta:          { fontSize: 11, color: '#64748B', fontFamily: FONTS.regular, marginTop: 1 },
  showQrBtn:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  showQrText:        { color: '#fff', fontSize: 11.5, fontFamily: FONTS.bold },
  qrExpanded:        { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5EFEC' },
  qrBox:             { width: 90, height: 90, backgroundColor: '#FFFFFF', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CDDCD6' },
  qrMeta:            { flex: 1, gap: 6 },
  qrMetaRow:         { fontSize: 12, color: '#475569', fontFamily: FONTS.regular },
  qrPaid:            { color: '#059669', fontFamily: FONTS.bold },
  qrPoints:          { color: '#134E41', fontFamily: FONTS.bold },
  qrGate:            { fontSize: 11, color: '#64748B', fontFamily: FONTS.regular },

  // ── KPI Strip ────────────────────────────────────────────────────────────
  kpiContainer:      { marginBottom: 10 },
  kpiHeaderRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, paddingHorizontal: 2 },
  kpiSectionTitle:   { fontSize: 12, fontFamily: FONTS.semiBold, letterSpacing: 0.2 },
  kpiAdaptivePill:   { paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 10, borderWidth: 1 },
  kpiAdaptiveText:   { fontSize: 9.5, fontFamily: FONTS.semiBold, letterSpacing: 0.2 },
  kpiScroll:         { gap: 9, paddingTop: 6, paddingBottom: 4, paddingHorizontal: 2 },
  kpiChip:           { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#E5EFEC', ...SHADOWS.sm } as any,
  kpiIconBox:        { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiTextBox:        { justifyContent: 'center', minWidth: 40 },
  kpiValue:          { fontSize: 15, color: '#0D0D2B', fontFamily: FONTS.displayBold, lineHeight: 18 },
  kpiLabel:          { fontSize: 10, color: '#64748B', fontFamily: FONTS.medium, marginTop: 1 },
  kpiBadge:          { position: 'absolute', top: -5, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 7, zIndex: 1 },
  kpiBadgeText:      { fontSize: 7.5, color: '#FFFFFF', fontFamily: FONTS.bold, letterSpacing: 0.2 },
  kpiPulseDot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  kpiChipUrgent:     { borderWidth: 1.5, borderColor: '#FCA5A5' },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  qaSection:         { marginBottom: 8 },
  qaSectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  catTabsScroll:     { gap: 6, paddingBottom: 6 },
  catTabBase:        { height: 28, borderRadius: 14, overflow: 'hidden' },
  catTabActive:      { height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 14 },
  catTabInactive:    { height: 28, borderWidth: 1, borderColor: '#E5EFEC', borderRadius: 14 },
  catTabInner:       { height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  catTabTextActive:  { color: '#fff', fontSize: 11, fontFamily: FONTS.bold },
  catTabTextInactive:{ color: '#475569', fontSize: 11, fontFamily: FONTS.bold },
  qaGrid:            { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 11, borderWidth: 1, borderColor: '#E5EFEC', ...SHADOWS.sm } as any,
  qaGridInner:       { flexDirection: 'row', flexWrap: 'wrap' },
  qaItem:            { width: '25%', alignItems: 'center', paddingVertical: 7, gap: 5 },
  qaIconBox:         { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  qaBadge:           { position: 'absolute', top: -5, right: -6, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8 },
  qaBadgeText:       { color: '#fff', fontSize: 7, fontFamily: FONTS.bold },
  qaLabel:           { fontSize: 10.5, color: '#475569', textAlign: 'center', fontFamily: FONTS.bold, lineHeight: 13, maxWidth: 72 },
  qaShowMore:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5EFEC' },
  qaShowMoreText:    { color: '#134E41', fontSize: 12, fontFamily: FONTS.bold },

  // ── Payments Due ──────────────────────────────────────────────────────────
  dueBanner:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF2F2', borderRadius: 18, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FECACA' },
  dueLeft:           { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dueTitle:          { fontSize: 13, fontFamily: FONTS.bold, color: '#991B1B' },
  dueAmount:         { fontSize: 12, color: '#B91C1C', fontFamily: FONTS.regular, marginTop: 2 },
  payNowBtn:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  payNowText:        { color: '#fff', fontSize: 13, fontFamily: FONTS.bold },

  // ── Announcement Banner ───────────────────────────────────────────────────
  announcementBanner:       { backgroundColor: '#0F3D33', borderRadius: 20, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#1E6353', overflow: 'hidden' },
  announcementBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  announcementBannerIcon:   { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(251,191,36,0.2)', alignItems: 'center', justifyContent: 'center' },
  announcementBannerEyebrow:{ fontSize: 10, fontFamily: FONTS.bold, color: '#FBBF24', letterSpacing: 0.5 },
  announcementBannerTitle:  { fontSize: 14.5, color: '#FFFFFF', fontFamily: FONTS.displayBold, lineHeight: 20, marginBottom: 4 },
  announcementBannerMeta:   { fontSize: 11.5, color: '#CBD5E1', fontFamily: FONTS.regular },

  // ── Feed Header & Filter Chips ───────────────────────────────────────────
  feedHeaderRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 6 },
  feedHeaderRightActions:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedSectionTitle:      { fontSize: 16, fontFamily: FONTS.displayBold, color: '#0D0D2B' },
  createPostBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E6F2EE', paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: 12, borderWidth: 1 },
  createPostBtnText:     { fontSize: 11.5, color: '#134E41', fontFamily: FONTS.bold },
  filterChipsScroll:     { gap: 6, paddingBottom: 6, marginBottom: 2 },
  filterChipBase:        { height: 28, borderRadius: 14, overflow: 'hidden' },
  filterChipActive:      { height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11, borderRadius: 14 },
  filterChipInactive:    { height: 28, borderWidth: 1, borderColor: '#E5EFEC', borderRadius: 14 },
  filterChipInner:       { height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  filterChipTextActive:  { color: '#fff', fontSize: 11.5, fontFamily: FONTS.bold },
  filterChipTextInactive:{ color: '#475569', fontSize: 11.5, fontFamily: FONTS.bold },

  // ── Feed Post Cards ───────────────────────────────────────────────────────
  feedCard:            { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5EFEC', ...SHADOWS.sm } as any,
  feedCardHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  feedAvatar:          { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  feedAvatarImage:     { width: 38, height: 38, borderRadius: 19 },
  feedAvatarText:      { color: '#fff', fontSize: 12.5, fontFamily: FONTS.displayBold },
  feedAuthorRow:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  feedAuthorName:      { fontSize: 14, color: '#0D0D2B', fontFamily: FONTS.bold, flexShrink: 1 },
  feedPostTime:        { fontSize: 11, color: '#64748B', fontFamily: FONTS.regular, marginTop: 1 },
  feedOfficialBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#E6F2EE', borderWidth: 1, borderColor: '#A7D3C5' },
  feedOfficialText:    { fontSize: 10, color: '#134E41', fontFamily: FONTS.bold },
  feedContent:         { fontSize: 14, color: '#334155', lineHeight: 20, fontFamily: FONTS.regular, marginBottom: 12 },
  feedActions:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#E5EFEC', paddingTop: 10 },
  feedActionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F3F7F5' },
  feedActionText:      { fontSize: 11, color: '#64748B', fontFamily: FONTS.regular },
  viewAllText:         { fontSize: 11.5, color: '#134E41', fontFamily: FONTS.bold },

  // ── Empty Feed ────────────────────────────────────────────────────────────
  emptyFeedBox:        { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  emptyFeedTitle:      { fontSize: 14, fontFamily: FONTS.bold, color: '#0F172A', marginBottom: 4 },
  emptyFeedSub:        { fontSize: 12, fontFamily: FONTS.regular, color: '#94A3B8', textAlign: 'center', marginBottom: 12 },
  emptyPostBtn:        { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  emptyPostBtnText:    { color: '#fff', fontSize: 12, fontFamily: FONTS.bold },

  // ── Extra Feed Card Styles ───────────────────────────────────────────────
  feedPostTitle:       { fontSize: 14, fontFamily: FONTS.bold, color: '#0F172A', marginBottom: 6 },
  roleBadge:           { backgroundColor: '#EEF2FF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 4 },
  roleBadgeText:       { fontSize: 9, fontFamily: FONTS.bold, color: '#4F46E5', textTransform: 'uppercase' },
  postMediaWrap:       { borderRadius: 12, overflow: 'hidden', marginBottom: 12, backgroundColor: '#F1F5F9' },
  postImage:           { width: '100%', height: 180, borderRadius: 12 },
  pollContainer:       { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginBottom: 12, gap: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  pollOptionBox:       { backgroundColor: '#FFFFFF', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1', minHeight: 36, justifyContent: 'center' },
  pollOptionBoxSelected:{ borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  pollProgressFill:    { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#E0E7FF' },
  pollOptionContent:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  pollOptionText:      { fontSize: 12, fontFamily: FONTS.bold, color: '#334155', flex: 1 },
  pollOptionTextSelected:{ color: '#4F46E5' },
  pollVoteCount:       { fontSize: 11, fontFamily: FONTS.bold, color: '#64748B', marginLeft: 8 },
  pollTotalText:       { fontSize: 10, color: '#94A3B8', fontFamily: FONTS.regular, marginTop: 2, textAlign: 'right' },

  // ── QR Pass Extra Meta ───────────────────────────────────────────────────
  qrMetaName:          { fontSize: 13, color: '#0F172A', fontFamily: FONTS.bold },
  qrBoldText:          { color: '#0F172A', fontFamily: FONTS.bold },

  // ── Unit Selector Modal ──────────────────────────────────────────────────
  modalOverlay:        { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalSheet:          { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:          { fontSize: 17, fontFamily: FONTS.bold, color: '#0F172A' },
  modalSubtitle:       { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginTop: 2 },
  modalCloseBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalActiveCard:     { borderRadius: 16, padding: 16, marginBottom: 16 },
  modalActiveCardTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalCommunityPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  modalCommunityPillText:{ fontSize: 9, fontFamily: FONTS.bold, color: '#FDE047', letterSpacing: 0.5 },
  modalVerifiedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  modalVerifiedText:   { fontSize: 10, fontFamily: FONTS.bold, color: '#34D399' },
  modalCommName:       { fontSize: 18, fontFamily: FONTS.bold, color: '#FFFFFF', marginBottom: 2 },
  modalUnitText:       { fontSize: 13, fontFamily: FONTS.regular, color: '#C7D2FE', marginBottom: 12 },
  modalResidentRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  modalAvatarBox:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalAvatarText:     { color: '#FFFFFF', fontSize: 13, fontFamily: FONTS.bold },
  modalResidentName:   { fontSize: 14, fontFamily: FONTS.bold, color: '#FFFFFF' },
  modalResidentRole:   { fontSize: 11, fontFamily: FONTS.regular, color: '#A5B4FC', marginTop: 1 },
  modalActiveDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  modalActionsList:    { gap: 10, marginBottom: 16 },
  modalActionItem:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  modalActionIcon:     { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalActionTitle:    { fontSize: 13, fontFamily: FONTS.bold, color: '#0F172A' },
  modalActionSub:      { fontSize: 11, fontFamily: FONTS.regular, color: '#64748B', marginTop: 2 },
  modalDoneBtn:        { backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalDoneBtnText:    { color: '#FFFFFF', fontSize: 14, fontFamily: FONTS.bold },

  // ── Resident Pass Modal ──────────────────────────────────────────────────
  qrModalSheet:          { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, width: '100%' },
  modalQrContainer:      { alignItems: 'center', width: '100%', marginVertical: 12 },
  modalQrBox:            { width: 170, height: 170, backgroundColor: '#FFFFFF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#E2E8F0', padding: 12, ...SHADOWS.sm } as any,
  modalQrName:           { fontSize: 17, fontFamily: FONTS.bold, color: '#0F172A', marginTop: 12 },
  modalQrBadgeRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  modalQrBadgeVerified:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  modalQrBadgeVerifiedText:{ fontSize: 11, fontFamily: FONTS.bold, color: '#059669' },
  modalQrBadgeUnit:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#C7D2FE' },
  modalQrBadgeUnitText:  { fontSize: 11, fontFamily: FONTS.bold, color: '#4F46E5' },
  modalQrInfoTable:      { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginTop: 16, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  modalQrInfoRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalQrInfoLabel:      { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B' },
  modalQrInfoValue:      { fontSize: 12, fontFamily: FONTS.bold, color: '#0F172A' },
  modalQrInfoValuePaid:  { fontSize: 12, fontFamily: FONTS.bold, color: '#059669' },
  modalQrInfoValuePoints:{ fontSize: 12, fontFamily: FONTS.bold, color: '#4F46E5' },
});
