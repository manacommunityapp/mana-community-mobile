import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useAppBack } from '@/hooks/useAppBack';
import { getBiometricCapability, authenticateWithBiometric, BiometricCapability } from '@/hooks/useBiometricAuth';
import { appLockService } from '@/services/appLockService';
import { COLORS, SHADOWS, RADIUS, FONTS, GRADIENTS, SPACING } from '@/constants/config';

const SCREEN_W = Dimensions.get('window').width;

export default function LoginScreen() {
  const { login, loadUser } = useAuth();
  const { goBack } = useAppBack({ fallbackRoute: '/onboarding' });
  const [identifier, setIdentifier]       = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [inputFocused, setInputFocused]   = useState(false);
  const [passFocused, setPassFocused]     = useState(false);
  const [biometric, setBiometric]         = useState<BiometricCapability | null>(null);
  const [hasAppPin, setHasAppPin]         = useState(false);
  const [showPinModal, setShowPinModal]   = useState(false);
  const [quickPin, setQuickPin]           = useState('');
  const [quickPinError, setQuickPinError] = useState('');

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_CLEAN_RE = /\D/g;

  const parseIdentifier = (input: string): { value: string; type: 'email' | 'phone' | 'invalid' } => {
    const trimmed = input.trim();
    if (!trimmed) return { value: '', type: 'invalid' };

    if (EMAIL_RE.test(trimmed)) {
      return { value: trimmed.toLowerCase(), type: 'email' };
    }

    let digits = trimmed.replace(PHONE_CLEAN_RE, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }

    if (digits.length === 10) {
      return { value: digits, type: 'phone' };
    }

    return { value: trimmed, type: 'invalid' };
  };

  const isPhoneInput = /^[0-9+\s()-]+$/.test(identifier.trim()) && identifier.trim().length > 0;
  const inputEmoji = isPhoneInput ? '📱' : (identifier.includes('@') ? '📧' : '👤');

  useEffect(() => {
    getBiometricCapability().then(setBiometric).catch(() => {});
  }, []);

  
  const handleQuickPinDigit = async (digit: string) => {
    if (quickPin.length >= 4) return;
    const next = quickPin + digit;
    setQuickPin(next);
    setQuickPinError('');
    if (next.length === 4) {
      const valid = await appLockService.verifyPin(next);
      if (valid) {
        setShowPinModal(false);
        setQuickPin('');
        setLoading(true);
        try {
          await loadUser();
        } catch {
          Alert.alert('Session Expired', 'Please enter your password to sign in.');
        } finally {
          setLoading(false);
        }
      } else {
        setQuickPinError('Invalid 4-digit PIN');
        setTimeout(() => setQuickPin(''), 400);
      }
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        await loadUser();
      } else {
        Alert.alert('Biometric failed', 'Please sign in with your email/phone and password.');
      }
    } catch {
      Alert.alert('Biometric error', 'Could not complete biometric authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Validation', 'Please enter your email or phone number and password.');
      return;
    }
    const parsed = parseIdentifier(identifier);
    if (parsed.type === 'invalid') {
      Alert.alert('Validation', 'Please enter a valid email address or 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      await login({ identifier: parsed.value, password });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = status === 401
        ? (parsed.type === 'phone' ? 'Invalid mobile number or password.' : 'Invalid email or password.')
        : 'Login failed. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        {/* ── Hero Header ──────────────────────────────── */}
        <LinearGradient
          colors={['#1E1B4B', '#312E81', '#4F46E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={st.hero}
        >
          {/* Decorative elements */}
          <View style={st.decCircle1} />
          <View style={st.decCircle2} />
          <View style={st.decCircle3} />

          {/* Back button */}
          <TouchableOpacity
            style={st.heroBackBtn}
            onPress={goBack}
            hitSlop={8}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={st.logoBox}>
            <Text style={st.logoEmoji}>🏠</Text>
          </View>
          <Text style={st.heroTitle}>Mana Community</Text>
          <Text style={st.heroSub}>Your community, connected</Text>

          {/* Trust badges */}
          <View style={st.trustRow}>
            <View style={st.trustBadge}>
              <Text style={st.trustEmoji}>🔒</Text>
              <Text style={st.trustText}>Secure</Text>
            </View>
            <View style={st.trustBadge}>
              <Text style={st.trustEmoji}>⚡</Text>
              <Text style={st.trustText}>Instant</Text>
            </View>
            <View style={st.trustBadge}>
              <Text style={st.trustEmoji}>🛡️</Text>
              <Text style={st.trustText}>Private</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Form Card ────────────────────────────────── */}
        <View style={st.card}>
          <View style={st.cardTitleRow}>
            <Text style={st.cardEmoji}>👋</Text>
            <View>
              <Text style={st.cardTitle}>Welcome back</Text>
              <Text style={st.cardSub}>Sign in to your account</Text>
            </View>
          </View>

          <View style={st.form}>
            {/* Email or Phone */}
            <View style={st.field}>
              <Text style={st.label}>{inputEmoji} Email or Mobile Number</Text>
              <View style={[st.inputWrap, inputFocused && st.inputWrapFocused]}>
                <TextInput
                  style={st.input}
                  placeholder="you@example.com or 9876543210"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  value={identifier}
                  onChangeText={setIdentifier}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={st.field}>
              <Text style={st.label}>🔑 Password</Text>
              <View style={[st.inputWrap, passFocused && st.inputWrapFocused]}>
                <TextInput
                  style={st.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={st.eyeBtn}>
                  <Text style={st.eyeEmoji}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Link href="/auth/forgot-password" style={st.forgot}>
              Forgot password?
            </Link>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[st.button, loading && st.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#312E81', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={st.buttonText}>Sign In</Text>
                    <Text style={st.buttonEmoji}>🚀</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Biometric or PIN Sign-in */}
            {(biometric?.available || hasAppPin) && biometric?.hasStoredSession && (
              <>
                <View style={st.orRow}>
                  <View style={st.orLine} />
                  <Text style={st.orText}>or sign in with</Text>
                  <View style={st.orLine} />
                </View>

                <View style={{ gap: 10 }}>
                  {biometric?.available && (
                    <TouchableOpacity
                      style={[st.biometricCard, loading && st.buttonDisabled]}
                      onPress={handleBiometricLogin}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#EEF2FF', '#E0E7FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={st.biometricGradient}
                      >
                        <View style={st.fpOuterRing}>
                          <LinearGradient
                            colors={['#4F46E5', '#312E81']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={st.fpCircle}
                          >
                            <Ionicons
                              name={biometric.label.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
                              size={32}
                              color="#fff"
                            />
                          </LinearGradient>
                        </View>

                        <View style={st.biometricInfo}>
                          <Text style={st.biometricTitle}>{biometric.label}</Text>
                          <Text style={st.biometricSub}>
                            {biometric.label.includes('Face')
                              ? 'Look at your device to sign in'
                              : 'Touch the sensor to sign in'}
                          </Text>
                        </View>

                        <View style={st.fpArrow}>
                          <Ionicons name="chevron-forward" size={18} color="#4F46E5" />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {hasAppPin && (
                    <TouchableOpacity
                      style={[st.biometricCard, loading && st.buttonDisabled]}
                      onPress={() => { setQuickPin(''); setQuickPinError(''); setShowPinModal(true); }}
                      disabled={loading}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={['#FEF3C7', '#FDE68A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={st.biometricGradient}
                      >
                        <View style={[st.fpOuterRing, { borderColor: 'rgba(217, 119, 6, 0.25)' }]}>
                          <LinearGradient
                            colors={['#D97706', '#B45309']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={st.fpCircle}
                          >
                            <Ionicons name="keypad" size={28} color="#fff" />
                          </LinearGradient>
                        </View>

                        <View style={st.biometricInfo}>
                          <Text style={[st.biometricTitle, { color: '#92400E' }]}>Sign in with 4-Digit PIN</Text>
                          <Text style={[st.biometricSub, { color: '#B45309' }]}>
                            Enter your configured secret passcode
                          </Text>
                        </View>

                        <View style={st.fpArrow}>
                          <Ionicons name="chevron-forward" size={18} color="#D97706" />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={st.footer}>
            <Text style={st.footerText}>Don't have an account? </Text>
            <Link href="/auth/register" style={st.footerLink}>Register</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flexGrow: 1,
  },

  // ── Hero Header ────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 50,
    overflow: 'hidden',
    position: 'relative',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    zIndex: 10,
  },
  decCircle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -70,
    right: -70,
  },
  decCircle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -50,
    left: -50,
  },
  decCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: 30,
    left: SCREEN_W * 0.6,
  },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 34 },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: FONTS.regular,
    marginBottom: 18,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 10,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  trustEmoji: { fontSize: 12 },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: FONTS.medium,
  },

  // ── Form Card ──────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    marginTop: -20,
    ...SHADOWS.lg,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  cardEmoji: { fontSize: 28 },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.5,
  },
  cardSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },

  // ── Form ───────────────────────────────────────────────────────
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
    marginLeft: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E8F0',
    borderRadius: RADIUS.lg,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  inputWrapFocused: {
    borderColor: '#4F46E5',
    backgroundColor: '#F5F3FF',
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  eyeEmoji: { fontSize: 18 },
  forgot: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: FONTS.bold,
  },
  button: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: 4,
    ...SHADOWS.md,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.displayBold,
  },
  buttonEmoji: { fontSize: 16 },

  // ── Biometric ──────────────────────────────────────────────────
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E8F0',
  },
  orText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  biometricCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E0E7FF',
    ...SHADOWS.sm,
  },
  biometricGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  fpOuterRing: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: 'rgba(79,70,229,0.2)',
    padding: 3,
  },
  fpCircle: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricInfo: {
    flex: 1,
    gap: 2,
  },
  biometricTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#312E81',
    fontFamily: FONTS.displayBold,
  },
  biometricSub: {
    fontSize: 12,
    color: '#6366F1',
    fontFamily: FONTS.regular,
  },
  fpArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(79,70,229,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Footer ─────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  footerLink: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: FONTS.regular,
  },
  modalDots: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  modalDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  modalDotFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalDotError: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  modalError: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
    marginBottom: 8,
  },
  modalKeypad: {
    width: '100%',
    maxWidth: 270,
    gap: 12,
    marginTop: 8,
  },
  modalKeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalKeyBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeyText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
});
