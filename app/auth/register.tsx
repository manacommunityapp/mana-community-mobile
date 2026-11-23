import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { useAppBack } from '@/hooks/useAppBack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SHADOWS, RADIUS, GRADIENTS } from '@/constants/config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { goBack } = useAppBack({ fallbackRoute: '/onboarding' });
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', password: '',
    communityCode: '', flatNumber: '', tower: '',
  });
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [consentToPrivacyNotice, setConsentToPrivacyNotice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.mobile) {
      Alert.alert('Validation', 'Name, email, mobile and password are required.');
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return;
    }
    if (form.password.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.');
      return;
    }
    const digitsOnly = form.mobile.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      Alert.alert('Validation', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!consentToPrivacyNotice) {
      Alert.alert('Validation', 'You must agree to the privacy notice to register.');
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName: form.name.trim(),
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        phone: digitsOnly.slice(-10),
        mobile: digitsOnly.slice(-10),
        password: form.password,
        inviteCode: form.communityCode.trim() || undefined,
        communityCode: form.communityCode.trim() || undefined,
        flatNo: form.flatNumber.trim() || undefined,
        flatNumber: form.flatNumber.trim() || undefined,
        block: form.tower.trim() || undefined,
        tower: form.tower.trim() || undefined,
        gender,
        consentToPrivacyNotice,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = status === 409
        ? 'An account with this email already exists.'
        : 'Registration failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChangeText: (v: string) => setForm((p) => ({ ...p, [key]: v })),
  });

  const FIELDS: {
    label: string;
    key: keyof typeof form;
    placeholder: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    required: boolean;
    keyboardType?: 'email-address' | 'phone-pad';
    isPassword?: boolean;
  }[] = [
    { label: 'Full Name',       key: 'name',          placeholder: 'Rahul Sharma',    icon: 'person-outline',      required: true },
    { label: 'Email',           key: 'email',         placeholder: 'you@example.com', icon: 'mail-outline',        required: true, keyboardType: 'email-address' },
    { label: 'Mobile',          key: 'mobile',        placeholder: '+91 98765 43210', icon: 'call-outline',        required: true, keyboardType: 'phone-pad' },
    { label: 'Password',        key: 'password',      placeholder: '••••••••',        icon: 'lock-closed-outline', required: true, isPassword: true },
    { label: 'Community Code (Optional)',  key: 'communityCode', placeholder: 'Enter code or leave empty to join later', icon: 'business-outline', required: false },
    { label: 'Flat / Unit No. (Optional)', key: 'flatNumber',    placeholder: 'e.g. A-204 (can add later)',           icon: 'home-outline',        required: false },
    { label: 'Tower / Block (Optional)',   key: 'tower',         placeholder: 'Tower A (can add later)',         icon: 'layers-outline',      required: false },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: Math.max(insets.top + 14, Platform.OS === 'ios' ? 56 : 40) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={goBack}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Enter your invite code or register your flat to get started</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {FIELDS.map(({ label, key, placeholder, icon, required, keyboardType, isPassword }) => (
            <View key={key} style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                {!required && <Text style={styles.optional}>Optional</Text>}
              </View>
              <View style={styles.inputWrap}>
                <View style={styles.inputIconWrap}>
                  <Ionicons name={icon} size={17} color={COLORS.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  keyboardType={keyboardType}
                  secureTextEntry={isPassword && !showPassword}
                  {...field(key)}
                />
                {isPassword && (
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={19}
                      color={COLORS.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* Gender */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Gender</Text>
            </View>
            <View style={styles.genderRow}>
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderPill, gender === g && styles.genderPillActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderPillText, gender === g && styles.genderPillTextActive]}>
                    {g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Other'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Privacy Notice Consent */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsentToPrivacyNotice((v) => !v)}
            activeOpacity={0.85}
          >
            <View style={[styles.checkbox, consentToPrivacyNotice && styles.checkboxActive]}>
              {consentToPrivacyNotice && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={styles.consentText}>
              I agree to the <Text style={styles.consentLink}>Privacy Notice</Text> and consent to processing my details.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={GRADIENTS.primary as unknown as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Create Account</Text>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/auth/login" style={styles.footerLink}>Sign In</Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 2,
  },
  headerText: {},
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayEB,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  form: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
  },
  optional: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  inputIconWrap: {
    width: 46,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  genderPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight ?? '#EEF2FF',
  },
  genderPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  genderPillTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  consentText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
  },
  consentLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  button: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    ...SHADOWS.primary,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
});
