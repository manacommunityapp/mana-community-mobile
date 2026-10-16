import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl,
  Linking, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { smartHelpdeskService, HelpdeskTicketDto } from '@/services/smartHelpdeskService';

type TicketCategory = 'PLUMBING' | 'ELECTRICAL' | 'CARPENTRY' | 'SECURITY' | 'LIFT' | 'OTHER';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type FilterStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

const CATEGORY_META: Record<TicketCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  PLUMBING:   { label: 'Plumbing',      icon: 'water-outline',           color: '#0284C7', bg: '#E0F2FE' },
  ELECTRICAL: { label: 'Electrical',    icon: 'flash-outline',           color: '#D97706', bg: '#FEF3C7' },
  CARPENTRY:  { label: 'Carpentry',     icon: 'hammer-outline',          color: '#9333EA', bg: '#F3E8FF' },
  SECURITY:   { label: 'Security',      icon: 'shield-outline',          color: '#DC2626', bg: '#FEE2E2' },
  LIFT:       { label: 'Lift/Elevator', icon: 'swap-vertical-outline',   color: '#4F46E5', bg: '#EEF2FF' },
  OTHER:      { label: 'General',       icon: 'construct-outline',       color: '#475569', bg: '#F1F5F9' },
};

const SUBCATEGORY_MAP: Partial<Record<TicketCategory, string[]>> = {
  PLUMBING:   ['Water Leakage', 'Tap Not Working', 'Drain Blocked', 'Motor Issue', 'Geyser Problem', 'Low Water Pressure', 'Other'],
  ELECTRICAL: ['Power Outage', 'Switch Not Working', 'Wiring Issue', 'Fan / AC Problem', 'Short Circuit', 'Meter Issue', 'Other'],
  CARPENTRY:  ['Door Repair', 'Window Frame Fix', 'Lock Issue', 'Cabinet / Shelf Repair', 'Furniture Damage', 'Hinge Broken', 'Other'],
  SECURITY:   ['CCTV Not Working', 'Intercom Issue', 'Gate Problem', 'Suspicious Activity', 'Lock Replacement', 'Other'],
  LIFT:       ['Lift Stuck', 'Door Not Closing', 'Strange Noise', 'Button Malfunction', 'Lighting Issue', 'Other'],
  OTHER:      ['Housekeeping', 'Pest Control', 'Garbage', 'Painting', 'Water Tank', 'Common Area', 'Other'],
};

const LOCATION_AREAS = [
  'My Flat', 'Lobby / Entrance', 'Parking Area', 'Gym / Fitness',
  'Terrace / Rooftop', 'Corridor / Staircase', 'Swimming Pool', 'Club House',
  'Garden / Landscaping', 'Generator Room',
];

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

const SLA_HOURS: Record<TicketCategory, number> = {
  PLUMBING: 8, ELECTRICAL: 4, CARPENTRY: 48, SECURITY: 2, LIFT: 4, OTHER: 24,
};

