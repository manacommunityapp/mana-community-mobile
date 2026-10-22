import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Platform, StatusBar, TextInput, Modal, Linking, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns';
import {
  experiencesService, Experience, BookingRequest, CATEGORY_META,
  FamilyMember, CouponResult,
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

// ── Ticket Type Options ───────────────────────────────────────────────────────

const TICKET_TYPES: { key: 'GENERAL' | 'FAMILY' | 'GROUP' | 'VIP'; label: string; emoji: string; desc: string }[] = [
  { key: 'GENERAL', label: 'General', emoji: '🎟️', desc: 'Single admission' },
  { key: 'FAMILY',  label: 'Family',  emoji: '👨‍👩‍👧', desc: 'Up to 4 members' },
  { key: 'GROUP',   label: 'Group',   emoji: '👥', desc: 'Community group rate' },
  { key: 'VIP',     label: 'VIP',     emoji: '⭐', desc: 'Priority entry + perks' },
];

// ── Registration Modal (4-step) ───────────────────────────────────────────────

const STEPS = ['Ticket', 'Details', 'Pay', 'Done'] as const;
type Step = 0 | 1 | 2 | 3;

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
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  // Step 0 — ticket type
  const [ticketType, setTicketType] = useState<'GENERAL' | 'FAMILY' | 'GROUP' | 'VIP'>('GENERAL');

  // Step 1 — details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [count, setCount] = useState(1);
  const [isGroup, setIsGroup] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([{ name: '', age: undefined }]);

  // Step 2 — coupon + pay
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [booking, setBooking] = useState<Awaited<ReturnType<typeof experiencesService.bookExperience>> | null>(null);

  const spotsAvailable = exp.capacity - exp.registered_count;

  const baseAmount = exp.is_free
    ? 0
    : isGroup && exp.price_group && ticketType === 'GROUP'
      ? exp.price_group * count
      : (exp.price_individual ?? 0) * count;

  const totalAmount = coupon?.valid ? coupon.final_amount : baseAmount;
  const discountAmount = coupon?.valid ? coupon.discount_amount : 0;

  const bookMutation = useMutation({
    mutationFn: (req: BookingRequest) => experiencesService.bookExperience(req),
    onSuccess: (data) => {
      setBooking(data);
      setStep(3);
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      qc.invalidateQueries({ queryKey: ['experiences'] });
    },
    onError: () => Alert.alert('Booking Failed', 'Please try again.'),
  });

  const reset = useCallback(() => {
    setStep(0); setName(''); setPhone(''); setCount(1);
    setTicketType('GENERAL'); setIsGroup(false); setBooking(null);
    setFamilyMembers([{ name: '', age: undefined }]);
    setCouponInput(''); setCoupon(null); setCouponError('');
    onClose();
  }, [onClose]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const result = await experiencesService.validateCoupon(couponInput.trim(), exp.id, baseAmount);
      if (result.valid) {
        setCoupon(result);
      } else {
        setCouponError(result.message);
        setCoupon(null);
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePay = useCallback(() => {
    if (!name.trim()) { Alert.alert('Name Required', 'Please enter your name.'); return; }
    if (!phone.trim() || phone.length < 10) { Alert.alert('Phone Required', 'Please enter a valid 10-digit number.'); return; }
    const fmembers = ticketType === 'FAMILY' ? familyMembers.filter(m => m.name.trim()) : undefined;
    bookMutation.mutate({
      experience_id: exp.id,
      ticket_type: ticketType,
      attendee_count: count,
      attendee_name: name.trim(),
      attendee_phone: phone.trim(),
      is_group_booking: isGroup,
      coupon_code: coupon?.valid ? coupon.code : undefined,
      family_members: fmembers,
    });
  }, [name, phone, count, ticketType, isGroup, coupon, familyMembers, bookMutation, exp.id]);

  const availableTicketTypes = TICKET_TYPES.filter(t => {
    if (t.key === 'GROUP' && !exp.price_group) return false;
    if (t.key === 'VIP' && exp.is_free) return false;
    return true;
  });

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
              {step === 3 ? '🎉 Booking Confirmed!' : `${exp.emoji} Register`}
            </Text>
            <TouchableOpacity onPress={reset}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
          {step < 3 && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
              {STEPS.slice(0, 3).map((label, i) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: i <= step ? '#fff' : 'rgba(255,255,255,0.25)',
                  }}>
                    {i < step
                      ? <Ionicons name="checkmark" size={13} color={exp.backdrop_color} />
                      : <Text style={{ fontFamily: FONTS.bold, fontSize: 10, color: i <= step ? exp.backdrop_color : '#fff' }}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={{ fontFamily: FONTS.medium, fontSize: 10, color: i <= step ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                    {label}
                  </Text>
                  {i < 2 && <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>›</Text>}
                </View>
              ))}
            </View>
          )}
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">

          {/* ─ Step 0: Ticket Type ─ */}
          {step === 0 && (
            <View style={{ gap: 14 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }}>Choose Ticket Type</Text>
              {availableTicketTypes.map(t => {
                const selected = ticketType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setTicketType(t.key)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15,
                      borderRadius: 16, borderWidth: 2,
                      borderColor: selected ? COLORS.primary : '#E8E9F0',
                      backgroundColor: selected ? '#EEF2FF' : '#F9FAFB',
                    }}
                  >
                    <Text style={{ fontSize: 26 }}>{t.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.text }}>{t.label}</Text>
                      <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, marginTop: 2 }}>{t.desc}</Text>
                    </View>
                    {t.key === 'GROUP' && exp.price_group && !exp.is_free && (
                      <View style={{ backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: '#065F46' }}>
                          ₹{exp.price_group}/pp
                        </Text>
                      </View>
                    )}
                    {selected && (
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={() => setStep(1)}
                style={{ backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }}
              >
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─ Step 1: Attendee Details ─ */}
          {step === 1 && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }}>Your Details</Text>

              <View>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 6 }}>FULL NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  style={{ borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, padding: 13, fontFamily: FONTS.regular, fontSize: 15, color: THEME.text }}
                />
              </View>

              <View>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 6 }}>PHONE NUMBER</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="10-digit mobile number"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={{ borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, padding: 13, fontFamily: FONTS.regular, fontSize: 15, color: THEME.text }}
                />
              </View>

              {ticketType !== 'FAMILY' && (
                <View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 6 }}>NUMBER OF ATTENDEES</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity
                      onPress={() => setCount(c => Math.max(1, c - 1))}
                      style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F4F7', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="remove" size={20} color={THEME.text} />
                    </TouchableOpacity>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 24, color: THEME.text, minWidth: 32, textAlign: 'center' }}>{count}</Text>
                    <TouchableOpacity
                      onPress={() => setCount(c => Math.min(spotsAvailable, c + 1))}
                      style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Ionicons name="add" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>(max {Math.min(spotsAvailable, 10)})</Text>
                  </View>
                </View>
              )}

              {/* Family members */}
              {ticketType === 'FAMILY' && (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted }}>FAMILY MEMBERS (up to 4)</Text>
                  {familyMembers.map((m, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <TextInput
                        value={m.name}
                        onChangeText={v => {
                          const next = [...familyMembers];
                          next[idx] = { ...next[idx], name: v };
                          setFamilyMembers(next);
                        }}
                        placeholder={`Member ${idx + 1} name`}
                        style={{ flex: 2, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 10, padding: 10, fontFamily: FONTS.regular, fontSize: 13, color: THEME.text }}
                      />
                      <TextInput
                        value={m.age !== undefined ? String(m.age) : ''}
                        onChangeText={v => {
                          const next = [...familyMembers];
                          next[idx] = { ...next[idx], age: v ? parseInt(v) : undefined };
                          setFamilyMembers(next);
                        }}
                        placeholder="Age"
                        keyboardType="number-pad"
                        maxLength={3}
                        style={{ flex: 1, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 10, padding: 10, fontFamily: FONTS.regular, fontSize: 13, color: THEME.text }}
                      />
                      {familyMembers.length > 1 && (
                        <TouchableOpacity onPress={() => setFamilyMembers(p => p.filter((_, i) => i !== idx))}>
                          <Ionicons name="close-circle" size={22} color="#CBD5E1" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {familyMembers.length < 4 && (
                    <TouchableOpacity
                      onPress={() => setFamilyMembers(p => [...p, { name: '', age: undefined }])}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                      <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: COLORS.primary }}>Add member</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Group toggle */}
              {exp.group_min_size && exp.price_group && !exp.is_free && ticketType !== 'GROUP' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#065F46' }}>👥 Join Group Booking</Text>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#047857', marginTop: 2 }}>
                      ₹{exp.price_group}/pp vs ₹{exp.price_individual}/pp
                    </Text>
                  </View>
                  <Switch
                    value={isGroup}
                    onValueChange={setIsGroup}
                    trackColor={{ true: '#059669', false: '#CBD5E1' }}
                    thumbColor="#fff"
                  />
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setStep(0)}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.text }}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (!name.trim()) { Alert.alert('Name Required', 'Please enter your name.'); return; }
                    if (!phone.trim() || phone.length < 10) { Alert.alert('Phone Required', 'Enter a valid 10-digit number.'); return; }
                    setStep(2);
                  }}
                  style={{ flex: 2, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Continue →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ─ Step 2: Coupon + Pay ─ */}
          {step === 2 && (
            <View style={{ gap: 14 }}>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text }}>Order Summary</Text>

              {/* Summary card */}
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, gap: 10 }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }} numberOfLines={1}>{exp.title}</Text>
                <Row label="Ticket Type" value={ticketType.charAt(0) + ticketType.slice(1).toLowerCase()} />
                <Row label="Date" value={`${fmtDate(exp.start_date)}, ${exp.start_time}`} />
                <Row label="Venue" value={exp.venue} />
                <Row label="Name" value={name} />
                {ticketType === 'FAMILY' && familyMembers.filter(m => m.name.trim()).length > 0 && (
                  <Row label="Members" value={familyMembers.filter(m => m.name.trim()).map(m => m.name).join(', ')} />
                )}
                {ticketType !== 'FAMILY' && <Row label="Attendees" value={`${count} person${count !== 1 ? 's' : ''}`} />}
                {isGroup && <Row label="Rate" value="Group Rate ✓" valueColor="#059669" />}
                <View style={{ height: 1, backgroundColor: '#E8E9F0' }} />
                {exp.is_free
                  ? <Row label="Total" value="FREE" valueColor="#059669" valueBold />
                  : (
                    <>
                      <Row label="Subtotal" value={`₹${baseAmount.toLocaleString('en-IN')}`} />
                      {coupon?.valid && (
                        <Row label={`Coupon (${coupon.code})`} value={`−₹${discountAmount.toLocaleString('en-IN')}`} valueColor="#059669" />
                      )}
                      <View style={{ height: 1, backgroundColor: '#E8E9F0' }} />
                      <Row label="Total" value={`₹${totalAmount.toLocaleString('en-IN')}`} valueBold />
                    </>
                  )
                }
              </View>

              {/* Coupon input */}
              {!exp.is_free && (
                <View>
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 8 }}>COUPON CODE</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={couponInput}
                      onChangeText={v => { setCouponInput(v.toUpperCase()); setCouponError(''); if (!v) setCoupon(null); }}
                      placeholder="Enter code (e.g. MANA10)"
                      autoCapitalize="characters"
                      editable={!coupon?.valid}
                      style={{
                        flex: 1, borderWidth: 1.5,
                        borderColor: coupon?.valid ? '#059669' : couponError ? '#EF4444' : '#E8E9F0',
                        borderRadius: 12, padding: 12,
                        fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.text,
                        backgroundColor: coupon?.valid ? '#F0FDF4' : '#fff',
                      }}
                    />
                    {coupon?.valid
                      ? (
                        <TouchableOpacity
                          onPress={() => { setCoupon(null); setCouponInput(''); }}
                          style={{ borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}
                        >
                          <Ionicons name="close" size={18} color={THEME.muted} />
                        </TouchableOpacity>
                      )
                      : (
                        <TouchableOpacity
                          onPress={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', opacity: couponInput.trim() ? 1 : 0.5 }}
                        >
                          {couponLoading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>Apply</Text>
                          }
                        </TouchableOpacity>
                      )
                    }
                  </View>
                  {coupon?.valid && (
                    <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#059669', marginTop: 6 }}>✓ {coupon.message}</Text>
                  )}
                  {couponError && (
                    <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#EF4444', marginTop: 6 }}>✗ {couponError}</Text>
                  )}
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                    Try: MANA10, FLAT200, SAVE50, WELCOME
                  </Text>
                </View>
              )}

              {exp.refund_policy && (
                <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#FEF3C7', borderRadius: 12 }}>
                  <Text style={{ fontSize: 14 }}>ℹ️</Text>
                  <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#92400E', flex: 1 }}>{exp.refund_policy}</Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.text }}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePay}
                  disabled={bookMutation.isPending}
                  style={{
                    flex: 2, backgroundColor: totalAmount === 0 ? '#059669' : COLORS.primary,
                    borderRadius: 14, padding: 14, alignItems: 'center', opacity: bookMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {bookMutation.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
                        {totalAmount === 0 ? '✓ Confirm Registration' : `💳 Pay ₹${totalAmount.toLocaleString('en-IN')}`}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ─ Step 3: Done ─ */}
          {step === 3 && booking && (
            <View style={{ gap: 16, alignItems: 'center' }}>
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 38 }}>✅</Text>
              </View>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: THEME.text, textAlign: 'center' }}>
                You're in! See you there.
              </Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted, textAlign: 'center', lineHeight: 20 }}>
                Your booking is confirmed. Show your QR pass at the entrance.
              </Text>

              {/* QR Pass */}
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 20, padding: 20, width: '100%', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: '#E8E9F0', borderStyle: 'dashed' }}>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: THEME.text }}>🎟️ Your Pass</Text>
                <View style={{ width: 120, height: 120, borderRadius: 16, backgroundColor: exp.backdrop_color, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 54 }}>{exp.emoji}</Text>
                </View>
                <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: COLORS.primary, letterSpacing: 1.5 }}>
                  {booking.booking_id}
                </Text>
                <View style={{ width: '100%', gap: 6 }}>
                  <Row label="Event" value={exp.title} />
                  <Row label="Date" value={`${fmtDate(exp.start_date)}, ${exp.start_time}`} />
                  <Row label="Ticket" value={`${ticketType.charAt(0) + ticketType.slice(1).toLowerCase()}`} />
                  {booking.discount_amount && booking.discount_amount > 0 && (
                    <Row label="Saved" value={`₹${booking.discount_amount.toLocaleString('en-IN')}`} valueColor="#059669" />
                  )}
                </View>
              </View>

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
                  onPress={reset}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text }}>Back to Explore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { reset(); router.push('/experiences/my-bookings'); }}
                  style={{ flex: 1, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.bold, fontSize: 13, color: '#fff' }}>My Bookings</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Waitlist Modal ────────────────────────────────────────────────────────────

