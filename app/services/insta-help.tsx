import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, TextInput, Alert, Dimensions,
  BackHandler, RefreshControl, StatusBar, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SHADOWS, RADIUS } from '@/constants/config';
import {
  instaHelpService, toApiDuration, InstaHelpResponse, InstaServiceType,
} from '@/services/instaHelpService';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Types & Interfaces ──────────────────────────────────────────────

type TabMode = 'BOOK' | 'MY_SESSIONS';
type DurationOption = '1h' | '2h' | '4h' | 'FULL_DAY';
type TrackingStep = 'MATCHED' | 'GATE_CLEARED' | 'AT_DOOR' | 'WORKING' | 'DONE';
type FlowStep = 'SELECT_SERVICE' | 'SELECT_SUBTASK' | 'SELECT_DURATION' | 'MATCHING' | 'HELPER_MATCHED' | 'TRACKING' | 'RATE';

interface ServiceItem {
  type: InstaServiceType;
  label: string;
  emoji: string;
  desc: string;
  tagline: string;
  startingPrice: string;
  badge: string;
  color: string;
  bg: string;
  subtasks: string[];
}

interface InstaHelper {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  experience: string;
  verified: boolean;
  policeVerified: boolean;
  speciality: string;
  distanceLabel: string;
  etaMinutes: number;
  societyHomes: number;
  languages: string[];
  gatePassNo: string;
  turnstileTime: string;
  towerResidents: string;
  endorsedBy: string;
  badge?: string;
}

interface InsideHelper {
  id: string;
  name: string;
  role: string;
  serviceType: InstaServiceType;
  subtask: string;
  tower: string;
  freeSlot: string;
  turnstileIn: string;
  rating: number;
  avatar: string;
  color: string;
  bg: string;
}

// ── Helpers Checked In Today (Turnstile RFID Verified) ──────────────

const HELPERS_INSIDE_COMPLEX: InsideHelper[] = [
  {
    id: 'h1',
    name: 'Sunita D.',
    role: 'Maid & Cook',
    serviceType: 'MAID',
    subtask: 'Dishes & Utensils',
    tower: 'Tower B (Floor 3)',
    freeSlot: 'Free Now · 45 mins',
    turnstileIn: '07:18 AM',
    rating: 4.9,
    avatar: 'S',
    color: '#DB2777',
    bg: '#FCE7F3',
  },
  {
    id: 'h2',
    name: 'Lakshmi B.',
    role: 'Deep Cleaning',
    serviceType: 'CLEANING',
    subtask: 'Bathroom Deep Scrub & De-scale',
    tower: 'Tower A Lobby',
    freeSlot: 'Free until 11:30 AM',
    turnstileIn: '07:42 AM',
    rating: 4.9,
    avatar: 'L',
    color: '#0284C7',
    bg: '#E0F2FE',
  },
  {
    id: 'h3',
    name: 'Rajesh S.',
    role: 'Express Ironing',
    serviceType: 'IRONING',
    subtask: 'Up to 15 Clothes (Quick)',
    tower: 'Clubhouse Desk',
    freeSlot: 'Available now',
    turnstileIn: '08:05 AM',
    rating: 4.8,
    avatar: 'R',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    id: 'h4',
    name: 'Anita M.',
    role: 'Home Chef & Meals',
    serviceType: 'COOKING',
    subtask: 'South Indian Breakfast / Meals',
    tower: 'Tower C (Floor 6)',
    freeSlot: 'Free from 10:00 AM',
    turnstileIn: '07:30 AM',
    rating: 4.9,
    avatar: 'A',
    color: '#EA580C',
    bg: '#FFF7ED',
  },
];

// ── Service Catalog ─────────────────────────────────────────────────

const INSTA_SERVICES: ServiceItem[] = [
  {
    type: 'MAID',
    label: 'Maid & Housework',
    emoji: '🧺',
    desc: 'Dishes, sweeping, dusting & daily chores',
    tagline: 'Spotless home in 45 mins',
    startingPrice: '₹149',
    badge: '⚡ ~10 min',
    color: '#DB2777',
    bg: '#FCE7F3',
    subtasks: [
      'Dishes & Utensils',
      'Sweeping & Mopping',
      'Dusting & Surfaces',
      'Kitchen Platform Scrub',
      'Balcony Wash',
      'Emergency Full Flat Reset',
    ],
  },
  {
    type: 'COOKING',
    label: 'Home Chef & Cooking',
    emoji: '👩‍🍳',
    desc: 'Instant breakfast, lunch, or dinner prep',
    tagline: 'Fresh home-style meals',
    startingPrice: '₹199',
    badge: '🔥 Society Fav',
    color: '#EA580C',
    bg: '#FFF7ED',
    subtasks: [
      'South Indian Breakfast / Meals',
      'North Indian Roti & Sabzi',
      'Tiffin Box Meal Prep',
      'Chai & Evening Snacks',
      'Party & Guest Cooking',
      'Dal, Rice & Curries Only',
    ],
  },
  {
    type: 'CLEANING',
    label: 'Deep Clean & Scrub',
    emoji: '🧹',
    desc: 'Bathroom scrubbing, kitchen chimney & floor wash',
    tagline: 'Hospital-grade sanitization',
    startingPrice: '₹249',
    badge: '💎 Top Rated',
    color: '#0284C7',
    bg: '#E0F2FE',
    subtasks: [
      'Bathroom Deep Scrub & De-scale',
      'Kitchen Oil & Stain Clean',
      'Full Flat Deep Vacuum & Mop',
      'Window Glass & Sliding Tracks',
      'Sofa & Upholstery Freshen',
      'Move-in / Move-out Scrub',
    ],
  },
  {
    type: 'IRONING',
    label: 'Express Steam Ironing',
    emoji: '👔',
    desc: 'Formal shirts, suits, sarees & linens',
    tagline: 'Wrinkle-free perfection',
    startingPrice: '₹149',
    badge: '⚡ In ~12 min',
    color: '#7C3AED',
    bg: '#EDE9FE',
    subtasks: [
      'Up to 15 Clothes (Quick)',
      'Up to 30 Clothes (Family)',
      'Formal Shirts & Trousers',
      'Silk Sarees & Delicate Wear',
      'Curtains & Bedsheets',
    ],
  },
  {
    type: 'LAUNDRY',
    label: 'Laundry Wash & Fold',
    emoji: '🫧',
    desc: 'Washing machine load, air-dry & fold',
    tagline: 'Fresh & neatly folded',
    startingPrice: '₹169',
    badge: '🌿 Eco Care',
    color: '#0891B2',
    bg: '#CFFAFE',
    subtasks: [
      'Load, Wash & Sun-Dry',
      'Fold & Wardrobe Stacking',
      'Delicate Fabric Hand Wash',
      'Heavy Comforter / Blanket Wash',
      'Quick Spin & Hang',
    ],
  },
  {
    type: 'BABYSITTING',
    label: 'Babysitting & Childcare',
    emoji: '👶',
    desc: 'Trained & verified child companion',
    tagline: 'Warm, safe & caring supervision',
    startingPrice: '₹299',
    badge: '🛡️ Police Cleared',
    color: '#E11D48',
    bg: '#FFE4E6',
    subtasks: [
      'Toddler & Infant Care',
      'School Bus Drop / Pickup Escort',
      'Evening Play & Activity Monitor',
      'Meal Feeding & Bedtime Routine',
      'Study & Homework Companion',
    ],
  },
];

// ── Duration Options ────────────────────────────────────────────────

const DURATION_OPTIONS: {
  value: DurationOption;
  label: string;
  hours: string;
  price: string;
  priceNum: number;
  desc: string;
  tag?: string;
}[] = [
  {
    value: '1h',
    label: '1 Hour Express',
    hours: '1 Hour',
    price: '₹149',
    priceNum: 149,
    desc: 'Best for urgent chores or single-room tasks',
  },
  {
    value: '2h',
    label: '2 Hours Standard',
    hours: '2 Hours',
    price: '₹249',
    priceNum: 249,
    desc: 'Most popular: full kitchen, 2 meals, or sweeping & mopping',
    tag: 'POPULAR',
  },
  {
    value: '4h',
    label: '4 Hours Half Day',
    hours: '4 Hours',
    price: '₹449',
    priceNum: 449,
    desc: 'Deep cleaning, multi-dish party cooking, or ironing pile',
    tag: 'SAVE 25%',
  },
  {
    value: 'FULL_DAY',
    label: 'Full Day (8 Hours)',
    hours: '8 Hours',
    price: '₹799',
    priceNum: 799,
    desc: 'All-day domestic help, event support, or complete home reset',
    tag: 'BEST VALUE',
  },
];

