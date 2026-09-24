import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { jobService } from '@/services/jobService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS } from '@/constants/config';
import {
  JOB_CATEGORY_META, JOB_TYPE_LABEL,
} from '@/components/jobs/JobCard';
import type { JobApplicationDto } from '@/types/api';

function payDisplay(payType: string, payAmount?: number): string {
  if (payType === 'VOLUNTEER')   return '🤝 Volunteer / No pay';
  if (payType === 'NEGOTIABLE')  return '💬 Pay negotiable';
  if (!payAmount)                return payType === 'HOURLY' ? 'Hourly rate TBD' : 'Fixed pay TBD';
  return payType === 'HOURLY'
    ? `₹${payAmount}/hour`
    : `₹${payAmount.toLocaleString('en-IN')} fixed`;
}

// ── Applicant card (poster's view) ────────────────────────────────────────
function ApplicantRow({
  app, jobId, isMyJob,
}: { app: JobApplicationDto; jobId: number; isMyJob: boolean }) {
  const qc = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: () => jobService.acceptApplication(jobId, app.id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['job-applications', jobId] }),
  });
  const rejectMutation = useMutation({
    mutationFn: () => jobService.rejectApplication(jobId, app.id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['job-applications', jobId] }),
  });

  const statusColor = app.status === 'ACCEPTED'
    ? COLORS.success
    : app.status === 'REJECTED'
    ? COLORS.error
    : COLORS.textMuted;

  return (
    <View style={ar.row}>
      <View style={ar.avatar}>
        <Text style={ar.avatarText}>{app.applicantName[0]}</Text>
      </View>
      <View style={ar.info}>
        <Text style={ar.name}>{app.applicantName}</Text>
        {app.applicantFlat && <Text style={ar.flat}>🏠 {app.applicantFlat}</Text>}
        <Text style={ar.message} numberOfLines={2}>{app.coverMessage}</Text>
        <Text style={ar.time}>
          Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
        </Text>
      </View>
      <View style={ar.actions}>
        {app.status === 'PENDING' && isMyJob ? (
          <>
            <TouchableOpacity
              style={ar.acceptBtn}
              onPress={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
            >
              <Text style={ar.acceptText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ar.rejectBtn}
              onPress={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
            >
              <Text style={ar.rejectText}>✕</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[ar.statusLabel, { color: statusColor }]}>
            {app.status.charAt(0) + app.status.slice(1).toLowerCase()}
          </Text>
        )}
      </View>
    </View>
  );
}

const ar = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  info:        { flex: 1, gap: 2 },
  name:        { fontSize: 14, fontWeight: '600', color: COLORS.text },
  flat:        { fontSize: 12, color: COLORS.textMuted },
  message:     { fontSize: 13, color: COLORS.text, lineHeight: 18, marginTop: 2 },
  time:        { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  actions:     { alignItems: 'flex-end', gap: 6, justifyContent: 'center' },
  acceptBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  acceptText:  { fontSize: 16, fontWeight: '800', color: COLORS.success },
  rejectBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  rejectText:  { fontSize: 16, fontWeight: '800', color: COLORS.error },
  statusLabel: { fontSize: 12, fontWeight: '700' },
});

