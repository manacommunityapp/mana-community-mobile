import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { academyService } from '@/services/academyService';
import type {
  UserEnrollment,
  DigitalCertificate,
} from '@/types/academy';

type TabType = 'ENROLLED' | 'ATTENDANCE' | 'CERTIFICATES';

export default function MyLearningScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('ENROLLED');
  const [activePassModal, setActivePassModal] = useState<UserEnrollment | null>(null);
  const [selectedCertModal, setSelectedCertModal] = useState<DigitalCertificate | null>(null);
  const [expandedEnrollmentId, setExpandedEnrollmentId] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────
  const {
    data: enrollments = [],
    isLoading: enrLoading,
    refetch: refetchEnr,
    isRefetching,
  } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: academyService.getMyEnrollments,
  });

  const {
    data: certificates = [],
    isLoading: certsLoading,
    refetch: refetchCerts,
  } = useQuery({
    queryKey: ['myCertificates'],
    queryFn: academyService.getCertificates,
  });

  const onRefresh = () => {
    refetchEnr();
    refetchCerts();
  };

  // ── Attendance Check-in Mutation ─────────────────────────────────────
  const checkInMutation = useMutation({
    mutationFn: ({ enrollmentId, token }: { enrollmentId: string; token: string }) =>
      academyService.checkInStudentSession(enrollmentId, token),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['myEnrollments'] });
      Alert.alert('Session Check-In Successful', res.message);
    },
    onError: (err: any) => {
      Alert.alert('Check-In Failed', err.message || 'Could not verify token.');
    },
  });

  const handleShareCertificate = async (cert: DigitalCertificate) => {
    try {
      await Share.share({
        title: `${cert.programTitle} Certificate`,
        message: `🎓 I completed "${cert.programTitle}" at Mana Academy! Verifiable Certificate ID: ${cert.certificateNumber} | ${cert.verificationUrl}`,
      });
    } catch {
      // Ignored
    }
  };

  const isLoading = enrLoading || certsLoading;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Top Summary Header ───────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerGreeting}>Resident Student Portal</Text>
              <Text style={styles.headerTitle}>My Learning & Skill Tracker</Text>
            </View>
            <TouchableOpacity
              style={styles.exploreCatalogBtn}
              onPress={() => router.push('/academy')}
              activeOpacity={0.8}
            >
              <Ionicons name="compass-outline" size={14} color="#FDE68A" />
              <Text style={styles.exploreCatalogText}>Catalog</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{enrollments.length}</Text>
              <Text style={styles.metricLabel}>Enrolled Classes</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>
                {enrollments.reduce((acc, e) => acc + (e.attendedSessions || 0), 0)}
              </Text>
              <Text style={styles.metricLabel}>Sessions Attended</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: '#FDE68A' }]}>{certificates.length}</Text>
              <Text style={styles.metricLabel}>Certificates</Text>
            </View>
          </View>
        </View>

        {/* ── Tab Switcher ─────────────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {[
            { key: 'ENROLLED', label: 'My Classes', icon: 'book-outline', badge: enrollments.length },
            { key: 'ATTENDANCE', label: 'Attendance', icon: 'checkbox-outline' },
            { key: 'CERTIFICATES', label: 'Certificates 🏆', icon: 'ribbon-outline', badge: certificates.length },
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
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <>
            {/* ── TAB 1: ENROLLED CLASSES ───────────────────────────────── */}
            {activeTab === 'ENROLLED' && (
              <View style={styles.tabSection}>
                {enrollments.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="school-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No Enrolled Classes</Text>
                    <Text style={styles.emptySub}>
                      Browse community workshops in music, yoga, coding, or chess and register to start learning.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyCtaBtn}
                      onPress={() => router.push('/academy')}
                    >
                      <Text style={styles.emptyCtaBtnText}>Browse Workshop Catalog</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  enrollments.map((enr) => {
                    const percent = Math.round(((enr.attendedSessions || 0) / (enr.totalSessions || 1)) * 100);
                    const isDone = enr.status === 'COMPLETED' || percent >= 100;

                    return (
                      <View key={enr.id} style={styles.enrolledCard}>
                        {/* Top row */}
                        <View style={styles.enrolledTopRow}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.catBadge}>
                              <Text style={styles.catBadgeText}>{enr.categoryName}</Text>
                            </View>
                            <Text style={styles.enrolledTitle}>{enr.programTitle}</Text>
                            <Text style={styles.enrolledInst}>👨‍🏫 Taught by {enr.instructorName}</Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              isDone ? styles.statusBadgeDone : styles.statusBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isDone ? { color: '#065F46' } : { color: COLORS.primary },
                              ]}
                            >
                              {enr.status}
                            </Text>
                          </View>
                        </View>

                        {/* Location & Time Box */}
                        <View style={styles.infoBox}>
                          <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={13} color={COLORS.primary} />
                            <Text style={styles.infoText}>{enr.startDate} · {enr.startTime}</Text>
                          </View>
                          <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={13} color={COLORS.primary} />
                            <Text style={styles.infoText}>{enr.location}</Text>
                          </View>
                          {enr.instructorTower && (
                            <View style={styles.infoRow}>
                              <Ionicons name="home-outline" size={13} color={COLORS.textMuted} />
                              <Text style={styles.infoText}>Host Unit: {enr.instructorTower}</Text>
                            </View>
                          )}
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressWrap}>
                          <View style={styles.progressLabelRow}>
                            <Text style={styles.progressLabel}>
                              Attendance Progress: {enr.attendedSessions} / {enr.totalSessions} Sessions
                            </Text>
                            <Text style={styles.progressPercent}>{percent}%</Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <View
                              style={[
                                styles.progressBarFill,
                                { width: `${percent}%` },
                                isDone && { backgroundColor: '#059669' },
                              ]}
                            />
                          </View>
                        </View>

                        {/* Pass & Actions Row */}
                        <View style={styles.enrolledActionRow}>
                          <View style={styles.tokenPill}>
                            <Text style={styles.tokenLabel}>TOKEN:</Text>
                            <Text style={styles.tokenVal}>{enr.qrCheckInToken}</Text>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={styles.showPassBtn}
                              onPress={() => setActivePassModal(enr)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="qr-code-outline" size={15} color="#fff" />
                              <Text style={styles.showPassBtnText}>Show Pass</Text>
                            </TouchableOpacity>

                            {isDone && enr.certificateId && (
                              <TouchableOpacity
                                style={styles.viewCertBtn}
                                onPress={() => {
                                  const cert = certificates.find((c) => c.enrollmentId === enr.id || c.id === enr.certificateId);
                                  if (cert) setSelectedCertModal(cert);
                                  else setActiveTab('CERTIFICATES');
                                }}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="ribbon" size={14} color="#92400E" />
                                <Text style={styles.viewCertBtnText}>Certificate</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ── TAB 2: ATTENDANCE TRACKER ─────────────────────────────── */}
            {activeTab === 'ATTENDANCE' && (
              <View style={styles.tabSection}>
                <View style={styles.trackerIntro}>
                  <Text style={styles.trackerHeading}>Session-by-Session Attendance Logs</Text>
                  <Text style={styles.trackerDesc}>
                    Track your attendance record verified by instructors during community activity check-ins.
                  </Text>
                </View>

                {enrollments.map((enr) => {
                  const isExpanded = expandedEnrollmentId === enr.id || expandedEnrollmentId === null;
                  const history = enr.attendanceHistory || [];

                  return (
                    <View key={enr.id} style={styles.trackerCard}>
                      <TouchableOpacity
                        style={styles.trackerHeader}
                        onPress={() => setExpandedEnrollmentId(isExpanded ? '' : enr.id)}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.trackerProgTitle}>{enr.programTitle}</Text>
                          <Text style={styles.trackerMentor}>Instructor: {enr.instructorName}</Text>
                          <Text style={styles.trackerStats}>
                            ✅ {enr.attendedSessions} of {enr.totalSessions} sessions verified
                          </Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up-circle' : 'chevron-down-circle'}
                          size={22}
                          color={COLORS.primary}
                        />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.sessionList}>
                          {history.length === 0 ? (
                            <Text style={styles.noSessionText}>Class sessions will appear here as scheduled.</Text>
                          ) : (
                            history.map((sess) => (
                              <View key={sess.sessionId} style={styles.sessionRow}>
                                <View
                                  style={[
                                    styles.sessionStatusDot,
                                    sess.attended
                                      ? styles.sessionDotDone
                                      : sess.status === 'UPCOMING'
                                      ? styles.sessionDotUpcoming
                                      : styles.sessionDotMissed,
                                  ]}
                                >
                                  <Ionicons
                                    name={sess.attended ? 'checkmark' : sess.status === 'UPCOMING' ? 'time' : 'close'}
                                    size={12}
                                    color="#fff"
                                  />
                                </View>

                                <View style={{ flex: 1 }}>
                                  <View style={styles.sessTitleRow}>
                                    <Text style={styles.sessNum}>Session #{sess.sessionNumber}</Text>
                                    <Text style={styles.sessDate}>{sess.date} · {sess.time}</Text>
                                  </View>
                                  <Text style={styles.sessTitle}>{sess.title}</Text>
                                  {sess.notes && <Text style={styles.sessNotes}>💡 {sess.notes}</Text>}
                                </View>

                                {sess.status === 'UPCOMING' && !sess.attended && (
                                  <TouchableOpacity
                                    style={styles.checkInQuickBtn}
                                    onPress={() =>
                                      checkInMutation.mutate({
                                        enrollmentId: enr.id,
                                        token: enr.qrCheckInToken,
                                      })
                                    }
                                  >
                                    <Text style={styles.checkInQuickBtnText}>Check In</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── TAB 3: DIGITAL COMPLETION CERTIFICATES ───────────────── */}
            {activeTab === 'CERTIFICATES' && (
              <View style={styles.tabSection}>
                <View style={styles.certIntroCard}>
                  <View style={styles.certIntroBadge}>
                    <Ionicons name="ribbon" size={14} color="#D97706" />
                    <Text style={styles.certIntroBadgeText}>Verifiable Credentials</Text>
                  </View>
                  <Text style={styles.certIntroTitle}>Resident Completion Certificates</Text>
                  <Text style={styles.certIntroSub}>
                    Issued upon 100% course completion and instructor sign-off. Verifiable on Mana Community ledger.
                  </Text>
                </View>

                {certificates.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="ribbon-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No Certificates Earned Yet</Text>
                    <Text style={styles.emptySub}>
                      Complete all sessions of an active workshop to receive your signed digital certificate.
                    </Text>
                  </View>
                ) : (
                  certificates.map((cert) => (
                    <TouchableOpacity
                      key={cert.id}
                      style={styles.certCard}
                      onPress={() => setSelectedCertModal(cert)}
                      activeOpacity={0.85}
                    >
                      {/* Certificate Gold Frame Header */}
                      <View style={styles.certTopRow}>
                        <View style={styles.certSealBadge}>
                          <Ionicons name="shield-checkmark" size={18} color="#92400E" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.certOrgName}>{cert.communityName}</Text>
                          <Text style={styles.certCourseTitle}>{cert.programTitle}</Text>
                        </View>
                        <Ionicons name="open-outline" size={18} color={COLORS.primary} />
                      </View>

                      <View style={styles.certDivider} />

                      {/* Details */}
                      <View style={styles.certBody}>
                        <View style={styles.certField}>
                          <Text style={styles.certFieldLabel}>AWARDED TO</Text>
                          <Text style={styles.certFieldVal}>{cert.recipientName} ({cert.recipientFlat})</Text>
                        </View>

                        <View style={styles.certField}>
                          <Text style={styles.certFieldLabel}>CERTIFIED BY</Text>
                          <Text style={styles.certFieldVal}>{cert.instructorName}</Text>
                          <Text style={styles.certFieldSub}>{cert.instructorDesignation}</Text>
                        </View>

                        <View style={styles.certSkillsRow}>
                          <Text style={styles.certSkillsLabel}>SKILLS VALIDATED:</Text>
                          <View style={styles.skillsTagWrap}>
                            {cert.skillsAcquired.map((skill, idx) => (
                              <View key={idx} style={styles.skillTag}>
                                <Text style={styles.skillTagText}>{skill}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>

                      {/* Footer */}
                      <View style={styles.certFooter}>
                        <Text style={styles.certIdText}>ID: {cert.certificateNumber}</Text>
                        <Text style={styles.certDateText}>Issued: {cert.issueDate}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Active Pass Modal ────────────────────────────────────────── */}
      <Modal visible={!!activePassModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.passModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Class Entry Pass</Text>
              <TouchableOpacity onPress={() => setActivePassModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {activePassModal && (
              <View style={styles.passModalBody}>
                <Text style={styles.passModalProg}>{activePassModal.programTitle}</Text>
                <Text style={styles.passModalInst}>Instructor: {activePassModal.instructorName}</Text>
                <Text style={styles.passModalLoc}>📍 {activePassModal.location}</Text>
                <Text style={styles.passModalTime}>⏰ {activePassModal.startDate} · {activePassModal.startTime}</Text>

                <View style={styles.simulatedQrBox}>
                  <Ionicons name="qr-code" size={130} color="#1E1B4B" />
                  <Text style={styles.qrTokenText}>{activePassModal.qrCheckInToken}</Text>
                </View>

                <Text style={styles.qrInstructions}>
                  Present this QR token to the instructor or scan at the activity room check-in terminal.
                </Text>

                <TouchableOpacity
                  style={styles.closePassBtn}
                  onPress={() => setActivePassModal(null)}
                >
                  <Text style={styles.closePassBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Full Verifiable Certificate Modal ───────────────────────── */}
      <Modal visible={!!selectedCertModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.certModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verifiable Credential</Text>
              <TouchableOpacity onPress={() => setSelectedCertModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedCertModal && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Formal Certificate Layout */}
                <View style={styles.formalCertFrame}>
                  <View style={styles.certSealTop}>
                    <Ionicons name="ribbon" size={32} color="#B45309" />
                    <Text style={styles.certFrameOrg}>{selectedCertModal.communityName}</Text>
                    <Text style={styles.certFrameHeader}>CERTIFICATE OF COMPLETION</Text>
                  </View>

                  <Text style={styles.certFramePresented}>This is proudly presented to</Text>
                  <Text style={styles.certFrameRecipient}>{selectedCertModal.recipientName}</Text>
                  <Text style={styles.certFrameFlat}>Resident of {selectedCertModal.recipientFlat}</Text>

                  <Text style={styles.certFrameFor}>
                    for successfully completing all hands-on coursework and practical assessments in
                  </Text>
                  <Text style={styles.certFrameProg}>{selectedCertModal.programTitle}</Text>

                  {selectedCertModal.gradeScore && (
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeBadgeText}>🏆 {selectedCertModal.gradeScore}</Text>
                    </View>
                  )}

                  {/* Skills Section */}
                  <View style={styles.certFrameSkillsBox}>
                    <Text style={styles.certFrameSkillsTitle}>Demonstrated Competencies:</Text>
                    <Text style={styles.certFrameSkillsList}>
                      {selectedCertModal.skillsAcquired.join(' • ')}
                    </Text>
                  </View>

                  {/* Instructor Signature Box */}
                  <View style={styles.certSignRow}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.signatureScript}>Pooja Iyer</Text>
                      <View style={styles.signLine} />
                      <Text style={styles.signName}>{selectedCertModal.instructorName}</Text>
                      <Text style={styles.signDesig}>Lead Faculty</Text>
                    </View>

                    <View style={{ alignItems: 'center' }}>
                      <Ionicons name="qr-code" size={44} color="#1E1B4B" />
                      <Text style={styles.signId}>{selectedCertModal.certificateNumber}</Text>
                      <Text style={styles.signDesig}>Blockchain Verified</Text>
                    </View>
                  </View>
                </View>

                {/* Certificate Action Buttons */}
                <View style={styles.certActionRow}>
                  <TouchableOpacity
                    style={styles.shareCertBtn}
                    onPress={() => handleShareCertificate(selectedCertModal)}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#fff" />
                    <Text style={styles.shareCertBtnText}>Share Credential</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.downloadCertBtn}
                    onPress={() => Alert.alert('Download Complete', 'Certificate PDF saved to your local downloads folder.')}
                  >
                    <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.downloadCertBtnText}>Download PDF</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  // ── Header Card ───────────────────────────────────────────────────
  headerCard: {
    backgroundColor: '#1E1B4B',
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
  headerGreeting: { fontSize: 11, fontWeight: '700', color: '#A5B4FC' },
  headerTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginTop: 2 },
  exploreCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  exploreCatalogText: { fontSize: 11, fontWeight: '800', color: '#FDE68A' },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.lg,
    padding: 10,
    alignItems: 'center',
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricVal: { fontSize: 16, fontWeight: '900', color: '#fff' },
  metricLabel: { fontSize: 9, color: '#C7D2FE', marginTop: 2, fontWeight: '600' },
  metricDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },

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
  tabSection: { gap: SPACING.md },

  // ── Enrolled Card ─────────────────────────────────────────────────
  enrolledCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  enrolledTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  catBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  catBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  enrolledTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  enrolledInst: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, alignSelf: 'flex-start' },
  statusBadgeActive: { backgroundColor: COLORS.primaryLight },
  statusBadgeDone: { backgroundColor: '#D1FAE5' },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },

  infoBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 4,
    marginBottom: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 11, color: COLORS.textSecondary },

  progressWrap: { marginBottom: 12 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  progressPercent: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  progressBarBg: { height: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  enrolledActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  tokenPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tokenLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  tokenVal: { fontSize: 11, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  showPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  showPassBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  viewCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  viewCertBtnText: { color: '#92400E', fontSize: 11, fontWeight: '800' },

  // ── Attendance Tracker ────────────────────────────────────────────
  trackerIntro: { marginBottom: 4 },
  trackerHeading: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  trackerDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  trackerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  trackerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackerProgTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  trackerMentor: { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  trackerStats: { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: '700' },
  sessionList: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, gap: 10 },
  sessionRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  sessionStatusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sessionDotDone: { backgroundColor: '#059669' },
  sessionDotUpcoming: { backgroundColor: '#D97706' },
  sessionDotMissed: { backgroundColor: '#DC2626' },
  sessTitleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  sessNum: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  sessDate: { fontSize: 9, color: COLORS.textMuted },
  sessTitle: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  sessNotes: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  checkInQuickBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    alignSelf: 'center',
  },
  checkInQuickBtnText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  noSessionText: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', padding: 10 },

  // ── Certificate Cards ─────────────────────────────────────────────
  certIntroCard: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: RADIUS.xl,
    marginBottom: 6,
  },
  certIntroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  certIntroBadgeText: { fontSize: 9, fontWeight: '800', color: '#92400E' },
  certIntroTitle: { fontSize: 14, fontWeight: '900', color: '#78350F' },
  certIntroSub: { fontSize: 11, color: '#92400E', marginTop: 2, lineHeight: 15 },

  certCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    ...SHADOWS.sm,
  },
  certTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  certSealBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certOrgName: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase' },
  certCourseTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 1 },
  certDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  certBody: { gap: 8 },
  certField: {},
  certFieldLabel: { fontSize: 8, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
  certFieldVal: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginTop: 1 },
  certFieldSub: { fontSize: 10, color: COLORS.textMuted },
  certSkillsRow: { marginTop: 2 },
  certSkillsLabel: { fontSize: 8, fontWeight: '800', color: COLORS.textMuted, marginBottom: 4 },
  skillsTagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillTag: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  skillTagText: { fontSize: 9, color: COLORS.textSecondary, fontWeight: '600' },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 8,
  },
  certIdText: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  certDateText: { fontSize: 9, color: COLORS.textMuted },

  // ── Modals ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },

  passModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  passModalBody: { alignItems: 'center' },
  passModalProg: { fontSize: 14, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  passModalInst: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  passModalLoc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  passModalTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  simulatedQrBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 12,
  },
  qrTokenText: { fontSize: 14, fontWeight: '900', color: '#1E1B4B', letterSpacing: 2, marginTop: 8 },
  qrInstructions: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 15 },
  closePassBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 14,
  },
  closePassBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // ── Full Formal Certificate Frame ─────────────────────────────────
  certModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  formalCertFrame: {
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#D97706',
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  certSealTop: { alignItems: 'center', marginBottom: 10 },
  certFrameOrg: { fontSize: 9, fontWeight: '800', color: '#B45309', letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  certFrameHeader: { fontSize: 15, fontWeight: '900', color: '#78350F', letterSpacing: 1, marginTop: 2 },
  certFramePresented: { fontSize: 10, color: '#92400E', fontStyle: 'italic', marginTop: 6 },
  certFrameRecipient: { fontSize: 18, fontWeight: '900', color: '#1E1B4B', marginTop: 2, textDecorationLine: 'underline' },
  certFrameFlat: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  certFrameFor: { fontSize: 10, color: '#92400E', textAlign: 'center', marginTop: 8, paddingHorizontal: 10 },
  certFrameProg: { fontSize: 14, fontWeight: '900', color: COLORS.primary, textAlign: 'center', marginTop: 2 },
  gradeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    marginTop: 6,
  },
  gradeBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  certFrameSkillsBox: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 8,
    borderRadius: RADIUS.sm,
    width: '100%',
    marginVertical: 10,
    alignItems: 'center',
  },
  certFrameSkillsTitle: { fontSize: 9, fontWeight: '800', color: '#78350F' },
  certFrameSkillsList: { fontSize: 9, color: '#92400E', textAlign: 'center', marginTop: 2 },
  certSignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    paddingTop: 10,
    marginTop: 4,
  },
  signatureScript: { fontSize: 14, fontWeight: '900', color: '#1E1B4B', fontStyle: 'italic' },
  signLine: { width: 90, height: 1, backgroundColor: '#92400E', marginVertical: 2 },
  signName: { fontSize: 9, fontWeight: '800', color: COLORS.text },
  signDesig: { fontSize: 8, color: COLORS.textMuted },
  signId: { fontSize: 8, fontWeight: '800', color: COLORS.primary, marginTop: 2 },

  certActionRow: { flexDirection: 'row', gap: 10 },
  shareCertBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  shareCertBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  downloadCertBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  downloadCertBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },

  // ── Empty State ───────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 30, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  emptyCtaBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  emptyCtaBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
