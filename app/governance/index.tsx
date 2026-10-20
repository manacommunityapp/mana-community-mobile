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
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '@/constants/config';
import { governanceService } from '@/services/governanceService';
import type { ProposalDto } from '@/types/governance';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Managing Committee Leaders ──────────────────────────────────────

const COMMITTEE_MEMBERS = [
  {
    name: 'Col. Rajesh Sharma',
    role: 'Hon. Secretary',
    unit: 'Tower B - 101',
    tenure: '2023 - 2025',
    avatar: 'RS',
    color: '#4F46E5',
    bg: '#EEF2FF',
  },
  {
    name: 'Mrs. Sunita Venkat',
    role: 'Treasurer',
    unit: 'Tower C - 304',
    tenure: '2023 - 2025',
    avatar: 'SV',
    color: '#059669',
    bg: '#DCFCE7',
  },
  {
    name: 'Dr. Arvind Menon',
    role: 'President',
    unit: 'Tower A - 802',
    tenure: '2023 - 2025',
    avatar: 'AM',
    color: '#D97706',
    bg: '#FEF3C7',
  },
  {
    name: 'Adv. P. K. Nair',
    role: 'Legal & Election Officer',
    unit: 'Tower D - 502',
    tenure: '2023 - 2025',
    avatar: 'PN',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
];

const PROPOSAL_CATEGORIES: ProposalDto['category'][] = [
  'AMENITIES',
  'INFRASTRUCTURE',
  'SECURITY',
  'FINANCE',
  'RULES',
  'ENVIRONMENT',
];

export default function GovernanceOverviewScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  // Create Proposal Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [propTitle, setPropTitle] = useState('');
  const [propCategory, setPropCategory] = useState<ProposalDto['category']>('AMENITIES');
  const [propCost, setPropCost] = useState('');
  const [propDesc, setPropDesc] = useState('');

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching: statsRefetching } = useQuery({
    queryKey: ['governanceStats'],
    queryFn: governanceService.getStats,
  });

  const { data: meetings = [], isLoading: meetingsLoading, refetch: refetchMeetings } = useQuery({
    queryKey: ['governanceMeetings'],
    queryFn: () => governanceService.getMeetings(),
  });

  const { data: ballots = [], isLoading: ballotsLoading, refetch: refetchBallots } = useQuery({
    queryKey: ['governanceBallots'],
    queryFn: () => governanceService.getBallots('ACTIVE'),
  });

  const { data: resolutions = [], isLoading: resolutionsLoading, refetch: refetchResolutions } = useQuery({
    queryKey: ['governanceResolutions'],
    queryFn: () => governanceService.getResolutions(),
  });

  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: ['governanceStats'] });
    refetchStats();
    refetchMeetings();
    refetchBallots();
    refetchResolutions();
  };

  const upcomingMeeting = meetings[0];
  const featuredBallot = ballots[0];
  const latestResolution = resolutions[0];

  // Quick RSVP Mutation for Quorum
  const quickRsvpMutation = useMutation({
    mutationFn: ({ meetingId, mode }: { meetingId: string; mode: 'PHYSICAL' | 'ONLINE' }) =>
      governanceService.confirmAttendance(meetingId, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceMeetings'] });
      qc.invalidateQueries({ queryKey: ['governanceStats'] });
      Alert.alert('RSVP Confirmed ✅', 'Your attendance and quorum registration have been updated.');
    },
    onError: () => Alert.alert('Error', 'Could not record RSVP. Please try again.'),
  });

  // Create Proposal Mutation
  const createProposalMutation = useMutation({
    mutationFn: (data: Partial<ProposalDto>) => governanceService.createProposal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceProposals'] });
      qc.invalidateQueries({ queryKey: ['governanceStats'] });
      setCreateModalVisible(false);
      setPropTitle('');
      setPropCost('');
      setPropDesc('');
      Alert.alert(
        'Motion Submitted 🏛️',
        'Your proposal is now active. Gather 50 co-sponsors among verified neighbors to elevate it directly to the AGM docket.',
        [
          { text: 'View Proposals', onPress: () => router.push('/governance/proposals' as any) },
          { text: 'OK' },
        ]
      );
    },
    onError: () => Alert.alert('Error', 'Could not submit proposal.'),
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={statsRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── 1. Resident Civic Passport (Voter Eligibility) ────────── */}
        <View style={s.civicPassportCard}>
          <View style={s.civicPassportLeft}>
            <View style={s.civicUnitBadge}>
              <Ionicons name="home" size={13} color={COLORS.primary} />
              <Text style={s.civicUnitText}>Tower B - 1204</Text>
            </View>
            <Text style={s.civicStatus}>Verified Owner · 1 Flat = 1 Vote</Text>
            <View style={s.civicMetricsRow}>
              <View style={s.civicMetricPill}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={s.civicMetricText}>No Dues Pending</Text>
              </View>
              <View style={[s.civicMetricPill, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="finger-print" size={12} color={COLORS.primary} />
                <Text style={[s.civicMetricText, { color: COLORS.primary }]}>
                  {stats?.myVotesRecorded ?? 8} Votes Cast
                </Text>
              </View>
            </View>
          </View>

          <View style={s.civicSealBox}>
            <LinearGradient
              colors={['#EEF2FF', '#C7D2FE']}
              style={s.civicSealGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              <Text style={s.civicSealText}>VOTER</Text>
            </LinearGradient>
          </View>
        </View>

        {/* ── 2. Hero Democratic Banner ─────────────────────────────── */}
        <LinearGradient
          colors={['#4F46E5', '#7C3AED']}
          style={s.heroBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={s.heroHeaderRow}>
            <View style={s.heroBadgePill}>
              <Ionicons name="ribbon" size={12} color="#FBBF24" />
              <Text style={s.heroBadgePillText}>SOCIETY BYLAWS CERTIFIED</Text>
            </View>
            <TouchableOpacity
              style={s.heroCreateBtn}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={s.heroCreateBtnText}>Raise Motion</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.heroTitle}>Democratic Suite &{'\n'}Voting Center</Text>
          <Text style={s.heroSub}>
            Cryptographic secret ballots, annual general meetings, citizen co-sponsored motions, and legal archives.
          </Text>

          {/* Quick Stats Grid Inside Hero */}
          <View style={s.heroStatsRow}>
            <TouchableOpacity
              style={s.heroStatItem}
              onPress={() => router.push('/governance/meetings' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.heroStatVal}>{stats?.upcomingMeetings ?? 1}</Text>
              <Text style={s.heroStatLbl}>Upcoming AGM</Text>
            </TouchableOpacity>

            <View style={s.heroStatDivider} />

            <TouchableOpacity
              style={s.heroStatItem}
              onPress={() => router.push('/governance/voting' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.heroStatVal}>{stats?.openVotes ?? 2}</Text>
              <Text style={s.heroStatLbl}>Active Ballots</Text>
            </TouchableOpacity>

            <View style={s.heroStatDivider} />

            <TouchableOpacity
              style={s.heroStatItem}
              onPress={() => router.push('/governance/proposals' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.heroStatVal}>{stats?.activeProposals ?? 4}</Text>
              <Text style={s.heroStatLbl}>Motions</Text>
            </TouchableOpacity>

            <View style={s.heroStatDivider} />

            <TouchableOpacity
              style={s.heroStatItem}
              onPress={() => router.push('/governance/vault' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.heroStatVal}>{stats?.passedResolutions ?? 16}</Text>
              <Text style={s.heroStatLbl}>Enacted Laws</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── 3. Active Ballot Countdown & Direct Voting Spotlight ───── */}
        {featuredBallot && (
          <View style={s.spotlightBallotCard}>
            <View style={s.spotlightTopRow}>
              <View style={s.liveBallotPill}>
                <View style={s.liveGreenDot} />
                <Text style={s.liveBallotPillText}>SECRET BALLOT LIVE</Text>
              </View>
              <View style={s.deadlinePill}>
                <Ionicons name="time-outline" size={12} color="#D97706" />
                <Text style={s.deadlineText}>Ends {featuredBallot.endDate}</Text>
              </View>
            </View>

            <Text style={s.spotlightBallotTitle}>{featuredBallot.title}</Text>
            <Text style={s.spotlightMotionText} numberOfLines={2}>
              "{featuredBallot.resolutionMotionText}"
            </Text>

            {/* Turnout Progress Bar */}
            <View style={s.turnoutContainer}>
              <View style={s.turnoutHeader}>
                <Text style={s.turnoutLabel}>Current Voter Turnout:</Text>
                <Text style={s.turnoutValue}>
                  {featuredBallot.turnoutPercentage}% ({featuredBallot.totalVotesCast}/{featuredBallot.totalEligibleVoters} units)
                </Text>
              </View>
              <View style={s.turnoutTrack}>
                <View style={[s.turnoutFill, { width: `${Math.min(featuredBallot.turnoutPercentage, 100)}%` }]} />
              </View>
            </View>

            {/* Direct Cast Ballot CTA */}
            <TouchableOpacity
              style={s.castBallotBtn}
              onPress={() => router.push('/governance/voting' as any)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={s.castBallotGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="checkbox-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={s.castBallotBtnText}>
                  {featuredBallot.hasUserVoted ? 'View Voting Results & Receipt →' : 'Cast Secret Ballot Now →'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 4. Upcoming AGM Notice & Quorum Meter Spotlight ────────── */}
        {upcomingMeeting && (
          <View style={s.agmSpotlightCard}>
            <View style={s.agmHeader}>
              <View style={s.agmBadge}>
                <Ionicons name="megaphone" size={13} color="#FFFFFF" />
                <Text style={s.agmBadgeText}>MANDATORY AGM & QUORUM</Text>
              </View>
              <Text style={s.agmDateText}>{upcomingMeeting.date}</Text>
            </View>

            <Text style={s.agmTitle}>{upcomingMeeting.title}</Text>
            <Text style={s.agmDesc} numberOfLines={2}>
              {upcomingMeeting.description}
            </Text>

            {/* Quorum Progress Bar */}
            <View style={s.quorumBox}>
              <View style={s.quorumHeader}>
                <Text style={s.quorumLabel}>Statutory Quorum Status:</Text>
                <Text style={s.quorumValue}>
                  {upcomingMeeting.quorumConfirmed}/{upcomingMeeting.quorumRequired} Units ({upcomingMeeting.quorumPercentage}%)
                </Text>
              </View>
              <View style={s.quorumTrack}>
                <View
                  style={[
                    s.quorumFill,
                    {
                      width: `${Math.min(upcomingMeeting.quorumPercentage, 100)}%`,
                      backgroundColor: upcomingMeeting.isQuorumAchieved ? '#10B981' : '#F59E0B',
                    },
                  ]}
                />
              </View>
              <View style={s.quorumStatusRow}>
                <Ionicons
                  name={upcomingMeeting.isQuorumAchieved ? 'checkmark-circle' : 'alert-circle'}
                  size={14}
                  color={upcomingMeeting.isQuorumAchieved ? '#059669' : '#D97706'}
                />
                <Text style={[s.quorumStatusText, { color: upcomingMeeting.isQuorumAchieved ? '#059669' : '#D97706' }]}>
                  {upcomingMeeting.isQuorumAchieved
                    ? 'Quorum Achieved · Legally Binding AGM'
                    : 'Awaiting Quorum Confirmation'}
                </Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={s.agmActionRow}>
              <TouchableOpacity
                style={[
                  s.agmRsvpBtn,
                  upcomingMeeting.hasUserConfirmed && s.agmRsvpBtnConfirmed,
                ]}
                onPress={() =>
                  quickRsvpMutation.mutate({ meetingId: upcomingMeeting.id, mode: 'PHYSICAL' })
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name={upcomingMeeting.hasUserConfirmed ? 'checkmark-circle' : 'finger-print'}
                  size={16}
                  color={upcomingMeeting.hasUserConfirmed ? '#059669' : '#FFFFFF'}
                />
                <Text
                  style={[
                    s.agmRsvpBtnText,
                    upcomingMeeting.hasUserConfirmed && { color: '#059669' },
                  ]}
                >
                  {upcomingMeeting.hasUserConfirmed ? 'RSVP Confirmed' : 'Confirm Quorum RSVP'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.agmDetailsBtn}
                onPress={() => router.push('/governance/meetings' as any)}
                activeOpacity={0.7}
              >
                <Text style={s.agmDetailsBtnText}>Agenda & Stream</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── 5. Core Governance Workflows & Modules ─────────────────── */}
        <Text style={s.sectionTitle}>GOVERNANCE WORKFLOWS & HUBS</Text>
        <View style={s.hubGrid}>
          {/* Card 1: Meetings */}
          <TouchableOpacity
            style={s.hubCard}
            onPress={() => router.push('/governance/meetings' as any)}
            activeOpacity={0.85}
          >
            <View style={[s.hubIconCircle, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="people" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.hubTopLine}>
                <Text style={s.hubTitle}>AGM & Committee Meetings</Text>
                <View style={[s.hubBadge, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[s.hubBadgeText, { color: '#2563EB' }]}>LIVE SUITE</Text>
                </View>
              </View>
              <Text style={s.hubDesc}>
                10-point agenda tracker, live AGM stream, proxy nomination & certified MoM minutes.
              </Text>
              <Text style={s.hubActionText}>View Agendas & Quorum →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Voting */}
          <TouchableOpacity
            style={s.hubCard}
            onPress={() => router.push('/governance/voting' as any)}
            activeOpacity={0.85}
          >
            <View style={[s.hubIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="checkbox" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.hubTopLine}>
                <Text style={s.hubTitle}>Secret Ballot Digital Voting</Text>
                <View style={[s.hubBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[s.hubBadgeText, { color: '#D97706' }]}>2 OPEN</Text>
                </View>
              </View>
              <Text style={s.hubDesc}>
                Confidential cryptographic balloting, wing-wise turnout, and zero-knowledge vote receipts.
              </Text>
              <Text style={s.hubActionText}>Enter Voting Booth →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 3: Proposals */}
          <TouchableOpacity
            style={s.hubCard}
            onPress={() => router.push('/governance/proposals' as any)}
            activeOpacity={0.85}
          >
            <View style={[s.hubIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="bulb" size={24} color="#9333EA" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.hubTopLine}>
                <Text style={s.hubTitle}>Resident Proposals & Motions</Text>
                <View style={[s.hubBadge, { backgroundColor: '#F3E8FF' }]}>
                  <Text style={[s.hubBadgeText, { color: '#9333EA' }]}>50 CO-SPONSORS</Text>
                </View>
              </View>
              <Text style={s.hubDesc}>
                Gather 50 verified resident signatures to elevate citizen motions directly to the AGM docket.
              </Text>
              <Text style={s.hubActionText}>Review Resident Proposals →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 4: Vault */}
          <TouchableOpacity
            style={s.hubCard}
            onPress={() => router.push('/governance/vault' as any)}
            activeOpacity={0.85}
          >
            <View style={[s.hubIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="folder-open" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.hubTopLine}>
                <Text style={s.hubTitle}>Passed Resolutions & Legal Vault</Text>
                <View style={[s.hubBadge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[s.hubBadgeText, { color: '#059669' }]}>SEAL VERIFIED</Text>
                </View>
              </View>
              <Text style={s.hubDesc}>
                General body enacted laws, society bylaws, audited balance sheets, and Fire/KSPCB NOCs.
              </Text>
              <Text style={s.hubActionText}>Access Certified Vault →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 6. Managing Committee Office Bearers Carousel ─────────── */}
        <View style={s.committeeSection}>
          <View style={s.committeeHeaderRow}>
            <Text style={s.sectionTitle}>MANAGING COMMITTEE REPRESENTATIVES</Text>
            <Text style={s.committeeTenureText}>Term 2023–25</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.committeeScroll}
          >
            {COMMITTEE_MEMBERS.map((m) => (
              <View key={m.name} style={s.committeeCard}>
                <View style={[s.committeeAvatar, { backgroundColor: m.bg }]}>
                  <Text style={[s.committeeAvatarText, { color: m.color }]}>{m.avatar}</Text>
                </View>
                <Text style={s.committeeName}>{m.name}</Text>
                <Text style={s.committeeRole}>{m.role}</Text>
                <View style={s.committeeUnitPill}>
                  <Text style={s.committeeUnitText}>📍 {m.unit}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── 7. Latest Passed Resolution Highlight ─────────────────── */}
        {latestResolution && (
          <View style={s.latestResCard}>
            <View style={s.latestResHeader}>
              <View style={s.latestResPill}>
                <Ionicons name="ribbon" size={12} color="#1E40AF" />
                <Text style={s.latestResPillText}>{latestResolution.resolutionNumber}</Text>
              </View>
              <Text style={s.latestResDate}>Enacted: {latestResolution.passedDate}</Text>
            </View>

            <Text style={s.latestResTitle}>{latestResolution.title}</Text>
            <Text style={s.latestResSub}>
              Approved by {latestResolution.votingSummary.totalPercentageFor}% supermajority vote.
            </Text>

            <TouchableOpacity
              style={s.latestResBtn}
              onPress={() => router.push('/governance/vault' as any)}
              activeOpacity={0.7}
            >
              <Text style={s.latestResBtnText}>Explore All 16 Enacted Resolutions in Vault →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Modal: Raise a Society Motion / Proposal ──────────────── */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />

            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>Draft a Resident Motion</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>
              Resident proposals that cross 50 verified co-sponsors are formally mandated for inclusion onto the next AGM voting docket.
            </Text>

            <Text style={s.modalInputLabel}>Motion Title:</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g., Installation of 40 Level-2 EV Charging Stations"
              placeholderTextColor={COLORS.textMuted}
              value={propTitle}
              onChangeText={setPropTitle}
            />

            <Text style={s.modalInputLabel}>Category:</Text>
            <View style={s.modalCatRow}>
              {PROPOSAL_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[s.modalCatChip, propCategory === cat && s.modalCatChipActive]}
                  onPress={() => setPropCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.modalCatChipText, propCategory === cat && s.modalCatChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.modalInputLabel}>Estimated CAPEX Budget (Optional):</Text>
            <TextInput
              style={s.modalInput}
              placeholder="e.g., ₹18,00,000 from Asset Fund"
              placeholderTextColor={COLORS.textMuted}
              value={propCost}
              onChangeText={setPropCost}
            />

            <Text style={s.modalInputLabel}>Detailed Motion Text & Justification:</Text>
            <TextInput
              style={[s.modalInput, { minHeight: 90, textAlignVertical: 'top' }]}
              placeholder="Provide background, vendor quotes, and community benefits..."
              placeholderTextColor={COLORS.textMuted}
              value={propDesc}
              onChangeText={setPropDesc}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[s.modalSubmitBtn, (!propTitle.trim() || !propDesc.trim()) && s.modalSubmitDisabled]}
              onPress={() => {
                if (propTitle.trim() && propDesc.trim()) {
                  createProposalMutation.mutate({
                    title: propTitle.trim(),
                    category: propCategory,
                    estimatedCost: propCost.trim() || 'TBD',
                    description: propDesc.trim(),
                    type: 'PROPOSAL',
                  });
                }
              }}
              disabled={!propTitle.trim() || !propDesc.trim() || createProposalMutation.isPending}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={s.modalSubmitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {createProposalMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.modalSubmitText}>Submit Motion for Co-Sponsorship →</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles (Clean App Theme Palette) ────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },

  // 1. Civic Passport
  civicPassportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  civicPassportLeft: {
    flex: 1,
  },
  civicUnitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  civicUnitText: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  civicStatus: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  civicMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  civicMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  civicMetricText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#059669',
    fontWeight: '700',
  },
  civicSealBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  civicSealGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  civicSealText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // 2. Hero Banner
  heroBanner: {
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 14,
    ...SHADOWS.md,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    gap: 4,
  },
  heroBadgePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 3,
  },
  heroCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: FONTS.displayEB,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 30,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 6,
    lineHeight: 18,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginTop: 14,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatVal: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroStatLbl: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  // 3. Active Ballot Spotlight
  spotlightBallotCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    ...SHADOWS.sm,
  },
  spotlightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveBallotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 5,
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveBallotPillText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#D97706',
    fontWeight: '800',
  },
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#D97706',
    fontWeight: '600',
  },
  spotlightBallotTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  spotlightMotionText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 17,
  },
  turnoutContainer: {
    marginTop: 12,
    backgroundColor: COLORS.backgroundAlt,
    padding: 10,
    borderRadius: RADIUS.md,
  },
  turnoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  turnoutLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  turnoutValue: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  turnoutTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  turnoutFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  castBallotBtn: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: 12,
    ...SHADOWS.sm,
  },
  castBallotGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  castBallotBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // 4. AGM Spotlight
  agmSpotlightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  agmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  agmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  agmBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  agmDateText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  agmTitle: {
    fontSize: 16,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  agmDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  quorumBox: {
    marginTop: 12,
    backgroundColor: COLORS.backgroundAlt,
    padding: 12,
    borderRadius: RADIUS.md,
  },
  quorumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quorumLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.textSecondary,
  },
  quorumValue: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  quorumTrack: {
    height: 7,
    backgroundColor: '#E2E8F0',
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  quorumFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  quorumStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  quorumStatusText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  agmActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  agmRsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
  },
  agmRsvpBtnConfirmed: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  agmRsvpBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  agmDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
  },
  agmDetailsBtnText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // 5. Hub Navigation Cards
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  hubGrid: {
    gap: 10,
    marginBottom: 14,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: 12,
    ...SHADOWS.sm,
  },
  hubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  hubTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
  },
  hubBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: 6,
  },
  hubBadgeText: {
    fontSize: 9,
    fontFamily: FONTS.bold,
    fontWeight: '800',
  },
  hubDesc: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  hubActionText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginTop: 6,
  },

  // 6. Committee Section
  committeeSection: {
    marginBottom: 14,
  },
  committeeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  committeeTenureText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
  },
  committeeScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  committeeCard: {
    width: 140,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  committeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  committeeAvatarText: {
    fontSize: 15,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
  },
  committeeName: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
  },
  committeeRole: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginTop: 2,
    textAlign: 'center',
  },
  committeeUnitPill: {
    backgroundColor: COLORS.backgroundAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  committeeUnitText: {
    fontSize: 9,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },

  // 7. Latest Resolution
  latestResCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  latestResHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  latestResPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  latestResPillText: {
    fontSize: 10,
    fontFamily: FONTS.bold,
    color: '#1E40AF',
    fontWeight: '800',
  },
  latestResDate: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  latestResTitle: {
    fontSize: 14,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  latestResSub: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: '#059669',
    marginTop: 2,
  },
  latestResBtn: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  latestResBtnText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  // Modal (Raise Motion)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.displayBold,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSub: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  modalInputLabel: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 12,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  modalCatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.backgroundAlt,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  modalCatChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  modalCatChipText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  modalCatChipTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: 20,
    ...SHADOWS.md,
  },
  modalSubmitDisabled: {
    opacity: 0.5,
  },
  modalSubmitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
