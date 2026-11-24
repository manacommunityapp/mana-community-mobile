import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { useAppTheme } from '@/context/ThemeContext';
import { authService } from '@/services/authService';

interface JoinCommunityModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (community: any) => void;
}

export function JoinCommunityModal({
  visible,
  onClose,
  onSuccess,
}: JoinCommunityModalProps) {
  const { palette, isDark } = useAppTheme();
  const qc = useQueryClient();

  const [inviteCode, setInviteCode] = useState('');
  const [flatNo, setFlatNo] = useState('');
  const [block, setBlock] = useState('');
  const [residentType, setResidentType] = useState<'OWNER' | 'TENANT'>('OWNER');

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedCommunity, setVerifiedCommunity] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetState = () => {
    setInviteCode('');
    setFlatNo('');
    setBlock('');
    setResidentType('OWNER');
    setIsVerifying(false);
    setIsSubmitting(false);
    setVerifiedCommunity(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleVerifyCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter an invite code.');
      return;
    }
    setErrorMessage(null);
    setIsVerifying(true);
    try {
      const comm = await authService.lookupCommunity(code);
      if (comm && (comm.id || comm.communityId || comm.name || comm.communityName)) {
        setVerifiedCommunity(comm);
      } else {
        setErrorMessage('Invalid invite code. Please check and try again.');
        setVerifiedCommunity(null);
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Could not verify community code.');
      setVerifiedCommunity(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Invite code is required.');
      return;
    }
    if (!flatNo.trim()) {
      setErrorMessage('Flat / Unit number is required to join a community.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const updatedProfile = await authService.joinCommunity({
        inviteCode: code,
        flatNo: flatNo.trim(),
        block: block.trim() || undefined,
      });

      // Invalidate relevant query caches across app
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['auth'] });
      qc.invalidateQueries({ queryKey: ['home-feed'] });
      qc.invalidateQueries({ queryKey: ['home-events'] });
      qc.invalidateQueries({ queryKey: ['community-details'] });
      qc.invalidateQueries({ queryKey: ['gate'] });
      qc.invalidateQueries({ queryKey: ['helpdesk'] });
      qc.invalidateQueries({ queryKey: ['finance'] });

      const commName =
        verifiedCommunity?.name ||
        verifiedCommunity?.communityName ||
        updatedProfile?.communityName ||
        'your community';

      Alert.alert(
        'Welcome to your Community!',
        `You have successfully linked your unit in ${commName}. You now have full access to gate passes, visitor pre-approvals, society dues & community features.`,
        [{ text: 'Continue', onPress: handleClose }]
      );

      onSuccess?.(updatedProfile);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message ||
        err?.message ||
        'Could not join community. Please check your details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}
          onPress={handleClose}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleWrap}>
                <View style={[styles.headerIconBox, { backgroundColor: palette.primaryLight }]}>
                  <Ionicons name="business-outline" size={20} color={palette.link} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: palette.text }]}>Join Your Community</Text>
                  <Text style={[styles.modalSubtitle, { color: palette.textMuted }]}>
                    Link your apartment or residential society
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={[styles.modalCloseBtn, { backgroundColor: palette.surfaceSubtle }]}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={palette.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* Error banner */}
              {errorMessage && (
                <View style={[styles.errorBanner, { backgroundColor: palette.dangerLight, borderColor: palette.danger }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={palette.danger} style={{ marginRight: 6 }} />
                  <Text style={[styles.errorBannerText, { color: palette.danger }]}>{errorMessage}</Text>
                </View>
              )}

              {/* Step 1: Invite code input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
                  Community Invite Code
                </Text>
                <View style={[styles.codeRow, { backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}>
                  <Ionicons name="key-outline" size={18} color={palette.textMuted} style={styles.codeIcon} />
                  <TextInput
                    style={[styles.codeInput, { color: palette.text }]}
                    placeholder="e.g. S9X72K"
                    placeholderTextColor={palette.textMuted}
                    value={inviteCode}
                    onChangeText={(txt) => {
                      setInviteCode(txt.toUpperCase());
                      setVerifiedCommunity(null);
                      setErrorMessage(null);
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={16}
                  />
                  <TouchableOpacity
                    style={[
                      styles.verifyBtn,
                      { backgroundColor: palette.primaryLight },
                      (!inviteCode.trim() || isVerifying) && styles.verifyBtnDisabled,
                    ]}
                    onPress={handleVerifyCode}
                    disabled={!inviteCode.trim() || isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color={palette.link} />
                    ) : (
                      <Text style={[styles.verifyBtnText, { color: palette.link }]}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={[styles.inputHint, { color: palette.textMuted }]}>
                  Get this 6-8 digit code from your society association or onboarding invitation.
                </Text>
              </View>

              {/* Verified Community Preview Card */}
              {verifiedCommunity && (
                <View
                  style={[
                    styles.verifiedCard,
                    {
                      backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                      borderColor: isDark ? '#059669' : '#A7F3D0',
                    },
                  ]}
                >
                  <View style={styles.verifiedCardHeader}>
                    <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                    <Text style={[styles.verifiedCardBadge, { color: '#059669' }]}>Community Verified</Text>
                  </View>
                  <Text style={[styles.verifiedCardName, { color: isDark ? '#ECFDF5' : '#065F46' }]}>
                    {verifiedCommunity.name || verifiedCommunity.communityName || 'Residential Society'}
                  </Text>
                  {(verifiedCommunity.city || verifiedCommunity.address) && (
                    <Text style={[styles.verifiedCardAddress, { color: isDark ? '#A7F3D0' : '#047857' }]}>
                      {[verifiedCommunity.city, verifiedCommunity.state, verifiedCommunity.address]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                </View>
              )}

              {/* Step 2: Unit and Block Details */}
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
                    Flat / Unit No. <Text style={{ color: palette.danger }}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, { backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}>
                    <Ionicons name="home-outline" size={17} color={palette.textMuted} style={styles.codeIcon} />
                    <TextInput
                      style={[styles.textInput, { color: palette.text }]}
                      placeholder="e.g. 402"
                      placeholderTextColor={palette.textMuted}
                      value={flatNo}
                      onChangeText={setFlatNo}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
                    Block / Tower
                  </Text>
                  <View style={[styles.inputWrapper, { backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}>
                    <Ionicons name="business-outline" size={17} color={palette.textMuted} style={styles.codeIcon} />
                    <TextInput
                      style={[styles.textInput, { color: palette.text }]}
                      placeholder="e.g. Tower B"
                      placeholderTextColor={palette.textMuted}
                      value={block}
                      onChangeText={setBlock}
                    />
                  </View>
                </View>
              </View>

              {/* Step 3: Occupancy Type */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
                  I am living here as
                </Text>
                <View style={styles.residentTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.residentTypeBtn,
                      {
                        backgroundColor: residentType === 'OWNER' ? palette.primaryLight : palette.surfaceSubtle,
                        borderColor: residentType === 'OWNER' ? palette.primary : palette.borderLight,
                      },
                    ]}
                    onPress={() => setResidentType('OWNER')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={residentType === 'OWNER' ? palette.link : palette.textMuted}
                    />
                    <Text
                      style={[
                        styles.residentTypeText,
                        { color: residentType === 'OWNER' ? palette.link : palette.textSecondary },
                      ]}
                    >
                      Flat Owner
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.residentTypeBtn,
                      {
                        backgroundColor: residentType === 'TENANT' ? palette.primaryLight : palette.surfaceSubtle,
                        borderColor: residentType === 'TENANT' ? palette.primary : palette.borderLight,
                      },
                    ]}
                    onPress={() => setResidentType('TENANT')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="key"
                      size={16}
                      color={residentType === 'TENANT' ? palette.link : palette.textMuted}
                    />
                    <Text
                      style={[
                        styles.residentTypeText,
                        { color: residentType === 'TENANT' ? palette.link : palette.textSecondary },
                      ]}
                    >
                      Tenant / Renter
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: palette.borderLight }]}
                  onPress={handleClose}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.cancelBtnText, { color: palette.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtnWrap}
                  onPress={handleJoin}
                  disabled={isSubmitting || !inviteCode.trim() || !flatNo.trim()}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={
                      !inviteCode.trim() || !flatNo.trim() || isSubmitting
                        ? ['#94A3B8', '#64748B']
                        : palette.primaryGradient
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.submitBtnText}>Join Community</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    height: 48,
  },
  codeIcon: {
    marginRight: 8,
  },
  codeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    height: '100%',
  },
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputHint: {
    fontSize: 11,
    marginTop: 4,
  },
  verifiedCard: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
  },
  verifiedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  verifiedCardBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  verifiedCardName: {
    fontSize: 16,
    fontWeight: '700',
  },
  verifiedCardAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    height: 46,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  residentTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  residentTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    height: 42,
  },
  residentTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    height: 46,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtnWrap: {
    flex: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
