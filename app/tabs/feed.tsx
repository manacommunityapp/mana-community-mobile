import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Alert,
  Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { feedService } from '@/services/feedService';
import { eventService } from '@/services/eventService';
import { facilityService } from '@/services/facilityService';
import { societyFinanceService } from '@/services/societyFinanceService';
import { visitorService } from '@/services/visitorService';
import { notificationService } from '@/services/notificationService';
import { insightsService } from '@/services/insightsService';
import { profileService } from '@/services/profileService';
import { authService } from '@/services/authService';
import { smartHelpdeskService } from '@/services/smartHelpdeskService';
import { pollService } from '@/services/pollService';
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { resolveImageUrl, resolveUserAvatar } from '@/utils/imageUrlUtils';
import type { PostDto, EventDto } from '@/types/api';

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ─── Types ────────────────────────────────────────────────────────────────────

type GateReq = 'pending' | 'allowed' | 'denied';
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
  { id: 'emergency',      icon: 'alert-circle-outline',       label: 'Emergency SOS',  color: '#DC2626', cat: 'Safety & Help',      badge: '24x7', route: '/emergency', module: 'EMERGENCY' },
  { id: 'visitors',       icon: 'shield-checkmark-outline',   label: 'Visitors Gate',  color: '#0891B2', cat: 'Safety & Help',      route: '/visitors', module: 'VISITORS' },
  { id: 'turnstiles',     icon: 'qr-code-outline',            label: 'Turnstiles',     color: '#0284C7', cat: 'Safety & Help',      route: '/access/turnstiles', module: 'VISITORS' },
  { id: 'helpdesk',       icon: 'headset-outline',            label: 'Helpdesk',       color: '#D97706', cat: 'Safety & Help',      route: '/helpdesk', module: 'HELPDESK' },
  { id: 'insta_help',     icon: 'flash-outline',              label: 'Insta-Help',     color: '#D97706', cat: 'Safety & Help',      badge: '15m', route: '/services', module: 'SERVICE_PLATFORM' },
  { id: 'health',         icon: 'medkit-outline',             label: 'Health',         color: '#0D9488', cat: 'Safety & Help',      route: '/health', module: 'SAFETY' },
  { id: 'health_buddy',   icon: 'nutrition-outline',          label: 'Health Buddy',   color: '#10B981', cat: 'Safety & Help',      badge: 'NEW', route: '/wellness', module: 'SAFETY' },
  { id: 'ai_chat',        icon: 'sparkles-outline',           label: 'Mana AI',        color: '#6366F1', cat: 'Safety & Help',      badge: 'AI',  route: '/ai-chat', module: 'SAFETY' },
  { id: 'dues',           icon: 'card-outline',               label: 'Dues',           color: '#4F46E5', cat: 'Living & Bills',     route: '/finance', module: 'FINANCE_MGMT' },
  { id: 'mana_pay',       icon: 'flash-outline',              label: 'Mana Pay',       color: '#2563EB', cat: 'Living & Bills',     badge: 'BBPS', route: '/bbps', module: 'PAYMENTS' },
  { id: 'recharge',       icon: 'phone-portrait-outline',     label: 'Recharge',       color: '#0284C7', cat: 'Living & Bills',     badge: 'NEW', route: '/recharge', module: 'PAYMENTS' },
  { id: 'my_money',       icon: 'wallet-outline',             label: 'My Money',       color: '#059669', cat: 'Living & Bills',     badge: 'NEW', route: '/personal-finance', module: 'PERSONAL_FINANCE' },
  { id: 'society_erp',    icon: 'business-outline',           label: 'Society ERP',    color: '#4F46E5', cat: 'Living & Bills',     badge: 'ERP', route: '/finance/society-dashboard', module: 'FINANCE_MGMT', roles: ['SUPER_ADMIN', 'ADMIN', 'COMMUNITY_ADMIN', 'FINANCE_ADMIN'] },
  { id: 'budget',         icon: 'bar-chart-outline',          label: 'Budgeting',      color: '#EA580C', cat: 'Living & Bills',     route: '/finance/budget', module: 'FINANCE_MGMT' },
  { id: 'parking',        icon: 'car-outline',                label: 'Parking',        color: '#4338CA', cat: 'Living & Bills',     route: '/parking', module: 'VISITORS' },
  { id: 'home_services',  icon: 'construct-outline',          label: 'Home Services',  color: '#DB2777', cat: 'Living & Bills',     route: '/home-services', module: 'SERVICE_PLATFORM' },
  { id: 'inventory',      icon: 'cube-outline',               label: 'Inventory',      color: '#D97706', cat: 'Facilities',         badge: 'NEW', route: '/inventory', module: 'FACILITIES' },
  { id: 'amc',            icon: 'construct-outline',          label: 'AMC & Assets',   color: '#16A34A', cat: 'Facilities',         badge: 'AMC', route: '/amc', module: 'FACILITIES' },
  { id: 'automation',     icon: 'hardware-chip-outline',      label: 'Smart Home',     color: '#7C3AED', cat: 'Facilities',         badge: 'IoT', route: '/automation', module: 'FACILITIES' },
  { id: 'submeters',      icon: 'speedometer-outline',        label: 'Sub-Meters',     color: '#059669', cat: 'Facilities',         route: '/iot/meters', module: 'FACILITIES' },
  { id: 'projects',       icon: 'hammer-outline',             label: 'Projects',       color: '#7C3AED', cat: 'Facilities',         badge: 'NEW', route: '/projects', module: 'COMMUNITY_MGMT' },
  { id: 'property_os',    icon: 'home-outline',               label: 'Property OS',    color: '#059669', cat: 'Facilities',         badge: 'NEW', route: '/cpos', module: 'FACILITIES' },
  { id: 'sports',         icon: 'trophy-outline',             label: 'Sports',         color: '#059669', cat: 'Social & Sports',    route: '/sports', module: 'SPORTS' },
  { id: 'events',         icon: 'calendar-outline',           label: 'Events',         color: '#4F46E5', cat: 'Social & Sports',    route: '/events', module: 'EVENTS' },
  { id: 'commute',        icon: 'car-sport-outline',          label: 'Commute',        color: '#0284C7', cat: 'Social & Sports',    route: '/commute', module: 'TRIPS' },
  { id: 'governance',     icon: 'business-outline',           label: 'Governance',     color: '#7C3AED', cat: 'Social & Sports',    badge: 'NEW', route: '/governance', module: 'COMMUNITY_MGMT' },
  { id: 'academy',        icon: 'school-outline',             label: 'Academy',        color: '#9333EA', cat: 'Social & Sports',    badge: 'NEW', route: '/academy', module: 'ACADEMY' },
  { id: 'jobs',           icon: 'megaphone-outline',          label: 'Job Board',      color: '#7C3AED', cat: 'Social & Sports',    badge: 'NEW', route: '/jobs', module: 'JOBS' },
  { id: 'polls',          icon: 'bar-chart-outline',          label: 'Polls & Votes',  color: '#7C3AED', cat: 'Social & Sports',    route: '/polls', module: 'POLLS' },
  { id: 'pets',           icon: 'paw-outline',                label: 'Pet Care',       color: '#9333EA', cat: 'Social & Sports',    route: '/pets', module: 'COMMUNITY_FEED' },
  { id: 'marketplace',    icon: 'storefront-outline',         label: 'Marketplace',    color: '#059669', cat: 'Commerce & Food',    route: '/marketplace', module: 'MARKETPLACE' },
  { id: 'offers',         icon: 'pricetag-outline',           label: 'Offers',         color: '#D97706', cat: 'Commerce & Food',    badge: 'NEW', route: '/offers', module: 'MARKETPLACE' },
  { id: 'group_buying',   icon: 'bag-handle-outline',         label: 'Group Buy',      color: '#059669', cat: 'Commerce & Food',    route: '/group-buying', module: 'GROUP_BUYING' },
  { id: 'lost_found',     icon: 'search-outline',             label: 'Lost & Found',   color: '#DC2626', cat: 'Commerce & Food',    route: '/marketplace/lost-found', module: 'MARKETPLACE' },
];

