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
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { governanceService } from '@/services/governanceService';
import type { MeetingDto, AgendaItemDto } from '@/types/governance';

type MeetingFilterTab = 'ALL' | 'AGM' | 'EGM' | 'ARCHIVE';

export default function MeetingsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [filterTab, setFilterTab] = useState<MeetingFilterTab>('ALL');
  const [expandedAgendaId, setExpandedAgendaId] = useState<number | null>(1);
  const [proxyModalVisible, setProxyModalVisible] = useState(false);
  const [selectedMeetingForProxy, setSelectedMeetingForProxy] = useState<MeetingDto | null>(null);
  const [proxyName, setProxyName] = useState('');
  const [proxyFlat, setProxyFlat] = useState('');
  const [qaModalVisible, setQaModalVisible] = useState(false);
  const [qaQuestion, setQaQuestion] = useState('');

  const { data: meetings = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['governanceMeetings'],
    queryFn: () => governanceService.getMeetings(),
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ meetingId, mode, nominee }: { meetingId: string; mode: 'PHYSICAL' | 'ONLINE' | 'PROXY'; nominee?: string }) =>
      governanceService.confirmAttendance(meetingId, mode, nominee),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceMeetings'] });
      qc.invalidateQueries({ queryKey: ['governanceStats'] });
      setProxyModalVisible(false);
      setProxyName('');
      setProxyFlat('');
      Alert.alert('RSVP Confirmed', 'Your meeting attendance and quorum registration have been securely recorded.');
    },
  });

  const filteredMeetings = meetings.filter((m) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'AGM') return m.type === 'AGM';
    if (filterTab === 'EGM') return m.type === 'EGM';
    if (filterTab === 'ARCHIVE') return m.status === 'CONCLUDED';
    return true;
  });

  const handleOpenProxyModal = (meeting: MeetingDto) => {
    setSelectedMeetingForProxy(meeting);
    setProxyModalVisible(true);
  };

  const handleNominateProxy = () => {
    if (!proxyName.trim() || !proxyFlat.trim()) {
      Alert.alert('Required Information', 'Please provide the proxy nominee name and verified flat number.');
      return;
    }
    if (selectedMeetingForProxy) {
      rsvpMutation.mutate({
        meetingId: selectedMeetingForProxy.id,
        mode: 'PROXY',
        nominee: `${proxyName.trim()} (${proxyFlat.trim()})`,
      });
    }
  };

  const handleShareMeeting = (meeting: MeetingDto) => {
    Share.share({
      title: meeting.title,
      message: `📢 *${meeting.title}*\n📅 ${meeting.date} at ${meeting.time}\n📍 ${meeting.location}\nJoin Online: ${meeting.meetingLink || 'N/A'}\nPlease confirm your attendance to achieve society quorum!`,
    });
  };

  const handleJoinVirtualMeeting = (url?: string) => {
    if (!url) {
      Alert.alert('Virtual Link', 'Virtual broadcast link will be activated 15 minutes before the scheduled time.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Cannot Open Link', 'Unable to open the conference link. Please verify your internet or browser.');
    });
  };

  const handleDownloadMinutes = (url?: string) => {
    Alert.alert(
      'Official Minutes of Meeting',
      'Downloading certified and signed Minutes of Meeting (MoM) with Society Digital Seal...',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Sub-header / Filter Tabs ──────────────────────────────── */}
      <View style={styles.topFilterBar}>
        {(
          [
            { key: 'ALL', label: 'All Meetings' },
            { key: 'AGM', label: 'AGM 2025' },
            { key: 'EGM', label: 'EGMs' },
            { key: 'ARCHIVE', label: 'Past Minutes' },
          ] as const
        ).map((tab) => {
          const isActive = filterTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setFilterTab(tab.key)}
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
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filteredMeetings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Meetings Found</Text>
            <Text style={styles.emptySubtitle}>There are no meetings under the selected filter category.</Text>
          </View>
        ) : (
          filteredMeetings.map((meeting) => (
            <View key={meeting.id} style={styles.meetingCard}>
              {/* Meeting Header Banner */}
              <View style={styles.meetingHeader}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusPill,
                      meeting.status === 'LIVE_NOW' ? styles.statusLive : styles.statusScheduled,
                    ]}
                  >
                    <View
                      style={[
                        styles.pulsingDot,
                        { backgroundColor: meeting.status === 'LIVE_NOW' ? '#DC2626' : '#2563EB' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: meeting.status === 'LIVE_NOW' ? '#DC2626' : '#2563EB' },
                      ]}
                    >
                      {meeting.status === 'LIVE_NOW' ? '🔴 LIVE PROCEEDINGS NOW' : `${meeting.type} · SCHEDULED`}
                    </Text>
                  </View>

                  {meeting.isQuorumAchieved && (
                    <View style={styles.quorumPill}>
                      <Ionicons name="shield-checkmark" size={13} color="#059669" />
                      <Text style={styles.quorumPillText}>Quorum Met ({meeting.quorumPercentage}%)</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.meetingTitle}>{meeting.title}</Text>
                <Text style={styles.meetingDescription}>{meeting.description}</Text>

                {/* Date / Time / Location info */}
                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.metaLabel}>{meeting.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.metaLabel}>{meeting.time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="business-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.metaLabel}>{meeting.location}</Text>
                  </View>
                </View>

                {/* Quorum Progress Engine */}
                <View style={styles.quorumMeterBox}>
                  <View style={styles.quorumMeterHeader}>
                    <Text style={styles.quorumMeterTitle}>Registered Quorum Tracker</Text>
                    <Text style={styles.quorumMeterCount}>
                      <Text style={{ fontWeight: 'bold', color: COLORS.text }}>
                        {meeting.quorumConfirmed}
                      </Text>{' '}
                      / {meeting.quorumRequired} owners ({meeting.quorumPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.quorumBarTrack}>
                    <View
                      style={[
                        styles.quorumBarProgress,
                        {
                          width: `${Math.min(meeting.quorumPercentage, 100)}%`,
                          backgroundColor: meeting.isQuorumAchieved ? '#059669' : '#D97706',
                        },
                      ]}
                    />
                    {/* 50% Quorum Mark */}
                    <View style={styles.quorumTargetLine} />
                  </View>
                  <View style={styles.quorumFooterInfo}>
                    <Text style={styles.quorumMinNote}>Min 50% (250 units) required under Bylaws Section 12(a)</Text>
                    <Text style={styles.quorumStatusResult}>
                      {meeting.isQuorumAchieved ? '✓ Quorum Achieved' : '⏳ Quorum in progress'}
                    </Text>
                  </View>
                </View>

                {/* Live Stream / Conference Link if Live or Available */}
                {meeting.meetingLink && (
                  <TouchableOpacity
                    style={styles.liveStreamBanner}
                    onPress={() => handleJoinVirtualMeeting(meeting.meetingLink)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveStreamIconWrap}>
                      <Ionicons name="videocam" size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.liveStreamTitle}>Virtual Broadcast Link Active</Text>
                      <Text style={styles.liveStreamSubtitle}>Tap to join encrypted audio-video stream</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {/* RSVP Attendance Action Row */}
                <View style={styles.rsvpCardBox}>
                  <Text style={styles.rsvpCardTitle}>Your Registered Attendance Mode</Text>
                  <View style={styles.rsvpButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.rsvpOptionBtn,
                        meeting.hasUserConfirmed && meeting.attendanceMode === 'PHYSICAL' && styles.rsvpOptionActive,
                      ]}
                      onPress={() => rsvpMutation.mutate({ meetingId: meeting.id, mode: 'PHYSICAL' })}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="walk"
                        size={16}
                        color={
                          meeting.hasUserConfirmed && meeting.attendanceMode === 'PHYSICAL'
                            ? '#FFFFFF'
                            : COLORS.text
                        }
                      />
                      <Text
                        style={[
                          styles.rsvpOptionText,
                          meeting.hasUserConfirmed && meeting.attendanceMode === 'PHYSICAL' && styles.rsvpOptionTextActive,
                        ]}
                      >
                        In-Person
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.rsvpOptionBtn,
                        meeting.hasUserConfirmed && meeting.attendanceMode === 'ONLINE' && styles.rsvpOptionActive,
                      ]}
                      onPress={() => rsvpMutation.mutate({ meetingId: meeting.id, mode: 'ONLINE' })}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="videocam-outline"
                        size={16}
                        color={
                          meeting.hasUserConfirmed && meeting.attendanceMode === 'ONLINE'
                            ? '#FFFFFF'
                            : COLORS.text
                        }
                      />
                      <Text
                        style={[
                          styles.rsvpOptionText,
                          meeting.hasUserConfirmed && meeting.attendanceMode === 'ONLINE' && styles.rsvpOptionTextActive,
                        ]}
                      >
                        Virtual (Zoom)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.rsvpOptionBtn,
                        meeting.hasUserConfirmed && meeting.attendanceMode === 'PROXY' && styles.rsvpOptionActive,
                      ]}
                      onPress={() => handleOpenProxyModal(meeting)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="person-add-outline"
                        size={16}
                        color={
                          meeting.hasUserConfirmed && meeting.attendanceMode === 'PROXY'
                            ? '#FFFFFF'
                            : COLORS.text
                        }
                      />
                      <Text
                        style={[
                          styles.rsvpOptionText,
                          meeting.hasUserConfirmed && meeting.attendanceMode === 'PROXY' && styles.rsvpOptionTextActive,
                        ]}
                      >
                        {meeting.proxyNominee ? 'Proxy Appointed' : 'Assign Proxy'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {meeting.hasUserConfirmed && (
                    <View style={styles.rsvpConfirmedBadge}>
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text style={styles.rsvpConfirmedText}>
                        Confirmed: {meeting.attendanceMode}{' '}
                        {meeting.proxyNominee ? `via ${meeting.proxyNominee}` : 'Attendance'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── Live Minutes & Realtime Transcripts ────────────────── */}
              {meeting.liveMinutes && meeting.liveMinutes.length > 0 && (
                <View style={styles.liveMinutesSection}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="document-text" size={16} color="#2563EB" />
                      <Text style={styles.sectionTitle}>Live Minutes & Transcript Log</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDownloadMinutes(meeting.minutesUrl)}>
                      <Text style={styles.downloadLinkText}>📥 Download PDF</Text>
                    </TouchableOpacity>
                  </View>
                  {meeting.liveMinutes.map((lm) => (
                    <View key={lm.id} style={styles.minuteLogItem}>
                      <View style={styles.minuteLogTimestamp}>
                        <Text style={styles.minuteTimeText}>{lm.timestamp}</Text>
                      </View>
                      <View style={styles.minuteContentBox}>
                        <Text style={styles.minuteSpeaker}>{lm.speaker}</Text>
                        <Text style={styles.minuteText}>{lm.content}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* ── 10-Point Interactive Meeting Agenda ────────────────── */}
              <View style={styles.agendaSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Official 10-Point Meeting Agenda</Text>
                  <Text style={styles.agendaCountBadge}>{meeting.agenda.length} Items</Text>
                </View>

                {meeting.agenda.map((ag: AgendaItemDto) => {
                  const isExpanded = expandedAgendaId === ag.id;
                  const isVotingItem = ag.status === 'VOTING_OPEN';
                  return (
                    <View key={ag.id} style={[styles.agendaCard, isVotingItem && styles.agendaCardVoting]}>
                      <TouchableOpacity
                        style={styles.agendaHeaderTouchable}
                        onPress={() => setExpandedAgendaId(isExpanded ? null : ag.id)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.agendaNumberBadge,
                            ag.status === 'DISCUSSED'
                              ? styles.agendaBadgeDone
                              : ag.status === 'IN_PROGRESS'
                              ? styles.agendaBadgeActive
                              : ag.status === 'VOTING_OPEN'
                              ? styles.agendaBadgeVoting
                              : styles.agendaBadgePending,
                          ]}
                        >
                          <Text style={styles.agendaNumberText}>{ag.order}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <View style={styles.agendaTitleRow}>
                            <Text style={styles.agendaTitle}>{ag.title}</Text>
                          </View>
                          <View style={styles.agendaSubRow}>
                            <Text style={styles.agendaSpeaker}>👤 {ag.presenter}</Text>
                            <Text style={styles.agendaDot}>·</Text>
                            <Text style={styles.agendaDuration}>⏱️ {ag.duration}</Text>
                          </View>
                        </View>

                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={COLORS.textMuted}
                        />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.agendaExpandedContent}>
                          <Text style={styles.agendaDescription}>{ag.description}</Text>

                          {ag.notes && (
                            <View style={styles.agendaNotesBox}>
                              <Ionicons name="information-circle-outline" size={15} color="#2563EB" />
                              <Text style={styles.agendaNotesText}>{ag.notes}</Text>
                            </View>
                          )}

                          {ag.attachmentName && (
                            <TouchableOpacity
                              style={styles.attachmentButton}
                              onPress={() => Alert.alert('Attachment', `Opening ${ag.attachmentName}`)}
                            >
                              <Ionicons name="document-attach-outline" size={15} color={COLORS.primary} />
                              <Text style={styles.attachmentButtonText}>{ag.attachmentName}</Text>
                            </TouchableOpacity>
                          )}

                          {isVotingItem && (
                            <TouchableOpacity
                              style={styles.voteShortcutBtn}
                              onPress={() => router.push('/governance/voting' as any)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="checkbox-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.voteShortcutBtnText}>Ballot Active · Cast Vote in Voting Suite →</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Meeting Action Bar */}
              <View style={styles.meetingBottomBar}>
                <TouchableOpacity
                  style={styles.bottomActionBtn}
                  onPress={() => setQaModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="help-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.bottomActionBtnText}>Ask Question</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomActionBtn}
                  onPress={() => handleShareMeeting(meeting)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-social-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.bottomActionBtnText}>Share Notice</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomActionBtn}
                  onPress={() => handleDownloadMinutes(meeting.minutesUrl)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.bottomActionBtnText}>Download MoM</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Proxy Nomination Modal ───────────────────────────────── */}
      <Modal visible={proxyModalVisible} transparent animationType="slide" onRequestClose={() => setProxyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Appoint Authorized Proxy</Text>
                <Text style={styles.modalSubtitle}>Statutory Proxy Form (Bylaw Rule 14)</Text>
              </View>
              <TouchableOpacity onPress={() => setProxyModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.proxyNotice}>
              If you cannot attend in-person or virtually, you may appoint a registered co-owner or resident of Mana Community to represent your flat and exercise your voting rights.
            </Text>

            <Text style={styles.inputLabel}>Proxy Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kulkarni"
              placeholderTextColor="#9CA3AF"
              value={proxyName}
              onChangeText={setProxyName}
            />

            <Text style={styles.inputLabel}>Proxy Flat Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tower B - 802"
              placeholderTextColor="#9CA3AF"
              value={proxyFlat}
              onChangeText={setProxyFlat}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setProxyModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={handleNominateProxy}
                disabled={rsvpMutation.isPending}
              >
                {rsvpMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnSubmitText}>Register Proxy</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── AGM Question / Q&A Modal ─────────────────────────────── */}
      <Modal visible={qaModalVisible} transparent animationType="slide" onRequestClose={() => setQaModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Submit Question to MC</Text>
                <Text style={styles.modalSubtitle}>AGM Floor Q&A Registry</Text>
              </View>
              <TouchableOpacity onPress={() => setQaModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Your Question or Grievance</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="State your question for the Managing Committee or Statutory Auditor clearly..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={qaQuestion}
              onChangeText={setQaQuestion}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setQaModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSubmit]}
                onPress={() => {
                  if (!qaQuestion.trim()) {
                    Alert.alert('Required', 'Please enter your question.');
                    return;
                  }
                  setQaModalVisible(false);
                  setQaQuestion('');
                  Alert.alert('Question Submitted', 'Your question has been added to the AGM Speaker Queue.');
                }}
              >
                <Text style={styles.modalBtnSubmitText}>Submit Question</Text>
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
  meetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  meetingHeader: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusLive: {
    backgroundColor: '#FEE2E2',
  },
  statusScheduled: {
    backgroundColor: '#DBEAFE',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'DMSans-Bold',
  },
  quorumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  quorumPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
  },
  meetingTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 6,
  },
  meetingDescription: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  metaContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 6,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'DMSans-Medium',
  },
  quorumMeterBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: SPACING.md,
  },
  quorumMeterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quorumMeterTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#166534',
  },
  quorumMeterCount: {
    fontSize: 12,
    color: '#166534',
    fontFamily: 'DMSans-Medium',
  },
  quorumBarTrack: {
    height: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  quorumBarProgress: {
    height: '100%',
    borderRadius: 5,
  },
  quorumTargetLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#15803D',
  },
  quorumFooterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quorumMinNote: {
    fontSize: 11,
    color: '#15803D',
  },
  quorumStatusResult: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#15803D',
  },
  liveStreamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 12,
    marginBottom: SPACING.md,
  },
  liveStreamIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveStreamTitle: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  liveStreamSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
  },
  rsvpCardBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rsvpCardTitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  rsvpButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  rsvpOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rsvpOptionText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.text,
  },
  rsvpOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  rsvpConfirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  rsvpConfirmedText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: '#059669',
  },
  liveMinutesSection: {
    padding: SPACING.lg,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  downloadLinkText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.primary,
  },
  minuteLogItem: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  minuteLogTimestamp: {
    width: 60,
    paddingTop: 2,
  },
  minuteTimeText: {
    fontSize: 11,
    fontFamily: 'DMSans-Bold',
    color: '#2563EB',
  },
  minuteContentBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  minuteSpeaker: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  minuteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  agendaSection: {
    padding: SPACING.lg,
  },
  agendaCountBadge: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: 'DMSans-Medium',
  },
  agendaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    overflow: 'hidden',
  },
  agendaCardVoting: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  agendaHeaderTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  agendaNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaBadgeDone: {
    backgroundColor: '#D1FAE5',
  },
  agendaBadgeActive: {
    backgroundColor: '#DBEAFE',
  },
  agendaBadgeVoting: {
    backgroundColor: '#FEE2E2',
  },
  agendaBadgePending: {
    backgroundColor: '#E2E8F0',
  },
  agendaNumberText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  agendaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agendaTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  agendaSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  agendaSpeaker: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  agendaDot: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  agendaDuration: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  agendaExpandedContent: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  agendaDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 8,
  },
  agendaNotesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: RADIUS.sm,
    gap: 6,
    marginTop: 8,
  },
  agendaNotesText: {
    fontSize: 11,
    color: '#1E40AF',
    flex: 1,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  attachmentButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: 'DMSans-Medium',
  },
  voteShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: RADIUS.sm,
    paddingVertical: 9,
    marginTop: 10,
    gap: 6,
  },
  voteShortcutBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
  },
  meetingBottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  bottomActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  bottomActionBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  proxyNotice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
  },
  modalBtnCancelText: {
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  modalBtnSubmit: {
    backgroundColor: COLORS.primary,
  },
  modalBtnSubmitText: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
  },
});