function WaitlistModal({
  exp,
  visible,
  onClose,
}: {
  exp: Experience;
  visible: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState(false);
  const [position, setPosition] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!name.trim()) { Alert.alert('Name Required'); return; }
    if (!phone.trim() || phone.length < 10) { Alert.alert('Phone Required'); return; }
    setLoading(true);
    try {
      const entry = await experiencesService.joinWaitlist(exp.id, name.trim(), phone.trim());
      setPosition(entry.position);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setName(''); setPhone(''); setDone(false); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={reset}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <LinearGradient
          colors={['#1E3A5F', '#2D5986']}
          style={{ paddingTop: Platform.OS === 'ios' ? 28 : 16, paddingBottom: 20, paddingHorizontal: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: '#fff' }}>
              {done ? '✅ Added to Waitlist' : '📋 Join Waitlist'}
            </Text>
            <TouchableOpacity onPress={reset}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={{ flex: 1, padding: 24, gap: 16 }}>
          {done ? (
            <View style={{ alignItems: 'center', gap: 16, marginTop: 20 }}>
              <Text style={{ fontSize: 56 }}>🔔</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: THEME.text, textAlign: 'center' }}>
                You're #{position} on the waitlist!
              </Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 22 }}>
                We'll notify you as soon as a spot opens up. Keep an eye on your notifications.
              </Text>
              <TouchableOpacity
                onPress={reset}
                style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 }}
              >
                <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Got it!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted, lineHeight: 20 }}>
                This experience is currently full. Join the waitlist and we'll notify you if a spot opens up.
              </Text>
              <View>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 6 }}>YOUR NAME</Text>
                <TextInput
                  value={name} onChangeText={setName} placeholder="Full name"
                  style={{ borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, padding: 13, fontFamily: FONTS.regular, fontSize: 15, color: THEME.text }}
                />
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 6 }}>PHONE</Text>
                <TextInput
                  value={phone} onChangeText={setPhone} placeholder="10-digit number"
                  keyboardType="number-pad" maxLength={10}
                  style={{ borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12, padding: 13, fontFamily: FONTS.regular, fontSize: 15, color: THEME.text }}
                />
              </View>
              <TouchableOpacity
                onPress={handleJoin} disabled={loading}
                style={{ backgroundColor: '#1E3A5F', borderRadius: 14, padding: 16, alignItems: 'center', opacity: loading ? 0.7 : 1, marginTop: 8 }}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>📋 Join Waitlist</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────

