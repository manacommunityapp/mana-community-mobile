import React, { useState, useCallback, useMemo } from 'react';
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
  FlatList,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { cposService } from '@/services/cposService';
import type {
  PropertyUnitDto,
  MoveInOutNocDto,
  FlatDocumentDto,
  AIPropertyInsightDto,
  FloorPlanUnit,
  TowerSummary,
  TenantKycDocument,
  CrmLead,
  CrmPipelineSummary,
  CrmLeadStage,
  CrmDealType,
  CrmLeadSource,
  KycStatus,
} from '@/types/cpos';

type TabKey = 'units' | 'directory' | 'tenants' | 'kyc' | 'noc' | 'vault' | 'crm' | 'ai';

const UNIT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OCCUPIED: { label: 'Occupied', color: '#059669', bg: '#D1FAE5' },
  VACANT: { label: 'Vacant', color: '#DC2626', bg: '#FEE2E2' },
  RENTED: { label: 'Rented', color: '#2563EB', bg: '#DBEAFE' },
  UNDER_RENOVATION: { label: 'Renovation', color: '#D97706', bg: '#FEF3C7' },
};

const KYC_STATUS_CONFIG: Record<KycStatus, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  VERIFIED: { label: 'Verified', color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle' },
  PENDING: { label: 'Pending', color: '#D97706', bg: '#FEF3C7', icon: 'time' },
  REJECTED: { label: 'Rejected', color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle' },
  EXPIRED: { label: 'Expired', color: '#6B7280', bg: '#F3F4F6', icon: 'alert-circle' },
};

const KYC_DOC_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  AADHAAR: { icon: 'card', label: 'Aadhaar' },
  PAN: { icon: 'document-text', label: 'PAN Card' },
  PASSPORT: { icon: 'globe', label: 'Passport' },
  VOTER_ID: { icon: 'people', label: 'Voter ID' },
  POLICE_VERIFICATION: { icon: 'shield-checkmark', label: 'Police Verification' },
  RENTAL_AGREEMENT: { icon: 'document-lock', label: 'Rental Agreement' },
};

const CRM_STAGE_CONFIG: Record<CrmLeadStage, { label: string; color: string; bg: string; order: number }> = {
  INQUIRY: { label: 'Inquiry', color: '#6366F1', bg: '#EEF2FF', order: 1 },
  SITE_VISIT: { label: 'Site Visit', color: '#0891B2', bg: '#CFFAFE', order: 2 },
  NEGOTIATION: { label: 'Negotiation', color: '#D97706', bg: '#FEF3C7', order: 3 },
  AGREEMENT: { label: 'Agreement', color: '#2563EB', bg: '#DBEAFE', order: 4 },
  CLOSED_WON: { label: 'Closed Won', color: '#059669', bg: '#D1FAE5', order: 5 },
  CLOSED_LOST: { label: 'Lost', color: '#DC2626', bg: '#FEE2E2', order: 6 },
};

