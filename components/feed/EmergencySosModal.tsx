import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Modal, Pressable, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, ActivityIndicator, Alert, Linking, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FONTS, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/context/ThemeContext';
import { emergencyService, type EmergencyTriggerRequest } from '@/services/emergencyService';
import { secureLog } from '@/security';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface EmergencyTriggerOption {
  id: string;
  emergencyType: NonNullable<EmergencyTriggerRequest['emergencyType']>;
  label: string;
  icon: IoniconsName;
  color: string;
  bg: string;
}

const EMERGENCY_TRIGGERS: EmergencyTriggerOption[] = [
  { id: 'MEDICAL',  emergencyType: 'MEDICAL',           label: 'Medical',        icon: 'medkit-outline',      color: '#DC2626', bg: '#FEE2E2' },
  { id: 'FIRE',     emergencyType: 'FIRE',              label: 'Fire Hazard',    icon: 'flame-outline',       color: '#EA580C', bg: '#FFEDD5' },
  { id: 'LIFT',     emergencyType: 'LIFT_STUCK',        label: 'Lift Stuck',     icon: 'git-compare-outline', color: '#D97706', bg: '#FEF3C7' },
  { id: 'SECURITY', emergencyType: 'SECURITY_INTRUDER', label: 'Security',       icon: 'shield-outline',      color: '#2563EB', bg: '#DBEAFE' },
  { id: 'GAS_LEAK', emergencyType: 'GAS_LEAK',          label: 'Gas Leak',       icon: 'warning-outline',     color: '#059669', bg: '#D1FAE5' },
  { id: 'PANIC',    emergencyType: 'GENERAL_PANIC',     label: 'Panic SOS',      icon: 'alert-circle',        color: '#991B1B', bg: '#FECACA' },
];

interface SafetyModuleShortcut {
  key: string;
  label: string;
  sublabel: string;
  icon: IoniconsName;
  color: string;
  bg: string;
  route: string;
  module?: string;
  adminOnly?: boolean;
}

const SAFETY_MODULES: SafetyModuleShortcut[] = [
  { key: 'emergency-hub', label: 'Emergency Hub',       sublabel: 'Active alerts & full triggers', icon: 'radio-outline',           color: '#DC2626', bg: '#FEE2E2', route: '/emergency',        module: 'EMERGENCY' },
  { key: 'healthguard',   label: 'HealthGuard SOS',     sublabel: 'Ambulance & medical triage',    icon: 'medical-outline',         color: '#E11D48', bg: '#FFE4E6', route: '/healthguard',      module: 'SAFETY' },
  { key: 'safety-center', label: 'Safety Center',       sublabel: 'Incidents, patrol & security',  icon: 'shield-half-outline',     color: '#0F172A', bg: '#E2E8F0', route: '/safety',           module: 'SAFETY' },
  { key: 'intercom',      label: 'Gate Intercom',       sublabel: 'Call security gate desk',       icon: 'videocam-outline',        color: '#004AC6', bg: '#DBE1FF', route: '/intercom',         module: 'VISITORS' },
  { key: 'turnstiles',    label: 'Smart Gates',         sublabel: 'Biometric & QR gate access',    icon: 'qr-code-outline',         color: '#0284C7', bg: '#E0F2FE', route: '/access/turnstiles', module: 'VISITORS' },
  { key: 'broadcast',     label: 'Emergency Broadcast', sublabel: 'Send urgent alert to society',  icon: 'megaphone-outline',       color: '#B91C1C', bg: '#FEE2E2', route: '/admin/broadcast',  module: 'EMERGENCY', adminOnly: true },
];

const HOLD_DURATION_MS = 1500;