function Row({ label, value, valueColor, valueBold }: { label: string; value: string; valueColor?: string; valueBold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>{label}</Text>
      <Text style={{ fontFamily: valueBold ? FONTS.bold : FONTS.semiBold, fontSize: 13, color: valueColor ?? THEME.text, flex: 1, textAlign: 'right' }} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── Detail Screen ─────────────────────────────────────────────────────────────

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showRegModal, setShowRegModal] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);

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
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: meta.color }}>{meta.emoji} {meta.label}</Text>
            </View>
            {exp.organizer_verified && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 11, color: '#fff' }}>✓ Verified</Text>
              </View>
            )}
          </View>

          <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: '#fff', lineHeight: 28 }}>{exp.title}</Text>
          <Text style={{ fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>by {exp.organizer_name}</Text>
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
                <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#059669', marginTop: 2 }}>Group rate: ₹{exp.price_group}/pp</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted }}>{isFull ? 'No spots left' : 'Spots available'}</Text>
              <Text style={{ fontFamily: FONTS.bold, fontSize: 18, color: isFull ? '#DC2626' : spotsLeft <= 10 ? '#D97706' : '#059669', marginTop: 2 }}>
                {isFull ? 'Full' : spotsLeft <= 10 ? `${spotsLeft} left!` : `${spotsLeft} open`}
              </Text>
            </View>
          </View>
          <View style={{ height: 6, backgroundColor: '#F1F4F7', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: progress > 0.9 ? '#DC2626' : progress > 0.7 ? '#D97706' : '#059669', width: `${Math.min(progress * 100, 100)}%` }} />
          </View>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: THEME.muted, marginTop: 5, textAlign: 'right' }}>
            {exp.registered_count} / {exp.capacity} registered
          </Text>
        </View>

        {/* Group Booking */}
        {exp.group_min_size && exp.price_group && !exp.is_free && (
          <View style={{ marginHorizontal: 16, backgroundColor: '#FEF3C7', borderRadius: 18, padding: 16, marginTop: 12 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 14, color: '#92400E', marginBottom: 8 }}>👥 Community Group Booking</Text>
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
            {groupNeeded > 0
              ? <Text style={{ fontFamily: FONTS.medium, fontSize: 12, color: '#78350F' }}>{groupNeeded} more member{groupNeeded !== 1 ? 's' : ''} needed to unlock group pricing{exp.group_deadline ? ` · Deadline: ${fmtDate(exp.group_deadline)}` : ''}</Text>
              : <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: '#059669' }}>✓ Group confirmed! Group rate available.</Text>
            }
          </View>
        )}

        {/* About */}
        <View style={{ marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 12, ...SHADOWS.card }}>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: THEME.text, marginBottom: 10 }}>About this Experience</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.text, lineHeight: 22 }}>{exp.description}</Text>
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
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, borderTopColor: '#EBEFF2', ...SHADOWS.floating }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 20, color: exp.is_free ? '#059669' : COLORS.primary }}>
              {exp.is_free ? 'FREE' : `₹${exp.price_individual?.toLocaleString('en-IN')}`}
            </Text>
            {!exp.is_free && exp.price_group && (
              <Text style={{ fontFamily: FONTS.regular, fontSize: 11, color: '#059669' }}>Group: ₹{exp.price_group}/pp</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => isFull ? setShowWaitlist(true) : setShowRegModal(true)}
            style={{ flex: 2, borderRadius: 14, padding: 15, alignItems: 'center', backgroundColor: isFull ? '#1E3A5F' : exp.is_free ? '#059669' : COLORS.primary }}
          >
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
              {isFull ? '📋 Join Waitlist' : exp.is_free ? '🎟️ Register Free' : '🎟️ Book Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showRegModal && <RegistrationModal exp={exp} visible={showRegModal} onClose={() => setShowRegModal(false)} />}
      {showWaitlist && <WaitlistModal exp={exp} visible={showWaitlist} onClose={() => setShowWaitlist(false)} />}
    </View>
  );
}
