import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { smartHelpdeskService, HelpdeskTicketDto } from '@/services/smartHelpdeskService';

type TicketCategory = 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'SECURITY' | 'LIFT' | 'OTHER';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type FilterStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

const CATEGORY_META: Record<TicketCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  PLUMBING:   { label: 'Plumbing',   icon: 'water-outline',        color: '#0284C7', bg: '#E0F2FE' },
  ELECTRICAL: { label: 'Electrical', icon: 'flash-outline',        color: '#D97706', bg: '#FEF3C7' },
  CARPENTRY:  { label: 'Carpentry',  icon: 'hammer-outline',       color: '#9333EA', bg: '#F3E8FF' },
  SECURITY:   { label: 'Security',   icon: 'shield-outline',       color: '#DC2626', bg: '#FEE2E2' },
  LIFT:       { label: 'Lift/Elevator', icon: 'swap-vertical-outline', color: '#4F46E5', bg: '#EEF2FF' },
  OTHER:      { label: 'General',    icon: 'construct-outline',    color: '#475569', bg: '#F1F5F9' },
};

const PRIORITY_META: Record<TicketPriority, { label: string; color: string; bg: string }> = {
  URGENT: { label: 'Urgent / Emergency', color: '#DC2626', bg: '#FEE2E2' },
  HIGH:   { label: 'High Priority',      color: '#EA580C', bg: '#FFEDD5' },
  MEDIUM: { label: 'Medium Priority',    color: '#4F46E5', bg: '#EEF2FF' },
  LOW:    { label: 'Low Priority',       color: '#64748B', bg: '#F1F5F9' },
};

const STATUS_META: Record<HelpdeskTicketDto['status'], { label: string; color: string; bg: string }> = {
  OPEN:        { label: 'Open',        color: '#4F46E5', bg: '#EEF2FF' },
  IN_PROGRESS: { label: 'In Progress', color: '#D97706', bg: '#FEF3C7' },
  RESOLVED:    { label: 'Resolved',    color: '#059669', bg: '#D1FAE5' },
  CLOSED:      { label: 'Closed',      color: '#64748B', bg: '#F1F5F9' },
};

