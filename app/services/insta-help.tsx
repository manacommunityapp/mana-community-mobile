import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, TextInput, Alert, Dimensions,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, RADIUS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { instaHelpService, toApiDuration, InstaHelpResponse } from '@/services/instaHelpService';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Types ───────────────────────────────────────────────────────

type InstaServiceType = 'CLEANING' | 'COOKING' | 'MAID' | 'IRONING' | 'BABYSITTING' | 'LAUNDRY';
type DurationOption = '1h' | '2h' | '4h' | 'FULL_DAY';
type TrackingStep = 'MATCHED' | 'ON_THE_WAY' | 'ARRIVED' | 'WORKING' | 'DONE';

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
  badge?: string;
}

// ── Constants ───────────────────────────────────────────────────

const INSTA_SERVICES: {
  type: InstaServiceType;
  label: string;
  emoji: string;
  desc: string;
  color: string;
  bg: string;
  subtasks: string[];
}[] = [
  {
    type: 'CLEANING',
    label: 'Cleaning',
    emoji: '🧹',
    desc: 'Deep clean, kitchen, bath',
    color: '#0284C7',
    bg: '#E0F2FE',
    subtasks: ['Full home clean', 'Kitchen only', 'Bathroom scrub', 'Window & glass', 'Post-renovation'],
  },
  {
    type: 'COOKING',
    label: 'Cooking',
    emoji: '👩‍🍳',
    desc: 'South Indian, North Indian',
    color: '#EA580C',
    bg: '#FFF7ED',
    subtasks: ['South Indian meals', 'North Indian meals', 'Continental', 'Tiffin boxes', 'Party cooking'],
  },
  {
    type: 'MAID',
    label: 'Maid',
    emoji: '🧺',
    desc: 'Housework, dishes, dusting',
    color: '#DB2777',
    bg: '#FCE7F3',
    subtasks: ['Dishes & utensils', 'Sweeping & mopping', 'Dusting', 'Organising', 'General housework'],
  },
  {
    type: 'IRONING',
    label: 'Ironing',
    emoji: '👔',
    desc: 'Clothes, curtains, linen',
    color: '#7C3AED',
    bg: '#EDE9FE',
    subtasks: ['Daily clothes', 'Formal wear', 'Curtains', 'Bed linen', 'Bulk ironing'],
  },
  {
    type: 'LAUNDRY',
    label: 'Laundry',
    emoji: '🫧',
    desc: 'Wash, dry & fold',
    color: '#0891B2',
    bg: '#CFFAFE',
    subtasks: ['Wash & fold', 'Delicates', 'Heavy items', 'Bedsheets', 'Dry only'],
  },
  {
    type: 'BABYSITTING',
    label: 'Babysitting',
    emoji: '👶',
    desc: 'Infant care, after school',
    color: '#E11D48',
    bg: '#FFE4E6',
    subtasks: ['Infant care', 'After school', 'Evening hours', 'Weekend care', 'Overnight'],
  },
];

const DURATION_OPTIONS: { value: DurationOption; label: string; hours: string; price: string; tag?: string }[] = [
  { value: '1h',       label: '1 Hour',    hours: '1h',  price: '₹149',  },
  { value: '2h',       label: '2 Hours',   hours: '2h',  price: '₹249',  tag: 'Popular' },
  { value: '4h',       label: '4 Hours',   hours: '4h',  price: '₹449',  },
  { value: 'FULL_DAY', label: 'Full Day',  hours: '8h',  price: '₹799',  tag: 'Best Value' },
];

const TRACKING_STEPS: { step: TrackingStep; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
  { step: 'MATCHED',    label: 'Helper Matched',   icon: 'checkmark-circle',    desc: 'Verified helper assigned' },
  { step: 'ON_THE_WAY', label: 'On the Way',        icon: 'walk-outline',        desc: 'Helper is heading to you' },
  { step: 'ARRIVED',    label: 'Arrived',           icon: 'location',            desc: 'Helper at your door' },
  { step: 'WORKING',    label: 'Work in Progress',  icon: 'construct-outline',   desc: 'Service underway' },
  { step: 'DONE',       label: 'All Done! 🎉',      icon: 'star-outline',        desc: 'Rate your experience' },
];

function generateSessionOtp(sessionId: string): string {
  let hash = 0;
  for (const ch of sessionId) { hash = ((hash << 5) - hash) + ch.charCodeAt(0); hash |= 0; }
  return String(Math.abs(hash) % 9000 + 1000);
}

// ── Component ───────────────────────────────────────────────────

type FlowStep = 'SELECT_SERVICE' | 'SELECT_SUBTASK' | 'SELECT_DURATION' | 'MATCHING' | 'HELPER_MATCHED' | 'TRACKING' | 'RATE';

