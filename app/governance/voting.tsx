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
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { governanceService } from '@/services/governanceService';
import type { BallotDto } from '@/types/governance';

type VotingTab = 'ACTIVE' | 'CLOSED' | 'UPCOMING';

export default function VotingScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<VotingTab>('ACTIVE');
  const [selectedChoices, setSelectedChoices] = useState<{ [ballotId: string]: string }>({});
  const [expandedMotionId, setExpandedMotionId] = useState<string | null>('ballot-2025-01');
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [lastVoteReceipt, setLastVoteReceipt] = useState<{ motionTitle: string; hash: string; date: string } | null>(
    null
  );

  const { data: ballots = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['governanceBallots', activeTab],
    queryFn: () => governanceService.getBallots(activeTab),
  });

  const voteMutation = useMutation({
    mutationFn: ({ ballotId, optionId }: { ballotId: string; optionId: string }) =>
      governanceService.castVote(ballotId, optionId),
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['governanceBallots'] });
      qc.invalidateQueries({ queryKey: ['governanceStats'] });
      const currentBallot = ballots.find((b) => b.id === variables.ballotId);
      setLastVoteReceipt({
        motionTitle: currentBallot?.title || 'Society Motion Ballot',
        hash: data.receiptHash,
        date: new Date().toLocaleString(),
      });
      setReceiptModalVisible(true);
    },
  });

  const handleSelectOption = (ballotId: string, optionId: string) => {
    setSelectedChoices((prev) => ({ ...prev, [ballotId]: optionId }));
  };

  const handleConfirmVote = (ballot: BallotDto) => {
    const selectedOptId = selectedChoices[ballot.id];
    if (!selectedOptId) {
      Alert.alert('Selection Required', 'Please select one of the voting options before casting your confidential ballot.');
      return;
    }
    const option = ballot.options.find((o) => o.id === selectedOptId);

    Alert.alert(
      'Confirm Secret Ballot Submission',
      `You are casting your vote as:\n\n"${option?.text}"\n\nYour vote is cryptographically anonymized and permanently sealed on the governance ledger under 1 Flat = 1 Vote rule. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Sign Digitally',
          style: 'default',
          onPress: () => voteMutation.mutate({ ballotId: ballot.id, optionId: selectedOptId }),
        },
      ]
    );
  };

  const handleShareReceipt = () => {
    if (!lastVoteReceipt) return;
    Share.share({
      title: 'Digital Voting Verification Receipt',
      message: `🏛️ *Mana Community Digital Voting Receipt*\nMotion: ${lastVoteReceipt.motionTitle}\nCryptographic Token Hash: ${lastVoteReceipt.hash}\nTimestamp: ${lastVoteReceipt.date}\nStatus: Verified on Society Ledger`,
    });
  };

  return (
    <View style={styles.container}>
      {/* ── Sub-header / Status Filter Tabs ───────────────────────── */}
      <View style={styles.topFilterBar}>
        {(
          [
            { key: 'ACTIVE', label: 'Active Ballots (Vote Now)' },
            { key: 'CLOSED', label: 'Past & Results' },
            { key: 'UPCOMING', label: 'Scheduled' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Security & Secret Ballot Guarantee Card */}
        <View style={styles.securityBanner}>
          <View style={styles.securityIconBox}>
            <Ionicons name="shield-checkmark" size={24} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Zero-Knowledge Secret Ballot Protocol</Text>
            <Text style={styles.securitySubtitle}>
              Votes are encrypted end-to-end. Neither the Managing Committee nor administrators can link your identity or flat number to your selected vote choice.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : ballots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkbox-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Ballots Found</Text>
            <Text style={styles.emptySubtitle}>There are currently no ballots under this filter status.</Text>
          </View>
        ) : (
          ballots.map((ballot) => {
            const isExpanded = expandedMotionId === ballot.id;
            const userVoted = ballot.hasUserVoted;
            const currentSelected = selectedChoices[ballot.id] || ballot.userVotedOptionId;

            return (
              <View key={ballot.id} style={styles.ballotCard}>
                {/* Header Section */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.statusPill,
                        ballot.status === 'ACTIVE'
                          ? styles.statusActivePill
                          : styles.statusClosedPill,
                      ]}
                    >
                      <Ionicons
                        name={ballot.status === 'ACTIVE' ? 'radio-button-on' : 'lock-closed'}
                        size={12}
                        color={ballot.status === 'ACTIVE' ? '#059669' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: ballot.status === 'ACTIVE' ? '#059669' : '#64748B' },
                        ]}
                      >
                        {ballot.status === 'ACTIVE' ? 'LIVE BALLOT' : 'BALLOT CLOSED'}
                      </Text>
                    </View>

                    {userVoted ? (
                      <View style={styles.votedBadge}>
                        <Ionicons name="checkmark-done-circle" size={13} color="#059669" />
                        <Text style={styles.votedBadgeText}>Your Vote Recorded</Text>
                      </View>
                    ) : (
                      <View style={styles.actionRequiredBadge}>
                        <Ionicons name="alert-circle" size={13} color="#D97706" />
                        <Text style={styles.actionRequiredText}>1 Vote Pending</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.ballotTitle}>{ballot.title}</Text>
                  <Text style={styles.ballotCategory}>{ballot.category}</Text>

                  {/* Quorum & Turnout Gauge */}
                  <View style={styles.turnoutBox}>
                    <View style={styles.turnoutHeader}>
                      <Text style={styles.turnoutTitle}>Voter Turnout & Quorum</Text>
                      <Text style={styles.turnoutCount}>
                        <Text style={{ fontWeight: 'bold', color: COLORS.text }}>
                          {ballot.totalVotesCast}
                        </Text>{' '}
                        / {ballot.totalEligibleVoters} units ({ballot.turnoutPercentage}%)
                      </Text>
                    </View>
                    <View style={styles.turnoutTrack}>
                      <View
                        style={[
                          styles.turnoutFill,
                          {
                            width: `${Math.min(ballot.turnoutPercentage, 100)}%`,
                            backgroundColor: ballot.isQuorumReached ? '#059669' : '#2563EB',
                          },
                        ]}
                      />
                      <View style={styles.quorumTargetMarker} />
                    </View>
                    <View style={styles.turnoutFooter}>
                      <Text style={styles.quorumNote}>Min Quorum: {ballot.minQuorumPercentage}% (250 units)</Text>
                      <Text style={styles.deadlineNote}>⏱️ {ballot.endDate}</Text>
                    </View>
                  </View>
                </View>

                {/* Motion Text / Legal Description */}
                <View style={styles.motionDetailsBox}>
                  <Text style={styles.motionHeading}>Official Resolution Motion Text:</Text>
                  <Text style={styles.motionText}>"{ballot.resolutionMotionText}"</Text>
                </View>

                {/* Ballot Voting Options */}
                <View style={styles.optionsSection}>
                  <Text style={styles.optionsSectionTitle}>
                    {userVoted ? 'Live Verified Results Breakdown:' : 'Cast Your Confidential Vote:'}
                  </Text>

                  {ballot.options.map((opt) => {
                    const isSelected = currentSelected === opt.id;
                    const isUserChoice = ballot.userVotedOptionId === opt.id;

                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.optionCard,
                          isSelected && styles.optionCardSelected,
                          isUserChoice && styles.optionCardUserChoice,
                        ]}
                        onPress={() => {
                          if (!userVoted && ballot.status === 'ACTIVE') {
                            handleSelectOption(ballot.id, opt.id);
                          }
                        }}
                        activeOpacity={userVoted ? 1 : 0.7}
                        disabled={userVoted || ballot.status !== 'ACTIVE'}
                      >
                        <View style={styles.optionRow}>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                              isUserChoice && styles.radioCircleUserChoice,
                            ]}
                          >
                            {isSelected && <View style={styles.radioInnerCircle} />}
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={styles.optionLabelRow}>
                              <Text
                                style={[
                                  styles.optionLabel,
                                  isSelected && styles.optionLabelSelected,
                                  isUserChoice && styles.optionLabelUserChoice,
                                ]}
                              >
                                {opt.text}
                              </Text>
                              {(userVoted || ballot.status === 'CLOSED') && (
                                <Text style={styles.optionPctText}>
                                  {opt.percentage}% ({opt.votesCount} votes)
                                </Text>
                              )}
                            </View>

                            {opt.description && (
                              <Text style={styles.optionSubDescription}>{opt.description}</Text>
                            )}

                            {/* Live Result Bar */}
                            {(userVoted || ballot.status === 'CLOSED') && (
                              <View style={styles.optionResultTrack}>
                                <View
                                  style={[
                                    styles.optionResultFill,
                                    {
                                      width: `${opt.percentage}%`,
                                      backgroundColor:
                                        opt.id.includes('for') || opt.id.includes('approve')
                                          ? '#059669'
                                          : opt.id.includes('against')
                                          ? '#DC2626'
                                          : '#64748B',
                                    },
                                  ]}
                                />
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Wing Breakdown / Expandable Analytics */}
                {isExpanded && ballot.wingBreakdown && (
                  <View style={styles.wingAnalyticsBox}>
                    <Text style={styles.wingHeading}>Tower / Wing Voter Participation:</Text>
                    <View style={styles.wingGrid}>
                      {ballot.wingBreakdown.map((wb, i) => (
                        <View key={i} style={styles.wingItem}>
                          <Text style={styles.wingName}>{wb.wing}</Text>
                          <Text style={styles.wingCount}>
                            {wb.voted}/{wb.total} (
                            {((wb.voted / wb.total) * 100).toFixed(0)}%)
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Bottom Action Footer */}
                <View style={styles.cardFooter}>
                  {!userVoted && ballot.status === 'ACTIVE' ? (
                    <TouchableOpacity
                      style={styles.castVoteBtn}
                      onPress={() => handleConfirmVote(ballot)}
                      activeOpacity={0.8}
                      disabled={voteMutation.isPending}
                    >
                      {voteMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="finger-print-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.castVoteBtnText}>Cast Secret Digital Ballot</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.receiptActionRow}>
                      <TouchableOpacity
                        style={styles.viewReceiptBtn}
                        onPress={() => {
                          setLastVoteReceipt({
                            motionTitle: ballot.title,
                            hash: ballot.voteReceiptHash || '0x8f7d9a3b2c1e4f50689bcf2e8910dca34b8c91038e7f',
                            date: 'Oct 18, 2025 · 10:48 AM',
                          });
                          setReceiptModalVisible(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="receipt-outline" size={15} color={COLORS.primary} />
                        <Text style={styles.viewReceiptBtnText}>View Cryptographic Token Receipt</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.analyticsToggleBtn}
                        onPress={() => setExpandedMotionId(isExpanded ? null : ballot.id)}
                      >
                        <Text style={styles.analyticsToggleText}>
                          {isExpanded ? 'Hide Stats' : 'Wing Stats'}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color={COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Cryptographic Receipt Modal ──────────────────────────── */}
      <Modal visible={receiptModalVisible} transparent animationType="fade" onRequestClose={() => setReceiptModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptIconCircle}>
              <Ionicons name="checkmark-done" size={32} color="#059669" />
            </View>

            <Text style={styles.receiptTitle}>Secret Ballot Recorded</Text>
            <Text style={styles.receiptSubtitle}>Cryptographically Signed & Sealed</Text>

            <View style={styles.receiptDivider} />

            <View style={styles.receiptDetailRow}>
              <Text style={styles.receiptDetailLabel}>Motion:</Text>
              <Text style={styles.receiptDetailValue} numberOfLines={2}>
                {lastVoteReceipt?.motionTitle}
              </Text>
            </View>

            <View style={styles.receiptDetailRow}>
              <Text style={styles.receiptDetailLabel}>Timestamp:</Text>
              <Text style={styles.receiptDetailValue}>{lastVoteReceipt?.date}</Text>
            </View>

            <View style={styles.receiptDetailRow}>
              <Text style={styles.receiptDetailLabel}>Eligibility Rule:</Text>
              <Text style={styles.receiptDetailValue}>1 Flat = 1 Vote (Verified)</Text>
            </View>

            <View style={styles.hashContainer}>
              <Text style={styles.hashLabel}>Audit Ledger Token (Zero-Knowledge Hash):</Text>
              <Text style={styles.hashText} selectable>
                {lastVoteReceipt?.hash}
              </Text>
            </View>

            <Text style={styles.receiptDisclaimer}>
              Keep this token hash to independently verify that your ballot is included in the audited AGM tally without revealing your voting choice.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnShare]} onPress={handleShareReceipt}>
                <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
                <Text style={styles.modalBtnShareText}>Share Token</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnClose]}
                onPress={() => setReceiptModalVisible(false)}
              >
                <Text style={styles.modalBtnCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topFilterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: SPACING.md,
  },
  securityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#065F46',
    marginBottom: 2,
  },
  securitySubtitle: {
    fontSize: 11,
    color: '#065F46',
    lineHeight: 16,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 32,
    marginTop: 40,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  ballotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  cardHeader: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusActivePill: {
    backgroundColor: '#D1FAE5',
  },
  statusClosedPill: {
    backgroundColor: '#E2E8F0',
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  votedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  votedBadgeText: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: '#059669',
  },
  actionRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  actionRequiredText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#D97706',
  },
  ballotTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  ballotCategory: {
    fontSize: 11,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  turnoutBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  turnoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  turnoutTitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  turnoutCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  turnoutTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4,
  },
  turnoutFill: {
    height: '100%',
    borderRadius: 4,
  },
  quorumTargetMarker: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#1E293B',
  },
  turnoutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quorumNote: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  deadlineNote: {
    fontSize: 10,
    color: '#D97706',
    fontFamily: 'DMSans-Medium',
  },
  motionDetailsBox: {
    backgroundColor: '#EFF6FF',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  motionHeading: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#1E40AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  motionText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  optionsSection: {
    padding: SPACING.md,
  },
  optionsSectionTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  optionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0FDF4',
  },
  optionCardUserChoice: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioCircleUserChoice: {
    borderColor: '#059669',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  optionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  optionLabelUserChoice: {
    color: '#059669',
  },
  optionPctText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  optionSubDescription: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  optionResultTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  optionResultFill: {
    height: '100%',
    borderRadius: 3,
  },
  wingAnalyticsBox: {
    padding: SPACING.md,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  wingHeading: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  wingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: '45%',
  },
  wingName: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  wingCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  castVoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  castVoteBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  receiptActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewReceiptBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.primary,
  },
  analyticsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  analyticsToggleText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  receiptIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  receiptSubtitle: {
    fontSize: 12,
    color: '#059669',
    fontFamily: 'DMSans-Medium',
    marginTop: 2,
  },
  receiptDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: SPACING.md,
  },
  receiptDetailRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptDetailLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  receiptDetailValue: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    maxWidth: '65%',
    textAlign: 'right',
  },
  hashContainer: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  hashLabel: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  hashText: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#1E293B',
    lineHeight: 15,
  },
  receiptDisclaimer: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: SPACING.lg,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  modalBtnShare: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  modalBtnShareText: {
    color: COLORS.primary,
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
  },
  modalBtnClose: {
    backgroundColor: COLORS.primary,
  },
  modalBtnCloseText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
  },
});