const TRACKING_STEPS: { step: TrackingStep; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { step: 'MATCHED',      label: 'Helper Matched',         icon: 'checkmark-circle',  desc: 'Verified helper assigned & dispatched' },
  { step: 'GATE_CLEARED',  label: 'Society Gate Cleared',   icon: 'shield-checkmark',  desc: 'Digital gate pass approved at Gate 1' },
  { step: 'AT_DOOR',      label: 'At Your Doorstep',       icon: 'home',              desc: 'Helper is ringing your doorbell' },
  { step: 'WORKING',      label: 'Service in Progress',    icon: 'flash',             desc: 'Helper is actively working on your tasks' },
  { step: 'DONE',         label: 'Task Complete! 🎉',      icon: 'star',              desc: 'Review work and share completion OTP' },
];

const QUICK_INSTRUCTION_PRESETS = [
  'Ring bell twice on Flat 402',
  'Please carry your own scrub/duster',
  'Gate pass pre-approved at Gate 1',
  'Need help with breakfast dishes first',
  'Call me when at Tower Lobby',
];

const COMPLIMENT_TAGS = [
  '⏱️ Super Punctual',
  '✨ Spotless Quality',
  '🤝 Very Polite',
  '🍲 Delicious Food',
  '⚡ Fast & Efficient',
  '🛡️ Trusted Pro',
];

const OUT_GATE_ITEM_OPTIONS = [
  'Old Clothes / Wardrobe Linen',
  'Food Dabba / Meal Containers',
  'Newspapers & Cardboard Boxes',
  'Small Household Item / Gift',
];

function generateSessionOtp(sessionId: string): string {
  let hash = 0;
  for (const ch of sessionId) { hash = ((hash << 5) - hash) + ch.charCodeAt(0); hash |= 0; }
  return String(Math.abs(hash) % 9000 + 1000);
}

// ── Main Component ──────────────────────────────────────────────────

