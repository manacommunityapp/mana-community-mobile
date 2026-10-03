import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { academyService } from '@/services/academyService';

type TabType = 'APPROVALS' | 'FACULTY' | 'FINANCIALS';

export default function AcademyAdminScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('APPROVALS');

  // ── Queries ──────────────────────────────────────────────────────────
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching,
  } = useQuery({
    queryKey: ['academyAdminStats'],
    queryFn: academyService.getAdminStats,
  });

  const {
    data: pendingInstructors = [],
    refetch: refetchInstApps,
  } = useQuery({
    queryKey: ['pendingInstructors'],
    queryFn: academyService.getPendingInstructorApplications,
  });

  const {
    data: pendingPrograms = [],
    refetch: refetchProgApps,
  } = useQuery({
    queryKey: ['pendingPrograms'],
    queryFn: academyService.getPendingProgramApprovals,
  });

  const { data: instructors = [], refetch: refetchInstructors } = useQuery({
    queryKey: ['academyInstructors'],
    queryFn: academyService.getInstructors,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['academyCategories'],
    queryFn: academyService.getCategories,
  });

  const onRefresh = () => {
    refetchStats();
    refetchInstApps();
    refetchProgApps();
    refetchInstructors();
  };

  // ── Mutations ────────────────────────────────────────────────────────
  const approveProgramMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      academyService.approveProgramSubmission(id, approved),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pendingPrograms'] });
      qc.invalidateQueries({ queryKey: ['academyPrograms'] });
      qc.invalidateQueries({ queryKey: ['academyAdminStats'] });
      Alert.alert(
        vars.approved ? 'Workshop Approved' : 'Workshop Rejected',
        vars.approved
          ? 'The workshop is now live on the Resident Catalog with seat registrations open.'
          : 'The submission was rejected.'
      );
    },
  });

  const approveInstructorMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      academyService.approveInstructorApplication(id, approved),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['pendingInstructors'] });
      qc.invalidateQueries({ queryKey: ['academyInstructors'] });
      qc.invalidateQueries({ queryKey: ['academyAdminStats'] });
      Alert.alert(
        vars.approved ? 'Instructor Verified' : 'Application Rejected',
        vars.approved
          ? 'Resident host verified and granted instructor credentials.'
          : 'Application rejected.'
      );
    },
  });

  const totalPending = pendingPrograms.filter((p) => p.status === 'PENDING_APPROVAL').length +
    pendingInstructors.filter((i) => i.status === 'PENDING').length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Admin Header ─────────────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerRoleBadge}>🛡️ ACADEMY COMMITTEE</Text>
              <Text style={styles.headerTitle}>Learning & Skills Governance</Text>
            </View>
            <TouchableOpacity
              style={styles.catalogBtn}
              onPress={() => router.push('/academy')}
            >
              <Ionicons name="book-outline" size={14} color="#FDE68A" />
              <Text style={styles.catalogBtnText}>Catalog</Text>
            </TouchableOpacity>
          </View>

          {/* 4-Stat KPI Grid */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiVal}>{stats?.totalActiveWorkshops || 0}</Text>
              <Text style={styles.kpiLabel}>Active Classes</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiVal}>{stats?.totalResidentFaculty || 0}</Text>
              <Text style={styles.kpiLabel}>Resident Faculty</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiVal}>{stats?.totalEnrollments || 0}</Text>
              <Text style={styles.kpiLabel}>Total Learners</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiVal, { color: '#FDE68A' }]}>
                ₹{((stats?.grossRevenueGmv || 0) / 1000).toFixed(1)}k
              </Text>
              <Text style={styles.kpiLabel}>Platform GMV</Text>
            </View>
          </View>
        </View>

        {/* ── Tab Switcher ─────────────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {[
            { key: 'APPROVALS', label: 'Pending Approvals', icon: 'checkbox-outline', badge: totalPending },
            { key: 'FACULTY', label: 'Faculty & Categories', icon: 'people-outline' },
            { key: 'FINANCIALS', label: 'Fund & Audits', icon: 'cash-outline' },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key as TabType)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon as any}
                  size={14}
                  color={isActive ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
                {t.badge && t.badge > 0 ? (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{t.badge}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {statsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <>
            {/* ── TAB 1: PENDING APPROVALS ──────────────────────────────── */}
            {activeTab === 'APPROVALS' && (
              <View style={styles.tabSection}>
                {/* 1. New Workshop Submissions */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Course & Workshop Submissions</Text>
                  <Text style={styles.sectionSub}>Review syllabus, clubhouse venue booking, and pricing</Text>
                </View>

                {pendingPrograms.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={32} color="#059669" />
                    <Text style={styles.emptyCardText}>No pending workshop approvals.</Text>
                  </View>
                ) : (
                  pendingPrograms.map((prog) => (
                    <View key={prog.id} style={styles.approvalCard}>
                      <View style={styles.approvalTop}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.catBadge}>
                            <Text style={styles.catBadgeText}>{prog.categoryName}</Text>
                          </View>
                          <Text style={styles.approvalTitle}>{prog.title}</Text>
                          <Text style={styles.approvalHost}>
                            Host: {prog.instructorName} · 🏠 {prog.tower} - {prog.flatNumber}
                          </Text>
                        </View>
                        <View style={styles.statusPillPending}>
                          <Text style={styles.statusPillPendingText}>{prog.status.replace(/_/g, ' ')}</Text>
                        </View>
                      </View>

                      <Text style={styles.approvalSummary}>{prog.summary}</Text>

                      <View style={styles.approvalMetaRow}>
                        <Text style={styles.metaItem}>💰 Fee: {prog.pricingType === 'FREE' ? 'FREE' : `₹${prog.price}`}</Text>
                        <Text style={styles.metaItem}>👥 Seats: {prog.totalSeats}</Text>
                        <Text style={styles.metaItem}>📅 Submitted: {prog.submittedDate}</Text>
                      </View>

                      {/* Action buttons */}
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => approveProgramMutation.mutate({ id: prog.id, approved: false })}
                          disabled={approveProgramMutation.isPending}
                        >
                          <Ionicons name="close" size={14} color="#DC2626" />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => approveProgramMutation.mutate({ id: prog.id, approved: true })}
                          disabled={approveProgramMutation.isPending}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve & Publish</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

                {/* 2. Instructor Verification Applications */}
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                  <Text style={styles.sectionTitle}>Resident Instructor Applications</Text>
                  <Text style={styles.sectionSub}>Verify apartment residency, domain experience, and credentials</Text>
                </View>

                {pendingInstructors.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={32} color="#059669" />
                    <Text style={styles.emptyCardText}>No pending instructor applications.</Text>
                  </View>
                ) : (
                  pendingInstructors.map((app) => (
                    <View key={app.id} style={styles.approvalCard}>
                      <View style={styles.approvalTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.approvalTitle}>{app.applicantName}</Text>
                          <Text style={styles.approvalHost}>
                            🏠 {app.tower} - {app.flatNumber} · {app.profession} ({app.experienceYears} yrs exp)
                          </Text>
                        </View>
                        <View style={styles.statusPillPending}>
                          <Text style={styles.statusPillPendingText}>{app.status}</Text>
                        </View>
                      </View>

                      <View style={styles.appField}>
                        <Text style={styles.appFieldLabel}>PROPOSED DOMAIN:</Text>
                        <Text style={styles.appFieldVal}>{app.proposedSubject}</Text>
                      </View>

                      <View style={styles.appField}>
                        <Text style={styles.appFieldLabel}>QUALIFICATIONS:</Text>
                        <Text style={styles.appFieldVal}>{app.qualifications}</Text>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => approveInstructorMutation.mutate({ id: app.id, approved: false })}
                          disabled={approveInstructorMutation.isPending}
                        >
                          <Ionicons name="close" size={14} color="#DC2626" />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => approveInstructorMutation.mutate({ id: app.id, approved: true })}
                          disabled={approveInstructorMutation.isPending}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Verify & Authorize</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 2: FACULTY & CATEGORIES ─────────────────────────── */}
            {activeTab === 'FACULTY' && (
              <View style={styles.tabSection}>
                {/* Categories */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Active Learning Tracks</Text>
                  <Text style={styles.sectionSub}>Discipline categorization & workshop allocations</Text>
                </View>

                <View style={styles.catGrid}>
                  {categories.map((c) => (
                    <View key={c.id} style={styles.catCard}>
                      <View style={styles.catIconWrap}>
                        <Ionicons name="school" size={16} color={COLORS.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.catName}>{c.name}</Text>
                        <Text style={styles.catCount}>{c.programCount || 2} Active Classes</Text>
                      </View>
                      <View style={styles.activeDot} />
                    </View>
                  ))}
                </View>

                {/* Verified Faculty */}
                <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                  <Text style={styles.sectionTitle}>Verified Resident Faculty ({instructors.length})</Text>
                  <Text style={styles.sectionSub}>Certified resident mentors authorized to host classes</Text>
                </View>

                {instructors.map((inst) => (
                  <View key={inst.id} style={styles.facultyRowCard}>
                    <View style={styles.facultyAvatar}>
                      <Text style={styles.facultyAvatarText}>{inst.fullName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.facultyName}>{inst.fullName}</Text>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      </View>
                      <Text style={styles.facultyProf}>{inst.profession}</Text>
                      <Text style={styles.facultyFlat}>🏠 {inst.tower} - {inst.flatNumber}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.facultyRating}>⭐ {inst.averageRating}</Text>
                      <Text style={styles.facultyLearners}>{inst.totalLearners} Learners</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 3: FINANCIALS & COMMUNITY FUND ───────────────────── */}
            {activeTab === 'FINANCIALS' && (
              <View style={styles.tabSection}>
                <View style={styles.fundCard}>
                  <View style={styles.fundBadge}>
                    <Ionicons name="leaf" size={14} color="#065F46" />
                    <Text style={styles.fundBadgeText}>Community Asset Maintenance</Text>
                  </View>
                  <Text style={styles.fundTitle}>Mana Community Learning Fund</Text>
                  <Text style={styles.fundDesc}>
                    5% of all workshop and course registrations contribute towards upkeep of the clubhouse activity rooms, projectors, whiteboards, and digital certificates.
                  </Text>

                  <View style={styles.fundStatsRow}>
                    <View style={styles.fundStatBox}>
                      <Text style={styles.fundStatVal}>₹{stats?.grossRevenueGmv.toLocaleString()}</Text>
                      <Text style={styles.fundStatLabel}>Total Gross GMV</Text>
                    </View>
                    <View style={styles.fundStatBox}>
                      <Text style={[styles.fundStatVal, { color: '#059669' }]}>
                        ₹{stats?.communityFundContribution.toLocaleString()}
                      </Text>
                      <Text style={styles.fundStatLabel}>5% Community Reserve</Text>
                    </View>
                  </View>
                </View>

                {/* Audit & Compliance */}
                <View style={styles.auditCard}>
                  <Text style={styles.auditTitle}>📋 Compliance & Safety Checklist</Text>
                  <Text style={styles.auditItem}>✅ Activity rooms sanitization and air conditioning verified.</Text>
                  <Text style={styles.auditItem}>✅ First Aid kit available in Activity Room 2.</Text>
                  <Text style={styles.auditItem}>✅ Digital certificates cryptographically signed on ledger.</Text>
                  <Text style={styles.auditItem}>✅ Instructor payout payouts settled weekly every Monday.</Text>
                </View>
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

  // ── Header Card ───────────────────────────────────────────────────
  headerCard: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerRoleBadge: { fontSize: 9, fontWeight: '800', color: '#38BDF8', letterSpacing: 1 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#fff', marginTop: 2 },
  catalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  catalogBtnText: { fontSize: 11, fontWeight: '800', color: '#FDE68A' },
  kpiGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.lg,
    padding: 10,
    alignItems: 'center',
  },
  kpiBox: { flex: 1, alignItems: 'center' },
  kpiVal: { fontSize: 15, fontWeight: '900', color: '#fff' },
  kpiLabel: { fontSize: 9, color: '#94A3B8', marginTop: 2, fontWeight: '600' },

  // ── Tab Bar ───────────────────────────────────────────────────────
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
  badgePill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  badgePillText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  tabSection: { gap: SPACING.md },

  // ── Section Headers ───────────────────────────────────────────────
  sectionHeader: { marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  // ── Approval Cards ────────────────────────────────────────────────
  approvalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  approvalTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  catBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  approvalTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  approvalHost: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
  },
  statusPillPendingText: { fontSize: 9, fontWeight: '800', color: '#92400E' },
  approvalSummary: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16, marginVertical: 6 },
  approvalMetaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  metaItem: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  appField: { marginBottom: 6 },
  appFieldLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  appFieldVal: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  rejectBtnText: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  approveBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // ── Categories & Faculty Grid ─────────────────────────────────────
  catGrid: { gap: 6 },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  catCount: { fontSize: 10, color: COLORS.textMuted },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },

  facultyRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  facultyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facultyAvatarText: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  facultyName: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  facultyProf: { fontSize: 10, color: COLORS.primary },
  facultyFlat: { fontSize: 9, color: COLORS.textMuted },
  facultyRating: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  facultyLearners: { fontSize: 9, color: COLORS.textMuted },

  // ── Fund & Audit ──────────────────────────────────────────────────
  fundCard: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  fundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  fundBadgeText: { fontSize: 9, fontWeight: '800', color: '#065F46' },
  fundTitle: { fontSize: 15, fontWeight: '900', color: '#064E3B' },
  fundDesc: { fontSize: 11, color: '#065F46', marginTop: 4, lineHeight: 16 },
  fundStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: RADIUS.lg,
    marginTop: 12,
    justifyContent: 'space-between',
  },
  fundStatBox: { flex: 1, alignItems: 'center' },
  fundStatVal: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  fundStatLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 2, fontWeight: '700' },

  auditCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  auditTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  auditItem: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },

  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyCardText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
});
