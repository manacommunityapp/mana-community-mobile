import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsService } from '@/services/sportsService';
import api from '@/services/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import { usePayment } from '@/hooks/usePayment';
import { PaymentModal } from '@/components/payment/PaymentModal';
import {
  checkCategoryEligibility,
  calculateAge,
  normalizeGender,
} from '@/utils/sportsEligibility';
import type {
  DashboardTournamentCardDto,
  DashboardEventCardDto,
  UserProfileResponse,
} from '@/types/api';

export interface RegistrationRecord {
  id: number | string;
  sport: string;
  team: string;
  categoryName?: string;
  format?: 'SINGLES' | 'DOUBLES' | 'TEAM';
  players: number;
  plan?: string;
  fee: number;
  status: 'Pending' | 'Confirmed';
  tournamentName?: string;
  venueName?: string;
}

interface SportsRegisterModalProps {
  visible: boolean;
  onClose: () => void;
  onRegistered?: (reg: RegistrationRecord) => void;
}

interface EventItem {
  tournamentId: number;
  tournamentName: string;
  event: DashboardEventCardDto;
  format: 'SINGLES' | 'DOUBLES' | 'TEAM';
  fee: number;
  emoji: string;
}

const SPORT_EMOJI_MAP: Record<string, string> = {
  CRICKET: '🏏',
  BADMINTON: '🏸',
  FOOTBALL: '⚽',
  TENNIS: '🎾',
  TABLE_TENNIS: '🏓',
  PICKLEBALL: '🏓',
  BASKETBALL: '🏀',
  VOLLEYBALL: '🏐',
  SWIMMING: '🏊',
  CHESS: '♟️',
};

const LOGO_EMOJIS = ['⚽', '🏏', '🏸', '🏓', '🏀', '🏐', '🏆', '🔥', '⚡', '🦅', '🦁', '💪'];

const PLANS = [
  { key: 'Team', label: 'Full team', note: 'Pay once for the entire squad' },
  { key: 'Split', label: 'Split per player', note: 'Each squad player contributes equally' },
];

// No static fallback events: real categories load from the backend open tournaments list
const FALLBACK_EVENTS: EventItem[] = [];