export default function CPOSScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('units');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTower, setSelectedTower] = useState<string | null>(null);

  // NOC Modal
  const [nocModalVisible, setNocModalVisible] = useState(false);
  const [nocType, setNocType] = useState<'MOVE_IN' | 'MOVE_OUT'>('MOVE_IN');
  const [nocUnit, setNocUnit] = useState('');
  const [nocDate, setNocDate] = useState('');

  // CRM Lead Modal
  const [crmModalVisible, setCrmModalVisible] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadUnit, setLeadUnit] = useState('');
  const [leadDealType, setLeadDealType] = useState<CrmDealType>('RENTAL');
  const [leadSource, setLeadSource] = useState<CrmLeadSource>('PORTAL');
  const [leadAmount, setLeadAmount] = useState('');
  const [leadNotes, setLeadNotes] = useState('');

  const goHome = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/tabs/feed');
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (nocModalVisible) { setNocModalVisible(false); return true; }
        if (crmModalVisible) { setCrmModalVisible(false); return true; }
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome, nocModalVisible, crmModalVisible])
  );

  // ── Data Fetching ─────────────────────────────────────────────

  const { data: properties = [], isLoading: propsLoading, refetch: refetchProps } = useQuery({
    queryKey: ['cposProperties'],
    queryFn: cposService.getMyProperties,
    staleTime: 60_000,
  });

  const { data: directory = [], isLoading: dirLoading, refetch: refetchDir } = useQuery({
    queryKey: ['cposDirectory', selectedTower],
    queryFn: () => cposService.getUnitDirectory(selectedTower || undefined),
    staleTime: 60_000,
  });

  const { data: towers = [], refetch: refetchTowers } = useQuery({
    queryKey: ['cposTowers'],
    queryFn: cposService.getTowerSummaries,
    staleTime: 120_000,
  });

  const { data: nocList = [], isLoading: nocLoading, refetch: refetchNoc } = useQuery({
    queryKey: ['cposNocs'],
    queryFn: cposService.getNocRequests,
    staleTime: 60_000,
  });

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ['cposDocuments'],
    queryFn: cposService.getDocuments,
    staleTime: 60_000,
  });

  const { data: aiInsights = [], isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['cposAIInsights'],
    queryFn: cposService.getAIInsights,
    staleTime: 60_000,
  });

  const { data: kycDocs = [], isLoading: kycLoading, refetch: refetchKyc } = useQuery({
    queryKey: ['cposKyc'],
    queryFn: cposService.getTenantKycDocuments,
    staleTime: 60_000,
  });

  const { data: kycSummary, refetch: refetchKycSummary } = useQuery({
    queryKey: ['cposKycSummary'],
    queryFn: cposService.getTenantKycSummary,
    staleTime: 60_000,
  });

  const { data: crmLeads = [], isLoading: crmLoading, refetch: refetchCrm } = useQuery({
    queryKey: ['cposCrm'],
    queryFn: cposService.getCrmLeads,
    staleTime: 30_000,
  });

  const { data: crmSummary, refetch: refetchCrmSummary } = useQuery({
    queryKey: ['cposCrmSummary'],
    queryFn: cposService.getCrmPipelineSummary,
    staleTime: 30_000,
  });

  // ── Mutations ─────────────────────────────────────────────────

  const nocMutation = useMutation({
    mutationFn: (payload: Partial<MoveInOutNocDto>) => cposService.requestNoc(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cposNocs'] });
      setNocModalVisible(false);
      setNocDate('');
      setNocUnit('');
      Alert.alert('NOC Requested', 'Your Move-in/Move-out NOC application with Goods Lift booking has been sent.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not submit NOC request.'),
  });

  const crmMutation = useMutation({
    mutationFn: () =>
      cposService.createCrmLead({
        name: leadName.trim(),
        phone: leadPhone.trim(),
        unitNumber: leadUnit.trim(),
        dealType: leadDealType,
        source: leadSource,
        askingPrice: leadDealType === 'SALE' ? Number(leadAmount) || undefined : undefined,
        monthlyRent: leadDealType === 'RENTAL' ? Number(leadAmount) || undefined : undefined,
        notes: leadNotes.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cposCrm'] });
      qc.invalidateQueries({ queryKey: ['cposCrmSummary'] });
      setCrmModalVisible(false);
      resetCrmForm();
      Alert.alert('Lead Created', 'New lead added to your CRM pipeline.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Could not create lead.'),
  });

  const resetCrmForm = () => {
    setLeadName(''); setLeadPhone(''); setLeadUnit('');
    setLeadDealType('RENTAL'); setLeadSource('PORTAL');
    setLeadAmount(''); setLeadNotes('');
  };

  const handleNocSubmit = () => {
    if (!nocUnit.trim()) { Alert.alert('Required', 'Enter apartment unit.'); return; }
    if (!nocDate.trim()) { Alert.alert('Required', 'Enter scheduled date.'); return; }
    nocMutation.mutate({ unitNumber: nocUnit, type: nocType, scheduledDate: nocDate });
  };

  const handleCrmSubmit = () => {
    if (!leadName.trim()) { Alert.alert('Required', 'Enter lead name.'); return; }
    if (!leadPhone.trim()) { Alert.alert('Required', 'Enter phone number.'); return; }
    if (!leadUnit.trim()) { Alert.alert('Required', 'Enter unit number.'); return; }
    crmMutation.mutate();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchProps(), refetchDir(), refetchTowers(), refetchNoc(),
      refetchDocs(), refetchAI(), refetchKyc(), refetchKycSummary(),
      refetchCrm(), refetchCrmSummary(),
    ]);
    setRefreshing(false);
  }, [refetchProps, refetchDir, refetchTowers, refetchNoc, refetchDocs, refetchAI, refetchKyc, refetchKycSummary, refetchCrm, refetchCrmSummary]);

  // ── Derived Data ──────────────────────────────────────────────

  const portfolioStats = useMemo(() => {
    const totalValue = properties.reduce((sum, p) => {
      const num = parseFloat(p.estimatedMarketValue.replace(/[^\d.]/g, ''));
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
    const avgYield = properties.length
      ? (properties.reduce((sum, p) => sum + parseFloat(p.rentalYield), 0) / properties.length).toFixed(1)
      : '0';
    return { count: properties.length, totalValue, avgYield };
  }, [properties]);

  const floorGroups = useMemo(() => {
    const groups: Record<number, FloorPlanUnit[]> = {};
    directory.forEach((u) => {
      if (!groups[u.floor]) groups[u.floor] = [];
      groups[u.floor].push(u);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([floor, units]) => ({ floor: Number(floor), units }));
  }, [directory]);

  const kycByTenant = useMemo(() => {
    const map: Record<string, TenantKycDocument[]> = {};
    kycDocs.forEach((d) => {
      const key = `${d.tenantName}|${d.unitNumber}`;
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return Object.entries(map).map(([key, docs]) => {
      const [name, unit] = key.split('|');
      return { name, unit, docs };
    });
  }, [kycDocs]);

  const isLoading =
    (activeTab === 'units' && propsLoading) ||
    (activeTab === 'directory' && dirLoading) ||
    (activeTab === 'noc' && nocLoading) ||
    (activeTab === 'vault' && docsLoading) ||
    (activeTab === 'ai' && aiLoading) ||
    (activeTab === 'kyc' && kycLoading) ||
    (activeTab === 'crm' && crmLoading);

  const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'units', label: 'My Units', icon: 'home-outline' },
    { key: 'directory', label: 'Floor Plan', icon: 'grid-outline' },
    { key: 'tenants', label: 'Tenants', icon: 'people-outline' },
    { key: 'kyc', label: 'KYC Vault', icon: 'shield-checkmark-outline' },
    { key: 'noc', label: 'NOC', icon: 'document-text-outline' },
    { key: 'vault', label: 'Documents', icon: 'folder-outline' },
    { key: 'crm', label: 'CRM', icon: 'trending-up-outline' },
    { key: 'ai', label: 'AI Advisor', icon: 'sparkles-outline' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={goHome} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Property & Real Estate OS</Text>
          <Text style={s.headerSub}>Portfolio, Tenancy, CRM & AI</Text>
        </View>
        <TouchableOpacity style={s.headerBtn} onPress={() => setCrmModalVisible(true)}>
          <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Portfolio Hero ── */}
      <View style={s.heroCard}>
        <View style={s.heroStatsRow}>
          <View style={s.heroStatItem}>
            <Text style={s.heroStatVal}>{portfolioStats.count}</Text>
            <Text style={s.heroStatLbl}>Owned</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStatItem}>
            <Text style={s.heroStatVal}>₹{portfolioStats.totalValue.toFixed(1)} Cr</Text>
            <Text style={s.heroStatLbl}>Est. Value</Text>
          </View>
          <View style={s.heroStatDivider} />
          <View style={s.heroStatItem}>
            <Text style={s.heroStatVal}>{portfolioStats.avgYield}%</Text>
            <Text style={s.heroStatLbl}>Avg Yield</Text>
          </View>
          {kycSummary && (
            <>
              <View style={s.heroStatDivider} />
              <View style={s.heroStatItem}>
                <Text style={[s.heroStatVal, { color: kycSummary.pendingKyc > 0 ? '#FBBF24' : '#34D399' }]}>
                  {kycSummary.fullyVerified}/{kycSummary.totalTenants}
                </Text>
                <Text style={s.heroStatLbl}>KYC OK</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? '#FFFFFF' : COLORS.textMuted} />
            <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Loading ── */}
      {isLoading && !refreshing && (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Loading...</Text>
        </View>
      )}

      {/* ════════════════ MY UNITS TAB ════════════════ */}
      {activeTab === 'units' && !isLoading && (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          renderItem={({ item: p }) => (
            <View style={s.card}>
              <View style={s.cardRow}>
                <View>
                  <Text style={s.unitNum}>{p.unitNumber}</Text>
                  <Text style={s.meta}>{p.tower} • Floor {p.floor}</Text>
                </View>
                <View style={[s.badge, {
                  backgroundColor: p.ownershipType === 'OWNER_OCCUPIED' ? '#D1FAE5' : p.ownershipType === 'RENTED_OUT' ? '#DBEAFE' : '#FEE2E2',
                }]}>
                  <Text style={[s.badgeText, {
                    color: p.ownershipType === 'OWNER_OCCUPIED' ? '#065F46' : p.ownershipType === 'RENTED_OUT' ? '#1E40AF' : '#DC2626',
                  }]}>{p.ownershipType.replace(/_/g, ' ')}</Text>
                </View>
              </View>

              <View style={s.metricsGrid}>
                {[
                  { label: 'CONFIG', value: p.configuration },
                  { label: 'AREA', value: `${p.carpetAreaSqFt} sq.ft` },
                  { label: 'VALUE', value: p.estimatedMarketValue },
                  { label: 'YIELD', value: p.rentalYield },
                ].map((m) => (
                  <View key={m.label} style={s.metricItem}>
                    <Text style={s.metricLabel}>{m.label}</Text>
                    <Text style={s.metricValue}>{m.value}</Text>
                  </View>
                ))}
              </View>

              <View style={s.parkingRow}>
                <Ionicons name="car-outline" size={14} color={COLORS.primary} />
                <Text style={s.parkingText}>
                  Parking: <Text style={{ fontWeight: '800' }}>{p.parkingSlotsAssigned.join(', ')}</Text>
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="home-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Properties</Text>
              <Text style={s.emptySub}>Your owned units will appear here.</Text>
            </View>
          }
        />
      )}

      {/* ════════════════ UNIT DIRECTORY & FLOOR PLAN TAB ════════════════ */}
      {activeTab === 'directory' && !isLoading && (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {/* Tower Cards */}
          <Text style={s.sectionHeader}>Tower Overview</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: SPACING.md }}>
            {towers.map((tw) => {
              const active = selectedTower === tw.tower;
              const occupancy = Math.round((tw.occupiedCount / tw.totalUnits) * 100);
              return (
                <TouchableOpacity
                  key={tw.tower}
                  style={[s.towerCard, active && { borderColor: COLORS.primary, borderWidth: 2 }]}
                  onPress={() => setSelectedTower(active ? null : tw.tower)}
                  activeOpacity={0.7}
                >
                  <View style={s.towerIconBox}>
                    <Ionicons name="business" size={22} color={active ? COLORS.primary : COLORS.textMuted} />
                  </View>
                  <Text style={s.towerName}>{tw.tower}</Text>
                  <Text style={s.towerMeta}>{tw.totalFloors} floors • {tw.totalUnits} units</Text>
                  <View style={s.towerProgressBg}>
                    <View style={[s.towerProgressFill, { width: `${occupancy}%` as any }]} />
                  </View>
                  <View style={s.towerStatsRow}>
                    <Text style={[s.towerStatText, { color: '#059669' }]}>{tw.occupiedCount} occ</Text>
                    <Text style={[s.towerStatText, { color: '#DC2626' }]}>{tw.vacantCount} vac</Text>
                    <Text style={[s.towerStatText, { color: '#2563EB' }]}>{tw.rentedCount} rent</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Floor Plan Grid */}
          <Text style={s.sectionHeader}>
            {selectedTower ? `${selectedTower} Floor Plan` : 'All Units'}
          </Text>
          {floorGroups.map(({ floor, units }) => (
            <View key={floor} style={s.floorRow}>
              <View style={s.floorLabel}>
                <Text style={s.floorLabelText}>F{floor}</Text>
              </View>
              <View style={s.floorUnits}>
                {units.map((u) => {
                  const cfg = UNIT_STATUS_CONFIG[u.status] || UNIT_STATUS_CONFIG.OCCUPIED;
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={[s.floorUnit, { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                      onPress={() => Alert.alert(
                        u.unitNumber,
                        `${u.configuration} • ${u.carpetAreaSqFt || '—'} sq.ft\n${cfg.label}${u.ownerName ? `\nOwner: ${u.ownerName}` : ''}`
                      )}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.floorUnitText, { color: cfg.color }]}>{u.unitNumber.split('-')[1]}</Text>
                      <View style={[s.floorUnitDot, { backgroundColor: cfg.color }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Legend */}
          <View style={s.legendRow}>
            {Object.entries(UNIT_STATUS_CONFIG).map(([key, cfg]) => (
              <View key={key} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: cfg.color }]} />
                <Text style={s.legendText}>{cfg.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ════════════════ TENANTS TAB ════════════════ */}
      {activeTab === 'tenants' && !isLoading && (
        <FlatList
          data={properties.filter((p) => p.currentTenant)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          renderItem={({ item: p }) => {
            const t = p.currentTenant!;
            return (
              <View style={s.card}>
                <View style={s.cardRow}>
                  <View>
                    <Text style={s.tenantUnit}>Flat {p.unitNumber} ({p.tower})</Text>
                    <Text style={s.tenantName}>{t.name}</Text>
                  </View>
                  {t.policeVerificationDone && (
                    <View style={[s.badge, { backgroundColor: '#D1FAE5' }]}>
                      <Ionicons name="shield-checkmark" size={10} color="#059669" />
                      <Text style={[s.badgeText, { color: '#065F46' }]}>Verified</Text>
                    </View>
                  )}
                </View>

                <View style={s.tenantFinBox}>
                  <View>
                    <Text style={s.finLabel}>MONTHLY RENT</Text>
                    <Text style={s.finValue}>₹{t.monthlyRent.toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.finLabel}>DEPOSIT</Text>
                    <Text style={s.finValue}>₹{t.depositAmount.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={s.leaseRow}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                  <Text style={s.meta}>Lease: {t.leaseStartDate} to {t.leaseEndDate}</Text>
                </View>

                <View style={s.tenantActions}>
                  <TouchableOpacity
                    style={s.tenantActionBtn}
                    onPress={() => Alert.alert('Contact', `Calling ${t.phone}...`)}
                  >
                    <Ionicons name="call-outline" size={14} color={COLORS.primary} />
                    <Text style={[s.tenantActionText, { color: COLORS.primary }]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.tenantActionBtn}
                    onPress={() => Alert.alert('Receipt', 'Generating rent receipt PDF...')}
                  >
                    <Ionicons name="receipt-outline" size={14} color="#059669" />
                    <Text style={[s.tenantActionText, { color: '#059669' }]}>Receipt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.tenantActionBtn}
                    onPress={() => setActiveTab('kyc')}
                  >
                    <Ionicons name="shield-checkmark-outline" size={14} color="#7C3AED" />
                    <Text style={[s.tenantActionText, { color: '#7C3AED' }]}>KYC</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Tenants</Text>
              <Text style={s.emptySub}>Your rented-out units with active tenants will appear here.</Text>
            </View>
          }
        />
      )}

      {/* ════════════════ KYC VAULT TAB ════════════════ */}
      {activeTab === 'kyc' && !isLoading && (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {/* KYC Summary */}
          {kycSummary && (
            <View style={s.kycStatsBar}>
              {[
                { label: 'Total', value: kycSummary.totalTenants, color: COLORS.primary },
                { label: 'Verified', value: kycSummary.fullyVerified, color: '#059669' },
                { label: 'Pending', value: kycSummary.pendingKyc, color: '#D97706' },
                { label: 'Expired', value: kycSummary.expiredDocs, color: '#DC2626' },
              ].map((st) => (
                <View key={st.label} style={s.kycStatItem}>
                  <Text style={[s.kycStatValue, { color: st.color }]}>{st.value}</Text>
                  <Text style={s.kycStatLabel}>{st.label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.sectionHeader}>Tenant KYC Documents</Text>

          {kycByTenant.map(({ name, unit, docs }) => {
            const allVerified = docs.every((d) => d.status === 'VERIFIED');
            return (
              <View key={`${name}-${unit}`} style={s.kycTenantCard}>
                <View style={s.cardRow}>
                  <View>
                    <Text style={s.cardTitle}>{name}</Text>
                    <Text style={s.meta}>Unit {unit}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: allVerified ? '#D1FAE5' : '#FEF3C7' }]}>
                    <Ionicons name={allVerified ? 'checkmark-circle' : 'time'} size={10} color={allVerified ? '#059669' : '#D97706'} />
                    <Text style={[s.badgeText, { color: allVerified ? '#059669' : '#D97706' }]}>
                      {allVerified ? 'Fully Verified' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={s.kycDocList}>
                  {docs.map((doc) => {
                    const dCfg = KYC_STATUS_CONFIG[doc.status];
                    const dIcon = KYC_DOC_ICONS[doc.docType] || { icon: 'document', label: doc.docType };
                    return (
                      <View key={doc.id} style={s.kycDocRow}>
                        <View style={[s.kycDocIconBox, { backgroundColor: dCfg.bg }]}>
                          <Ionicons name={dIcon.icon} size={16} color={dCfg.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.kycDocName}>{dIcon.label}</Text>
                          {doc.documentNumber && <Text style={s.kycDocNum}>{doc.documentNumber}</Text>}
                          {doc.expiryDate && (
                            <Text style={s.kycDocExpiry}>Expires: {doc.expiryDate}</Text>
                          )}
                        </View>
                        <View style={[s.kycStatusPill, { backgroundColor: dCfg.bg }]}>
                          <Ionicons name={dCfg.icon} size={10} color={dCfg.color} />
                          <Text style={[s.kycStatusText, { color: dCfg.color }]}>{dCfg.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {kycByTenant.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No KYC Records</Text>
              <Text style={s.emptySub}>Tenant KYC documents will appear here once uploaded.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ════════════════ NOC TAB ════════════════ */}
      {activeTab === 'noc' && !isLoading && (
        <FlatList
          data={nocList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View style={[s.cardRow, { marginBottom: SPACING.sm }]}>
              <View>
                <Text style={s.sectionHeader}>Move-In/Out NOC</Text>
                <Text style={s.sectionSub}>Security clearance & freight lift booking</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => setNocModalVisible(true)}>
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={s.addBtnText}>Request</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: noc }) => (
            <View style={s.card}>
              <View style={s.cardRow}>
                <View style={[s.badge, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={[s.badgeText, { color: COLORS.primary }]}>{noc.type.replace(/_/g, ' ')}</Text>
                </View>
                <View style={[s.badge, {
                  backgroundColor: noc.status === 'APPROVED' || noc.status === 'COMPLETED' ? '#D1FAE5' : '#FEF3C7',
                }]}>
                  <Text style={[s.badgeText, {
                    color: noc.status === 'APPROVED' || noc.status === 'COMPLETED' ? '#065F46' : '#92400E',
                  }]}>{noc.status}</Text>
                </View>
              </View>
              <Text style={s.cardTitle}>Unit {noc.unitNumber} • {noc.residentName}</Text>
              <Text style={s.meta}>Scheduled: {noc.scheduledDate} ({noc.timeSlot})</Text>
              <View style={[s.cardRow, { marginTop: SPACING.sm, gap: 16 }]}>
                <View style={s.checkItem}>
                  <Ionicons name={noc.securityDepositCleared ? 'checkmark-circle' : 'time'} size={14} color={noc.securityDepositCleared ? '#059669' : '#D97706'} />
                  <Text style={s.checkText}>Deposit</Text>
                </View>
                <View style={s.checkItem}>
                  <Ionicons name={noc.liftBookingConfirmed ? 'checkmark-circle' : 'time'} size={14} color={noc.liftBookingConfirmed ? '#059669' : '#D97706'} />
                  <Text style={s.checkText}>Lift Booked</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No NOC Requests</Text>
              <Text style={s.emptySub}>Tap "Request" to apply for a move-in/out NOC.</Text>
            </View>
          }
        />
      )}

      {/* ════════════════ DOCUMENTS TAB ════════════════ */}
      {activeTab === 'vault' && !isLoading && (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View style={{ marginBottom: SPACING.sm }}>
              <Text style={s.sectionHeader}>Flat Legal & Tax Vault</Text>
              <Text style={s.sectionSub}>Encrypted storage for deeds, tax receipts & agreements</Text>
            </View>
          }
          renderItem={({ item: doc }) => (
            <TouchableOpacity
              style={s.docCard}
              onPress={() => Alert.alert('Opening', doc.title)}
              activeOpacity={0.7}
            >
              <View style={s.docIconBox}>
                <Ionicons name="document-lock" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.docTitle} numberOfLines={2}>{doc.title}</Text>
                <Text style={s.meta}>{doc.category} • {doc.fileSize} • {doc.lastUpdated}</Text>
              </View>
              <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="folder-outline" size={48} color={COLORS.textMuted} />
              <Text style={s.emptyTitle}>No Documents</Text>
              <Text style={s.emptySub}>Upload sale deeds, lease agreements and tax receipts.</Text>
            </View>
          }
        />
      )}

      {/* ════════════════ CRM PIPELINE TAB ════════════════ */}
      {activeTab === 'crm' && !isLoading && (
        <ScrollView
          contentContainerStyle={s.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {/* Pipeline Summary */}
          {crmSummary && (
            <View style={s.crmSummaryCard}>
              <View style={s.cardRow}>
                <View>
                  <Text style={s.cardTitle}>Sales/Rental Pipeline</Text>
                  <Text style={s.meta}>{crmSummary.totalLeads} total leads</Text>
                </View>
                <TouchableOpacity style={s.addBtn} onPress={() => setCrmModalVisible(true)}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={s.addBtnText}>Add Lead</Text>
                </TouchableOpacity>
              </View>

              {/* Pipeline Funnel */}
              <View style={s.funnelRow}>
                {(['INQUIRY', 'SITE_VISIT', 'NEGOTIATION', 'AGREEMENT', 'CLOSED_WON'] as CrmLeadStage[]).map((stage) => {
                  const cfg = CRM_STAGE_CONFIG[stage];
                  const count = stage === 'INQUIRY' ? crmSummary.inquiry
                    : stage === 'SITE_VISIT' ? crmSummary.siteVisit
                    : stage === 'NEGOTIATION' ? crmSummary.negotiation
                    : stage === 'AGREEMENT' ? crmSummary.agreement
                    : crmSummary.closedWon;
                  return (
                    <View key={stage} style={s.funnelItem}>
                      <View style={[s.funnelCount, { backgroundColor: cfg.bg }]}>
                        <Text style={[s.funnelCountText, { color: cfg.color }]}>{count}</Text>
                      </View>
                      <Text style={s.funnelLabel}>{cfg.label}</Text>
                    </View>
                  );
                })}
              </View>

              {crmSummary.totalPipelineValue > 0 && (
                <View style={s.pipelineValueBox}>
                  <Text style={s.pipelineValueLabel}>Pipeline Value</Text>
                  <Text style={s.pipelineValueText}>
                    ₹{(crmSummary.totalPipelineValue / 100000).toFixed(1)}L
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Lead Cards */}
          <Text style={[s.sectionHeader, { marginTop: SPACING.md }]}>Active Leads</Text>
          {crmLeads
            .filter((l) => l.stage !== 'CLOSED_WON' && l.stage !== 'CLOSED_LOST')
            .map((lead) => {
              const scfg = CRM_STAGE_CONFIG[lead.stage];
              return (
                <View key={lead.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: scfg.color, marginBottom: SPACING.sm }]}>
                  <View style={s.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{lead.name}</Text>
                      <Text style={s.meta}>
                        {lead.unitNumber} • {lead.dealType} • {lead.source}
                      </Text>
                    </View>
                    <View style={[s.badge, { backgroundColor: scfg.bg }]}>
                      <Text style={[s.badgeText, { color: scfg.color }]}>{scfg.label}</Text>
                    </View>
                  </View>

                  <View style={s.leadDetailsRow}>
                    {lead.dealType === 'SALE' && lead.askingPrice && (
                      <View style={s.leadDetail}>
                        <Text style={s.finLabel}>ASKING</Text>
                        <Text style={s.finValue}>₹{(lead.askingPrice / 100000).toFixed(1)}L</Text>
                      </View>
                    )}
                    {lead.dealType === 'SALE' && lead.offeredPrice && (
                      <View style={s.leadDetail}>
                        <Text style={s.finLabel}>OFFERED</Text>
                        <Text style={s.finValue}>₹{(lead.offeredPrice / 100000).toFixed(1)}L</Text>
                      </View>
                    )}
                    {lead.dealType === 'RENTAL' && lead.monthlyRent && (
                      <View style={s.leadDetail}>
                        <Text style={s.finLabel}>RENT</Text>
                        <Text style={s.finValue}>₹{lead.monthlyRent.toLocaleString()}/mo</Text>
                      </View>
                    )}
                    {lead.nextFollowUp && (
                      <View style={s.leadDetail}>
                        <Text style={s.finLabel}>FOLLOW UP</Text>
                        <Text style={s.finValue}>{lead.nextFollowUp}</Text>
                      </View>
                    )}
                  </View>

                  {lead.notes && <Text style={s.leadNotes} numberOfLines={2}>{lead.notes}</Text>}

                  <View style={[s.cardRow, { marginTop: SPACING.sm, gap: 8 }]}>
                    <TouchableOpacity
                      style={s.tenantActionBtn}
                      onPress={() => Alert.alert('Call', `Calling ${lead.phone}...`)}
                    >
                      <Ionicons name="call-outline" size={13} color={COLORS.primary} />
                      <Text style={[s.tenantActionText, { color: COLORS.primary }]}>Call</Text>
                    </TouchableOpacity>
                    {lead.stage !== 'AGREEMENT' && (
                      <TouchableOpacity
                        style={s.tenantActionBtn}
                        onPress={() => {
                          const stages: CrmLeadStage[] = ['INQUIRY', 'SITE_VISIT', 'NEGOTIATION', 'AGREEMENT', 'CLOSED_WON'];
                          const idx = stages.indexOf(lead.stage);
                          if (idx < stages.length - 1) {
                            const next = stages[idx + 1];
                            Alert.alert('Move Stage', `Advance to "${CRM_STAGE_CONFIG[next].label}"?`, [
                              { text: 'Cancel' },
                              { text: 'Move', onPress: () => cposService.updateCrmLeadStage(lead.id, next).then(() => { refetchCrm(); refetchCrmSummary(); }) },
                            ]);
                          }
                        }}
                      >
                        <Ionicons name="arrow-forward" size={13} color="#059669" />
                        <Text style={[s.tenantActionText, { color: '#059669' }]}>Advance</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

          {/* Closed Deals */}
          {crmLeads.filter((l) => l.stage === 'CLOSED_WON' || l.stage === 'CLOSED_LOST').length > 0 && (
            <>
              <Text style={[s.sectionHeader, { marginTop: SPACING.md }]}>Closed Deals</Text>
              {crmLeads
                .filter((l) => l.stage === 'CLOSED_WON' || l.stage === 'CLOSED_LOST')
                .map((lead) => {
                  const scfg = CRM_STAGE_CONFIG[lead.stage];
                  return (
                    <View key={lead.id} style={[s.card, { opacity: 0.8, marginBottom: SPACING.sm }]}>
                      <View style={s.cardRow}>
                        <Text style={s.cardTitle}>{lead.name}</Text>
                        <View style={[s.badge, { backgroundColor: scfg.bg }]}>
                          <Text style={[s.badgeText, { color: scfg.color }]}>{scfg.label}</Text>
                        </View>
                      </View>
                      <Text style={s.meta}>
                        {lead.unitNumber} • {lead.dealType} • {lead.monthlyRent ? `₹${lead.monthlyRent.toLocaleString()}/mo` : ''}
                      </Text>
                    </View>
                  );
                })}
            </>
          )}
        </ScrollView>
      )}

      {/* ════════════════ AI ADVISOR TAB ════════════════ */}
      {activeTab === 'ai' && !isLoading && (
        <FlatList
          data={aiInsights}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          ListHeaderComponent={
            <View style={[s.cardRow, { marginBottom: SPACING.sm }]}>
              <View style={s.aiHeaderIcon}>
                <Ionicons name="sparkles" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sectionHeader}>AI Property Valuation & Rental Yield</Text>
                <Text style={s.sectionSub}>ML-powered insights for your portfolio</Text>
              </View>
            </View>
          }
          renderItem={({ item: ai }) => {
            const typeColor = ai.type === 'YIELD' ? '#059669' : ai.type === 'VALUE' ? '#2563EB' : ai.type === 'LEASE' ? '#D97706' : '#7C3AED';
            const typeBg = ai.type === 'YIELD' ? '#D1FAE5' : ai.type === 'VALUE' ? '#DBEAFE' : ai.type === 'LEASE' ? '#FEF3C7' : '#EDE9FE';
            return (
              <View style={[s.card, { borderWidth: 1.5, borderColor: '#C7D2FE' }]}>
                <View style={s.cardRow}>
                  <View style={[s.badge, { backgroundColor: typeBg }]}>
                    <Text style={[s.badgeText, { color: typeColor }]}>{ai.type}</Text>
                  </View>
                  <Text style={[s.aiConfidence, { color: '#059669' }]}>
                    {ai.confidenceScore}% confidence
                  </Text>
                </View>
                <Text style={[s.cardTitle, { marginTop: SPACING.xs }]}>{ai.title}</Text>
                <Text style={s.aiInsight}>{ai.insight}</Text>
                <View style={s.aiRecBox}>
                  <Text style={s.aiRecLabel}>AI RECOMMENDATION</Text>
                  <Text style={s.aiRecText}>{ai.recommendation}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="sparkles-outline" size={48} color="#7C3AED" />
              <Text style={s.emptyTitle}>No Insights Yet</Text>
              <Text style={s.emptySub}>AI analysis will generate portfolio insights automatically.</Text>
            </View>
          }
        />
      )}

      {/* ── NOC Request Modal ── */}
      <Modal visible={nocModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Request Moving NOC</Text>
              <TouchableOpacity onPress={() => setNocModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Movement Type</Text>
            <View style={s.choiceRow}>
              {(['MOVE_IN', 'MOVE_OUT'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[s.choiceChip, nocType === t && s.choiceChipActive]}
                  onPress={() => setNocType(t)}
                >
                  <Text style={[s.choiceChipText, nocType === t && s.choiceChipTextActive]}>
                    {t.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Apartment Unit *</Text>
            <TextInput style={s.fieldInput} value={nocUnit} onChangeText={setNocUnit} placeholder="e.g. A-1204" placeholderTextColor={COLORS.textMuted} />

            <Text style={s.fieldLabel}>Scheduled Date *</Text>
            <TextInput style={s.fieldInput} value={nocDate} onChangeText={setNocDate} placeholder="e.g. 15 Nov 2026 (10 AM)" placeholderTextColor={COLORS.textMuted} />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setNocModalVisible(false)} disabled={nocMutation.isPending}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, nocMutation.isPending && { opacity: 0.6 }]} onPress={handleNocSubmit} disabled={nocMutation.isPending}>
                {nocMutation.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.confirmBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── CRM Lead Modal ── */}
      <Modal visible={crmModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Lead</Text>
                <TouchableOpacity onPress={() => { setCrmModalVisible(false); resetCrmForm(); }}>
                  <Ionicons name="close" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={s.fieldLabel}>Name *</Text>
              <TextInput style={s.fieldInput} value={leadName} onChangeText={setLeadName} placeholder="Lead name" placeholderTextColor={COLORS.textMuted} />

              <Text style={s.fieldLabel}>Phone *</Text>
              <TextInput style={s.fieldInput} value={leadPhone} onChangeText={setLeadPhone} placeholder="+91 98765 43210" placeholderTextColor={COLORS.textMuted} keyboardType="phone-pad" />

              <Text style={s.fieldLabel}>Unit *</Text>
              <TextInput style={s.fieldInput} value={leadUnit} onChangeText={setLeadUnit} placeholder="e.g. A-201" placeholderTextColor={COLORS.textMuted} />

              <Text style={s.fieldLabel}>Deal Type</Text>
              <View style={s.choiceRow}>
                {(['RENTAL', 'SALE'] as CrmDealType[]).map((dt) => (
                  <TouchableOpacity key={dt} style={[s.choiceChip, leadDealType === dt && s.choiceChipActive]} onPress={() => setLeadDealType(dt)}>
                    <Text style={[s.choiceChipText, leadDealType === dt && s.choiceChipTextActive]}>{dt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>Source</Text>
              <View style={[s.choiceRow, { flexWrap: 'wrap' }]}>
                {(['PORTAL', 'REFERRAL', 'WALK_IN', 'BROKER', 'SOCIAL_MEDIA'] as CrmLeadSource[]).map((src) => (
                  <TouchableOpacity key={src} style={[s.choiceChip, leadSource === src && s.choiceChipActive, { minWidth: 70 }]} onPress={() => setLeadSource(src)}>
                    <Text style={[s.choiceChipText, leadSource === src && s.choiceChipTextActive]}>{src.replace(/_/g, ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.fieldLabel}>{leadDealType === 'SALE' ? 'Asking Price (₹)' : 'Monthly Rent (₹)'}</Text>
              <TextInput style={s.fieldInput} value={leadAmount} onChangeText={setLeadAmount} placeholder={leadDealType === 'SALE' ? '17500000' : '35000'} placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />

              <Text style={s.fieldLabel}>Notes</Text>
              <TextInput style={[s.fieldInput, { height: 60, textAlignVertical: 'top' }]} value={leadNotes} onChangeText={setLeadNotes} placeholder="Additional details..." placeholderTextColor={COLORS.textMuted} multiline numberOfLines={2} />

              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setCrmModalVisible(false); resetCrmForm(); }} disabled={crmMutation.isPending}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.confirmBtn, crmMutation.isPending && { opacity: 0.6 }]} onPress={handleCrmSubmit} disabled={crmMutation.isPending}>
                  {crmMutation.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={s.confirmBtnText}>Create Lead</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md, paddingBottom: 40, gap: SPACING.sm },
  listContent: { padding: SPACING.md, paddingBottom: 40, gap: SPACING.sm },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { marginTop: SPACING.sm, fontSize: 13, color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, backgroundColor: '#0F172A',
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'DMSans-Regular' },

  // Hero
  heroCard: {
    backgroundColor: '#0F172A', paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
  },
  heroStatsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: RADIUS.lg,
  },
  heroStatItem: { alignItems: 'center' },
  heroStatVal: { fontSize: 15, fontWeight: '900', color: '#38BDF8', fontFamily: 'Outfit-Bold' },
  heroStatLbl: { fontSize: 9, color: '#94A3B8', marginTop: 1, fontFamily: 'DMSans-Regular' },
  heroStatDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    backgroundColor: '#0F172A',
  },
  tabItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabItemActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', fontFamily: 'DMSans-Medium' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800', fontFamily: 'Outfit-Bold' },

  // Cards
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.15)', ...SHADOWS.sm,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  meta: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  sectionHeader: { fontSize: 14, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full,
  },
  addBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },

  // Units
  unitNum: { fontSize: 18, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  metricsGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', padding: 10, borderRadius: RADIUS.md, marginTop: SPACING.sm,
  },
  metricItem: { alignItems: 'center' },
  metricLabel: { fontSize: 8, fontWeight: '800', color: COLORS.textMuted, fontFamily: 'Outfit-Bold' },
  metricValue: { fontSize: 13, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 1 },
  parkingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  parkingText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular' },

  // Directory / Floor Plan
  towerCard: {
    width: 130, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4, ...SHADOWS.sm,
  },
  towerIconBox: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  towerName: { fontSize: 13, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  towerMeta: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  towerProgressBg: {
    width: '100%', height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden',
  },
  towerProgressFill: { height: '100%', backgroundColor: '#059669', borderRadius: 2 },
  towerStatsRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  towerStatText: { fontSize: 8, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  floorRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8,
  },
  floorLabel: {
    width: 32, height: 28, borderRadius: 6,
    backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center',
  },
  floorLabelText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
  floorUnits: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  floorUnit: {
    width: 48, height: 40, borderRadius: RADIUS.md,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  floorUnitText: { fontSize: 11, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  floorUnitDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },

  legendRow: { flexDirection: 'row', gap: 12, marginTop: SPACING.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  // Tenants
  tenantUnit: { fontSize: 11, fontWeight: '800', color: COLORS.primary, fontFamily: 'Outfit-Bold' },
  tenantName: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 1 },
  tenantFinBox: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', padding: 10, borderRadius: RADIUS.md, marginTop: SPACING.sm,
  },
  finLabel: { fontSize: 8, fontWeight: '800', color: COLORS.textMuted, fontFamily: 'Outfit-Bold' },
  finValue: { fontSize: 14, fontWeight: '900', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 1 },
  leaseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.sm },
  tenantActions: {
    flexDirection: 'row', gap: 12, marginTop: SPACING.sm,
    paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  tenantActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tenantActionText: { fontSize: 11, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  // KYC
  kycStatsBar: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', gap: 4, ...SHADOWS.sm,
  },
  kycStatItem: { flex: 1, alignItems: 'center' },
  kycStatValue: { fontSize: 20, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  kycStatLabel: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },

  kycTenantCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.sm,
  },
  kycDocList: { marginTop: SPACING.sm, gap: 6 },
  kycDocRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  kycDocIconBox: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  kycDocName: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  kycDocNum: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  kycDocExpiry: { fontSize: 9, color: '#D97706', fontFamily: 'DMSans-Medium' },
  kycStatusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  kycStatusText: { fontSize: 9, fontWeight: '800', fontFamily: 'Outfit-Bold' },

  // NOC
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  // Documents
  docCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', ...SHADOWS.sm,
  },
  docIconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  docTitle: { fontSize: 12, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },

  // CRM
  crmSummaryCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', gap: SPACING.sm, ...SHADOWS.sm,
  },
  funnelRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  funnelItem: { flex: 1, alignItems: 'center', gap: 3 },
  funnelCount: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  funnelCountText: { fontSize: 15, fontWeight: '900', fontFamily: 'Outfit-Bold' },
  funnelLabel: { fontSize: 8, fontWeight: '700', color: COLORS.textMuted, fontFamily: 'DMSans-Medium', textAlign: 'center' },
  pipelineValueBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F0FDF4', padding: SPACING.sm, borderRadius: RADIUS.md,
  },
  pipelineValueLabel: { fontSize: 11, fontWeight: '700', color: '#059669', fontFamily: 'DMSans-Medium' },
  pipelineValueText: { fontSize: 16, fontWeight: '900', color: '#059669', fontFamily: 'Outfit-Bold' },

  leadDetailsRow: { flexDirection: 'row', gap: 16, marginTop: SPACING.sm },
  leadDetail: {},
  leadNotes: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', marginTop: SPACING.xs },

  // AI Advisor
  aiHeaderIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm,
  },
  aiConfidence: { fontSize: 11, fontWeight: '800', fontFamily: 'Outfit-Bold' },
  aiInsight: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginTop: 4, marginBottom: 8, fontFamily: 'DMSans-Regular' },
  aiRecBox: { backgroundColor: '#F5F3FF', padding: 10, borderRadius: RADIUS.md },
  aiRecLabel: { fontSize: 8, fontWeight: '900', color: '#7C3AED', fontFamily: 'Outfit-Bold' },
  aiRecText: { fontSize: 12, color: '#4C1D95', fontWeight: '700', marginTop: 2, fontFamily: 'DMSans-Bold' },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: SPACING.xs },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: 8 },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', fontFamily: 'DMSans-Regular', paddingHorizontal: 30 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, ...SHADOWS.md },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold', marginTop: SPACING.sm, marginBottom: 4 },
  fieldInput: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular',
  },
  choiceRow: { flexDirection: 'row', gap: 6 },
  choiceChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#F8FAFC',
  },
  choiceChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  choiceChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, fontFamily: 'DMSans-Medium' },
  choiceChipTextActive: { color: '#FFFFFF', fontWeight: '800' },

  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  confirmBtn: {
    flex: 1.4, paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center', ...SHADOWS.sm,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Outfit-Bold' },
});