// ── Main screen ────────────────────────────────────────────────────────────
export default function JobDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const qc        = useQueryClient();
  const { user }  = useAuth();

  const [applyVisible, setApplyVisible] = useState(false);
  const [coverMessage, setCoverMessage] = useState('');

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn:  () => jobService.getJob(Number(id)),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['job-applications', id],
    queryFn:  () => jobService.getApplications(Number(id)),
    enabled:  !!job && job.posterId === user?.id,
  });

  const applyMutation = useMutation({
    mutationFn: () => jobService.applyForJob(Number(id), { coverMessage: coverMessage.trim() }),
    onSuccess: () => {
      setApplyVisible(false);
      setCoverMessage('');
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err: any) =>
      Alert.alert('Error', err?.response?.data?.message ?? 'Could not submit application.'),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => jobService.withdrawApplication(Number(id)),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => jobService.closeJob(Number(id)),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['job', id] }),
  });

  const fillMutation = useMutation({
    mutationFn: () => jobService.markFilled(Number(id)),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['job', id] }),
  });

  if (isLoading) {
    return (
      <SafeAreaView style={scr.container} edges={['top']}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.primary} size="large" />
      </SafeAreaView>
    );
  }
  if (!job) return null;

  const isMyJob   = job.posterId === user?.id;
  const isOpen    = job.status === 'OPEN';
  const meta      = JOB_CATEGORY_META[job.category] ?? JOB_CATEGORY_META.OTHER;
  const canApply  = !isMyJob && isOpen && !job.hasApplied;
  const canWithdraw = !isMyJob && job.hasApplied && job.myApplicationStatus === 'PENDING';

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      <View style={scr.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={scr.back}>‹</Text>
        </TouchableOpacity>
        <Text style={scr.headerTitle}>Job Details</Text>
        {isMyJob && isOpen && (
          <TouchableOpacity
            style={scr.filledBtn}
            onPress={() => Alert.alert('Mark Filled', 'Mark this job as filled?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Mark Filled', onPress: () => fillMutation.mutate() },
            ])}
          >
            <Text style={scr.filledBtnText}>✓ Filled</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={scr.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={scr.hero}>
          <View style={scr.heroIcon}>
            <Text style={scr.heroEmoji}>{meta.emoji}</Text>
          </View>
          <View style={scr.heroText}>
            <Text style={scr.jobTitle}>{job.title}</Text>
            <Text style={scr.posterName}>
              {job.posterName}{job.posterFlat ? ` · ${job.posterFlat}` : ''}
            </Text>
            <Text style={scr.postedTime}>
              Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </View>

        {/* Quick stats */}
        <View style={scr.statsRow}>
          <View style={scr.stat}>
            <Text style={scr.statVal}>{payDisplay(job.payType, job.payAmount)}</Text>
            <Text style={scr.statLabel}>Compensation</Text>
          </View>
          <View style={scr.statDivider} />
          <View style={scr.stat}>
            <Text style={scr.statVal}>{JOB_TYPE_LABEL[job.jobType] ?? job.jobType}</Text>
            <Text style={scr.statLabel}>Type</Text>
          </View>
          <View style={scr.statDivider} />
          <View style={scr.stat}>
            <Text style={scr.statVal}>{job.applicationCount}</Text>
            <Text style={scr.statLabel}>Applied</Text>
          </View>
        </View>

        {/* Tags */}
        <View style={scr.tags}>
          <View style={scr.tag}><Text style={scr.tagText}>{meta.label}</Text></View>
          {job.location && <View style={scr.tag}><Text style={scr.tagText}>📍 {job.location}</Text></View>}
          {job.expiresAt && (
            <View style={scr.tag}>
              <Text style={scr.tagText}>
                ⏰ Expires {formatDistanceToNow(new Date(job.expiresAt), { addSuffix: true })}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={scr.section}>
          <Text style={scr.sectionTitle}>About this role</Text>
          <Text style={scr.description}>{job.description}</Text>
        </View>

        {/* My application status (non-poster) */}
        {job.hasApplied && (
          <View style={[
            scr.appliedBanner,
            job.myApplicationStatus === 'ACCEPTED' && scr.appliedBannerSuccess,
            job.myApplicationStatus === 'REJECTED' && scr.appliedBannerError,
          ]}>
            <Text style={scr.appliedBannerText}>
              {job.myApplicationStatus === 'ACCEPTED'
                ? '🎉 Your application was accepted! The poster will reach out.'
                : job.myApplicationStatus === 'REJECTED'
                ? '❌ Your application was not selected for this role.'
                : '⏳ Application submitted — waiting for the poster\'s decision.'}
            </Text>
          </View>
        )}

        {/* Applicants section (poster only) */}
        {isMyJob && (
          <View style={scr.section}>
            <Text style={scr.sectionTitle}>
              Applicants ({applications.length})
            </Text>
            {applications.length === 0 ? (
              <Text style={scr.noApplicants}>No applications yet.</Text>
            ) : (
              applications.map((app) => (
                <ApplicantRow key={app.id} app={app} jobId={Number(id)} isMyJob={isMyJob} />
              ))
            )}
          </View>
        )}

        {/* Poster actions */}
        {isMyJob && isOpen && (
          <TouchableOpacity
            style={scr.closeJobBtn}
            onPress={() => Alert.alert('Close Job', 'Close this posting?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Close',  style: 'destructive', onPress: () => closeMutation.mutate() },
            ])}
          >
            <Text style={scr.closeJobText}>Close Posting</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Apply / Withdraw CTA */}
      {canApply && (
        <View style={scr.cta}>
          <TouchableOpacity style={scr.applyBtn} onPress={() => setApplyVisible(true)} activeOpacity={0.85}>
            <Text style={scr.applyBtnText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      )}
      {canWithdraw && (
        <View style={scr.cta}>
          <TouchableOpacity
            style={scr.withdrawBtn}
            onPress={() => Alert.alert('Withdraw', 'Withdraw your application?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Withdraw', style: 'destructive', onPress: () => withdrawMutation.mutate() },
            ])}
          >
            <Text style={scr.withdrawText}>Withdraw Application</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Apply modal */}
      <Modal visible={applyVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
          <View style={modal.header}>
            <TouchableOpacity onPress={() => setApplyVisible(false)}>
              <Text style={modal.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={modal.title}>Apply for Job</Text>
            <TouchableOpacity
              onPress={() => applyMutation.mutate()}
              disabled={!coverMessage.trim() || applyMutation.isPending}
            >
              {applyMutation.isPending
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={[modal.send, !coverMessage.trim() && modal.sendDisabled]}>Submit</Text>
              }
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={modal.scroll} keyboardShouldPersistTaps="handled">
              <View style={modal.jobSummary}>
                <Text style={modal.jobSummaryEmoji}>{meta.emoji}</Text>
                <View>
                  <Text style={modal.jobSummaryTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={modal.jobSummaryPoster}>{job.posterName}</Text>
                </View>
              </View>
              <Text style={modal.label}>Cover message *</Text>
              <Text style={modal.hint}>
                Introduce yourself and explain why you're a great fit.
              </Text>
              <TextInput
                style={modal.input}
                value={coverMessage}
                onChangeText={setCoverMessage}
                placeholder="Hi, I'm interested in this role because…"
                placeholderTextColor={COLORS.textMuted}
                multiline
                textAlignVertical="top"
                maxLength={500}
                autoFocus
              />
              <Text style={modal.charCount}>{coverMessage.length}/500</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const scr = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  back:               { fontSize: 30, color: COLORS.primary, lineHeight: 34, fontWeight: '300' },
  headerTitle:        { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1 },
  filledBtn:          { backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  filledBtnText:      { fontSize: 13, fontWeight: '700', color: '#065F46' },
  scroll:             { padding: 16, gap: 16 },
  hero:               { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  heroIcon:           { width: 56, height: 56, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroEmoji:          { fontSize: 28 },
  heroText:           { flex: 1, gap: 3 },
  jobTitle:           { fontSize: 20, fontWeight: '800', color: COLORS.text, lineHeight: 26 },
  posterName:         { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  postedTime:         { fontSize: 12, color: COLORS.textMuted },
  statsRow:           { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  stat:               { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statVal:            { fontSize: 13, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  statLabel:          { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statDivider:        { width: 1, backgroundColor: COLORS.border },
  tags:               { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:                { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  tagText:            { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  section:            { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle:       { fontSize: 14, fontWeight: '700', color: COLORS.text },
  description:        { fontSize: 15, color: COLORS.text, lineHeight: 23 },
  noApplicants:       { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 16 },
  appliedBanner:      { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#C7D2FE' },
  appliedBannerSuccess:{ backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  appliedBannerError: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  appliedBannerText:  { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  closeJobBtn:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  closeJobText:       { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  cta:                { padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  applyBtn:           { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  applyBtnText:       { color: '#fff', fontWeight: '800', fontSize: 16 },
  withdrawBtn:        { borderWidth: 1, borderColor: COLORS.error, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  withdrawText:       { color: COLORS.error, fontWeight: '700', fontSize: 15 },
});

const modal = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel:          { fontSize: 16, color: COLORS.textMuted },
  title:           { fontSize: 17, fontWeight: '700', color: COLORS.text },
  send:            { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  sendDisabled:    { color: COLORS.textMuted },
  scroll:          { padding: 16, gap: 12 },
  jobSummary:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12, marginBottom: 4 },
  jobSummaryEmoji: { fontSize: 26 },
  jobSummaryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  jobSummaryPoster:{ fontSize: 12, color: COLORS.primary, opacity: 0.7 },
  label:           { fontSize: 15, fontWeight: '600', color: COLORS.text },
  hint:            { fontSize: 13, color: COLORS.textMuted },
  input:           { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, color: COLORS.text, minHeight: 140, backgroundColor: COLORS.surface },
  charCount:       { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
});
