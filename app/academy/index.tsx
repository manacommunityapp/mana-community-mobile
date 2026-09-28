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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { academyService } from '@/services/academyService';
import type {
  AcademyProgram,
  AcademyInstructor,
  UserEnrollment,
} from '@/types/academy';

type TabType = 'CATALOG' | 'MY_LEARNING' | 'INSTRUCTORS';

export default function AcademyScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('CATALOG');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activePassModal, setActivePassModal] = useState<UserEnrollment | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['academyCategories'],
    queryFn: academyService.getCategories,
  });

  const { data: programs = [], isLoading: progsLoading, refetch: refetchProgs, isRefetching } = useQuery({
    queryKey: ['academyPrograms', selectedCategory],
    queryFn: () => academyService.getPrograms(selectedCategory === 'ALL' ? undefined : selectedCategory),
  });

  const { data: enrollments = [], isLoading: enrLoading, refetch: refetchEnr } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: academyService.getMyEnrollments,
  });

  const { data: instructors = [], isLoading: instLoading, refetch: refetchInst } = useQuery({
    queryKey: ['academyInstructors'],
    queryFn: academyService.getInstructors,
  });

  const isLoading = progsLoading || enrLoading || instLoading;

  const onRefresh = () => {
    refetchProgs();
    refetchEnr();
    refetchInst();
  };

  // ── Mutations ────────────────────────────────────────────────────────
  const enrollMutation = useMutation({
    mutationFn: (progId: string) => academyService.enrollProgram(progId),
    onSuccess: (newEnr) => {
      qc.invalidateQueries({ queryKey: ['myEnrollments'] });
      qc.invalidateQueries({ queryKey: ['academyPrograms'] });
      setActivePassModal(newEnr);
    },
  });

  // Filter programs by search
  const filteredPrograms = programs.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.instructorName.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Hero Banner ─────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Ionicons name="sparkles" size={12} color="#D97706" />
              <Text style={styles.heroPillText}>Learn • Teach • Grow</Text>
            </View>
            <Text style={styles.heroStatsText}>32+ Community Workshops</Text>
          </View>

          <Text style={styles.heroTitle}>Learn From Neighbors. Teach What You Love.</Text>
          <Text style={styles.heroDesc}>
            Hands-on coding bootcamps, sunrise yoga, chess coaching, robotics, and career masterclasses inside Mana Residency.
          </Text>
        </View>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes (e.g. Python, Yoga, Chess, Art)..."
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

        {/* ── Category Filter Pills ───────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map((c) => {
            const isSel = selectedCategory === c.code;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catPill, isSel && styles.catPillSelected]}
                onPress={() => setSelectedCategory(c.code)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catPillText, isSel && styles.catPillTextSelected]}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Tab Bar ─────────────────────────────────────────────────── */}
        <View style={styles.tabBar}>
          {[
            { key: 'CATALOG', label: 'Workshops', icon: 'book-outline' },
            { key: 'MY_LEARNING', label: 'My Enrolled Classes', icon: 'school-outline' },
            { key: 'INSTRUCTORS', label: 'Resident Faculty', icon: 'people-outline' },
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
            {/* ── TAB 1: WORKSHOPS CATALOG ────────────────────────────── */}
            {activeTab === 'CATALOG' && (
              <View style={styles.tabContent}>
                {filteredPrograms.map((prog) => (
                  <View key={prog.id} style={styles.progCard}>
                    <View style={styles.progHeader}>
                      <View style={styles.catBadge}>
                        <Text style={styles.catBadgeText}>{prog.categoryName}</Text>
                      </View>
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>{prog.level}</Text>
                      </View>
                    </View>

                    <Text style={styles.progTitle}>{prog.title}</Text>
                    <Text style={styles.progSummary}>{prog.summary}</Text>

                    {/* Instructor Row */}
                    <View style={styles.instRow}>
                      <View style={styles.instAvatar}>
                        <Ionicons name="person" size={14} color={COLORS.primary} />
                      </View>
                      <View>
                        <Text style={styles.instName}>{prog.instructorName}</Text>
                        <Text style={styles.instTower}>📍 {prog.instructorTower || 'Resident Host'}</Text>
                      </View>
                    </View>

                    {/* Schedule & Location Box */}
                    <View style={styles.scheduleBox}>
                      <View style={styles.scheduleItem}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.scheduleText}>{prog.startDate}</Text>
                      </View>
                      <View style={styles.scheduleItem}>
                        <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.scheduleText}>{prog.startTime}</Text>
                      </View>
                      <View style={styles.scheduleItem}>
                        <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.scheduleText}>{prog.location}</Text>
                      </View>
                    </View>

                    {/* Pricing & Enroll Row */}
                    <View style={styles.priceAndEnrollRow}>
                      <View>
                        <Text style={styles.priceLabel}>PROGRAM FEE</Text>
                        <Text style={styles.priceVal}>
                          {prog.pricingType === 'FREE' ? 'FREE' : `₹${prog.price}`}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.enrollBtn, prog.userEnrolled && styles.enrollBtnDone]}
                        onPress={() => enrollMutation.mutate(prog.id)}
                        disabled={prog.userEnrolled || enrollMutation.isPending}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={prog.userEnrolled ? 'checkmark-circle' : 'finger-print-outline'}
                          size={16}
                          color="#fff"
                        />
                        <Text style={styles.enrollBtnText}>
                          {prog.userEnrolled ? 'Enrolled' : 'Register Now'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.progFooter}>
                      <Text style={styles.progSeatsText}>
                        👥 {prog.enrolledCount} / {prog.totalSeats} Seats Taken
                      </Text>
                      <Text style={styles.progModeText}>Mode: {prog.mode.replace(/_/g, ' ')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 2: MY ENROLLED CLASSES ──────────────────────────── */}
            {activeTab === 'MY_LEARNING' && (
              <View style={styles.tabContent}>
                {enrollments.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="school-outline" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>No Active Enrollments</Text>
                    <Text style={styles.emptySub}>Browse community workshops and join a class to learn new skills.</Text>
                  </View>
                ) : (
                  enrollments.map((enr) => (
                    <View key={enr.id} style={styles.passCard}>
                      <View style={styles.passTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.passTitle}>{enr.programTitle}</Text>
                          <Text style={styles.passInstructor}>Taught by {enr.instructorName}</Text>
                          <Text style={styles.passSchedule}>📅 {enr.startDate} · ⏰ {enr.startTime}</Text>
                          <Text style={styles.passLoc}>📍 {enr.location}</Text>
                        </View>
                        <View style={styles.passStatusBadge}>
                          <Text style={styles.passStatusText}>{enr.status}</Text>
                        </View>
                      </View>

                      {/* Token Check-in Box */}
                      <View style={styles.passTokenBox}>
                        <View>
                          <Text style={styles.passTokenLabel}>CHECK-IN TOKEN</Text>
                          <Text style={styles.passToken}>{enr.qrCheckInToken}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.showPassQrBtn}
                          onPress={() => setActivePassModal(enr)}
                        >
                          <Ionicons name="qr-code-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.showPassQrText}>Show Pass</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── TAB 3: RESIDENT FACULTY / INSTRUCTORS ────────────────── */}
            {activeTab === 'INSTRUCTORS' && (
              <View style={styles.tabContent}>
                <View style={styles.facultyHeader}>
                  <Text style={styles.facultyHeading}>Resident Teachers & Mentors</Text>
                  <Text style={styles.facultySub}>Industry veterans and certified trainers living right next door</Text>
                </View>

                {instructors.map((inst) => (
                  <View key={inst.id} style={styles.facultyCard}>
                    <View style={styles.facultyTopRow}>
                      <View style={styles.facultyAvatar}>
                        <Text style={styles.facultyAvatarText}>
                          {inst.fullName.split(' ').map((n) => n[0]).join('')}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.facultyNameRow}>
                          <Text style={styles.facultyName}>{inst.fullName}</Text>
                          {inst.isVerified && (
                            <Ionicons name="checkmark-circle" size={16} color="#059669" />
                          )}
                        </View>
                        <Text style={styles.facultyProf}>{inst.profession}</Text>
                        <Text style={styles.facultyFlat}>🏠 {inst.tower} - {inst.flatNumber}</Text>
                      </View>
                      <View style={styles.ratingBox}>
                        <Ionicons name="star" size={12} color="#D97706" />
                        <Text style={styles.ratingVal}>{inst.averageRating}</Text>
                      </View>
                    </View>

                    <Text style={styles.facultyBio}>{inst.bio}</Text>

                    <View style={styles.skillsRow}>
                      <Text style={styles.skillsLabel}>SKILLS:</Text>
                      <Text style={styles.skillsText}>{inst.skills}</Text>
                    </View>

                    <View style={styles.facultyFooter}>
                      <Text style={styles.facultyStat}>🎓 {inst.totalSessions} Sessions Hosted</Text>
                      <Text style={styles.facultyStat}>👥 {inst.totalLearners} Neighbors Mentored</Text>
                    </View>
                  </View>
                ))}

                {/* Become Instructor CTA */}
                <View style={styles.becomeInstructorCta}>
                  <Ionicons name="sparkles" size={24} color="#D97706" />
                  <Text style={styles.ctaTitle}>Want to Teach a Class?</Text>
                  <Text style={styles.ctaDesc}>
                    Share your domain expertise, yoga, coding, or music skills with your community.
                  </Text>
                  <TouchableOpacity
                    style={styles.ctaBtn}
                    onPress={() => Alert.alert('Become an Instructor', 'Your host application has been submitted to the Community Learning Committee.')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ctaBtnText}>Apply as Resident Instructor</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Pass Modal ──────────────────────────────────────────────── */}
      <Modal visible={!!activePassModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Class Entry Pass</Text>
              <TouchableOpacity onPress={() => setActivePassModal(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {activePassModal && (
              <View style={styles.qrContent}>
                <Text style={styles.qrProgTitle}>{activePassModal.programTitle}</Text>
                <Text style={styles.qrInstructor}>Instructor: {activePassModal.instructorName}</Text>

                <View style={styles.simulatedQrBox}>
                  <Ionicons name="qr-code" size={140} color="#1E1B4B" />
                  <Text style={styles.qrTokenText}>{activePassModal.qrCheckInToken}</Text>
                </View>

                <Text style={styles.qrInstructions}>
                  Scan this entry pass at the Clubhouse Activity Room for digital session attendance.
                </Text>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setActivePassModal(null)}
                >
                  <Text style={styles.closeModalBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
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

  // ── Hero Banner ───────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#1E1B4B',
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
  heroPillText: { fontSize: 10, fontFamily: 'DMSans-Bold', fontWeight: '800', color: '#FDE68A' },
  heroStatsText: { fontSize: 11, fontWeight: '700', color: '#A5B4FC' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroDesc: { fontSize: 12, color: '#C7D2FE', lineHeight: 17 },

  // ── Search & Filter ───────────────────────────────────────────────
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
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.text },
  catScroll: { flexDirection: 'row', gap: 6, paddingBottom: 12 },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catPillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  catPillTextSelected: { color: '#fff' },

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

  tabContent: { gap: SPACING.md },

  // ── Workshop Card ─────────────────────────────────────────────────
  progCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  progHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  catBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  catBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  levelBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  levelBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  progTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  progSummary: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  instRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    padding: 8,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  instAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instName: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  instTower: { fontSize: 10, color: COLORS.textMuted },
  scheduleBox: { gap: 4, marginBottom: 12 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scheduleText: { fontSize: 11, color: COLORS.textSecondary },
  priceAndEnrollRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  priceLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  priceVal: { fontSize: 16, fontWeight: '900', color: '#059669' },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  enrollBtnDone: { backgroundColor: '#059669' },
  enrollBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  progFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  progSeatsText: { fontSize: 11, color: COLORS.textMuted },
  progModeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // ── Pass Card ─────────────────────────────────────────────────────
  passCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.primaryMid,
    ...SHADOWS.sm,
  },
  passTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  passTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  passInstructor: { fontSize: 12, color: COLORS.primary, fontWeight: '700', marginTop: 2 },
  passSchedule: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  passLoc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  passStatusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  passStatusText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  passTokenBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: RADIUS.md,
    marginTop: 6,
  },
  passTokenLabel: { fontSize: 9, fontWeight: '800', color: COLORS.primary },
  passToken: { fontSize: 14, fontWeight: '900', color: COLORS.primary, letterSpacing: 1 },
  showPassQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  showPassQrText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },

  // ── Faculty Card ──────────────────────────────────────────────────
  facultyHeader: { marginBottom: 6 },
  facultyHeading: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  facultySub: { fontSize: 12, color: COLORS.textMuted },
  facultyCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  facultyTopRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  facultyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facultyAvatarText: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  facultyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  facultyName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  facultyProf: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  facultyFlat: { fontSize: 10, color: COLORS.textMuted },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  ratingVal: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  facultyBio: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 8 },
  skillsRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  skillsLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  skillsText: { fontSize: 10, color: COLORS.textSecondary, flex: 1 },
  facultyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  facultyStat: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },

  // ── Become Instructor CTA ─────────────────────────────────────────
  becomeInstructorCta: {
    backgroundColor: '#312E81',
    padding: 16,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  ctaTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  ctaDesc: { fontSize: 12, color: '#C7D2FE', textAlign: 'center', lineHeight: 16 },
  ctaBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginTop: 6,
  },
  ctaBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },

  // ── Empty State ───────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },

  // ── Pass Modal ────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  qrContent: { alignItems: 'center', marginTop: 12 },
  qrProgTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  qrInstructor: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  simulatedQrBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 14,
  },
  qrTokenText: { fontSize: 15, fontWeight: '900', color: '#1E1B4B', letterSpacing: 2, marginTop: 8 },
  qrInstructions: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
  closeModalBtn: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
