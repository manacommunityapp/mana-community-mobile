import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Platform, StatusBar, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ExperienceCategory, CATEGORY_META } from '@/services/experiencesService';
import { THEME, FONTS, SHADOWS, COLORS } from '@/constants/config';

const CATEGORIES: ExperienceCategory[] = ['MOVIES', 'LIVE_EVENTS', 'SPORTS', 'KIDS_FAMILY', 'WORKSHOPS', 'OUTINGS', 'ONLINE'];

const STEPS = ['Basics', 'Schedule', 'Tickets', 'Submit'] as const;
type Step = 0 | 1 | 2 | 3;

function SectionLabel({ text }: { text: string }) {
  return <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: THEME.muted, marginBottom: 6, marginTop: 4, letterSpacing: 0.5 }}>{text}</Text>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <SectionLabel text={label} />
      {children}
    </View>
  );
}

const INPUT_STYLE = {
  borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 12,
  padding: 13, fontFamily: FONTS.regular, fontSize: 15, color: THEME.text,
  backgroundColor: '#fff',
} as const;

export default function CreateExperienceScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  // Basics
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExperienceCategory>('LIVE_EVENTS');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [venueArea, setVenueArea] = useState('');
  const [capacity, setCapacity] = useState('50');

  // Schedule
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationMins, setDurationMins] = useState('');

  // Tickets
  const [isFree, setIsFree] = useState(true);
  const [priceIndividual, setPriceIndividual] = useState('');
  const [priceGroup, setPriceGroup] = useState('');
  const [groupMinSize, setGroupMinSize] = useState('');
  const [membersOnly, setMembersOnly] = useState(true);
  const [ageSuitability, setAgeSuitability] = useState('');

  // Submitted
  const [submitted, setSubmitted] = useState(false);

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!title.trim()) { Alert.alert('Required', 'Please enter an event title.'); return false; }
      if (!description.trim()) { Alert.alert('Required', 'Please add a description.'); return false; }
      if (!venue.trim()) { Alert.alert('Required', 'Please enter the venue.'); return false; }
      if (!venueArea.trim()) { Alert.alert('Required', 'Please enter the area/locality.'); return false; }
    }
    if (step === 1) {
      if (!startDate.trim()) { Alert.alert('Required', 'Please enter the start date (YYYY-MM-DD).'); return false; }
      if (!startTime.trim()) { Alert.alert('Required', 'Please enter the start time.'); return false; }
    }
    if (step === 2) {
      if (!isFree && !priceIndividual.trim()) { Alert.alert('Required', 'Please enter the ticket price.'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 3) setStep((s) => (s + 1) as Step);
  };

  const handleSubmit = () => {
    if (!validateStep()) return;
    // Simulate API submission
    setTimeout(() => setSubmitted(true), 800);
  };

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar barStyle="dark-content" />
        <Text style={{ fontSize: 64 }}>🎉</Text>
        <Text style={{ fontFamily: FONTS.bold, fontSize: 22, color: THEME.text, marginTop: 16, textAlign: 'center' }}>
          Experience Submitted!
        </Text>
        <Text style={{ fontFamily: FONTS.regular, fontSize: 14, color: THEME.muted, marginTop: 10, textAlign: 'center', lineHeight: 21 }}>
          Your experience listing has been submitted for community review. You'll receive a notification once it's approved and published.
        </Text>
        <View style={{ backgroundColor: '#EEF2FF', borderRadius: 16, padding: 16, marginTop: 24, width: '100%', gap: 6 }}>
          <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary }}>What happens next?</Text>
          <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, lineHeight: 18 }}>
            1. Community admin reviews your listing{'\n'}
            2. You get notified when approved{'\n'}
            3. Members can register immediately after publishing{'\n'}
            4. You receive attendee reports and QR check-in tools
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.replace('/experiences')}
          style={{ marginTop: 28, backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}
        >
          <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>Back to Experiences</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#312E81', '#4F46E5']}
        style={{ paddingTop: Platform.OS === 'ios' ? 54 : 22, paddingBottom: 18, paddingHorizontal: 16 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <TouchableOpacity onPress={() => { if (step === 0) router.back(); else setStep((s) => (s - 1) as Step); }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14 }}>
              {step === 0 ? '← Back' : '← Prev'}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: FONTS.bold, fontSize: 17, color: '#fff' }}>🎪 Host an Experience</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Step indicator */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {STEPS.map((label, i) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: i <= step ? '#fff' : 'rgba(255,255,255,0.2)',
              }}>
                {i < step
                  ? <Ionicons name="checkmark" size={14} color="#312E81" />
                  : <Text style={{ fontFamily: FONTS.bold, fontSize: 11, color: i === step ? '#312E81' : 'rgba(255,255,255,0.6)' }}>{i + 1}</Text>
                }
              </View>
              <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: i <= step ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                {label}
              </Text>
              {i < 3 && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>›</Text>}
            </View>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Step 0: Basics */}
        {step === 0 && (
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginBottom: 20 }}>
              Event Details
            </Text>

            <Field label="TITLE">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Community Diwali Mela 2025"
                style={INPUT_STYLE}
              />
            </Field>

            <Field label="CATEGORY">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {CATEGORIES.map(cat => {
                  const m = CATEGORY_META[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
                        backgroundColor: category === cat ? m.bg : '#F1F4F7',
                        borderWidth: 1.5, borderColor: category === cat ? m.color : 'transparent',
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{m.emoji}</Text>
                      <Text style={{ fontFamily: FONTS.semiBold, fontSize: 12, color: category === cat ? m.color : THEME.muted }}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Field>

            <Field label="DESCRIPTION">
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your experience — what attendees will do, what's included, why they should join…"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={[INPUT_STYLE, { minHeight: 100 }]}
              />
            </Field>

            <Field label="VENUE NAME">
              <TextInput
                value={venue}
                onChangeText={setVenue}
                placeholder="e.g., Community Amphitheatre, Block A"
                style={INPUT_STYLE}
              />
            </Field>

            <Field label="AREA / LOCALITY">
              <TextInput
                value={venueArea}
                onChangeText={setVenueArea}
                placeholder="e.g., Miyapur, Kondapur, Banjara Hills"
                style={INPUT_STYLE}
              />
            </Field>

            <Field label="CAPACITY (MAX ATTENDEES)">
              <TextInput
                value={capacity}
                onChangeText={setCapacity}
                placeholder="50"
                keyboardType="number-pad"
                style={INPUT_STYLE}
              />
            </Field>
          </View>
        )}

        {/* Step 1: Schedule */}
        {step === 1 && (
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginBottom: 20 }}>
              Schedule & Timing
            </Text>

            <Field label="START DATE (YYYY-MM-DD)">
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2025-11-01"
                style={INPUT_STYLE}
              />
            </Field>

            <Field label="START TIME">
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="e.g., 6:00 PM"
                style={INPUT_STYLE}
              />
            </Field>

            <Field label="END DATE (leave blank if same day)">
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2025-11-01"
                style={INPUT_STYLE}
              />
            </Field>

            <Field label="DURATION (MINUTES)">
              <TextInput
                value={durationMins}
                onChangeText={setDurationMins}
                placeholder="e.g., 120"
                keyboardType="number-pad"
                style={INPUT_STYLE}
              />
            </Field>

            <View style={{ backgroundColor: '#EEF2FF', borderRadius: 14, padding: 14, gap: 6 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: COLORS.primary }}>📌 Tip</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, lineHeight: 18 }}>
                For multi-day events (workshops, camps), set the start and end date separately. Attendees will receive reminders before each session.
              </Text>
            </View>
          </View>
        )}

        {/* Step 2: Tickets */}
        {step === 2 && (
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginBottom: 20 }}>
              Ticketing & Access
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, ...SHADOWS.card }}>
              <View>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 15, color: THEME.text }}>Free Event</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, marginTop: 2 }}>No payment required from attendees</Text>
              </View>
              <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: '#059669', false: '#CBD5E1' }} />
            </View>

            {!isFree && (
              <>
                <Field label="INDIVIDUAL TICKET PRICE (₹)">
                  <TextInput
                    value={priceIndividual}
                    onChangeText={setPriceIndividual}
                    placeholder="e.g., 499"
                    keyboardType="decimal-pad"
                    style={INPUT_STYLE}
                  />
                </Field>

                <Field label="GROUP RATE (₹ PER PERSON, OPTIONAL)">
                  <TextInput
                    value={priceGroup}
                    onChangeText={setPriceGroup}
                    placeholder="e.g., 399"
                    keyboardType="decimal-pad"
                    style={INPUT_STYLE}
                  />
                </Field>

                {priceGroup.trim() && (
                  <Field label="MINIMUM GROUP SIZE FOR GROUP RATE">
                    <TextInput
                      value={groupMinSize}
                      onChangeText={setGroupMinSize}
                      placeholder="e.g., 10"
                      keyboardType="number-pad"
                      style={INPUT_STYLE}
                    />
                  </Field>
                )}
              </>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, ...SHADOWS.card }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontFamily: FONTS.semiBold, fontSize: 15, color: THEME.text }}>🔒 Members Only</Text>
                <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: THEME.muted, marginTop: 2, lineHeight: 16 }}>
                  Restrict registration to verified community members
                </Text>
              </View>
              <Switch value={membersOnly} onValueChange={setMembersOnly} trackColor={{ true: COLORS.primary, false: '#CBD5E1' }} />
            </View>

            <Field label="AGE SUITABILITY (OPTIONAL)">
              <TextInput
                value={ageSuitability}
                onChangeText={setAgeSuitability}
                placeholder="e.g., All ages, 18+, Ages 8–14"
                style={INPUT_STYLE}
              />
            </Field>
          </View>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <View>
            <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: THEME.text, marginBottom: 20 }}>
              Review & Submit
            </Text>

            <View style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', ...SHADOWS.card, marginBottom: 20 }}>
              {/* Preview header */}
              <LinearGradient colors={[CATEGORY_META[category].gradient[0], CATEGORY_META[category].gradient[1]]} style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 36 }}>{CATEGORY_META[category].emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 16, color: '#fff' }} numberOfLines={2}>{title || 'Untitled Experience'}</Text>
                    <Text style={{ fontFamily: FONTS.medium, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
                      {CATEGORY_META[category].label}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={{ padding: 16, gap: 10 }}>
                {[
                  { label: 'Date', value: startDate || '—' },
                  { label: 'Time', value: startTime || '—' },
                  { label: 'Venue', value: venue ? `${venue}, ${venueArea}` : '—' },
                  { label: 'Capacity', value: capacity || '50' },
                  { label: 'Ticket', value: isFree ? 'FREE' : priceGroup ? `₹${priceIndividual} / Group ₹${priceGroup}` : `₹${priceIndividual}` },
                  { label: 'Access', value: membersOnly ? 'Members Only' : 'Open to All' },
                ].map(row => (
                  <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: FONTS.regular, fontSize: 13, color: THEME.muted }}>{row.label}</Text>
                    <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: THEME.text, flex: 1, textAlign: 'right' }} numberOfLines={1}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, marginBottom: 20, gap: 6 }}>
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 13, color: '#92400E' }}>⚠️ Before you submit</Text>
              <Text style={{ fontFamily: FONTS.regular, fontSize: 12, color: '#78350F', lineHeight: 18 }}>
                • Your listing will be reviewed by the community administrator{'\n'}
                • Approved events are published and visible to members{'\n'}
                • You can edit details before approval{'\n'}
                • Ensure all information is accurate and your event is a real offering
              </Text>
            </View>
          </View>
        )}

        {/* Navigation buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          {step > 0 && (
            <TouchableOpacity
              onPress={() => setStep((s) => (s - 1) as Step)}
              style={{ flex: 1, borderWidth: 1.5, borderColor: '#E8E9F0', borderRadius: 14, padding: 14, alignItems: 'center' }}
            >
              <Text style={{ fontFamily: FONTS.semiBold, fontSize: 14, color: THEME.text }}>← Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={step === 3 ? handleSubmit : handleNext}
            style={{ flex: 2, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center' }}
          >
            <Text style={{ fontFamily: FONTS.bold, fontSize: 15, color: '#fff' }}>
              {step === 3 ? '🚀 Submit for Review' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
