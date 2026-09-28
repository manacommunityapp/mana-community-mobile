import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { cpnService } from '@/services/cpnService';
import type {
  ProfessionalProfileDto,
  JobPostingDto,
  MentorshipSessionDto,
  AICareerFeedbackDto,
} from '@/types/cpn';

type TabType = 'DIRECTORY' | 'JOBS' | 'MENTORSHIP' | 'AI_COACH';

export default function CPNScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('DIRECTORY');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: directory = [], isLoading: dirLoading, refetch: refetchDir, isRefetching } = useQuery({
    queryKey: ['cpnDirectory'],
    queryFn: () => cpnService.getDirectory(),
  });

  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['cpnJobs'],
    queryFn: cpnService.getJobs,
  });

  const { data: mentors = [], isLoading: mentorsLoading, refetch: refetchMentors } = useQuery({
    queryKey: ['cpnMentors'],
    queryFn: cpnService.getMentors,
  });

  const { data: aiCoach, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['cpnAICoach'],
    queryFn: cpnService.getAICareerCoach,
  });

  const isLoading = dirLoading || jobsLoading || mentorsLoading || aiLoading;

  const onRefresh = () => {
    refetchDir();
    refetchJobs();
    refetchMentors();
    refetchAI();
  };

  // ── Mutations ────────────────────────────────────────────────────────
  const referralMutation = useMutation({
    mutationFn: (jobId: string) => cpnService.requestReferral(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cpnJobs'] });
      Alert.alert('Referral Requested', 'Your resume and resident profile have been sent to the posting neighbor for direct employee referral.');
    },
  });

  const bookMentorMutation = useMutation({
    mutationFn: ({ mentorId, slot }: { mentorId: string; slot: string }) =>
      cpnService.bookMentorship(mentorId, slot),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cpnMentors'] });
      Alert.alert('Mentorship Booked', '1-on-1 session confirmed! An invite has been added to your calendar.');
    },
  });

  const filteredDirectory = directory.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.headline.toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      p.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Hero Network Banner ─────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Ionicons name="sparkles" size={12} color="#FDE68A" />
              <Text style={styles.heroPillText}>Mana Professional Network</Text>
            </View>
            <Text style={styles.heroSubText}>Verified Talent & Careers</Text>
          </View>

          <Text style={styles.heroTitle}>Hyperlocal Career Growth & Mentorship</Text>

          <View style={styles.heroMetricsGrid}>
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricVal}>312</Text>
              <Text style={styles.heroMetricLbl}>Connections</Text>
            </View>
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricVal}>18</Text>
              <Text style={styles.heroMetricLbl}>Active Referrals</Text>
            </View>
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricVal}>1.4K</Text>
              <Text style={styles.heroMetricLbl}>Profile Views</Text>
            </View>
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroMetricVal}>920</Text>
              <Text style={styles.heroMetricLbl}>Reputation Pts</Text>
            </View>
          </View>
        </View>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search skills (AWS, React, CA, Lawyer), companies..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Navigation Tab Bar ──────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {[
            { key: 'DIRECTORY', label: 'Directory', icon: 'people-outline' },
            { key: 'JOBS', label: 'Jobs & Referrals', icon: 'briefcase-outline' },
            { key: 'MENTORSHIP', label: 'Mentorship', icon: 'school-outline' },
            { key: 'AI_COACH', label: 'AI Coach', icon: 'sparkles-outline' },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key as TabType)}
                activeOpacity={0.8}
              >
                <Ionicons name={t.icon as any} size={15} color={isActive ? COLORS.primary : COLORS.textMuted} />
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <>
            {/* ── TAB 1: DIRECTORY ────────────────────────────────────── */}
            {activeTab === 'DIRECTORY' && (
              <View style={styles.tabContent}>
                {filteredDirectory.map((p) => (
                  <View key={p.id} style={styles.profileCard}>
                    <View style={styles.profileTopRow}>
                      <View style={styles.profileAvatar}>
                        <Text style={styles.profileAvatarText}>
                          {p.name.split(' ').map((n) => n[0]).join('')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={styles.profileName}>{p.name}</Text>
                          {p.isVerified && (
                            <Ionicons name="checkmark-circle" size={16} color="#059669" />
                          )}
                        </View>
                        <Text style={styles.profileHeadline}>{p.headline}</Text>
                        <Text style={styles.profileMeta}>
                          🏢 {p.company} · 📍 {p.tower} - {p.flatNumber}
                        </Text>
                      </View>
                    </View>

                    {/* Skills */}
                    <View style={styles.skillsWrap}>
                      {p.skills.map((s, idx) => (
                        <View key={idx} style={styles.skillPill}>
                          <Text style={styles.skillText}>{s}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.profileActionRow}>
                      {p.isAvailableForMentorship && (
                        <View style={styles.mentorBadge}>
                          <Ionicons name="school" size={12} color="#7C3AED" />
                          <Text style={styles.mentorBadgeText}>Open to Mentor</Text>
                        </View>
                      )}
                      {p.isHiringOrReferring && (
                        <View style={styles.hiringBadge}>
                          <Ionicons name="briefcase" size={12} color="#059669" />
                          <Text style={styles.hiringBadgeText}>Referring Candidates</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.connectBtn}
                        onPress={() => Alert.alert('Network Connect', `Connection request sent to ${p.name}!`)}
                      >
                        <Text style={styles.connectBtnText}>Connect</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 2: JOBS & REFERRALS ─────────────────────────────── */}
            {activeTab === 'JOBS' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeading}>Community Job & Referral Board</Text>
                  <Text style={styles.sectionSub}>Get directly referred by flat owners at top tech & finance firms</Text>
                </View>

                {jobs.map((job) => (
                  <View key={job.id} style={styles.jobCard}>
                    <View style={styles.jobHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <Text style={styles.jobCompany}>🏢 {job.company} · {job.location}</Text>
                      </View>
                      <View style={styles.jobTypeBadge}>
                        <Text style={styles.jobTypeText}>{job.jobType.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>

                    <View style={styles.jobSalaryBox}>
                      <View>
                        <Text style={styles.jobSalaryLbl}>COMPENSATION</Text>
                        <Text style={styles.jobSalaryVal}>{job.salaryRange}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.jobSalaryLbl}>EXPERIENCE</Text>
                        <Text style={styles.jobExpVal}>{job.experienceRequired}</Text>
                      </View>
                    </View>

                    <Text style={styles.jobDesc}>{job.description}</Text>

                    {/* Referrer Banner */}
                    <View style={styles.referrerBanner}>
                      <Ionicons name="person-circle-outline" size={18} color="#059669" />
                      <Text style={styles.referrerText}>
                        Direct Referral by <Text style={{ fontWeight: '800' }}>{job.postedByResident}</Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.applyReferralBtn}
                      onPress={() => referralMutation.mutate(job.id)}
                      disabled={referralMutation.isPending}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                      <Text style={styles.applyReferralBtnText}>Request Neighbor Referral</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 3: MENTORSHIP ───────────────────────────────────── */}
            {activeTab === 'MENTORSHIP' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeading}>1-on-1 Resident Mentorship</Text>
                  <Text style={styles.sectionSub}>Book 30-min coffee chats or mock interviews with neighborhood leaders</Text>
                </View>

                {mentors.map((m) => (
                  <View key={m.id} style={styles.mentorCard}>
                    <View style={styles.mentorHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mentorName}>{m.mentorName}</Text>
                        <Text style={styles.mentorHeadline}>{m.mentorHeadline} · {m.mentorCompany}</Text>
                        <Text style={styles.mentorDomain}>🎯 {m.domain}</Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#D97706" />
                        <Text style={styles.ratingText}>{m.rating}</Text>
                      </View>
                    </View>

                    {/* Topics */}
                    <View style={styles.topicsBox}>
                      <Text style={styles.topicsHeading}>Topics covered in session:</Text>
                      {m.topics.map((t, idx) => (
                        <Text key={idx} style={styles.topicItem}>• {t}</Text>
                      ))}
                    </View>

                    {/* Available Slots */}
                    <Text style={styles.slotsLabel}>Upcoming Available Slots:</Text>
                    <View style={styles.slotsRow}>
                      {m.availableSlots.map((slot, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.slotBtn}
                          onPress={() => bookMentorMutation.mutate({ mentorId: m.id, slot })}
                        >
                          <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.slotBtnText}>{slot}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 4: AI CAREER COACH ──────────────────────────────── */}
            {activeTab === 'AI_COACH' && (
              <View style={styles.tabContent}>
                {aiCoach && (
                  <View style={styles.aiCoachCard}>
                    <View style={styles.aiCoachHeader}>
                      <Ionicons name="sparkles" size={24} color="#7C3AED" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.aiCoachTitle}>AI Career & Resume Diagnostics</Text>
                        <Text style={styles.aiCoachSub}>Tailored community career advice based on local hiring trends</Text>
                      </View>
                    </View>

                    <Text style={styles.aiSummaryText}>{aiCoach.summary}</Text>

                    <View style={styles.coachSection}>
                      <Text style={styles.coachSectionHeading}>🚀 Highlighted Strengths:</Text>
                      {aiCoach.strengths.map((s, idx) => (
                        <View key={idx} style={styles.strengthItem}>
                          <Ionicons name="checkmark-circle" size={14} color="#059669" />
                          <Text style={styles.strengthText}>{s}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.coachSection}>
                      <Text style={styles.coachSectionHeading}>💡 Recommended Action Items:</Text>
                      {aiCoach.recommendedImprovements.map((imp, idx) => (
                        <View key={idx} style={styles.improveItem}>
                          <Ionicons name="bulb-outline" size={14} color="#D97706" />
                          <Text style={styles.improveText}>{imp}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.coachSection}>
                      <Text style={styles.coachSectionHeading}>👥 Suggested Community Mentors:</Text>
                      {aiCoach.suggestedCommunityMentors.map((mentor, idx) => (
                        <View key={idx} style={styles.suggestedMentorItem}>
                          <Ionicons name="person-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.suggestedMentorText}>{mentor}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  // ── Hero Banner ───────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#312E81',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  heroPillText: { fontSize: 10, fontWeight: '800', color: '#FDE68A' },
  heroSubText: { fontSize: 11, color: '#C7D2FE' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 12 },
  heroMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: RADIUS.lg,
  },
  heroMetricItem: { alignItems: 'center' },
  heroMetricVal: { fontSize: 15, fontWeight: '900', color: '#FDE68A' },
  heroMetricLbl: { fontSize: 9, color: '#C7D2FE', marginTop: 2 },

  // ── Search & Tab Bar ──────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  tabBtnActive: { backgroundColor: COLORS.primaryLight },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.primary, fontWeight: '800' },

  tabContent: { gap: SPACING.md },

  // ── Profile Card ──────────────────────────────────────────────────
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  profileTopRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  profileName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  profileHeadline: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  profileMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  skillPill: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  skillText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  mentorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mentorBadgeText: { fontSize: 10, fontWeight: '800', color: '#7C3AED' },
  hiringBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hiringBadgeText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  connectBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  connectBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },

  // ── Job Card ──────────────────────────────────────────────────────
  sectionTitleRow: { marginBottom: 6 },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  sectionSub: { fontSize: 12, color: COLORS.textMuted },
  jobCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  jobTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  jobCompany: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  jobTypeBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  jobTypeText: { fontSize: 9, fontWeight: '900', color: COLORS.primary },
  jobSalaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 8,
  },
  jobSalaryLbl: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  jobSalaryVal: { fontSize: 14, fontWeight: '900', color: '#059669' },
  jobExpVal: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  jobDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  referrerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  referrerText: { fontSize: 11, color: '#065F46' },
  applyReferralBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  applyReferralBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // ── Mentor Card ───────────────────────────────────────────────────
  mentorCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  mentorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mentorName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  mentorHeadline: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  mentorDomain: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  ratingText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  topicsBox: { backgroundColor: COLORS.surfaceAlt, padding: 10, borderRadius: RADIUS.md, marginVertical: 8 },
  topicsHeading: { fontSize: 11, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  topicItem: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  slotsLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, marginTop: 4, marginBottom: 6 },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  slotBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },

  // ── AI Coach Card ─────────────────────────────────────────────────
  aiCoachCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    ...SHADOWS.md,
  },
  aiCoachHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 },
  aiCoachTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  aiCoachSub: { fontSize: 11, color: COLORS.textMuted },
  aiSummaryText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 14 },
  coachSection: { marginBottom: 12 },
  coachSectionHeading: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  strengthItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  strengthText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  improveItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  improveText: { fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 16 },
  suggestedMentorItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  suggestedMentorText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});
