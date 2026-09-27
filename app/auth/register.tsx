import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, SHADOWS, RADIUS, GRADIENTS } from '@/constants/config';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', password: '',
    communityCode: '', flatNumber: '', tower: '',
  });
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.mobile) {
      Alert.alert('Validation', 'Name, email, mobile and password are required.');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, email: form.email.toLowerCase().trim() });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Registration failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChangeText: (v: string) => setForm((p) => ({ ...p, [key]: v })),
  });

  const FIELDS = [
    { label: 'Full Name',       key: 'name',          placeholder: 'Rahul Sharma',      icon: 'person-outline' as const,    required: true },
    { label: 'Email',           key: 'email',         placeholder: 'you@example.com',   icon: 'mail-outline' as const,      required: true, keyboardType: 'email-address' },
    { label: 'Mobile',          key: 'mobile',        placeholder: '+91 98765 43210',   icon: 'call-outline' as const,      required: true, keyboardType: 'phone-pad' },
    { label: 'Password',        key: 'password',      placeholder: '••••••••',          icon: 'lock-closed-outline' as const, required: true, secureTextEntry: true },
    { label: 'Community Code',  key: 'communityCode', placeholder: 'ABC123',            icon: 'business-outline' as const,  required: false },
    { label: 'Flat / Unit No.', key: 'flatNumber',    placeholder: 'A-204',             icon: 'home-outline' as const,      required: false },
    { label: 'Tower / Block',   key: 'tower',         placeholder: 'Tower A',           icon: 'layers-outline' as const,    required: false },
  ] as const;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join your community today</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {FIELDS.map(({ label, key, placeholder, icon, required, ...rest }) => (
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
                  {...field(key)}
                  {...(rest as any)}
                />
              </View>
            </View>
          ))}

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