// ─── KPI Chips Data ───────────────────────────────────────────────────────────

type KpiItem = { label: string; icon: IoniconsName; color: string; route?: string; isPass?: boolean; module?: string };
const KPI_ITEMS: KpiItem[] = [
  { label: 'Events',     icon: 'calendar-outline',       color: '#4F46E5', route: '/events',   module: 'EVENTS' },
  { label: 'Polls',      icon: 'bar-chart-outline',      color: '#7C3AED', route: '/polls',    module: 'POLLS' },
  { label: 'Tickets',    icon: 'headset-outline',        color: '#0891B2', route: '/helpdesk', module: 'HELPDESK' },
  { label: 'Pass',       icon: 'qr-code-outline',        color: '#4F46E5', isPass: true,       module: 'VISITORS' },
];

// ─── Mock Daily Help ──────────────────────────────────────────────────────────

const DAILY_HELP = [
  { id: 1, name: 'Lakshmi', role: 'Maid',   time: 'In · 8:10 AM',    inside: true,  initials: 'LK' },
  { id: 2, name: 'Ramu',    role: 'Cook',   time: 'Expected 6:30 PM', inside: false, initials: 'RM' },
  { id: 3, name: 'Kiran',   role: 'Driver', time: 'Out · 9:05 AM',   inside: false, initials: 'KR' },
];

// ─── Pre-approve buttons ──────────────────────────────────────────────────────

type PreApprove = { label: string; icon: IoniconsName; color: string; route: string };
const PRE_APPROVE: PreApprove[] = [
  { label: 'Guest',    icon: 'person-add-outline',  color: '#4F46E5', route: '/visitors' },
  { label: 'Delivery', icon: 'bag-handle-outline',  color: '#D97706', route: '/visitors' },
  { label: 'Cab',      icon: 'car-outline',          color: '#0284C7', route: '/visitors' },
  { label: 'Service',  icon: 'construct-outline',   color: '#DB2777', route: '/visitors' },
];

// ─── GateBlocks ───────────────────────────────────────────────────────────────

