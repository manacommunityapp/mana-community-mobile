import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '@/services/jobService';
import { JOB_CATEGORY_META, JOB_TYPE_LABEL } from '@/components/jobs/JobCard';
import { COLORS } from '@/constants/config';
import type { JobCategory, JobType, PayType } from '@/types/api';

const PAY_TYPES: { key: PayType; label: string; desc: string }[] = [
  { key: 'HOURLY',     label: '₹/hr',     desc: 'Hourly rate'     },
  { key: 'FIXED',      label: '₹ Fixed',  desc: 'One-time amount' },
  { key: 'NEGOTIABLE', label: 'Negotiate',desc: 'Discuss later'   },
  { key: 'VOLUNTEER',  label: 'Free',     desc: 'No pay'          },
];

const CATEGORIES = Object.entries(JOB_CATEGORY_META) as [JobCategory, { emoji: string; label: string }][];
const JOB_TYPES  = Object.entries(JOB_TYPE_LABEL)  as [JobType, string][];

export default function CreateJobScreen() {
  const router = useRouter();
  const qc     = useQueryClient();

  const [title,      setTitle]      = useState('');
  const [description,setDesc]       = useState('');
  const [category,   setCategory]   = useState<JobCategory>('HOME_REPAIRS');
  const [jobType,    setJobType]     = useState<JobType>('ONE_TIME');
  const [payType,    setPayType]     = useState<PayType>('NEGOTIABLE');
  const [payAmount,  setPayAmount]   = useState('');
  const [location,   setLocation]   = useState('Within community');
  const [showFlat,   setShowFlat]   = useState(true);

  const createMutation = useMutation({
    mutationFn: () => jobService.createJob({
      title:       title.trim(),
      description: description.trim(),
      category,
      jobType,
      payType,
      payAmount:   payAmount ? Number(payAmount) : undefined,
      location:    location.trim() || undefined,
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
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Post a Job</Text>
        <TouchableOpacity onPress={() => createMutation.mutate()} disabled={!canPost || createMutation.isPending}>
          {createMutation.isPending
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={[s.post, !canPost && s.postDisabled]}>Post</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Title */}
          <View style={s.section}>
            <Text style={s.label}>Job title *</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Need a plumber for bathroom repair"
              placeholderTextColor={COLORS.textMuted}
              maxLength={80}
              autoFocus
            />
          </View>

          {/* Description */}
          <View style={s.section}>
            <Text style={s.label}>Description *</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={description}
              onChangeText={setDesc}
              placeholder="Describe the work, requirements, timing…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={800}
            />
            <Text style={s.charCount}>{description.length}/800</Text>
          </View>

          {/* Category */}
          <View style={s.section}>
            <Text style={s.label}>Category *</Text>
            <View style={s.grid}>
              {CATEGORIES.map(([key, meta]) => (
                <TouchableOpacity
                  key={key}
                  style={[s.gridItem, category === key && s.gridItemActive]}
                  onPress={() => setCategory(key)}
                >
                  <Text style={s.gridEmoji}>{meta.emoji}</Text>
                  <Text style={[s.gridLabel, category === key && s.gridLabelActive]} numberOfLines={1}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Job type */}
          <View style={s.section}>
            <Text style={s.label}>Type</Text>
            <View style={s.rowChips}>
              {JOB_TYPES.map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[s.rowChip, jobType === key && s.rowChipActive]}
                  onPress={() => setJobType(key)}
                >
                  <Text style={[s.rowChipText, jobType === key && s.rowChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pay */}
          <View style={s.section}>
            <Text style={s.label}>Compensation</Text>
            <View style={s.rowChips}>
              {PAY_TYPES.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[s.rowChip, payType === p.key && s.rowChipActive]}
                  onPress={() => setPayType(p.key)}
                >
                  <Text style={[s.rowChipText, payType === p.key && s.rowChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {needsAmount && (
              <TextInput
                style={[s.input, { marginTop: 10 }]}
                value={payAmount}
                onChangeText={(v) => setPayAmount(v.replace(/[^0-9]/g, ''))}
                placeholder={payType === 'HOURLY' ? 'Hourly rate (₹)' : 'Fixed amount (₹)'}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
            )}
          </View>

          {/* Location */}
          <View style={s.section}>
            <Text style={s.label}>Location</Text>
            <TextInput
              style={s.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Within community, Remote, Block A"
              placeholderTextColor={COLORS.textMuted}
              maxLength={60}
            />
          </View>

          {/* Privacy */}
          <View style={s.section}>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Show my flat number</Text>
                <Text style={s.hint}>Applicants will see your flat in your listing</Text>
              </View>
              <Switch
                value={showFlat}
                onValueChange={setShowFlat}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel:          { fontSize: 16, color: COLORS.textMuted },
  title:           { fontSize: 17, fontWeight: '700', color: COLORS.text },
  post:            { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  postDisabled:    { color: COLORS.textMuted },
  scroll:          { padding: 16, gap: 14 },
  section:         { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  label:           { fontSize: 14, fontWeight: '600', color: COLORS.text },
  hint:            { fontSize: 12, color: COLORS.textMuted, marginTop: -6 },
  input:           { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  textArea:        { minHeight: 100, lineHeight: 22 },
  charCount:       { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem:        { width: '30%', alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  gridItemActive:  { backgroundColor: '#EEF2FF', borderColor: COLORS.primary },
  gridEmoji:       { fontSize: 20 },
  gridLabel:       { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center' },
  gridLabelActive: { color: COLORS.primary, fontWeight: '700' },
  rowChips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowChip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: COLORS.border },
  rowChipActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rowChipText:     { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  rowChipTextActive:{ color: '#fff', fontWeight: '700' },
  toggleRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
