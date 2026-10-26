import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, GRADIENTS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import { format, parseISO } from 'date-fns';

const { width: SCREEN_W } = Dimensions.get('window');

const TICKET_TYPES = [
  {
    id: 'GENERAL',
    label: 'General Admission',
    emoji: '🎟️',
    desc: 'Standard event access',
    color: '#4F46E5',
    bg: '#EEF2FF',
  },
  {
    id: 'FAMILY',
    label: 'Family Pass',
    emoji: '👨‍👩‍👧‍👦',
    desc: 'Up to 4 family members',
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    id: 'VIP',
    label: 'VIP / Premium',
    emoji: '⭐',
    desc: 'Front seating + special access',
    color: '#D97706',
    bg: '#FEF3C7',
  },
];

const STEPS = ['Ticket', 'Details', 'Confirm', 'Done'] as const;

type Step = 0 | 1 | 2 | 3;

export default function EventRegisterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>(0);
  const [ticketType, setTicketType] = useState<string>('GENERAL');
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState((user as any)?.fullName || (user as any)?.name || '');
  const [email, setEmail] = useState((user as any)?.email || '');
  const [phone, setPhone] = useState((user as any)?.phone || '');
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventService.getById(Number(id)),
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: () => eventService.register(Number(id), {
      ticketType,
      quantity,
      name,
      email,
      phone,
      notes: notes.trim() || undefined,
      agreed,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event', id] });
      qc.invalidateQueries({ queryKey: ['events'] });
      setStep(3);
    },
    onError: () => {
      Alert.alert('Registration Failed', 'Please try again.');
    },
  });

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try { return format(parseISO(dateStr), 'EEE, MMM d, yyyy'); }
    catch { return dateStr; }
  }, []);

  const formatTime = useCallback((timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
    } catch { return timeStr; }
  }, []);

  const selectedTicket = TICKET_TYPES.find(t => t.id === ticketType) ?? TICKET_TYPES[0];
  const isPaid = event?.priceType === 'PAID' && event.price;
  const totalAmount = isPaid ? (event.price! * quantity) : 0;
  const uid = (user as any)?.id || 0;
  const passCode = `EVT-${id}-${uid}-${((Number(id) * 73 + uid * 11) % 9999).toString().padStart(4, '0')}`;

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={s.loadingText}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.loadingWrap}>
          <Text style={{ fontSize: 40 }}>😕</Text>
          <Text style={s.loadingText}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 0: Ticket Selection ────────────────────────────────
  const renderStep0 = () => (
    <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#312E81', '#4F46E5', '#6366F1']}
        style={s.eventMiniCard}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Text style={s.miniEventTitle} numberOfLines={2}>{event.title}</Text>
        <View style={s.miniEventMeta}>
          <View style={s.miniMetaRow}>
            <Text style={s.miniMetaEmoji}>📅</Text>
            <Text style={s.miniMetaText}>{formatDate(event.startDate)}</Text>
          </View>
          <View style={s.miniMetaRow}>
            <Text style={s.miniMetaEmoji}>📍</Text>
            <Text style={s.miniMetaText} numberOfLines={1}>{event.venue || event.location || 'TBD'}</Text>
          </View>
        </View>
        <View style={s.priceBadge}>
          <Text style={s.priceBadgeText}>
            {event.priceType === 'FREE'
              ? '🎁 Free Event'
              : event.price
              ? `₹${event.price} per person`
              : '💳 Paid Event'}
          </Text>
        </View>
      </LinearGradient>

      {event.maxAttendees ? (
        <View style={s.capacityBar}>
          <View style={s.capacityLeft}>
            <Text style={s.capacityEmoji}>🎫</Text>
            <Text style={s.capacityText}>
              {event.registrationCount} / {event.maxAttendees} registered
            </Text>
          </View>
          <View style={[s.spotsChip, {
            backgroundColor: event.registrationCount >= event.maxAttendees * 0.9
              ? '#FEF2F2' : '#ECFDF5'
          }]}>
            <Text style={[s.spotsText, {
              color: event.registrationCount >= event.maxAttendees * 0.9
                ? '#DC2626' : '#059669'
            }]}>
              {Math.max(0, event.maxAttendees - event.registrationCount)} spots left
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={s.sectionLabel}>Select Ticket Type</Text>
      {TICKET_TYPES.map(ticket => (
        <TouchableOpacity
          key={ticket.id}
          style={[s.ticketOption, ticketType === ticket.id && s.ticketOptionSelected]}
          onPress={() => setTicketType(ticket.id)}
          activeOpacity={0.75}
        >
          <View style={[s.ticketIconWrap, { backgroundColor: ticket.bg }]}>
            <Text style={s.ticketEmoji}>{ticket.emoji}</Text>
          </View>
          <View style={s.ticketInfo}>
            <Text style={[s.ticketLabel, ticketType === ticket.id && { color: ticket.color }]}>
              {ticket.label}
            </Text>
            <Text style={s.ticketDesc}>{ticket.desc}</Text>
          </View>
          <View style={[
            s.ticketRadio,
            ticketType === ticket.id && { borderColor: ticket.color, backgroundColor: ticket.color }
          ]}>
            {ticketType === ticket.id && <View style={s.ticketRadioInner} />}
          </View>
        </TouchableOpacity>
      ))}

      {isPaid ? (
        <>
          <Text style={s.sectionLabel}>Quantity</Text>
          <View style={s.quantityRow}>
            <TouchableOpacity
              style={s.qtyBtn}
              onPress={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Ionicons name="remove" size={18} color={quantity <= 1 ? COLORS.textMuted : COLORS.text} />
            </TouchableOpacity>
            <Text style={s.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={s.qtyBtn}
              onPress={() => setQuantity(q => Math.min(10, q + 1))}
            >
              <Ionicons name="add" size={18} color={COLORS.text} />
            </TouchableOpacity>
            <View style={s.qtyTotal}>
              <Text style={s.qtyTotalLabel}>Total</Text>
              <Text style={s.qtyTotalAmount}>₹{totalAmount}</Text>
            </View>
          </View>
        </>
      ) : null}

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // ── Step 1: Attendee Details ────────────────────────────────
  const renderStep1 = () => (
    <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
      <View style={s.infoNote}>
        <Text style={s.infoNoteEmoji}>ℹ️</Text>
        <Text style={s.infoNoteText}>
          Pre-filled from your profile. Edit if needed.
        </Text>
      </View>

      <Text style={s.sectionLabel}>Full Name *</Text>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Your full name"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={s.sectionLabel}>Email Address *</Text>
      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        placeholder="your@email.com"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={s.sectionLabel}>Phone Number</Text>
      <TextInput
        style={s.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+91 XXXXX XXXXX"
        placeholderTextColor={COLORS.textMuted}
        keyboardType="phone-pad"
      />

      <Text style={s.sectionLabel}>Special Requests / Dietary Notes</Text>
      <TextInput
        style={[s.input, s.inputMultiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any dietary restrictions or special needs..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // ── Step 2: Review & Confirm ────────────────────────────────
  const renderStep2 = () => (
    <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
      <View style={s.reviewCard}>
        <Text style={s.reviewCardTitle}>Booking Summary</Text>

        <View style={s.reviewSection}>
          <Text style={s.reviewSectionLabel}>EVENT</Text>
          <Text style={s.reviewSectionValue}>{event.title}</Text>
          <Text style={s.reviewSectionSub}>{formatDate(event.startDate)} · {formatTime(event.startTime)}</Text>
          <Text style={s.reviewSectionSub}>{event.venue || event.location || 'TBD'}</Text>
        </View>

        <View style={s.reviewDivider} />

        <View style={s.reviewSection}>
          <Text style={s.reviewSectionLabel}>TICKET TYPE</Text>
          <View style={s.reviewTicketRow}>
            <Text style={s.reviewTicketEmoji}>{selectedTicket.emoji}</Text>
            <Text style={s.reviewSectionValue}>{selectedTicket.label}</Text>
          </View>
          {isPaid ? (
            <Text style={s.reviewSectionSub}>× {quantity} = ₹{totalAmount}</Text>
          ) : null}
        </View>

        <View style={s.reviewDivider} />

        <View style={s.reviewSection}>
          <Text style={s.reviewSectionLabel}>ATTENDEE</Text>
          <Text style={s.reviewSectionValue}>{name || 'Not set'}</Text>
          <Text style={s.reviewSectionSub}>{email}</Text>
          {phone ? <Text style={s.reviewSectionSub}>{phone}</Text> : null}
        </View>

        {isPaid ? (
          <>
            <View style={s.reviewDivider} />
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Amount</Text>
              <Text style={s.totalAmount}>₹{totalAmount}</Text>
            </View>
          </>
        ) : null}
      </View>

      <TouchableOpacity
        style={s.tcRow}
        onPress={() => setAgreed(a => !a)}
        activeOpacity={0.7}
      >
        <View style={[s.checkbox, agreed && s.checkboxChecked]}>
          {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
        </View>
        <Text style={s.tcText}>
          I agree to the event's terms & conditions and understand the registration is final.
        </Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />
    </ScrollView>
  );

  // ── Step 3: Success ─────────────────────────────────────────
  const renderStep3 = () => (
    <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
      <View style={s.successBanner}>
        <LinearGradient colors={['#059669', '#10B981']} style={s.successCircle}>
          <Text style={s.successCheckmark}>✓</Text>
        </LinearGradient>
        <Text style={s.successTitle}>You're In! 🎉</Text>
        <Text style={s.successSub}>Registration confirmed for {event.title}</Text>
      </View>

      {/* Digital Ticket */}
      <View style={s.digitalTicket}>
        <LinearGradient
          colors={['#312E81', '#4F46E5']}
          style={s.ticketHeaderGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={s.ticketConfirmedBadge}>
            <Text style={s.ticketConfirmedText}>✓ CONFIRMED</Text>
          </View>
          <Text style={s.ticketEventName}>{event.title}</Text>
          <Text style={s.ticketEventType}>{event.type} EVENT</Text>
        </LinearGradient>

        <View style={s.tearRow}>
          <View style={s.tearNotchLeft} />
          <View style={s.tearDash} />
          <View style={s.tearNotchRight} />
        </View>

        <View style={s.ticketBody}>
          <View style={s.ticketInfoGrid}>
            <View style={s.ticketInfoCell}>
              <Text style={s.ticketInfoLabel}>DATE</Text>
              <Text style={s.ticketInfoVal}>
                {event.startDate ? format(parseISO(event.startDate), 'dd MMM') : 'TBD'}
              </Text>
              <Text style={s.ticketInfoSub}>
                {event.startDate ? format(parseISO(event.startDate), 'yyyy') : ''}
              </Text>
            </View>
            <View style={s.ticketInfoDivider} />
            <View style={s.ticketInfoCell}>
              <Text style={s.ticketInfoLabel}>TIME</Text>
              <Text style={s.ticketInfoVal}>{formatTime(event.startTime) || 'TBD'}</Text>
              <Text style={s.ticketInfoSub}>{event.locationType || 'PHYSICAL'}</Text>
            </View>
            <View style={s.ticketInfoDivider} />
            <View style={s.ticketInfoCell}>
              <Text style={s.ticketInfoLabel}>TICKET</Text>
              <Text style={s.ticketInfoVal}>{selectedTicket.emoji}</Text>
              <Text style={s.ticketInfoSub}>{selectedTicket.label.split(' ')[0]}</Text>
            </View>
          </View>

          {/* QR visual */}
          <View style={s.qrSection}>
            <View style={s.qrBox}>
              <View style={s.qrGrid}>
                {Array.from({ length: 64 }).map((_, i) => {
                  const row = Math.floor(i / 8);
                  const col = i % 8;
                  const isCornerTL = row < 3 && col < 3;
                  const isCornerTR = row < 3 && col >= 5;
                  const isCornerBL = row >= 5 && col < 3;
                  const isFinder = isCornerTL || isCornerTR || isCornerBL;
                  const filled = isFinder || (!isFinder && (i * 7 + row * 3) % 3 === 0);
                  return (
                    <View
                      key={i}
                      style={[s.qrCell, filled && s.qrCellFilled, isFinder && s.qrCorner]}
                    />
                  );
                })}
              </View>
              <View style={s.qrCenter}>
                <Text style={s.qrCenterEmoji}>🎫</Text>
              </View>
            </View>
            <Text style={s.qrCode}>{passCode}</Text>
            <Text style={s.qrInstruction}>Show this at the gate for entry</Text>
          </View>

          <View style={s.attendeeRow}>
            <Text style={s.attendeeLabel}>ATTENDEE</Text>
            <Text style={s.attendeeValue}>{name}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={s.viewPassBtn}
        onPress={() => router.push(`/events/gatepass?id=${id}` as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="ticket-outline" size={18} color={COLORS.primary} />
        <Text style={s.viewPassBtnText}>View Full Entry Pass</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.doneBtn}
        onPress={() => router.replace(`/events/${id}` as any)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={GRADIENTS.hero}
          style={s.doneBtnGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Text style={s.doneBtnText}>Back to Event</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const canProceed =
    step === 0 ? !!ticketType :
    step === 1 ? name.trim().length > 0 && email.trim().length > 0 :
    step === 2 ? agreed :
    true;

  const handleNext = () => {
    if (step === 2) { registerMutation.mutate(); return; }
    setStep(s => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step === 0) { router.back(); return; }
    setStep(s => (s - 1) as Step);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.headerBackBtn} hitSlop={8}>
          <Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {step === 3 ? 'Booking Confirmed' : 'Register for Event'}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {step < 3 && (
        <View style={s.stepper}>
          {(['Ticket', 'Details', 'Confirm'] as const).map((label, i) => (
            <View key={label} style={s.stepperItem}>
              <View style={[
                s.stepperDot,
                i < step && s.stepperDotDone,
                i === step && s.stepperDotActive,
              ]}>
                {i < step ? (
                  <Ionicons name="checkmark" size={11} color="#fff" />
                ) : (
                  <Text style={[s.stepperNum, i === step && { color: '#fff' }]}>{i + 1}</Text>
                )}
              </View>
              {i < 2 && (
                <View style={[s.stepperLine, i < step && s.stepperLineDone]} />
              )}
            </View>
          ))}
        </View>
      )}

      {step < 3 && (
        <View style={s.stepLabelRow}>
          <Text style={s.stepLabel}>{
            step === 0 ? '🎟️  Choose your ticket' :
            step === 1 ? '👤  Your details' :
            '✅  Review & confirm'
          }</Text>
        </View>
      )}

      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {step < 3 && (
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.nextBtn, !canProceed && s.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canProceed || registerMutation.isPending}
            activeOpacity={0.8}
          >
            {registerMutation.isPending ? (
              <LinearGradient colors={GRADIENTS.hero} style={s.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <ActivityIndicator color="#fff" size="small" />
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={canProceed ? GRADIENTS.hero : ['#9CA3AF', '#9CA3AF']}
                style={s.nextBtnGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={s.nextBtnText}>
                  {step === 2 ? '🎟️  Confirm Registration' : 'Continue'}
                </Text>
                {step < 2 && <Ionicons name="arrow-forward" size={16} color="#fff" />}
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.medium },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8E8F0',
  },
  headerBackBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold },

  stepper: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 32, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  stepperItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepperDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E8E8F0',
  },
  stepperDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepperDotDone:   { backgroundColor: '#059669', borderColor: '#059669' },
  stepperNum: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, fontFamily: FONTS.bold },
  stepperLine: { flex: 1, height: 2, backgroundColor: '#E8E8F0', marginHorizontal: 4 },
  stepperLineDone: { backgroundColor: '#059669' },

  stepLabelRow: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  stepLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONTS.semiBold },

  stepContent: { padding: 16, paddingBottom: 100 },

  eventMiniCard: { borderRadius: RADIUS.xl, padding: 18, marginBottom: 14 },
  miniEventTitle: {
    fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: FONTS.displayEB,
    marginBottom: 10, letterSpacing: -0.3,
  },
  miniEventMeta: { gap: 6, marginBottom: 12 },
  miniMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniMetaEmoji: { fontSize: 13 },
  miniMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontFamily: FONTS.medium },
  priceBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4,
  },
  priceBadgeText: { fontSize: 12, color: '#fff', fontWeight: '700', fontFamily: FONTS.bold },

  capacityBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#E8E8F0', marginBottom: 16, ...SHADOWS.sm,
  },
  capacityLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  capacityEmoji: { fontSize: 14 },
  capacityText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.medium },
  spotsChip: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  spotsText: { fontSize: 12, fontWeight: '700', fontFamily: FONTS.bold },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.5, textTransform: 'uppercase',
    fontFamily: FONTS.bold, marginBottom: 8, marginTop: 4,
  },

  ticketOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: '#E8E8F0',
    padding: 14, marginBottom: 10, ...SHADOWS.sm,
  },
  ticketOptionSelected: { borderColor: COLORS.primary, backgroundColor: '#FAFBFF' },
  ticketIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ticketEmoji: { fontSize: 22 },
  ticketInfo: { flex: 1 },
  ticketLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold },
  ticketDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },
  ticketRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  ticketRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  quantityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#E8E8F0',
    padding: 14, marginBottom: 16, ...SHADOWS.sm,
  },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  qtyValue: {
    fontSize: 20, fontWeight: '800', color: COLORS.text,
    fontFamily: FONTS.displayEB, minWidth: 28, textAlign: 'center',
  },
  qtyTotal: { flex: 1, alignItems: 'flex-end' },
  qtyTotalLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.medium },
  qtyTotalAmount: { fontSize: 18, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.displayEB },

  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: RADIUS.md,
    padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E0E7FF',
  },
  infoNoteEmoji: { fontSize: 14 },
  infoNoteText: { flex: 1, fontSize: 13, color: COLORS.primary, fontFamily: FONTS.medium, lineHeight: 18 },

  input: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8E8F0',
    borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, fontFamily: FONTS.regular, marginBottom: 12,
  },
  inputMultiline: { minHeight: 80, paddingTop: 12 },

  reviewCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: '#E8E8F0',
    padding: 18, marginBottom: 16, ...SHADOWS.sm,
  },
  reviewCardTitle: {
    fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold, marginBottom: 14,
  },
  reviewSection: { marginBottom: 12 },
  reviewDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  reviewSectionLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: FONTS.bold, marginBottom: 4,
  },
  reviewSectionValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.displaySemi },
  reviewSectionSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2, fontFamily: FONTS.regular },
  reviewTicketRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewTicketEmoji: { fontSize: 16 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.semiBold },
  totalAmount: { fontSize: 20, fontWeight: '800', color: COLORS.primary, fontFamily: FONTS.displayEB },

  tcRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: '#E8E8F0',
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tcText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, fontFamily: FONTS.regular },

  successBanner: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  successCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  successCheckmark: { fontSize: 36, color: '#fff', fontWeight: '800' },
  successTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.displayEB, letterSpacing: -0.4 },
  successSub: { fontSize: 14, color: COLORS.textMuted, fontFamily: FONTS.medium, textAlign: 'center', paddingHorizontal: 24 },

  digitalTicket: {
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E8E8F0', ...SHADOWS.lg, marginBottom: 16,
  },
  ticketHeaderGrad: { padding: 22, alignItems: 'center' },
  ticketConfirmedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  ticketConfirmedText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1, fontFamily: FONTS.bold },
  ticketEventName: {
    fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center',
    fontFamily: FONTS.displayEB, letterSpacing: -0.3,
  },
  ticketEventType: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4, letterSpacing: 1 },

  tearRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 24 },
  tearNotchLeft: {
    width: 14, height: 24, borderTopRightRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#F8FAFC',
  },
  tearDash: { flex: 1, borderBottomWidth: 2, borderBottomColor: '#E8E8F0', borderStyle: 'dashed' },
  tearNotchRight: {
    width: 14, height: 24, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, backgroundColor: '#F8FAFC',
  },

  ticketBody: { backgroundColor: '#fff', padding: 18 },
  ticketInfoGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  ticketInfoCell: { flex: 1, alignItems: 'center' },
  ticketInfoDivider: { width: 1, height: 40, backgroundColor: '#F1F5F9' },
  ticketInfoLabel: {
    fontSize: 9, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: FONTS.bold,
  },
  ticketInfoVal: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: FONTS.displayEB, marginTop: 2 },
  ticketInfoSub: { fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.regular },

  qrSection: { alignItems: 'center', marginBottom: 16 },
  qrBox: {
    width: 140, height: 140, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E8E8F0', borderRadius: 12,
    padding: 8, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  qrGrid: { width: 120, height: 120, flexDirection: 'row', flexWrap: 'wrap' },
  qrCell: { width: 15, height: 15, backgroundColor: 'transparent' },
  qrCellFilled: { backgroundColor: '#0F172A' },
  qrCorner: { backgroundColor: '#312E81' },
  qrCenter: {
    position: 'absolute', width: 36, height: 36, backgroundColor: '#fff',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  qrCenterEmoji: { fontSize: 20 },
  qrCode: { fontSize: 15, fontWeight: '800', color: COLORS.primary, letterSpacing: 2, fontFamily: FONTS.displayEB, marginTop: 10 },
  qrInstruction: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.regular, marginTop: 4 },

  attendeeRow: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#E8E8F0', alignItems: 'center',
  },
  attendeeLabel: {
    fontSize: 9, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: FONTS.bold,
  },
  attendeeValue: { fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.displayBold, marginTop: 2 },

  viewPassBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.primary,
    paddingVertical: 13, marginBottom: 10,
  },
  viewPassBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary, fontFamily: FONTS.displayBold },

  doneBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 16 },
  doneBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: FONTS.displayBold },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 30,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8E8F0', ...SHADOWS.lg,
  },
  nextBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: FONTS.displayBold },
});