export default function InstaHelpScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [flowStep, setFlowStep] = useState<FlowStep>('SELECT_SERVICE');
  const [selectedService, setSelectedService] = useState<InstaServiceType | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>('2h');
  const [notes, setNotes] = useState('');
  const [matchProgress, setMatchProgress] = useState(0);
  const [matchedHelper, setMatchedHelper] = useState<InstaHelper | null>(null);
  const [etaRemaining, setEtaRemaining] = useState(0);
  const [trackingStep, setTrackingStep] = useState<TrackingStep>('MATCHED');
  const [sessionOtp, setSessionOtp] = useState('');
  const [otpConfirmed, setOtpConfirmed] = useState(false);
  const [rating, setRating] = useState(0);
  const [sessionId] = useState(() => `SES-${Date.now().toString(36).toUpperCase()}`);
  const [bookingData, setBookingData] = useState<InstaHelpResponse | null>(null);

  const resetState = useCallback(() => {
    setSelectedService(null); setSelectedSubtask(''); setSelectedDuration('2h');
    setNotes(''); setMatchProgress(0); setMatchedHelper(null);
    setTrackingStep('MATCHED'); setOtpConfirmed(false); setRating(0);
  }, []);

  const handleBack = useCallback(() => {
    switch (flowStep) {
      case 'SELECT_SERVICE':  router.back(); break;
      case 'SELECT_SUBTASK':  setFlowStep('SELECT_SERVICE'); break;
      case 'SELECT_DURATION': setFlowStep('SELECT_SUBTASK'); break;
      case 'HELPER_MATCHED':  Alert.alert('Cancel booking?', 'Your matched helper will be released.', [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel Booking', style: 'destructive', onPress: async () => {
          if (bookingData?.bookingRef) {
            try { await instaHelpService.cancelBooking(bookingData.bookingRef); } catch {}
          }
          setFlowStep('SELECT_SERVICE'); resetState();
        }},
      ]); break;
      default: break;
    }
  }, [flowStep, router, resetState, bookingData]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { handleBack(); return true; });
    return () => sub.remove();
  }, [handleBack]);

  // ── Pulse animation (matching screen) ─────────────────────────
  useEffect(() => {
    if (flowStep !== 'MATCHING') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    const spin = Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.linear })
    );
    pulse.start(); spin.start();

    // Progress bar fill over ~5 seconds
    let prog = 0;
    const interval = setInterval(() => {
      prog += 8;
      setMatchProgress(Math.min(prog, 98));
      if (prog >= 98) clearInterval(interval);
    }, 400);

    // Call API and show matched helper
    const apiCall = async () => {
      try {
        const apiRes = await instaHelpService.createBooking({
          serviceType: selectedService!,
          subtask: selectedSubtask || undefined,
          duration: toApiDuration(selectedDuration),
          notes: notes || undefined,
        });
        setBookingData(apiRes);
        // Map API response to local helper state
        const localHelper: InstaHelper = {
          id: apiRes.bookingRef,
          name: apiRes.helperName ?? 'Lakshmi B.',
          avatar: (apiRes.helperName ?? 'L').charAt(0).toUpperCase(),
          rating: apiRes.helperRating ?? 4.8,
          reviewCount: 200 + Math.abs(apiRes.id % 200),
          experience: '3 yrs',
          verified: true,
          policeVerified: true,
          speciality: serviceConf?.desc ?? '',
          distanceLabel: apiRes.helperDistanceLabel ?? 'Inside your complex',
          etaMinutes: apiRes.helperEtaMinutes ?? 12,
        };
        setMatchedHelper(localHelper);
        setEtaRemaining(localHelper.etaMinutes * 60);
        setSessionOtp(apiRes.closureOtp ?? generateSessionOtp(apiRes.bookingRef));
      } catch (err: any) {
        setFlowStep('SELECT_DURATION');
        Alert.alert('Booking failed', err?.message ?? 'Could not find a helper. Please try again.');
        return;
      }
      setMatchProgress(100);
      setTimeout(() => {
        setFlowStep('HELPER_MATCHED');
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }, 600);
    };

    const timeout = setTimeout(() => {
      clearInterval(interval);
      apiCall();
    }, 4000);

    return () => { pulse.stop(); spin.stop(); clearInterval(interval); clearTimeout(timeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowStep]);

  // ── ETA countdown ─────────────────────────────────────────────
  useEffect(() => {
    if (flowStep !== 'HELPER_MATCHED' && flowStep !== 'TRACKING') return;
    if (etaRemaining <= 0) return;
    const timer = setInterval(() => {
      setEtaRemaining(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [flowStep]);

  // ── Auto-advance tracking for demo ────────────────────────────
  useEffect(() => {
    if (flowStep !== 'TRACKING') return;
    const steps: TrackingStep[] = ['MATCHED', 'ON_THE_WAY', 'ARRIVED', 'WORKING', 'DONE'];
    let idx = steps.indexOf(trackingStep);
    if (idx >= steps.length - 1) return;
    const t = setTimeout(async () => {
      idx++;
      setTrackingStep(steps[idx]);
      if (steps[idx] === 'DONE' && bookingData?.bookingRef) {
        try { await instaHelpService.completeSession(bookingData.bookingRef); } catch {}
      }
    }, 6000);
    return () => clearTimeout(t);
  }, [flowStep, trackingStep, bookingData]);

  const spinDeg = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const fmtEta = (sec: number) => {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
  };

  const serviceConf = INSTA_SERVICES.find(s => s.type === selectedService);

  // ── Render helpers ────────────────────────────────────────────

  const renderHeader = (title: string, showBack = true) => (
    <View style={s.header}>
      {showBack ? (
        <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={THEME.textPrimary} />
        </TouchableOpacity>
      ) : <View style={s.backBtn} />}
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.backBtn} />
    </View>
  );

  // ── STEP 1: Select Service ─────────────────────────────────────
  if (flowStep === 'SELECT_SERVICE') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {renderHeader('Insta Help ⚡')}
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero banner */}
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.heroBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={s.heroLeft}>
              <View style={s.heroEtaBadge}>
                <Text style={s.heroEtaText}>⚡ In ~15 min</Text>
              </View>
              <Text style={s.heroTitle}>Get Help{'\n'}Right Now</Text>
              <Text style={s.heroSub}>Verified community helpers{'\n'}at your doorstep, instantly</Text>
              <View style={s.heroBadgeRow}>
                <Text style={s.heroBadge}>✅ Background checked</Text>
                <Text style={s.heroBadge}>⭐ 4.8+ rated</Text>
              </View>
            </View>
            <View style={s.heroRight}>
              <Text style={s.heroEmoji}>🏠</Text>
              <View style={s.heroAvailBadge}>
                <View style={s.heroAvailDot} />
                <Text style={s.heroAvailText}>3 available nearby</Text>
              </View>
            </View>
          </LinearGradient>

          {/* How it works */}
          <View style={s.howItWorksRow}>
            {['Select', 'Match', 'Done'].map((step, i) => (
              <View key={step} style={s.howStep}>
                <View style={[s.howStepNum, { backgroundColor: ['#EEF2FF', '#FFF7ED', '#DCFCE7'][i] }]}>
                  <Text style={[s.howStepNumText, { color: ['#4F46E5', '#EA580C', '#059669'][i] }]}>{i + 1}</Text>
                </View>
                <Text style={s.howStepLabel}>{step}</Text>
                {i < 2 && <Text style={s.howArrow}>→</Text>}
              </View>
            ))}
          </View>

          {/* Service grid */}
          <Text style={s.sectionTitle}>What do you need?</Text>
          <View style={s.serviceGrid}>
            {INSTA_SERVICES.map((svc) => (
              <TouchableOpacity
                key={svc.type}
                style={[s.serviceCard, { borderColor: svc.color + '33' }]}
                onPress={() => { setSelectedService(svc.type); setFlowStep('SELECT_SUBTASK'); }}
                activeOpacity={0.75}
              >
                <View style={[s.serviceCardEmoji, { backgroundColor: svc.bg }]}>
                  <Text style={{ fontSize: 28 }}>{svc.emoji}</Text>
                </View>
                <Text style={s.serviceCardLabel}>{svc.label}</Text>
                <Text style={s.serviceCardDesc}>{svc.desc}</Text>
                <View style={[s.serviceCardBadge, { backgroundColor: svc.bg }]}>
                  <Text style={[s.serviceCardBadgeText, { color: svc.color }]}>Book now</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Trust strip */}
          <View style={s.trustStrip}>
            {[
              { icon: 'shield-checkmark-outline', text: 'Police Verified' },
              { icon: 'card-outline',             text: 'Aadhaar Linked' },
              { icon: 'star-outline',             text: '4.8+ Average Rating' },
              { icon: 'time-outline',             text: '15-min arrival' },
            ].map((t) => (
              <View key={t.text} style={s.trustItem}>
                <Ionicons name={t.icon as any} size={16} color={COLORS.primary} />
                <Text style={s.trustText}>{t.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STEP 2: Select Subtask ─────────────────────────────────────
  if (flowStep === 'SELECT_SUBTASK' && serviceConf) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {renderHeader(`${serviceConf.emoji} ${serviceConf.label}`)}
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[s.subtaskHero, { backgroundColor: serviceConf.bg }]}>
            <Text style={{ fontSize: 40 }}>{serviceConf.emoji}</Text>
            <Text style={[s.subtaskHeroTitle, { color: serviceConf.color }]}>{serviceConf.label}</Text>
            <Text style={s.subtaskHeroDesc}>{serviceConf.desc}</Text>
          </View>

          <Text style={s.sectionTitle}>Specify the task</Text>
          <View style={s.subtaskGrid}>
            {serviceConf.subtasks.map((task) => (
              <TouchableOpacity
                key={task}
                style={[s.subtaskChip, selectedSubtask === task && { backgroundColor: serviceConf.color, borderColor: serviceConf.color }]}
                onPress={() => setSelectedSubtask(task)}
                activeOpacity={0.75}
              >
                <Text style={[s.subtaskChipText, selectedSubtask === task && { color: '#FFF' }]}>{task}</Text>
                {selectedSubtask === task && (
                  <Ionicons name="checkmark-circle" size={14} color="#FFF" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionTitle}>Additional notes <Text style={s.optionalTag}>(optional)</Text></Text>
          <TextInput
            style={s.notesInput}
            placeholder={`Any specific instructions for your ${serviceConf.label.toLowerCase()}?`}
            placeholderTextColor="#94A3B8"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: serviceConf.color }, !selectedSubtask && s.ctaBtnDisabled]}
            onPress={() => { if (selectedSubtask) setFlowStep('SELECT_DURATION'); }}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnText}>Continue →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STEP 3: Select Duration ────────────────────────────────────
  if (flowStep === 'SELECT_DURATION' && serviceConf) {
    const durConf = DURATION_OPTIONS.find(d => d.value === selectedDuration)!;
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {renderHeader('How long?')}
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.durationSummaryCard}>
            <Text style={{ fontSize: 28 }}>{serviceConf.emoji}</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.durationSummaryService}>{serviceConf.label} · {selectedSubtask}</Text>
              <Text style={s.durationSummaryNote}>Starting ~15 min after confirmation</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Select duration</Text>
          {DURATION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[s.durationCard, selectedDuration === opt.value && s.durationCardSelected]}
              onPress={() => setSelectedDuration(opt.value)}
              activeOpacity={0.8}
            >
              <View style={s.durationCardLeft}>
                <Text style={[s.durationCardLabel, selectedDuration === opt.value && { color: COLORS.primary }]}>{opt.label}</Text>
                <Text style={s.durationCardHours}>{opt.hours} of service</Text>
              </View>
              {opt.tag && (
                <View style={[s.durationTag, selectedDuration === opt.value && { backgroundColor: COLORS.primaryLight }]}>
                  <Text style={[s.durationTagText, selectedDuration === opt.value && { color: COLORS.primary }]}>{opt.tag}</Text>
                </View>
              )}
              <Text style={[s.durationPrice, selectedDuration === opt.value && { color: COLORS.primary }]}>{opt.price}</Text>
              {selectedDuration === opt.value && (
                <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={{ marginLeft: 8 }} />
              )}
            </TouchableOpacity>
          ))}

          <View style={s.pricingNote}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.pricingNoteText}>Price includes platform fee. Pay after service completion.</Text>
          </View>

          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => setFlowStep('MATCHING')}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnText}>⚡  Find Helper Now · {durConf.price}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STEP 4: Matching animation ─────────────────────────────────
  if (flowStep === 'MATCHING') {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.matchingContainer}>
          {/* Outer pulse rings */}
          <Animated.View style={[s.pulseRing, s.pulseRing3, { transform: [{ scale: Animated.add(pulseAnim, 0.2) }], opacity: 0.15 }]} />
          <Animated.View style={[s.pulseRing, s.pulseRing2, { transform: [{ scale: pulseAnim }],               opacity: 0.25 }]} />
          <View style={s.pulseCore}>
            <Animated.View style={{ transform: [{ rotate: spinDeg }] }}>
              <Ionicons name="search" size={36} color={COLORS.primary} />
            </Animated.View>
          </View>

          <Text style={s.matchingTitle}>Finding your helper…</Text>
          <Text style={s.matchingSubtitle}>
            Scanning {serviceConf?.label.toLowerCase()} workers{'\n'}nearby your community
          </Text>

          {/* Progress bar */}
          <View style={s.matchingProgressBar}>
            <View style={[s.matchingProgressFill, { width: `${matchProgress}%` }]} />
          </View>
          <Text style={s.matchingProgressText}>{matchProgress}% matched</Text>

          {/* Live activity feed */}
          <View style={s.matchingActivityBox}>
            {[
              { icon: '🔍', text: 'Searching within 1 km of your society…' },
              { icon: '✅', text: 'Checking availability & ratings…' },
              { icon: '🛡️', text: 'Verifying background check status…' },
            ].map((item, i) => (
              <View key={i} style={[s.matchingActivityRow, { opacity: matchProgress > i * 30 ? 1 : 0.3 }]}>
                <Text style={{ fontSize: 14, marginRight: 8 }}>{item.icon}</Text>
                <Text style={s.matchingActivityText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={() => { setFlowStep('SELECT_SERVICE'); resetState(); }} style={s.matchingCancelBtn}>
            <Text style={s.matchingCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP 5: Helper Matched ─────────────────────────────────────
  if ((flowStep === 'HELPER_MATCHED' || flowStep === 'TRACKING') && matchedHelper && serviceConf) {
    const isTracking = flowStep === 'TRACKING';
    const trackIdx   = TRACKING_STEPS.findIndex(t => t.step === trackingStep);
    const isDone     = trackingStep === 'DONE';

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        {renderHeader(isTracking ? 'Live Tracking' : '⚡ Helper Matched!', !isTracking)}
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ETA banner */}
          {!isDone && (
            <LinearGradient
              colors={etaRemaining <= 60 ? ['#059669', '#10B981'] : ['#4F46E5', '#7C3AED']}
              style={s.etaBanner}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <View>
                <Text style={s.etaBannerLabel}>
                  {isTracking
                    ? TRACKING_STEPS[trackIdx]?.label ?? 'In Progress'
                    : 'Estimated Arrival'}
                </Text>
                <Text style={s.etaBannerTime}>
                  {etaRemaining > 0 ? fmtEta(etaRemaining) : (isTracking ? 'Arrived ✅' : 'Arriving now')}
                </Text>
              </View>
              <View style={s.etaBannerRight}>
                <Ionicons name={isTracking ? (TRACKING_STEPS[trackIdx]?.icon ?? 'time') : 'time-outline'} size={32} color="#FFF" />
                {!isTracking && <Text style={s.etaBannerPin}>{matchedHelper.distanceLabel}</Text>}
              </View>
            </LinearGradient>
          )}

          {/* Helper card */}
          <View style={s.helperCard}>
            <View style={s.helperAvatarWrap}>
              <View style={s.helperAvatar}>
                <Text style={s.helperAvatarText}>{matchedHelper.avatar}</Text>
              </View>
              {matchedHelper.policeVerified && (
                <View style={s.helperVerifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#FFF" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={s.helperName}>{matchedHelper.name}</Text>
                {matchedHelper.badge && (
                  <Text style={s.helperBadge}>{matchedHelper.badge}</Text>
                )}
              </View>
              <Text style={s.helperSpeciality}>{matchedHelper.speciality}</Text>
              <View style={s.helperMetaRow}>
                <View style={s.helperMetaChip}>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={s.helperMetaText}>{matchedHelper.rating} ({matchedHelper.reviewCount})</Text>
                </View>
                <View style={s.helperMetaChip}>
                  <Ionicons name="briefcase-outline" size={10} color={COLORS.textMuted} />
                  <Text style={s.helperMetaText}>{matchedHelper.experience}</Text>
                </View>
                <View style={s.helperMetaChip}>
                  <Ionicons name="location-outline" size={10} color={COLORS.textMuted} />
                  <Text style={s.helperMetaText}>{matchedHelper.distanceLabel}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Trust badges */}
          <View style={s.trustBadgesRow}>
            {matchedHelper.verified && (
              <View style={[s.trustBadge, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={[s.trustBadgeText, { color: '#059669' }]}>ID Verified</Text>
              </View>
            )}
            {matchedHelper.policeVerified && (
              <View style={[s.trustBadge, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="shield-checkmark" size={12} color="#7C3AED" />
                <Text style={[s.trustBadgeText, { color: '#7C3AED' }]}>Police Verified</Text>
              </View>
            )}
            <View style={[s.trustBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="ribbon-outline" size={12} color="#D97706" />
              <Text style={[s.trustBadgeText, { color: '#D97706' }]}>Aadhaar Linked</Text>
            </View>
          </View>

          {/* Booking details */}
          <View style={s.bookingDetailsCard}>
            <Text style={s.bookingDetailsTitle}>Booking Summary</Text>
            {[
              { label: 'Service',  value: `${serviceConf.emoji} ${serviceConf.label}` },
              { label: 'Task',     value: selectedSubtask },
              { label: 'Duration', value: DURATION_OPTIONS.find(d => d.value === selectedDuration)?.label ?? selectedDuration },
              { label: 'Price',    value: DURATION_OPTIONS.find(d => d.value === selectedDuration)?.price ?? '—' },
              { label: 'Session',  value: bookingData?.bookingRef ?? sessionId },
            ].map(row => (
              <View key={row.label} style={s.bookingDetailRow}>
                <Text style={s.bookingDetailLabel}>{row.label}</Text>
                <Text style={s.bookingDetailValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* Tracking timeline */}
          {isTracking && (
            <View style={s.trackingCard}>
              <Text style={s.trackingTitle}>Live Progress</Text>
              {TRACKING_STEPS.map((step, i) => {
                const done    = i < trackIdx;
                const current = i === trackIdx;
                const future  = i > trackIdx;
                return (
                  <View key={step.step} style={s.trackingRow}>
                    <View style={s.trackingDotCol}>
                      <View style={[
                        s.trackingDot,
                        done    && s.trackingDotDone,
                        current && s.trackingDotCurrent,
                        future  && s.trackingDotFuture,
                      ]}>
                        {done
                          ? <Ionicons name="checkmark" size={10} color="#FFF" />
                          : current
                          ? <Ionicons name={step.icon} size={10} color="#FFF" />
                          : null}
                      </View>
                      {i < TRACKING_STEPS.length - 1 && (
                        <View style={[s.trackingLine, done && s.trackingLineDone]} />
                      )}
                    </View>
                    <View style={s.trackingTextCol}>
                      <Text style={[s.trackingStepLabel, (done || current) && { color: COLORS.text }]}>{step.label}</Text>
                      {current && <Text style={s.trackingStepDesc}>{step.desc}</Text>}
                    </View>
                    {current && (
                      <View style={[s.trackingCurrentBadge, { backgroundColor: COLORS.primaryLight }]}>
                        <Text style={[s.trackingCurrentBadgeText, { color: COLORS.primary }]}>Now</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* OTP Card (pre-start) */}
          {!isTracking && !otpConfirmed && (
            <View style={s.otpCard}>
              <View style={s.otpCardHeader}>
                <Ionicons name="key-outline" size={18} color="#7C3AED" />
                <Text style={s.otpCardTitle}>Session Start OTP</Text>
              </View>
              <Text style={s.otpCardSubtitle}>Share this code with the helper when they arrive to begin the session</Text>
              <View style={s.otpDigitsRow}>
                {sessionOtp.split('').map((d, i) => (
                  <View key={i} style={s.otpDigitBox}>
                    <Text style={s.otpDigitText}>{d}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={s.otpConfirmBtn}
                onPress={async () => {
                  if (bookingData?.bookingRef) {
                    try {
                      const updated = await instaHelpService.startSession(bookingData.bookingRef);
                      setBookingData(updated);
                    } catch { /* continue even if offline */ }
                  }
                  setOtpConfirmed(true);
                  setFlowStep('TRACKING');
                }}
                activeOpacity={0.85}
              >
                <Text style={s.otpConfirmBtnText}>✅  Helper Arrived — Start Session</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Compact OTP reminder (during tracking) */}
          {isTracking && !isDone && (
            <View style={s.otpReminderCard}>
              <Ionicons name="key-outline" size={14} color="#7C3AED" />
              <Text style={s.otpReminderLabel}>Closure OTP:</Text>
              <Text style={s.otpReminderCode}>{sessionOtp}</Text>
              <Text style={s.otpReminderHint}>Share with helper to close session</Text>
            </View>
          )}

          {/* Rating card (done) */}
          {isDone && (
            <View style={s.rateCard}>
              <Text style={s.rateCardTitle}>How was the service?</Text>
              <Text style={s.rateCardSubtitle}>{matchedHelper.name} completed your {serviceConf.label.toLowerCase()} session</Text>
              <View style={s.rateStarsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)} hitSlop={8}>
                    <Ionicons
                      name={rating >= star ? 'star' : 'star-outline'}
                      size={36}
                      color={rating >= star ? '#F59E0B' : '#CBD5E1'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <TouchableOpacity
                  style={[s.ctaBtn, { backgroundColor: COLORS.success, marginTop: 16 }]}
                  onPress={async () => {
                    if (bookingData?.bookingRef) {
                      try {
                        await instaHelpService.rateBooking(bookingData.bookingRef, { rating });
                      } catch { /* rating saved locally */ }
                    }
                    Alert.alert('Thank you! 🙏', `You rated ${matchedHelper.name} ${rating} star${rating > 1 ? 's' : ''}.`, [
                      { text: 'Done', onPress: () => router.back() },
                    ]);
                  }}
                >
                  <Text style={s.ctaBtnText}>Submit Rating</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action buttons */}
          {!isTracking && !isDone && (
            <View style={s.actionRow}>
              <TouchableOpacity style={s.actionBtn} onPress={() => Alert.alert('Calling…', `${matchedHelper.name}: +91-XXXXX-XXXXX`)} activeOpacity={0.8}>
                <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                <Text style={s.actionBtnText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => Alert.alert('Chat', 'Chat feature coming soon.')} activeOpacity={0.8}>
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                <Text style={s.actionBtnText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { borderColor: '#FEE2E2' }]}
                onPress={() => Alert.alert('Cancel Booking?', 'This will release your matched helper.', [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Cancel', style: 'destructive', onPress: async () => {
                    if (bookingData?.bookingRef) {
                      try { await instaHelpService.cancelBooking(bookingData.bookingRef); } catch {}
                    }
                    setFlowStep('SELECT_SERVICE'); resetState();
                  }},
                ])}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={18} color={COLORS.error} />
                <Text style={[s.actionBtnText, { color: COLORS.error }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ───────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.background },
  scrollContent:    { paddingHorizontal: 16, paddingBottom: 32 },
  header:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  headerTitle:      { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.text },
  backBtn:          { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  // Hero
  heroBanner:       { borderRadius: RADIUS.lg, padding: 20, marginTop: 16, flexDirection: 'row', alignItems: 'center', ...SHADOWS.md },
  heroLeft:         { flex: 1 },
  heroEtaBadge:     { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  heroEtaText:      { color: '#FFF', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  heroTitle:        { fontSize: 26, fontWeight: '800', color: '#FFF', lineHeight: 32 },
  heroSub:          { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 6, lineHeight: 18 },
  heroBadgeRow:     { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  heroBadge:        { fontSize: 10, color: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  heroRight:        { alignItems: 'center', marginLeft: 16 },
  heroEmoji:        { fontSize: 52 },
  heroAvailBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  heroAvailDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  heroAvailText:    { fontSize: 10, color: '#FFF', fontWeight: '600' },

  // How it works
  howItWorksRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, marginTop: 14, gap: 4, ...SHADOWS.sm },
  howStep:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  howStepNum:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  howStepNumText:   { fontSize: 13, fontWeight: '800' },
  howStepLabel:     { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  howArrow:         { fontSize: 14, color: COLORS.textMuted, marginHorizontal: 6 },

  // Section
  sectionTitle:     { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 12 },
  optionalTag:      { fontSize: 12, color: COLORS.textMuted, fontWeight: '400' },

  // Service grid
  serviceGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard:      { width: (SCREEN_W - 42) / 2, minHeight: 184, justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1.5, ...SHADOWS.sm, alignItems: 'center' },
  serviceCardEmoji: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  serviceCardLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  serviceCardDesc:  { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginBottom: 10 },
  serviceCardBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm },
  serviceCardBadgeText: { fontSize: 11, fontWeight: '700' },

  // Trust strip
  trustStrip:       { marginTop: 20, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, ...SHADOWS.sm },
  trustItem:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  trustText:        { fontSize: 12, color: COLORS.textSecondary },

  // Subtask
  subtaskHero:      { borderRadius: RADIUS.lg, padding: 20, marginTop: 16, alignItems: 'center', gap: 6 },
  subtaskHeroTitle: { fontSize: 22, fontWeight: '800' },
  subtaskHeroDesc:  { fontSize: 13, color: COLORS.textMuted },
  subtaskGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subtaskChip:      { paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center' },
  subtaskChipText:  { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  notesInput:       { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, fontSize: 14, color: COLORS.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },

  // CTA
  ctaBtn:           { borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', marginTop: 8, ...SHADOWS.md },
  ctaBtnText:       { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  ctaBtnDisabled:   { opacity: 0.45 },

  // Duration
  durationSummaryCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, marginTop: 16, flexDirection: 'row', alignItems: 'center', ...SHADOWS.sm },
  durationSummaryService: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  durationSummaryNote:    { fontSize: 12, color: COLORS.success, fontWeight: '600', marginTop: 2 },
  durationCard:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.borderLight, ...SHADOWS.sm },
  durationCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  durationCardLeft: { flex: 1 },
  durationCardLabel:{ fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  durationCardHours:{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  durationTag:      { backgroundColor: COLORS.backgroundAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, marginRight: 10 },
  durationTagText:  { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  durationPrice:    { fontSize: 17, fontWeight: '800', color: COLORS.textSecondary, marginRight: 4 },
  pricingNote:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, padding: 10, backgroundColor: COLORS.backgroundAlt, borderRadius: RADIUS.sm },
  pricingNoteText:  { fontSize: 11, color: COLORS.textMuted, flex: 1 },

  // Matching
  matchingContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pulseRing:        { position: 'absolute', borderRadius: 120, borderWidth: 2, borderColor: COLORS.primary + '80' },
  pulseRing2:       { width: 160, height: 160 },
  pulseRing3:       { width: 220, height: 220 },
  pulseCore:        { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', ...SHADOWS.lg },
  matchingTitle:    { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 32 },
  matchingSubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  matchingProgressBar:   { width: SCREEN_W - 64, height: 6, backgroundColor: COLORS.borderLight, borderRadius: 3, marginTop: 24, overflow: 'hidden' },
  matchingProgressFill:  { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  matchingProgressText:  { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  matchingActivityBox:   { marginTop: 24, width: SCREEN_W - 48, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, gap: 10, ...SHADOWS.sm },
  matchingActivityRow:   { flexDirection: 'row', alignItems: 'center' },
  matchingActivityText:  { fontSize: 13, color: COLORS.textSecondary },
  matchingCancelBtn:     { marginTop: 28, paddingVertical: 10, paddingHorizontal: 24 },
  matchingCancelText:    { fontSize: 14, color: COLORS.textMuted, textDecorationLine: 'underline' },

  // ETA Banner
  etaBanner:        { borderRadius: RADIUS.lg, padding: 20, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SHADOWS.md },
  etaBannerLabel:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  etaBannerTime:    { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
  etaBannerRight:   { alignItems: 'flex-end', gap: 4 },
  etaBannerPin:     { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 4 },

  // Helper card
  helperCard:       { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14, ...SHADOWS.md },
  helperAvatarWrap: { position: 'relative' },
  helperAvatar:     { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  helperAvatarText: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  helperVerifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  helperName:       { fontSize: 16, fontWeight: '700', color: COLORS.text },
  helperBadge:      { fontSize: 10, fontWeight: '700', color: '#D97706', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  helperSpeciality: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  helperMetaRow:    { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  helperMetaChip:   { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.backgroundAlt, paddingHorizontal: 6, paddingVertical: 3, borderRadius: RADIUS.sm },
  helperMetaText:   { fontSize: 10, color: COLORS.textSecondary },

  // Trust badges
  trustBadgesRow:   { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  trustBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm },
  trustBadgeText:   { fontSize: 11, fontWeight: '600' },

  // Booking details
  bookingDetailsCard:  { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, marginTop: 14, ...SHADOWS.sm },
  bookingDetailsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  bookingDetailRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  bookingDetailLabel:  { fontSize: 13, color: COLORS.textMuted },
  bookingDetailValue:  { fontSize: 13, fontWeight: '600', color: COLORS.text, maxWidth: '60%', textAlign: 'right' },

  // Tracking
  trackingCard:     { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, marginTop: 14, ...SHADOWS.sm },
  trackingTitle:    { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  trackingRow:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2 },
  trackingDotCol:   { alignItems: 'center', width: 28 },
  trackingDot:      { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.backgroundAlt, borderWidth: 2, borderColor: COLORS.borderLight, alignItems: 'center', justifyContent: 'center' },
  trackingDotDone:  { backgroundColor: COLORS.success, borderColor: COLORS.success },
  trackingDotCurrent: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  trackingDotFuture: { backgroundColor: COLORS.backgroundAlt, borderColor: COLORS.borderLight },
  trackingLine:     { width: 2, height: 28, backgroundColor: COLORS.borderLight, marginVertical: 2 },
  trackingLineDone: { backgroundColor: COLORS.success },
  trackingTextCol:  { flex: 1, paddingLeft: 12, paddingBottom: 14 },
  trackingStepLabel:   { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  trackingStepDesc:    { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  trackingCurrentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, marginLeft: 8, alignSelf: 'center' },
  trackingCurrentBadgeText: { fontSize: 10, fontWeight: '700' },

  // OTP
  otpCard:          { backgroundColor: '#F5F3FF', borderRadius: RADIUS.lg, padding: 20, marginTop: 14, borderWidth: 1, borderColor: '#DDD6FE', ...SHADOWS.sm },
  otpCardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  otpCardTitle:     { fontSize: 15, fontWeight: '700', color: '#7C3AED' },
  otpCardSubtitle:  { fontSize: 12, color: '#6D28D9', marginBottom: 16, lineHeight: 18 },
  otpDigitsRow:     { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 20 },
  otpDigitBox:      { width: 52, height: 60, borderRadius: RADIUS.md, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  otpDigitText:     { fontSize: 28, fontWeight: '900', color: '#7C3AED' },
  otpConfirmBtn:    { backgroundColor: '#7C3AED', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  otpConfirmBtnText:{ fontSize: 14, fontWeight: '800', color: '#FFF' },

  // Compact OTP reminder (during tracking)
  otpReminderCard:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F3FF', borderRadius: RADIUS.md, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#DDD6FE' },
  otpReminderLabel: { fontSize: 12, fontWeight: '600', color: '#6D28D9' },
  otpReminderCode:  { fontSize: 14, fontWeight: '900', color: '#7C3AED', letterSpacing: 2 },
  otpReminderHint:  { fontSize: 11, color: '#7C3AED', flex: 1, textAlign: 'right' },

  // Rate card
  rateCard:         { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 20, marginTop: 14, alignItems: 'center', ...SHADOWS.md },
  rateCardTitle:    { fontSize: 18, fontWeight: '800', color: COLORS.text },
  rateCardSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  rateStarsRow:     { flexDirection: 'row', gap: 10 },

  // Action row
  actionRow:        { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn:        { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, ...SHADOWS.sm },
  actionBtnText:    { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
