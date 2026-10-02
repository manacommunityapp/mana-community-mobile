import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  BackHandler,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import {
  safetyService,
  SosIncidentResponse,
  AnprGateEvent,
  AnprSummary,
  SecurityIncident,
  PatrolSession,
  GuardShift,
  EmergencyType,
  Severity,
  SosStatus,
  BarrierAction,
  IncidentPriority,
  IncidentStatus,
} from '@/services/safetyService';

type TabKey = 'sos' | 'anpr' | 'patrol' | 'incidents';

// ── Emergency Category Config ──────────────────────────────────

const EMERGENCY_TYPES: { type: EmergencyType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }[] = [
  { type: 'MEDICAL',           label: 'Medical',    icon: 'medkit',            color: '#DC2626', bg: '#FEE2E2' },
  { type: 'FIRE',              label: 'Fire',       icon: 'flame',             color: '#EA580C', bg: '#FFF7ED' },
  { type: 'SECURITY_INTRUDER', label: 'Intruder',   icon: 'warning',           color: '#7C3AED', bg: '#EDE9FE' },
  { type: 'GAS_LEAK',          label: 'Gas Leak',   icon: 'cloud',             color: '#D97706', bg: '#FEF3C7' },
  { type: 'LIFT_STUCK',        label: 'Lift Stuck',  icon: 'swap-vertical',    color: '#2563EB', bg: '#DBEAFE' },
  { type: 'THEFT',             label: 'Theft',      icon: 'eye-off',           color: '#DC2626', bg: '#FEE2E2' },
  { type: 'GENERAL_PANIC',     label: 'Panic',      icon: 'alert-circle',      color: '#DC2626', bg: '#FEE2E2' },
];

const SOS_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  TRIGGERED:    { label: 'Triggered',    color: '#DC2626', bg: '#FEE2E2' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: '#D97706', bg: '#FEF3C7' },
  DISPATCHED:   { label: 'Dispatched',   color: '#2563EB', bg: '#DBEAFE' },
  ON_SITE:      { label: 'On Site',      color: '#0891B2', bg: '#CFFAFE' },
  RESOLVED:     { label: 'Resolved',     color: '#059669', bg: '#D1FAE5' },
  FALSE_ALARM:  { label: 'False Alarm',  color: '#6B7280', bg: '#F3F4F6' },
};

const BARRIER_CONFIG: Record<BarrierAction, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  OPEN: { label: 'Opened',  color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' },
  HOLD: { label: 'On Hold', color: '#D97706', bg: '#FEF3C7', icon: 'pause-circle' },
  DENY: { label: 'Denied',  color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
};

const PRIORITY_CONFIG: Record<IncidentPriority, { label: string; color: string; bg: string }> = {
  LOW:      { label: 'Low',      color: '#059669', bg: '#D1FAE5' },
  MEDIUM:   { label: 'Medium',   color: '#D97706', bg: '#FEF3C7' },
  HIGH:     { label: 'High',     color: '#EA580C', bg: '#FFF7ED' },
  CRITICAL: { label: 'Critical', color: '#DC2626', bg: '#FEE2E2' },
};

const INCIDENT_STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string; bg: string }> = {
  OPEN:      { label: 'Open',      color: '#DC2626', bg: '#FEE2E2' },
  ESCALATED: { label: 'Escalated', color: '#D97706', bg: '#FEF3C7' },
  RESOLVED:  { label: 'Resolved',  color: '#059669', bg: '#D1FAE5' },
};

