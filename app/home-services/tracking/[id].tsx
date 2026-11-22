import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Linking,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '@/constants/config';
import { THEME } from '@/constants/theme';
import { homeServicesService, HsBooking } from '@/services/homeServicesService';

type TrackingStep = 'CONFIRMED' | 'DISPATCHED' | 'EN_ROUTE' | 'AT_GATE' | 'IN_PROGRESS' | 'COMPLETED';

interface StepItem {
  key: TrackingStep;
  title: string;
  subtitle: string;
  time: string;
}

const STEPS: StepItem[] = [
  { key: 'CONFIRMED', title: 'Booking Confirmed', subtitle: 'Work order approved by society helpdesk', time: '10:00 AM' },
  { key: 'DISPATCHED', title: 'Dispatched', subtitle: 'Tools packed & worker left workshop', time: '10:15 AM' },
  { key: 'EN_ROUTE', title: 'En Route', subtitle: 'Approaching Society Gate 2 (~12 mins)', time: '10:28 AM' },
  { key: 'AT_GATE', title: 'Arrived at Gate', subtitle: 'ANPR clearance & guard check', time: '10:35 AM' },
  { key: 'IN_PROGRESS', title: 'Service In Progress', subtitle: 'Active in your apartment', time: '10:40 AM' },
  { key: 'COMPLETED', title: 'Completed & Verified', subtitle: 'Verified via resident secret OTP', time: '11:20 AM' },
];

