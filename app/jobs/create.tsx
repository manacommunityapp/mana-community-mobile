import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { jobService } from '@/services/jobService';
import { JOB_CATEGORY_META, JOB_TYPE_LABEL } from '@/components/jobs/JobCard';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import type { JobCategory, JobType, PayType } from '@/types/api';

const PAY_TYPES: { key: PayType; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'HOURLY',     label: 'Hourly (₹)', desc: 'Set per hr rate', icon: 'time-outline' },
  { key: 'FIXED',      label: 'Fixed (₹)',  desc: 'Fixed lump-sum',  icon: 'cash-outline' },
  { key: 'NEGOTIABLE', label: 'Negotiate',  desc: 'Discuss with neighbor', icon: 'chatbubbles-outline' },
  { key: 'VOLUNTEER',  label: 'Volunteer',  desc: 'Free community help',  icon: 'heart-outline' },
];

const CATEGORIES = Object.entries(JOB_CATEGORY_META) as [
  JobCategory,
  { emoji: string; label: string; bg: string; color: string }
][];
const JOB_TYPES = Object.entries(JOB_TYPE_LABEL) as [JobType, string][];

export default function CreateJobScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [category, setCategory] = useState<JobCategory>('HOME_REPAIRS');
  const [jobType, setJobType] = useState<JobType>('ONE_TIME');
  const [payType, setPayType] = useState<PayType>('NEGOTIABLE');
  const [payAmount, setPayAmount] = useState('');
  const [location, setLocation] = useState('Within community');
  const [showFlat, setShowFlat] = useState(true);

  const createMutation = useMutation({
    mutationFn: () =>
      jobService.createJob({
        title: title.trim(),
        description: description.trim(),
        category,
        jobType,
        payType,
        payAmount: payAmount ? Number(payAmount) : undefined,
        location: location.trim() || 'Within community',
        showFlat,
      }),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['jobs-mine'] });
      router.replace(`/jobs/${job.id}`);
    },
    onError: (err: any) =>
      Alert.alert('Error', err?.response?.data?.message ?? 'Failed to post job.'),
  });

  const needsAmount = payType === 'HOURLY' || payType === 'FIXED';
  const canPost = title.trim().length > 0 && description.trim().length > 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Modern Header */}
      <Header
        title="Post an Opportunity"
        subtitle="Community Task & Job Listing"
        leftIcon="close"
        onLeftPress={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title & Description Card */}
          <View style={s.card}>
            <Text style={s.sectionHeader}>Task Overview</Text>

            <View style={s.inputGroup}>
              <Text style={s.label}>Job Title *</Text>
              <TextInput
                style={s.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Need help assembling IKEA furniture"
                placeholderTextColor={COLORS.textMuted}
                maxLength={80}
              />
            </View>

            <View style={s.inputGroup}>
              <View style={s.labelRow}>
                <Text style={s.label}>Description *</Text>
                <Text style={s.charCount}>{description.length}/800</Text>
              </View>
              <TextInput
                style={[s.input, s.textArea]}
                value={description}
                onChangeText={setDesc}
                placeholder="Describe what needs to be done, schedule, and any required tools or skills…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                textAlignVertical="top"
                maxLength={800}
              />
            </View>
          </View>

          {/* Category Selector Card */}
          <View style={s.card}>
            <Text style={s.sectionHeader}>Category *</Text>
            <View style={s.grid}>
              {CATEGORIES.map(([key, meta]) => {
                const isSelected = category === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      s.gridItem,
                      isSelected && s.gridItemActive,
                    ]}
                    onPress={() => setCategory(key)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        s.gridEmojiWrap,
                        { backgroundColor: meta.bg },
                        isSelected && { backgroundColor: '#EEF2FF' },
                      ]}
                    >
                      <Text style={s.gridEmoji}>{meta.emoji}</Text>
                    </View>
                    <Text
                      style={[s.gridLabel, isSelected && s.gridLabelActive]}
                      numberOfLines={1}
                    >
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Job Type & Engagement */}
          <View style={s.card}>
            <Text style={s.sectionHeader}>Type of Engagement</Text>
            <View style={s.rowChips}>
              {JOB_TYPES.map(([key, label]) => {
                const isSelected = jobType === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.rowChip, isSelected && s.rowChipActive]}
                    onPress={() => setJobType(key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[s.rowChipText, isSelected && s.rowChipTextActive]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Compensation Section */}
          <View style={s.card}>
            <Text style={s.sectionHeader}>Compensation & Pay</Text>
            <View style={s.payGrid}>
              {PAY_TYPES.map((p) => {
                const isSelected = payType === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[s.payCard, isSelected && s.payCardActive]}
                    onPress={() => setPayType(p.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={p.icon}
                      size={20}
                      color={isSelected ? COLORS.primary : '#64748B'}
                    />
                    <Text
                      style={[s.payLabel, isSelected && s.payLabelActive]}
                    >
                      {p.label}
                    </Text>
                    <Text style={s.payDesc}>{p.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {needsAmount && (
              <View style={[s.inputGroup, { marginTop: 12 }]}>
                <Text style={s.label}>Amount (in ₹) *</Text>
                <View style={s.amountInputWrap}>
                  <Text style={s.currencyPrefix}>₹</Text>
                  <TextInput
                    style={s.amountInput}
                    value={payAmount}
                    onChangeText={(v) => setPayAmount(v.replace(/[^0-9]/g, ''))}
                    placeholder={
                      payType === 'HOURLY' ? 'Hourly rate (e.g. 350)' : 'Total amount (e.g. 1200)'
                    }
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Location & Visibility */}
          <View style={s.card}>
            <Text style={s.sectionHeader}>Location & Privacy</Text>

            <View style={s.inputGroup}>
              <Text style={s.label}>Task Location</Text>
              <TextInput
                style={s.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Tower B - Flat 402, Clubhouse, or Remote"
                placeholderTextColor={COLORS.textMuted}
                maxLength={60}
              />
            </View>

            <View style={s.toggleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={s.label}>Display Flat / Unit in Listing</Text>
                <Text style={s.hint}>
                  Enabling this helps verified neighbors know your block and flat.
                </Text>
              </View>
              <Switch
                value={showFlat}
                onValueChange={setShowFlat}
                trackColor={{ false: '#E2E8F0', true: COLORS.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Submit Bottom Bar */}
      <View style={s.submitBar}>
        <TouchableOpacity
          style={[s.submitBtn, !canPost && s.submitBtnDisabled]}
          onPress={() => createMutation.mutate()}
          disabled={!canPost || createMutation.isPending}
          activeOpacity={0.85}
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={s.submitBtnText}>Publish Job Listing</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: FONTS.displayBold,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.medium,
    color: '#1E293B',
  },
  hint: {
    fontSize: 11.5,
    color: '#64748B',
    fontFamily: FONTS.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    fontFamily: FONTS.regular,
  },
  textArea: {
    minHeight: 100,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: FONTS.regular,
  },

  // ── Category Grid ──────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  gridItemActive: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  gridEmojiWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEmoji: {
    fontSize: 16,
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
  gridLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── Engagement Chips ───────────────────────────────────────────────
  rowChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  rowChipText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  rowChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── Compensation Grid ──────────────────────────────────────────────
  payGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  payCard: {
    width: '48%',
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  payCardActive: {
    backgroundColor: '#EEF2FF',
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  payLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  payLabelActive: {
    color: COLORS.primary,
  },
  payDesc: {
    fontSize: 10.5,
    color: '#64748B',
    fontFamily: FONTS.regular,
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 10,
    fontFamily: FONTS.bold,
  },

  // ── Toggle Row ─────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },

  // ── Floating Submit Bar ────────────────────────────────────────────
  submitBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    ...SHADOWS.sm,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
});