export default function InstaHelpScreen() {
  const router = useRouter();

  // Top Tab
  const [activeTab, setActiveTab] = useState<TabMode>('BOOK');

  // Flow State
  const [flowStep, setFlowStep] = useState<FlowStep>('SELECT_SERVICE');
  const [selectedService, setSelectedService] = useState<InstaServiceType | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>('2h');
  const [notes, setNotes] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  // Voice Note State
  const [hasVoiceNote, setHasVoiceNote] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Material Out-Pass Modal State
  const [outPassModalVisible, setOutPassModalVisible] = useState(false);
  const [selectedOutItem, setSelectedOutItem] = useState(OUT_GATE_ITEM_OPTIONS[0]);
  const [outPassGeneratedNo, setOutPassGeneratedNo] = useState<string | null>(null);

  // Matching & Live State
  const [matchProgress, setMatchProgress] = useState(0);
  const [radarStatusIndex, setRadarStatusIndex] = useState(0);
  const [matchedHelper, setMatchedHelper] = useState<InstaHelper | null>(null);
  const [etaRemaining, setEtaRemaining] = useState(0);
  const [trackingStep, setTrackingStep] = useState<TrackingStep>('MATCHED');
  const [sessionOtp, setSessionOtp] = useState('4821');
  const [otpConfirmed, setOtpConfirmed] = useState(false);
  const [bookingData, setBookingData] = useState<InstaHelpResponse | null>(null);

  // Rating & Tip State
  const [rating, setRating] = useState(5);
  const [selectedCompliments, setSelectedCompliments] = useState<string[]>(['⏱️ Super Punctual']);
  const [selectedTip, setSelectedTip] = useState<number>(30);

  // My Sessions State
  const [myBookings, setMyBookings] = useState<InstaHelpResponse[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const radarSpin = useRef(new Animated.Value(0)).current;

  // Fetch past & active bookings
  const fetchMyBookings = useCallback(async () => {
    try {
      const data = await instaHelpService.getMyBookings();
      setMyBookings(data || []);
    } catch {
      // Keep existing
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'MY_SESSIONS') {
      fetchMyBookings();
    }
  }, [activeTab, fetchMyBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyBookings();
    setRefreshing(false);
  }, [fetchMyBookings]);

  // Reset Booking Wizard
  const resetWizard = useCallback(() => {
    setSelectedService(null);
    setSelectedSubtask('');
    setSelectedDuration('2h');
    setNotes('');
    setHasVoiceNote(false);
    setOutPassGeneratedNo(null);
    setMatchProgress(0);
    setMatchedHelper(null);
    setTrackingStep('MATCHED');
    setOtpConfirmed(false);
    setRating(5);
    setFlowStep('SELECT_SERVICE');
  }, []);

  // 1-Tap "Maid on Leave" Fast-Track Booking
  const triggerMaidOnLeaveFastTrack = () => {
    setSelectedService('MAID');
    setSelectedSubtask('Dishes & Utensils');
    setSelectedDuration('1h');
    setNotes('Urgent morning maid substitute - breakfast dishes & sweeping');
    setFlowStep('SELECT_DURATION');
  };

  // Direct selection from "Inside Complex" ticker
  const selectInsideHelper = (helper: InsideHelper) => {
    setSelectedService(helper.serviceType);
    setSelectedSubtask(helper.subtask);
    setSelectedDuration('1h');
    setNotes(`Direct request for ${helper.name} (${helper.tower})`);
    setFlowStep('SELECT_DURATION');
  };

  // Hardware Back Handler
  const handleBack = useCallback(() => {
    switch (flowStep) {
      case 'SELECT_SERVICE':
        router.back();
        break;
      case 'SELECT_SUBTASK':
        setFlowStep('SELECT_SERVICE');
        break;
      case 'SELECT_DURATION':
        setFlowStep('SELECT_SUBTASK');
        break;
      case 'HELPER_MATCHED':
      case 'TRACKING':
        Alert.alert(
          'Cancel Insta-Help Session?',
          'Your assigned helper is on their way. Cancelling will release them back to the society pool.',
          [
            { text: 'Keep Active', style: 'cancel' },
            {
              text: 'Cancel Session',
              style: 'destructive',
              onPress: async () => {
                if (bookingData?.bookingRef) {
                  try { await instaHelpService.cancelBooking(bookingData.bookingRef); } catch {}
                }
                resetWizard();
              },
            },
          ]
        );
        break;
      default:
        setFlowStep('SELECT_SERVICE');
        break;
    }
  }, [flowStep, router, bookingData, resetWizard]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  // ── Animated Matching Radar Effect ─────────────────────────────────
  useEffect(() => {
    if (flowStep !== 'MATCHING') return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    const spin = Animated.loop(
      Animated.timing(radarSpin, { toValue: 1, duration: 2500, useNativeDriver: true, easing: Easing.linear })
    );

    pulse.start();
    spin.start();

    // Progress tick
    let prog = 0;
    const progressTimer = setInterval(() => {
      prog += 5;
      setMatchProgress(Math.min(prog, 96));
      if (prog > 25 && prog < 50) setRadarStatusIndex(1);
      else if (prog >= 50 && prog < 75) setRadarStatusIndex(2);
      else if (prog >= 75) setRadarStatusIndex(3);
    }, 250);

    // Call API and match
    const triggerMatch = async () => {
      try {
        const apiRes = await instaHelpService.createBooking({
          serviceType: selectedService!,
          subtask: selectedSubtask || undefined,
          duration: toApiDuration(selectedDuration),
          notes: notes || undefined,
        });
        setBookingData(apiRes);

        const localHelper: InstaHelper = {
          id: apiRes.bookingRef || `BK-${Date.now().toString().slice(-4)}`,
          name: apiRes.helperName ?? 'Sunita Devi',
          avatar: (apiRes.helperName ?? 'S').charAt(0).toUpperCase(),
          rating: apiRes.helperRating ?? 4.9,
          reviewCount: 312,
          experience: '4+ yrs in Mana Foliage',
          verified: true,
          policeVerified: true,
          speciality: serviceConf?.label ?? 'Domestic Care Pro',
          distanceLabel: apiRes.helperDistanceLabel ?? 'Tower B (120m away)',
          etaMinutes: apiRes.helperEtaMinutes ?? 10,
          societyHomes: 18,
          languages: ['Hindi', 'Kannada', 'English'],
          gatePassNo: `GP-${Math.floor(1000 + Math.random() * 9000)}`,
          turnstileTime: '07:18 AM (Main Gate Turnstile)',
          towerResidents: 'Tower B (Flats 201, 402, 604, 701)',
          endorsedBy: 'Sharma family, Rao family & 14 neighbors',
          badge: 'Tower B Resident Pro',
        };

        setMatchedHelper(localHelper);
        setEtaRemaining(localHelper.etaMinutes * 60);
        setSessionOtp(apiRes.closureOtp ?? generateSessionOtp(localHelper.id));
      } catch {
        // Fallback demo data
        const demoHelper: InstaHelper = {
          id: `BK-DEMO-${Date.now().toString().slice(-4)}`,
          name: 'Sunita Devi',
          avatar: 'S',
          rating: 4.9,
          reviewCount: 284,
          experience: '3 yrs in Mana Foliage',
          verified: true,
          policeVerified: true,
          speciality: serviceConf?.label ?? 'Home Service Pro',
          distanceLabel: 'Tower B Lobby (110m away)',
          etaMinutes: 8,
          societyHomes: 14,
          languages: ['Hindi', 'Kannada', 'English'],
          gatePassNo: 'GP-7721',
          turnstileTime: '07:18 AM (Gate 1 Turnstile)',
          towerResidents: 'Tower B (Flats 201, 402, 604, 701)',
          endorsedBy: 'Sharma family, Rao family & 14 neighbors',
          badge: 'Tower B Resident Pro',
        };
        setMatchedHelper(demoHelper);
        setEtaRemaining(8 * 60);
        setSessionOtp('6291');
      }

      setMatchProgress(100);
      setTimeout(() => {
        setFlowStep('HELPER_MATCHED');
      }, 700);
    };

    const apiTimeout = setTimeout(() => {
      clearInterval(progressTimer);
      triggerMatch();
    }, 4500);

    return () => {
      pulse.stop();
      spin.stop();
      clearInterval(progressTimer);
      clearTimeout(apiTimeout);
    };
  }, [flowStep]);

  // ETA countdown
  useEffect(() => {
    if (flowStep !== 'HELPER_MATCHED' && flowStep !== 'TRACKING') return;
    if (etaRemaining <= 0) return;
    const timer = setInterval(() => {
      setEtaRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [flowStep, etaRemaining]);

  // Auto-advance simulated tracking timeline
  useEffect(() => {
    if (flowStep !== 'TRACKING') return;
    const steps: TrackingStep[] = ['MATCHED', 'GATE_CLEARED', 'AT_DOOR', 'WORKING', 'DONE'];
    const currentIdx = steps.indexOf(trackingStep);
    if (currentIdx >= steps.length - 1) return;

    const t = setTimeout(async () => {
      const nextStep = steps[currentIdx + 1];
      setTrackingStep(nextStep);
      if (nextStep === 'DONE' && bookingData?.bookingRef) {
        try { await instaHelpService.completeSession(bookingData.bookingRef); } catch {}
      }
    }, 7000);

    return () => clearTimeout(t);
  }, [flowStep, trackingStep, bookingData]);

  const serviceConf = INSTA_SERVICES.find(s => s.type === selectedService);
  const durConf = DURATION_OPTIONS.find(d => d.value === selectedDuration)!;

  const radarSpinDeg = radarSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const fmtEta = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  const toggleCompliment = (tag: string) => {
    if (selectedCompliments.includes(tag)) {
      setSelectedCompliments(selectedCompliments.filter(t => t !== tag));
    } else {
      setSelectedCompliments([...selectedCompliments, tag]);
    }
  };

  // ── Render Header ───────────────────────────────────────────────────

  const renderHeader = (title: string, showBack = true) => (
    <View style={s.header}>
      {showBack ? (
        <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
      ) : (
        <View style={s.backBtn} />
      )}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={s.headerLocationPill}>
          <View style={s.headerLiveDot} />
          <Text style={s.headerLocationText}>Mana Foliage · Gate 1 Hub</Text>
        </View>
      </View>
      <TouchableOpacity
        style={s.helpIconBtn}
        onPress={() => Alert.alert(
          'Gate 1 Security & Desk',
          '24/7 Security Intercom:\n📞 Gate 1 Supervisor: Ext 104\nMain Desk: +91 80 4022 1999'
        )}
        hitSlop={10}
      >
        <Ionicons name="headset-outline" size={19} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  // ── TAB: MY SESSIONS / ACTIVE TRACKER ────────────────────────────────

  const renderMySessions = () => {
    const activeSessions = myBookings.filter(b => b.status === 'PENDING' || b.status === 'MATCHED' || b.status === 'IN_PROGRESS');
    const pastSessions = myBookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

    return (
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
      >
        {/* Active Session Spotlight (If user has one running in state) */}
        {matchedHelper && (
          <View style={s.activeSessionCard}>
            <View style={s.activeSessionInner}>
              <View style={s.activeSessionHeader}>
                <View style={s.livePulsePill}>
                  <View style={s.liveGreenDot} />
                  <Text style={s.livePulseText}>LIVE IN PROGRESS</Text>
                </View>
                <Text style={s.activeSessionEta}>
                  {trackingStep === 'DONE' ? 'Completed 🎉' : `ETA ~${fmtEta(etaRemaining)}`}
                </Text>
              </View>

              <View style={s.activeSessionBody}>
                <View style={s.activeAvatar}>
                  <Text style={s.activeAvatarText}>{matchedHelper.avatar}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.activeHelperName}>{matchedHelper.name}</Text>
                  <Text style={s.activeHelperSub}>{serviceConf?.label || 'Insta-Help'} · {selectedSubtask || 'Assigned'}</Text>
                  <Text style={s.activeHelperDistance}>📍 {matchedHelper.distanceLabel}</Text>
                </View>
              </View>

              <View style={s.activeSessionFooter}>
                <View style={s.activeOtpBox}>
                  <Text style={s.activeOtpLabel}>OTP PIN</Text>
                  <Text style={s.activeOtpCode}>{sessionOtp}</Text>
                </View>
                <TouchableOpacity
                  style={s.resumeTrackBtn}
                  onPress={() => {
                    setActiveTab('BOOK');
                    setFlowStep(trackingStep === 'DONE' ? 'RATE' : 'TRACKING');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={s.resumeTrackBtnText}>View Live Map & Track →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* List of Active API Bookings */}
        <Text style={s.sectionTitle}>ACTIVE REQUESTS ({activeSessions.length})</Text>
        {activeSessions.length === 0 && !matchedHelper ? (
          <View style={s.emptySessionsCard}>
            <Ionicons name="sparkles-outline" size={36} color={COLORS.primary} />
            <Text style={s.emptySessionsTitle}>No active sessions</Text>
            <Text style={s.emptySessionsSub}>Need immediate domestic assistance? Helpers arrive in ~10 mins.</Text>
            <TouchableOpacity
              style={s.emptyBookBtn}
              onPress={() => setActiveTab('BOOK')}
              activeOpacity={0.85}
            >
              <Text style={s.emptyBookBtnText}>⚡ Book Insta-Help Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          activeSessions.map((b) => (
            <View key={b.bookingRef} style={s.sessionItemCard}>
              <View style={s.sessionItemTop}>
                <View style={s.sessionBadgeWrap}>
                  <Text style={s.sessionService}>{b.serviceType}</Text>
                  {b.subtask && <Text style={s.sessionSubtask}> · {b.subtask}</Text>}
                </View>
                <Text style={s.sessionStatus}>{b.status}</Text>
              </View>
              <View style={s.sessionItemDetails}>
                <Text style={s.sessionRef}>Ref: {b.bookingRef}</Text>
                <Text style={s.sessionPrice}>₹{b.priceAmount || 249}</Text>
              </View>
            </View>
          ))
        )}

        {/* Past Bookings */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>PAST SESSIONS</Text>
        {pastSessions.length === 0 ? (
          <View style={s.historyEmptyRow}>
            <Ionicons name="time-outline" size={18} color={COLORS.textMuted} />
            <Text style={s.historyEmptyText}>Your completed bookings will show up here.</Text>
          </View>
        ) : (
          pastSessions.map((p) => (
            <View key={p.bookingRef} style={s.pastCard}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.pastService}>{p.serviceType}</Text>
                  <Text style={s.pastDate}>· {new Date(p.bookedAt).toLocaleDateString()}</Text>
                </View>
                <Text style={s.pastPro}>{p.helperName || 'Verified Community Pro'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.pastAmount}>₹{p.priceAmount || 249}</Text>
                <TouchableOpacity
                  style={s.rebookBtn}
                  onPress={() => {
                    const svc = INSTA_SERVICES.find(s => s.type === p.serviceType) || INSTA_SERVICES[0];
                    setSelectedService(svc.type);
                    setActiveTab('BOOK');
                    setFlowStep('SELECT_SUBTASK');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={s.rebookBtnText}>Book Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  // ── STEP 1: SERVICE CATALOG ─────────────────────────────────────────

  const renderServiceSelection = () => (
    <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      {/* 🚨 "Maid on Leave?" 1-Tap SOS Substitute Card */}
      <TouchableOpacity
        style={s.maidOnLeaveCard}
        onPress={triggerMaidOnLeaveFastTrack}
        activeOpacity={0.88}
      >
        <LinearGradient
          colors={['#FFF1F2', '#FFE4E6']}
          style={s.maidOnLeaveGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={s.maidOnLeaveLeft}>
            <View style={s.maidOnLeavePill}>
              <Text style={s.maidOnLeavePillText}>🚨 MORNING EMERGENCY</Text>
            </View>
            <Text style={s.maidOnLeaveTitle}>Maid or Cook on Leave Today?</Text>
            <Text style={s.maidOnLeaveSub}>
              Tap for 1-Tap Kitchen, Dishes & Sweeping substitute at ₹149 in ~10 mins.
            </Text>
          </View>
          <View style={s.maidOnLeaveAction}>
            <Text style={{ fontSize: 24 }}>⚡</Text>
            <Text style={s.maidOnLeaveActionText}>1-Tap Book</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Signature App Hero Banner */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        style={s.heroBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.heroHeaderRow}>
          <View style={s.heroEtaPill}>
            <Ionicons name="flash" size={12} color="#FFF" />
            <Text style={s.heroEtaPillText}>~10 MIN DISPATCH</Text>
          </View>
          <View style={s.radarLiveBeacon}>
            <View style={s.radarLiveDot} />
            <Text style={s.radarLiveText}>14 Active In Complex</Text>
          </View>
        </View>

        <Text style={s.heroTitle}>Instant Help,{'\n'}Right Now.</Text>
        <Text style={s.heroSub}>
          Verified society maid, cook, cleaner or ironer at your flat before your kettle boils.
        </Text>

        <View style={s.heroTrustRow}>
          <View style={s.heroTrustBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#34D399" />
            <Text style={s.heroTrustText}>Police Verified</Text>
          </View>
          <View style={s.heroTrustBadge}>
            <Ionicons name="star" size={12} color="#FBBF24" />
            <Text style={s.heroTrustText}>4.9★ Rated</Text>
          </View>
          <View style={s.heroTrustBadge}>
            <Ionicons name="card-outline" size={12} color="#FFF" />
            <Text style={s.heroTrustText}>Pay After Service</Text>
          </View>
        </View>
      </LinearGradient>

      {/* 🟢 "Currently Inside Complex" Live Turnstile Ticker */}
      <View style={s.insideComplexHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={s.turnstileActiveDot} />
          <Text style={s.insideComplexTitle}>CHECKED IN TODAY (INSIDE SOCIETY)</Text>
        </View>
        <Text style={s.insideComplexSubtitle}>Gate 1 Turnstile</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.insideComplexScroll}
      >
        {HELPERS_INSIDE_COMPLEX.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={s.insideHelperCard}
            onPress={() => selectInsideHelper(h)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[s.insideHelperAvatar, { backgroundColor: h.bg }]}>
                <Text style={[s.insideHelperAvatarText, { color: h.color }]}>{h.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={s.insideHelperName}>{h.name}</Text>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                </View>
                <Text style={s.insideHelperRole}>{h.role}</Text>
              </View>
            </View>

            <View style={s.insideHelperMetaRow}>
              <View style={s.insideHelperTag}>
                <Text style={s.insideHelperTagText}>📍 {h.tower}</Text>
              </View>
              <View style={[s.insideHelperTag, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[s.insideHelperTagText, { color: '#059669' }]}>⏱️ {h.freeSlot}</Text>
              </View>
            </View>

            <View style={s.insideHelperBottom}>
              <Text style={s.insideHelperClockIn}>Clock-in: {h.turnstileIn}</Text>
              <View style={s.insideHelperBookBtn}>
                <Text style={s.insideHelperBookBtnText}>Book →</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Quick Category Filters */}
      <View style={s.filterRow}>
        {['ALL', 'HOUSEWORK', 'COOKING', 'CLEANING', 'CHILDCARE'].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[s.filterChip, selectedFilter === cat && s.filterChipActive]}
            onPress={() => setSelectedFilter(cat)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterChipText, selectedFilter === cat && s.filterChipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Services Grid (App Theme: Clean White Surface Cards) */}
      <Text style={s.sectionTitle}>SELECT IMMEDIATE SERVICE</Text>
      <View style={s.serviceGrid}>
        {INSTA_SERVICES.map((svc) => (
          <TouchableOpacity
            key={svc.type}
            style={[s.serviceCard, { borderColor: svc.color + '26' }]}
            onPress={() => {
              setSelectedService(svc.type);
              setFlowStep('SELECT_SUBTASK');
            }}
            activeOpacity={0.85}
          >
            <View style={s.serviceCardTopRow}>
              <View style={[s.serviceEmojiBox, { backgroundColor: svc.bg }]}>
                <Text style={{ fontSize: 26 }}>{svc.emoji}</Text>
              </View>

              <View style={[s.serviceBadge, { backgroundColor: svc.bg }]}>
                <Text style={[s.serviceBadgeText, { color: svc.color }]}>{svc.badge}</Text>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={s.serviceLabel}>{svc.label}</Text>
              <Text style={[s.serviceTagline, { color: svc.color }]}>{svc.tagline}</Text>
              <Text style={s.serviceDesc} numberOfLines={2}>{svc.desc}</Text>
            </View>

            <View style={s.serviceCardBottom}>
              <View>
                <Text style={s.startingPriceLabel}>Starting</Text>
                <Text style={s.startingPriceVal}>{svc.startingPrice}</Text>
              </View>
              <View style={[s.serviceCardAction, { backgroundColor: svc.bg }]}>
                <Ionicons name="arrow-forward" size={14} color={svc.color} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trust Strip */}
      <View style={s.securityCallout}>
        <View style={s.securityIconWrap}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.securityTitle}>RWA Pre-Approved Domestic Network</Text>
          <Text style={s.securitySub}>
            Every helper holds an active gate entry badge, background verification, and COVID vaccine records synced with your Guard Desk.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // ── STEP 2: SUBTASK PICKER & VOICE INSTRUCTIONS ─────────────────────

  const renderSubtaskSelection = () => {
    if (!serviceConf) return null;
    return (
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service Hero */}
        <View style={[s.subtaskHeroCard, { backgroundColor: serviceConf.bg, borderColor: serviceConf.color + '33' }]}>
          <Text style={{ fontSize: 44 }}>{serviceConf.emoji}</Text>
          <Text style={[s.subtaskHeroTitle, { color: serviceConf.color }]}>{serviceConf.label}</Text>
          <Text style={s.subtaskHeroSub}>{serviceConf.desc}</Text>
          <View style={[s.subtaskPricePill, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[s.subtaskPriceText, { color: serviceConf.color }]}>Instant Dispatch · From {serviceConf.startingPrice}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>SELECT EXACT TASK</Text>
        <View style={s.subtaskGrid}>
          {serviceConf.subtasks.map((task) => {
            const isSelected = selectedSubtask === task;
            return (
              <TouchableOpacity
                key={task}
                style={[
                  s.subtaskChip,
                  isSelected && { borderColor: serviceConf.color, backgroundColor: serviceConf.bg },
                ]}
                onPress={() => setSelectedSubtask(task)}
                activeOpacity={0.8}
              >
                <Text style={[s.subtaskChipText, isSelected && { color: serviceConf.color, fontWeight: '700' }]}>
                  {task}
                </Text>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={16} color={serviceConf.color} style={{ marginLeft: 6 }} />
                ) : (
                  <Ionicons name="add" size={14} color={COLORS.textMuted} style={{ marginLeft: 6 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 🎙️ Voice Note / Audio Instructions for Domestic Staff */}
        <Text style={s.sectionTitle}>SPECIAL INSTRUCTIONS <Text style={s.optionalTag}>(OPTIONAL)</Text></Text>
        
        <View style={s.voiceNoteCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.voiceNoteTitle}>🎙️ Voice Note in Regional Language</Text>
            <Text style={s.voiceNoteSub}>
              {hasVoiceNote ? 'Voice note recorded (12 sec) for helper to listen' : 'Helpers prefer listening in Kannada/Hindi instead of text'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.voiceRecordBtn, hasVoiceNote && { backgroundColor: '#DCFCE7', borderColor: '#10B981' }]}
            onPress={() => {
              if (hasVoiceNote) {
                setIsPlayingVoice(!isPlayingVoice);
              } else {
                setHasVoiceNote(true);
                Alert.alert('Voice Note Recorded 🎙️', 'Recorded: "Bhaiya, kitchen utensils first, flat 402." Helper will hear this upon arrival.');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={hasVoiceNote ? (isPlayingVoice ? 'pause' : 'play') : 'mic'}
              size={18}
              color={hasVoiceNote ? '#059669' : COLORS.primary}
            />
            <Text style={[s.voiceRecordBtnText, hasVoiceNote && { color: '#059669' }]}>
              {hasVoiceNote ? (isPlayingVoice ? 'Pause' : 'Play 12s') : 'Record'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Text Input */}
        <TextInput
          style={s.instructionsInput}
          placeholder="e.g., Ring doorbell flat 402, please clean kitchen dishes first..."
          placeholderTextColor={COLORS.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />

        <Text style={s.quickPresetsLabel}>Tap to add quick instruction:</Text>
        <View style={s.presetWrap}>
          {QUICK_INSTRUCTION_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={s.presetPill}
              onPress={() => setNotes((prev) => (prev ? `${prev}, ${preset}` : preset))}
              activeOpacity={0.7}
            >
              <Text style={s.presetPillText}>+ {preset}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[s.primaryActionBtn, !selectedSubtask && s.primaryActionDisabled]}
          onPress={() => {
            if (selectedSubtask) setFlowStep('SELECT_DURATION');
          }}
          disabled={!selectedSubtask}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selectedSubtask ? ['#4F46E5', '#7C3AED'] : ['#CBD5E1', '#94A3B8']}
            style={s.primaryActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={s.primaryActionText}>
              {selectedSubtask ? 'Continue to Duration →' : 'Select a Task to Continue'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── STEP 3: DURATION & PRICING BREAKDOWN ─────────────────────────────

  const renderDurationSelection = () => {
    if (!serviceConf) return null;
    return (
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Selected Task Overview */}
        <View style={s.summaryCapsule}>
          <View style={[s.summaryCapsuleEmoji, { backgroundColor: serviceConf.bg }]}>
            <Text style={{ fontSize: 24 }}>{serviceConf.emoji}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.summaryCapsuleTitle}>{serviceConf.label}</Text>
            <Text style={s.summaryCapsuleSub}>{selectedSubtask}</Text>
          </View>
          <TouchableOpacity onPress={() => setFlowStep('SELECT_SUBTASK')} hitSlop={10}>
            <Text style={s.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>SELECT SERVICE DURATION</Text>
        {DURATION_OPTIONS.map((opt) => {
          const isSelected = selectedDuration === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                s.durationOptionCard,
                isSelected && s.durationOptionSelected,
              ]}
              onPress={() => setSelectedDuration(opt.value)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[s.durationTitle, isSelected && { color: COLORS.primary }]}>{opt.label}</Text>
                  {opt.tag && (
                    <View style={[s.durationTagPill, isSelected && { backgroundColor: COLORS.primaryLight }]}>
                      <Text style={[s.durationTagText, isSelected && { color: COLORS.primary }]}>{opt.tag}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.durationSub}>{opt.desc}</Text>
              </View>

              <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                <Text style={[s.durationPriceNum, isSelected && { color: COLORS.primary }]}>{opt.price}</Text>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={{ marginTop: 4 }} />
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={COLORS.textMuted} style={{ marginTop: 4 }} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Transparent Bill Breakdown */}
        <View style={s.billBreakdownCard}>
          <Text style={s.billTitle}>TRANSPARENT SOCIETY BILLING</Text>
          <View style={s.billRow}>
            <Text style={s.billLabel}>{serviceConf.label} ({durConf.hours})</Text>
            <Text style={s.billVal}>{durConf.price}</Text>
          </View>
          <View style={s.billRow}>
            <Text style={s.billLabel}>Society Safety & Verification Fee</Text>
            <Text style={[s.billVal, { color: COLORS.success }]}>FREE</Text>
          </View>
          <View style={s.billRow}>
            <Text style={s.billLabel}>Gate Security Pass Sync</Text>
            <Text style={[s.billVal, { color: COLORS.success }]}>INCLUDED</Text>
          </View>
          <View style={s.billDivider} />
          <View style={s.billTotalRow}>
            <Text style={s.billTotalLabel}>Total Payable After Service</Text>
            <Text style={s.billTotalVal}>{durConf.price}</Text>
          </View>
          <Text style={s.billZeroRisk}>Zero upfront fee · Pay via UPI or Cash only after completion</Text>
        </View>

        {/* Trigger Matching Button */}
        <TouchableOpacity
          style={s.primaryActionBtn}
          onPress={() => setFlowStep('MATCHING')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            style={s.primaryActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="flash" size={18} color="#FBBF24" style={{ marginRight: 8 }} />
            <Text style={s.primaryActionText}>
              Find Nearest Helper Now · {durConf.price}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── STEP 4: RADAR MATCHING SCREEN ───────────────────────────────────

  const renderMatchingRadar = () => {
    const radarMessages = [
      'Scanning verified domestic helpers inside Mana Foliage...',
      'Verifying police clearances & active society ratings...',
      'Connecting with Sunita D. in Tower B (free slot available)...',
      'Generating digital gate pass and pre-approving with Security Desk...',
    ];

    return (
      <View style={s.radarScreenContainer}>
        {/* Animated Concentric Radar Circles */}
        <View style={s.radarCircleStage}>
          <Animated.View
            style={[
              s.radarOuterRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: 0.25,
              },
            ]}
          />
          <Animated.View
            style={[
              s.radarMidRing,
              {
                transform: [{ scale: Animated.multiply(pulseAnim, 0.85) }],
                opacity: 0.45,
              },
            ]}
          />
          <View style={s.radarCore}>
            <Animated.View style={{ transform: [{ rotate: radarSpinDeg }] }}>
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={s.radarCoreGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="search" size={32} color="#FFF" />
              </LinearGradient>
            </Animated.View>
          </View>
        </View>

        <Text style={s.radarTitle}>Locating Your Helper...</Text>
        <Text style={s.radarSubtitle}>
          Dispatching a rated {serviceConf?.label.toLowerCase()} pro to your tower
        </Text>

        {/* Live Progress Bar */}
        <View style={s.radarProgressBarWrap}>
          <View style={[s.radarProgressBarFill, { width: `${matchProgress}%` }]} />
        </View>
        <Text style={s.radarPercentText}>{matchProgress}% complete</Text>

        {/* Real-time Status Card */}
        <View style={s.radarStatusCard}>
          <View style={s.radarStatusRow}>
            <View style={s.radarPulseDot} />
            <Text style={s.radarStatusText}>{radarMessages[radarStatusIndex]}</Text>
          </View>
        </View>

        {/* Security & Arrival Promise */}
        <View style={s.radarPromiseRow}>
          <Ionicons name="shield-checkmark" size={15} color={COLORS.success} />
          <Text style={s.radarPromiseText}>Pre-vetted community helper · 100% verified</Text>
        </View>

        <TouchableOpacity
          style={s.radarCancelBtn}
          onPress={() => {
            resetWizard();
          }}
          activeOpacity={0.7}
        >
          <Text style={s.radarCancelBtnText}>Cancel Request</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── STEP 5: HELPER MATCHED & LIVE TRACKER ───────────────────────────

  const renderMatchedAndTracking = () => {
    if (!matchedHelper || !serviceConf) return null;
    const isTracking = flowStep === 'TRACKING';
    const trackIdx = TRACKING_STEPS.findIndex(t => t.step === trackingStep);
    const isDone = trackingStep === 'DONE';

    return (
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Dynamic ETA Gradient Banner */}
        <LinearGradient
          colors={isDone ? ['#059669', '#10B981'] : ['#4F46E5', '#7C3AED']}
          style={s.liveEtaBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.liveEtaBadge}>
              {isDone ? 'COMPLETED' : (isTracking ? TRACKING_STEPS[trackIdx].label : 'HELPER ASSIGNED & EN ROUTE')}
            </Text>
            <Text style={s.liveEtaCountdown}>
              {isDone ? 'All Done! 🎉' : (etaRemaining > 0 ? fmtEta(etaRemaining) : 'Arriving now')}
            </Text>
            <Text style={s.liveEtaProximity}>
              📍 {matchedHelper.distanceLabel}
            </Text>
          </View>
          <View style={s.liveEtaIconCircle}>
            <Ionicons
              name={isDone ? 'checkmark-circle' : (isTracking ? TRACKING_STEPS[trackIdx].icon : 'time')}
              size={34}
              color="#FFF"
            />
          </View>
        </LinearGradient>

        {/* Helper Identity Profile Card with Tower-Level Social Proof */}
        <View style={s.helperProfileCard}>
          <View style={s.helperAvatarRow}>
            <View style={s.helperAvatarContainer}>
              <Text style={s.helperAvatarInitials}>{matchedHelper.avatar}</Text>
              <View style={s.helperOnlineDot} />
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.helperProfileName}>{matchedHelper.name}</Text>
                <View style={s.helperVerifiedShield}>
                  <Ionicons name="shield-checkmark" size={13} color="#FFF" />
                </View>
              </View>
              <Text style={s.helperProfileSpeciality}>{matchedHelper.speciality}</Text>
              <View style={s.helperRatingRow}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={s.helperRatingScore}>{matchedHelper.rating}</Text>
                <Text style={s.helperReviewCount}>({matchedHelper.reviewCount} jobs in society)</Text>
              </View>
            </View>
          </View>

          {/* Social Proof & Tower Endorsement Strip */}
          <View style={s.towerEndorsementBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="people" size={14} color={COLORS.primary} />
              <Text style={s.towerEndorsementTitle}>Neighbors Who Trust {matchedHelper.name}:</Text>
            </View>
            <Text style={s.towerEndorsementText}>{matchedHelper.towerResidents}</Text>
            <Text style={s.towerEndorsementSub}>Endorsed by {matchedHelper.endorsedBy}</Text>
          </View>

          {/* Trust Badges */}
          <View style={s.helperTrustDeck}>
            <View style={[s.trustTagItem, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark" size={12} color="#059669" />
              <Text style={[s.trustTagText, { color: '#059669' }]}>Police Verified</Text>
            </View>
            <View style={[s.trustTagItem, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="time" size={12} color="#4F46E5" />
              <Text style={[s.trustTagText, { color: '#4F46E5' }]}>{matchedHelper.turnstileTime}</Text>
            </View>
            <View style={[s.trustTagItem, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="chatbubbles" size={12} color="#D97706" />
              <Text style={[s.trustTagText, { color: '#D97706' }]}>🗣️ {matchedHelper.languages.join(', ')}</Text>
            </View>
          </View>

          {/* Digital Society Gate Pass Notification */}
          <View style={s.gatePassNoticeCard}>
            <View style={s.gatePassIconBox}>
              <Ionicons name="qr-code-outline" size={16} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.gatePassNoticeTitle}>Digital Gate Pass #{matchedHelper.gatePassNo}</Text>
              <Text style={s.gatePassNoticeSub}>Pre-approved with Main Gate & Tower Security</Text>
            </View>
          </View>
        </View>

        {/* 📦 Material Out-Gate Pass Generator (Clearance for Gate Security) */}
        <View style={s.outPassBox}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>📦</Text>
              <Text style={s.outPassTitle}>Giving Items to Take Home?</Text>
            </View>
            <Text style={s.outPassSub}>
              {outPassGeneratedNo
                ? `Active Out-Pass #${outPassGeneratedNo} issued for ${selectedOutItem}`
                : 'Issue Material Out-Pass so Security doesn’t stop them at Gate 1.'}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.outPassTriggerBtn, outPassGeneratedNo ? { backgroundColor: '#DCFCE7' } : null]}
            onPress={() => setOutPassModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={[s.outPassTriggerBtnText, outPassGeneratedNo ? { color: '#059669' } : null]}>
              {outPassGeneratedNo ? 'View Pass' : 'Issue Pass'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Start OTP PIN Card (Shown before session start) */}
        {!isTracking && !otpConfirmed && (
          <View style={s.otpCard}>
            <View style={s.otpHeader}>
              <Ionicons name="key" size={18} color="#7C3AED" />
              <Text style={s.otpTitle}>SESSION START OTP</Text>
            </View>
            <Text style={s.otpSub}>
              Share this 4-digit code with {matchedHelper.name} when they arrive at your door to start the timer.
            </Text>

            <View style={s.otpDigitsRow}>
              {sessionOtp.split('').map((digit, i) => (
                <View key={i} style={s.otpBox}>
                  <Text style={s.otpDigit}>{digit}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={s.startSessionBtn}
              onPress={async () => {
                if (bookingData?.bookingRef) {
                  try {
                    await instaHelpService.startSession(bookingData.bookingRef);
                  } catch {}
                }
                setOtpConfirmed(true);
                setFlowStep('TRACKING');
              }}
              activeOpacity={0.85}
            >
              <Text style={s.startSessionBtnText}>✅ Helper Arrived — Start Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Live Progress Timeline (During Tracking) */}
        {isTracking && (
          <View style={s.timelineCard}>
            <Text style={s.timelineTitle}>LIVE MILESTONES</Text>
            {TRACKING_STEPS.map((step, idx) => {
              const isPast = idx < trackIdx;
              const isCurrent = idx === trackIdx;
              return (
                <View key={step.step} style={s.timelineRow}>
                  <View style={s.timelineLeft}>
                    <View
                      style={[
                        s.timelineDot,
                        isPast && s.timelineDotPast,
                        isCurrent && s.timelineDotCurrent,
                      ]}
                    >
                      {isPast ? (
                        <Ionicons name="checkmark" size={12} color="#FFF" />
                      ) : (
                        <Ionicons name={step.icon} size={12} color={isCurrent ? '#FFF' : COLORS.textMuted} />
                      )}
                    </View>
                    {idx < TRACKING_STEPS.length - 1 && (
                      <View style={[s.timelineLine, isPast && s.timelineLinePast]} />
                    )}
                  </View>

                  <View style={s.timelineRight}>
                    <Text style={[s.timelineLabel, (isPast || isCurrent) && { color: COLORS.text }]}>
                      {step.label}
                    </Text>
                    <Text style={s.timelineDesc}>{step.desc}</Text>
                  </View>
                  {isCurrent && (
                    <View style={s.liveNowBadge}>
                      <Text style={s.liveNowText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Closure OTP Reminder (During Active Work) */}
        {isTracking && !isDone && (
          <View style={s.closureOtpStrip}>
            <Ionicons name="lock-closed" size={14} color="#7C3AED" />
            <Text style={s.closureOtpLabel}>Closure OTP PIN:</Text>
            <Text style={s.closureOtpVal}>{sessionOtp}</Text>
            <Text style={s.closureOtpHint}>Share to end session</Text>
          </View>
        )}

        {/* Complete / Rate Trigger (When Done) */}
        {isDone && (
          <TouchableOpacity
            style={s.rateDirectBtn}
            onPress={() => setFlowStep('RATE')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={s.primaryActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.primaryActionText}>Rate & Tip {matchedHelper.name} →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick Communication & Action Bar */}
        {!isDone && (
          <View style={s.actionDeckRow}>
            <TouchableOpacity
              style={s.actionDeckBtn}
              onPress={() => Alert.alert('Call Pro', `Connecting you with ${matchedHelper.name}:\n📞 +91 98451 20491`)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={18} color={COLORS.primary} />
              <Text style={s.actionDeckBtnText}>Call Helper</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionDeckBtn}
              onPress={() => Alert.alert(
                'Security Desk Intercom',
                `Gate 1 Guard Intercom:\nHelper: ${matchedHelper.name}\nDestination: Flat 402, Tower B\nDial Ext 104 if helper needs directions.`
              )}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-outline" size={18} color={COLORS.primary} />
              <Text style={s.actionDeckBtnText}>Security Desk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionDeckBtn, { borderColor: '#FEE2E2' }]}
              onPress={() => Alert.alert(
                'Cancel Session?',
                'Are you sure you want to cancel? The helper will be redirected.',
                [
                  { text: 'Keep Session', style: 'cancel' },
                  {
                    text: 'Cancel',
                    style: 'destructive',
                    onPress: async () => {
                      if (bookingData?.bookingRef) {
                        try { await instaHelpService.cancelBooking(bookingData.bookingRef); } catch {}
                      }
                      resetWizard();
                    },
                  },
                ]
              )}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.error} />
              <Text style={[s.actionDeckBtnText, { color: COLORS.error }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  // ── STEP 6: RATING, COMPLIMENTS & TIPPING ────────────────────────────

  const renderRatingScreen = () => {
    if (!matchedHelper || !serviceConf) return null;
    return (
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.ratingCard}>
          <Text style={{ fontSize: 50, marginTop: 10 }}>🎉</Text>
          <Text style={s.ratingTitle}>Service Completed!</Text>
          <Text style={s.ratingSub}>
            {matchedHelper.name} finished your {serviceConf.label.toLowerCase()} session. How was your experience?
          </Text>

          {/* Interactive Star Row */}
          <View style={s.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                hitSlop={10}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={rating >= star ? 'star' : 'star-outline'}
                  size={42}
                  color={rating >= star ? '#F59E0B' : '#CBD5E1'}
                  style={{ marginHorizontal: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.ratingScoreLabel}>{rating === 5 ? 'Excellent & Flawless! 🌟' : `${rating} Stars`}</Text>

          {/* Compliments */}
          <Text style={[s.sectionTitle, { alignSelf: 'flex-start', marginTop: 24 }]}>ADD COMPLIMENTS</Text>
          <View style={s.complimentWrap}>
            {COMPLIMENT_TAGS.map((tag) => {
              const isSelected = selectedCompliments.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[s.complimentChip, isSelected && s.complimentChipSelected]}
                  onPress={() => toggleCompliment(tag)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.complimentChipText, isSelected && { color: COLORS.primary, fontWeight: '700' }]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tip Your Helper */}
          <Text style={[s.sectionTitle, { alignSelf: 'flex-start', marginTop: 24 }]}>TIP YOUR HELPER (100% GOES TO THEM)</Text>
          <View style={s.tipRow}>
            {[0, 30, 50, 100].map((tip) => (
              <TouchableOpacity
                key={tip}
                style={[s.tipBtn, selectedTip === tip && s.tipBtnSelected]}
                onPress={() => setSelectedTip(tip)}
                activeOpacity={0.8}
              >
                <Text style={[s.tipBtnText, selectedTip === tip && { color: '#FFF', fontWeight: '800' }]}>
                  {tip === 0 ? 'No Tip' : `₹${tip}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[s.primaryActionBtn, { width: '100%', marginTop: 24 }]}
            onPress={async () => {
              if (bookingData?.bookingRef) {
                try {
                  await instaHelpService.rateBooking(bookingData.bookingRef, {
                    rating,
                    feedback: selectedCompliments.join(', '),
                  });
                } catch {}
              }
              Alert.alert(
                'Thank you! 🙏',
                `Your rating and tip for ${matchedHelper.name} have been registered.`,
                [
                  {
                    text: 'Done',
                    onPress: () => {
                      resetWizard();
                      router.back();
                    },
                  },
                ]
              );
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={s.primaryActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={s.primaryActionText}>
                Submit Feedback {selectedTip > 0 ? `· Pay ₹${durConf.priceNum + selectedTip}` : ''}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ── Main Render Structure ───────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      {renderHeader(
        activeTab === 'MY_SESSIONS'
          ? 'My Sessions'
          : flowStep === 'SELECT_SERVICE'
          ? 'Insta-Help ⚡'
          : flowStep === 'SELECT_SUBTASK'
          ? serviceConf?.label || 'Insta-Help'
          : flowStep === 'SELECT_DURATION'
          ? 'Select Duration'
          : flowStep === 'MATCHING'
          ? 'Matching Radar'
          : flowStep === 'RATE'
          ? 'Rating & Tip'
          : 'Live Pro Tracking',
        flowStep !== 'SELECT_SERVICE' || activeTab === 'MY_SESSIONS'
      )}

      {/* Top Segmented Tab Switcher (Visible on Main Screen) */}
      {flowStep === 'SELECT_SERVICE' && (
        <View style={s.segmentedTabWrap}>
          <TouchableOpacity
            style={[s.segmentedTab, activeTab === 'BOOK' && s.segmentedTabActive]}
            onPress={() => setActiveTab('BOOK')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="flash"
              size={14}
              color={activeTab === 'BOOK' ? '#FFFFFF' : COLORS.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[s.segmentedTabText, activeTab === 'BOOK' && s.segmentedTabTextActive]}>
              Book Insta-Help
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.segmentedTab, activeTab === 'MY_SESSIONS' && s.segmentedTabActive]}
            onPress={() => setActiveTab('MY_SESSIONS')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="receipt-outline"
              size={14}
              color={activeTab === 'MY_SESSIONS' ? '#FFFFFF' : COLORS.textMuted}
              style={{ marginRight: 6 }}
            />
            <Text style={[s.segmentedTabText, activeTab === 'MY_SESSIONS' && s.segmentedTabTextActive]}>
              My Sessions
            </Text>
            {matchedHelper && (
              <View style={s.tabLiveDot} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Screen Content Switcher */}
      {activeTab === 'MY_SESSIONS' ? (
        renderMySessions()
      ) : (
        flowStep === 'SELECT_SERVICE' ? renderServiceSelection() :
        flowStep === 'SELECT_SUBTASK' ? renderSubtaskSelection() :
        flowStep === 'SELECT_DURATION' ? renderDurationSelection() :
        flowStep === 'MATCHING' ? renderMatchingRadar() :
        flowStep === 'RATE' ? renderRatingScreen() :
        renderMatchedAndTracking()
      )}

      {/* 📦 Material Out-Pass Bottom Sheet Modal */}
      <Modal
        visible={outPassModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOutPassModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={s.modalTitle}>Issue Material Out-Gate Pass</Text>
              <TouchableOpacity onPress={() => setOutPassModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>
              Required by society security when domestic workers carry household items or packages out through the gate.
            </Text>

            <Text style={s.modalSectionLabel}>Select Item Being Carried:</Text>
            {OUT_GATE_ITEM_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[s.outItemRow, selectedOutItem === item && s.outItemRowSelected]}
                onPress={() => setSelectedOutItem(item)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={selectedOutItem === item ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selectedOutItem === item ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[s.outItemText, selectedOutItem === item && { color: COLORS.primary, fontWeight: '700' }]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[s.primaryActionBtn, { marginTop: 20 }]}
              onPress={() => {
                const passNumber = `OP-${Math.floor(1000 + Math.random() * 9000)}`;
                setOutPassGeneratedNo(passNumber);
                setOutPassModalVisible(false);
                Alert.alert(
                  'Out-Pass Approved! ✅',
                  `Material Out-Pass #${passNumber} for "${selectedOutItem}" has been sent to Main Gate Security. Helper can exit Gate 1 without delay.`
                );
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={s.primaryActionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={s.primaryActionText}>
                  {outPassGeneratedNo ? 'Update & Re-Sync Pass' : 'Approve & Sync with Gate Security'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles (Standard App Theme / Clean Surface Light Palette) ────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  headerLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  headerLocationText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  helpIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Segmented Tabs
  segmentedTabWrap: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: RADIUS.full,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
  },
  segmentedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: RADIUS.full,
  },
  segmentedTabActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  segmentedTabText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  segmentedTabTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  tabLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },

  // 🚨 "Maid on Leave" Card
  maidOnLeaveCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#FECDD3',
    ...SHADOWS.sm,
  },
  maidOnLeaveGradient: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  maidOnLeaveLeft: {
    flex: 1,
    marginRight: 10,
  },
  maidOnLeavePill: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  maidOnLeavePillText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#E11D48',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  maidOnLeaveTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: '#9F1239',
  },
  maidOnLeaveSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#BE123C',
    marginTop: 2,
    lineHeight: 16,
  },
  maidOnLeaveAction: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDA4AF',
    ...SHADOWS.sm,
  },
  maidOnLeaveActionText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#E11D48',
    fontWeight: '800',
    marginTop: 2,
  },

  // Hero Banner (Signature App Indigo Gradient)
  heroBanner: {
    borderRadius: RADIUS.lg,
    padding: 18,
    ...SHADOWS.md,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroEtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    gap: 4,
  },
  heroEtaPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  radarLiveBeacon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    gap: 5,
  },
  radarLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  radarLiveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: FONTS.displayEB,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: 'rgba(255, 255, 255, 0.88)',
    marginTop: 5,
    lineHeight: 18,
  },
  heroTrustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  heroTrustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroTrustText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONTS.medium,
  },

  // 🟢 "Currently Inside Complex" Ticker
  insideComplexHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  turnstileActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  insideComplexTitle: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: 0.6,
  },
  insideComplexSubtitle: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  insideComplexScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  insideHelperCard: {
    width: 220,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  insideHelperAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insideHelperAvatarText: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
  },
  insideHelperName: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  insideHelperRole: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  insideHelperMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  insideHelperTag: {
    backgroundColor: COLORS.backgroundAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  insideHelperTagText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  insideHelperBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  insideHelperClockIn: {
    fontSize: 9,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  insideHelperBookBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  insideHelperBookBtnText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // Category Filter Pills
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },

  // Section Headers
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  optionalTag: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textTransform: 'none',
  },

  // Services Grid
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: (SCREEN_W - 44) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    minHeight: 196,
    ...SHADOWS.sm,
  },
  serviceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceEmojiBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  serviceBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '800',
  },
  serviceLabel: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
  },
  serviceTagline: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    marginTop: 2,
    fontWeight: '600',
  },
  serviceDesc: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  serviceCardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  startingPriceLabel: {
    fontSize: 9,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  startingPriceVal: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  serviceCardAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Security Callout
  securityCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  securityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    fontWeight: '700',
  },
  securitySub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },

  // Subtask Screen
  subtaskHeroCard: {
    borderRadius: RADIUS.lg,
    padding: 22,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  subtaskHeroTitle: {
    fontSize: 22,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    marginTop: 8,
  },
  subtaskHeroSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  subtaskPricePill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
    ...SHADOWS.sm,
  },
  subtaskPriceText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  subtaskGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subtaskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  subtaskChipText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },

  // Voice Note Card
  voiceNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  voiceNoteTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  voiceNoteSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  voiceRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
  },
  voiceRecordBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  instructionsInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 14,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    ...SHADOWS.sm,
  },
  quickPresetsLabel: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 10,
    marginBottom: 6,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },
  presetPillText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },

  // Primary Action Button
  primaryActionBtn: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: 12,
    ...SHADOWS.md,
  },
  primaryActionDisabled: {
    opacity: 0.5,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryActionText: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Duration Selection
  summaryCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  summaryCapsuleEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCapsuleTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  summaryCapsuleSub: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginTop: 1,
  },
  changeLink: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  durationOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  durationOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  durationTitle: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.text,
  },
  durationTagPill: {
    backgroundColor: COLORS.backgroundAlt,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  durationTagText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
    fontWeight: '800',
  },
  durationSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  durationPriceNum: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    fontWeight: '900',
    color: COLORS.text,
  },

  // Bill Breakdown
  billBreakdownCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  billTitle: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  billVal: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  billDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 8,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  billTotalLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  billTotalVal: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    fontWeight: '900',
    color: COLORS.primary,
  },
  billZeroRisk: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.success,
    marginTop: 8,
    textAlign: 'center',
  },

  // Radar Screen
  radarScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  radarCircleStage: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 20,
  },
  radarOuterRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: COLORS.primaryMid,
  },
  radarMidRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  radarCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  radarCoreGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarTitle: {
    fontSize: 22,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  radarSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  radarProgressBarWrap: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginTop: 24,
    overflow: 'hidden',
  },
  radarProgressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  radarPercentText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginTop: 6,
  },
  radarStatusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    width: '100%',
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  radarStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radarPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
  },
  radarStatusText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    flex: 1,
  },
  radarPromiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  radarPromiseText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.success,
  },
  radarCancelBtn: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  radarCancelBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.error,
    textDecorationLine: 'underline',
  },

  // Live ETA Banner
  liveEtaBanner: {
    borderRadius: RADIUS.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.md,
  },
  liveEtaBadge: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveEtaCountdown: {
    fontSize: 28,
    fontFamily: FONTS.displayEB,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  liveEtaProximity: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  liveEtaIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Helper Profile Card
  helperProfileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  helperAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperAvatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  helperAvatarInitials: {
    fontSize: 22,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.primary,
  },
  helperOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  helperProfileName: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  helperVerifiedShield: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperProfileSpeciality: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  helperRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  helperRatingScore: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#D97706',
  },
  helperReviewCount: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },

  // Tower Social Proof
  towerEndorsementBox: {
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  towerEndorsementTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  towerEndorsementText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginTop: 3,
  },
  towerEndorsementSub: {
    fontSize: 10,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  helperTrustDeck: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  trustTagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trustTagText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
  },
  gatePassNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 12,
  },
  gatePassIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatePassNoticeTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  gatePassNoticeSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },

  // Material Out-Pass Box
  outPassBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    ...SHADOWS.sm,
  },
  outPassTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#C2410C',
  },
  outPassSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  outPassTriggerBtn: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FDBA74',
    marginLeft: 10,
  },
  outPassTriggerBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#C2410C',
  },

  // Session OTP Card
  otpCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.lg,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    ...SHADOWS.sm,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otpTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#7C3AED',
    letterSpacing: 0.8,
  },
  otpSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: '#6D28D9',
    marginTop: 4,
    lineHeight: 18,
  },
  otpDigitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 14,
  },
  otpBox: {
    width: 52,
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  otpDigit: {
    fontSize: 28,
    fontFamily: FONTS.displayEB,
    fontWeight: '900',
    color: '#7C3AED',
  },
  startSessionBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: RADIUS.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  startSessionBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Timeline
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  timelineTitle: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeft: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotPast: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  timelineDotCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: COLORS.borderLight,
    marginVertical: 2,
  },
  timelineLinePast: {
    backgroundColor: COLORS.success,
  },
  timelineRight: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.textMuted,
  },
  timelineDesc: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  liveNowBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  liveNowText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  closureOtpStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    gap: 8,
  },
  closureOtpLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#6D28D9',
  },
  closureOtpVal: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: '900',
    color: '#7C3AED',
    letterSpacing: 2,
  },
  closureOtpHint: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: '#7C3AED',
    marginLeft: 'auto',
  },
  rateDirectBtn: {
    marginTop: 14,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },

  // Action Deck
  actionDeckRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionDeckBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  actionDeckBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },

  // Rating Screen
  ratingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  ratingTitle: {
    fontSize: 22,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 10,
  },
  ratingSub: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  starRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  ratingScoreLabel: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#D97706',
    marginTop: 8,
  },
  complimentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  complimentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  complimentChipSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  complimentChipText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  tipBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  tipBtnSelected: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  tipBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },

  // Active Session Card (My Sessions Tab)
  activeSessionCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    ...SHADOWS.md,
  },
  activeSessionInner: {
    padding: 18,
  },
  activeSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  livePulseText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#059669',
    fontWeight: '800',
  },
  activeSessionEta: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.primary,
  },
  activeSessionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  activeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarText: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  activeHelperName: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  activeHelperSub: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  activeHelperDistance: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  activeSessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  activeOtpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F3FF',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeOtpLabel: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#7C3AED',
  },
  activeOtpCode: {
    fontSize: 13,
    fontFamily: FONTS.displayBold,
    color: '#7C3AED',
    letterSpacing: 1.5,
  },
  resumeTrackBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  resumeTrackBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },

  // Empty Sessions Card
  emptySessionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  emptySessionsTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 12,
  },
  emptySessionsSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyBookBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 16,
  },
  emptyBookBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },

  // Session Item Card
  sessionItemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  sessionItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionService: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  sessionSubtask: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  sessionStatus: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#059669',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  sessionItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sessionRef: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  sessionPrice: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },

  // Past Bookings
  historyEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  historyEmptyText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  pastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  pastService: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  pastDate: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  pastPro: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pastAmount: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  rebookBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: 4,
  },
  rebookBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // Modal (Out-Pass Bottom Sheet)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  outItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 8,
    gap: 10,
  },
  outItemRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  outItemText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
});
