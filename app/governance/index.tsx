import React from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { governanceService } from '@/services/governanceService';

export default function GovernanceOverviewScreen() {
  const router = useRouter();
  const qc = useQueryClient();

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

  const isLoading = statsLoading || meetingsLoading || ballotsLoading || resolutionsLoading;

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

  const quickRsvpMutation = useMutation({
    mutationFn: ({ meetingId, mode }: { meetingId: string; mode: 'PHYSICAL' | 'ONLINE' }) =>
      governanceService.confirmAttendance(meetingId, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceMeetings'] });
      qc.invalidateQueries({ queryKey: ['governanceStats'] });
      Alert.alert('RSVP Confirmed', 'Your attendance and quorum registration have been updated.');
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={statsRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Header Welcome Banner ─────────────────────────────────── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPreTitle}>Mana Community Democratic Suite</Text>
              <Text style={styles.heroTitle}>Governance & Voting Center</Text>
              <Text style={styles.heroSubtitle}>
                Verified 1 Flat = 1 Vote secret balloting, digital AGMs, and legally binding statutory ledger.
              </Text>
            </View>
            <View style={styles.heroIconBadge}>
              <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* ── Summary KPI Grid ──────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/governance/meetings' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.statVal}>{stats?.upcomingMeetings ?? 1}</Text>
            <Text style={styles.statLbl}>Upcoming AGM</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/governance/voting' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="checkbox-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.statVal}>{stats?.openVotes ?? 2} Open</Text>
            <Text style={styles.statLbl}>Active Ballots</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/governance/proposals' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="bulb-outline" size={18} color="#9333EA" />
            </View>
            <Text style={styles.statVal}>{stats?.activeProposals ?? 4}</Text>
            <Text style={styles.statLbl}>Resident Motions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/governance/vault' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="ribbon-outline" size={18} color="#059669" />
            </View>
            <Text style={styles.statVal}>{stats?.passedResolutions ?? 16}</Text>
            <Text style={styles.statLbl}>Passed Resolutions</Text>
          </TouchableOpacity>
        </View>

        {/* ── Dedicated Navigation Hub Cards ────────────────────────── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>Governance Modules & Workflows</Text>

          {/* Card 1: Meetings */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/governance/meetings' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="people" size={24} color="#2563EB" />
            </View>
            <View style={styles.hubContent}>
              <View style={styles.hubTitleRow}>
                <Text style={styles.hubTitle}>Digital AGM & Live Meetings</Text>
                <View style={styles.hubBadgeLive}>
                  <Text style={styles.hubBadgeLiveText}>LIVE / UPCOMING</Text>
                </View>
              </View>
              <Text style={styles.hubDesc}>
                Live AGM livestream, 10-point agenda tracker, real-time quorum meter, proxy nomination & certified MoM minutes.
              </Text>
              <View style={styles.hubFooterRow}>
                <Text style={styles.hubActionLink}>Open AGM Suite (/governance/meetings) →</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: Voting */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/governance/voting' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="checkbox" size={24} color="#D97706" />
            </View>
            <View style={styles.hubContent}>
              <View style={styles.hubTitleRow}>
                <Text style={styles.hubTitle}>Secret Ballot Digital Voting</Text>
                <View style={styles.hubBadgeVote}>
                  <Text style={styles.hubBadgeVoteText}>2 MOTIONS OPEN</Text>
                </View>
              </View>
              <Text style={styles.hubDesc}>
                Confidential cryptographic balloting on society motions, live turnout gauge, wing participation & zero-knowledge receipt tokens.
              </Text>
              <View style={styles.hubFooterRow}>
                <Text style={styles.hubActionLink}>Enter Voting Suite (/governance/voting) →</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 3: Proposals */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/governance/proposals' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="bulb" size={24} color="#9333EA" />
            </View>
            <View style={styles.hubContent}>
              <View style={styles.hubTitleRow}>
                <Text style={styles.hubTitle}>Resident Proposals & Grievances</Text>
                <View style={styles.hubBadgeProp}>
                  <Text style={styles.hubBadgePropText}>50 SUPPORT RULE</Text>
                </View>
              </View>
              <Text style={styles.hubDesc}>
                Submit capital proposals, estate grievances, gather 50 resident co-sponsors to elevate motions directly onto the AGM voting docket.
              </Text>
              <View style={styles.hubFooterRow}>
                <Text style={styles.hubActionLink}>Explore Proposals (/governance/proposals) →</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 4: Vault */}
          <TouchableOpacity
            style={styles.hubCard}
            onPress={() => router.push('/governance/vault' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.hubIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="folder-open" size={24} color="#059669" />
            </View>
            <View style={styles.hubContent}>
              <View style={styles.hubTitleRow}>
                <Text style={styles.hubTitle}>Passed Resolutions & Legal Vault</Text>
                <View style={styles.hubBadgeVault}>
                  <Text style={styles.hubBadgeVaultText}>SEAL CERTIFIED</Text>
                </View>
              </View>
              <Text style={styles.hubDesc}>
                Official repository of general body enacted resolutions, society bylaws, audited financial statements, KSPCB/Fire NOCs & statutory forms.
              </Text>
              <View style={styles.hubFooterRow}>
                <Text style={styles.hubActionLink}>Access Legal Vault (/governance/vault) →</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Featured Live Spotlight: Upcoming AGM Notice ──────────── */}
        {upcomingMeeting && (
          <View style={styles.spotlightCard}>
            <View style={styles.spotlightHeader}>
              <View style={styles.spotlightBadge}>
                <Ionicons name="megaphone" size={14} color="#FFFFFF" />
                <Text style={styles.spotlightBadgeText}>URGENT AGM NOTICE & QUORUM</Text>
              </View>
              <Text style={styles.spotlightDate}>{upcomingMeeting.date}</Text>
            </View>

            <Text style={styles.spotlightTitle}>{upcomingMeeting.title}</Text>
            <Text style={styles.spotlightDesc} numberOfLines={2}>
              {upcomingMeeting.description}
            </Text>

            {/* Quorum Progress Indicator */}
            <View style={styles.spotlightQuorumBox}>
              <View style={styles.spotlightQuorumHeader}>
                <Text style={styles.spotlightQuorumLabel}>Attendance Quorum Status:</Text>
                <Text style={styles.spotlightQuorumValue}>
                  {upcomingMeeting.quorumConfirmed}/{upcomingMeeting.quorumRequired} units ({upcomingMeeting.quorumPercentage}%)
                </Text>
              </View>
              <View style={styles.spotlightQuorumTrack}>
                <View
                  style={[
                    styles.spotlightQuorumFill,
                    { width: `${Math.min(upcomingMeeting.quorumPercentage, 100)}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.spotlightActionRow}>
              <TouchableOpacity
                style={[
                  styles.spotlightRsvpBtn,
                  upcomingMeeting.hasUserConfirmed && styles.spotlightRsvpBtnConfirmed,
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
                    styles.spotlightRsvpBtnText,
                    upcomingMeeting.hasUserConfirmed && { color: '#059669' },
                  ]}
                >
                  {upcomingMeeting.hasUserConfirmed ? 'RSVP Confirmed' : 'Quick RSVP for Quorum'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.spotlightDetailsBtn}
                onPress={() => router.push('/governance/meetings' as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.spotlightDetailsBtnText}>Agenda & Stream</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Featured Active Ballot Spotlight ───────────────────────── */}
        {featuredBallot && (
          <View style={styles.ballotSpotlightCard}>
            <View style={styles.ballotSpotlightHeader}>
              <View style={styles.ballotSpotlightPill}>
                <Ionicons name="radio-button-on" size={13} color="#059669" />
                <Text style={styles.ballotSpotlightPillText}>VOTE ACTIVE NOW</Text>
              </View>
              <Text style={styles.ballotSpotlightDeadline}>Ends {featuredBallot.endDate}</Text>
            </View>

            <Text style={styles.ballotSpotlightTitle}>{featuredBallot.title}</Text>
            <Text style={styles.ballotSpotlightMotion}>"{featuredBallot.resolutionMotionText}"</Text>

            <TouchableOpacity
              style={styles.ballotVoteNowBtn}
              onPress={() => router.push('/governance/voting' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="checkbox-outline" size={18} color="#FFFFFF" />
              <Text style={styles.ballotVoteNowBtnText}>
                {featuredBallot.hasUserVoted ? 'View Voting Results & Receipt →' : 'Cast Secret Ballot Now →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Latest Passed Resolution Spotlight ─────────────────────── */}
        {latestResolution && (
          <View style={styles.resolutionSpotlightCard}>
            <View style={styles.resolutionSpotlightHeader}>
              <View style={styles.resolutionTag}>
                <Ionicons name="ribbon" size={12} color="#1E40AF" />
                <Text style={styles.resolutionTagText}>{latestResolution.resolutionNumber}</Text>
              </View>
              <Text style={styles.resolutionEnactedDate}>Enacted: {latestResolution.passedDate}</Text>
            </View>

            <Text style={styles.resolutionSpotlightTitle}>{latestResolution.title}</Text>
            <Text style={styles.resolutionTallyNote}>
              Passed with {latestResolution.votingSummary.totalPercentageFor}% supermajority vote.
            </Text>

            <TouchableOpacity
              style={styles.vaultLinkBtn}
              onPress={() => router.push('/governance/vault' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.vaultLinkBtnText}>View All 16 Enacted Resolutions in Legal Board →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroPreTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'DMSans-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
    marginTop: 2,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 17,
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statVal: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  statLbl: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    ...SHADOWS.sm,
  },
  hubIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubContent: {
    flex: 1,
  },
  hubTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hubTitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    flex: 1,
  },
  hubBadgeLive: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hubBadgeLiveText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#1E40AF',
  },
  hubBadgeVote: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hubBadgeVoteText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#B45309',
  },
  hubBadgeProp: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hubBadgePropText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#7E22CE',
  },
  hubBadgeVault: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hubBadgeVaultText: {
    fontSize: 9,
    fontFamily: 'DMSans-Bold',
    color: '#047857',
  },
  hubDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  hubFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hubActionLink: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.primary,
  },
  spotlightCard: {
    backgroundColor: '#FFFDF5',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  spotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  spotlightBadgeText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  spotlightDate: {
    fontSize: 11,
    color: '#92400E',
    fontFamily: 'DMSans-Medium',
  },
  spotlightTitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  spotlightDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  spotlightQuorumBox: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: RADIUS.sm,
    marginBottom: 12,
  },
  spotlightQuorumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  spotlightQuorumLabel: {
    fontSize: 11,
    color: '#92400E',
    fontFamily: 'DMSans-Bold',
  },
  spotlightQuorumValue: {
    fontSize: 11,
    color: '#92400E',
  },
  spotlightQuorumTrack: {
    height: 6,
    backgroundColor: '#FDE68A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  spotlightQuorumFill: {
    height: '100%',
    backgroundColor: '#D97706',
  },
  spotlightActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  spotlightRsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  spotlightRsvpBtnConfirmed: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  spotlightRsvpBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  spotlightDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  spotlightDetailsBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.primary,
  },
  ballotSpotlightCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  ballotSpotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ballotSpotlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  ballotSpotlightPillText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    color: '#065F46',
  },
  ballotSpotlightDeadline: {
    fontSize: 11,
    color: '#047857',
  },
  ballotSpotlightTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  ballotSpotlightMotion: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#166534',
    marginBottom: 10,
    lineHeight: 16,
  },
  ballotVoteNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  ballotVoteNowBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  resolutionSpotlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  resolutionSpotlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resolutionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  resolutionTagText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    color: '#1E40AF',
  },
  resolutionEnactedDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  resolutionSpotlightTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  resolutionTallyNote: {
    fontSize: 12,
    color: '#059669',
    fontFamily: 'DMSans-Medium',
    marginBottom: 8,
  },
  vaultLinkBtn: {
    paddingVertical: 6,
  },
  vaultLinkBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.primary,
  },
});