export default function TechnicianTrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<HsBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<TrackingStep>('EN_ROUTE');
  const [etaMins, setEtaMins] = useState(12);

  // Completion review modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  const secretOtp = '5829';

  useEffect(() => {
    loadBooking();
  }, [id]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const bookings = await homeServicesService.myBookings();
      const found = bookings.find((b) => String(b.id) === String(id));
      if (found) {
        setBooking(found);
        if (found.status === 'COMPLETED' || found.status === 'WORK_DONE') {
          setCurrentStep('COMPLETED');
        } else if (found.status === 'IN_PROGRESS') {
          setCurrentStep('IN_PROGRESS');
        } else if (found.status === 'WORKER_EN_ROUTE') {
          setCurrentStep('EN_ROUTE');
        }
      } else {
        // Fallback demo booking
        setBooking({
          id: Number(id) || 9082,
          category: 'AC_SERVICE',
          bookingType: 'ONE_TIME',
          scheduledAt: 'Today, 10:30 AM',
          status: 'WORKER_EN_ROUTE',
          flatNumber: 'A-204',
          description: 'AC Jet Pump Deep Cleaning & Gas Inspection',
          quotedPrice: 850,
          createdAt: new Date().toISOString(),
        });
        setCurrentStep('EN_ROUTE');
      }
    } catch {
      setBooking({
        id: Number(id) || 9082,
        category: 'AC_SERVICE',
        bookingType: 'ONE_TIME',
        scheduledAt: 'Today, 10:30 AM',
        status: 'WORKER_EN_ROUTE',
        flatNumber: 'A-204',
        description: 'AC Jet Pump Deep Cleaning & Gas Inspection',
        quotedPrice: 850,
        createdAt: new Date().toISOString(),
      });
      setCurrentStep('EN_ROUTE');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const handleAdvanceStep = () => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < STEPS.length) {
      const nextKey = STEPS[nextIdx].key;
      setCurrentStep(nextKey);
      if (nextKey === 'AT_GATE') setEtaMins(2);
      if (nextKey === 'IN_PROGRESS') setEtaMins(0);
      if (nextKey === 'COMPLETED') {
        setReviewModalVisible(true);
      }
    }
  };

  const handleShareOtp = () => {
    Share.share({
      title: 'Home Service Completion OTP',
      message: `🔑 *Mana Community Home Service OTP*\nBooking #${booking?.id || '9082'}\nSecret OTP: *${secretOtp}*\n(Share with worker only after job is complete)`,
    });
  };

  const handleCallWorker = () => {
    Linking.openURL('tel:+919876543210').catch(() => {
      Alert.alert('Phone Call', 'Dialing +91 98765 43210 for Ramesh Sharma');
    });
  };

  const handleSubmitReview = () => {
    setReviewModalVisible(false);
    Alert.alert('Thank You!', `Your ${rating}-star feedback has been registered for this service.`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Live Technician Tracker</Text>
          <Text style={styles.headerSubtitle}>Booking #{booking?.id || '9082'} • Flat {booking?.flatNumber || 'A-204'}</Text>
        </View>
        <View style={styles.badgeLive}>
          <View style={styles.pingDot} />
          <Text style={styles.badgeLiveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <LinearGradient
          colors={['#2563EB', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroPill}>
              <Ionicons name="location" size={14} color="#93C5FD" />
              <Text style={styles.heroPillText}>
                {currentStep === 'COMPLETED'
                  ? 'SERVICE COMPLETED'
                  : currentStep === 'IN_PROGRESS'
                  ? 'WORK IN PROGRESS'
                  : currentStep === 'AT_GATE'
                  ? 'AT SOCIETY GATE'
                  : `ARRIVING IN ~${etaMins} MINS`}
              </Text>
            </View>
            <TouchableOpacity onPress={handleAdvanceStep} style={styles.simBtn}>
              <Text style={styles.simBtnText}>Next Step ➔</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTitle}>
            {booking?.category ? booking.category.replace(/_/g, ' ') : 'AC Appliance Care'}
          </Text>
          <Text style={styles.heroDesc} numberOfLines={2}>
            {booking?.description || 'Routine filter washing and jet deep cleaning'}
          </Text>

          <View style={styles.heroFooter}>
            <Text style={styles.heroPrice}>Quoted: ₹{booking?.quotedPrice || 850}</Text>
            <Text style={styles.heroStatus}>{currentStep.replace(/_/g, ' ')}</Text>
          </View>
        </LinearGradient>

        {/* Secret Completion OTP Card */}
        <View style={styles.otpCard}>
          <View style={styles.otpHeader}>
            <View style={styles.otpIconWrap}>
              <Ionicons name="key" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.otpTitle}>Secure Completion OTP</Text>
              <Text style={styles.otpSubtitle}>Do not share until service is fully completed</Text>
            </View>
            <TouchableOpacity onPress={handleShareOtp} style={styles.shareBtn}>
              <Ionicons name="share-social-outline" size={18} color="#D97706" />
            </TouchableOpacity>
          </View>

          <View style={styles.otpDigitsRow}>
            {secretOtp.split('').map((digit, i) => (
              <View key={i} style={styles.otpDigitBox}>
                <Text style={styles.otpDigit}>{digit}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.otpWarning}>
            ⚠️ Verification OTP ensures the technician does not close the job prematurely.
          </Text>
        </View>

        {/* Technician Profile Card */}
        <View style={styles.workerCard}>
          <View style={styles.workerRow}>
            <View style={styles.workerAvatar}>
              <Text style={styles.workerInitials}>RS</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.workerNameRow}>
                <Text style={styles.workerName}>Ramesh Sharma</Text>
                <View style={styles.verifiedTag}>
                  <Ionicons name="checkmark-circle" size={13} color="#059669" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
              <Text style={styles.workerRole}>Senior AC &amp; Electrical Specialist</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>4.9 (142 society jobs)</Text>
              </View>
            </View>
          </View>

          <View style={styles.workerActions}>
            <TouchableOpacity onPress={handleCallWorker} style={styles.callBtn}>
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.callBtnText}>Call Technician</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert('Chat', 'Connecting to internal worker chat...')}
              style={styles.chatBtn}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
              <Text style={styles.chatBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tracking Stepper */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Service Journey</Text>
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isLast = idx === STEPS.length - 1;

            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepIndicatorCol}>
                  <View
                    style={[
                      styles.stepDot,
                      isDone && styles.stepDotDone,
                      isCurrent && styles.stepDotCurrent,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    ) : isCurrent ? (
                      <View style={styles.stepDotPulse} />
                    ) : (
                      <View style={styles.stepDotInactive} />
                    )}
                  </View>
                  {!isLast && <View style={[styles.stepLine, isDone && styles.stepLineDone]} />}
                </View>

                <View style={styles.stepContent}>
                  <View style={styles.stepTopLine}>
                    <Text
                      style={[
                        styles.stepHeading,
                        isCurrent && styles.stepHeadingCurrent,
                        isDone && styles.stepHeadingDone,
                      ]}
                    >
                      {step.title}
                    </Text>
                    <Text style={styles.stepTime}>{step.time}</Text>
                  </View>
                  <Text style={styles.stepSub}>{step.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate Your Experience</Text>
            <Text style={styles.modalSub}>How was the service provided by Ramesh Sharma?</Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} style={{ padding: 6 }}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Add review or comments..."
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setReviewModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitReview} style={styles.modalSubmit}>
                <Text style={styles.modalSubmitText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
    borderRadius: RADIUS.md,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  badgeLive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  badgeLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 5,
  },
  simBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  simBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroDesc: {
    fontSize: 12,
    color: '#E0E7FF',
    marginTop: 4,
    lineHeight: 17,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroStatus: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93C5FD',
    textTransform: 'uppercase',
  },
  otpCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    ...SHADOWS.sm,
  },
  otpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  otpSubtitle: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  shareBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  otpDigitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 14,
  },
  otpDigitBox: {
    width: 44,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.xs,
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '900',
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  otpWarning: {
    fontSize: 11,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 15,
  },
  workerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitials: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
  },
  workerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  workerRole: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  workerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    gap: 6,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    gap: 6,
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 24,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  stepDotCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  stepDotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  stepDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: '#E2E8F0',
    marginVertical: 3,
  },
  stepLineDone: {
    backgroundColor: '#059669',
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  stepTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  stepHeadingCurrent: {
    color: '#2563EB',
    fontWeight: '800',
  },
  stepHeadingDone: {
    color: '#0F172A',
  },
  stepTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  stepSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 14,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 12,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmit: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
