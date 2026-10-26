import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { jobService } from '@/services/jobService';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, SHADOWS, RADIUS, FONTS, getInitials } from '@/constants/config';
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
        <Text style={ar.avatarText}>{getInitials(app.applicantName)}</Text>
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
  avatarText:  { color: '#fff', fontFamily: 'DMSans-Bold', fontWeight: '700', fontSize: 14 },
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
    enabled:  !!job && (job.postedById ?? job.posterId) === user?.id,
  });

  const applyMutation = useMutation({
    mutationFn: () => jobService.applyForJob(Number(id), { jobId: Number(id), coverMessage: coverMessage.trim() }),
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

  const posterId = job.postedById ?? job.posterId;
  const isMyJob   = posterId === user?.id;
  const isOpen    = job.status === 'OPEN';
  const meta      = JOB_CATEGORY_META[job.category ?? 'OTHER'] ?? JOB_CATEGORY_META.OTHER;
  const canApply  = !isMyJob && isOpen && !job.hasApplied;
  const canWithdraw = !isMyJob && job.hasApplied && job.myApplicationStatus === 'PENDING';

  return (
    <SafeAreaView style={scr.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <Header
        title="Job Details"
        subtitle={meta.label}
        leftIcon="arrow-back"
        onLeftPress={() => router.back()}
        actions={
          isMyJob && isOpen
            ? [
                {
                  icon: 'checkmark-circle-outline',
                  onPress: () =>
                    Alert.alert('Mark Filled', 'Mark this job as filled?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Mark Filled', onPress: () => fillMutation.mutate() },
                    ]),
                },
              ]
            : undefined
        }
      />

      <ScrollView contentContainerStyle={scr.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={scr.heroCard}>
          <View style={scr.heroTop}>
            <View style={[scr.heroIcon, { backgroundColor: meta.bg }]}>
              <Text style={scr.heroEmoji}>{meta.emoji}</Text>
            </View>
            <View style={scr.heroTitleGroup}>
              <Text style={scr.jobTitle}>{job.title}</Text>
              <View style={scr.posterRow}>
                <Ionicons name="person-circle-outline" size={14} color="#64748B" />
                <Text style={scr.posterName}>
                  {job.postedByName || job.posterName || 'Neighbor'}
                  {(job.postedByFlat || job.posterFlat) ? ` • ${job.postedByFlat || job.posterFlat}` : ''}
                </Text>
              </View>
            </View>
          </View>

          <View style={scr.postedTimeRow}>
            <Ionicons name="time-outline" size={13} color="#94A3B8" />
            <Text style={scr.postedTime}>
              Posted {formatDistanceToNow(new Date(job.createdAt || job.postedAt || Date.now()), { addSuffix: true })}
            </Text>
            {job.location && (
              <>
                <Text style={scr.dotSeparator}>•</Text>
                <Ionicons name="location-outline" size={13} color="#94A3B8" />
                <Text style={scr.postedTime}>{job.location}</Text>
              </>
            )}
          </View>

          {/* Quick stats ribbon */}
          <View style={scr.statsRow}>
            <View style={scr.stat}>
              <Text style={scr.statVal}>{payDisplay(job.payType ?? 'FIXED', job.payAmount)}</Text>
              <Text style={scr.statLabel}>Compensation</Text>
            </View>
            <View style={scr.statDivider} />
            <View style={scr.stat}>
              <Text style={scr.statVal}>
                {JOB_TYPE_LABEL[(job.jobType || job.type || 'ONE_TIME') as keyof typeof JOB_TYPE_LABEL] ?? (job.jobType || job.type || 'One-time')}
              </Text>
              <Text style={scr.statLabel}>Type</Text>
            </View>
            <View style={scr.statDivider} />
            <View style={scr.stat}>
              <Text style={scr.statVal}>{job.applicationCount ?? job.applicantCount ?? 0}</Text>
              <Text style={scr.statLabel}>Applicants</Text>
            </View>
          </View>
        </View>

        {/* Tags */}
        <View style={scr.tags}>
          <View style={scr.tag}>
            <Text style={scr.tagText}>{meta.label}</Text>
          </View>
          {job.location && (
            <View style={scr.tag}>
              <Text style={scr.tagText}>📍 {job.location}</Text>
            </View>
          )}
          {job.expiresAt && (
            <View style={[scr.tag, scr.tagExpiring]}>
              <Text style={scr.tagExpiringText}>
                ⏰ Expires {formatDistanceToNow(new Date(job.expiresAt), { addSuffix: true })}
              </Text>
            </View>
          )}
        </View>

        {/* Description Section */}
        <View style={scr.section}>
          <Text style={scr.sectionTitle}>About this Role</Text>
          <Text style={scr.description}>{job.description}</Text>
        </View>

        {/* My application status (non-poster) */}
        {job.hasApplied && (
          <View style={[
            scr.appliedBanner,
            job.myApplicationStatus === 'ACCEPTED' && scr.appliedBannerSuccess,
            job.myApplicationStatus === 'REJECTED' && scr.appliedBannerError,
          ]}>
            <Ionicons
              name={
                job.myApplicationStatus === 'ACCEPTED'
                  ? 'checkmark-circle'
                  : job.myApplicationStatus === 'REJECTED'
                  ? 'close-circle'
                  : 'time'
              }
              size={20}
              color={
                job.myApplicationStatus === 'ACCEPTED'
                  ? '#059669'
                  : job.myApplicationStatus === 'REJECTED'
                  ? '#DC2626'
                  : COLORS.primary
              }
            />
            <Text style={scr.appliedBannerText}>
              {job.myApplicationStatus === 'ACCEPTED'
                ? 'Your application was accepted! The poster will reach out to you.'
                : job.myApplicationStatus === 'REJECTED'
                ? 'Your application was not selected for this role.'
                : 'Application submitted — waiting for the poster\'s review.'}
            </Text>
          </View>
        )}

        {/* Applicants section (poster only) */}
        {isMyJob && (
          <View style={scr.section}>
            <View style={scr.sectionHeaderRow}>
              <Text style={scr.sectionTitle}>Applicants</Text>
              <View style={scr.applicantBadge}>
                <Text style={scr.applicantBadgeText}>{applications.length}</Text>
              </View>
            </View>
            {applications.length === 0 ? (
              <View style={scr.noApplicantsBox}>
                <Ionicons name="people-outline" size={32} color="#94A3B8" />
                <Text style={scr.noApplicants}>No neighbor applications yet.</Text>
              </View>
            ) : (
              applications.map((app) => (
                <ApplicantRow key={app.id} app={app} jobId={Number(id)} isMyJob={isMyJob} />
              ))
            )}
          </View>
        )}

        {/* Poster close action */}
        {isMyJob && isOpen && (
          <TouchableOpacity
            style={scr.closeJobBtn}
            onPress={() => Alert.alert('Close Job', 'Are you sure you want to close this posting?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Close',  style: 'destructive', onPress: () => closeMutation.mutate() },
            ])}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={scr.closeJobText}>Close Posting</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Apply / Withdraw CTA Bottom Bar */}
      {canApply && (
        <View style={scr.cta}>
          <TouchableOpacity
            style={scr.applyBtn}
            onPress={() => setApplyVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={17} color="#FFFFFF" />
            <Text style={scr.applyBtnText}>Apply for this Role</Text>
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
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle-outline" size={17} color={COLORS.error} />
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    padding: 16,
    gap: 14,
  },

  // ── Hero Card ───────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  heroTop: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroEmoji: {
    fontSize: 26,
  },
  heroTitleGroup: {
    flex: 1,
    gap: 4,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: FONTS.displayBold,
    color: '#0F172A',
    lineHeight: 24,
  },
  posterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  posterName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    fontFamily: FONTS.medium,
  },
  postedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    marginBottom: 14,
  },
  postedTime: {
    fontSize: 11.5,
    color: '#64748B',
    fontFamily: FONTS.regular,
  },
  dotSeparator: {
    color: '#94A3B8',
    marginHorizontal: 4,
  },

  // ── Stats Row ───────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingVertical: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontFamily: FONTS.medium,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },

  // ── Tags ────────────────────────────────────────────────────────────
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  tagExpiring: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  tagExpiringText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 11.5,
  },

  // ── Section ─────────────────────────────────────────────────────────
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: FONTS.displayBold,
    color: '#0F172A',
  },
  applicantBadge: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  applicantBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  description: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontFamily: FONTS.regular,
  },
  noApplicantsBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  noApplicants: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: FONTS.medium,
  },

  // ── Banners ─────────────────────────────────────────────────────────
  appliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 10,
  },
  appliedBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  appliedBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  appliedBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    fontFamily: FONTS.medium,
  },
  closeJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  closeJobText: {
    fontSize: 13.5,
    color: '#DC2626',
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },

  // ── CTA ─────────────────────────────────────────────────────────────
  cta: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    ...SHADOWS.sm,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.lg,
    paddingVertical: 13,
  },
  withdrawText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
});

const modal = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cancel:          { fontSize: 16, color: COLORS.textMuted },
  title:           { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '700', color: COLORS.text },
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