export function EmergencySosModal({
  visible,
  onClose,
  unit,
  tower,
  flatNumber,
  communityDisplay,
}: {
  visible: boolean;
  onClose: () => void;
  unit?: string;
  tower?: string;
  flatNumber?: string;
  communityDisplay?: string;
}) {
  const router = useRouter();
  const { hasModule, hasRole, isSuperAdmin } = useAuth();
  const { palette } = useAppTheme();
  const isAdmin = isSuperAdmin || hasRole('ADMIN', 'COMMUNITY_ADMIN', 'SUPER_ADMIN');

  const [selectedTrigger, setSelectedTrigger] = useState<EmergencyTriggerOption | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [holding, setHolding] = useState(false);

  const holdAnim = useRef(new Animated.Value(0)).current;
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdAnim.stopAnimation();
    holdAnim.setValue(0);
    setHolding(false);
  };

  useEffect(() => {
    if (!visible) clearHold();
    return () => clearHold();
  }, [visible]);

  const { data: contacts = [] } = useQuery({
    queryKey: ['emergency-contacts-modal'],
    queryFn: () => emergencyService.getContacts(),
    enabled: visible,
    staleTime: 60_000,
  });

  const visibleModules = SAFETY_MODULES.filter((m) => {
    if (isSuperAdmin) return true;
    if (m.adminOnly && !isAdmin) return false;
    if (m.module && !hasModule(m.module)) return false;
    return true;
  });

  const callPhone = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Dialer Unavailable', `Call ${phone} directly.`);
    });
  };

  const resetAndClose = () => {
    if (submitting) return;
    clearHold();
    setSelectedTrigger(null);
    setNotes('');
    onClose();
  };

  const triggerRequest = async (trig: EmergencyTriggerOption, desc?: string) => {
    setSubmitting(true);
    try {
      await emergencyService.triggerSOS({
        category: trig.id,
        emergencyType: trig.emergencyType,
        description: desc,
        tower,
        flatNumber,
      });
      setSelectedTrigger(null);
      setNotes('');
      onClose();
      Alert.alert(
        'Emergency Dispatched',
        `Security marshals have been alerted for ${unit || 'your unit'}.`,
        [
          { text: 'View Emergency Hub', onPress: () => router.push('/emergency' as any) },
          { text: 'OK' },
        ],
      );
    } catch (err) {
      secureLog.warn('[EmergencySosModal] SOS trigger failed — alert NOT sent', err);
      const securityPhone =
        contacts.find((c) => /security|control/i.test(c.role))?.phone || '112';
      Alert.alert(
        'SOS NOT SENT',
        'Could not reach the server, so NO ONE has been notified. Call security or emergency services directly right now.',
        [
          { text: `Call ${securityPhone}`, style: 'destructive', onPress: () => callPhone(securityPhone) },
          { text: 'Close', style: 'cancel' },
        ],
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchSOS = async () => {
    if (!selectedTrigger) return;
    await triggerRequest(selectedTrigger, notes.trim() || undefined);
  };

  const startHold = () => {
    if (submitting) return;
    setHolding(true);
    holdAnim.setValue(0);
    Animated.timing(holdAnim, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    }).start();

    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null;
      setHolding(false);
      holdAnim.setValue(0);
      const panic = EMERGENCY_TRIGGERS[EMERGENCY_TRIGGERS.length - 1];
      triggerRequest(panic, '1.5s Panic SOS hold triggered from home header');
    }, HOLD_DURATION_MS);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) {
      clearHold();
    }
  };

  const navigateModule = (route: string) => {
    clearHold();
    setSelectedTrigger(null);
    setNotes('');
    onClose();
    router.push(route as any);
  };

  const progressWidth = holdAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
      <Pressable style={[st.overlay, { backgroundColor: palette.overlay }]} onPress={resetAndClose}>
        <Pressable style={[st.sheet, { backgroundColor: palette.surface }]} onPress={(e) => e.stopPropagation()}>
          <View style={st.handleBarWrap}>
            <View style={[st.handleBar, { backgroundColor: palette.border }]} />
          </View>

          {/* Header */}
          <View style={st.header}>
            <View style={st.headerLeft}>
              <View style={[st.sosHeaderIcon, { backgroundColor: palette.dangerLight }]}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.title, { color: palette.text }]}>Emergency SOS & Safety</Text>
                <Text style={[st.subtitle, { color: palette.textMuted }]} numberOfLines={1}>
                  {[communityDisplay, unit].filter(Boolean).join(' · ') || '24×7 Security Response'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={resetAndClose} style={[st.closeBtn, { backgroundColor: palette.surfaceMuted }]} hitSlop={8}>
              <Ionicons name="close" size={20} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollBody}>
            {selectedTrigger ? (
              <View style={[st.confirmBox, { backgroundColor: palette.dangerLight, borderColor: '#FCA5A5' }]}>
                <View style={st.confirmTop}>
                  <View style={[st.confirmIcon, { backgroundColor: selectedTrigger.bg }]}>
                    <Ionicons name={selectedTrigger.icon} size={22} color={selectedTrigger.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.confirmTitle, { color: palette.isDark ? '#FCA5A5' : '#991B1B' }]}>
                      Trigger {selectedTrigger.label} SOS
                    </Text>
                    <Text style={[st.confirmSub, { color: palette.isDark ? '#FECACA' : '#7F1D1D' }]}>
                      Alerts security desk & marshals for {unit || 'your unit'}
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={[st.notesInput, { backgroundColor: palette.surface, color: palette.text }]}
                  placeholder="Optional details (location, floor, assistance needed)..."
                  placeholderTextColor={palette.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />

                <View style={st.confirmActions}>
                  <TouchableOpacity
                    style={[st.backStepBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    onPress={() => setSelectedTrigger(null)}
                    disabled={submitting}
                  >
                    <Text style={[st.backStepText, { color: palette.textSecondary }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={st.dispatchBtn}
                    onPress={handleDispatchSOS}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="radio" size={16} color="#FFFFFF" />
                        <Text style={st.dispatchBtnText}>Broadcast SOS Now</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* 0 · Hold 1.5s Panic Circle (Figma SOS Sheet) */}
                <View style={[st.holdCard, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}>
                  <Pressable
                    onPressIn={startHold}
                    onPressOut={cancelHold}
                    disabled={submitting}
                    accessibilityLabel="Hold for 1.5 seconds to trigger Panic SOS"
                    style={st.holdRingWrap}
                  >
                    <LinearGradient
                      colors={palette.dangerGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[st.holdCircle, holding && st.holdCircleActive]}
                    >
                      {submitting ? (
                        <ActivityIndicator size="large" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="radio" size={26} color="#FFFFFF" />
                          <Text style={st.holdCircleTitle}>SOS</Text>
                          <Text style={st.holdCircleSub}>{holding ? 'KEEP HOLDING…' : 'HOLD 1.5s'}</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                  <View style={st.holdInfo}>
                    <Text style={[st.holdTitle, { color: palette.text }]}>Instant Panic Alert</Text>
                    <Text style={[st.holdDesc, { color: palette.textMuted }]}>
                      Press and hold the red SOS button for 1.5s to immediately alert security control & patrolling marshals.
                    </Text>
                    <View style={[st.holdTrack, { backgroundColor: palette.surfaceMuted }]}>
                      <Animated.View style={[st.holdFill, { width: progressWidth }]} />
                    </View>
                  </View>
                </View>

                {/* 1 · Quick Distress Triggers */}
                <Text style={[st.sectionEyebrow, { color: palette.eyebrow }]}>SELECT SPECIFIC EMERGENCY</Text>
                <View style={st.triggerGrid}>
                  {EMERGENCY_TRIGGERS.map((trig) => (
                    <TouchableOpacity
                      key={trig.id}
                      style={[
                        st.triggerTile,
                        {
                          backgroundColor: palette.isDark ? palette.surfaceSubtle : trig.bg,
                          borderColor: trig.color + '45',
                        },
                      ]}
                      onPress={() => setSelectedTrigger(trig)}
                      activeOpacity={0.8}
                    >
                      <View style={[st.triggerCircle, { backgroundColor: trig.color }]}>
                        <Ionicons name={trig.icon} size={18} color="#FFFFFF" />
                      </View>
                      <Text
                        style={[st.triggerLabel, { color: palette.isDark ? '#F8FAFC' : trig.color }]}
                        numberOfLines={1}
                      >
                        {trig.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2 · Safety & Emergency Modules */}
                {visibleModules.length > 0 && (
                  <>
                    <Text style={[st.sectionEyebrow, { color: palette.eyebrow }]}>SAFETY & SECURITY MODULES</Text>
                    <View style={[st.modulesList, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderLight }]}>
                      {visibleModules.map((mod, i) => (
                        <TouchableOpacity
                          key={mod.key}
                          style={[
                            st.moduleRow,
                            { borderBottomColor: palette.borderLight },
                            i === visibleModules.length - 1 && { borderBottomWidth: 0 },
                          ]}
                          onPress={() => navigateModule(mod.route)}
                          activeOpacity={0.78}
                        >
                          <View style={[st.moduleIconBox, { backgroundColor: mod.bg }]}>
                            <Ionicons name={mod.icon} size={18} color={mod.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[st.moduleTitle, { color: palette.text }]}>{mod.label}</Text>
                            <Text style={[st.moduleSub, { color: palette.textMuted }]} numberOfLines={1}>{mod.sublabel}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* 3 · 24x7 Helplines */}
                {contacts.length > 0 && (
                  <>
                    <Text style={[st.sectionEyebrow, { color: palette.eyebrow }]}>24×7 EMERGENCY HELPLINES</Text>
                    <View style={st.contactsWrap}>
                      {contacts.slice(0, 4).map((c, idx) => (
                        <TouchableOpacity
                          key={c.id || idx}
                          style={[
                            st.contactChip,
                            {
                              backgroundColor: palette.dangerLight,
                              borderColor: '#FCA5A580',
                            },
                          ]}
                          onPress={() => callPhone(c.phone)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={14} color="#DC2626" />
                          <View style={{ flex: 1 }}>
                            <Text style={[st.contactRole, { color: palette.text }]} numberOfLines={1}>{c.role}</Text>
                            <Text style={st.contactPhone}>{c.phone}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[st.cancelBtn, { backgroundColor: palette.surfaceMuted }]}
            onPress={resetAndClose}
            activeOpacity={0.8}
          >
            <Text style={[st.cancelBtnText, { color: palette.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 20,
    maxHeight: '88%',
    ...SHADOWS.lg,
  },
  handleBarWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sosHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.displayBold,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingBottom: 10,
    gap: 12,
  },
  holdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  holdRingWrap: {
    padding: 4,
    borderRadius: 48,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
  },
  holdCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  holdCircleActive: {
    transform: [{ scale: 0.95 }],
  },
  holdCircleTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.displayEB,
    marginTop: 1,
  },
  holdCircleSub: {
    color: '#FEE2E2',
    fontSize: 8.5,
    fontFamily: FONTS.bold,
    letterSpacing: 0.4,
  },
  holdInfo: {
    flex: 1,
    gap: 5,
  },
  holdTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
  },
  holdDesc: {
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    lineHeight: 16,
  },
  holdTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 3,
  },
  holdFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 3,
  },
  sectionEyebrow: {
    fontSize: 10.5,
    fontFamily: FONTS.bold,
    letterSpacing: 0.7,
    marginTop: 2,
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  triggerTile: {
    width: '31.5%',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  triggerCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerLabel: {
    fontSize: 11.5,
    fontFamily: FONTS.bold,
    textAlign: 'center',
  },
  modulesList: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  moduleIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
  },
  moduleSub: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  contactsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  contactChip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  contactRole: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  contactPhone: {
    fontSize: 12,
    fontFamily: FONTS.displayBold,
    color: '#DC2626',
  },
  confirmBox: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  confirmTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
  },
  confirmSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 1,
  },
  notesInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    fontSize: 13,
    fontFamily: FONTS.regular,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  backStepBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backStepText: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
  },
  dispatchBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchBtnText: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
  },
  cancelBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontFamily: FONTS.bold,
  },
});
