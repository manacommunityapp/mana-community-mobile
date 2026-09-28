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
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { governanceService } from '@/services/governanceService';
import type {
  MeetingDto,
  ProposalDto,
  BallotDto,
  ResolutionDto,
  VaultDocumentDto,
} from '@/types/governance';

type TabType = 'MEETINGS' | 'PROPOSALS' | 'VOTING' | 'RESOLUTIONS' | 'VAULT';

export default function GovernanceScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('MEETINGS');
  const [proposalModalVisible, setProposalModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newCategory, setNewCategory] = useState<ProposalDto['category']>('AMENITIES');
  const [selectedBallotChoice, setSelectedBallotChoice] = useState<{ [ballotId: string]: string }>({});
  const [expandedAgendaId, setExpandedAgendaId] = useState<number | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['governanceStats'],
    queryFn: governanceService.getStats,
  });

  const { data: meetings = [], isLoading: meetingsLoading, refetch: refetchMeetings, isRefetching } = useQuery({
    queryKey: ['governanceMeetings'],
    queryFn: () => governanceService.getMeetings(),
  });

  const { data: proposals = [], isLoading: proposalsLoading, refetch: refetchProposals } = useQuery({
    queryKey: ['governanceProposals'],
    queryFn: () => governanceService.getProposals(),
  });

  const { data: ballots = [], isLoading: ballotsLoading, refetch: refetchBallots } = useQuery({
    queryKey: ['governanceBallots'],
    queryFn: governanceService.getBallots,
  });

  const { data: resolutions = [], isLoading: resolutionsLoading, refetch: refetchResolutions } = useQuery({
    queryKey: ['governanceResolutions'],
    queryFn: governanceService.getResolutions,
  });

  const { data: vaultDocs = [], isLoading: vaultLoading, refetch: refetchVault } = useQuery({
    queryKey: ['governanceVault'],
    queryFn: () => governanceService.getVaultDocuments(),
  });

  const isLoading = statsLoading || meetingsLoading || proposalsLoading || ballotsLoading || resolutionsLoading || vaultLoading;

  const onRefresh = () => {
    qc.invalidateQueries({ queryKey: ['governanceStats'] });
    refetchMeetings();
    refetchProposals();
    refetchBallots();
    refetchResolutions();
    refetchVault();
  };

  // ── Mutations ────────────────────────────────────────────────────────
  const supportMutation = useMutation({
    mutationFn: (id: string) => governanceService.supportProposal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceProposals'] });
      Alert.alert('Supported!', 'Your support for this proposal has been recorded.');
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ ballotId, optionId }: { ballotId: string; optionId: string }) =>
      governanceService.castVote(ballotId, optionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceBallots'] });
      Alert.alert('Vote Cast!', 'Your confidential ballot has been cryptographically recorded on the ledger.');
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ meetingId, mode }: { meetingId: string; mode: 'PHYSICAL' | 'ONLINE' }) =>
      governanceService.confirmAttendance(meetingId, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceMeetings'] });
      Alert.alert('RSVP Confirmed', 'Your attendance and quorum registration have been updated.');
    },
  });

  const createProposalMutation = useMutation({
    mutationFn: (data: Partial<ProposalDto>) => governanceService.createProposal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceProposals'] });
      setProposalModalVisible(false);
      setNewTitle('');
      setNewDesc('');
      setNewCost('');
      Alert.alert('Proposal Submitted', 'Your proposal is now live for community review and resident support.');
    },
  });

  const handleCreateProposal = () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      Alert.alert('Error', 'Please provide a title and detailed description.');
      return;
    }
    createProposalMutation.mutate({
      title: newTitle,
      description: newDesc,
      estimatedCost: newCost ? `₹${newCost}` : '₹0',
      category: newCategory,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Summary Stats Carousel ──────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.primaryLight }]}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.statVal}>{stats?.upcomingMeetings ?? 1} (AGM)</Text>
            <Text style={styles.statLbl}>Upcoming Meetings</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="checkbox-outline" size={18} color="#D97706" />
            </View>
            <Text style={styles.statVal}>{stats?.openVotes ?? 1} Open</Text>
            <Text style={styles.statLbl}>Active Ballots</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="document-text-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.statVal}>{stats?.activeProposals ?? 3} Active</Text>
            <Text style={styles.statLbl}>Proposals</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color="#059669" />
            </View>
            <Text style={styles.statVal}>{stats?.passedResolutions ?? 14} Passed</Text>
            <Text style={styles.statLbl}>Resolutions</Text>
          </View>
        </View>

        {/* ── Navigation Tab Bar ──────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {[
            { key: 'MEETINGS', label: 'Meetings & AGM', icon: 'people-outline' },
            { key: 'VOTING', label: 'Voting Center', icon: 'checkmark-circle-outline' },
            { key: 'PROPOSALS', label: 'Proposals Hub', icon: 'bulb-outline' },
            { key: 'RESOLUTIONS', label: 'Resolutions', icon: 'ribbon-outline' },
            { key: 'VAULT', label: 'Digital Vault', icon: 'folder-outline' },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key as TabType)}
                activeOpacity={0.7}
              >
                <Ionicons name={t.icon as any} size={15} color={isActive ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} size="large" />
        ) : (
          <>
            {/* ── TAB 1: MEETINGS & AGM ───────────────────────────────── */}
            {activeTab === 'MEETINGS' && (
              <View style={styles.tabContent}>
                {meetings.map((m) => (
                  <View key={m.id} style={styles.meetingCard}>
                    {/* Header Banner */}
                    <View style={styles.meetingHero}>
                      <View style={styles.badgeRow}>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>📢 OFFICIAL NOTICE · {m.type}</Text>
                        </View>
                        {m.isQuorumAchieved && (
                          <View style={styles.quorumTag}>
                            <Ionicons name="shield-checkmark" size={12} color="#059669" />
                            <Text style={styles.quorumTagText}>Quorum Achieved (51.5%)</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.meetingTitle}>{m.title}</Text>
                      <Text style={styles.meetingDesc}>{m.description}</Text>

                      <View style={styles.meetingMetaBox}>
                        <View style={styles.metaRow}>
                          <Ionicons name="calendar-outline" size={14} color={COLORS.primaryMid} />
                          <Text style={styles.metaText}>{m.date}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={14} color={COLORS.primaryMid} />
                          <Text style={styles.metaText}>{m.time}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={14} color={COLORS.primaryMid} />
                          <Text style={styles.metaText}>{m.location}</Text>
                        </View>
                      </View>

                      {/* Quorum Progress */}
                      <View style={styles.quorumSection}>
                        <View style={styles.quorumHeader}>
                          <Text style={styles.quorumTitle}>Attendance Quorum Status</Text>
                          <Text style={styles.quorumCount}>
                            {m.quorumConfirmed} Confirmed / {m.quorumRequired} Min Required
                          </Text>
                        </View>
                        <View style={styles.quorumBarBg}>
                          <View style={[styles.quorumBarFill, { width: `${Math.min(m.quorumPercentage, 100)}%` }]} />
                        </View>
                      </View>

                      {/* RSVP Buttons */}
                      <View style={styles.rsvpActionRow}>
                        <TouchableOpacity
                          style={[styles.rsvpBtn, m.hasUserConfirmed && styles.rsvpBtnConfirmed]}
                          onPress={() => rsvpMutation.mutate({ meetingId: m.id, mode: 'PHYSICAL' })}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={m.hasUserConfirmed ? 'checkmark-circle' : 'finger-print-outline'}
                            size={16}
                            color={m.hasUserConfirmed ? '#059669' : COLORS.primary}
                          />
                          <Text style={[styles.rsvpBtnText, m.hasUserConfirmed && { color: '#059669' }]}>
                            {m.hasUserConfirmed ? 'RSVP Confirmed (In-Person)' : 'Confirm In-Person Attendance'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* 10-Point Agenda Section */}
                    <View style={styles.agendaSection}>
                      <Text style={styles.agendaHeading}>Official 10-Point Meeting Agenda</Text>
                      {m.agenda.map((ag) => {
                        const isExpanded = expandedAgendaId === ag.id;
                        return (
                          <TouchableOpacity
                            key={ag.id}
                            style={styles.agendaItem}
                            onPress={() => setExpandedAgendaId(isExpanded ? null : ag.id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.agendaRow}>
                              <View style={styles.agendaOrderCircle}>
                                <Text style={styles.agendaOrderText}>{ag.order}</Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.agendaTitle}>{ag.title}</Text>
                                <Text style={styles.agendaPresenter}>
                                  👤 {ag.presenter} · ⏱️ {ag.duration}
                                </Text>
                              </View>
                              <Ionicons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={COLORS.textMuted}
                              />
                            </View>
                            {isExpanded && (
                              <View style={styles.agendaDetailBox}>
                                <Text style={styles.agendaDetailText}>{ag.description}</Text>
                                {ag.status === 'VOTING_OPEN' && (
                                  <View style={styles.votingOpenBadge}>
                                    <Ionicons name="flash" size={12} color="#D97706" />
                                    <Text style={styles.votingOpenText}>Electronic Voting Scheduled on Ballot</Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 2: VOTING CENTER ────────────────────────────────── */}
            {activeTab === 'VOTING' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeading}>Active Democratic Ballots</Text>
                  <Text style={styles.sectionSub}>Confidential electronic voting for verified flat owners</Text>
                </View>

                {ballots.map((b) => (
                  <View key={b.id} style={styles.ballotCard}>
                    <View style={styles.ballotHeader}>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{b.category}</Text>
                      </View>
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>POLL OPEN</Text>
                      </View>
                    </View>

                    <Text style={styles.ballotTitle}>{b.title}</Text>
                    <Text style={styles.ballotDesc}>{b.description}</Text>

                    {/* Participation Metric */}
                    <View style={styles.ballotMetricRow}>
                      <Text style={styles.ballotMetricText}>
                        👥 <Text style={{ fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.text }}>{b.totalVotesCast}</Text> of {b.totalEligibleVoters} Voted ({b.turnoutPercentage}%)
                      </Text>
                      <Text style={styles.ballotMetricText}>
                        ⏳ Ends on {b.endDate}
                      </Text>
                    </View>

                    {/* Options */}
                    <View style={styles.optionsList}>
                      {b.options.map((opt) => {
                        const isSelected = selectedBallotChoice[b.id] === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                            onPress={() => setSelectedBallotChoice((prev) => ({ ...prev, [b.id]: opt.id }))}
                            activeOpacity={0.8}
                          >
                            <View style={styles.optionRadio}>
                              {isSelected && <View style={styles.optionRadioInner} />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                {opt.text}
                              </Text>
                              <View style={styles.voteProgressBg}>
                                <View style={[styles.voteProgressFill, { width: `${opt.percentage}%` }]} />
                              </View>
                            </View>
                            <Text style={styles.optionPct}>{opt.percentage}%</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Cast Vote Button */}
                    <TouchableOpacity
                      style={[
                        styles.castVoteBtn,
                        !selectedBallotChoice[b.id] && styles.castVoteBtnDisabled,
                      ]}
                      disabled={!selectedBallotChoice[b.id] || voteMutation.isPending}
                      onPress={() =>
                        voteMutation.mutate({
                          ballotId: b.id,
                          optionId: selectedBallotChoice[b.id],
                        })
                      }
                      activeOpacity={0.8}
                    >
                      {voteMutation.isPending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                          <Text style={styles.castVoteBtnText}>Cast Confidential Digital Ballot</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 3: PROPOSALS HUB ────────────────────────────────── */}
            {activeTab === 'PROPOSALS' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTitleRow}>
                  <View>
                    <Text style={styles.sectionHeading}>Resident Proposals Pipeline</Text>
                    <Text style={styles.sectionSub}>Proposals gathering support for Committee & AGM agenda</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addProposalBtn}
                    onPress={() => setProposalModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addProposalBtnText}>New</Text>
                  </TouchableOpacity>
                </View>

                {proposals.map((p) => (
                  <View key={p.id} style={styles.proposalCard}>
                    <View style={styles.proposalHeader}>
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{p.category}</Text>
                      </View>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>{p.status.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>

                    <Text style={styles.proposalTitle}>{p.title}</Text>
                    <Text style={styles.proposalDesc}>{p.description}</Text>

                    <View style={styles.costAndAuthorRow}>
                      <View style={styles.costBadge}>
                        <Text style={styles.costLabel}>EST. BUDGET</Text>
                        <Text style={styles.costValue}>{p.estimatedCost}</Text>
                      </View>
                      <View style={styles.authorBox}>
                        <Text style={styles.authorText}>👤 {p.submittedBy}</Text>
                        <Text style={styles.authorDate}>📅 {p.submittedDate}</Text>
                      </View>
                    </View>

                    {/* Support Button */}
                    <View style={styles.proposalFooter}>
                      <TouchableOpacity
                        style={[styles.supportBtn, p.hasUserSupported && styles.supportBtnActive]}
                        onPress={() => supportMutation.mutate(p.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={p.hasUserSupported ? 'heart' : 'heart-outline'}
                          size={18}
                          color={p.hasUserSupported ? '#EF4444' : COLORS.textMuted}
                        />
                        <Text style={[styles.supportBtnText, p.hasUserSupported && { color: '#EF4444' }]}>
                          {p.supportCount} Neighbors Supported
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 4: RESOLUTIONS BOARD ─────────────────────────────── */}
            {activeTab === 'RESOLUTIONS' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeading}>Official Society Resolutions</Text>
                  <Text style={styles.sectionSub}>Binding resolutions ratified by the General Body</Text>
                </View>

                {resolutions.map((r) => (
                  <View key={r.id} style={styles.resolutionCard}>
                    <View style={styles.resHeader}>
                      <View style={styles.resNumBadge}>
                        <Text style={styles.resNumText}>{r.resolutionNumber}</Text>
                      </View>
                      <Text style={styles.resDate}>📅 {r.passedDate}</Text>
                    </View>

                    <Text style={styles.resTitle}>{r.title}</Text>
                    <Text style={styles.resMeetingRef}>🏛️ {r.meetingReference}</Text>

                    <View style={styles.resSummaryBox}>
                      <Text style={styles.resSummaryTitle}>Voting Result Breakdown:</Text>
                      <Text style={styles.resSummaryDetail}>
                        ✅ {r.votingSummary.forVotes} FOR ({r.votingSummary.totalPercentageFor}%) · ❌ {r.votingSummary.againstVotes} AGAINST · ⚪ {r.votingSummary.abstained} ABSTAINED
                      </Text>
                    </View>

                    <View style={styles.provisionsBox}>
                      <Text style={styles.provisionsHeading}>Key Enacted Provisions:</Text>
                      {r.keyProvisions.map((item, idx) => (
                        <View key={idx} style={styles.provisionItem}>
                          <Ionicons name="checkmark-circle" size={14} color="#059669" />
                          <Text style={styles.provisionText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 5: DIGITAL VAULT ─────────────────────────────────── */}
            {activeTab === 'VAULT' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeading}>Society Document Vault</Text>
                  <Text style={styles.sectionSub}>Official bylaws, audited financials & downloadable NOCs</Text>
                </View>

                {vaultDocs.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.vaultCard}
                    onPress={() => Alert.alert('Document Vault', `Opening "${doc.title}"...`)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.vaultIconWrap}>
                      <Ionicons name="document-text" size={24} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vaultTitle} numberOfLines={2}>{doc.title}</Text>
                      <View style={styles.vaultMetaRow}>
                        <Text style={styles.vaultCategory}>{doc.category}</Text>
                        <Text style={styles.vaultSize}>· {doc.fileSize} · {doc.fileFormat}</Text>
                      </View>
                      <Text style={styles.vaultUpdated}>Updated: {doc.lastUpdated}</Text>
                    </View>
                    <View style={styles.vaultDownloadBtn}>
                      <Ionicons name="cloud-download-outline" size={18} color={COLORS.primary} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Create Proposal Modal ────────────────────────────────────── */}
      <Modal visible={proposalModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Resident Proposal</Text>
              <TouchableOpacity onPress={() => setProposalModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Proposal Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Solar Photovoltaic Grid for Common Areas"
                placeholderTextColor={COLORS.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryPickerRow}>
                {(['INFRASTRUCTURE', 'ENVIRONMENT', 'AMENITIES', 'SECURITY'] as ProposalDto['category'][]).map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChoice, newCategory === cat && styles.categoryChoiceSelected]}
                      onPress={() => setNewCategory(cat)}
                    >
                      <Text style={[styles.categoryChoiceText, newCategory === cat && styles.categoryChoiceTextSelected]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.inputLabel}>Estimated Cost / Budget (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={newCost}
                onChangeText={setNewCost}
              />

              <Text style={styles.inputLabel}>Detailed Proposal & Benefits</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Explain the background, justification, and expected resident benefits..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                value={newDesc}
                onChangeText={setNewDesc}
              />
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setProposalModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateProposal}
                disabled={createProposalMutation.isPending}
              >
                {createProposalMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit to Community</Text>
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

  // ── Stats Carousel ────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statVal: { fontSize: 15, fontFamily: 'DMSans-Bold', fontWeight: '800', color: COLORS.text },
  statLbl: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },

  // ── Tab Bar ───────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: SPACING.md,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold', fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: '#fff',
  },

  tabContent: { gap: SPACING.md },

  // ── Meetings Styles ───────────────────────────────────────────────
  meetingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  meetingHero: {
    backgroundColor: '#1E1B4B',
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold', fontWeight: '900',
    color: '#FFFFFF',
  },
  quorumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  quorumTagText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold', fontWeight: '700',
    color: '#34D399',
  },
  meetingTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  meetingDesc: {
    fontSize: 12,
    color: '#C7D2FE',
    lineHeight: 18,
    marginBottom: 12,
  },
  meetingMetaBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 6,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'DMSans-SemiBold', fontWeight: '600',
    color: '#E0E7FF',
  },
  quorumSection: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  quorumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quorumTitle: { fontSize: 11, fontWeight: '700', color: '#93C5FD' },
  quorumCount: { fontSize: 11, fontWeight: '700', color: '#fff' },
  quorumBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  quorumBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  rsvpActionRow: {
    marginTop: 14,
  },
  rsvpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  rsvpBtnConfirmed: {
    backgroundColor: '#D1FAE5',
  },
  rsvpBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: COLORS.primary,
  },

  // Agenda list
  agendaSection: {
    padding: 16,
  },
  agendaHeading: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  agendaItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  agendaOrderCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaOrderText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: COLORS.primary,
  },
  agendaTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold', fontWeight: '700',
    color: COLORS.text,
  },
  agendaPresenter: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  agendaDetailBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginTop: 8,
  },
  agendaDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  votingOpenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  votingOpenText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: '#92400E',
  },

  // ── Voting Center Styles ──────────────────────────────────────────
  ballotCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  ballotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold', fontWeight: '900',
    color: '#065F46',
  },
  ballotTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  ballotDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  ballotMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    padding: 8,
    borderRadius: RADIUS.md,
    marginBottom: 14,
  },
  ballotMetricText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold', fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  optionTextSelected: {
    color: COLORS.primary,
  },
  voteProgressBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  voteProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  optionPct: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: COLORS.textMuted,
  },
  castVoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  castVoteBtnDisabled: {
    opacity: 0.5,
  },
  castVoteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
  },

  // ── Proposals Styles ──────────────────────────────────────────────
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: COLORS.text,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  addProposalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  addProposalBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
  },
  proposalCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  categoryPillText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: COLORS.primary,
  },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: '#B45309',
  },
  proposalTitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold', fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  proposalDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  costAndAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  costBadge: {},
  costLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  costValue: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  authorBox: { alignItems: 'flex-end' },
  authorText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  authorDate: { fontSize: 10, color: COLORS.textMuted },
  proposalFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  supportBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  supportBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold', fontWeight: '700',
    color: COLORS.textSecondary,
  },

  // ── Resolutions Styles ────────────────────────────────────────────
  resolutionCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  resHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resNumBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  resNumText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold', fontWeight: '900',
    color: '#065F46',
  },
  resDate: { fontSize: 11, color: COLORS.textMuted },
  resTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  resMeetingRef: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginBottom: 10 },
  resSummaryBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  resSummaryTitle: { fontSize: 11, fontWeight: '800', color: COLORS.text },
  resSummaryDetail: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  provisionsBox: { gap: 6 },
  provisionsHeading: { fontSize: 12, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  provisionItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  provisionText: { fontSize: 12, color: COLORS.textSecondary, flex: 1, lineHeight: 16 },

  // ── Vault Styles ──────────────────────────────────────────────────
  vaultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  vaultIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  vaultMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  vaultCategory: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  vaultSize: { fontSize: 11, color: COLORS.textMuted },
  vaultUpdated: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  vaultDownloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Modal Styles ──────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryChoice: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  categoryChoiceSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  categoryChoiceText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  categoryChoiceTextSelected: { color: COLORS.primary },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