export default function SafetyCommandCenter() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('sos');
  const [refreshing, setRefreshing] = useState(false);

  // SOS Modal
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyType | null>(null);
  const [sosNotes, setSosNotes] = useState('');

  // Incident Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incTitle, setIncTitle] = useState('');
  const [incDescription, setIncDescription] = useState('');
  const [incLocation, setIncLocation] = useState('');
  const [incPriority, setIncPriority] = useState<IncidentPriority>('MEDIUM');

  // ANPR plate lookup
  const [plateSearch, setPlateSearch] = useState('');

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showSOSConfirm) { setShowSOSConfirm(false); return true; }
        if (showIncidentModal) { setShowIncidentModal(false); return true; }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, showSOSConfirm, showIncidentModal])
  );

  // ── Data Fetching ─────────────────────────────────────────────

  const { data: activeAlerts = [], isLoading: loadingSOS, refetch: refetchSOS } = useQuery({
    queryKey: ['safety', 'sos', 'active'],
    queryFn: () => safetyService.getActiveAlerts(),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const { data: myAlerts = [], refetch: refetchMyAlerts } = useQuery({
    queryKey: ['safety', 'sos', 'my'],
    queryFn: () => safetyService.getMyAlerts(),
    staleTime: 30_000,
  });

  const { data: anprSummary, isLoading: loadingAnpr, refetch: refetchAnpr } = useQuery<AnprSummary>({
    queryKey: ['safety', 'anpr', 'summary'],
    queryFn: () => safetyService.getAnprSummary(),
    staleTime: 15_000,
  });

  const { data: anprEvents, refetch: refetchAnprEvents } = useQuery({
    queryKey: ['safety', 'anpr', 'events'],
    queryFn: () => safetyService.getAnprEvents(),
    staleTime: 15_000,
  });

  const { data: pendingAnprAlerts = [], refetch: refetchPendingAnpr } = useQuery({
    queryKey: ['safety', 'anpr', 'pending'],
    queryFn: () => safetyService.getAnprPendingAlerts(),
    staleTime: 10_000,
  });

  const { data: incidents = [], isLoading: loadingIncidents, refetch: refetchIncidents } = useQuery({
    queryKey: ['safety', 'incidents'],
    queryFn: () => safetyService.getIncidents(),
    staleTime: 30_000,
  });

  const { data: patrolSession, isLoading: loadingPatrol, refetch: refetchPatrol } = useQuery({
    queryKey: ['safety', 'patrol'],
    queryFn: () => safetyService.getPatrolSession(),
    staleTime: 15_000,
  });

  const { data: guardShifts = [], refetch: refetchShifts } = useQuery({
    queryKey: ['safety', 'shifts'],
    queryFn: () => safetyService.getGuardShifts(),
    staleTime: 60_000,
  });

  // ── Mutations ─────────────────────────────────────────────────

  const sosMutation = useMutation({
    mutationFn: () =>
      safetyService.triggerSOS({
        emergencyType: selectedEmergency!,
        severity: selectedEmergency === 'MEDICAL' || selectedEmergency === 'FIRE' ? 'CRITICAL' : 'HIGH',
        flatNumber: user?.flatNumber,
        buildingBlock: user?.tower,
        notes: sosNotes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety', 'sos'] });
      setShowSOSConfirm(false);
      setSelectedEmergency(null);
      setSosNotes('');
      Alert.alert(
        'SOS Dispatched',
        'Emergency alert has been broadcast to security. Help is on the way.',
        [{ text: 'OK' }]
      );
    },
    onError: (err: any) => {
      Alert.alert('SOS Error', err?.message || 'Could not dispatch emergency. Try calling security directly.');
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: () =>
      safetyService.createIncident({
        title: incTitle.trim(),
        description: incDescription.trim() || undefined,
        location: incLocation.trim(),
        priority: incPriority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safety', 'incidents'] });
      setShowIncidentModal(false);
      resetIncidentForm();
      Alert.alert('Incident Reported', 'Your incident has been logged and assigned to security.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not report incident.');
    },
  });

  const resetIncidentForm = () => {
    setIncTitle(''); setIncDescription(''); setIncLocation(''); setIncPriority('MEDIUM');
  };

  const handleTriggerSOS = (type: EmergencyType) => {
    Vibration.vibrate([0, 200, 100, 200]);
    setSelectedEmergency(type);
    setSosNotes('');
    setShowSOSConfirm(true);
  };

  const handleConfirmSOS = () => {
    if (!selectedEmergency) return;
    sosMutation.mutate();
  };

  const handleSubmitIncident = () => {
    if (!incTitle.trim()) { Alert.alert('Required', 'Enter incident title.'); return; }
    if (!incLocation.trim()) { Alert.alert('Required', 'Enter incident location.'); return; }
    createIncidentMutation.mutate();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchSOS(), refetchMyAlerts(), refetchAnpr(), refetchAnprEvents(),
      refetchPendingAnpr(), refetchIncidents(), refetchPatrol(), refetchShifts(),
    ]);
    setRefreshing(false);
  }, [refetchSOS, refetchMyAlerts, refetchAnpr, refetchAnprEvents, refetchPendingAnpr, refetchIncidents, refetchPatrol, refetchShifts]);

  // ── Stats ─────────────────────────────────────────────────────

  const incidentStats = useMemo(() => ({
    open: incidents.filter((i) => i.status === 'OPEN').length,
    escalated: incidents.filter((i) => i.status === 'ESCALATED').length,
    resolved: incidents.filter((i) => i.status === 'RESOLVED').length,
  }), [incidents]);

  const patrolProgress = useMemo(() => {
    if (!patrolSession?.checkpoints?.length) return { completed: 0, total: 0, pct: 0 };
    const total = patrolSession.checkpoints.length;
    const completed = patrolSession.checkpoints.filter((c) => c.status === 'COMPLETED').length;
    return { completed, total, pct: Math.round((completed / total) * 100) };
  }, [patrolSession]);

  const isLoading = (activeTab === 'sos' && loadingSOS) ||
    (activeTab === 'anpr' && loadingAnpr) ||
    (activeTab === 'incidents' && loadingIncidents) ||
    (activeTab === 'patrol' && loadingPatrol);

  // ── Render: SOS Alert Card ────────────────────────────────────

  const renderSOSAlert = ({ item }: { item: SosIncidentResponse }) => {
    const cfg = SOS_STATUS_CONFIG[item.status] || SOS_STATUS_CONFIG.TRIGGERED;
    const typeCfg = EMERGENCY_TYPES.find((e) => e.type === item.emergencyType);
    return (
      <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
        <View style={s.cardHeader}>
          <View style={[s.cardIconBox, { backgroundColor: typeCfg?.bg || '#FEE2E2' }]}>
            <Ionicons name={typeCfg?.icon || 'alert-circle'} size={22} color={typeCfg?.color || '#DC2626'} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.cardName}>{typeCfg?.label || item.emergencyType} Emergency</Text>
            <Text style={s.cardMeta}>
              {item.residentName || 'Resident'} {item.flatNumber ? `• ${item.flatNumber}` : ''}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {item.notes && <Text style={s.notesText} numberOfLines={2}>{item.notes}</Text>}

        <View style={s.sosMetaRow}>
          <View style={s.metaItem}>
            <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
            <Text style={s.metaText}>
              {new Date(item.triggeredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {item.locationDetails && (
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
              <Text style={s.metaText}>{item.locationDetails}</Text>
            </View>
          )}
          {item.lockdownInitiated && (
            <View style={[s.metaItem, { backgroundColor: '#FEE2E2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }]}>
              <Ionicons name="lock-closed" size={10} color="#DC2626" />
              <Text style={[s.metaText, { color: '#DC2626', fontWeight: '700' }]}>LOCKDOWN</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Render: ANPR Event Card ───────────────────────────────────

  const renderAnprEvent = ({ item }: { item: AnprGateEvent }) => {
    const bcfg = BARRIER_CONFIG[item.barrierAction] || BARRIER_CONFIG.HOLD;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.cardIconBox, { backgroundColor: bcfg.bg }]}>
            <Ionicons name={bcfg.icon} size={20} color={bcfg.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.plateText}>{item.plateNumber}</Text>
            <Text style={s.cardMeta}>
              Gate {item.gateId} • {item.direction}
              {item.matchedResidentName ? ` • ${item.matchedResidentName}` : ''}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: bcfg.bg }]}>
            <Ionicons name={bcfg.icon} size={10} color={bcfg.color} />
            <Text style={[s.statusBadgeText, { color: bcfg.color }]}>{bcfg.label}</Text>
          </View>
        </View>
        <View style={s.anprFooter}>
          <Text style={s.timestampText}>
            {new Date(item.createdAt).toLocaleString('en-IN', {
              hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
            })}
          </Text>
          {item.confidence > 0 && (
            <Text style={s.confidenceText}>{Math.round(item.confidence * 100)}% confidence</Text>
          )}
          {item.processingMs != null && (
            <Text style={s.confidenceText}>{item.processingMs}ms</Text>
          )}
        </View>
      </View>
    );
  };

  // ── Render: Incident Card ─────────────────────────────────────

  const renderIncident = ({ item }: { item: SecurityIncident }) => {
    const pcfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.MEDIUM;
    const scfg = INCIDENT_STATUS_CONFIG[item.status] || INCIDENT_STATUS_CONFIG.OPEN;
    return (
      <View style={[s.card, { borderLeftWidth: 3, borderLeftColor: pcfg.color }]}>
        <View style={s.cardHeader}>
          <View style={[s.cardIconBox, { backgroundColor: pcfg.bg }]}>
            <Ionicons name="warning" size={20} color={pcfg.color} />
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={s.cardName} numberOfLines={1}>{item.title}</Text>
            <Text style={s.cardMeta}>{item.location} • {item.reportedBy}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <View style={[s.statusBadge, { backgroundColor: scfg.bg }]}>
              <Text style={[s.statusBadgeText, { color: scfg.color }]}>{scfg.label}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: pcfg.bg }]}>
              <Text style={[s.statusBadgeText, { color: pcfg.color }]}>{pcfg.label}</Text>
            </View>
          </View>
        </View>
        {item.description && <Text style={s.notesText} numberOfLines={2}>{item.description}</Text>}
        <Text style={s.timestampText}>
          {new Date(item.reportedAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Safety Command Center</Text>
          <Text style={s.headerSub}>Security, ANPR, SOS & Incidents</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowIncidentModal(true)}
          style={s.headerBtn}
        >
          <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Active Alert Banner ── */}
      {activeAlerts.length > 0 && (
        <TouchableOpacity
          style={s.alertBanner}
          onPress={() => setActiveTab('sos')}
          activeOpacity={0.8}
        >
          <View style={s.alertPulse} />
          <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
          <Text style={s.alertBannerText}>
            {activeAlerts.length} Active Emergency Alert{activeAlerts.length > 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      )}

      {/* ── Tabs ── */}
      <View style={s.tabBar}>
        {([
          { key: 'sos' as TabKey,       label: 'SOS',       icon: 'alert-circle' as const },
          { key: 'anpr' as TabKey,      label: 'ANPR',      icon: 'car' as const },
          { key: 'patrol' as TabKey,    label: 'Patrol',    icon: 'footsteps' as const },
          { key: 'incidents' as TabKey, label: 'Incidents', icon: 'warning' as const },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={15}
              color={activeTab === tab.key ? '#FFFFFF' : COLORS.textMuted}
            />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Loading ── */}
      {isLoading && !refreshing && (
        <View style={s.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      )}

      {/* ════════════════════ SOS TAB ════════════════════ */}
      {activeTab === 'sos' && !isLoading && (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} tintColor="#DC2626" />}
        >
          {/* Panic Button Grid */}
          <Text style={s.sectionHeader}>Emergency Panic Dispatch</Text>
          <Text style={s.sectionSub}>
            Tap to broadcast an SOS alert with your unit location to security guards.
          </Text>
          <View style={s.sosGrid}>
            {EMERGENCY_TYPES.map((em) => (
              <TouchableOpacity
                key={em.type}
                style={[s.sosBtn, { backgroundColor: em.bg, borderColor: em.color }]}
                onPress={() => handleTriggerSOS(em.type)}
                activeOpacity={0.7}
              >
                <View style={[s.sosBtnIcon, { backgroundColor: em.color }]}>
                  <Ionicons name={em.icon} size={22} color="#FFFFFF" />
                </View>
                <Text style={[s.sosBtnText, { color: em.color }]}>{em.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <>
              <Text style={[s.sectionHeader, { color: '#DC2626', marginTop: SPACING.lg }]}>
                Active Alerts ({activeAlerts.length})
              </Text>
              {activeAlerts.map((alert) => (
                <View key={alert.id} style={{ marginBottom: SPACING.sm }}>
                  {renderSOSAlert({ item: alert })}
                </View>
              ))}
            </>
          )}

          {/* My Alert History */}
          {myAlerts.length > 0 && (
            <>
              <Text style={[s.sectionHeader, { marginTop: SPACING.lg }]}>My Alert History</Text>
              {myAlerts.slice(0, 5).map((alert) => (
                <View key={alert.id} style={{ marginBottom: SPACING.sm }}>
                  {renderSOSAlert({ item: alert })}
                </View>
              ))}
            </>
          )}

          {activeAlerts.length === 0 && myAlerts.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#059669" />
              <Text style={s.emptyTitle}>All Clear</Text>
              <Text style={s.emptySub}>No active emergencies. Tap an emergency type above to dispatch an SOS.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ════════════════════ ANPR TAB ════════════════════ */}
      {activeTab === 'anpr' && !isLoading && (
        <FlatList
          data={anprEvents?.content || []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderAnprEvent}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View style={{ gap: SPACING.sm }}>
              {/* ANPR Stats */}
              <View style={s.anprStatsBar}>
                {[
                  { label: 'Today', value: anprSummary?.totalEventsToday ?? 0, color: COLORS.primary },
                  { label: 'Opened', value: anprSummary?.openCount ?? 0, color: '#059669' },
                  { label: 'Hold', value: anprSummary?.holdCount ?? 0, color: '#D97706' },
                  { label: 'Denied', value: anprSummary?.denyCount ?? 0, color: '#DC2626' },
                ].map((st) => (
                  <View key={st.label} style={s.anprStatItem}>
                    <Text style={[s.anprStatValue, { color: st.color }]}>{st.value}</Text>
                    <Text style={s.anprStatLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>

              {/* Pending Alerts */}
              {pendingAnprAlerts.length > 0 && (
                <View style={s.pendingAlertBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={s.pendingAlertTitle}>
                      {pendingAnprAlerts.length} Pending Alert{pendingAnprAlerts.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  {pendingAnprAlerts.slice(0, 3).map((a) => (
                    <View key={a.id} style={s.pendingAlertItem}>
                      <Text style={s.pendingPlateText}>{a.plateNumber}</Text>
                      <Text style={s.pendingAlertMeta}>
                        Gate {a.gateId} • {a.direction} • {a.barrierAction}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={s.sectionHeader}>Gate Event Log</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="car-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No ANPR Events</Text>
              <Text style={s.emptySub}>Gate entry/exit events will appear here once the ANPR system is active.</Text>
            </View>
          }
        />
      )}

      {/* ════════════════════ PATROL TAB ════════════════════ */}
      {activeTab === 'patrol' && !isLoading && (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {/* Guard Shifts On Duty */}
          <Text style={s.sectionHeader}>Guards On Duty</Text>
          {guardShifts.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              {guardShifts.map((shift) => (
                <View key={shift.id} style={s.shiftCard}>
                  <View style={s.cardHeader}>
                    <View style={[s.cardIconBox, { backgroundColor: '#CFFAFE' }]}>
                      <Ionicons name="shield" size={20} color="#0891B2" />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={s.cardName}>{shift.guardName}</Text>
                      <Text style={s.cardMeta}>
                        {shift.gate || 'Main Gate'} • {shift.startTime} - {shift.endTime}
                      </Text>
                    </View>
                    <View style={[s.statusBadge, {
                      backgroundColor: shift.checkInTime ? '#D1FAE5' : '#FEF3C7',
                    }]}>
                      <Ionicons
                        name={shift.checkInTime ? 'checkmark-circle' : 'time'}
                        size={10}
                        color={shift.checkInTime ? '#059669' : '#D97706'}
                      />
                      <Text style={[s.statusBadgeText, {
                        color: shift.checkInTime ? '#059669' : '#D97706',
                      }]}>
                        {shift.checkInTime ? 'On Duty' : 'Expected'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.noDataBox}>
              <Ionicons name="shield-outline" size={24} color={COLORS.textMuted} />
              <Text style={s.noDataText}>No shift data available for today.</Text>
            </View>
          )}

          {/* Patrol Progress */}
          <Text style={[s.sectionHeader, { marginTop: SPACING.lg }]}>Patrol Checkpoint Tracker</Text>
          {patrolSession ? (
            <View style={s.patrolCard}>
              <View style={s.patrolHeader}>
                <View>
                  <Text style={s.patrolGuardName}>{patrolSession.guardName}</Text>
                  <Text style={s.cardMeta}>
                    Started {new Date(patrolSession.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={s.patrolProgressBadge}>
                  <Text style={s.patrolProgressText}>{patrolProgress.pct}%</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={s.progressBarBg}>
                <View style={[s.progressBarFill, { width: `${patrolProgress.pct}%` as any }]} />
              </View>
              <Text style={s.progressLabel}>
                {patrolProgress.completed} of {patrolProgress.total} checkpoints completed
              </Text>

              {/* Checkpoint Timeline */}
              <View style={s.checkpointTimeline}>
                {patrolSession.checkpoints.map((cp, idx) => {
                  const isCompleted = cp.status === 'COMPLETED';
                  const isSkipped = cp.status === 'SKIPPED';
                  return (
                    <View key={cp.id} style={s.checkpointRow}>
                      <View style={s.timelineDot}>
                        <View style={[
                          s.dotInner,
                          isCompleted && { backgroundColor: '#059669' },
                          isSkipped && { backgroundColor: '#DC2626' },
                        ]} />
                        {idx < patrolSession.checkpoints.length - 1 && (
                          <View style={[
                            s.timelineLine,
                            isCompleted && { backgroundColor: '#059669' },
                          ]} />
                        )}
                      </View>
                      <View style={s.checkpointInfo}>
                        <Text style={[s.checkpointName, isCompleted && { color: '#059669' }]}>
                          {cp.name}
                        </Text>
                        <Text style={s.checkpointLocation}>{cp.location}</Text>
                        {cp.scannedAt && (
                          <Text style={s.checkpointTime}>
                            Scanned {new Date(cp.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        )}
                      </View>
                      <View style={[s.checkpointStatus, {
                        backgroundColor: isCompleted ? '#D1FAE5' : isSkipped ? '#FEE2E2' : '#F1F5F9',
                      }]}>
                        <Ionicons
                          name={isCompleted ? 'checkmark' : isSkipped ? 'close' : 'time-outline'}
                          size={12}
                          color={isCompleted ? '#059669' : isSkipped ? '#DC2626' : COLORS.textMuted}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={s.noDataBox}>
              <Ionicons name="footsteps-outline" size={24} color={COLORS.textMuted} />
              <Text style={s.noDataText}>No active patrol session. Guards will scan QR checkpoints during rounds.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ════════════════════ INCIDENTS TAB ════════════════════ */}
      {activeTab === 'incidents' && !isLoading && (
        <FlatList
          data={incidents}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderIncident}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View style={{ gap: SPACING.sm }}>
              <View style={s.incidentStatsBar}>
                {[
                  { label: 'Open', value: incidentStats.open, color: '#DC2626' },
                  { label: 'Escalated', value: incidentStats.escalated, color: '#D97706' },
                  { label: 'Resolved', value: incidentStats.resolved, color: '#059669' },
                ].map((st) => (
                  <View key={st.label} style={s.incidentStatItem}>
                    <Text style={[s.incidentStatValue, { color: st.color }]}>{st.value}</Text>
                    <Text style={s.incidentStatLabel}>{st.label}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={s.reportBtn}
                  onPress={() => setShowIncidentModal(true)}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={s.reportBtnText}>Report</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#059669" />
              <Text style={s.emptyTitle}>No Incidents</Text>
              <Text style={s.emptySub}>All clear. Tap "Report" to log a new security incident.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowIncidentModal(true)}>
                <Text style={s.emptyBtnText}>Report Incident</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── SOS Confirmation Modal ── */}
      <Modal visible={showSOSConfirm} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { borderColor: '#DC2626', borderWidth: 2 }]}>
            <View style={s.sosModalHeader}>
              <View style={s.sosModalIconBox}>
                <Ionicons
                  name={EMERGENCY_TYPES.find((e) => e.type === selectedEmergency)?.icon || 'alert-circle'}
                  size={32}
                  color="#DC2626"
                />
              </View>
              <Text style={s.sosModalTitle}>
                Confirm {EMERGENCY_TYPES.find((e) => e.type === selectedEmergency)?.label || 'Emergency'} SOS
              </Text>
              <Text style={s.sosModalSub}>
                This will broadcast an emergency alert to all security personnel with your location.
              </Text>
            </View>

            <View style={s.sosLocationBox}>
              <Ionicons name="location" size={16} color={COLORS.primary} />
              <Text style={s.sosLocationText}>
                Tower {user?.tower || 'A'} • Unit {user?.flatNumber || '---'}
              </Text>
            </View>

            <Text style={s.fieldLabel}>Additional Details (optional)</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="Describe the emergency..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={2}
              value={sosNotes}
              onChangeText={setSosNotes}
            />

            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowSOSConfirm(false); setSelectedEmergency(null); }}
                disabled={sosMutation.isPending}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sosConfirmBtn, sosMutation.isPending && { opacity: 0.6 }]}
                disabled={sosMutation.isPending}
                onPress={handleConfirmSOS}
              >
                {sosMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
                    <Text style={s.sosConfirmBtnText}>DISPATCH SOS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Create Incident Modal ── */}
      <Modal visible={showIncidentModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Report Incident</Text>
              <TouchableOpacity
                onPress={() => { setShowIncidentModal(false); resetIncidentForm(); }}
                disabled={createIncidentMutation.isPending}
              >
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Title *</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="e.g. Suspicious person near parking"
              placeholderTextColor={COLORS.textMuted}
              value={incTitle}
              onChangeText={setIncTitle}
            />

            <Text style={s.fieldLabel}>Location *</Text>
            <TextInput
              style={s.fieldInput}
              placeholder="e.g. Parking Lot B, near entry gate"
              placeholderTextColor={COLORS.textMuted}
              value={incLocation}
              onChangeText={setIncLocation}
            />

            <Text style={s.fieldLabel}>Priority</Text>
            <View style={s.priorityRow}>
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as IncidentPriority[]).map((p) => {
                const pcfg = PRIORITY_CONFIG[p];
                const active = incPriority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[s.priorityChip, active && { backgroundColor: pcfg.bg, borderColor: pcfg.color }]}
                    onPress={() => setIncPriority(p)}
                  >
                    <Text style={[s.priorityChipText, active && { color: pcfg.color, fontWeight: '800' }]}>
                      {pcfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.fieldLabel}>Description</Text>
            <TextInput
              style={[s.fieldInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Details about what happened..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              value={incDescription}
              onChangeText={setIncDescription}
            />

            <View style={s.modalActionRow}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowIncidentModal(false); resetIncidentForm(); }}
                disabled={createIncidentMutation.isPending}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, createIncidentMutation.isPending && { opacity: 0.6 }]}
                disabled={createIncidentMutation.isPending}
                onPress={handleSubmitIncident}
              >
                {createIncidentMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.confirmBtnText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header — dark theme for security
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: '#0F172A',
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1, fontFamily: 'DMSans-Regular' },

  // Alert banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
  },
  alertPulse: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FCA5A5',
  },
  alertBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  tabItemActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800', fontFamily: 'Outfit-Bold' },

  // Content
  scrollContent: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 40 },
  listContent: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 40 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  // Section
  sectionHeader: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: SPACING.sm },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginBottom: SPACING.sm },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIconBox: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  cardMeta: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  notesText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', marginTop: SPACING.sm, lineHeight: 16 },
  timestampText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: SPACING.xs },

  // SOS
  sosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sosBtn: {
    width: '31%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    gap: 6,
  },
  sosBtnIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  sosBtnText: { fontSize: 11, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  sosMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  // ANPR
  plateText: { fontSize: 16, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold', letterSpacing: 1 },
  anprFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confidenceText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  anprStatsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    gap: 4,
    ...SHADOWS.sm,
  },
  anprStatItem: { flex: 1, alignItems: 'center' },
  anprStatValue: { fontSize: 20, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  anprStatLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  pendingAlertBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 6,
  },
  pendingAlertTitle: { fontSize: 13, fontWeight: '800', color: '#DC2626', fontFamily: 'Outfit-Bold' },
  pendingAlertItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pendingPlateText: { fontSize: 14, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold', letterSpacing: 1 },
  pendingAlertMeta: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  // Patrol
  shiftCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  patrolCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    ...SHADOWS.sm,
  },
  patrolHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  patrolGuardName: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  patrolProgressBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  patrolProgressText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  progressLabel: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 4 },

  checkpointTimeline: { marginTop: SPACING.md, gap: 0 },
  checkpointRow: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 },
  timelineDot: { width: 20, alignItems: 'center' },
  dotInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CBD5E1', marginTop: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 2 },
  checkpointInfo: { flex: 1, marginLeft: SPACING.sm, paddingBottom: SPACING.sm },
  checkpointName: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  checkpointLocation: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  checkpointTime: { fontSize: 9, color: '#059669', fontFamily: 'DMSans-Medium', marginTop: 1 },
  checkpointStatus: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },

  noDataBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noDataText: { flex: 1, fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  // Incidents
  incidentStatsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    gap: 4,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  incidentStatItem: { flex: 1, alignItems: 'center' },
  incidentStatValue: { fontSize: 20, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  incidentStatLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  reportBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  // Empty states
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 8 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 30 },
  emptyBtn: {
    marginTop: SPACING.md,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  emptyBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },

  // SOS Modal
  sosModalHeader: { alignItems: 'center', gap: 6, marginBottom: SPACING.md },
  sosModalIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  sosModalTitle: { fontSize: 18, fontWeight: '800', color: '#DC2626', fontFamily: 'Outfit-Bold', textAlign: 'center' },
  sosModalSub: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', textAlign: 'center' },

  sosLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sosLocationText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: 'Outfit-Bold' },

  fieldLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.text,
    fontFamily: 'Outfit-Bold', marginTop: SPACING.sm, marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'DMSans-Regular',
  },

  priorityRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  priorityChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  priorityChipText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  modalActionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  sosConfirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#DC2626',
    ...SHADOWS.sm,
  },
  sosConfirmBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