export default function SmartHelpdeskScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicketDto | null>(null);

  // Form State
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [autoDetected, setAutoDetected] = useState(false);

  // ── 1. Fetch Live Tickets ────────────────────────────────────────────────
  const {
    data: tickets = [],
    isLoading,
    refetch,
  } = useQuery<HelpdeskTicketDto[]>({
    queryKey: ['helpdesk', 'tickets'],
    queryFn: () => smartHelpdeskService.getTickets(),
    staleTime: 30_000,
  });

  // ── 2. Create Ticket Mutation ─────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: { category: string; title: string; description: string; priority: string }) =>
      smartHelpdeskService.createTicket(payload),
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk'] });
      setIsCreateModal(false);
      setTitle('');
      setDescription('');
      setCategory('OTHER');
      setPriority('MEDIUM');
      setAutoDetected(false);
      Alert.alert('✅ Ticket Created', `Your service request #${newTicket.ticketNumber || 'TKT'} has been logged.`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to file ticket. Please try again.');
    },
  });

  // ── Pull-to-Refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // AI Auto Classification Heuristic as user types
  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    const lower = (title + ' ' + text).toLowerCase();

    if (lower.includes('flood') || lower.includes('gas leak') || lower.includes('fire') || lower.includes('spark') || lower.includes('short circuit')) {
      setCategory('SECURITY');
      setPriority('URGENT');
      setAutoDetected(true);
    } else if (lower.includes('leak') || lower.includes('pipe') || lower.includes('tap') || lower.includes('flush') || lower.includes('drain') || lower.includes('water')) {
      setCategory('PLUMBING');
      setPriority('HIGH');
      setAutoDetected(true);
    } else if (lower.includes('power') || lower.includes('electricity') || lower.includes('light') || lower.includes('fuse') || lower.includes('switch') || lower.includes('fan')) {
      setCategory('ELECTRICAL');
      setPriority('MEDIUM');
      setAutoDetected(true);
    } else if (lower.includes('door') || lower.includes('lock') || lower.includes('wood') || lower.includes('window') || lower.includes('cabinet') || lower.includes('hinge')) {
      setCategory('CARPENTRY');
      setPriority('LOW');
      setAutoDetected(true);
    } else if (lower.includes('lift') || lower.includes('elevator')) {
      setCategory('LIFT');
      setPriority('HIGH');
      setAutoDetected(true);
    }
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (!description) {
      handleDescriptionChange('');
    }
  };

  const handleSubmitTicket = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please enter a ticket title and description.');
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
    });
  };

  // ── Filtered Tickets ──────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    if (statusFilter === 'ALL') return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  // ── Dynamic Live Stats ────────────────────────────────────────────────────
  const activeCount = useMemo(() => tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length, [tickets]);
  const resolvedCount = useMemo(() => tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length, [tickets]);
  const resolutionRate = useMemo(() => {
    if (tickets.length === 0) return '100%';
    const pct = Math.round((resolvedCount / tickets.length) * 100);
    return `${pct}%`;
  }, [tickets.length, resolvedCount]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  if (isLoading && !refreshing && tickets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading smart helpdesk tickets...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Top Header & Stats ── */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active Tickets</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#059669' }]}>{resolvedCount}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: COLORS.primary }]}>{resolutionRate}</Text>
            <Text style={styles.statLabel}>Resolution Rate</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newTicketBtn}
          onPress={() => setIsCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.newTicketBtnText}>File Smart Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status Filters Bar ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as FilterStatus[]).map((st) => {
          const active = statusFilter === st;
          const label = st === 'ALL' ? 'All Tickets' : (st === 'IN_PROGRESS' ? 'In Progress' : st.charAt(0) + st.slice(1).toLowerCase());
          return (
            <TouchableOpacity
              key={st}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setStatusFilter(st)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Ticket List ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Maintenance & Care Requests</Text>
        <Text style={styles.sectionCount}>{filteredTickets.length} found</Text>
      </View>

      <View style={{ gap: SPACING.md }}>
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={42} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'ALL'
                ? 'You have not submitted any maintenance requests yet.'
                : `No requests with status "${statusFilter}".`}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setIsCreateModal(true)}
            >
              <Text style={styles.emptyBtnText}>Create Ticket</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTickets.map((ticket) => {
            const catMeta = CATEGORY_META[ticket.category] || CATEGORY_META.OTHER;
            const prioMeta = PRIORITY_META[ticket.priority] || PRIORITY_META.MEDIUM;
            const statMeta = STATUS_META[ticket.status] || STATUS_META.OPEN;

            return (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketCard}
                onPress={() => setSelectedTicket(ticket)}
                activeOpacity={0.75}
              >
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketNumRow}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: catMeta.bg }]}>
                      <Ionicons name={catMeta.icon} size={16} color={catMeta.color} />
                    </View>
                    <Text style={styles.ticketNum}>{ticket.ticketNumber || `TKT-${ticket.id.slice(0, 6)}`}</Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: statMeta.bg }]}>
                    <Text style={[styles.badgeText, { color: statMeta.color }]}>{statMeta.label}</Text>
                  </View>
                </View>

                <Text style={styles.ticketTitle} numberOfLines={2}>{ticket.title}</Text>
                <Text style={styles.ticketDesc} numberOfLines={2}>{ticket.description}</Text>

                <View style={styles.ticketMetaRow}>
                  <View style={[styles.priorityTag, { backgroundColor: prioMeta.bg }]}>
                    <Text style={[styles.priorityTagText, { color: prioMeta.color }]}>{prioMeta.label}</Text>
                  </View>

                  {ticket.assignedTo ? (
                    <View style={styles.assignedBadge}>
                      <Ionicons name="person-outline" size={12} color={COLORS.primary} />
                      <Text style={styles.assignedBadgeText}>{ticket.assignedTo}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.ticketFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="home-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.footerFlatText}>Tower {user?.tower || 'A'} - Flat {user?.flatNumber || '1204'}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(ticket.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ── Create Ticket Modal ── */}
      <Modal visible={isCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>File Smart Helpdesk Ticket</Text>
                <Text style={styles.modalSubtitle}>AI auto-classifies category & urgency as you type.</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCreateModal(false)}
                disabled={createMutation.isPending}
                style={{ padding: 4 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.fieldLabel}>Issue Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Master bathroom tap leaking continuously"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={handleTitleChange}
              />

              <Text style={styles.fieldLabel}>Detailed Description *</Text>
              <TextInput
                style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                placeholder="Describe what happened, location, urgency..."
                placeholderTextColor={COLORS.textMuted}
                value={description}
                onChangeText={handleDescriptionChange}
                multiline
              />

              {/* AI Auto-Detected Tag */}
              {autoDetected && (
                <View style={styles.aiTagBox}>
                  <Ionicons name="sparkles" size={18} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiTagTitle}>AI Auto-Classified</Text>
                    <Text style={styles.aiTagSubtitle}>
                      Suggested Category: <Text style={{ fontWeight: '800' }}>{CATEGORY_META[category]?.label}</Text> ({priority} priority)
                    </Text>
                  </View>
                </View>
              )}

              {/* Category Selector */}
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.chipGrid}>
                {(['PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'SECURITY', 'LIFT', 'OTHER'] as TicketCategory[]).map((cat) => {
                  const isSelected = category === cat;
                  const meta = CATEGORY_META[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categorySelectChip, isSelected && styles.categorySelectChipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Ionicons name={meta.icon} size={14} color={isSelected ? '#FFFFFF' : meta.color} />
                      <Text style={[styles.categorySelectChipText, isSelected && styles.categorySelectChipTextActive]}>
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Priority Selector */}
              <Text style={styles.fieldLabel}>Priority Level</Text>
              <View style={styles.priorityGrid}>
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[]).map((prio) => {
                  const isSelected = priority === prio;
                  const meta = PRIORITY_META[prio];
                  return (
                    <TouchableOpacity
                      key={prio}
                      style={[styles.prioritySelectChip, isSelected && { backgroundColor: meta.color, borderColor: meta.color }]}
                      onPress={() => setPriority(prio)}
                    >
                      <Text style={[styles.prioritySelectChipText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                        {prio}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreateModal(false)}
                disabled={createMutation.isPending}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmTicketBtn, createMutation.isPending && { opacity: 0.7 }]}
                onPress={handleSubmitTicket}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmTicketText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Ticket Detail Modal ── */}
      <Modal visible={!!selectedTicket} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTicketNum}>
                  {selectedTicket?.ticketNumber || (selectedTicket?.id ? `TKT-${selectedTicket.id.slice(0, 6)}` : '')}
                </Text>
                <Text style={styles.detailDate}>{formatDate(selectedTicket?.createdAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTicket(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <View style={{ gap: SPACING.sm, marginTop: SPACING.xs }}>
                <Text style={styles.detailTitle}>{selectedTicket.title}</Text>

                <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
                  <View style={[styles.badge, { backgroundColor: STATUS_META[selectedTicket.status]?.bg || '#EEF2FF' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_META[selectedTicket.status]?.color || COLORS.primary }]}>
                      {STATUS_META[selectedTicket.status]?.label || selectedTicket.status}
                    </Text>
                  </View>
                  <View style={[styles.priorityTag, { backgroundColor: PRIORITY_META[selectedTicket.priority]?.bg || '#F1F5F9' }]}>
                    <Text style={[styles.priorityTagText, { color: PRIORITY_META[selectedTicket.priority]?.color || COLORS.textSecondary }]}>
                      {PRIORITY_META[selectedTicket.priority]?.label || selectedTicket.priority}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailBoxLabel}>Description</Text>
                  <Text style={styles.detailBoxText}>{selectedTicket.description}</Text>
                </View>

                <View style={styles.detailMetaGrid}>
                  <View style={styles.detailMetaRow}>
                    <Text style={styles.detailMetaKey}>Category:</Text>
                    <Text style={styles.detailMetaVal}>{CATEGORY_META[selectedTicket.category]?.label || selectedTicket.category}</Text>
                  </View>
                  <View style={styles.detailMetaRow}>
                    <Text style={styles.detailMetaKey}>Assigned Tech:</Text>
                    <Text style={styles.detailMetaVal}>{selectedTicket.assignedTo || 'Pending Assignment'}</Text>
                  </View>
                  <View style={styles.detailMetaRow}>
                    <Text style={styles.detailMetaKey}>Unit Location:</Text>
                    <Text style={styles.detailMetaVal}>Tower {user?.tower || 'A'} - Flat {user?.flatNumber || '1204'}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.detailCloseBtn}
                  onPress={() => setSelectedTicket(null)}
                >
                  <Text style={styles.detailCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 40 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: SPACING.xl },
  loadingText: { marginTop: SPACING.md, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: SPACING.md },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  newTicketBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  filterBar: { gap: 8, paddingVertical: SPACING.xs, marginBottom: SPACING.md },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  filterChipTextActive: { color: '#FFFFFF', fontFamily: 'Outfit-Bold', fontWeight: '700' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  sectionCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', fontFamily: 'DMSans-Medium' },

  ticketCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketNumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ticketNum: { fontSize: 12, fontFamily: 'monospace', fontWeight: '700', color: COLORS.textMuted },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  badgeText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  ticketTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm, fontFamily: 'Outfit-Bold' },
  ticketDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 17, fontFamily: 'DMSans-Regular' },

  ticketMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.sm },
  priorityTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityTagText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  assignedBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '700', fontFamily: 'DMSans-Medium' },

  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerFlatText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  dateText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 4 },
  emptySubtitle: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 20 },
  emptyBtn: {
    marginTop: SPACING.md,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  emptyBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12, fontFamily: 'Outfit-Bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: 4, fontFamily: 'DMSans-Medium' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: '#F8FAFC',
    fontFamily: 'DMSans-Regular',
  },

  aiTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  aiTagTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  aiTagSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontFamily: 'DMSans-Regular' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  categorySelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categorySelectChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categorySelectChipText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  categorySelectChipTextActive: { color: '#FFFFFF', fontFamily: 'Outfit-Bold', fontWeight: '700' },

  priorityGrid: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  prioritySelectChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prioritySelectChipText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmTicketBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm },
  confirmTicketText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  detailCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  detailTicketNum: { fontSize: 15, fontFamily: 'monospace', fontWeight: '800', color: COLORS.primary },
  detailDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  detailTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  detailBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  detailBoxLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
  detailBoxText: { fontSize: 13, color: COLORS.text, marginTop: 4, lineHeight: 18, fontFamily: 'DMSans-Regular' },
  detailMetaGrid: { gap: 4, marginTop: 4 },
  detailMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailMetaKey: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  detailMetaVal: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  detailCloseBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  detailCloseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },
});
