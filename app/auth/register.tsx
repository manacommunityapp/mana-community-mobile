import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';

export default function RegisterScreen() {
  const { register } = useAuth();
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join your community</Text>
        </View>

        <View style={styles.form}>
          {[
            { label: 'Full Name *',        key: 'name',          placeholder: 'Rahul Sharma', autoCapitalize: 'words' },
            { label: 'Email *',            key: 'email',         placeholder: 'you@example.com', keyboardType: 'email-address' },
            { label: 'Mobile *',           key: 'mobile',        placeholder: '+91 98765 43210', keyboardType: 'phone-pad' },
            { label: 'Password *',         key: 'password',      placeholder: '••••••••', secureTextEntry: true },
            { label: 'Community Code',     key: 'communityCode', placeholder: 'ABC123 (optional)' },
            { label: 'Flat / Unit No.',    key: 'flatNumber',    placeholder: 'A-204 (optional)' },
            { label: 'Tower / Block',      key: 'tower',         placeholder: 'Tower A (optional)' },
          ].map(({ label, key, ...rest }) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                {...field(key as keyof typeof form)}
                {...(rest as any)}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Create Account</Text>
            }
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
  container:      { flex: 1, backgroundColor: COLORS.background },
  scroll:         { flexGrow: 1, padding: 24, paddingTop: 60 },
  header:         { marginBottom: 28 },
  title:          { fontSize: 26, fontWeight: '700', color: COLORS.text },
  subtitle:       { fontSize: 15, color: COLORS.textMuted, marginTop: 4 },
  form:           { gap: 14 },
  field:          { gap: 5 },
  label:          { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input:          { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 13, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  button:         { backgroundColor: COLORS.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:         { flexDirection: 'row', justifyContent: 'center', marginTop: 28, marginBottom: 24 },
  footerText:     { color: COLORS.textMuted, fontSize: 14 },
  footerLink:     { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
