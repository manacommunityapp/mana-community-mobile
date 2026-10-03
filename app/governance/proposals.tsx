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
import type { ProposalDto } from '@/types/governance';

type ProposalTab = 'ALL' | 'MY_SUBMISSIONS' | 'AGM_APPROVED' | 'GRIEVANCES';
type CategoryFilter = 'ALL' | 'INFRASTRUCTURE' | 'ENVIRONMENT' | 'AMENITIES' | 'SECURITY' | 'FINANCE' | 'RULES';

export default function ProposalsScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProposalTab>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [expandedPropId, setExpandedPropId] = useState<string | null>('prop-101');

  // Modal State for New Proposal / Grievance
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<ProposalDto['category']>('AMENITIES');
  const [newType, setNewType] = useState<'PROPOSAL' | 'GRIEVANCE'>('PROPOSAL');
  const [newCost, setNewCost] = useState('');
  const [newPro1, setNewPro1] = useState('');
  const [newPro2, setNewPro2] = useState('');

  const { data: proposals = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['governanceProposals', selectedCategory],
    queryFn: () => governanceService.getProposals(selectedCategory === 'ALL' ? undefined : selectedCategory),
  });

  const supportMutation = useMutation({
    mutationFn: (id: string) => governanceService.supportProposal(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['governanceProposals'] });
      qc.invalidateQueries({ queryKey: ['governanceStats'] });
      Alert.alert(
        data.hasUserSupported ? 'Endorsement Added' : 'Endorsement Removed',
        data.hasUserSupported
          ? 'You have co-sponsored and supported this proposal.'
          : 'Your endorsement for this proposal has been withdrawn.'
      );
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ProposalDto>) => governanceService.createProposal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['governanceProposals'] });
      qc.invalidateQueries({ queryKey: ['governanceStats'] });
      setCreateModalVisible(false);
      setNewTitle('');
      setNewDescription('');
      setNewCost('');
      setNewPro1('');
      setNewPro2('');
      Alert.alert(
        'Submission Received',
        newType === 'PROPOSAL'
          ? 'Your proposal is now published for resident endorsements. Once it reaches 50 supports, it qualifies for the AGM agenda!'
          : 'Your grievance has been logged and assigned to the Facility & Maintenance Committee.'
      );
    },
  });

  const handleCreateSubmit = () => {
    if (!newTitle.trim() || !newDescription.trim()) {
      Alert.alert('Required Fields', 'Please enter a clear title and detailed description.');
      return;
    }
    const pros = [newPro1, newPro2].filter((p) => p.trim().length > 0);
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim(),
      category: newCategory,
      type: newType,
      estimatedCost: newCost.trim() ? (newCost.startsWith('₹') ? newCost : `₹${newCost}`) : '₹0',
      pros,
    });
  };

  const filteredProposals = proposals.filter((p) => {
    if (activeTab === 'MY_SUBMISSIONS') return p.submittedBy.includes('You');
    if (activeTab === 'AGM_APPROVED') return p.status === 'APPROVED_FOR_AGM' || p.status === 'PASSED';
    if (activeTab === 'GRIEVANCES') return p.type === 'GRIEVANCE';
    return true;
  });

  const getStatusColor = (status: ProposalDto['status']) => {
    switch (status) {
      case 'APPROVED_FOR_AGM':
        return { bg: '#D1FAE5', text: '#059669', label: 'APPROVED FOR AGM' };
      case 'UNDER_REVIEW':
        return { bg: '#FEF3C7', text: '#D97706', label: 'UNDER COMMITTEE REVIEW' };
      case 'PASSED':
        return { bg: '#DBEAFE', text: '#2563EB', label: 'ENACTED RESOLUTION' };
      case 'REJECTED':
        return { bg: '#FEE2E2', text: '#DC2626', label: 'NOT PURSUED' };
      default:
        return { bg: '#F1F5F9', text: '#475569', label: 'OPEN FOR ENDORSEMENT' };
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Tabs Row ──────────────────────────────────────────────── */}
      <View style={styles.topTabBar}>
        {(
          [
            { key: 'ALL', label: 'All Submissions' },
            { key: 'AGM_APPROVED', label: 'AGM Ready' },
            { key: 'GRIEVANCES', label: 'Grievances' },
            { key: 'MY_SUBMISSIONS', label: 'My Submissions' },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.topTabBtn, isActive && styles.topTabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.topTabBtnText, isActive && styles.topTabBtnTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Category Chips ────────────────────────────────────────── */}
      <View style={styles.categoryBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {(
            [
              { key: 'ALL', label: 'All Categories' },
              { key: 'INFRASTRUCTURE', label: '🏗️ Infrastructure' },
              { key: 'ENVIRONMENT', label: '🌱 Environment' },
              { key: 'AMENITIES', label: '🏊 Amenities' },
              { key: 'SECURITY', label: '🛡️ Security' },
              { key: 'FINANCE', label: '💰 Finance' },
              { key: 'RULES', label: '📜 Bylaws' },
            ] as const
          ).map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Content List ──────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Callout Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="sparkles" size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Democracy in Action: Threshold Rule</Text>
            <Text style={styles.infoBannerDesc}>
              Any resident proposal that gathers 50 verified co-sponsor endorsements is automatically placed on the upcoming AGM agenda for society-wide voting.
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : filteredProposals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="bulb-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Proposals Found</Text>
            <Text style={styles.emptySubtitle}>Be the first to submit a proposal or grievance for this category!</Text>
          </View>
        ) : (
          filteredProposals.map((item) => {
            const isExpanded = expandedPropId === item.id;
            const statusConfig = getStatusColor(item.status);
            const progressPct = Math.min((item.supportCount / item.supportThreshold) * 100, 100);

            return (
              <View key={item.id} style={styles.proposalCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderTop}>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                        {statusConfig.label}
                      </Text>
                    </View>

                    <View style={styles.costBadge}>
                      <Text style={styles.costBadgeText}>{item.estimatedCost}</Text>
                    </View>
                  </View>

                  <Text style={styles.itemTitle}>{item.title}</Text>

                  <View style={styles.authorRow}>
                    <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.authorText}>
                      {item.submittedBy} {item.submittedByFlat ? `· ${item.submittedByFlat}` : ''}
                    </Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.dateText}>{item.submittedDate}</Text>
                  </View>
                </View>

                {/* Body Content */}
                <View style={styles.cardBody}>
                  <Text style={styles.itemDescription}>{item.description}</Text>

                  {/* Endorsement / Threshold Bar */}
                  <View style={styles.thresholdContainer}>
                    <View style={styles.thresholdHeader}>
                      <Text style={styles.thresholdTitle}>Resident Endorsement Progress</Text>
                      <Text style={styles.thresholdValue}>
                        <Text style={{ fontWeight: 'bold', color: COLORS.text }}>{item.supportCount}</Text> /{' '}
                        {item.supportThreshold} required
                      </Text>
                    </View>
                    <View style={styles.thresholdTrack}>
                      <View
                        style={[
                          styles.thresholdFill,
                          {
                            width: `${progressPct}%`,
                            backgroundColor: progressPct >= 100 ? '#059669' : COLORS.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Expand / Collapse Section for Pros/Cons */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      {item.pros && item.pros.length > 0 && (
                        <View style={styles.prosConsBox}>
                          <Text style={styles.prosConsHeading}>✅ Key Benefits & Rationale</Text>
                          {item.pros.map((pro, idx) => (
                            <View key={idx} style={styles.proConItem}>
                              <Ionicons name="checkmark-circle" size={14} color="#059669" />
                              <Text style={styles.proConText}>{pro}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {item.cons && item.cons.length > 0 && (
                        <View style={[styles.prosConsBox, { marginTop: 8 }]}>
                          <Text style={styles.prosConsHeading}>⚠️ Costs & Considerations</Text>
                          {item.cons.map((con, idx) => (
                            <View key={idx} style={styles.proConItem}>
                              <Ionicons name="alert-circle" size={14} color="#D97706" />
                              <Text style={styles.proConText}>{con}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {item.committeeNotes && (
                        <View style={styles.committeeNotesBox}>
                          <Ionicons name="chatbubbles-outline" size={16} color="#2563EB" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.committeeNotesHeading}>Managing Committee Feedback</Text>
                            <Text style={styles.committeeNotesText}>{item.committeeNotes}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Footer Action Buttons */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={[styles.endorseBtn, item.hasUserSupported && styles.endorseBtnActive]}
                    onPress={() => supportMutation.mutate(item.id)}
                    activeOpacity={0.7}
                    disabled={supportMutation.isPending}
                  >
                    <Ionicons
                      name={item.hasUserSupported ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={16}
                      color={item.hasUserSupported ? '#FFFFFF' : COLORS.primary}
                    />
                    <Text style={[styles.endorseBtnText, item.hasUserSupported && styles.endorseBtnTextActive]}>
                      {item.hasUserSupported ? `Endorsed (${item.supportCount})` : `Co-Sponsor / Endorse (${item.supportCount})`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailsToggleBtn}
                    onPress={() => setExpandedPropId(isExpanded ? null : item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.detailsToggleText}>{isExpanded ? 'Hide Details' : 'View Analysis'}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Floating Action Button (FAB) ─────────────────────────── */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.fabButtonText}>Submit Proposal</Text>
      </TouchableOpacity>

      {/* ── New Proposal / Grievance Modal ───────────────────────── */}
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Submit Resident Motion</Text>
                <Text style={styles.modalSubtitle}>Propose community upgrades or raise governance items</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Type Switcher */}
              <View style={styles.typeSwitchRow}>
                <TouchableOpacity
                  style={[styles.typeOption, newType === 'PROPOSAL' && styles.typeOptionActive]}
                  onPress={() => setNewType('PROPOSAL')}
                >
                  <Ionicons
                    name="bulb-outline"
                    size={16}
                    color={newType === 'PROPOSAL' ? '#FFFFFF' : COLORS.text}
                  />
                  <Text style={[styles.typeOptionText, newType === 'PROPOSAL' && styles.typeOptionTextActive]}>
                    Community Proposal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeOption, newType === 'GRIEVANCE' && styles.typeOptionActive]}
                  onPress={() => setNewType('GRIEVANCE')}
                >
                  <Ionicons
                    name="warning-outline"
                    size={16}
                    color={newType === 'GRIEVANCE' ? '#FFFFFF' : COLORS.text}
                  />
                  <Text style={[styles.typeOptionText, newType === 'GRIEVANCE' && styles.typeOptionTextActive]}>
                    Estate Grievance
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Motion Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Automated Sprinkler System for Central Park"
                placeholderTextColor="#9CA3AF"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categorySelectGrid}>
                {(
                  [
                    { key: 'AMENITIES', label: 'Amenities' },
                    { key: 'INFRASTRUCTURE', label: 'Infrastructure' },
                    { key: 'ENVIRONMENT', label: 'Environment' },
                    { key: 'SECURITY', label: 'Security' },
                    { key: 'FINANCE', label: 'Finance' },
                    { key: 'RULES', label: 'Bylaws' },
                  ] as const
                ).map((cat) => {
                  const isSel = newCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.catSelectPill, isSel && styles.catSelectPillActive]}
                      onPress={() => setNewCategory(cat.key)}
                    >
                      <Text style={[styles.catSelectPillText, isSel && styles.catSelectPillTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Estimated Budget / CapEx (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ₹2,50,000"
                placeholderTextColor="#9CA3AF"
                value={newCost}
                onChangeText={setNewCost}
              />

              <Text style={styles.inputLabel}>Detailed Problem Statement & Solution *</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Describe why this upgrade is needed and how it will benefit society members..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={newDescription}
                onChangeText={setNewDescription}
              />

              <Text style={styles.inputLabel}>Primary Justification / Benefit #1</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Reduces monthly water consumption by 20%"
                placeholderTextColor="#9CA3AF"
                value={newPro1}
                onChangeText={setNewPro1}
              />

              <Text style={styles.inputLabel}>Secondary Justification / Benefit #2</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Automated timers eliminate manual gardener labor"
                placeholderTextColor="#9CA3AF"
                value={newPro2}
                onChangeText={setNewPro2}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSubmit]}
                  onPress={handleCreateSubmit}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalBtnSubmitText}>Publish Motion</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  topTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  topTabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  topTabBtnText: {
    fontSize: 13,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textMuted,
  },
  topTabBtnTextActive: {
    color: COLORS.primary,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
  },
  categoryBarWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryScroll: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textSecondary,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 90,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoBannerTitle: {
    fontSize: 13,
    fontFamily: 'DMSans-Bold',
    color: '#92400E',
    marginBottom: 2,
  },
  infoBannerDesc: {
    fontSize: 12,
    color: '#92400E',
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
  proposalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.sm,
  },
  cardHeader: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'DMSans-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  costBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  costBadgeText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textSecondary,
  },
  dotSeparator: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cardBody: {
    padding: SPACING.md,
  },
  itemDescription: {
    fontSize: 13,
    fontFamily: 'DMSans-Regular',
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  thresholdContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  thresholdTitle: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
  },
  thresholdValue: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  thresholdTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  thresholdFill: {
    height: '100%',
    borderRadius: 4,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  prosConsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prosConsHeading: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  proConItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  proConText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  committeeNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.sm,
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  committeeNotesHeading: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: '#1E40AF',
    marginBottom: 2,
  },
  committeeNotesText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  endorseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  endorseBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  endorseBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans-Bold',
    color: COLORS.primary,
  },
  endorseBtnTextActive: {
    color: '#FFFFFF',
  },
  detailsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  detailsToggleText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.textSecondary,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
    ...SHADOWS.md,
  },
  fabButtonText: {
    fontSize: 14,
    fontFamily: 'DMSans-Bold',
    color: '#FFFFFF',
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
    maxHeight: '90%',
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
  typeSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F1F5F9',
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 12,
    fontFamily: 'DMSans-Medium',
    color: COLORS.text,
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    fontSize: 13,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  categorySelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  catSelectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  catSelectPillActive: {
    backgroundColor: COLORS.primary,
  },
  catSelectPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'DMSans-Medium',
  },
  catSelectPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
