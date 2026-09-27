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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { cposService } from '@/services/cposService';
import type {
  PropertyUnitDto,
  MoveInOutNocDto,
  FlatDocumentDto,
  AIPropertyInsightDto,
} from '@/types/cpos';

type TabType = 'UNITS' | 'TENANTS' | 'NOC' | 'VAULT' | 'AI_ADVISOR';

export default function CPOSScreen() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('UNITS');
  const [nocModalVisible, setNocModalVisible] = useState(false);
  const [nocType, setNocType] = useState<'MOVE_IN' | 'MOVE_OUT'>('MOVE_IN');
  const [nocUnit, setNocUnit] = useState('A-1204');
  const [nocDate, setNocDate] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: properties = [], isLoading: propsLoading, refetch: refetchProps, isRefetching } = useQuery({
    queryKey: ['cposProperties'],
    queryFn: cposService.getMyProperties,
  });

  const { data: nocList = [], isLoading: nocLoading, refetch: refetchNoc } = useQuery({
    queryKey: ['cposNocs'],
    queryFn: cposService.getNocRequests,
  });

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ['cposDocuments'],
    queryFn: cposService.getDocuments,
  });

  const { data: aiInsights = [], isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['cposAIInsights'],
    queryFn: cposService.getAIInsights,
  });

  const isLoading = propsLoading || nocLoading || docsLoading || aiLoading;

  const onRefresh = () => {
    refetchProps();
    refetchNoc();
    refetchDocs();
    refetchAI();
  };

  // ── Mutations ────────────────────────────────────────────────────────
  const requestNocMutation = useMutation({
    mutationFn: (payload: Partial<MoveInOutNocDto>) => cposService.requestNoc(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cposNocs'] });
      setNocModalVisible(false);
      setNocDate('');
      Alert.alert('NOC Requested', 'Your Move-in/Move-out NOC application with Goods Lift booking has been sent to the Management Office.');
    },
  });

  const handleNocSubmit = () => {
    if (!nocDate.trim()) {
      Alert.alert('Error', 'Please enter your preferred moving date.');
      return;
    }
    requestNocMutation.mutate({
      unitNumber: nocUnit,
      type: nocType,
      scheduledDate: nocDate,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Portfolio Overview Hero Banner ──────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroPill}>
              <Ionicons name="business" size={12} color="#93C5FD" />
              <Text style={styles.heroPillText}>Mana Property OS</Text>
            </View>
            <Text style={styles.heroSubText}>Digital Twin & Portfolio</Text>
          </View>

          <Text style={styles.heroTitle}>Apartment Portfolio & Tenancy Command</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>{properties.length} Flats</Text>
              <Text style={styles.heroStatLbl}>Owned Units</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>₹3.70 Cr</Text>
              <Text style={styles.heroStatLbl}>Estimated Value</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatVal}>6.4%</Text>
              <Text style={styles.heroStatLbl}>Rental Yield</Text>
            </View>
          </View>
        </View>

        {/* ── Navigation Tab Bar ──────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {[
            { key: 'UNITS', label: 'My Units', icon: 'home-outline' },
            { key: 'TENANTS', label: 'Tenants & Leases', icon: 'people-outline' },
            { key: 'NOC', label: 'Move In/Out NOC', icon: 'document-text-outline' },
            { key: 'VAULT', label: 'Flat Documents', icon: 'folder-outline' },
            { key: 'AI_ADVISOR', label: 'AI Advisor', icon: 'sparkles-outline' },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key as TabType)}
                activeOpacity={0.8}
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
            {/* ── TAB 1: MY UNITS ─────────────────────────────────────── */}
            {activeTab === 'UNITS' && (
              <View style={styles.tabContent}>
                {properties.map((p) => (
                  <View key={p.id} style={styles.unitCard}>
                    <View style={styles.unitHeader}>
                      <View>
                        <Text style={styles.unitNum}>{p.unitNumber}</Text>
                        <Text style={styles.unitTower}>{p.tower} · Floor {p.floor}</Text>
                      </View>
                      <View
                        style={[
                          styles.occupancyBadge,
                          p.ownershipType === 'OWNER_OCCUPIED'
                            ? { backgroundColor: '#D1FAE5' }
                            : { backgroundColor: '#DBEAFE' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.occupancyText,
                            p.ownershipType === 'OWNER_OCCUPIED'
                              ? { color: '#065F46' }
                              : { color: '#1E40AF' },
                          ]}
                        >
                          {p.ownershipType.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.unitMetricsGrid}>
                      <View style={styles.unitMetricItem}>
                        <Text style={styles.unitMetricLbl}>CONFIG</Text>
                        <Text style={styles.unitMetricVal}>{p.configuration}</Text>
                      </View>
                      <View style={styles.unitMetricItem}>
                        <Text style={styles.unitMetricLbl}>AREA</Text>
                        <Text style={styles.unitMetricVal}>{p.carpetAreaSqFt} sq.ft</Text>
                      </View>
                      <View style={styles.unitMetricItem}>
                        <Text style={styles.unitMetricLbl}>VALUE</Text>
                        <Text style={styles.unitMetricVal}>{p.estimatedMarketValue}</Text>
                      </View>
                      <View style={styles.unitMetricItem}>
                        <Text style={styles.unitMetricLbl}>YIELD</Text>
                        <Text style={styles.unitMetricVal}>{p.rentalYield}</Text>
                      </View>
                    </View>

                    <View style={styles.parkingRow}>
                      <Ionicons name="car-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.parkingText}>
                        Assigned Parking Slots: <Text style={{ fontWeight: '800' }}>{p.parkingSlotsAssigned.join(', ')}</Text>
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 2: TENANTS & LEASES ─────────────────────────────── */}
            {activeTab === 'TENANTS' && (
              <View style={styles.tabContent}>
                {properties
                  .filter((p) => p.currentTenant)
                  .map((p) => {
                    const t = p.currentTenant!;
                    return (
                      <View key={p.id} style={styles.tenantCard}>
                        <View style={styles.tenantHeader}>
                          <View>
                            <Text style={styles.tenantUnit}>Flat {p.unitNumber} ({p.tower})</Text>
                            <Text style={styles.tenantName}>👤 {t.name}</Text>
                          </View>
                          {t.policeVerificationDone && (
                            <View style={styles.policeBadge}>
                              <Ionicons name="shield-checkmark" size={12} color="#059669" />
                              <Text style={styles.policeText}>Police Verified</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.tenantFinancialsBox}>
                          <View>
                            <Text style={styles.tenantFinLbl}>MONTHLY RENT</Text>
                            <Text style={styles.tenantFinVal}>₹{t.monthlyRent.toLocaleString()}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.tenantFinLbl}>SECURITY DEPOSIT</Text>
                            <Text style={styles.tenantFinVal}>₹{t.depositAmount.toLocaleString()}</Text>
                          </View>
                        </View>

                        <View style={styles.leasePeriodBox}>
                          <Ionicons name="calendar-outline" size={15} color={COLORS.textMuted} />
                          <Text style={styles.leasePeriodText}>
                            Lease: {t.leaseStartDate} to {t.leaseEndDate}
                          </Text>
                        </View>

                        <View style={styles.tenantActionRow}>
                          <TouchableOpacity
                            style={styles.tenantCallBtn}
                            onPress={() => Alert.alert('Tenant Contact', `Calling ${t.phone}...`)}
                          >
                            <Ionicons name="call-outline" size={15} color={COLORS.primary} />
                            <Text style={styles.tenantCallText}>Call Tenant</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rentInvoiceBtn}
                            onPress={() => Alert.alert('Rent Receipt', 'Generating rent payment tax invoice PDF...')}
                          >
                            <Ionicons name="receipt-outline" size={15} color="#059669" />
                            <Text style={styles.rentInvoiceText}>Rent Receipt</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* ── TAB 3: MOVE-IN / OUT NOC ────────────────────────────── */}
            {activeTab === 'NOC' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTitleRow}>
                  <View>
                    <Text style={styles.sectionHeading}>Moving NOC & Lift Bookings</Text>
                    <Text style={styles.sectionSub}>Manage security clearance and padded freight elevator slots</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addNocBtn}
                    onPress={() => setNocModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addNocBtnText}>Request NOC</Text>
                  </TouchableOpacity>
                </View>

                {nocList.map((noc) => (
                  <View key={noc.id} style={styles.nocCard}>
                    <View style={styles.nocHeader}>
                      <View style={styles.nocTypePill}>
                        <Text style={styles.nocTypeText}>{noc.type.replace(/_/g, ' ')}</Text>
                      </View>
                      <View
                        style={[
                          styles.nocStatusPill,
                          noc.status === 'APPROVED' || noc.status === 'COMPLETED'
                            ? { backgroundColor: '#D1FAE5' }
                            : { backgroundColor: '#FEF3C7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.nocStatusText,
                            noc.status === 'APPROVED' || noc.status === 'COMPLETED'
                              ? { color: '#065F46' }
                              : { color: '#92400E' },
                          ]}
                        >
                          {noc.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.nocTitle}>Unit {noc.unitNumber} · {noc.residentName}</Text>
                    <Text style={styles.nocSchedule}>📅 Scheduled: {noc.scheduledDate} ({noc.timeSlot})</Text>

                    <View style={styles.nocChecksRow}>
                      <View style={styles.nocCheckItem}>
                        <Ionicons
                          name={noc.securityDepositCleared ? 'checkmark-circle' : 'time'}
                          size={15}
                          color={noc.securityDepositCleared ? '#059669' : '#D97706'}
                        />
                        <Text style={styles.nocCheckText}>Deposit Cleared</Text>
                      </View>
                      <View style={styles.nocCheckItem}>
                        <Ionicons
                          name={noc.liftBookingConfirmed ? 'checkmark-circle' : 'time'}
                          size={15}
                          color={noc.liftBookingConfirmed ? '#059669' : '#D97706'}
                        />
                        <Text style={styles.nocCheckText}>Freight Lift Booked</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── TAB 4: FLAT DOCUMENTS ───────────────────────────────── */}
            {activeTab === 'VAULT' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionHeading}>Flat Legal & Tax Document Vault</Text>
                  <Text style={styles.sectionSub}>Encrypted storage for deeds, tax receipts and agreements</Text>
                </View>

                {documents.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.docCard}
                    onPress={() => Alert.alert('Opening Document', doc.title)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.docIconWrap}>
                      <Ionicons name="document-lock" size={24} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docTitle} numberOfLines={2}>{doc.title}</Text>
                      <Text style={styles.docMeta}>{doc.category} · {doc.fileSize} · Updated {doc.lastUpdated}</Text>
                    </View>
                    <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── TAB 5: AI ADVISOR ───────────────────────────────────── */}
            {activeTab === 'AI_ADVISOR' && (
              <View style={styles.tabContent}>
                <View style={styles.aiHeader}>
                  <Ionicons name="sparkles" size={20} color="#7C3AED" />
                  <Text style={styles.aiHeading}>AI Real Estate & Maintenance Insights</Text>
                </View>

                {aiInsights.map((ai) => (
                  <View key={ai.id} style={styles.aiCard}>
                    <View style={styles.aiCardHeader}>
                      <View style={styles.aiTypePill}>
                        <Text style={styles.aiTypePillText}>{ai.type}</Text>
                      </View>
                      <Text style={styles.aiConfidence}>🎯 {ai.confidenceScore}% Confidence</Text>
                    </View>

                    <Text style={styles.aiCardTitle}>{ai.title}</Text>
                    <Text style={styles.aiCardInsight}>{ai.insight}</Text>

                    <View style={styles.aiRecBox}>
                      <Text style={styles.aiRecLabel}>AI RECOMMENDATION:</Text>
                      <Text style={styles.aiRecText}>{ai.recommendation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Request NOC Modal ───────────────────────────────────────── */}
      <Modal visible={nocModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Moving NOC</Text>
              <TouchableOpacity onPress={() => setNocModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Movement Type</Text>
            <View style={styles.nocTypeRow}>
              {(['MOVE_IN', 'MOVE_OUT'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.nocChoice, nocType === t && styles.nocChoiceSelected]}
                  onPress={() => setNocType(t)}
                >
                  <Text style={[styles.nocChoiceText, nocType === t && styles.nocChoiceTextSelected]}>
                    {t.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Apartment Unit</Text>
            <TextInput
              style={styles.input}
              value={nocUnit}
              onChangeText={setNocUnit}
              placeholder="e.g. A-1204"
            />

            <Text style={styles.inputLabel}>Scheduled Date</Text>
            <TextInput
              style={styles.input}
              value={nocDate}
              onChangeText={setNocDate}
              placeholder="e.g. 15 Nov 2026 (10 AM)"
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNocModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleNocSubmit}
                disabled={requestNocMutation.isPending}
              >
                {requestNocMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Application</Text>
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

  // ── Hero Banner ───────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  heroPillText: { fontSize: 10, fontWeight: '800', color: '#93C5FD' },
  heroSubText: { fontSize: 11, color: '#94A3B8' },
  heroTitle: { fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 12 },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    borderRadius: RADIUS.lg,
  },
  heroStatItem: { alignItems: 'center' },
  heroStatVal: { fontSize: 16, fontWeight: '900', color: '#38BDF8' },
  heroStatLbl: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
  heroStatDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },

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
  tabBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  tabBtnTextActive: { color: '#fff' },

  tabContent: { gap: SPACING.md },

  // ── Unit Card ─────────────────────────────────────────────────────
  unitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  unitHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  unitNum: { fontSize: 18, fontWeight: '900', color: COLORS.text },
  unitTower: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  occupancyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  occupancyText: { fontSize: 10, fontWeight: '900' },
  unitMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 10,
  },
  unitMetricItem: { alignItems: 'center' },
  unitMetricLbl: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  unitMetricVal: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  parkingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  parkingText: { fontSize: 12, color: COLORS.textSecondary },

  // ── Tenant Card ───────────────────────────────────────────────────
  tenantCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  tenantHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tenantUnit: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  tenantName: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  policeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  policeText: { fontSize: 10, fontWeight: '800', color: '#065F46' },
  tenantFinancialsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    padding: 10,
    borderRadius: RADIUS.md,
    marginBottom: 8,
  },
  tenantFinLbl: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted },
  tenantFinVal: { fontSize: 15, fontWeight: '900', color: COLORS.text, marginTop: 2 },
  leasePeriodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  leasePeriodText: { fontSize: 12, color: COLORS.textSecondary },
  tenantActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  tenantCallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tenantCallText: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  rentInvoiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rentInvoiceText: { fontSize: 12, fontWeight: '800', color: '#059669' },

  // ── NOC Card ──────────────────────────────────────────────────────
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  sectionSub: { fontSize: 12, color: COLORS.textMuted },
  addNocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  addNocBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  nocCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  nocHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  nocTypePill: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  nocTypeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  nocStatusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  nocStatusText: { fontSize: 10, fontWeight: '800' },
  nocTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  nocSchedule: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  nocChecksRow: { flexDirection: 'row', gap: 16 },
  nocCheckItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nocCheckText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },

  // ── Document Vault ────────────────────────────────────────────────
  docCard: {
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
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  docMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // ── AI Advisor ────────────────────────────────────────────────────
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiHeading: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  aiCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    ...SHADOWS.sm,
  },
  aiCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  aiTypePill: { backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  aiTypePillText: { fontSize: 10, fontWeight: '900', color: '#7C3AED' },
  aiConfidence: { fontSize: 11, fontWeight: '800', color: '#059669' },
  aiCardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  aiCardInsight: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 8 },
  aiRecBox: { backgroundColor: '#F5F3FF', padding: 10, borderRadius: RADIUS.md },
  aiRecLabel: { fontSize: 9, fontWeight: '900', color: '#7C3AED' },
  aiRecText: { fontSize: 12, color: '#4C1D95', fontWeight: '700', marginTop: 2 },

  // ── Modal Styles ──────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  nocTypeRow: { flexDirection: 'row', gap: 10 },
  nocChoice: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  nocChoiceSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  nocChoiceText: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary },
  nocChoiceTextSelected: { color: '#fff' },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  submitBtn: { flex: 2, paddingVertical: 12, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