export default function SmartHelpdeskScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<HelpdeskTicketDto | null>(null);

  // Create wizard state
  const [isCreateModal, setIsCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [subCategory, setSubCategory] = useState('');
  const [locationArea, setLocationArea] = useState('My Flat');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [autoDetected, setAutoDetected] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  // Rating & Feedback state
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [reopening, setReopening] = useState(false);

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
    mutationFn: (payload: { category: string; subCategory?: string; title: string; description: string; priority: string; locationArea?: string; mediaUrls?: string[] }) =>
      smartHelpdeskService.createTicket(payload),
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk'] });
      setIsCreateModal(false);
      resetCreateForm();
      Alert.alert('✅ Ticket Filed', `Your request #${newTicket.ticketNumber || 'TKT'} has been logged. Our team will respond within ${SLA_HOURS[newTicket.category] || 24}h.`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to file ticket. Please try again.');
    },
  });

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setSubCategory('');
    setLocationArea('My Flat');
    setPriority('MEDIUM');
    setAutoDetected(false);
    setPhotos([]);
    setCreateStep(1);
  };

  // ── Pull-to-Refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  // ── AI Auto-Classification ─────────────────────────────────────────────────
  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    const lower = (title + ' ' + text).toLowerCase();
    if (lower.includes('flood') || lower.includes('gas leak') || lower.includes('fire') || lower.includes('spark') || lower.includes('short circuit')) {
      setCategory('SECURITY'); setPriority('URGENT'); setAutoDetected(true);
    } else if (lower.includes('leak') || lower.includes('pipe') || lower.includes('tap') || lower.includes('flush') || lower.includes('drain') || lower.includes('water')) {
      setCategory('PLUMBING'); setPriority('HIGH'); setAutoDetected(true);
    } else if (lower.includes('power') || lower.includes('electricity') || lower.includes('light') || lower.includes('fuse') || lower.includes('switch') || lower.includes('fan')) {
      setCategory('ELECTRICAL'); setPriority('MEDIUM'); setAutoDetected(true);
    } else if (lower.includes('door') || lower.includes('lock') || lower.includes('wood') || lower.includes('window') || lower.includes('cabinet') || lower.includes('hinge')) {
      setCategory('CARPENTRY'); setPriority('LOW'); setAutoDetected(true);
    } else if (lower.includes('lift') || lower.includes('elevator')) {
      setCategory('LIFT'); setPriority('HIGH'); setAutoDetected(true);
    }
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (!description) handleDescriptionChange('');
  };

  const handleSubmitTicket = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please enter a title and description.');
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      subCategory: subCategory || undefined,
      priority,
      locationArea,
      mediaUrls: photos.length > 0 ? photos : undefined,
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getAgeing = (createdAt?: string, status?: string): string | null => {
    if (!createdAt || status === 'RESOLVED' || status === 'CLOSED') return null;
    const diffMs = Date.now() - new Date(createdAt).getTime();
    const hours = Math.floor(diffMs / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h open`;
    return `${Math.floor(hours / 24)}d open`;
  };

  const getSlaCountdown = (slaDeadline?: string): { text: string; urgent: boolean } | null => {
    if (!slaDeadline) return null;
    const diffMs = new Date(slaDeadline).getTime() - Date.now();
    if (diffMs <= 0) return { text: 'SLA Breached', urgent: true };
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hours >= 24) return { text: `${Math.floor(hours / 24)}d left`, urgent: false };
    if (hours > 0) return { text: `${hours}h ${mins}m left`, urgent: hours < 2 };
    return { text: `${mins}m left`, urgent: true };
  };

  const pickPhoto = useCallback(async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'You can attach up to 3 photos per ticket.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  }, [photos]);

  const getClosureOtp = (ticketId: string): string => {
    let hash = 0;
    for (let i = 0; i < ticketId.length; i++) {
      hash = ((hash << 5) - hash) + ticketId.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash) % 9000 + 1000);
  };

  // ── Filtered Tickets ──────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    if (statusFilter === 'ALL') return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const activeCount = useMemo(() => tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length, [tickets]);
  const resolvedCount = useMemo(() => tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length, [tickets]);
  const resolutionRate = useMemo(() => {
    if (tickets.length === 0) return '100%';
    return `${Math.round((resolvedCount / tickets.length) * 100)}%`;
  }, [tickets.length, resolvedCount]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  // ── Wizard helpers ────────────────────────────────────────────────────────
  const TOTAL_STEPS = 4;

  const canProceedStep = () => {
    if (createStep === 1) return true; // category always has a default
    if (createStep === 2) return true; // sub-category optional
    if (createStep === 3) return title.trim().length > 0 && description.trim().length > 0;
    return true;
  };

  if (isLoading && !refreshing && tickets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading helpdesk tickets...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {/* ── Stats Header ── */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
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
        <TouchableOpacity style={styles.newTicketBtn} onPress={() => { resetCreateForm(); setIsCreateModal(true); }} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.newTicketBtnText}>Raise Complaint</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status Filter Bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as FilterStatus[]).map((st) => {
          const active = statusFilter === st;
          const label = st === 'ALL' ? 'All' : st === 'IN_PROGRESS' ? 'In Progress' : st.charAt(0) + st.slice(1).toLowerCase();
          return (
            <TouchableOpacity key={st} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setStatusFilter(st)} activeOpacity={0.7}>
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Ticket List ── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Maintenance Requests</Text>
        <Text style={styles.sectionCount}>{filteredTickets.length} found</Text>
      </View>

      <View style={{ gap: SPACING.md }}>
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={42} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No tickets found</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'ALL' ? 'You have not submitted any maintenance requests yet.' : `No requests with status "${statusFilter}".`}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => { resetCreateForm(); setIsCreateModal(true); }}>
              <Text style={styles.emptyBtnText}>Raise a Complaint</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTickets.map((ticket) => {
            const catMeta = CATEGORY_META[ticket.category] || CATEGORY_META.OTHER;
            const prioMeta = PRIORITY_META[ticket.priority] || PRIORITY_META.MEDIUM;
            const statMeta = STATUS_META[ticket.status] || STATUS_META.OPEN;
            const ageing = getAgeing(ticket.createdAt, ticket.status);
            const sla = (ticket.status === 'IN_PROGRESS' || ticket.status === 'OPEN') ? getSlaCountdown(ticket.slaDeadline) : null;

            return (
              <TouchableOpacity key={ticket.id} style={styles.ticketCard} onPress={() => setSelectedTicket(ticket)} activeOpacity={0.75}>
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
                {ticket.subCategory ? (
                  <Text style={styles.subCatLabel}>{catMeta.label} › {ticket.subCategory}</Text>
                ) : null}
                <Text style={styles.ticketDesc} numberOfLines={2}>{ticket.description}</Text>

                <View style={styles.ticketMetaRow}>
                  <View style={[styles.priorityTag, { backgroundColor: prioMeta.bg }]}>
                    <Text style={[styles.priorityTagText, { color: prioMeta.color }]}>{ticket.priority}</Text>
                  </View>

                  {sla && (
                    <View style={[styles.slaBadge, sla.urgent && styles.slaBadgeUrgent]}>
                      <Ionicons name="timer-outline" size={11} color={sla.urgent ? '#DC2626' : '#D97706'} />
                      <Text style={[styles.slaBadgeText, sla.urgent && { color: '#DC2626' }]}>{sla.text}</Text>
                    </View>
                  )}

                  {ageing && (
                    <View style={styles.ageingBadge}>
                      <Ionicons name="time-outline" size={11} color="#64748B" />
                      <Text style={styles.ageingBadgeText}>{ageing}</Text>
                    </View>
                  )}

                  {ticket.residentRating ? (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={styles.ratingBadgeText}>{ticket.residentRating}/5</Text>
                    </View>
                  ) : null}

                  {(ticket.escalationLevel ?? 0) > 1 && (
                    <View style={styles.escalationBadge}>
                      <Ionicons name="alert-circle" size={11} color="#DC2626" />
                      <Text style={styles.escalationBadgeText}>L{ticket.escalationLevel} Escalated</Text>
                    </View>
                  )}
                </View>

                <View style={styles.ticketFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
                    <Text style={styles.footerFlatText}>{ticket.locationArea || `Tower ${user?.tower || 'A'} - Flat ${user?.flatNumber || '1204'}`}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(ticket.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ── Create Ticket Modal — 4-Step Wizard ── */}
      <Modal visible={isCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Wizard Header */}
            <View style={styles.wizardHeaderRow}>
              <TouchableOpacity
                onPress={() => {
                  if (createStep === 1) { setIsCreateModal(false); resetCreateForm(); }
                  else setCreateStep(s => s - 1);
                }}
                style={styles.wizardBackBtn}
              >
                <Ionicons name={createStep === 1 ? 'close' : 'arrow-back'} size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.wizardStepLabel}>Step {createStep} of {TOTAL_STEPS}</Text>
                <View style={styles.wizardDots}>
                  {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <View key={i} style={[styles.wizardDot, i < createStep && styles.wizardDotActive]} />
                  ))}
                </View>
              </View>
              <View style={{ width: 36 }} />
            </View>

            {/* Step 1: Category */}
            {createStep === 1 && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <Text style={styles.wizardTitle}>What kind of issue is it?</Text>
                <Text style={styles.wizardSubtitle}>Select the category that best matches your complaint.</Text>
                <View style={styles.categoryGrid}>
                  {(Object.keys(CATEGORY_META) as TicketCategory[]).map((cat) => {
                    const meta = CATEGORY_META[cat];
                    const selected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryTile, selected && styles.categoryTileActive, { borderColor: selected ? meta.color : '#E2E8F0' }]}
                        onPress={() => { setCategory(cat); setSubCategory(''); }}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.categoryTileIcon, { backgroundColor: selected ? meta.color : meta.bg }]}>
                          <Ionicons name={meta.icon} size={22} color={selected ? '#FFFFFF' : meta.color} />
                        </View>
                        <Text style={[styles.categoryTileText, selected && { color: meta.color, fontWeight: '800' }]}>{meta.label}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={14} color={meta.color} style={{ position: 'absolute', top: 6, right: 6 }} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* Step 2: Sub-category + Location */}
            {createStep === 2 && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <Text style={styles.wizardTitle}>Be more specific</Text>
                <Text style={styles.wizardSubtitle}>Choose a sub-category and where the issue is.</Text>

                <Text style={styles.fieldLabel}>Sub-category (optional)</Text>
                <View style={styles.chipGrid}>
                  {(SUBCATEGORY_MAP[category] || []).map((sub) => {
                    const selected = subCategory === sub;
                    const meta = CATEGORY_META[category];
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[styles.subCatChip, selected && { backgroundColor: meta.color, borderColor: meta.color }]}
                        onPress={() => setSubCategory(selected ? '' : sub)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.subCatChipText, selected && { color: '#FFFFFF', fontWeight: '700' }]}>{sub}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Location</Text>
                <View style={styles.chipGrid}>
                  {LOCATION_AREAS.map((loc) => {
                    const selected = locationArea === loc;
                    return (
                      <TouchableOpacity
                        key={loc}
                        style={[styles.locationChip, selected && styles.locationChipActive]}
                        onPress={() => setLocationArea(loc)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={loc === 'My Flat' ? 'home-outline' : 'location-outline'} size={12} color={selected ? '#FFFFFF' : COLORS.textSecondary} />
                        <Text style={[styles.locationChipText, selected && { color: '#FFFFFF', fontWeight: '700' }]}>{loc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* Step 3: Title + Description */}
            {createStep === 3 && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <Text style={styles.wizardTitle}>Describe the issue</Text>
                <Text style={styles.wizardSubtitle}>The more detail you give, the faster we can help.</Text>

                <Text style={styles.fieldLabel}>Issue Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Master bathroom tap leaking"
                  placeholderTextColor={COLORS.textMuted}
                  value={title}
                  onChangeText={handleTitleChange}
                />

                <Text style={styles.fieldLabel}>Detailed Description *</Text>
                <TextInput
                  style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                  placeholder="Describe what happened, since when, urgency..."
                  placeholderTextColor={COLORS.textMuted}
                  value={description}
                  onChangeText={handleDescriptionChange}
                  multiline
                />

                {autoDetected && (
                  <View style={styles.aiTagBox}>
                    <Ionicons name="sparkles" size={18} color={COLORS.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiTagTitle}>AI Auto-Classified</Text>
                      <Text style={styles.aiTagSubtitle}>
                        Category: <Text style={{ fontWeight: '800' }}>{CATEGORY_META[category]?.label}</Text> · Priority: <Text style={{ fontWeight: '800' }}>{priority}</Text>
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={styles.fieldLabel}>Priority</Text>
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
                        <Text style={[styles.prioritySelectChipText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>{prio}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Photo Attachment */}
                <Text style={styles.fieldLabel}>Attach Photos (optional, max 3)</Text>
                <View style={styles.photoRow}>
                  {photos.map((uri, i) => (
                    <View key={i} style={styles.photoThumbWrap}>
                      <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.photoRemoveBtn}
                        onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <Ionicons name="close-circle" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < 3 && (
                    <TouchableOpacity style={styles.photoAddBtn} onPress={pickPhoto} activeOpacity={0.7}>
                      <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.photoAddText}>Add Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}

            {/* Step 4: Confirm */}
            {createStep === 4 && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                <Text style={styles.wizardTitle}>Review & Submit</Text>
                <Text style={styles.wizardSubtitle}>Confirm the details before filing your complaint.</Text>

                <View style={styles.confirmCard}>
                  <View style={styles.confirmRow}>
                    <View style={[styles.confirmCategoryDot, { backgroundColor: CATEGORY_META[category].bg }]}>
                      <Ionicons name={CATEGORY_META[category].icon} size={18} color={CATEGORY_META[category].color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.confirmCatLabel}>{CATEGORY_META[category].label}{subCategory ? ` › ${subCategory}` : ''}</Text>
                      <Text style={styles.confirmTitle}>{title || '(No title)'}</Text>
                    </View>
                  </View>

                  <View style={styles.confirmDivider} />

                  <View style={{ gap: 8 }}>
                    <View style={styles.confirmMetaRow}>
                      <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.confirmMetaText}>{locationArea}</Text>
                    </View>
                    <View style={styles.confirmMetaRow}>
                      <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                      <Text style={styles.confirmMetaText}>SLA: Within {SLA_HOURS[category]}h of assignment</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: PRIORITY_META[priority].bg, alignSelf: 'flex-start' }]}>
                      <Text style={[styles.badgeText, { color: PRIORITY_META[priority].color }]}>{PRIORITY_META[priority].label}</Text>
                    </View>
                  </View>

                  <View style={styles.confirmDivider} />
                  <Text style={styles.confirmDescHead}>Description</Text>
                  <Text style={styles.confirmDescText}>{description || '(No description)'}</Text>

                  {photos.length > 0 && (
                    <>
                      <View style={styles.confirmDivider} />
                      <Text style={styles.confirmDescHead}>Attached Photos</Text>
                      <View style={[styles.photoRow, { marginTop: 6 }]}>
                        {photos.map((uri, i) => (
                          <Image key={i} source={{ uri }} style={[styles.photoThumb, { borderRadius: RADIUS.sm }]} resizeMode="cover" />
                        ))}
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.otpNoticeBox}>
                  <Ionicons name="key-outline" size={16} color="#7C3AED" />
                  <Text style={styles.otpNoticeText}>After the technician completes work, you'll receive a <Text style={{ fontWeight: '800' }}>4-digit Closure OTP</Text> in your ticket. Share it to officially close the request.</Text>
                </View>
              </ScrollView>
            )}

            {/* Wizard Navigation */}
            <View style={styles.wizardNavRow}>
              {createStep < TOTAL_STEPS ? (
                <TouchableOpacity
                  style={[styles.wizardNextBtn, !canProceedStep() && { opacity: 0.5 }]}
                  onPress={() => setCreateStep(s => s + 1)}
                  disabled={!canProceedStep()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.wizardNextBtnText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.wizardSubmitBtn, createMutation.isPending && { opacity: 0.7 }]}
                  onPress={handleSubmitTicket}
                  disabled={createMutation.isPending}
                  activeOpacity={0.8}
                >
                  {createMutation.isPending
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.wizardNextBtnText}>Submit Complaint</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
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
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                <View style={{ gap: SPACING.sm, marginTop: SPACING.xs }}>
                  <Text style={styles.detailTitle}>{selectedTicket.title}</Text>
                  {selectedTicket.subCategory ? (
                    <Text style={styles.detailSubCat}>{CATEGORY_META[selectedTicket.category]?.label} › {selectedTicket.subCategory}</Text>
                  ) : null}

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 }}>
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
                    {selectedTicket.slaHours && (
                      <View style={[styles.priorityTag, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="time" size={10} color="#D97706" style={{ marginRight: 3 }} />
                        <Text style={[styles.priorityTagText, { color: '#D97706' }]}>SLA: Within {selectedTicket.slaHours}h</Text>
                      </View>
                    )}
                    {(() => {
                      const sla = getSlaCountdown(selectedTicket.slaDeadline);
                      if (!sla || selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') return null;
                      return (
                        <View style={[styles.slaBadge, sla.urgent && styles.slaBadgeUrgent]}>
                          <Ionicons name="timer-outline" size={11} color={sla.urgent ? '#DC2626' : '#D97706'} />
                          <Text style={[styles.slaBadgeText, sla.urgent && { color: '#DC2626' }]}>{sla.text}</Text>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Escalation Banner */}
                  {(selectedTicket.escalationLevel ?? 0) > 1 && (
                    <View style={styles.escalationBanner}>
                      <Ionicons name="alert-circle" size={18} color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.escalationBannerTitle}>L{selectedTicket.escalationLevel} Escalated</Text>
                        <Text style={styles.escalationBannerNote}>{selectedTicket.escalationNote || 'This ticket has been escalated due to SLA breach.'}</Text>
                      </View>
                    </View>
                  )}

                  {/* Assigned Technician Banner */}
                  {selectedTicket.assignedTo && (
                    <View style={styles.techBanner}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.techBannerSub}>Assigned Technician</Text>
                        <Text style={styles.techBannerName}>{selectedTicket.assignedTo}</Text>
                        <Text style={styles.techBannerPhone}>{selectedTicket.assignedPhone || '+91 98801 44332'}</Text>
                      </View>
                      <TouchableOpacity style={styles.techCallBtn} onPress={() => Linking.openURL(`tel:${selectedTicket.assignedPhone || '+919880144332'}`)}>
                        <Ionicons name="call" size={14} color="#FFFFFF" />
                        <Text style={styles.techCallBtnText}>Call</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* OTP Closure Card — shown when IN_PROGRESS */}
                  {selectedTicket.status === 'IN_PROGRESS' && (
                    <View style={styles.otpCard}>
                      <View style={styles.otpCardHeader}>
                        <Ionicons name="key" size={16} color="#7C3AED" />
                        <Text style={styles.otpCardTitle}>Closure OTP</Text>
                      </View>
                      <View style={styles.otpDigits}>
                        {getClosureOtp(selectedTicket.id).split('').map((d, i) => (
                          <View key={i} style={styles.otpDigitBox}>
                            <Text style={styles.otpDigitText}>{d}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.otpHint}>Share this code with the technician once work is completed. They'll enter it in the Saarthi app to close the ticket.</Text>
                    </View>
                  )}

                  <View style={styles.detailBox}>
                    <Text style={styles.detailBoxLabel}>Issue Description</Text>
                    <Text style={styles.detailBoxText}>{selectedTicket.description}</Text>
                    {selectedTicket.mediaUrls && selectedTicket.mediaUrls.length > 0 && (
                      <View style={[styles.photoRow, { marginTop: SPACING.sm }]}>
                        {selectedTicket.mediaUrls.map((uri, i) => (
                          <Image key={i} source={{ uri }} style={[styles.photoThumb, { borderRadius: RADIUS.sm }]} resizeMode="cover" />
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.detailMetaGrid}>
                    <View style={styles.detailMetaRow}>
                      <Text style={styles.detailMetaKey}>Category:</Text>
                      <Text style={styles.detailMetaVal}>{CATEGORY_META[selectedTicket.category]?.label || selectedTicket.category}</Text>
                    </View>
                    <View style={styles.detailMetaRow}>
                      <Text style={styles.detailMetaKey}>Location:</Text>
                      <Text style={styles.detailMetaVal}>{selectedTicket.locationArea || selectedTicket.location || `Tower ${user?.tower || 'A'} - Flat ${user?.flatNumber || '1204'}`}</Text>
                    </View>
                    {selectedTicket.subCategory ? (
                      <View style={styles.detailMetaRow}>
                        <Text style={styles.detailMetaKey}>Sub-category:</Text>
                        <Text style={styles.detailMetaVal}>{selectedTicket.subCategory}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Timeline */}
                  {selectedTicket.timeline && selectedTicket.timeline.length > 0 && (
                    <View style={styles.timelineBox}>
                      <Text style={styles.detailBoxLabel}>Activity Trail</Text>
                      {selectedTicket.timeline.map((item, idx) => (
                        <View key={item.id || idx} style={styles.timelineItem}>
                          <View style={styles.timelineDot} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={styles.timelineAction}>{item.action} by {item.author}</Text>
                              <Text style={styles.timelineTime}>{item.timestamp}</Text>
                            </View>
                            <Text style={styles.timelineNote}>{item.note}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Rating section (RESOLVED / CLOSED) */}
                  {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                    <View style={styles.ratingSection}>
                      <Text style={styles.ratingSectionTitle}>Service Feedback</Text>
                      {selectedTicket.residentRating ? (
                        <View style={{ gap: 4 }}>
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Ionicons key={s} name={s <= (selectedTicket.residentRating || 0) ? 'star' : 'star-outline'} size={18} color="#F59E0B" />
                            ))}
                          </View>
                          {selectedTicket.residentComment ? (
                            <Text style={styles.ratingCommentText}>"{selectedTicket.residentComment}"</Text>
                          ) : null}
                        </View>
                      ) : (
                        <View style={{ gap: 8 }}>
                          <Text style={styles.ratingPromptText}>How was the technician's response?</Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <TouchableOpacity key={star} onPress={() => setRatingStars(star)}>
                                <Ionicons name={star <= ratingStars ? 'star' : 'star-outline'} size={26} color={star <= ratingStars ? '#F59E0B' : '#CBD5E1'} />
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TextInput
                            style={styles.ratingInput}
                            placeholder="Optional feedback..."
                            placeholderTextColor={COLORS.textMuted}
                            value={ratingComment}
                            onChangeText={setRatingComment}
                          />
                          <TouchableOpacity
                            style={[styles.submitRatingBtn, submittingRating && { opacity: 0.6 }]}
                            disabled={submittingRating}
                            onPress={async () => {
                              if (!selectedTicket) return;
                              setSubmittingRating(true);
                              try {
                                await smartHelpdeskService.submitFeedback(selectedTicket.id, ratingStars, ratingComment);
                                setSelectedTicket({ ...selectedTicket, residentRating: ratingStars, residentComment: ratingComment });
                                queryClient.invalidateQueries({ queryKey: ['helpdesk'] });
                                Alert.alert('Thank You', 'Your rating has been recorded!');
                              } finally { setSubmittingRating(false); }
                            }}
                          >
                            <Text style={styles.submitRatingBtnText}>Submit Review</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Re-open button for RESOLVED / CLOSED */}
                  {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                    <TouchableOpacity
                      style={[styles.reopenBtn, reopening && { opacity: 0.6 }]}
                      disabled={reopening}
                      onPress={() => {
                        Alert.alert(
                          'Reopen Ticket?',
                          'Has the issue not been fully resolved? We\'ll reassign it to the team.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Reopen', style: 'destructive',
                              onPress: async () => {
                                if (!selectedTicket) return;
                                setReopening(true);
                                try {
                                  const updated = await smartHelpdeskService.reopenTicket(selectedTicket.id, 'Issue not fully resolved.');
                                  setSelectedTicket(updated);
                                  queryClient.invalidateQueries({ queryKey: ['helpdesk'] });
                                  Alert.alert('Reopened', 'Ticket has been reopened. Our team will follow up.');
                                } catch (e: any) {
                                  Alert.alert('Error', e?.message || 'Could not reopen ticket.');
                                } finally { setReopening(false); }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      {reopening ? <ActivityIndicator size="small" color="#DC2626" /> : (
                        <>
                          <Ionicons name="refresh-circle-outline" size={16} color="#DC2626" />
                          <Text style={styles.reopenBtnText}>Issue not resolved? Reopen Ticket</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.detailCloseBtn} onPress={() => setSelectedTicket(null)}>
                    <Text style={styles.detailCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', marginBottom: SPACING.md, ...SHADOWS.md,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: SPACING.md },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  newTicketBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: RADIUS.md, gap: SPACING.xs, ...SHADOWS.sm,
  },
  newTicketBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  filterBar: { gap: 8, paddingVertical: SPACING.xs, marginBottom: SPACING.md },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  filterChipTextActive: { color: '#FFFFFF', fontFamily: 'Outfit-Bold', fontWeight: '700' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  sectionCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', fontFamily: 'DMSans-Medium' },

  ticketCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', ...SHADOWS.sm,
  },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketNumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ticketNum: { fontSize: 12, fontFamily: 'monospace', fontWeight: '700', color: COLORS.textMuted },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  badgeText: { fontSize: 10, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  ticketTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: SPACING.sm, fontFamily: 'Outfit-Bold' },
  subCatLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },
  ticketDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 17, fontFamily: 'DMSans-Regular' },

  ticketMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.sm, flexWrap: 'wrap' },
  priorityTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityTagText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  slaBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, gap: 3,
  },
  slaBadgeUrgent: { backgroundColor: '#FEE2E2' },
  slaBadgeText: { fontSize: 10, color: '#D97706', fontWeight: '700', fontFamily: 'DMSans-Medium' },

  ageingBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, gap: 3,
  },
  ageingBadgeText: { fontSize: 10, color: '#64748B', fontWeight: '700', fontFamily: 'DMSans-Medium' },

  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FDE68A', gap: 3,
  },
  ratingBadgeText: { fontSize: 10, color: '#B45309', fontWeight: '800' },

  ticketFooter: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.md,
    paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  footerFlatText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  dateText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, gap: SPACING.xs,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 4 },
  emptySubtitle: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 20 },
  emptyBtn: { marginTop: SPACING.md, backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.md },
  emptyBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12, fontFamily: 'Outfit-Bold' },

  // ── Wizard Styles ──────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  modalContent: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  modalSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontFamily: 'DMSans-Regular' },

  wizardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  wizardBackBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  wizardStepLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', textAlign: 'center' },
  wizardDots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  wizardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  wizardDotActive: { backgroundColor: COLORS.primary, width: 18 },
  wizardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginBottom: 4 },
  wizardSubtitle: { fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.md, fontFamily: 'DMSans-Regular' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  categoryTile: {
    width: '47%', padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1.5,
    backgroundColor: COLORS.surface, alignItems: 'center', gap: 8, position: 'relative',
  },
  categoryTileActive: { backgroundColor: '#F8F7FF' },
  categoryTileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  categoryTileText: { fontSize: 13, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans-Medium', textAlign: 'center' },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  subCatChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  subCatChipText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  locationChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  locationChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  locationChipText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: SPACING.sm, marginBottom: 4, fontFamily: 'DMSans-Medium' },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md,
    fontSize: 13, color: COLORS.text, backgroundColor: '#F8FAFC', fontFamily: 'DMSans-Regular',
  },

  aiTagBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF',
    borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.25)', padding: SPACING.md,
    borderRadius: RADIUS.md, gap: SPACING.sm, marginVertical: SPACING.xs,
  },
  aiTagTitle: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  aiTagSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontFamily: 'DMSans-Regular' },

  priorityGrid: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  prioritySelectChip: {
    flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
  },
  prioritySelectChipText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  confirmCard: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: '#E2E8F0', gap: SPACING.sm,
  },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  confirmCategoryDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  confirmCatLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  confirmTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 2 },
  confirmDivider: { height: 1, backgroundColor: '#E2E8F0' },
  confirmMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmMetaText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },
  confirmDescHead: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
  confirmDescText: { fontSize: 12, color: COLORS.text, lineHeight: 18, fontFamily: 'DMSans-Regular' },

  otpNoticeBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.md,
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: '#DDD6FE',
  },
  otpNoticeText: { flex: 1, fontSize: 12, color: '#5B21B6', lineHeight: 17, fontFamily: 'DMSans-Regular' },

  wizardNavRow: { marginTop: SPACING.md },
  wizardNextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: RADIUS.md, gap: 6, ...SHADOWS.sm,
  },
  wizardSubmitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#059669', paddingVertical: SPACING.md, borderRadius: RADIUS.md, gap: 6, ...SHADOWS.sm,
  },
  wizardNextBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  // ── Detail Modal ───────────────────────────────────────────────────────────
  detailCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  detailTicketNum: { fontSize: 15, fontFamily: 'monospace', fontWeight: '800', color: COLORS.primary },
  detailDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },
  detailTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  detailSubCat: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 2 },
  detailBox: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: '#E2E8F0', marginTop: 4,
  },
  detailBoxLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', fontFamily: 'Outfit-Bold', textTransform: 'uppercase' },
  detailBoxText: { fontSize: 13, color: COLORS.text, marginTop: 4, lineHeight: 18, fontFamily: 'DMSans-Regular' },
  detailMetaGrid: { gap: 4, marginTop: 4 },
  detailMetaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailMetaKey: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  detailMetaVal: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  detailCloseBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: SPACING.md,
    alignItems: 'center', marginTop: SPACING.md, ...SHADOWS.sm,
  },
  detailCloseBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontFamily: 'Outfit-Bold' },

  // OTP Card
  otpCard: {
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1.5, borderColor: '#C4B5FD', gap: SPACING.sm,
  },
  otpCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  otpCardTitle: { fontSize: 13, fontWeight: '800', color: '#7C3AED', fontFamily: 'Outfit-Bold' },
  otpDigits: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  otpDigitBox: {
    width: 48, height: 52, borderRadius: RADIUS.md, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.sm,
  },
  otpDigitText: { fontSize: 24, fontWeight: '900', color: '#7C3AED', fontFamily: 'Outfit-Bold' },
  otpHint: { fontSize: 11, color: '#6D28D9', lineHeight: 16, textAlign: 'center', fontFamily: 'DMSans-Regular' },

  // Re-open button
  reopenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', marginTop: 4,
  },
  reopenBtnText: { fontSize: 12, color: '#DC2626', fontWeight: '700', fontFamily: 'Outfit-Bold' },

  // Technician banner
  techBanner: {
    backgroundColor: '#F5F3FF', borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: '#DDD6FE', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', marginTop: 4,
  },
  techBannerSub: { fontSize: 9, textTransform: 'uppercase', color: '#7C3AED', fontWeight: '800' },
  techBannerName: { fontSize: 13, fontWeight: '800', color: '#1E1B4B', marginTop: 1 },
  techBannerPhone: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  techCallBtn: {
    backgroundColor: '#7C3AED', flexDirection: 'row', alignItems: 'center',
    gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm,
  },
  techCallBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Timeline
  timelineBox: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 8,
  },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  timelineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 5 },
  timelineAction: { fontSize: 11, fontWeight: '700', color: '#1E293B' },
  timelineTime: { fontSize: 10, color: '#94A3B8' },
  timelineNote: { fontSize: 11, color: '#64748B', marginTop: 1 },

  // Rating
  ratingSection: {
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: '#FDE68A', gap: 8,
  },
  ratingSectionTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  ratingPromptText: { fontSize: 11, color: '#B45309' },
  ratingCommentText: { fontSize: 11, color: '#78350F', fontStyle: 'italic', marginTop: 2 },
  ratingInput: {
    backgroundColor: '#FFFFFF', borderRadius: RADIUS.sm, borderWidth: 1,
    borderColor: '#FCD34D', paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, color: '#1E293B',
  },
  submitRatingBtn: { backgroundColor: '#D97706', borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  submitRatingBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  assignedBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, gap: 4,
  },
  assignedBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: '700', fontFamily: 'DMSans-Medium' },

  // Escalation
  escalationBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, gap: 3,
  },
  escalationBadgeText: { fontSize: 10, color: '#DC2626', fontWeight: '800', fontFamily: 'Outfit-Bold' },
  escalationBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: '#FEF2F2', borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1.5, borderColor: '#FECACA',
  },
  escalationBannerTitle: { fontSize: 13, fontWeight: '800', color: '#DC2626', fontFamily: 'Outfit-Bold' },
  escalationBannerNote: { fontSize: 11, color: '#991B1B', lineHeight: 16, marginTop: 2, fontFamily: 'DMSans-Regular' },

  // Photo attachment
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: RADIUS.md, backgroundColor: '#F1F5F9' },
  photoRemoveBtn: { position: 'absolute', top: -6, right: -6 },
  photoAddBtn: {
    width: 80, height: 80, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.primary, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#EEF2FF',
  },
  photoAddText: { fontSize: 10, color: COLORS.primary, fontWeight: '700', fontFamily: 'DMSans-Medium' },
});
