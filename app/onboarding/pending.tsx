import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';
import api from '@/services/apiClient';

const STEPS = [
  { emoji: '✅', label: 'Account created'          },
  { emoji: '⏳', label: 'Awaiting admin approval'  },
  { emoji: '🔔', label: 'You\'ll be notified'      },
];

export default function PendingScreen() {
  const router      = useRouter();
  const { user, updateUser, logout, isPending, isRejected } = useAuth();
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const rotateAnim  = useRef(new Animated.Value(0)).current;

  // Gentle pulse on the clock icon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]),
    ).start();
  }, []);

  // Poll for approval every 30 seconds
  const { data: freshProfile } = useQuery({
    queryKey:       ['approval-poll'],
    queryFn:        authService.pollApprovalStatus,
    refetchInterval: 30_000,
    enabled:        isPending,
  });

  useEffect(() => {
    if (!freshProfile) return;
    updateUser(freshProfile);
    if (freshProfile.kycStatus === 'VERIFIED') {
      router.replace('/onboarding/tour');
    } else if (freshProfile.kycStatus === 'REJECTED') {
      // Stay on pending — rejection state shown below
    }
  }, [freshProfile]);

  async function requestPushPermission() {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') {
      Alert.alert('Already enabled', 'You\'ll get notified when your account is approved.');
      return;
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        await api.post('/users/push-token', {
          token:    tokenData.data,
          platform: require('react-native').Platform.OS,
        });
      } catch { /* non-fatal */ }
      Alert.alert('Notifications on ✅', 'We\'ll ping you the moment your account is approved!');
    } else {
      Alert.alert('Notifications off', 'You can enable them later in your device settings.');
    }
  }

  // Rejected state
  if (isRejected) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.center}>
          <Text style={s.rejectedEmoji}>❌</Text>
          <Text style={s.rejectedTitle}>Application not approved</Text>
          <Text style={s.rejectedSub}>
            Your identity verification was not accepted. Please contact your community admin or re-submit with a clearer document.
          </Text>
          <TouchableOpacity style={s.resubmitBtn} onPress={() => router.push('/onboarding/verify')}>
            <Text style={s.resubmitBtnText}>Re-submit Documents</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutLink} onPress={logout}>
            <Text style={s.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.center}>
        {/* Animated clock */}
        <Animated.Text style={[s.clockEmoji, { transform: [{ scale: pulseAnim }] }]}>
          ⏳
        </Animated.Text>

        <Text style={s.title}>Application submitted!</Text>
        <Text style={s.sub}>
          Welcome to {user?.community?.name ?? 'your community'},{' '}
          <Text style={{ fontWeight: '700' }}>{user?.name?.split(' ')[0]}</Text>!
          {'\n\n'}Your admin will review and approve your account. This usually takes a few hours.
        </Text>

        {/* Progress steps */}
        <View style={s.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.step}>
              <Text style={s.stepEmoji}>{step.emoji}</Text>
              <Text style={s.stepLabel}>{step.label}</Text>
              {i < STEPS.length - 1 && <View style={s.stepLine} />}
            </View>
          ))}
        </View>

        {/* Notification CTA */}
        <TouchableOpacity style={s.notifBtn} onPress={requestPushPermission} activeOpacity={0.85}>
          <Text style={s.notifBtnText}>🔔 Notify me when approved</Text>
        </TouchableOpacity>

        <Text style={s.pollNote}>Checking for approval automatically every 30 seconds…</Text>
      </View>

      {/* Logout at the bottom */}
      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  clockEmoji:      { fontSize: 72 },
  title:           { fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  sub:             { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 23 },
  steps:           { width: '100%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, gap: 0, borderWidth: 1, borderColor: COLORS.border, marginTop: 8 },
  step:            { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  stepEmoji:       { fontSize: 20, width: 26, textAlign: 'center' },
  stepLabel:       { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  stepLine:        { display: 'none' },  // connector lines omitted for compactness
  notifBtn:        { width: '100%', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  notifBtnText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  pollNote:        { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  logoutBtn:       { padding: 20, alignItems: 'center' },
  logoutLink:      { marginTop: 16 },
  logoutText:      { fontSize: 14, color: COLORS.textMuted, textDecorationLine: 'underline' },
  // Rejected
  rejectedEmoji:   { fontSize: 64 },
  rejectedTitle:   { fontSize: 22, fontWeight: '800', color: COLORS.error, textAlign: 'center' },
  rejectedSub:     { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 21 },
  resubmitBtn:     { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center' },
  resubmitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
