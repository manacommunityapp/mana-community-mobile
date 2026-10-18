import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sportsService } from '@/services/sportsService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';

export interface RegistrationRecord {
  id: number;
  sport: string;
  team: string;
  players: number;
  plan: string;
  fee: number;
  status: 'Pending' | 'Confirmed';
}

interface SportsRegisterModalProps {
  visible: boolean;
  onClose: () => void;
  onRegistered?: (reg: RegistrationRecord) => void;
}

const SPORT_OPTIONS = [
  { name: 'Cricket', icon: '🏏', color: '#F59E0B', fee: 2500, spots: 4, when: 'Starts Jun 20 · Main Cricket Ground' },
  { name: 'Badminton', icon: '🏸', color: '#4F46E5', fee: 1200, spots: 6, when: 'Starts Jun 22 · Indoor Court 1' },
  { name: 'Football', icon: '⚽', color: '#10B981', fee: 2000, spots: 3, when: 'Starts Jun 24 · Turf Ground A' },
  { name: 'Basketball', icon: '🏀', color: '#F97316', fee: 1500, spots: 4, when: 'Starts Jun 25 · Basketball Court' },
  { name: 'Table Tennis', icon: '🏓', color: '#EC4899', fee: 1000, spots: 8, when: 'Starts Jun 23 · Clubhouse Hall' },
  { name: 'Pickleball', icon: '🏓', color: '#06B6D4', fee: 1100, spots: 5, when: 'Starts Jun 26 · Court 3' },
];

const PLANS = [
  { key: 'Team', label: 'Full team', note: 'Pay once for the whole squad' },
  { key: 'Split', label: 'Split per player', note: 'Each player pays their share' },
];