function GateBlocks({ unit }: { unit?: string }) {
  const router = useRouter();
  const [req, setReq] = useState<GateReq>('pending');
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.gateSection}>
      {/* Live gate approval card */}
      <View style={[styles.gateCard, req === 'pending' && styles.gateCardPending]}>
        <View style={styles.gateRow}>
          <View style={[styles.gateIconBox, { backgroundColor: '#D9770622' }]}>
            <Ionicons name="bag-handle-outline" size={22} color="#D97706" />
          </View>
          <View style={styles.gateInfo}>
            <View style={styles.gateLabelRow}>
              {req === 'pending' && <View style={styles.liveDot} />}
              <Text style={[styles.gateStatus, { color: req === 'pending' ? '#D97706' : req === 'allowed' ? '#059669' : '#DC2626' }]}>
                {req === 'pending' ? 'AT THE GATE NOW' : req === 'allowed' ? 'ALLOWED' : 'DENIED'}
              </Text>
            </View>
            <Text style={styles.gateTitle}>Zomato · Arjun K.</Text>
            <Text style={styles.gateMeta}>Food delivery for {unit ?? 'your flat'} · Just now</Text>
          </View>
        </View>
        {req === 'pending' ? (
          <View style={styles.gateActions}>
            <Pressable
              onPress={() => setReq('allowed')}
              style={[styles.gateBtn, { backgroundColor: '#05966922' }]}
            >
              <LinearGradient colors={['#059669', '#10B981']} style={styles.gateBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.gateBtnTextWhite}>Allow</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setReq('denied')} style={[styles.gateBtn, styles.gateBtnDeny]}>
              <Text style={styles.gateBtnTextRed}>Deny</Text>
            </Pressable>
            <Pressable onPress={() => setReq('allowed')} style={[styles.gateBtn, styles.gateBtnLeave]}>
              <Text style={styles.gateBtnTextGray}>Leave at gate</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setReq('pending')} style={styles.undoBtn}>
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        )}
      </View>

      {/* Pre-approve row */}
      <View style={styles.subSection}>
        <View style={styles.subSectionHeader}>
          <Text style={styles.subSectionLabel}>PRE-APPROVE</Text>
          <TouchableOpacity onPress={() => router.push('/visitors' as any)}>
            <Text style={styles.subSectionLink}>All visitors</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.preApproveGrid}>
          {PRE_APPROVE.map((p) => (
            <Pressable
              key={p.label}
              style={styles.preApproveBtn}
              onPress={() => router.push(p.route as any)}
            >
              <View style={[styles.preApproveIcon, { backgroundColor: p.color + '1F' }]}>
                <Ionicons name={p.icon} size={20} color={p.color} />
              </View>
              <Text style={styles.preApproveLabel}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Daily help horizontal scroll */}
      <View style={styles.subSection}>
        <View style={styles.subSectionHeader}>
          <Text style={styles.subSectionLabel}>MY DAILY HELP</Text>
          <Text style={styles.subSectionMeta}>{DAILY_HELP.filter((h) => h.inside).length} inside</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dailyHelpScroll}
        >
          {DAILY_HELP.map((h) => (
            <View key={h.id} style={styles.helpCard}>
              <View style={styles.helpCardTop}>
                <View style={styles.helpAvatarWrap}>
                  <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    style={styles.helpAvatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.helpAvatarText}>{h.initials}</Text>
                  </LinearGradient>
                  <View style={[styles.helpOnlineDot, { backgroundColor: h.inside ? '#10B981' : '#94A3B8' }]} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.helpName} numberOfLines={1}>{h.name}</Text>
                  <Text style={styles.helpRole}>{h.role}</Text>
                </View>
              </View>
              <View style={styles.helpTimeRow}>
                <Ionicons name="time-outline" size={11} color="#94A3B8" />
                <Text style={styles.helpTime}>{h.time}</Text>
              </View>
            </View>
          ))}
          <Pressable style={styles.helpAddBtn} onPress={() => router.push('/household' as any)}>
            <Ionicons name="person-add-outline" size={18} color="#4F46E5" />
            <Text style={styles.helpAddLabel}>Add help</Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Gate activity row */}
      <Pressable style={styles.gateActivityRow} onPress={() => setExpanded((v) => !v)}>
        <View style={[styles.gateIconBox, { backgroundColor: '#05966922' }]}>
          <Ionicons name="log-in-outline" size={18} color="#059669" />
        </View>
        <View style={styles.gateActivityInfo}>
          <Text style={styles.subSectionLabel}>TODAY AT THE GATE</Text>
          <Text style={styles.gateActivityTitle}>Lakshmi (Maid) entered</Text>
        </View>
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.moreBtn}>
          <Text style={styles.moreText}>{expanded ? 'Less' : 'More'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color="#6366F1" />
        </Pressable>
      </Pressable>
      {expanded && (
        <View style={styles.gateActivityExpanded}>
          {[
            { icon: 'bag-handle-outline' as IoniconsName, color: '#D97706', t: 'Swiggy delivery left at gate', s: '9:32 AM · Guard Ramesh' },
            { icon: 'log-out-outline' as IoniconsName, color: '#0284C7', t: 'Kiran (Driver) exited', s: '9:05 AM · Gate 2' },
          ].map((l, i) => (
            <View key={i} style={styles.gateActivityItem}>
              <View style={[styles.gateIconBox, { backgroundColor: l.color + '22', width: 36, height: 36 }]}>
                <Ionicons name={l.icon} size={16} color={l.color} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.gateActivityTitle}>{l.t}</Text>
                <Text style={styles.gateMeta}>{l.s}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Resident QR Pass Card ────────────────────────────────────────────────────

function ResidentPassCard({ unit, residentName }: { unit?: string; residentName?: string }) {
  const [showPass, setShowPass] = useState(false);
  return (
    <View style={styles.passCard}>
      <View style={styles.passRow}>
        <View style={[styles.gateIconBox, { backgroundColor: '#4F46E51F' }]}>
          <Ionicons name="qr-code-outline" size={18} color="#4F46E5" />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.passTitle}>Resident pass</Text>
          <Text style={styles.passMeta}>{unit ?? 'Unit Assigned'} · Verified</Text>
        </View>
        <Pressable onPress={() => setShowPass((v) => !v)}>
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            style={styles.showQrBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.showQrText}>{showPass ? 'Hide' : 'Show QR'}</Text>
          </LinearGradient>
        </Pressable>
      </View>
      {showPass && (
        <View style={styles.qrExpanded}>
          <View style={styles.qrBox}>
            <Ionicons name="qr-code" size={72} color="#0F172A" />
          </View>
          <View style={styles.qrMeta}>
            {residentName ? <Text style={styles.qrMetaName}>{residentName}</Text> : null}
            <Text style={styles.qrMetaRow}>Unit: <Text style={styles.qrBoldText}>{unit ?? 'Assigned'}</Text></Text>
            <Text style={styles.qrMetaRow}>Dues <Text style={styles.qrPaid}>Paid</Text></Text>
            <Text style={styles.qrMetaRow}>Mana Points <Text style={styles.qrPoints}>2,480</Text></Text>
            <Text style={styles.qrGate}>Show this at the gate</Text>
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
}: {
  visible: boolean;
  onClose: () => void;
  unit?: string;
  residentName?: string;
  communityDisplay?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.qrModalSheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Resident Gate Pass</Text>
              <Text style={styles.modalSubtitle}>Present this QR at security check-post</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* QR Container */}
          <View style={styles.modalQrContainer}>
            <View style={styles.modalQrBox}>
              <Ionicons name="qr-code" size={130} color="#0F172A" />
            </View>
            {residentName ? <Text style={styles.modalQrName}>{residentName}</Text> : null}

            <View style={styles.modalQrBadgeRow}>
              <View style={styles.modalQrBadgeVerified}>
                <Ionicons name="shield-checkmark" size={13} color="#059669" />
                <Text style={styles.modalQrBadgeVerifiedText}>Verified Resident</Text>
              </View>
              <View style={styles.modalQrBadgeUnit}>
                <Ionicons name="home-outline" size={13} color="#4F46E5" />
                <Text style={styles.modalQrBadgeUnitText}>{unit ?? 'Unit Assigned'}</Text>
              </View>
            </View>

            <View style={styles.modalQrInfoTable}>
              <View style={styles.modalQrInfoRow}>
                <Text style={styles.modalQrInfoLabel}>Community</Text>
                <Text style={styles.modalQrInfoValue}>{communityDisplay ?? 'Mana Community'}</Text>
              </View>
              <View style={styles.modalQrInfoRow}>
                <Text style={styles.modalQrInfoLabel}>Maintenance Dues</Text>
                <Text style={styles.modalQrInfoValuePaid}>Paid · Up to date</Text>
              </View>
              <View style={styles.modalQrInfoRow}>
                <Text style={styles.modalQrInfoLabel}>Mana Points</Text>
                <Text style={styles.modalQrInfoValuePoints}>2,480 pts</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.modalDoneBtn} onPress={onClose}>
            <Text style={styles.modalDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiStrip({
  eventsCount,
  pollsCount,
  ticketsCount,
  onOpenPass,
}: {
  eventsCount: number;
  pollsCount: number;
  ticketsCount: number;
  onOpenPass?: () => void;
}) {
  const router = useRouter();
  const { hasModule, isSuperAdmin } = useAuth();

  const visibleKpis = useMemo(() => {
    const all = [
      { item: KPI_ITEMS[0], value: eventsCount },
      { item: KPI_ITEMS[1], value: pollsCount },
      { item: KPI_ITEMS[2], value: ticketsCount },
      { item: KPI_ITEMS[3], value: 'QR' },
    ];
    return all.filter(({ item }) => isSuperAdmin || !item.module || hasModule(item.module));
  }, [eventsCount, pollsCount, ticketsCount, hasModule, isSuperAdmin]);

  if (visibleKpis.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.kpiScroll}
    >
      {visibleKpis.map(({ item: k, value }) => (
        <Pressable
          key={k.label}
          style={styles.kpiChip}
          onPress={() => {
            if (k.isPass) {
              onOpenPass?.();
            } else if (k.route) {
              router.push(k.route as any);
            }
          }}
        >
          <View style={[styles.kpiIconBox, { backgroundColor: k.color + '1F' }]}>
            <Ionicons name={k.icon} size={18} color={k.color} />
          </View>
          <View>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiLabel}>{k.label}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Quick Actions Grid ───────────────────────────────────────────────────────

function QuickActionsGrid() {
  const router = useRouter();
  const { hasModule, hasRole, hasPermission, isSuperAdmin } = useAuth();
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
      Alert.alert(
        'Emergency SOS',
        'This will alert security and all emergency contacts. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send SOS', style: 'destructive', onPress: () => router.push('/emergency' as any) },
        ],
      );
      return;
    }
    if (a.route) router.push(a.route as any);
  };

  if (filteredActions.length === 0) return null;

  return (
    <View style={styles.qaSection}>
      <View style={styles.qaSectionHeader}>
        <Text style={styles.subSectionLabel}>QUICK ACTIONS</Text>
        <Text style={styles.subSectionMeta}>{filteredActions.length} services</Text>
      </View>
      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catTabsScroll}
      >
        {availableCats.map((c) => (
          <Pressable
            key={c}
            onPress={() => { setCat(c); setShowAll(false); }}
            style={activeCat === c ? undefined : styles.catTabInactive}
          >
            {activeCat === c ? (
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.catTabActive} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.catTabTextActive}>{c}</Text>
              </LinearGradient>
            ) : (
              <Text style={styles.catTabTextInactive}>{c}</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>
      {/* Grid */}
      <View style={styles.qaGrid}>
        <View style={styles.qaGridInner}>
          {visible.map((a) => (
            <Pressable key={a.id} style={styles.qaItem} onPress={() => handleAction(a)}>
              <View style={[styles.qaIconBox, { backgroundColor: a.color + '1A', borderColor: a.color + '26' }]}>
                <Ionicons name={a.icon} size={24} color={a.color} />
                {a.badge && (
                  <View style={[styles.qaBadge, { backgroundColor: a.color }]}>
                    <Text style={styles.qaBadgeText}>{a.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.qaLabel} numberOfLines={2}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
        {catActions.length > 8 && (
          <Pressable style={styles.qaShowMore} onPress={() => setShowAll((v) => !v)}>
            <Text style={styles.qaShowMoreText}>
              {showAll ? 'Show less' : `See all ${catActions.length}`}
            </Text>
            <Ionicons name={showAll ? 'chevron-up' : 'chevron-forward'} size={12} color="#6366F1" />
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

// ─── Announcement Banner ──────────────────────────────────────────────────────

function AnnouncementBanner({ post }: { post: PostDto }) {
  const router = useRouter();
  const title = post.title || post.content;
  const subtitle = post.title ? post.content : (post.authorName ? `Posted by ${post.authorName}` : '');

  return (
    <Pressable
      style={styles.announcementBanner}
      onPress={() => router.push(`/community/feed` as any)}
    >
      <View style={styles.announcementBannerHeader}>
        <View style={styles.announcementBannerIcon}>
          <Ionicons name="trophy-outline" size={14} color="#FBBF24" />
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
  const initials = (post.authorName ?? '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const gradColors: [string, string] = post.official ? ['#4F46E5', '#7C3AED'] : ['#EC4899', '#F43F5E'];
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
    <View style={styles.feedCard}>
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
            <Text style={styles.feedAuthorName} numberOfLines={1}>{post.authorName}</Text>
            {post.official && <Ionicons name="checkmark-circle" size={14} color="#4F46E5" />}
            {post.authorRole && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{post.authorRole}</Text>
              </View>
            )}
          </View>
          {authorSubtitle ? <Text style={styles.feedPostTime}>{authorSubtitle}</Text> : null}
        </View>
        {post.official && (
          <View style={styles.feedOfficialBadge}>
            <Text style={styles.feedOfficialText}>Official</Text>
          </View>
        )}
      </View>

      {/* Title */}
      {post.title ? (
        <Text style={styles.feedPostTitle}>{post.title}</Text>
      ) : null}

      {/* Body */}
      <Text style={styles.feedContent} numberOfLines={4}>{post.content}</Text>

      {/* Image Attachment */}
      {displayImage ? (
        <View style={styles.postMediaWrap}>
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
        <View style={styles.pollContainer}>
          {post.poll.options.map((opt) => {
            const isSelected = votedOption === opt.id;
            const pct = post.poll!.totalVotes > 0 ? Math.round((opt.voteCount / post.poll!.totalVotes) * 100) : 0;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.pollOptionBox, isSelected && styles.pollOptionBoxSelected]}
                onPress={() => setVotedOption(opt.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.pollProgressFill, { width: `${pct}%` }]} />
                <View style={styles.pollOptionContent}>
                  <Text style={[styles.pollOptionText, isSelected && styles.pollOptionTextSelected]}>
                    {opt.text}
                  </Text>
                  <Text style={styles.pollVoteCount}>
                    {opt.voteCount} ({pct}%)
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <Text style={styles.pollTotalText}>
            {post.poll.totalVotes} vote{post.poll.totalVotes !== 1 ? 's' : ''}
            {post.poll.deadline ? ` · Closes ${new Date(post.poll.deadline).toLocaleDateString()}` : ''}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.feedActions}>
        <Pressable onPress={onLike} style={styles.feedActionBtn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={16} color={liked ? '#F43F5E' : '#94A3B8'} />
          <Text style={[styles.feedActionText, liked && { color: '#F43F5E', fontWeight: '700' }]}>
            {Math.max(0, (post.likeCount ?? 0) + (liked && !post.liked ? 1 : !liked && post.liked ? -1 : 0))}
          </Text>
        </Pressable>
        <Pressable style={styles.feedActionBtn} onPress={() => router.push(`/community/feed` as any)}>
          <Ionicons name="chatbubble-outline" size={15} color="#94A3B8" />
          <Text style={styles.feedActionText}>{post.commentCount ?? 0}</Text>
        </Pressable>
        <Pressable style={styles.feedActionBtn} onPress={() => {
          Alert.alert('Share', `Share "${post.title || post.content.slice(0, 30)}..." with your network.`);
        }}>
          <Ionicons name="share-social-outline" size={15} color="#94A3B8" />
        </Pressable>
        <View style={styles.flex1} />
        <Pressable onPress={() => router.push('/community/feed' as any)}>
          <Text style={styles.viewAllText}>Discussion →</Text>
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
  const kycVerified = activeUser?.kycStatus === 'VERIFIED';
  const roleName = activeUser?.role || activeUser?.userType || 'Resident';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Your Community & Unit</Text>
              <Text style={styles.modalSubtitle}>Assigned property residence & tenancy details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Active Community & Unit Card */}
          <LinearGradient
            colors={['#1E1B4B', '#312E81', '#4338CA']}
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
                <Text style={styles.modalAvatarText}>{residentName.slice(0, 2).toUpperCase()}</Text>
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

          {/* Unit Quick Actions */}
          <View style={styles.modalActionsList}>
            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => {
                onClose();
                router.push('/tabs/profile' as any);
              }}
            >
              <View style={[styles.modalActionIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="person-circle-outline" size={20} color="#4F46E5" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.modalActionTitle}>Resident Profile & KYC</Text>
                <Text style={styles.modalActionSub}>Manage flat address, family members and documents</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => {
                onClose();
                router.push('/governance' as any);
              }}
            >
              <View style={[styles.modalActionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="shield-outline" size={20} color="#059669" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.modalActionTitle}>Society Governance & MC</Text>
                <Text style={styles.modalActionSub}>Association directory, bye-laws and committee</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalActionItem}
              onPress={() => {
                onClose();
                Alert.alert(
                  'Switch Property Unit',
                  'If you own or rent multiple units in this community, contact society admin to link additional units to your account.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <View style={[styles.modalActionIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="swap-horizontal" size={20} color="#D97706" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.modalActionTitle}>Switch / Add Another Flat</Text>
                <Text style={styles.modalActionSub}>Link multiple flats or properties in this community</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.modalDoneBtn} onPress={onClose}>
            <Text style={styles.modalDoneBtnText}>Done</Text>
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
  const { user, hasRole, hasModule } = useAuth();

  // Fresh profile from backend (resolves flatNo, block, tower, fullName, community)
  const { data: dbProfile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: profileService.getProfile,
    staleTime: 30_000,
  });

  const activeUser = dbProfile || user;

  const isResident = hasRole('RESIDENT', 'OWNER', 'TENANT', 'MEMBER', 'USER');
  const isAdmin    = hasRole('ADMIN', 'COMMUNITY_ADMIN', 'SUPER_ADMIN');

  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  // Server data - dynamically enabled when user is loaded
  const { data: feedPage, isLoading } = useQuery({
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

  const overdueInvoices = invoices.filter((inv) => inv.status === 'OVERDUE');
  const overdueTotal = overdueInvoices.reduce((s, inv) => s + (inv.balanceDue ?? 0), 0);
  const allPosts = feedPage?.content ?? [];
  const announcements = allPosts.filter((p) => p.official || p.postType === 'ANNOUNCEMENT' || p.type === 'ANNOUNCEMENT').slice(0, 2);

  // Feed filter
  const filters = ['All', 'Notices', 'Polls', 'Community'] as const;
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('All');

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'Notices') {
      return allPosts.filter((p) => p.official || p.postType === 'ANNOUNCEMENT' || p.type === 'ANNOUNCEMENT');
    }
    if (activeFilter === 'Polls') {
      return allPosts.filter((p) => Boolean(p.poll || (p as any).pollQuestion));
    }
    if (activeFilter === 'Community') {
      return allPosts.filter((p) => !p.official && p.postType !== 'ANNOUNCEMENT' && p.type !== 'ANNOUNCEMENT');
    }
    return allPosts;
  }, [allPosts, activeFilter]);

  const feedPosts = filteredPosts.slice(0, 6);
  const eventsCount = upcomingEvents.length;
  const pollsCount = activePolls?.totalElements ?? activePolls?.content?.length ?? 0;
  const ticketsCount = openTickets.length;

  // Local liked state
  const [liked, setLiked] = useState<Record<string | number, boolean>>({});
  const toggleLike = useCallback((id: string | number) => {
    setLiked((prev) => {
      const current = prev[id] !== undefined
        ? prev[id]
        : Boolean(allPosts.find((p) => p.id === id)?.liked);
      const next = !current;
      if (typeof id === 'number' && id < 900) {
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
  }, [qc]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </SafeAreaView>
    );
  }

  // Dynamic user, unit and community resolution
  const rawBlock = activeUser?.block || activeUser?.tower;
  const rawFlat = activeUser?.flatNo || activeUser?.flatNumber || (activeUser as any)?.unitNumber;

  let unitDisplay = 'Block - B 806';
  if (rawBlock && rawFlat) {
    const cleanBlock = String(rawBlock).replace(/^(block|tower)\s*[-:]?\s*/i, '').trim();
    const cleanFlat = String(rawFlat).replace(new RegExp(`^${cleanBlock}[\\s-_]*`, 'i'), '').trim();
    unitDisplay = `Block - ${cleanBlock} ${cleanFlat}`;
  } else if (rawBlock) {
    const cleanBlock = String(rawBlock).replace(/^(block|tower)\s*[-:]?\s*/i, '').trim();
    unitDisplay = `Block - ${cleanBlock}`;
  } else if (rawFlat) {
    const flatStr = String(rawFlat).trim();
    const match = flatStr.match(/^([A-Za-z0-9]+)[\s-_]+(\d+)$/);
    if (match) {
      unitDisplay = `Block - ${match[1]} ${match[2]}`;
    } else {
      unitDisplay = `Block - ${flatStr}`;
    }
  }

  const communityDisplay = activeUser?.communityName
    || (typeof activeUser?.community === 'object' ? (activeUser?.community as any)?.name : null)
    || (activeUser?.communityId ? `Community #${activeUser.communityId}` : 'Mana Community');

  const residentName = activeUser?.fullName || activeUser?.name || activeUser?.email?.split('@')[0] || 'Resident';
  const firstName = residentName.split(' ')[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Top Header ── */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push('/tabs/profile' as any)} style={styles.avatarBtn}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.headerAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.headerAvatarText}>{firstName.slice(0, 2).toUpperCase()}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable
          style={styles.headerMeta}
          onPress={() => setShowUnitModal(true)}
          hitSlop={8}
        >
          <Text style={styles.headerCommunity} numberOfLines={1}>{communityDisplay}</Text>
          <View style={styles.headerFlatRow}>
            <Text style={styles.headerFlat} numberOfLines={1}>{unitDisplay}</Text>
            <Ionicons name="chevron-down" size={13} color="#94A3B8" style={{ marginLeft: 3 }} />
          </View>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable style={styles.notifBtn} onPress={() => router.push('/notifications' as any)}>
            <Ionicons name="notifications-outline" size={20} color="#475569" />
            {unreadNotifsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.sosBtn}
            onPress={() => Alert.alert('Emergency SOS', 'This will alert security and all emergency contacts. Continue?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Send SOS', style: 'destructive', onPress: () => router.push('/emergency' as any) },
            ])}
          >
            <View style={styles.sosDot} />
            <Text style={styles.sosBtnText}>SOS</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Scroll Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#4F46E5" />}
      >
        {/* GateBlocks (Resident/Admin only) */}
        {(isResident || isAdmin) && hasModule('VISITORS') && (
          <GateBlocks unit={unitDisplay} />
        )}

        {/* Announcement Banner (Community Highlight) */}
        {announcements.length > 0 ? (
          <AnnouncementBanner post={announcements[0]} />
        ) : (
          <View style={styles.announcementBanner}>
            <View style={styles.announcementBannerHeader}>
              <View style={styles.announcementBannerIcon}>
                <Ionicons name="trophy-outline" size={14} color="#FBBF24" />
              </View>
              <Text style={styles.announcementBannerEyebrow}>COMMUNITY HIGHLIGHT</Text>
            </View>
            <Text style={styles.announcementBannerTitle}>Mana won "Best Managed Community" Award 2024</Text>
            <Text style={styles.announcementBannerMeta}>Awarded by Greater Hyderabad Municipal Corporation</Text>
          </View>
        )}

        {/* KPI Strip */}
        <KpiStrip
          eventsCount={eventsCount}
          pollsCount={pollsCount}
          ticketsCount={ticketsCount}
          onOpenPass={() => setShowPassModal(true)}
        />

        {/* Quick Actions Grid */}
        <QuickActionsGrid />

        {/* Payments Due */}
        {hasModule('FINANCE_MGMT') && overdueInvoices.length > 0 && (
          <PaymentsDueBanner count={overdueInvoices.length} total={overdueTotal} />
        )}

        {/* Resident QR Pass */}
        {isResident && hasModule('VISITORS') && (
          <ResidentPassCard unit={unitDisplay} residentName={residentName} />
        )}

        {/* Feed section header & filter chips */}
        <View style={styles.feedHeaderRow}>
          <Text style={styles.feedSectionTitle}>Community Feed</Text>
          <View style={styles.feedHeaderRightActions}>
            <TouchableOpacity
              onPress={() => router.push('/community/feed' as any)}
              hitSlop={8}
            >
              <Text style={styles.viewAllText}>See All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createPostBtn}
              onPress={() => setShowCreatePostModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#4F46E5" />
              <Text style={styles.createPostBtnText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {filters.map((f) => (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              style={activeFilter === f ? undefined : styles.filterChipInactive}
            >
              {activeFilter === f ? (
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.filterChipActive} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.filterChipTextActive}>{f}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.filterChipTextInactive}>{f}</Text>
              )}
            </Pressable>
          ))}
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
        ) : (
          <View style={styles.emptyFeedBox}>
            <Ionicons name="chatbubbles-outline" size={32} color="#6366F1" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyFeedTitle}>No posts in {activeFilter}</Text>
            <Text style={styles.emptyFeedSub}>Share an update or question with your neighbors</Text>
            <TouchableOpacity
              style={styles.emptyPostBtn}
              onPress={() => setShowCreatePostModal(true)}
            >
              <Text style={styles.emptyPostBtnText}>Create Post</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePostModal}
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
        unit={unitDisplay}
        residentName={residentName}
        communityDisplay={communityDisplay}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  flex1:            { flex: 1 },
  scrollContent:    { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  bottomPad:        { height: 16 },

  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  avatarBtn:         { },
  headerAvatar:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText:  { color: '#fff', fontSize: 13, fontFamily: FONTS.bold },
  headerMeta:        { flex: 1 },
  headerCommunity:   { fontSize: 11, color: '#64748B', fontFamily: FONTS.medium },
  headerFlatRow:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  headerFlat:        { fontSize: 14, fontWeight: '700', color: '#0F172A', fontFamily: FONTS.bold },
  headerRight:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBtn:          { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  notifBadge:        { position: 'absolute', top: -2, right: -2, backgroundColor: '#DC2626', borderRadius: 10, minWidth: 15, height: 15, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#fff' },
  notifBadgeText:    { color: '#fff', fontSize: 8, fontFamily: FONTS.bold },
  sosBtn:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F43F5E', ...SHADOWS.sm } as any,
  sosDot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FCA5A5' },
  sosBtnText:        { color: '#fff', fontSize: 12, fontFamily: FONTS.bold },

  // ── GateBlocks ───────────────────────────────────────────────────────────
  gateSection:       { gap: 12, marginBottom: 12 },
  gateCard:          { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  gateCardPending:   { borderColor: '#F59E0B66' },
  gateRow:           { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gateIconBox:       { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  gateInfo:          { flex: 1 },
  gateLabelRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  liveDot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
  gateStatus:        { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5 },
  gateTitle:         { fontSize: 14, color: '#0F172A', fontFamily: FONTS.bold },
  gateMeta:          { fontSize: 11, color: '#94A3B8', fontFamily: FONTS.regular, marginTop: 1 },
  gateActions:       { flexDirection: 'row', gap: 8, marginTop: 12 },
  gateBtn:           { flex: 1, borderRadius: 12, overflow: 'hidden' },
  gateBtnGrad:       { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  gateBtnTextWhite:  { color: '#fff', fontSize: 12, fontFamily: FONTS.bold },
  gateBtnDeny:       { backgroundColor: '#FEE2E2', paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  gateBtnTextRed:    { color: '#DC2626', fontSize: 12, fontFamily: FONTS.bold },
  gateBtnLeave:      { backgroundColor: '#F1F5F9', paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  gateBtnTextGray:   { color: '#64748B', fontSize: 12, fontFamily: FONTS.regular },
  undoBtn:           { marginTop: 10, alignItems: 'center' },
  undoText:          { color: '#6366F1', fontSize: 12, fontFamily: FONTS.bold },

  // ── Sub sections ─────────────────────────────────────────────────────────
  subSection:        { },
  subSectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  subSectionLabel:   { fontSize: 10, fontFamily: FONTS.bold, color: '#94A3B8', letterSpacing: 0.6 },
  subSectionLink:    { fontSize: 11, fontFamily: FONTS.bold, color: '#6366F1' },
  subSectionMeta:    { fontSize: 11, color: '#94A3B8', fontFamily: FONTS.regular },

  // Pre-approve
  preApproveGrid:    { flexDirection: 'row', gap: 10 },
  preApproveBtn:     { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  preApproveIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  preApproveLabel:   { fontSize: 10, color: '#475569', fontFamily: FONTS.bold },

  // Daily help
  dailyHelpScroll:   { gap: 10, paddingBottom: 2 },
  helpCard:          { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, minWidth: 130, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  helpCardTop:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  helpAvatarWrap:    { position: 'relative' },
  helpAvatar:        { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  helpAvatarText:    { color: '#fff', fontSize: 11, fontFamily: FONTS.bold },
  helpOnlineDot:     { position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  helpName:          { fontSize: 12, color: '#0F172A', fontFamily: FONTS.bold },
  helpRole:          { fontSize: 10, color: '#94A3B8', fontFamily: FONTS.regular },
  helpTimeRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpTime:          { fontSize: 10, color: '#94A3B8', fontFamily: FONTS.regular },
  helpAddBtn:        { minWidth: 90, backgroundColor: '#EEF2FF', borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#C7D2FE', borderStyle: 'dashed' } as any,
  helpAddLabel:      { fontSize: 11, color: '#4F46E5', fontFamily: FONTS.bold },

  // Gate activity
  gateActivityRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, gap: 10, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  gateActivityInfo:  { flex: 1 },
  gateActivityTitle: { fontSize: 13, color: '#0F172A', fontFamily: FONTS.bold, marginTop: 2 },
  moreBtn:           { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText:          { fontSize: 11, color: '#6366F1', fontFamily: FONTS.bold },
  gateActivityExpanded: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, gap: 10, marginTop: -4, borderWidth: 1, borderTopWidth: 0, borderColor: '#E2E8F0' },
  gateActivityItem:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  // ── Resident Pass ─────────────────────────────────────────────────────────
  passCard:          { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  passRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passTitle:         { fontSize: 13, color: '#0F172A', fontFamily: FONTS.bold },
  passMeta:          { fontSize: 11, color: '#94A3B8', fontFamily: FONTS.regular, marginTop: 1 },
  showQrBtn:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  showQrText:        { color: '#fff', fontSize: 11, fontFamily: FONTS.bold },
  qrExpanded:        { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  qrBox:             { width: 90, height: 90, backgroundColor: '#FFFFFF', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  qrMeta:            { flex: 1, gap: 6 },
  qrMetaRow:         { fontSize: 12, color: '#475569', fontFamily: FONTS.regular },
  qrPaid:            { color: '#059669', fontFamily: FONTS.bold },
  qrPoints:          { color: '#4F46E5', fontFamily: FONTS.bold },
  qrGate:            { fontSize: 11, color: '#94A3B8', fontFamily: FONTS.regular },

  // ── KPI Strip ────────────────────────────────────────────────────────────
  kpiScroll:         { gap: 10, paddingBottom: 2, marginBottom: 12 },
  kpiChip:           { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  kpiIconBox:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiValue:          { fontSize: 20, color: '#0F172A', fontFamily: FONTS.bold, lineHeight: 22 },
  kpiLabel:          { fontSize: 10, color: '#94A3B8', fontFamily: FONTS.regular, marginTop: 1 },

  // ── Quick Actions ─────────────────────────────────────────────────────────
  qaSection:         { marginBottom: 12 },
  qaSectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  catTabsScroll:     { gap: 8, paddingBottom: 10 },
  catTabActive:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  catTabInactive:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  catTabTextActive:  { color: '#fff', fontSize: 11, fontFamily: FONTS.bold },
  catTabTextInactive:{ color: '#64748B', fontSize: 11, fontFamily: FONTS.bold },
  qaGrid:            { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  qaGridInner:       { flexDirection: 'row', flexWrap: 'wrap' },
  qaItem:            { width: '25%', alignItems: 'center', paddingVertical: 8, gap: 6 },
  qaIconBox:         { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  qaBadge:           { position: 'absolute', top: -5, right: -6, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8 },
  qaBadgeText:       { color: '#fff', fontSize: 7, fontFamily: FONTS.bold },
  qaLabel:           { fontSize: 10, color: '#475569', textAlign: 'center', fontFamily: FONTS.bold, lineHeight: 13, maxWidth: 56 },
  qaShowMore:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  qaShowMoreText:    { color: '#6366F1', fontSize: 12, fontFamily: FONTS.bold },

  // ── Payments Due ──────────────────────────────────────────────────────────
  dueBanner:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  dueLeft:           { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dueTitle:          { fontSize: 13, fontFamily: FONTS.bold, color: '#991B1B' },
  dueAmount:         { fontSize: 12, color: '#B91C1C', fontFamily: FONTS.regular, marginTop: 2 },
  payNowBtn:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  payNowText:        { color: '#fff', fontSize: 13, fontFamily: FONTS.bold },

  // ── Announcement Banner ───────────────────────────────────────────────────
  announcementBanner:       { backgroundColor: '#1E1B4B', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', overflow: 'hidden' },
  announcementBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  announcementBannerIcon:   { width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(251,191,36,0.2)', alignItems: 'center', justifyContent: 'center' },
  announcementBannerEyebrow:{ fontSize: 10, fontFamily: FONTS.bold, color: '#FBBF24', letterSpacing: 0.5 },
  announcementBannerTitle:  { fontSize: 14, color: '#FFFFFF', fontFamily: FONTS.bold, lineHeight: 20, marginBottom: 4 },
  announcementBannerMeta:   { fontSize: 11, color: '#94A3B8', fontFamily: FONTS.regular },

  // ── Feed Header & Filter Chips ───────────────────────────────────────────
  feedHeaderRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 },
  feedHeaderRightActions:{ flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedSectionTitle:      { fontSize: 15, fontFamily: FONTS.bold, color: '#0F172A' },
  createPostBtn:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  createPostBtnText:     { fontSize: 12, color: '#4F46E5', fontFamily: FONTS.bold },
  filterChipsScroll:     { gap: 8, paddingBottom: 10, marginBottom: 4 },
  filterChipActive:      { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  filterChipInactive:    { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  filterChipTextActive:  { color: '#fff', fontSize: 12, fontFamily: FONTS.bold },
  filterChipTextInactive:{ color: '#64748B', fontSize: 12, fontFamily: FONTS.bold },

  // ── Feed Post Cards ───────────────────────────────────────────────────────
  feedCard:            { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm } as any,
  feedCardHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  feedAvatar:          { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  feedAvatarImage:     { width: 36, height: 36, borderRadius: 10 },
  feedAvatarText:      { color: '#fff', fontSize: 12, fontFamily: FONTS.bold },
  feedAuthorRow:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  feedAuthorName:      { fontSize: 14, color: '#0F172A', fontFamily: FONTS.bold },
  feedPostTime:        { fontSize: 11, color: '#94A3B8', fontFamily: FONTS.regular, marginTop: 1 },
  feedOfficialBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  feedOfficialText:    { fontSize: 10, color: '#4F46E5', fontFamily: FONTS.bold },
  feedContent:         { fontSize: 14, color: '#334155', lineHeight: 20, fontFamily: FONTS.regular, marginBottom: 12 },
  feedActions:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  feedActionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F8FAFC' },
  feedActionText:      { fontSize: 11, color: '#94A3B8', fontFamily: FONTS.regular },
  viewAllText:         { fontSize: 11, color: '#6366F1', fontFamily: FONTS.bold },

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
