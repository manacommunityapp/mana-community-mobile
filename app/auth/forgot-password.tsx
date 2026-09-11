import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '@/services/authService';
import { COLORS } from '@/constants/config';

export default function ForgotPasswordScreen() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim()) { Alert.alert('Validation', 'Please enter your email.'); return; }
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      Alert.alert('Email Sent', 'Check your inbox for a password reset link.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Forgot Password?</Text>
      <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Email address</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Link</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.background, padding: 24, paddingTop: 60 },
  back:           { marginBottom: 32 },
  backText:       { fontSize: 17, color: COLORS.primary, fontWeight: '500' },
  title:          { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subtitle:       { fontSize: 15, color: COLORS.textMuted, marginBottom: 32 },
  field:          { gap: 6, marginBottom: 20 },
  label:          { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input:          { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 15, color: COLORS.text, backgroundColor: COLORS.surface },
  button:         { backgroundColor: COLORS.primary, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