export function SportsRegisterModal({ visible, onClose, onRegistered }: SportsRegisterModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedSport, setSelectedSport] = useState(SPORT_OPTIONS[0]);
  const [teamName, setTeamName] = useState('');
  const [captain, setCaptain] = useState(user?.fullName || 'Resident Athlete');
  const [players, setPlayers] = useState(8);
  const [plan, setPlan] = useState(PLANS[0]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<RegistrationRecord | null>(null);

  const fee = selectedSport.fee;
  const perPlayer = Math.ceil(fee / players);
  const canNext = step === 0 || (step === 1 && teamName.trim().length > 1) || step === 2;
  const labels = ['Sport', 'Team', 'Payment'];

  const resetState = () => {
    setStep(0);
    setTeamName('');
    setDone(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const confirmRegistration = async () => {
    setLoading(true);
    const newReg: RegistrationRecord = {
      id: Date.now(),
      sport: selectedSport.name,
      team: teamName.trim(),
      players,
      plan: plan.label,
      fee,
      status: 'Pending',
    };

    try {
      await sportsService.registerTeam({
        tournamentId: 1,
        name: teamName.trim(),
        sport: selectedSport.name.toUpperCase().replace(/\s+/g, '_') as any,
        captainId: user?.id,
      } as any).catch(() => null);
    } catch {
      // Ignore network errors for mock/offline resilience
    } finally {
      setLoading(false);
      setDone(newReg);
      onRegistered?.(newReg);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        {done ? (
          // ─── Confirmation Screen ──────────────────────────────
          <View style={s.doneContainer}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={s.successGlow}
            >
              <Ionicons name="checkmark" size={48} color="#fff" />
            </LinearGradient>
            <Text style={s.doneTitle}>You're in the draw!</Text>
            <Text style={s.doneSub}>
              {done.team} has been registered for {done.sport}. Your tournament slot will be confirmed once payment clears.
            </Text>

            <View style={s.receiptCard}>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Team</Text>
                <Text style={s.receiptVal}>{done.team}</Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Sport</Text>
                <Text style={s.receiptVal}>{done.sport}</Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Squad Size</Text>
                <Text style={s.receiptVal}>{done.players} players</Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Billing Plan</Text>
                <Text style={s.receiptVal}>{done.plan}</Text>
              </View>
              <View style={[s.receiptRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }]}>
                <Text style={s.receiptLabel}>Amount Due</Text>
                <Text style={s.receiptValGold}>₹{done.fee.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={handleClose} activeOpacity={0.85}>
              <LinearGradient colors={['#1E1B4B', '#3730A3', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGradient}>
                <Text style={s.btnText}>Back to Sports Arena</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          // ─── Stepper Form ─────────────────────────────────────
          <View style={{ flex: 1 }}>
            {/* Top Bar */}
            <View style={s.topBar}>
              <TouchableOpacity
                onPress={() => (step > 0 ? setStep(step - 1) : handleClose())}
                style={s.backBtn}
                hitSlop={10}
              >
                <Ionicons name="chevron-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>Team Registration</Text>
                <Text style={s.headerSub}>Summer 2026 Season League</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Stepper Progress */}
            <View style={s.stepperWrap}>
              {labels.map((l, i) => (
                <View key={l} style={{ flex: 1 }}>
                  <View style={s.stepTrack}>
                    <View style={[s.stepFill, { width: i <= step ? '100%' : '0%' }]} />
                  </View>
                  <Text style={[s.stepLabel, i <= step ? s.stepLabelActive : s.stepLabelInactive]}>
                    {i + 1}. {l}
                  </Text>
                </View>
              ))}
            </View>

            {/* Content Body */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollBody}>
              {/* STEP 0: SPORT SELECT */}
              {step === 0 && (
                <View style={s.stepSection}>
                  <Text style={s.sectionPrompt}>Select sport discipline</Text>
                  {SPORT_OPTIONS.map((o) => {
                    const selected = selectedSport.name === o.name;
                    return (
                      <TouchableOpacity
                        key={o.name}
                        onPress={() => setSelectedSport(o)}
                        activeOpacity={0.8}
                        style={[s.sportCard, selected && s.sportCardSelected]}
                      >
                        <View style={[s.sportIconWrap, { backgroundColor: `${o.color}18` }]}>
                          <Text style={{ fontSize: 24 }}>{o.icon}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.sportName}>{o.name}</Text>
                          <Text style={s.sportWhen}>{o.when}</Text>
                          <Text style={[s.sportSpots, { color: o.spots <= 3 ? '#DC2626' : '#059669' }]}>
                            {o.spots} team spots left
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                          <Text style={s.sportFee}>₹{o.fee.toLocaleString('en-IN')}</Text>
                          <View style={[s.checkCircle, selected ? s.checkCircleActive : s.checkCircleInactive]}>
                            {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* STEP 1: TEAM DETAILS */}
              {step === 1 && (
                <View style={s.stepSection}>
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>TEAM NAME *</Text>
                    <TextInput
                      style={s.textInput}
                      value={teamName}
                      onChangeText={setTeamName}
                      placeholder="e.g. Tower B Titans / Smashers"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>CAPTAIN / PRIMARY CONTACT</Text>
                    <TextInput
                      style={s.textInput}
                      value={captain}
                      onChangeText={setCaptain}
                      placeholder="Enter captain name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={s.squadCard}>
                    <View>
                      <Text style={s.squadTitle}>Squad Size</Text>
                      <Text style={s.squadSub}>Minimum 5 · Maximum 15</Text>
                    </View>
                    <View style={s.stepperRow}>
                      <TouchableOpacity
                        onPress={() => setPlayers((n) => Math.max(5, n - 1))}
                        style={s.stepperBtn}
                      >
                        <Ionicons name="remove" size={16} color={COLORS.text} />
                      </TouchableOpacity>
                      <Text style={s.stepperVal}>{players}</Text>
                      <TouchableOpacity
                        onPress={() => setPlayers((n) => Math.min(15, n + 1))}
                        style={[s.stepperBtn, { backgroundColor: COLORS.primary }]}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* STEP 2: PAYMENT PLAN & SUMMARY */}
              {step === 2 && (
                <View style={s.stepSection}>
                  <Text style={s.sectionPrompt}>Choose contribution plan</Text>
                  {PLANS.map((pl) => {
                    const active = plan.key === pl.key;
                    return (
                      <TouchableOpacity
                        key={pl.key}
                        onPress={() => setPlan(pl)}
                        activeOpacity={0.8}
                        style={[s.planCard, active && s.planCardActive]}
                      >
                        <View style={[s.planRadio, active && s.planRadioActive]}>
                          {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.planLabel}>{pl.label}</Text>
                          <Text style={s.planNote}>{pl.note}</Text>
                        </View>
                        <Text style={s.planPrice}>
                          {pl.key === 'Team' ? `₹${fee.toLocaleString('en-IN')}` : `₹${perPlayer}/player`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  <LinearGradient
                    colors={['#1E1B4B', '#3730A3', '#4F46E5']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.summaryCard}
                  >
                    <Text style={s.summaryHeader}>REGISTRATION SUMMARY</Text>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Sport</Text>
                      <Text style={s.summaryVal}>{selectedSport.name}</Text>
                    </View>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Team</Text>
                      <Text style={s.summaryVal}>{teamName || '-'}</Text>
                    </View>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Squad Size</Text>
                      <Text style={s.summaryVal}>{players} athletes</Text>
                    </View>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Registration Fee</Text>
                      <Text style={s.summaryVal}>₹{fee.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={s.summaryDivider} />
                    <View style={s.summaryTotalRow}>
                      <Text style={s.summaryTotalLabel}>Total Due</Text>
                      <Text style={s.summaryTotalVal}>₹{fee.toLocaleString('en-IN')}</Text>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </ScrollView>

            {/* Bottom Sticky Action Bar */}
            <View style={s.bottomBar}>
              <TouchableOpacity
                disabled={!canNext || loading}
                onPress={() => (step < 2 ? setStep(step + 1) : confirmRegistration())}
                style={[s.primaryBtn, (!canNext || loading) && { opacity: 0.45 }]}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#1E1B4B', '#3730A3', '#4F46E5']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.btnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={s.btnText}>
                        {step < 2 ? 'Continue' : `Pay ₹${fee.toLocaleString('en-IN')} & Register`}
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  stepperWrap: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  stepTrack: {
    height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', overflow: 'hidden',
  },
  stepFill: {
    height: '100%', borderRadius: 2, backgroundColor: COLORS.primary,
  },
  stepLabel: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  stepLabelActive: { color: COLORS.primary },
  stepLabelInactive: { color: COLORS.textMuted },

  scrollBody: { paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  stepSection: { gap: 12 },
  sectionPrompt: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Sport card
  sportCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  sportCardSelected: {
    borderColor: COLORS.primary, backgroundColor: '#EEF2FF',
  },
  sportIconWrap: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  sportName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  sportWhen: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  sportSpots: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  sportFee: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  checkCircle: {
    width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: COLORS.primary,
  },
  checkCircleInactive: {
    borderWidth: 1.5, borderColor: '#CBD5E1',
  },

  // Step 1
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  textInput: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 14, fontWeight: '600', ...SHADOWS.sm,
  },
  squadCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 4, ...SHADOWS.sm,
  },
  squadTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  squadSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperVal: { fontSize: 16, fontWeight: '900', color: COLORS.text, width: 24, textAlign: 'center' },

  // Step 2
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  planCardActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  planRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  planRadioActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  planLabel: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  planNote: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  planPrice: { fontSize: 12, fontWeight: '800', color: COLORS.primary },

  summaryCard: {
    borderRadius: RADIUS.lg, padding: 16, gap: 8, marginTop: 4, ...SHADOWS.sm,
  },
  summaryHeader: { fontSize: 10, fontWeight: '800', color: '#FCD34D', letterSpacing: 0.8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#C7D2FE' },
  summaryVal: { fontSize: 12, fontWeight: '700', color: '#fff' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 4 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  summaryTotalLabel: { fontSize: 12, color: '#C7D2FE', fontWeight: '600' },
  summaryTotalVal: { fontSize: 22, fontWeight: '900', color: '#FBBF24' },

  // Bottom action
  bottomBar: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14,
  },
  btnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Done View
  doneContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12,
  },
  successGlow: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, ...SHADOWS.md,
  },
  doneTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  doneSub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  receiptCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 8, marginVertical: 12,
    ...SHADOWS.sm,
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptLabel: { fontSize: 11, color: COLORS.textMuted },
  receiptVal: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  receiptValGold: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
});
