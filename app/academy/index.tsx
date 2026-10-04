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
  UserEnrollment,
} from '@/types/academy';

export default function AcademyCatalogScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedProgramForSyllabus, setSelectedProgramForSyllabus] = useState<AcademyProgram | null>(null);
  const [enrollingProgram, setEnrollingProgram] = useState<AcademyProgram | null>(null);
  const [activePassModal, setActivePassModal] = useState<UserEnrollment | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['academyCategories'],
    queryFn: academyService.getCategories,
  });

  const {
    data: programs = [],
    isLoading: progsLoading,
    refetch: refetchProgs,
    isRefetching,
  } = useQuery({
    queryKey: ['academyPrograms', selectedCategory],
    queryFn: () => academyService.getPrograms(selectedCategory === 'ALL' ? undefined : selectedCategory),
  });

  const { data: enrollments = [], refetch: refetchEnr } = useQuery({
    queryKey: ['myEnrollments'],
    queryFn: academyService.getMyEnrollments,
  });

  const { data: instructors = [], refetch: refetchInst } = useQuery({
    queryKey: ['academyInstructors'],
    queryFn: academyService.getInstructors,
  });

  const onRefresh = () => {
    refetchProgs();
    refetchEnr();
    refetchInst();
  };

  // ── Enrollment Mutation ──────────────────────────────────────────────
  const enrollMutation = useMutation({
    mutationFn: (progId: string) => academyService.enrollProgram(progId),
    onSuccess: (newEnr) => {
      qc.invalidateQueries({ queryKey: ['myEnrollments'] });
      qc.invalidateQueries({ queryKey: ['academyPrograms'] });
      setEnrollingProgram(null);
      setSelectedProgramForSyllabus(null);
      setActivePassModal(newEnr);
    },
    onError: (err: any) => {
      Alert.alert('Enrollment Error', err.message || 'Could not complete registration.');
    },
  });

  // ── Filtering ────────────────────────────────────────────────────────
  const filteredPrograms = programs.filter((p) => {
    if (selectedLevel !== 'ALL' && p.level !== selectedLevel) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.instructorName.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Top Navigation Hub Links ─────────────────────────────────── */}
        <View style={styles.navHubRow}>
          <TouchableOpacity
            style={[styles.navHubCard, styles.navHubCardActive]}
            activeOpacity={0.8}
          >
            <Ionicons name="book" size={16} color="#FFFFFF" />
            <Text style={styles.navHubCardTextActive}>Catalog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navHubCard}
            onPress={() => router.push('/academy/my-learning')}
            activeOpacity={0.8}
          >
            <Ionicons name="school-outline" size={16} color={COLORS.primary} />
            <Text style={styles.navHubCardText}>My Learning</Text>
            {enrollments.length > 0 && (
              <View style={styles.hubCountBadge}>
                <Text style={styles.hubCountText}>{enrollments.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navHubCard}
            onPress={() => router.push('/academy/teaching')}
            activeOpacity={0.8}
          >
            <Ionicons name="easel-outline" size={16} color="#7C3AED" />
            <Text style={[styles.navHubCardText, { color: '#7C3AED' }]}>Teach</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navHubCard}
            onPress={() => router.push('/academy/admin')}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
            <Text style={[styles.navHubCardText, { color: '#059669' }]}>Admin</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hero Banner ─────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Ionicons name="sparkles" size={12} color="#FDE68A" />
              <Text style={styles.heroPillText}>Mana Skill-Sharing Academy</Text>
            </View>
            <Text style={styles.heroStatsText}>18+ Resident Mentors</Text>
          </View>

          <Text style={styles.heroTitle}>Learn From Neighbors. Share Your Passion.</Text>
          <Text style={styles.heroDesc}>
            Join weekend coding camps, sunrise yoga, classical guitar, and AI masterclasses taught by certified resident experts inside Mana Residency.
          </Text>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.heroCtaBtn}
              onPress={() => router.push('/academy/my-learning')}
              activeOpacity={0.85}
            >
              <Ionicons name="ribbon-outline" size={14} color="#1E1B4B" />
              <Text style={styles.heroCtaBtnText}>My Passes & Certificates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroHostBtn}
              onPress={() => router.push('/academy/teaching')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={14} color="#FDE68A" />
              <Text style={styles.heroHostBtnText}>Host a Class</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workshops (Python, Yoga, Guitar, Chess)..."
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

        {/* ── Level Filter Selector ────────────────────────────────────── */}
        <View style={styles.levelFilterRow}>
          <Text style={styles.filterSectionTitle}>Target Level:</Text>
          {['ALL', 'BEGINNER', 'INTERMEDIATE', 'ALL_LEVELS'].map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[styles.levelChip, selectedLevel === lvl && styles.levelChipActive]}
              onPress={() => setSelectedLevel(lvl)}
            >
              <Text style={[styles.levelChipText, selectedLevel === lvl && styles.levelChipTextActive]}>
                {lvl.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Workshop Catalog Cards ──────────────────────────────────── */}
        {progsLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : filteredPrograms.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="book-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Classes Found</Text>
            <Text style={styles.emptySub}>Try searching for different keywords or clear your active category filters.</Text>
          </View>
        ) : (
          <View style={styles.programList}>
            {filteredPrograms.map((prog) => {
              const seatPercent = Math.min(100, Math.round((prog.enrolledCount / prog.totalSeats) * 100));
              const isAlmostFull = seatPercent >= 80;

              return (
                <View key={prog.id} style={styles.progCard}>
                  {/* Category & Level Badges */}
                  <View style={styles.progTopBar}>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{prog.categoryName}</Text>
                    </View>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelBadgeText}>{prog.level.replace('_', ' ')}</Text>
                    </View>
                    {prog.certificateProvided && (
                      <View style={styles.certPill}>
                        <Ionicons name="ribbon" size={11} color="#B45309" />
                        <Text style={styles.certPillText}>Certificate</Text>
                      </View>
                    )}
                  </View>

                  {/* Title & Summary */}
                  <Text style={styles.progTitle}>{prog.title}</Text>
                  <Text style={styles.progSummary} numberOfLines={2}>
                    {prog.summary}
                  </Text>

                  {/* Tags */}
                  {prog.tags && prog.tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {prog.tags.slice(0, 3).map((tag, idx) => (
                        <View key={idx} style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Instructor Residency Row */}
                  <View style={styles.instRow}>
                    <View style={styles.instAvatar}>
                      <Text style={styles.instAvatarText}>{prog.instructorName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.instName}>{prog.instructorName}</Text>
                        <Ionicons name="checkmark-circle" size={13} color="#059669" />
                      </View>
                      <Text style={styles.instTower}>
                        🏠 {prog.instructorTower || 'Resident Host'} {prog.instructorFlat ? `(${prog.instructorFlat})` : ''}
                      </Text>
                    </View>
                    {prog.instructorRating && (
                      <View style={styles.ratingBox}>
                        <Ionicons name="star" size={12} color="#D97706" />
                        <Text style={styles.ratingVal}>{prog.instructorRating}</Text>
                      </View>
                    )}
                  </View>

                  {/* Schedule Details Box */}
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
                      <Text style={styles.scheduleText} numberOfLines={1}>{prog.location}</Text>
                    </View>
                  </View>

                  {/* Seat Availability Bar */}
                  <View style={styles.seatBarWrap}>
                    <View style={styles.seatLabelRow}>
                      <Text style={styles.seatLabelText}>
                        Seats: {prog.enrolledCount} of {prog.totalSeats} booked
                      </Text>
                      <Text style={[styles.seatPercentText, isAlmostFull && { color: '#DC2626' }]}>
                        {isAlmostFull ? '🔥 Filling Fast' : `${prog.totalSeats - prog.enrolledCount} left`}
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${seatPercent}%` },
                          isAlmostFull && { backgroundColor: '#EA580C' },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Pricing and Action Buttons */}
                  <View style={styles.priceAndActionRow}>
                    <View>
                      <Text style={styles.priceLabel}>ENROLLMENT FEE</Text>
                      <Text style={styles.priceVal}>
                        {prog.pricingType === 'FREE' ? 'FREE' : `₹${prog.price}`}
                      </Text>
                    </View>

                    <View style={styles.actionBtnGroup}>
                      <TouchableOpacity
                        style={styles.syllabusBtn}
                        onPress={() => setSelectedProgramForSyllabus(prog)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="document-text-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.syllabusBtnText}>Syllabus</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.enrollBtn, prog.userEnrolled && styles.enrollBtnDone]}
                        onPress={() => {
                          if (prog.userEnrolled) {
                            router.push('/academy/my-learning');
                          } else {
                            setEnrollingProgram(prog);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={prog.userEnrolled ? 'checkmark-circle' : 'finger-print-outline'}
                          size={15}
                          color="#fff"
                        />
                        <Text style={styles.enrollBtnText}>
                          {prog.userEnrolled ? 'View Pass' : 'Enroll Now'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Resident Faculty Spotlight ──────────────────────────────── */}
        <View style={styles.facultySection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionHeading}>Resident Mentors</Text>
              <Text style={styles.sectionSub}>Certified coaches living right in your towers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/academy/teaching')}>
              <Text style={styles.viewAllText}>Join Faculty →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.facultyScroll}>
            {instructors.map((inst) => (
              <View key={inst.id} style={styles.facultyMiniCard}>
                <View style={styles.facultyMiniTop}>
                  <View style={styles.facultyMiniAvatar}>
                    <Text style={styles.facultyMiniAvatarText}>{inst.fullName.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facultyMiniName} numberOfLines={1}>{inst.fullName}</Text>
                    <Text style={styles.facultyMiniProf} numberOfLines={1}>{inst.profession}</Text>
                  </View>
                </View>
                <Text style={styles.facultyMiniFlat}>📍 {inst.tower} - {inst.flatNumber}</Text>
                <View style={styles.facultyMiniStats}>
                  <Text style={styles.facultyMiniStatText}>⭐ {inst.averageRating} ({inst.reviewCount})</Text>
                  <Text style={styles.facultyMiniStatText}>👥 {inst.totalLearners} taught</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── Syllabus & Details Modal ─────────────────────────────────── */}
      <Modal visible={!!selectedProgramForSyllabus} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.sheetCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderCat}>{selectedProgramForSyllabus?.categoryName}</Text>
                <Text style={styles.modalTitle}>{selectedProgramForSyllabus?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedProgramForSyllabus(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {selectedProgramForSyllabus && (
                <>
                  <Text style={styles.sheetSectionHeading}>About this Program</Text>
                  <Text style={styles.sheetDesc}>{selectedProgramForSyllabus.description}</Text>

                  {/* Prerequisites */}
                  {selectedProgramForSyllabus.prerequisites && (
                    <View style={styles.sheetBox}>
                      <Text style={styles.sheetBoxTitle}>💡 Prerequisites & Gear</Text>
                      {selectedProgramForSyllabus.prerequisites.map((p, idx) => (
                        <Text key={idx} style={styles.sheetBoxItem}>• {p}</Text>
                      ))}
                    </View>
                  )}

                  {/* Session Syllabus */}
                  <Text style={styles.sheetSectionHeading}>Session-by-Session Curriculum</Text>
                  {selectedProgramForSyllabus.syllabus && selectedProgramForSyllabus.syllabus.length > 0 ? (
                    selectedProgramForSyllabus.syllabus.map((s) => (
                      <View key={s.sessionNumber} style={styles.syllabusItemCard}>
                        <View style={styles.syllabusNumBadge}>
                          <Text style={styles.syllabusNumText}>#{s.sessionNumber}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.syllabusItemTitle}>{s.title}</Text>
                          <Text style={styles.syllabusItemDesc}>{s.description}</Text>
                          <Text style={styles.syllabusItemDur}>⏱️ {s.durationMinutes} Minutes</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.sheetDesc}>Interactive practical hands-on masterclass sessions.</Text>
                  )}

                  {/* Instructor Bio */}
                  <View style={styles.sheetInstructorCard}>
                    <Text style={styles.sheetBoxTitle}>👨‍🏫 Taught by {selectedProgramForSyllabus.instructorName}</Text>
                    <Text style={styles.sheetInstFlat}>
                      Resides in {selectedProgramForSyllabus.instructorTower} · Flat {selectedProgramForSyllabus.instructorFlat}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View>
                <Text style={styles.priceLabel}>TOTAL FEE</Text>
                <Text style={styles.priceVal}>
                  {selectedProgramForSyllabus?.pricingType === 'FREE'
                    ? 'FREE'
                    : `₹${selectedProgramForSyllabus?.price}`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalEnrollBtn}
                onPress={() => {
                  if (selectedProgramForSyllabus) {
                    setEnrollingProgram(selectedProgramForSyllabus);
                  }
                }}
              >
                <Text style={styles.modalEnrollBtnText}>
                  {selectedProgramForSyllabus?.userEnrolled ? 'Enrolled (View Pass)' : 'Proceed to Register'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Enrollment Confirmation & Payment Modal ─────────────────── */}
      <Modal visible={!!enrollingProgram} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.checkoutCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Enrollment</Text>
              <TouchableOpacity onPress={() => setEnrollingProgram(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {enrollingProgram && (
              <View style={styles.checkoutContent}>
                <View style={styles.checkoutSummaryBox}>
                  <Text style={styles.checkoutProgTitle}>{enrollingProgram.title}</Text>
                  <Text style={styles.checkoutInst}>Mentor: {enrollingProgram.instructorName}</Text>
                  <Text style={styles.checkoutLoc}>📍 {enrollingProgram.location}</Text>
                  <Text style={styles.checkoutDate}>📅 Starts: {enrollingProgram.startDate} ({enrollingProgram.startTime})</Text>
                </View>

                <View style={styles.billTable}>
                  <View style={styles.billRow}>
                    <Text style={styles.billKey}>Course Fee</Text>
                    <Text style={styles.billVal}>
                      {enrollingProgram.pricingType === 'FREE' ? '₹0 (Free)' : `₹${enrollingProgram.price}`}
                    </Text>
                  </View>
                  <View style={styles.billRow}>
                    <Text style={styles.billKey}>Resident Discount</Text>
                    <Text style={[styles.billVal, { color: '#059669' }]}>- ₹0 (Community Benefit)</Text>
                  </View>
                  <View style={styles.billDivider} />
                  <View style={styles.billRow}>
                    <Text style={styles.billTotalKey}>Total Payable</Text>
                    <Text style={styles.billTotalVal}>
                      {enrollingProgram.pricingType === 'FREE' ? 'FREE' : `₹${enrollingProgram.price}`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.confirmPayBtn}
                  onPress={() => enrollMutation.mutate(enrollingProgram.id)}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={18} color="#fff" />
                      <Text style={styles.confirmPayBtnText}>
                        {enrollingProgram.pricingType === 'FREE' ? 'Confirm Free Seat' : 'Pay & Confirm Registration'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Pass & QR Success Modal ─────────────────────────────────── */}
      <Modal visible={!!activePassModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.passSuccessCard}>
            <View style={styles.passSuccessHeader}>
              <View style={styles.successIconBubble}>
                <Ionicons name="checkmark-circle" size={36} color="#059669" />
              </View>
              <Text style={styles.passSuccessTitle}>Enrollment Confirmed!</Text>
              <Text style={styles.passSuccessSub}>Your digital entry token is ready for class check-in</Text>
            </View>

            {activePassModal && (
              <View style={styles.passTicketBox}>
                <Text style={styles.ticketProgTitle}>{activePassModal.programTitle}</Text>
                <Text style={styles.ticketInstructor}>Instructor: {activePassModal.instructorName}</Text>
                <Text style={styles.ticketSchedule}>📅 {activePassModal.startDate} · {activePassModal.startTime}</Text>
                <Text style={styles.ticketLoc}>📍 {activePassModal.location}</Text>

                <View style={styles.ticketDivider} />

                <View style={styles.ticketTokenBox}>
                  <Text style={styles.ticketTokenLabel}>SESSION CHECK-IN TOKEN</Text>
                  <Text style={styles.ticketTokenText}>{activePassModal.qrCheckInToken}</Text>
                  <Ionicons name="qr-code" size={100} color="#1E1B4B" style={{ marginTop: 8 }} />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setActivePassModal(null);
                router.push('/academy/my-learning');
              }}
            >
              <Text style={styles.doneBtnText}>View in My Learning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: 40 },

  // ── Nav Hub Links ─────────────────────────────────────────────────
  navHubRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: SPACING.md,
  },
  navHubCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  navHubCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  navHubCardText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  navHubCardTextActive: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  hubCountBadge: {
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubCountText: { color: '#fff', fontSize: 9, fontWeight: '900' },

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
  heroPillText: { fontSize: 10, fontWeight: '800', color: '#FDE68A' },
  heroStatsText: { fontSize: 11, fontWeight: '700', color: '#A5B4FC' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroDesc: { fontSize: 12, color: '#C7D2FE', lineHeight: 17, marginBottom: 12 },
  heroActionsRow: { flexDirection: 'row', gap: 8 },
  heroCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  heroCtaBtnText: { fontSize: 11, fontWeight: '800', color: '#1E1B4B' },
  heroHostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  heroHostBtnText: { fontSize: 11, fontWeight: '800', color: '#FDE68A' },

  // ── Search & Filters ──────────────────────────────────────────────
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
  catScroll: { flexDirection: 'row', gap: 6, paddingBottom: 10 },
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

  levelFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.md,
  },
  filterSectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  levelChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
  },
  levelChipActive: { backgroundColor: COLORS.primaryLight },
  levelChipText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
  levelChipTextActive: { color: COLORS.primary, fontWeight: '800' },

  // ── Program Cards ─────────────────────────────────────────────────
  programList: { gap: SPACING.md },
  progCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  progTopBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
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
  certPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginLeft: 'auto',
  },
  certPillText: { fontSize: 9, fontWeight: '800', color: '#92400E' },
  progTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  progSummary: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  tagBadge: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  tagBadgeText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

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
  instAvatarText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  instName: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  instTower: { fontSize: 10, color: COLORS.textMuted },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  ratingVal: { fontSize: 11, fontWeight: '800', color: '#B45309' },

  scheduleBox: { gap: 4, marginBottom: 10 },
  scheduleItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scheduleText: { fontSize: 11, color: COLORS.textSecondary },

  seatBarWrap: { marginBottom: 12 },
  seatLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  seatLabelText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },
  seatPercentText: { fontSize: 10, color: COLORS.primary, fontWeight: '800' },
  progressBarBg: { height: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  priceAndActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  priceLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  priceVal: { fontSize: 16, fontWeight: '900', color: '#059669' },
  actionBtnGroup: { flexDirection: 'row', gap: 6 },
  syllabusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.primaryMid,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  syllabusBtnText: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
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
  enrollBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // ── Faculty Spotlight ─────────────────────────────────────────────
  facultySection: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sectionSub: { fontSize: 11, color: COLORS.textMuted },
  viewAllText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  facultyScroll: { flexDirection: 'row', gap: 10, paddingBottom: 10 },
  facultyMiniCard: {
    width: 200,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  facultyMiniTop: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 },
  facultyMiniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facultyMiniAvatarText: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  facultyMiniName: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  facultyMiniProf: { fontSize: 10, color: COLORS.textMuted },
  facultyMiniFlat: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 6 },
  facultyMiniStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  facultyMiniStatText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  // ── Modals & Sheets ───────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalHeaderCat: { fontSize: 11, fontWeight: '800', color: COLORS.primary, textTransform: 'uppercase' },
  modalTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text, marginTop: 2 },
  modalScroll: { marginBottom: 16 },
  sheetSectionHeading: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 12, marginBottom: 6 },
  sheetDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  sheetBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginTop: 10,
    gap: 4,
  },
  sheetBoxTitle: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  sheetBoxItem: { fontSize: 11, color: COLORS.textSecondary },
  syllabusItemCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 8,
  },
  syllabusNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syllabusNumText: { fontSize: 10, fontWeight: '900', color: COLORS.primary },
  syllabusItemTitle: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  syllabusItemDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  syllabusItemDur: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
  sheetInstructorCard: {
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: RADIUS.md,
    marginTop: 12,
  },
  sheetInstFlat: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  modalEnrollBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  modalEnrollBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // ── Checkout Card ─────────────────────────────────────────────────
  checkoutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    margin: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
  },
  checkoutContent: { marginTop: 8 },
  checkoutSummaryBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: RADIUS.md,
    gap: 4,
    marginBottom: 12,
  },
  checkoutProgTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  checkoutInst: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  checkoutLoc: { fontSize: 11, color: COLORS.textSecondary },
  checkoutDate: { fontSize: 11, color: COLORS.textMuted },
  billTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 10,
    marginBottom: 16,
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billKey: { fontSize: 11, color: COLORS.textSecondary },
  billVal: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  billDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 6 },
  billTotalKey: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  billTotalVal: { fontSize: 15, fontWeight: '900', color: '#059669' },
  confirmPayBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  confirmPayBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // ── Success Pass Modal ────────────────────────────────────────────
  passSuccessCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 20,
    margin: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
  },
  passSuccessHeader: { alignItems: 'center', marginBottom: 14 },
  successIconBubble: { marginBottom: 6 },
  passSuccessTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  passSuccessSub: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  passTicketBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  ticketProgTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  ticketInstructor: { fontSize: 11, color: COLORS.primary, textAlign: 'center', marginTop: 2, fontWeight: '700' },
  ticketSchedule: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
  ticketLoc: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  ticketDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  ticketTokenBox: { alignItems: 'center' },
  ticketTokenLabel: { fontSize: 9, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  ticketTokenText: { fontSize: 15, fontWeight: '900', color: '#1E1B4B', letterSpacing: 2, marginTop: 4 },
  doneBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // ── Empty State ───────────────────────────────────────────────────
  emptyWrap: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },
});

