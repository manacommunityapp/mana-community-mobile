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
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { academyService } from '@/services/academyService';
import type {
  AcademyProgram,
  ClassAttendee,
  HostWorkshopRequest,
  LearningType,
  ProgramLevel,
  ProgramMode,
} from '@/types/academy';

type TabType = 'CLASSES' | 'ROSTER' | 'EARNINGS';

export default function InstructorHubScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('CLASSES');
  const [showHostModal, setShowHostModal] = useState(false);
  const [selectedWorkshopForRoster, setSelectedWorkshopForRoster] = useState<AcademyProgram | null>(null);

  // Form State for Hosting a Workshop
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('CODING');
  const [formLearningType, setFormLearningType] = useState<LearningType>('WORKSHOP');
  const [formLevel, setFormLevel] = useState<ProgramLevel>('BEGINNER');
  const [formMode, setFormMode] = useState<ProgramMode>('IN_PERSON');
  const [formLocation, setFormLocation] = useState('Clubhouse Activity Room 2');
  const [formStartDate, setFormStartDate] = useState('20 Oct 2026');
  const [formStartTime, setFormStartTime] = useState('04:00 PM - 05:30 PM');
  const [formDuration, setFormDuration] = useState('90');
  const [formSessions, setFormSessions] = useState('4');
  const [formPricingType, setFormPricingType] = useState<'FREE' | 'PAID'>('PAID');
  const [formPrice, setFormPrice] = useState('1500');
  const [formSeats, setFormSeats] = useState('12');
  const [formSummary, setFormSummary] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrerequisites, setFormPrerequisites] = useState('');
  const [formSyllabus, setFormSyllabus] = useState([
    { title: 'Foundational Setup & Concepts', description: 'Orientation and basics overview.' },
    { title: 'Core Practical Workshop Session', description: 'Hands-on guided practice and drills.' },
  ]);

  // ── Queries ──────────────────────────────────────────────────────────
  const {
    data: hubData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['instructorHubData'],
    queryFn: academyService.getInstructorHubData,
  });

  const hostedPrograms = hubData?.hostedPrograms || [];
  const attendees = hubData?.attendees || [];
  const earnings = hubData?.stats;

  // ── Mutations ────────────────────────────────────────────────────────
  const hostWorkshopMutation = useMutation({
    mutationFn: (req: HostWorkshopRequest) => academyService.hostWorkshop(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructorHubData'] });
      qc.invalidateQueries({ queryKey: ['academyPrograms'] });
      setShowHostModal(false);
      Alert.alert(
        'Workshop Submitted 🎉',
        'Your workshop has been submitted to the Mana Learning Committee. Once verified, it will go live on the Resident Catalog!'
      );
      // Reset form
      setFormTitle('');
      setFormSummary('');
      setFormDescription('');
    },
    onError: (err: any) => {
      Alert.alert('Submission Error', err.message || 'Could not host workshop.');
    },
  });

  const toggleAttendanceMutation = useMutation({
    mutationFn: (attendeeId: string) => academyService.toggleAttendeeAttendance(attendeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructorHubData'] });
    },
  });

  const handleAddSyllabusRow = () => {
    setFormSyllabus([
      ...formSyllabus,
      { title: `Session #${formSyllabus.length + 1} Module`, description: 'Deep dive topics and practical demo.' },
    ]);
  };

  const handleSubmitWorkshop = () => {
    if (!formTitle.trim() || !formSummary.trim()) {
      Alert.alert('Missing Details', 'Please fill in the workshop title and summary.');
      return;
    }

    hostWorkshopMutation.mutate({
      title: formTitle,
      categoryCode: formCategory,
      learningType: formLearningType,
      level: formLevel,
      mode: formMode,
      location: formLocation,
      startDate: formStartDate,
      startTime: formStartTime,
      durationMinutes: parseInt(formDuration, 10) || 90,
      totalSessions: parseInt(formSessions, 10) || 4,
      pricingType: formPricingType,
      price: formPricingType === 'FREE' ? 0 : parseInt(formPrice, 10) || 0,
      totalSeats: parseInt(formSeats, 10) || 12,
      summary: formSummary,
      description: formDescription || formSummary,
      prerequisites: formPrerequisites,
      syllabus: formSyllabus,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ── Top Instructor Profile Card ──────────────────────────────── */}
        <View style={styles.hostCard}>
          <View style={styles.hostTopRow}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostAvatarText}>AM</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.hostName}>Arjun Mehta</Text>
                <Ionicons name="checkmark-circle" size={16} color="#34D399" />
              </View>
              <Text style={styles.hostRole}>Resident Faculty · Tower B (804)</Text>
              <Text style={styles.hostBadge}>⭐ 4.9 Rating · 186 Learners Mentored</Text>
            </View>

            <TouchableOpacity
              style={styles.hostNewBtn}
              onPress={() => setShowHostModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={16} color="#1E1B4B" />
              <Text style={styles.hostNewBtnText}>Host Class</Text>
            </TouchableOpacity>
          </View>

          {/* Instructor Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>₹{earnings?.netPayoutAmount.toLocaleString() || '0'}</Text>
              <Text style={styles.statLabel}>Net Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{hostedPrograms.length}</Text>
              <Text style={styles.statLabel}>Hosted Batches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: '#FDE68A' }]}>
                {attendees.filter((a) => a.checkedInToday).length} / {attendees.length}
              </Text>
              <Text style={styles.statLabel}>Present Today</Text>
            </View>
          </View>
        </View>

        {/* ── Tab Switcher ─────────────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {[
            { key: 'CLASSES', label: 'My Workshops', icon: 'school-outline', count: hostedPrograms.length },
            { key: 'ROSTER', label: 'Student Roster', icon: 'people-outline', count: attendees.length },
            { key: 'EARNINGS', label: 'Fees & Payouts', icon: 'wallet-outline' },
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
            {/* ── TAB 1: MY WORKSHOPS ──────────────────────────────────── */}
            {activeTab === 'CLASSES' && (
              <View style={styles.tabSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>Hosted Batches & Classes</Text>
                  <TouchableOpacity onPress={() => setShowHostModal(true)}>
                    <Text style={styles.addText}>+ Create New</Text>
                  </TouchableOpacity>
                </View>

                {hostedPrograms.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="easel-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No Hosted Classes Yet</Text>
                    <Text style={styles.emptySub}>
                      Offer your domain expertise or hobby to neighbors and earn coaching fees right inside Mana.
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyCtaBtn}
                      onPress={() => setShowHostModal(true)}
                    >
                      <Text style={styles.emptyCtaBtnText}>Host Your First Workshop</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  hostedPrograms.map((prog) => (
                    <View key={prog.id} style={styles.classCard}>
                      <View style={styles.classHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.badgeRow}>
                            <View style={styles.catBadge}>
                              <Text style={styles.catBadgeText}>{prog.categoryName}</Text>
                            </View>
                            <View
                              style={[
                                styles.statusPill,
                                prog.status === 'PENDING_APPROVAL' ? styles.statusPillPending : styles.statusPillLive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusPillText,
                                  prog.status === 'PENDING_APPROVAL' ? { color: '#92400E' } : { color: '#065F46' },
                                ]}
                              >
                                {prog.status.replace(/_/g, ' ')}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.classTitle}>{prog.title}</Text>
                          <Text style={styles.classSchedule}>
                            📅 {prog.startDate} · ⏰ {prog.startTime}
                          </Text>
                          <Text style={styles.classLoc}>📍 {prog.location}</Text>
                        </View>
                      </View>

                      {/* Capacity & Price Row */}
                      <View style={styles.classStatsRow}>
                        <View style={styles.classStatItem}>
                          <Text style={styles.classStatVal}>
                            👥 {prog.enrolledCount} / {prog.totalSeats}
                          </Text>
                          <Text style={styles.classStatLabel}>Enrolled Seats</Text>
                        </View>
                        <View style={styles.classStatItem}>
                          <Text style={styles.classStatVal}>
                            {prog.pricingType === 'FREE' ? 'FREE' : `₹${prog.price}`}
                          </Text>
                          <Text style={styles.classStatLabel}>Per Resident</Text>
                        </View>
                        <View style={styles.classStatItem}>
                          <Text style={[styles.classStatVal, { color: '#059669' }]}>
                            ₹{(prog.enrolledCount * prog.price).toLocaleString()}
                          </Text>
                          <Text style={styles.classStatLabel}>Gross Collection</Text>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.classActionRow}>
                        <TouchableOpacity
                          style={styles.rosterBtn}
                          onPress={() => {
                            setSelectedWorkshopForRoster(prog);
                            setActiveTab('ROSTER');
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="people" size={14} color={COLORS.primary} />
                          <Text style={styles.rosterBtnText}>Student Roster ({prog.enrolledCount})</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.previewBtn}
                          onPress={() => router.push('/academy')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.previewBtnText}>Catalog View</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 2: STUDENT ROSTER & ATTENDANCE ────────────────────── */}
            {activeTab === 'ROSTER' && (
              <View style={styles.tabSection}>
                <View style={styles.rosterIntroCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rosterIntroTitle}>Live Attendance & Check-In</Text>
                    <Text style={styles.rosterIntroSub}>
                      Verify student entrance tokens and log session attendance for certificate eligibility.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.scanQrBtn}
                    onPress={() => Alert.alert('Camera QR Scanner', 'Ready to scan student pass tokens at the activity door.')}
                  >
                    <Ionicons name="qr-code-outline" size={16} color="#fff" />
                    <Text style={styles.scanQrBtnText}>Scan QR</Text>
                  </TouchableOpacity>
                </View>

                {/* Attendees List */}
                <View style={styles.attendeeList}>
                  {attendees.map((att) => (
                    <View key={att.id} style={styles.attendeeCard}>
                      <View style={styles.attAvatar}>
                        <Text style={styles.attAvatarText}>{att.studentName.charAt(0)}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.attName}>{att.studentName}</Text>
                        <Text style={styles.attFlat}>
                          🏠 {att.tower} - {att.flatNumber} · {att.paymentStatus === 'PAID' ? `₹${att.amount} Paid` : 'Free'}
                        </Text>
                        <Text style={styles.attCount}>
                          Attendance: {att.attendedCount} of {att.totalSessions} Sessions
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.attToggleBtn,
                          att.checkedInToday ? styles.attToggleBtnDone : styles.attToggleBtnPending,
                        ]}
                        onPress={() => toggleAttendanceMutation.mutate(att.id)}
                        disabled={toggleAttendanceMutation.isPending}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={att.checkedInToday ? 'checkmark-circle' : 'radio-button-off'}
                          size={16}
                          color={att.checkedInToday ? '#fff' : COLORS.textMuted}
                        />
                        <Text
                          style={[
                            styles.attToggleText,
                            att.checkedInToday ? { color: '#fff' } : { color: COLORS.textMuted },
                          ]}
                        >
                          {att.checkedInToday ? 'Present' : 'Mark In'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── TAB 3: FEES & PAYOUTS ─────────────────────────────────── */}
            {activeTab === 'EARNINGS' && (
              <View style={styles.tabSection}>
                {/* Financial Overview Card */}
                <View style={styles.earningsSummaryCard}>
                  <Text style={styles.earningsCardTitle}>Instructor Fee Settlement</Text>
                  <Text style={styles.earningsCardSub}>
                    Direct transfers to your registered apartment account via Mana Community Trust.
                  </Text>

                  <View style={styles.earningsTable}>
                    <View style={styles.earningsRow}>
                      <Text style={styles.earnKey}>Gross Workshop Revenue</Text>
                      <Text style={styles.earnVal}>₹{earnings?.totalGrossRevenue.toLocaleString()}</Text>
                    </View>
                    <View style={styles.earningsRow}>
                      <Text style={styles.earnKey}>Community Maintenance & Venue Fee (5%)</Text>
                      <Text style={[styles.earnVal, { color: '#DC2626' }]}>
                        - ₹{earnings?.platformFeeAmount.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.earnDivider} />
                    <View style={styles.earningsRow}>
                      <Text style={styles.earnTotalKey}>Net Settled to Bank / UPI</Text>
                      <Text style={styles.earnTotalVal}>₹{earnings?.netPayoutAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.earningsRow}>
                      <Text style={styles.earnKey}>Pending Next Batch Settlement</Text>
                      <Text style={[styles.earnVal, { color: '#D97706' }]}>
                        ₹{earnings?.pendingPayout.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Bank / UPI Account Information */}
                <View style={styles.bankAccountCard}>
                  <View style={styles.bankTopRow}>
                    <Ionicons name="card-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.bankTitle}>Registered Payout Account</Text>
                  </View>
                  <Text style={styles.bankDetail}>Bank: HDFC Bank (Mana Residency Branch)</Text>
                  <Text style={styles.bankDetail}>A/C: •••• •••• 9841 | IFSC: HDFC0001243</Text>
                  <Text style={styles.bankDetail}>UPI VPA: arjun.mehta@oksbi</Text>
                  <Text style={styles.bankStatus}>🟢 Verified Resident Beneficiary (Flat B-804)</Text>
                </View>

                {/* Community Teaching Policy */}
                <View style={styles.policyCard}>
                  <Text style={styles.policyTitle}>📜 Resident Instructor Guidelines</Text>
                  <Text style={styles.policyText}>
                    • Free reservation of Clubhouse Rooms 1-3 for verified courses.
                  </Text>
                  <Text style={styles.policyText}>
                    • 100% of course materials and safety precautions must be adhered to.
                  </Text>
                  <Text style={styles.policyText}>
                    • Certificates are automatically generated on full session check-ins.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Host Workshop Modal ──────────────────────────────────────── */}
      <Modal visible={showHostModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.hostModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalSubHeader}>RESIDENT FACULTY</Text>
                <Text style={styles.modalTitle}>Host a Workshop or Class</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHostModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScroll}>
              {/* Workshop Title */}
              <Text style={styles.formLabel}>Course / Workshop Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Weekend Classical Guitar for Beginners"
                placeholderTextColor={COLORS.textMuted}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Category */}
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catPickerScroll}>
                {[
                  { code: 'CODING', label: 'Coding & AI' },
                  { code: 'YOGA', label: 'Yoga & Wellness' },
                  { code: 'MUSIC', label: 'Music' },
                  { code: 'STEM', label: 'Robotics & Kids' },
                  { code: 'CHESS', label: 'Chess' },
                  { code: 'CULINARY', label: 'Cooking' },
                  { code: 'ARTS', label: 'Fine Arts' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.catPickerChip, formCategory === c.code && styles.catPickerChipActive]}
                    onPress={() => setFormCategory(c.code)}
                  >
                    <Text
                      style={[styles.catPickerText, formCategory === c.code && styles.catPickerTextActive]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Pricing Type */}
              <Text style={styles.formLabel}>Fee Structure</Text>
              <View style={styles.pricingToggleRow}>
                <TouchableOpacity
                  style={[styles.priceToggleBtn, formPricingType === 'FREE' && styles.priceToggleBtnActive]}
                  onPress={() => setFormPricingType('FREE')}
                >
                  <Text style={[styles.priceToggleText, formPricingType === 'FREE' && styles.priceToggleTextActive]}>
                    Free Class (Community Service)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.priceToggleBtn, formPricingType === 'PAID' && styles.priceToggleBtnActive]}
                  onPress={() => setFormPricingType('PAID')}
                >
                  <Text style={[styles.priceToggleText, formPricingType === 'PAID' && styles.priceToggleTextActive]}>
                    Paid Workshop
                  </Text>
                </TouchableOpacity>
              </View>

              {formPricingType === 'PAID' && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.formLabel}>Fee per Student (₹)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="1500"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={formPrice}
                    onChangeText={setFormPrice}
                  />
                </View>
              )}

              {/* Schedule Details Row */}
              <View style={styles.formTwoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Total Seats</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="12"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={formSeats}
                    onChangeText={setFormSeats}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Total Sessions</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="4"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={formSessions}
                    onChangeText={setFormSessions}
                  />
                </View>
              </View>

              {/* Venue / Location */}
              <Text style={styles.formLabel}>Location / Venue</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Clubhouse Activity Room 2 or Zoom Link"
                placeholderTextColor={COLORS.textMuted}
                value={formLocation}
                onChangeText={setFormLocation}
              />

              {/* Summary */}
              <Text style={styles.formLabel}>Brief Summary *</Text>
              <TextInput
                style={[styles.formInput, { height: 60 }]}
                placeholder="One or two sentences highlighting what students will build/learn..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={formSummary}
                onChangeText={setFormSummary}
              />

              {/* Syllabus Builder */}
              <View style={styles.syllabusFormSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.formLabel}>Curriculum Outline</Text>
                  <TouchableOpacity onPress={handleAddSyllabusRow}>
                    <Text style={styles.addSessionText}>+ Add Session</Text>
                  </TouchableOpacity>
                </View>

                {formSyllabus.map((s, idx) => (
                  <View key={idx} style={styles.syllabusFormRow}>
                    <Text style={styles.syllabusFormIndex}>#{idx + 1}</Text>
                    <TextInput
                      style={[styles.formInput, { flex: 1, marginBottom: 0 }]}
                      placeholder={`Session ${idx + 1} Title`}
                      placeholderTextColor={COLORS.textMuted}
                      value={s.title}
                      onChangeText={(val) => {
                        const copy = [...formSyllabus];
                        copy[idx].title = val;
                        setFormSyllabus(copy);
                      }}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.submitHostBtn}
                onPress={handleSubmitWorkshop}
                disabled={hostWorkshopMutation.isPending}
              >
                {hostWorkshopMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.submitHostBtnText}>Submit Workshop for Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  // ── Host Top Card ─────────────────────────────────────────────────
  hostCard: {
    backgroundColor: '#1E1B4B',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  hostTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  hostAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3730A3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarText: { fontSize: 16, fontWeight: '900', color: '#FDE68A' },
  hostName: { fontSize: 16, fontWeight: '900', color: '#fff' },
  hostRole: { fontSize: 11, color: '#A5B4FC', marginTop: 1 },
  hostBadge: { fontSize: 10, color: '#FDE68A', marginTop: 2, fontWeight: '700' },
  hostNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  hostNewBtnText: { fontSize: 11, fontWeight: '900', color: '#1E1B4B' },

  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.lg,
    padding: 10,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 9, color: '#C7D2FE', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.2)' },

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

  // ── Class Cards ───────────────────────────────────────────────────
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  addText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },

  classCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  classHeader: { marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  catBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  catBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.xs },
  statusPillLive: { backgroundColor: '#D1FAE5' },
  statusPillPending: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontSize: 9, fontWeight: '800' },
  classTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  classSchedule: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  classLoc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  classStatsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  classStatItem: { alignItems: 'center', flex: 1 },
  classStatVal: { fontSize: 12, fontWeight: '900', color: COLORS.text },
  classStatLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },

  classActionRow: { flexDirection: 'row', gap: 8 },
  rosterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  rosterBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  previewBtnText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },

  // ── Roster & Attendees ────────────────────────────────────────────
  rosterIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
  },
  rosterIntroTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  rosterIntroSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  scanQrBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  attendeeList: { gap: 8 },
  attendeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  attAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attAvatarText: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  attName: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  attFlat: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  attCount: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '600' },
  attToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  attToggleBtnDone: { backgroundColor: '#059669' },
  attToggleBtnPending: { backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  attToggleText: { fontSize: 10, fontWeight: '800' },

  // ── Earnings Card ─────────────────────────────────────────────────
  earningsSummaryCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  earningsCardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  earningsCardSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, marginBottom: 12 },
  earningsTable: { gap: 6 },
  earningsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  earnKey: { fontSize: 11, color: COLORS.textSecondary },
  earnVal: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  earnDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  earnTotalKey: { fontSize: 13, fontWeight: '900', color: COLORS.text },
  earnTotalVal: { fontSize: 16, fontWeight: '900', color: '#059669' },

  bankAccountCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  bankTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  bankTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  bankDetail: { fontSize: 11, color: COLORS.textSecondary },
  bankStatus: { fontSize: 10, fontWeight: '700', color: '#065F46', marginTop: 4 },

  policyCard: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: RADIUS.xl,
    gap: 4,
  },
  policyTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  policyText: { fontSize: 11, color: '#92400E', lineHeight: 16 },

  // ── Modals & Form ─────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  hostModalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalSubHeader: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text, marginTop: 2 },
  modalFormScroll: { marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: '800', color: COLORS.text, marginTop: 10, marginBottom: 4 },
  formInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
  },
  catPickerScroll: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  catPickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPickerChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catPickerText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  catPickerTextActive: { color: '#fff' },
  pricingToggleRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  priceToggleBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceToggleBtnActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  priceToggleText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  priceToggleTextActive: { color: COLORS.primary, fontWeight: '800' },
  formTwoCol: { flexDirection: 'row', gap: 10 },
  syllabusFormSection: { marginTop: 10 },
  addSessionText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  syllabusFormRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  syllabusFormIndex: { fontSize: 11, fontWeight: '900', color: COLORS.primary },
  modalFooter: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  submitHostBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  submitHostBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

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