export function SportsRegisterModal({ visible, onClose, onRegistered }: SportsRegisterModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [selectedSportFilter, setSelectedSportFilter] = useState('ALL');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Form State
  const [isForFamily, setIsForFamily] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [participantFlat, setParticipantFlat] = useState('');
  const [participantAge, setParticipantAge] = useState('');
  const [participantGender, setParticipantGender] = useState('MALE');

  // Doubles partner state
  const [partnerSearch, setPartnerSearch] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<UserProfileResponse | null>(null);

  // Team state
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [logoEmoji, setLogoEmoji] = useState('⚽');
  const [squadSize, setSquadSize] = useState(8);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedRoster, setSelectedRoster] = useState<UserProfileResponse[]>([]);

  // Payment Plan
  const [plan, setPlan] = useState(PLANS[0]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<RegistrationRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<RegistrationRecord | null>(null);

  const payment = usePayment();

  // Fetch real tournaments and categories
  const { data: openTournaments = [], isLoading: loadingTournaments } = useQuery({
    queryKey: ['tournaments-open-dash'],
    queryFn: sportsService.getOpenTournaments,
    staleTime: 30_000,
  });

  // Transform open tournaments into flattened selectable event items
  const availableEvents: EventItem[] = useMemo(() => {
    if (!openTournaments || openTournaments.length === 0) {
      return FALLBACK_EVENTS;
    }

    const items: EventItem[] = [];
    openTournaments.forEach((t: DashboardTournamentCardDto) => {
      (t.events || []).forEach((ev: DashboardEventCardDto) => {
        const sportUpper = (ev.sportName || '').toUpperCase().replace(/\s+/g, '_');
        const catUpper = (ev.categoryName || ev.name || '').toUpperCase();
        const isDoubles = catUpper.includes('DOUBLES') || ev.maxParticipants === 2;
        const format: 'SINGLES' | 'DOUBLES' | 'TEAM' = isDoubles
          ? 'DOUBLES'
          : ev.teamSport
          ? 'TEAM'
          : 'SINGLES';

        items.push({
          tournamentId: t.id,
          tournamentName: t.name,
          event: ev,
          format,
          fee: (ev as any).entryFee != null ? Number((ev as any).entryFee) : (format === 'TEAM' ? 2000 : format === 'DOUBLES' ? 800 : 400),
          emoji: SPORT_EMOJI_MAP[sportUpper] || '🏅',
        });
      });
    });

    return items;
  }, [openTournaments]);

  // Filtered by sport pill
  const filteredEvents = useMemo(() => {
    if (selectedSportFilter === 'ALL') return availableEvents;
    return availableEvents.filter(
      (item) => (item.event.sportName || '').toUpperCase() === selectedSportFilter
    );
  }, [availableEvents, selectedSportFilter]);

  // Selected event object
  const currentEvent = useMemo(() => {
    if (availableEvents.length === 0) return null;
    if (!selectedEventId) return filteredEvents[0] || availableEvents[0] || null;
    return availableEvents.find((e) => e.event.id === selectedEventId) || availableEvents[0] || null;
  }, [availableEvents, filteredEvents, selectedEventId]);

  // Available sports for filters
  const sportFilters = useMemo(() => {
    const set = new Set<string>();
    availableEvents.forEach((e) => {
      if (e.event.sportName) set.add(e.event.sportName.toUpperCase());
    });
    return ['ALL', ...Array.from(set)];
  }, [availableEvents]);

  // Pre-fill user data when modal opens
  useEffect(() => {
    if (user) {
      setParticipantName(user.fullName || user.name || '');
      setParticipantFlat(user.flatNo || user.flatNumber || '');
      setCaptainName(user.fullName || user.name || '');
      if (user.dateOfBirth) {
        const calculated = calculateAge(user.dateOfBirth);
        if (calculated != null) setParticipantAge(String(calculated));
      } else {
        setParticipantAge('');
      }
      if (user.gender) {
        setParticipantGender(normalizeGender(user.gender));
      }
    }
  }, [user, visible]);

  // User search queries for partner
  const { data: partnerResults = [] } = useQuery({
    queryKey: ['partner-search', partnerSearch],
    queryFn: async () => {
      if (!partnerSearch.trim() || partnerSearch.trim().length < 2) return [];
      const res = await api.get<UserProfileResponse[]>('/users/search', {
        params: { q: partnerSearch.trim(), size: 6 },
      });
      return res.data;
    },
    enabled: partnerSearch.trim().length >= 2,
  });

  // User search queries for team members
  const { data: memberResults = [] } = useQuery({
    queryKey: ['member-search', memberSearch],
    queryFn: async () => {
      if (!memberSearch.trim() || memberSearch.trim().length < 2) return [];
      const res = await api.get<UserProfileResponse[]>('/users/search', {
        params: { q: memberSearch.trim(), size: 8 },
      });
      return res.data;
    },
    enabled: memberSearch.trim().length >= 2,
  });

  // Eligibility check
  const eligibility = useMemo(() => {
    if (!currentEvent) return { eligible: true, warningMsg: '' };
    return checkCategoryEligibility(
      {
        name: currentEvent.event.name,
        categoryName: currentEvent.event.categoryName,
        minAge: null,
        maxAge: null,
      },
      Number(participantAge) || null,
      participantGender
    );
  }, [currentEvent, participantAge, participantGender]);

  const fee = currentEvent?.fee ?? 500;
  const perPlayer = Math.ceil(fee / (currentEvent?.format === 'TEAM' ? squadSize : 2));

  // Validation per step
  const canProceed = useMemo(() => {
    if (step === 0) return Boolean(currentEvent);
    if (step === 1) {
      if (!participantName.trim()) return false;
      if (!eligibility.eligible) return false;
      if (currentEvent?.format === 'TEAM') {
        return teamName.trim().length >= 2;
      }
      if (currentEvent?.format === 'DOUBLES') {
        return Boolean(selectedPartner);
      }
      return true;
    }
    return true;
  }, [step, currentEvent, participantName, eligibility, teamName, selectedPartner]);

  const labels = ['Category', currentEvent?.format === 'TEAM' ? 'Squad' : 'Details', 'Confirm'];

  const resetForm = () => {
    setStep(0);
    setDone(null);
    setSelectedPartner(null);
    setSelectedRoster([]);
    setTeamName('');
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Builds the registration record and submits to the backend (after payment if required).
  const submitRegistration = useCallback(async (record: RegistrationRecord) => {
    if (!currentEvent) return;
    try {
      if (currentEvent.format === 'TEAM') {
        const memberIds = selectedRoster.map((m) => m.id);
        if (user?.id && !memberIds.includes(user.id)) memberIds.unshift(user.id);
        await sportsService.registerTeam({
          teamName: teamName.trim(),
          tournamentId: currentEvent.tournamentId,
          memberUserIds: memberIds,
          logoEmoji,
        }).catch(() => null);
      } else {
        await sportsService.registerForEvent(currentEvent.event.id, {
          eventId: currentEvent.event.id,
          playerName: participantName.trim(),
          flatNumber: participantFlat.trim(),
          age: Number(participantAge) || undefined,
          gender: participantGender,
          partnerUserId: selectedPartner?.id,
        }).catch(() => null);
      }
      queryClient.invalidateQueries({ queryKey: ['tournaments-open-dash'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments-hub'] });
      queryClient.invalidateQueries({ queryKey: ['sports-my-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['my-teams'] });
    } catch {
      // Continue to confirmation view for graceful UI feedback
    } finally {
      setLoading(false);
      setDone(record);
      onRegistered?.(record);
    }
  }, [currentEvent, selectedRoster, user, teamName, logoEmoji, participantName,
      participantFlat, participantAge, participantGender, selectedPartner,
      queryClient, onRegistered]);

  const confirmRegistration = async () => {
    if (!currentEvent) return;
    setLoading(true);

    const displayName =
      currentEvent.format === 'TEAM'
        ? teamName.trim()
        : currentEvent.format === 'DOUBLES'
        ? `${participantName} & ${selectedPartner?.fullName || selectedPartner?.name || 'Partner'}`
        : participantName.trim();

    const record: RegistrationRecord = {
      id: Date.now(),
      sport: currentEvent.event.sportName || 'Sports',
      team: displayName,
      categoryName: currentEvent.event.categoryName || currentEvent.event.name,
      format: currentEvent.format,
      players: currentEvent.format === 'TEAM' ? squadSize : currentEvent.format === 'DOUBLES' ? 2 : 1,
      plan: currentEvent.format === 'TEAM' ? plan.label : 'Individual Entry',
      fee,
      status: 'Confirmed',
      tournamentName: currentEvent.tournamentName,
      venueName: currentEvent.event.venueName || 'Society Arena',
    };

    // If there is a non-zero fee, gate on Cashfree payment first.
    if (fee > 0) {
      setPendingRecord(record);
      const order = await payment.startPayment({
        amount: fee,
        referenceType: 'SPORTS_REGISTRATION',
        referenceId: currentEvent.event.id,
        description: `${currentEvent.tournamentName} — ${currentEvent.event.categoryName || currentEvent.event.name}`,
      });
      setLoading(false);
      if (order) {
        setShowPaymentModal(true);
      }
      return;
    }

    // Free event — submit registration directly.
    await submitRegistration(record);
  };

  // Called by PaymentModal after the SDK's onVerify fires.
  const handlePaymentVerify = useCallback(async (manaOrderId: string) => {
    await (payment.startPayment as any)._handleVerify?.(manaOrderId);
  }, [payment]);

  // After payment resolves (success or fail), proceed or show error.
  useEffect(() => {
    if (payment.status === 'success' && pendingRecord) {
      setShowPaymentModal(false);
      pendingRecord.status = 'Confirmed';
      submitRegistration(pendingRecord).then(() => setPendingRecord(null));
    } else if (payment.status === 'failed' && pendingRecord) {
      // Keep modal open to show failure screen; user dismisses via PaymentModal.
    }
  }, [payment.status]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        {done ? (
          // ─── Step: Success Confirmation Screen ─────────────────
          <View style={s.doneContainer}>
            <LinearGradient colors={['#10B981', '#059669']} style={s.successGlow}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </LinearGradient>
            <Text style={s.doneTitle}>You're in the draw!</Text>
            <Text style={s.doneSub}>
              {done.team} has been confirmed for {done.categoryName}. Check your schedule in Sports Hub.
            </Text>

            <View style={s.receiptCard}>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Tournament</Text>
                <Text style={s.receiptVal} numberOfLines={1}>{done.tournamentName}</Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Discipline</Text>
                <Text style={s.receiptVal}>{done.sport} · {done.categoryName}</Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Participant(s)</Text>
                <Text style={s.receiptVal} numberOfLines={1}>{done.team}</Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Format</Text>
                <Text style={s.receiptVal}>{done.format} ({done.players} athlete{done.players > 1 ? 's' : ''})</Text>
              </View>
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Venue</Text>
                <Text style={s.receiptVal} numberOfLines={1}>{done.venueName}</Text>
              </View>
              <View style={[s.receiptRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8 }]}>
                <Text style={s.receiptLabel}>Registration Fee</Text>
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
          // ─── 3-Step Wizard ─────────────────────────────────────
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
                <Text style={s.headerTitle}>Tournament Registration</Text>
                <Text style={s.headerSub}>{currentEvent?.tournamentName || 'Summer 2026 Season'}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={s.closeBtn} hitSlop={10}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Stepper Progress Indicator */}
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

            {/* Scrollable Form Body */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollBody} keyboardShouldPersistTaps="handled">
              {/* ── STEP 0: SELECT CATEGORY & EVENT ── */}
              {step === 0 && (
                <View style={s.stepSection}>
                  <Text style={s.sectionPrompt}>Select tournament category</Text>

                  {/* Sport Filter Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScroll}>
                    {sportFilters.map((sp) => {
                      const active = selectedSportFilter === sp;
                      const emoji = SPORT_EMOJI_MAP[sp] || '🏅';
                      return (
                        <TouchableOpacity
                          key={sp}
                          onPress={() => setSelectedSportFilter(sp)}
                          style={[s.pillChip, active && s.pillChipActive]}
                        >
                          <Text style={s.pillEmoji}>{sp === 'ALL' ? '⚡' : emoji}</Text>
                          <Text style={[s.pillLabel, active && s.pillLabelActive]}>{sp}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Category Cards List */}
                  {loadingTournaments ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                  ) : filteredEvents.length === 0 ? (
                    <View style={s.emptyBox}>
                      <Text style={{ fontSize: 28 }}>🏆</Text>
                      <Text style={s.emptyTitle}>No open categories found</Text>
                      <Text style={s.emptySub}>Try selecting a different sport above.</Text>
                    </View>
                  ) : (
                    filteredEvents.map((item) => {
                      const isSelected = (currentEvent?.event.id === item.event.id);
                      const max = item.event.maxParticipants ?? 16;
                      const regCount = item.event.registeredCount ?? 0;
                      const spotsLeft = Math.max(max - regCount, 0);
                      const isFull = spotsLeft === 0;

                      return (
                        <TouchableOpacity
                          key={item.event.id}
                          onPress={() => setSelectedEventId(item.event.id)}
                          disabled={isFull}
                          activeOpacity={0.8}
                          style={[s.eventCard, isSelected && s.eventCardSelected, isFull && { opacity: 0.5 }]}
                        >
                          <View style={s.eventCardTop}>
                            <View style={s.eventBadge}>
                              <Text style={{ fontSize: 13 }}>{item.emoji}</Text>
                              <Text style={s.eventBadgeText}>{item.event.sportName}</Text>
                            </View>
                            <View style={[s.formatPill, item.format === 'TEAM' ? s.formatTeam : item.format === 'DOUBLES' ? s.formatDoubles : s.formatSingles]}>
                              <Text style={s.formatText}>{item.format}</Text>
                            </View>
                          </View>

                          <Text style={s.eventName}>{item.event.categoryName || item.event.name}</Text>

                          <View style={s.eventMetaRow}>
                            <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                            <Text style={s.eventMetaText} numberOfLines={1}>{item.event.venueName || 'Main Arena'}</Text>
                            <Text style={s.eventMetaDot}>·</Text>
                            <Ionicons name="people-outline" size={11} color={COLORS.textMuted} />
                            <Text style={[s.eventMetaText, { color: spotsLeft <= 3 ? '#DC2626' : '#059669', fontWeight: '700' }]}>
                              {isFull ? 'Full' : `${spotsLeft} spots left`}
                            </Text>
                          </View>

                          <View style={s.eventDivider} />

                          <View style={s.eventCardBottom}>
                            <Text style={s.eventTournamentName} numberOfLines={1}>{item.tournamentName}</Text>
                            <Text style={s.eventFee}>₹{item.fee.toLocaleString('en-IN')}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {/* ── STEP 1: PARTICIPANT & ROSTER DETAILS ── */}
              {step === 1 && currentEvent && (
                <View style={s.stepSection}>
                  {/* Category Summary Header */}
                  <View style={s.selectedHeaderCard}>
                    <Text style={{ fontSize: 24 }}>{currentEvent.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.selectedEventTitle}>{currentEvent.event.categoryName || currentEvent.event.name}</Text>
                      <Text style={s.selectedEventSub}>{currentEvent.tournamentName} · {currentEvent.format}</Text>
                    </View>
                    <View style={s.formatPill}>
                      <Text style={s.formatText}>{currentEvent.format}</Text>
                    </View>
                  </View>

                  {/* Registrant Selector (Myself vs Family Member) */}
                  <View style={s.registrantToggle}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsForFamily(false);
                        setParticipantName(user?.fullName || user?.name || '');
                        setParticipantFlat(user?.flatNo || user?.flatNumber || '');
                      }}
                      style={[s.toggleBtn, !isForFamily && s.toggleBtnActive]}
                    >
                      <Text style={[s.toggleBtnText, !isForFamily && s.toggleBtnTextActive]}>Register Myself</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setIsForFamily(true);
                        setParticipantName('');
                      }}
                      style={[s.toggleBtn, isForFamily && s.toggleBtnActive]}
                    >
                      <Text style={[s.toggleBtnText, isForFamily && s.toggleBtnTextActive]}>Family Member</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Primary Participant Inputs */}
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>
                      {currentEvent.format === 'TEAM' ? 'CAPTAIN / ATHLETE NAME *' : 'PARTICIPANT NAME *'}
                    </Text>
                    <TextInput
                      style={s.textInput}
                      value={participantName}
                      onChangeText={setParticipantName}
                      placeholder="Enter full name"
                      placeholderTextColor={COLORS.textMuted}
                    />
                  </View>

                  <View style={s.rowTwoCol}>
                    <View style={[s.inputGroup, { flex: 1 }]}>
                      <Text style={s.inputLabel}>FLAT NUMBER *</Text>
                      <TextInput
                        style={s.textInput}
                        value={participantFlat}
                        onChangeText={setParticipantFlat}
                        placeholder="e.g. Tower B-402"
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                    <View style={[s.inputGroup, { width: 90 }]}>
                      <Text style={s.inputLabel}>AGE *</Text>
                      <TextInput
                        style={s.textInput}
                        value={participantAge}
                        onChangeText={setParticipantAge}
                        keyboardType="numeric"
                        placeholder="Age"
                        placeholderTextColor={COLORS.textMuted}
                        maxLength={2}
                      />
                    </View>
                  </View>

                  {/* Gender Selector */}
                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>GENDER</Text>
                    <View style={s.genderRow}>
                      {['MALE', 'FEMALE'].map((g) => (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setParticipantGender(g)}
                          style={[s.genderBtn, participantGender === g && s.genderBtnActive]}
                        >
                          <Ionicons
                            name={g === 'MALE' ? 'male' : 'female'}
                            size={14}
                            color={participantGender === g ? '#fff' : COLORS.textMuted}
                          />
                          <Text style={[s.genderBtnText, participantGender === g && s.genderBtnTextActive]}>
                            {g === 'MALE' ? 'Male' : 'Female'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Live Eligibility Check Notice */}
                  {!eligibility.eligible ? (
                    <View style={s.eligibilityAlert}>
                      <Ionicons name="alert-circle" size={16} color="#DC2626" />
                      <Text style={s.eligibilityAlertText}>
                        {eligibility.warningMsg || 'Participant details do not match category eligibility.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={s.eligibilitySuccess}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={s.eligibilitySuccessText}>Participant meets category criteria.</Text>
                    </View>
                  )}

                  {/* ── DOUBLES: Select Co-Resident Partner ── */}
                  {currentEvent.format === 'DOUBLES' && (
                    <View style={s.sectionBlock}>
                      <Text style={s.sectionBlockTitle}>DOUBLES PARTNER (PLAYER 2)</Text>
                      {selectedPartner ? (
                        <View style={s.partnerChip}>
                          <View style={s.partnerAvatar}>
                            <Text style={s.partnerAvatarText}>{selectedPartner.name?.[0]?.toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.partnerName}>{selectedPartner.fullName || selectedPartner.name}</Text>
                            <Text style={s.partnerFlat}>Flat {selectedPartner.flatNo || selectedPartner.flatNumber || 'Neighbor'}</Text>
                          </View>
                          <TouchableOpacity onPress={() => setSelectedPartner(null)} hitSlop={8}>
                            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ gap: 8 }}>
                          <View style={s.searchWrap}>
                            <Ionicons name="search" size={15} color={COLORS.textMuted} />
                            <TextInput
                              style={s.searchInput}
                              value={partnerSearch}
                              onChangeText={setPartnerSearch}
                              placeholder="Search neighbor by name or flat..."
                              placeholderTextColor={COLORS.textMuted}
                            />
                          </View>
                          {partnerResults.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              style={s.searchResultRow}
                              onPress={() => {
                                setSelectedPartner(p);
                                setPartnerSearch('');
                              }}
                            >
                              <View style={s.partnerAvatar}>
                                <Text style={s.partnerAvatarText}>{p.name?.[0]?.toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.partnerName}>{p.fullName || p.name}</Text>
                                <Text style={s.partnerFlat}>Flat {p.flatNo || p.flatNumber || 'Community'}</Text>
                              </View>
                              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* ── TEAM: Team Name, Logo & Squad Roster ── */}
                  {currentEvent.format === 'TEAM' && (
                    <View style={s.sectionBlock}>
                      <Text style={s.sectionBlockTitle}>SQUAD & TEAM FORMATION</Text>

                      <View style={s.inputGroup}>
                        <Text style={s.inputLabel}>TEAM NAME *</Text>
                        <TextInput
                          style={s.textInput}
                          value={teamName}
                          onChangeText={setTeamName}
                          placeholder="e.g. Tower A Titans / Smashers"
                          placeholderTextColor={COLORS.textMuted}
                        />
                      </View>

                      {/* Team Logo Emoji */}
                      <View style={s.inputGroup}>
                        <Text style={s.inputLabel}>TEAM BADGE EMOJI</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {LOGO_EMOJIS.map((e) => (
                            <TouchableOpacity
                              key={e}
                              onPress={() => setLogoEmoji(e)}
                              style={[s.emojiBtn, logoEmoji === e && s.emojiBtnActive]}
                            >
                              <Text style={{ fontSize: 20 }}>{e}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      {/* Squad Size Stepper */}
                      <View style={s.squadCard}>
                        <View>
                          <Text style={s.squadTitle}>Squad Target</Text>
                          <Text style={s.squadSub}>Minimum 5 · Maximum 15</Text>
                        </View>
                        <View style={s.stepperRow}>
                          <TouchableOpacity
                            onPress={() => setSquadSize((n) => Math.max(5, n - 1))}
                            style={s.stepperBtn}
                          >
                            <Ionicons name="remove" size={16} color={COLORS.text} />
                          </TouchableOpacity>
                          <Text style={s.stepperVal}>{squadSize}</Text>
                          <TouchableOpacity
                            onPress={() => setSquadSize((n) => Math.min(15, n + 1))}
                            style={[s.stepperBtn, { backgroundColor: COLORS.primary }]}
                          >
                            <Ionicons name="add" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Add Co-Resident Squad Members */}
                      <View style={s.inputGroup}>
                        <View style={s.rowBetween}>
                          <Text style={s.inputLabel}>ADD PLAYERS</Text>
                          <Text style={s.rosterCounter}>
                            {selectedRoster.length + 1} of {squadSize} players
                          </Text>
                        </View>

                        {/* Selected Roster Chips */}
                        <View style={s.rosterChipsWrap}>
                          {/* Captain */}
                          <View style={s.captainChip}>
                            <Text style={s.captainChipText}>⭐ {participantName || 'Captain'}</Text>
                          </View>
                          {selectedRoster.map((m) => (
                            <View key={m.id} style={s.rosterChip}>
                              <Text style={s.rosterChipText}>{m.fullName || m.name}</Text>
                              <TouchableOpacity
                                onPress={() => setSelectedRoster((prev) => prev.filter((x) => x.id !== m.id))}
                              >
                                <Ionicons name="close" size={12} color="#475569" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>

                        {/* Search Bar for Members */}
                        <View style={s.searchWrap}>
                          <Ionicons name="search" size={15} color={COLORS.textMuted} />
                          <TextInput
                            style={s.searchInput}
                            value={memberSearch}
                            onChangeText={setMemberSearch}
                            placeholder="Add neighbor by name or flat..."
                            placeholderTextColor={COLORS.textMuted}
                          />
                        </View>
                        {memberResults.map((m) => {
                          const isAlreadyAdded = selectedRoster.some((r) => r.id === m.id);
                          return (
                            <TouchableOpacity
                              key={m.id}
                              style={s.searchResultRow}
                              onPress={() => {
                                if (!isAlreadyAdded) setSelectedRoster((prev) => [...prev, m]);
                                setMemberSearch('');
                              }}
                            >
                              <View style={s.partnerAvatar}>
                                <Text style={s.partnerAvatarText}>{m.name?.[0]?.toUpperCase()}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.partnerName}>{m.fullName || m.name}</Text>
                                <Text style={s.partnerFlat}>Flat {m.flatNo || m.flatNumber || 'Resident'}</Text>
                              </View>
                              <Ionicons
                                name={isAlreadyAdded ? 'checkmark-circle' : 'add-circle'}
                                size={20}
                                color={isAlreadyAdded ? '#059669' : COLORS.primary}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ── STEP 2: SUMMARY & FEE BREAKDOWN ── */}
              {step === 2 && currentEvent && (
                <View style={s.stepSection}>
                  <Text style={s.sectionPrompt}>Review & Payment Confirmation</Text>

                  {/* Team split plan choice */}
                  {currentEvent.format === 'TEAM' && (
                    <View style={{ gap: 8 }}>
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
                    </View>
                  )}

                  {/* Itemized Registration Summary Card */}
                  <LinearGradient
                    colors={['#1E1B4B', '#3730A3', '#4F46E5']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={s.summaryCard}
                  >
                    <Text style={s.summaryHeader}>REGISTRATION BREAKDOWN</Text>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Tournament</Text>
                      <Text style={s.summaryVal} numberOfLines={1}>{currentEvent.tournamentName}</Text>
                    </View>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Category</Text>
                      <Text style={s.summaryVal}>{currentEvent.event.categoryName || currentEvent.event.name}</Text>
                    </View>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Format</Text>
                      <Text style={s.summaryVal}>{currentEvent.format}</Text>
                    </View>
                    <View style={s.summaryRow}>
                      <Text style={s.summaryLabel}>Registrant</Text>
                      <Text style={s.summaryVal}>{participantName} (Flat {participantFlat})</Text>
                    </View>
                    {currentEvent.format === 'DOUBLES' && selectedPartner && (
                      <View style={s.summaryRow}>
                        <Text style={s.summaryLabel}>Partner</Text>
                        <Text style={s.summaryVal}>{selectedPartner.fullName || selectedPartner.name}</Text>
                      </View>
                    )}
                    {currentEvent.format === 'TEAM' && (
                      <View style={s.summaryRow}>
                        <Text style={s.summaryLabel}>Team Name</Text>
                        <Text style={s.summaryVal}>{logoEmoji} {teamName}</Text>
                      </View>
                    )}
                    <View style={s.summaryDivider} />
                    <View style={s.summaryTotalRow}>
                      <Text style={s.summaryTotalLabel}>Total Entry Due</Text>
                      <Text style={s.summaryTotalVal}>₹{fee.toLocaleString('en-IN')}</Text>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </ScrollView>

            {/* Bottom Action Button Bar */}
            <View style={s.bottomBar}>
              <TouchableOpacity
                disabled={!canProceed || loading}
                onPress={() => (step < 2 ? setStep(step + 1) : confirmRegistration())}
                style={[s.primaryBtn, (!canProceed || loading) && { opacity: 0.45 }]}
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
                        {step < 2 ? 'Continue' : `Confirm & Pay ₹${fee.toLocaleString('en-IN')}`}
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

    {/* Cashfree payment sheet — rendered outside the registration modal */}
    <PaymentModal
      visible={showPaymentModal}
      order={payment.order}
      status={payment.status}
      error={payment.error}
      onVerify={handlePaymentVerify}
      onDismiss={() => {
        setShowPaymentModal(false);
        payment.reset();
        setPendingRecord(null);
      }}
    />
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff',
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
  stepTrack: { height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', overflow: 'hidden' },
  stepFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.primary },
  stepLabel: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  stepLabelActive: { color: COLORS.primary },
  stepLabelInactive: { color: COLORS.textMuted },

  scrollBody: { paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  stepSection: { gap: 12 },
  sectionPrompt: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Filter pills
  pillScroll: { gap: 6, paddingVertical: 2 },
  pillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  pillChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  pillEmoji: { fontSize: 12 },
  pillLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  pillLabelActive: { color: '#fff', fontWeight: '700' },

  // Event Cards
  eventCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 8, ...SHADOWS.sm,
  },
  eventCardSelected: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  eventCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2.5,
  },
  eventBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  formatPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2.5 },
  formatSingles: { backgroundColor: '#F0FDF4' },
  formatDoubles: { backgroundColor: '#FDF4FF' },
  formatTeam: { backgroundColor: '#EFF6FF' },
  formatText: { fontSize: 9.5, fontWeight: '800', color: COLORS.text },
  eventName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventMetaText: { fontSize: 10, color: COLORS.textMuted },
  eventMetaDot: { color: COLORS.textMuted, fontSize: 10 },
  eventDivider: { height: 1, backgroundColor: '#F1F5F9' },
  eventCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTournamentName: { fontSize: 10.5, color: COLORS.textMuted, flex: 1, marginRight: 8 },
  eventFee: { fontSize: 14, fontWeight: '800', color: COLORS.primary },

  // Selected Header
  selectedHeaderCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md, padding: 12,
  },
  selectedEventTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  selectedEventSub: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Toggle
  registrantToggle: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: RADIUS.md, padding: 3,
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  toggleBtnActive: { backgroundColor: '#fff', ...SHADOWS.sm },
  toggleBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  toggleBtnTextActive: { color: COLORS.primary, fontWeight: '800' },

  // Inputs
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  textInput: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 13, fontWeight: '600',
  },
  rowTwoCol: { flexDirection: 'row', gap: 10 },
  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 9, borderWidth: 1, borderColor: '#E2E8F0',
  },
  genderBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryDark },
  genderBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  genderBtnTextActive: { color: '#fff' },

  // Eligibility Notice
  eligibilityAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#FECACA',
  },
  eligibilityAlertText: { fontSize: 11, fontWeight: '600', color: '#DC2626', flex: 1 },
  eligibilitySuccess: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#A7F3D0',
  },
  eligibilitySuccessText: { fontSize: 11, fontWeight: '600', color: '#065F46' },

  // Section Block
  sectionBlock: {
    gap: 10, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  sectionBlockTitle: { fontSize: 10.5, fontWeight: '800', color: COLORS.primary, letterSpacing: 0.5 },

  // Partner Chip
  partnerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  partnerAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  partnerAvatarText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  partnerName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  partnerFlat: { fontSize: 10, color: COLORS.textMuted },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 10, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: COLORS.text },
  searchResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 10, padding: 9, borderWidth: 1, borderColor: '#F1F5F9',
  },

  // Team
  emojiBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  emojiBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  squadCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  squadTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  squadSub: { fontSize: 10, color: COLORS.textMuted },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperVal: { fontSize: 15, fontWeight: '900', color: COLORS.text, width: 22, textAlign: 'center' },
  rosterCounter: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  rosterChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  captainChip: {
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#C7D2FE',
  },
  captainChipText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  rosterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4,
  },
  rosterChipText: { fontSize: 10, fontWeight: '700', color: COLORS.text },

  // Step 2
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  planCardActive: { borderColor: COLORS.primary, backgroundColor: '#EEF2FF' },
  planRadio: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  planRadioActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  planLabel: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  planNote: { fontSize: 9.5, color: COLORS.textMuted },
  planPrice: { fontSize: 11.5, fontWeight: '800', color: COLORS.primary },

  summaryCard: { borderRadius: RADIUS.lg, padding: 16, gap: 8, ...SHADOWS.sm },
  summaryHeader: { fontSize: 9.5, fontWeight: '800', color: '#FCD34D', letterSpacing: 0.8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: '#C7D2FE' },
  summaryVal: { fontSize: 11.5, fontWeight: '700', color: '#fff', flexShrink: 1, textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 3 },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  summaryTotalLabel: { fontSize: 11.5, color: '#C7D2FE', fontWeight: '600' },
  summaryTotalVal: { fontSize: 20, fontWeight: '900', color: '#FBBF24' },

  // Bottom action
  bottomBar: {
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#fff',
  },
  primaryBtn: { borderRadius: 14, overflow: 'hidden' },
  btnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13,
  },
  btnText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  // Done View
  doneContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12,
  },
  successGlow: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, ...SHADOWS.md,
  },
  doneTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  doneSub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18, maxWidth: 320 },
  receiptCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 8, marginVertical: 12, ...SHADOWS.sm,
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptLabel: { fontSize: 11, color: COLORS.textMuted },
  receiptVal: { fontSize: 11.5, fontWeight: '700', color: COLORS.text, flexShrink: 1, textAlign: 'right' },
  receiptValGold: { fontSize: 16, fontWeight: '900', color: COLORS.primary },

  emptyBox: { alignItems: 'center', paddingVertical: 30, gap: 4 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 11, color: COLORS.textMuted },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
