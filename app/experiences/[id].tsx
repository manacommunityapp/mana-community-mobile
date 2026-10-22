import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Platform, StatusBar, TextInput, Modal, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns';
import {
  experiencesService, Experience, BookingRequest, CATEGORY_META,
} from '@/services/experiencesService';
import { THEME, FONTS, SHADOWS, COLORS, RADIUS } from '@/constants/config';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    const diff = differenceInDays(d, new Date());
    if (diff < 7) return format(d, 'EEEE, d MMMM');
    return format(d, 'EEE, d MMMM yyyy');
  } catch { return dateStr; }
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F4F7' }}>
      <Text style={{ fontSize: 16, width: 22 }}>{icon}</Text>
      <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.text, flex: 1, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

// ── Registration Steps ────────────────────────────────────────────────────────

const STEPS = ['Details', 'Confirm', 'Done'] as const;
type Step = 0 | 1 | 2;

function RegistrationModal({
  exp,
  visible,
  onClose,
}: {
  exp: Experience;
  visible: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState(1);
  const [ticketType, setTicketType] = useState<'GENERAL' | 'FAMILY' | 'GROUP'>('GENERAL');
  const [isGroup, setIsGroup] = useState(false);
  const [booking, setBooking] = useState<Awaited<ReturnType<typeof experiencesService.bookExperience>> | null>(null);

  const bookMutation = useMutation({
    mutationFn: (req: BookingRequest) => experiencesService.bookExperience(req),
    onSuccess: (data) => {
      setBooking(data);
      setStep(2);
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      qc.invalidateQueries({ queryKey: ['experiences'] });
    },
    onError: () => Alert.alert('Booking Failed', 'Please try again.'),
  });

  const totalAmount = exp.is_free
    ? 0
    : isGroup && exp.price_group
      ? exp.price_group * count
      : (exp.price_individual ?? 0) * count;

  const handleConfirm = useCallback(() => {
    if (!name.trim()) { Alert.alert('Name Required', 'Please enter your name.'); return; }
    if (!phone.trim() || phone.length < 10) { Alert.alert('Phone Required', 'Please enter a valid 10-digit phone number.'); return; }
    bookMutation.mutate({
      experience_id: exp.id,
      ticket_type: ticketType,
      attendee_count: count,
      attendee_name: name.trim(),
      attendee_phone: phone.trim(),
      is_group_booking: isGroup,
    });
  }, [name, phone, count, ticketType, isGroup, bookMutation, exp.id]);

  const reset = useCallback(() => {
    setStep(0); setName(''); setPhone(''); setCount(1);
    setTicketType('GENERAL'); setIsGroup(false); setBooking(null);
    onClose();
  }, [onClose]);

  const spotsAvailable = exp.capacity - exp.registered_count;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={reset}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header */}
        <LinearGradient
          colors={[exp.backdrop_color, exp.backdrop_color + 'CC']}
          style={{ paddingTop: Platform.OS === 'ios' ? 28 : 16, paddingBottom: 18, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: '#fff' }}>
              {step === 2 ? '🎉 Booking Confirmed!' : `${exp.emoji} Register`}
            </Text>
            <TouchableOpacity onPress={reset}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
          {/* Step indicator */}
          {step < 2 && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
              {STEPS.slice(0, 2).map((label, i) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: i <= step ? '#fff' : 'rgba(255,255,255,0.25)',
                  }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: i <= step ? exp.backdrop_color : '#fff' }}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: i <= step ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                    {label}
                  </Text>
                  {i < 1 && <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>›</Text>}
                </View>
              ))}
            </View>
          )}
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
          {/* Step 0: Details */}
          {step === 0 && (
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.muted, marginBottom: 6 }}>YOUR NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  style={{
                    borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12,
                    padding: 13, fontFamily: FONTS.regular, fontSize: 15, color: THEME.text,
                  }}
                />
              </View>

              <View>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.muted, marginBottom: 6 }}>PHONE NUMBER</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={{
                    borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12,
                    padding: 13, fontFamily: FONTS.regular, fontSize: 15, color: THEME.text,
                  }}
                />
              </View>

              {/* Attendee count */}
              <View>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.muted, marginBottom: 6 }}>NUMBER OF ATTENDEES</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <TouchableOpacity
                    onPress={() => setCount(c => Math.max(1, c - 1))}
                    style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#F1F4F7', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="remove" size={20} color={THEME.text} />
                  </TouchableOpacity>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: THEME.text, minWidth: 30, textAlign: 'center' }}>
                    {count}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCount(c => Math.min(spotsAvailable, c + 1))}
                    style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>
                    (max {Math.min(spotsAvailable, 10)})
                  </Text>
                </View>
              </View>

              {/* Group booking option */}
              {exp.group_min_size && exp.price_group && !exp.is_free && (
                <TouchableOpacity
                  onPress={() => setIsGroup(g => !g)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
                    borderRadius: 14, borderWidth: 2,
                    borderColor: isGroup ? COLORS.primary : '#E8E9F0',
                    backgroundColor: isGroup ? '#EEF2FF' : '#F9FAFB',
                  }}
                >
                  <View style={{
                    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                    borderColor: isGroup ? COLORS.primary : '#CBD5E1',
                    backgroundColor: isGroup ? COLORS.primary : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isGroup && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>
                      👥 Join Group Booking
                    </Text>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      ₹{exp.price_group}/pp vs ₹{exp.price_individual}/pp · {exp.group_min_size - (exp.group_current_size ?? 0)} more needed
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setStep(1)}
                style={{
                  backgroundColor: COLORS.primary, borderRadius: 14, padding: 16,
                  alignItems: 'center', marginTop: 8,
                }}
              >
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 1: Confirm */}
          {step === 1 && (
            <View style={{ gap: 14 }}>
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 10 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text }}>{exp.title}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Date</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{fmtDate(exp.start_date)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Time</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{exp.start_time}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Venue</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text, flex: 1, textAlign: 'right' }} numberOfLines={2}>{exp.venue}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Attendees</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{count} person{count !== 1 ? 's' : ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Name</Text>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>{name}</Text>
                </View>
                {isGroup && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>Booking Type</Text>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#059669' }}>Group Rate</Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: '#E8E9F0' }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text }}>Total</Text>
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: totalAmount === 0 ? '#059669' : COLORS.primary }}>
                    {totalAmount === 0 ? 'FREE' : `₹${totalAmount.toLocaleString('en-IN')}`}
                  </Text>
                </View>
              </View>

              {exp.refund_policy && (
                <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 12 }}>
                  <Text style={{ fontSize: 14 }}>ℹ️</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#92400E', flex: 1 }}>
                    {exp.refund_policy}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={() => setStep(0)}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.text }}>← Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={bookMutation.isPending}
                  style={{
                    flex: 2, backgroundColor: totalAmount === 0 ? '#059669' : COLORS.primary,
                    borderRadius: 14, padding: 14, alignItems: 'center',
                    opacity: bookMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {bookMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
                        {totalAmount === 0 ? 'Confirm Registration' : `Pay ₹${totalAmount.toLocaleString('en-IN')}`}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Step 2: Confirmed */}
          {step === 2 && booking && (
            <View style={{ gap: 16, alignItems: 'center' }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 36 }}>✅</Text>
              </View>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: THEME.text, textAlign: 'center' }}>
                You're in! See you there.
              </Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted, textAlign: 'center', lineHeight: 18 }}>
                Your booking is confirmed. Show your QR pass at the entrance.
              </Text>

              {/* QR Pass */}
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 20, padding: 20, width: '100%', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: '#E8E9F0', borderStyle: 'dashed' }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }}>🎟️ Your Pass</Text>
                {/* Simulated QR */}
                <View style={{ width: 120, height: 120, borderRadius: 16, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 54 }}>{exp.emoji}</Text>
                </View>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary, letterSpacing: 1.5 }}>
                  {booking.booking_id}
                </Text>
                <View style={{ width: '100%', gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Event</Text>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.text, flex: 1, textAlign: 'right' }} numberOfLines={1}>{exp.title}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Date</Text>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.text }}>{fmtDate(exp.start_date)}, {exp.start_time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Attendees</Text>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.text }}>{booking.attendee_count}</Text>
                  </View>
                </View>
              </View>

              {/* UPI payment prompt */}
              {booking.upi_intent_url && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(booking.upi_intent_url!)}
                  style={{ width: '100%', backgroundColor: '#3730A3', borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>💳 Complete Payment via UPI</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>
                    ₹{booking.total_amount.toLocaleString('en-IN')} due
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <TouchableOpacity
                  onPress={() => { reset(); }}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.text }}>Back to Explore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { reset(); }}
                  style={{ flex: 1, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#fff' }}>My Bookings</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Detail Screen ─────────────────────────────────────────────────────────────

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showRegModal, setShowRegModal] = useState(false);

  const { data: exp, isLoading } = useQuery({
    queryKey: ['experience', id],
    queryFn: () => experiencesService.getExperience(id!),
    enabled: !!id,
  });

  if (isLoading || !exp) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const meta = CATEGORY_META[exp.category];
  const isFull = exp.registered_count >= exp.capacity;
  const spotsLeft = exp.capacity - exp.registered_count;
  const progress = exp.registered_count / exp.capacity;
  const groupNeeded = exp.group_min_size ? exp.group_min_size - (exp.group_current_size ?? 0) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={[exp.backdrop_color, exp.backdrop_color + '88', THEME.background]}
          style={{ paddingTop: Platform.OS === 'ios' ? 54 : 22, paddingBottom: 30, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <Text style={{ color: '#fff', fontFamily: FONTS.medium, fontSize: 13 }}>← Back</Text>
            </TouchableOpacity>
            {exp.visibility === 'MEMBERS_ONLY' && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: '#fff' }}>🔒 Members Only</Text>
              </View>
            )}
          </View>

          <Text style={{ fontSize: 64, marginBottom: 14 }}>{exp.emoji}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <View style={{ backgroundColor: meta.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: meta.color }}>
                {meta.emoji} {meta.label}
              </Text>
            </View>
            {exp.organizer_verified && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: '#fff' }}>✓ Verified</Text>
              </View>
            )}
          </View>

          <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: '#fff', lineHeight: 28 }}>
            {exp.title}
          </Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>
            by {exp.organizer_name}
          </Text>
        </LinearGradient>

        {/* Info Card */}
        <View style={{ marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: -16, ...SHADOWS.card, gap: 2 }}>
          <InfoRow icon="📅" text={`${fmtDate(exp.start_date)}${exp.end_date && exp.end_date !== exp.start_date ? ` – ${fmtDate(exp.end_date)}` : ''}`} />
          <InfoRow icon="🕐" text={`${exp.start_time}${exp.duration_mins ? ` · ${exp.duration_mins < 60 ? `${exp.duration_mins}m` : `${Math.floor(exp.duration_mins / 60)}h${exp.duration_mins % 60 > 0 ? ` ${exp.duration_mins % 60}m` : ''}`}` : ''}`} />
          <InfoRow icon="📍" text={`${exp.venue} · ${exp.venue_area}`} />
          {exp.age_suitability && <InfoRow icon="👥" text={exp.age_suitability} />}
          {exp.community_tag && <InfoRow icon="🏘️" text={`Community: ${exp.community_tag}`} />}
        </View>

        {/* Price + Capacity */}
        <View style={{ marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 12, ...SHADOWS.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>Ticket Price</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: exp.is_free ? '#059669' : COLORS.primary, marginTop: 2 }}>
                {exp.is_free ? 'FREE' : `₹${exp.price_individual?.toLocaleString('en-IN')}`}
              </Text>
              {!exp.is_free && exp.price_group && (
                <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#059669', marginTop: 2 }}>
                  Group rate: ₹{exp.price_group}/pp
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>{isFull ? 'No spots left' : 'Spots available'}</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: isFull ? '#DC2626' : spotsLeft <= 10 ? '#D97706' : '#059669', marginTop: 2 }}>
                {isFull ? 'Full' : spotsLeft <= 10 ? `${spotsLeft} left!` : `${spotsLeft} open`}
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={{ height: 6, backgroundColor: '#F1F4F7', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{
              height: 6, borderRadius: 3,
              backgroundColor: progress > 0.9 ? '#DC2626' : progress > 0.7 ? '#D97706' : '#059669',
              width: `${Math.min(progress * 100, 100)}%`,
            }} />
          </View>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 5, textAlign: 'right' }}>
            {exp.registered_count} / {exp.capacity} registered
          </Text>
        </View>

        {/* Group Booking */}
        {exp.group_min_size && exp.price_group && !exp.is_free && (
          <View style={{ marginHorizontal: 16, backgroundColor: '#FEF3C7', borderRadius: 18, padding: 16, marginTop: 12 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#92400E', marginBottom: 8 }}>
              👥 Community Group Booking
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#78350F' }}>Currently joined</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#78350F' }}>{exp.group_current_size ?? 0} / {exp.group_min_size}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#78350F' }}>Group rate</Text>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: '#059669' }}>₹{exp.price_group}/pp</Text>
              </View>
            </View>
            <View style={{ height: 6, backgroundColor: '#FDE68A', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: '#D97706', width: `${((exp.group_current_size ?? 0) / exp.group_min_size) * 100}%` }} />
            </View>
            {groupNeeded > 0 ? (
              <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#78350F' }}>
                {groupNeeded} more member{groupNeeded !== 1 ? 's' : ''} needed to unlock group pricing
                {exp.group_deadline ? ` · Deadline: ${fmtDate(exp.group_deadline)}` : ''}
              </Text>
            ) : (
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: '#059669' }}>
                ✓ Group confirmed! Group rate available.
              </Text>
            )}
          </View>
        )}

        {/* About */}
        <View style={{ marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 12, ...SHADOWS.card }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text, marginBottom: 10 }}>About this Experience</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.text, lineHeight: 22 }}>
            {exp.description}
          </Text>
          {exp.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {exp.tags.map(tag => (
                <View key={tag} style={{ backgroundColor: '#F1F4F7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: THEME.muted }}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Refund Policy */}
        {exp.refund_policy && (
          <View style={{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', gap: 8, padding: 14, backgroundColor: '#F0FDF4', borderRadius: 14 }}>
            <Text style={{ fontSize: 15 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: '#166534' }}>Refund Policy</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#166534', marginTop: 2 }}>{exp.refund_policy}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1, borderTopColor: '#EBEFF2',
        ...SHADOWS.floating,
      }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: exp.is_free ? '#059669' : COLORS.primary }}>
              {exp.is_free ? 'FREE' : `₹${exp.price_individual?.toLocaleString('en-IN')}`}
            </Text>
            {!exp.is_free && exp.price_group && (
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#059669' }}>
                Group: ₹{exp.price_group}/pp
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => {
              if (isFull) { Alert.alert('Event Full', 'This experience is fully booked. Check back later.'); return; }
              setShowRegModal(true);
            }}
            style={{
              flex: 2, borderRadius: 14, padding: 15, alignItems: 'center',
              backgroundColor: isFull ? '#CBD5E1' : exp.is_free ? '#059669' : COLORS.primary,
            }}
          >
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
              {isFull ? 'Full — Join Waitlist' : exp.is_free ? '🎟️ Register Free' : '🎟️ Book Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showRegModal && (
        <RegistrationModal exp={exp} visible={showRegModal} onClose={() => setShowRegModal(false)} />
      )}
    </View>
  );
}
