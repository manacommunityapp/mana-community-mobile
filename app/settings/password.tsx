import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, FONTS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import api from '@/services/apiClient';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(() => {
    return {
      length: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
      hasSpecial: /[@$!%*?&#]/.test(newPassword),
      matchesConfirm: newPassword.length > 0 && newPassword === confirmPassword,
    };
  }, [newPassword, confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.length) score += 25;
    if (passwordChecks.hasUpper) score += 25;
    if (passwordChecks.hasNumber) score += 25;
    if (passwordChecks.hasSpecial) score += 25;
    return score;
  }, [passwordChecks]);

  const canSubmit = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      strengthScore >= 75 &&
      passwordChecks.matchesConfirm &&
      !loading
    );
  }, [currentPassword, strengthScore, passwordChecks.matchesConfirm, loading]);

  const handleChangePassword = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      Alert.alert(
        'Password Updated',
        'Your account password has been changed successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update password. Please verify your current password.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            Choose a strong, unique password to safeguard your resident account and society permissions.
          </Text>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={THEME.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={THEME.textSecondary}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowCurrent(!showCurrent)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={THEME.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NEW PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="key-outline" size={18} color={THEME.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={THEME.textSecondary}
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNew(!showNew)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showNew ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={THEME.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Strength Bar */}
          {newPassword.length > 0 && (
            <View style={styles.strengthBox}>
              <View style={styles.strengthRow}>
                <Text style={styles.strengthLabel}>Password Strength</Text>
                <Text
                  style={[
                    styles.strengthValue,
                    {
                      color:
                        strengthScore <= 25
                          ? '#DC2626'
                          : strengthScore <= 50
                          ? '#D97706'
                          : strengthScore <= 75
                          ? '#0284C7'
                          : '#059669',
                    },
                  ]}
                >
                  {strengthScore <= 25
                    ? 'Weak'
                    : strengthScore <= 50
                    ? 'Fair'
                    : strengthScore <= 75
                    ? 'Good'
                    : 'Strong'}
                </Text>
              </View>
              <View style={styles.strengthTrack}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${strengthScore}%`,
                      backgroundColor:
                        strengthScore <= 25
                          ? '#DC2626'
                          : strengthScore <= 50
                          ? '#D97706'
                          : strengthScore <= 75
                          ? '#0284C7'
                          : '#059669',
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONFIRM NEW PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="checkmark-circle-outline" size={18} color={THEME.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={THEME.textSecondary}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                style={styles.eyeBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={THEME.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Guidelines checklist */}
          <View style={styles.guidelinesCard}>
            <Text style={styles.guideTitle}>Password Requirements</Text>
            {[
              { label: 'At least 8 characters long', checked: passwordChecks.length },
              { label: 'Includes an uppercase letter (A-Z)', checked: passwordChecks.hasUpper },
              { label: 'Includes at least one digit (0-9)', checked: passwordChecks.hasNumber },
              { label: 'Includes a special symbol (@, $, !, %, etc.)', checked: passwordChecks.hasSpecial },
              { label: 'Both passwords match exactly', checked: passwordChecks.matchesConfirm },
            ].map((rule, idx) => (
              <View key={idx} style={styles.ruleRow}>
                <Ionicons
                  name={rule.checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={rule.checked ? '#059669' : THEME.textSecondary}
                />
                <Text style={[styles.ruleText, rule.checked && styles.ruleTextChecked]}>
                  {rule.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            disabled={!canSubmit}
            onPress={handleChangePassword}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    ...SHADOWS.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.surfaceMuted,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.textPrimary,
    fontFamily: FONTS.displayBold,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: THEME.textPrimary,
  },
  eyeBtn: {
    padding: 4,
  },
  strengthBox: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  strengthValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  strengthTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  guidelinesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 24,
    gap: 8,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  ruleTextChecked: {
    color: THEME.textPrimary,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: THEME.brandDark,
    borderRadius: RADIUS.lg,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  submitBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
