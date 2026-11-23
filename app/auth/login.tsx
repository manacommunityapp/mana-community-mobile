import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Dimensions, Image,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/context/ThemeContext';
import { useAppBack } from '@/hooks/useAppBack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBiometricCapability, authenticateWithBiometric, BiometricCapability } from '@/hooks/useBiometricAuth';
import { appLockService } from '@/services/appLockService';
import { COLORS, SHADOWS, RADIUS, FONTS, GRADIENTS, SPACING } from '@/constants/config';
import { useRateLimitHandler } from '@/hooks/useRateLimitHandler';
import { RateLimitBanner } from '@/components/security/RateLimitBanner';

const SCREEN_W = Dimensions.get('window').width;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, loadUser } = useAuth();
  const { palette, isDark, toggleTheme } = useAppTheme();
  const { goBack } = useAppBack({ fallbackRoute: '/onboarding' });
  const { rateLimitState, handleError: handleRateLimit, isLimited } = useRateLimitHandler();
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
  const [activeRole, setActiveRole]       = useState<'Resident' | 'Guard' | 'Vendor'>('Resident');

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
    if (isLimited) return;
    setLoading(true);
    try {
      await login({ identifier: parsed.value, password });
    } catch (err: any) {
      if (!handleRateLimit(err)) {
        const status = err?.response?.status ?? err?.statusCode;
        const serverMsg = err?.response?.data?.message;
        let msg = 'Login failed. Please try again.';
        if (status === 401) {
          msg = parsed.type === 'phone' ? 'Invalid mobile number or password.' : 'Invalid email or password.';
        } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
          msg = 'Unable to connect to server. Please check your internet connection.';
        } else if (serverMsg && typeof serverMsg === 'string') {
          msg = serverMsg;
        }
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[st.container, { backgroundColor: palette.appBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">
        {/* ── Top Back & Theme Toggle ──────────────────── */}
        <TouchableOpacity
          style={[
            st.heroBackBtn,
            {
              top: Math.max(insets.top + 8, Platform.OS === 'ios' ? 48 : 28),
              backgroundColor: palette.surface,
              borderColor: palette.borderLight,
            },
          ]}
          onPress={goBack}
          hitSlop={8}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={palette.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            st.heroThemeBtn,
            {
              top: Math.max(insets.top + 8, Platform.OS === 'ios' ? 48 : 28),
              backgroundColor: palette.surface,
              borderColor: palette.borderLight,
            },
          ]}
          onPress={toggleTheme}
          hitSlop={8}
          activeOpacity={0.8}
          accessibilityLabel={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={palette.link} />
          <Text style={[st.heroThemeText, { color: palette.text }]}>{isDark ? 'Light' : 'Dark'}</Text>
        </TouchableOpacity>

        {/* ── Brand Header (Figma Redesign) ─────────────── */}
        <View style={[st.brandHeader, { paddingTop: Math.max(insets.top + 28, Platform.OS === 'ios' ? 68 : 48) }]}>
          <View style={[st.avatarAuraOuter, { backgroundColor: palette.primaryLight }]}>
            <View style={[st.avatarAuraInner, { backgroundColor: palette.primaryBorder }]}>
              <LinearGradient
                colors={palette.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.brandAvatar}
              >
                <Image
                  source={require('../../assets/icon.png')}
                  style={st.brandLogoImg}
                  resizeMode="cover"
                />
              </LinearGradient>
            </View>
          </View>

          <Text style={[st.brandTitle, { color: palette.text }]}>Mana Community</Text>
          <Text style={[st.brandSubtitle, { color: palette.textSecondary }]}>Your home, connected.</Text>
        </View>

        {/* ── Floating Form Card (Figma Make UI) ────────── */}
        <View style={[st.card, { backgroundColor: palette.surface, borderColor: palette.borderLight }]}>
          <View style={st.cardHeader}>
            <Text style={[st.cardTitle, { color: palette.text }]}>Welcome back</Text>
            <Text style={[st.cardSub, { color: palette.textMuted }]}>Sign in to your community account</Text>
          </View>

          {/* ── Role Switcher Segmented Control ──────────── */}
          <View style={[st.roleSwitcher, { backgroundColor: palette.surfaceSubtle }]}>
            {(['Resident', 'Guard', 'Vendor'] as const).map((role) => {
              const active = activeRole === role;
              return (
                <TouchableOpacity
                  key={role}
                  style={[st.rolePill, active && { backgroundColor: palette.primary, ...SHADOWS.sm }]}
                  onPress={() => setActiveRole(role)}
                  activeOpacity={0.85}
                >
                  <Text style={[st.rolePillText, { color: palette.textMuted }, active && st.rolePillTextActive]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={st.form}>
            {/* Email or Mobile Number */}
            <View style={st.field}>
              <Text style={[st.label, { color: palette.textSecondary }]}>Email address</Text>
              <View
                style={[
                  st.inputWrap,
                  { backgroundColor: palette.surfaceSubtle, borderColor: palette.border },
                  inputFocused && { borderColor: palette.primary, backgroundColor: palette.surface, borderWidth: 1.5 },
                ]}
              >
                <TextInput
                  style={[st.input, { color: palette.text }]}
                  placeholder={activeRole === 'Resident' ? 'resident@manacommunity.in' : 'your@email.com or mobile'}
                  placeholderTextColor={palette.textMuted}
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
              <Text style={[st.label, { color: palette.textSecondary }]}>Password</Text>
              <View
                style={[
                  st.inputWrap,
                  { backgroundColor: palette.surfaceSubtle, borderColor: palette.border },
                  passFocused && { borderColor: palette.primary, backgroundColor: palette.surface, borderWidth: 1.5 },
                ]}
              >
                <TextInput
                  style={[st.input, { color: palette.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={palette.textMuted}
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

            <View style={st.forgotRow}>
              <Link href="/auth/forgot-password" style={[st.forgot, { color: palette.link }]}>
                Forgot password?
              </Link>
            </View>

            {rateLimitState && (
              <RateLimitBanner
                secondsRemaining={rateLimitState.secondsRemaining}
                totalSeconds={60}
                type={rateLimitState.type}
              />
            )}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[st.button, (loading || isLimited) && st.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading || isLimited}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={palette.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={st.buttonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Biometric or PIN Sign-in */}
            <View style={st.orRow}>
              <View style={[st.orLine, { backgroundColor: palette.borderLight }]} />
              <Text style={[st.orText, { color: palette.textMuted }]}>or</Text>
              <View style={[st.orLine, { backgroundColor: palette.borderLight }]} />
            </View>

            <TouchableOpacity
              style={[
                st.biometricButton,
                { backgroundColor: palette.surfaceSubtle, borderColor: palette.border },
                loading && st.buttonDisabled,
              ]}
              onPress={biometric?.available ? handleBiometricLogin : () => { setQuickPin(''); setQuickPinError(''); setShowPinModal(true); }}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={st.biometricButtonIcon}>🔐</Text>
              <Text style={[st.biometricButtonText, { color: palette.text }]}>
                {biometric?.available ? `Sign in with ${biometric.label}` : 'Sign in with Biometrics'}
              </Text>
            </TouchableOpacity>

            {hasAppPin && !biometric?.available && (
              <TouchableOpacity
                style={[st.biometricButton, { marginTop: 8, backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}
                onPress={() => { setQuickPin(''); setQuickPinError(''); setShowPinModal(true); }}
                activeOpacity={0.85}
              >
                <Text style={st.biometricButtonIcon}>🔢</Text>
                <Text style={[st.biometricButtonText, { color: palette.text }]}>Sign in with 4-Digit PIN</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer Register Link */}
          <View style={st.footer}>
            <Text style={[st.footerText, { color: palette.textMuted }]}>Don't have an account? </Text>
            <Link href="/auth/register" style={[st.footerLink, { color: palette.link }]}>Register</Link>
          </View>

          {/* Community Security Note */}
          <View style={[st.communityMetaRow, { borderTopColor: palette.borderLight }]}>
            <Text style={[st.communityMetaText, { color: palette.textMuted }]}>Encrypted · Verified Community Access</Text>
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

  // ── Brand Header (Figma Redesign) ──────────────────────────────
  brandHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
  },
  heroBackBtn: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 10,
    ...SHADOWS.sm,
  },
  heroThemeBtn: {
    position: 'absolute',
    right: 20,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 10,
    ...SHADOWS.sm,
  },
  heroThemeText: {
    fontSize: 12.5,
    fontFamily: FONTS.bold,
  },
  avatarAuraOuter: {
    width: 102,
    height: 102,
    borderRadius: 32,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarAuraInner: {
    width: 86,
    height: 86,
    borderRadius: 27,
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandAvatar: {
    width: 74,
    height: 74,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...SHADOWS.primary,
  },
  brandLogoImg: {
    width: 90,
    height: 90,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.regular,
  },

  // ── Floating Form Card (Figma Make UI) ──────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.authCard,
  },
  cardHeader: {
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.4,
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.regular,
    marginTop: 2,
  },

  // ── Role Switcher Segmented Control ────────────────────────────
  roleSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: 20,
  },
  rolePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.full,
  },
  rolePillActive: {
    backgroundColor: '#4F46E5',
    ...SHADOWS.sm,
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: FONTS.medium,
  },
  rolePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Form Inputs ─────────────────────────────────────────────────
  form: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontFamily: FONTS.semiBold,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  inputWrapFocused: {
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0F172A',
    fontFamily: FONTS.regular,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  eyeEmoji: { fontSize: 18 },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgot: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    ...SHADOWS.buttonGlow,
  },
  buttonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONTS.displayBold,
  },

  // ── Biometrics & PIN ───────────────────────────────────────────
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: FONTS.regular,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  biometricButtonIcon: {
    fontSize: 15,
  },
  biometricButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.medium,
  },

  // ── Footer ─────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  footerLink: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  communityMetaRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  communityMetaText: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: FONTS.regular,
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
