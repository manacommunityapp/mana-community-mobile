import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import { paymentService } from '@/services/paymentService';
import { interiorsMarketplaceService as service } from '@/services/interiorsMarketplaceService';
import type {
  InteriorChangeRequest,
  InteriorPaymentMilestone,
  InteriorProject,
  InteriorQuote,
} from '@/types/interiors';

const STAGES = ['BRIEF_POSTED', 'QUOTES_RECEIVED', 'IN_EXECUTION', 'COMPLETED'] as const;

export default function InteriorProjectScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const id = Number(projectId);

  const [project, setProject] = useState<InteriorProject | null>(null);
  const [changes, setChanges] = useState<InteriorChangeRequest[]>([]);
  const [payments, setPayments] = useState<InteriorPaymentMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quote detail modal
  const [selectedQuote, setSelectedQuote] = useState<InteriorQuote | null>(null);

  // Forms
  const [changeDesc, setChangeDesc] = useState('');
  const [scopeDelta, setScopeDelta] = useState('');
  const [priceDelta, setPriceDelta] = useState('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneAmount, setMilestoneAmount] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [selectedMilestoneForInvoice, setSelectedMilestoneForInvoice] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c, m] = await Promise.all([
        service.project(id),
        service.changeRequests(id),
        service.paymentSchedule(id),
      ]);
      setProject(p);
      setChanges(c);
      setPayments(m);
    } catch (e: any) {
      Alert.alert('Project', e?.response?.data?.message || 'Could not load project details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const startCashfreePayment = async (m: InteriorPaymentMilestone) => {
    try {
      const order = await service.createMilestoneCheckout(id, m.id);
      if (order.gateway !== 'CASHFREE' || !order.paymentSessionId) {
        throw new Error('Project not configured for Cashfree checkout.');
      }

      CFPaymentGatewayService.setCallback({
        onVerify: async (orderID: string) => {
          try {
            await paymentService.verifyPayment(orderID);
            await service.authorizeMilestone(id, m.id, 'CASHFREE', orderID);
            Alert.alert('Payment Authorized', 'Funds are held in escrow and will be released upon your approval.');
            await load();
          } catch (e: any) {
            Alert.alert('Verification', e?.message || 'Payment verification failed.');
          }
        },
        onError: (err: any) => {
          Alert.alert('Payment Cancelled', err?.message || 'Payment could not be completed.');
        },
      });

      CFPaymentGatewayService.doWebPayment(
        new CFSession(order.paymentSessionId, order.orderId, CFEnvironment.PRODUCTION)
      );
    } catch (e: any) {
      Alert.alert('Checkout Error', e?.response?.data?.message || e?.message || 'Payment failed to initiate.');
    }
  };

  const handleProposeChange = async () => {
    if (!changeDesc.trim()) {
      Alert.alert('Required', 'Please describe what changes are needed in scope.');
      return;
    }
    try {
      await service.createChange(id, {
        description: changeDesc.trim(),
        scopeDelta: scopeDelta.trim() || undefined,
        priceDelta: priceDelta ? Number(priceDelta) : undefined,
      });
      setChangeDesc('');
      setScopeDelta('');
      setPriceDelta('');
      Alert.alert('Change Requested', 'Scope change proposal submitted for designer approval.');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit change proposal.');
    }
  };

  const handleAddMilestone = async () => {
    const amt = parseFloat(milestoneAmount);
    if (!milestoneTitle.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Required', 'Please enter a milestone title and valid positive amount.');
      return;
    }
    try {
      await service.addPaymentMilestone(id, {
        title: milestoneTitle.trim(),
        amount: amt,
      });
      setMilestoneTitle('');
      setMilestoneAmount('');
      Alert.alert('Milestone Added', 'New payment milestone scheduled.');
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to add payment milestone.');
    }
  };

  if (loading || !project) {
    return (
      <View style={s.centerBox}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={s.loadingText}>Loading project workspace...</Text>
      </View>
    );
  }

  const currentStageIndex = STAGES.indexOf(project.status as any) >= 0 ? STAGES.indexOf(project.status as any) : 1;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={s.headerCard}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{project.title}</Text>
            <Text style={s.headerSub}>{project.locality} • {project.propertyType} • {project.homeSize}</Text>
          </View>
          <View style={s.statusPill}>
            <Text style={s.statusPillText}>{project.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {/* Status Stepper */}
        <View style={s.stepperRow}>
          {STAGES.map((st, i) => {
            const active = i <= currentStageIndex;
            return (
              <View key={st} style={s.stepItem}>
                <View style={[s.stepCircle, active && s.stepCircleActive]}>
                  <Text style={[s.stepNumber, active && s.stepNumberActive]}>{i + 1}</Text>
                </View>
                <Text style={[s.stepLabel, active && s.stepLabelActive]} numberOfLines={1}>
                  {st.replace(/_/g, ' ')}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={s.body}>
        {/* Project Scope Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Project Scope &amp; Specifications</Text>
          <Text style={s.scopeText}>{project.projectScope}</Text>
          {project.stylePreference && (
            <View style={s.specRow}>
              <Text style={s.specLabel}>Style: </Text>
              <Text style={s.specValue}>{project.stylePreference}</Text>
            </View>
          )}
        </View>

        {/* ── DESIGNER QUOTES & BOQ ── */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Designer Quotations ({project.quotes?.length || 0})</Text>
            <Ionicons name="pricetag-outline" size={16} color="#4F46E5" />
          </View>

          {(!project.quotes || project.quotes.length === 0) ? (
            <Text style={s.emptyHint}>No quotations submitted yet. Designers are reviewing your brief.</Text>
          ) : (
            project.quotes.map((q) => {
              const isAccepted = q.status === 'ACCEPTED';
              return (
                <View key={q.id} style={[s.quoteCard, isAccepted && s.acceptedQuoteCard]}>
                  <View style={s.quoteHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.quoteProvider}>{q.providerName}</Text>
                      <Text style={s.quoteMeta}>
                        ⏱️ {q.estimatedDurationDays} days • {q.lineItems?.length || 0} BOQ items
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.quoteAmount}>₹{q.quotedAmount.toLocaleString('en-IN')}</Text>
                      <Text style={[s.quoteStatus, isAccepted && { color: '#059669', fontWeight: '800' }]}>
                        {q.status}
                      </Text>
                    </View>
                  </View>

                  <View style={s.quoteActionsRow}>
                    <TouchableOpacity
                      style={s.boqBtn}
                      onPress={() => setSelectedQuote(q)}
                    >
                      <Ionicons name="list-outline" size={14} color="#4F46E5" />
                      <Text style={s.boqBtnText}>View Itemized BOQ</Text>
                    </TouchableOpacity>

                    {q.status === 'SUBMITTED' && (
                      <TouchableOpacity
                        style={s.acceptBtn}
                        onPress={async () => {
                          try {
                            await service.acceptQuote(id, q.id);
                            Alert.alert('Quote Accepted', `Contract awarded to ${q.providerName}!`);
                            await load();
                          } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.message || 'Could not accept quote.');
                          }
                        }}
                      >
                        <Text style={s.acceptBtnText}>Accept Quote</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── SCOPE CHANGE REQUESTS ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Scope Change Requests ({changes.length})</Text>
          <Text style={s.cardSub}>Submit modifications to deliverables or pricing after work starts.</Text>

          <TextInput
            style={s.input}
            placeholder="Change summary (e.g. Add sensor LED wardrobe strip)"
            placeholderTextColor={COLORS.textMuted}
            value={changeDesc}
            onChangeText={setChangeDesc}
          />
          <TextInput
            style={s.input}
            placeholder="Scope details (dimensions, material)"
            placeholderTextColor={COLORS.textMuted}
            value={scopeDelta}
            onChangeText={setScopeDelta}
          />
          <TextInput
            style={s.input}
            placeholder="Estimated cost change (₹, can be negative)"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={priceDelta}
            onChangeText={setPriceDelta}
          />
          <TouchableOpacity style={s.primaryBtn} onPress={handleProposeChange}>
            <Text style={s.primaryBtnText}>Propose Scope Change</Text>
          </TouchableOpacity>

          {changes.map((c) => (
            <View key={c.id} style={s.changeItem}>
              <View style={s.cardHeaderRow}>
                <Text style={s.changeDesc}>{c.description}</Text>
                <View style={[s.statusPill, c.status === 'APPROVED' ? s.pillGreen : s.pillGray]}>
                  <Text style={s.statusPillText}>{c.status}</Text>
                </View>
              </View>
              <Text style={s.changeMeta}>
                {c.scopeDelta || 'No scope details'}{c.priceDelta != null ? ` • ₹${c.priceDelta}` : ''}
              </Text>
              {c.status === 'PENDING' && (
                <View style={s.decisionRow}>
                  <TouchableOpacity
                    style={[s.decisionBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                    onPress={async () => {
                      try {
                        await service.decideChange(id, c.id, 'APPROVED');
                        Alert.alert('Approved', 'Scope change approved.');
                        await load();
                      } catch {
                        Alert.alert('Error', 'Could not approve change.');
                      }
                    }}
                  >
                    <Text style={{ color: '#059669', fontWeight: '700', fontSize: 11 }}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.decisionBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                    onPress={async () => {
                      try {
                        await service.decideChange(id, c.id, 'REJECTED');
                        Alert.alert('Rejected', 'Scope change rejected.');
                        await load();
                      } catch {
                        Alert.alert('Error', 'Could not reject change.');
                      }
                    }}
                  >
                    <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 11 }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* ── ESCROW PAYMENT SCHEDULE ── */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>Payment Milestones &amp; Escrow</Text>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
          </View>
          <Text style={s.cardSub}>Funds are held safely in escrow until you verify milestone completion.</Text>

          <TextInput
            style={s.input}
            placeholder="Milestone title (e.g. 50% Woodwork Completed)"
            placeholderTextColor={COLORS.textMuted}
            value={milestoneTitle}
            onChangeText={setMilestoneTitle}
          />
          <TextInput
            style={s.input}
            placeholder="Amount (₹)"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={milestoneAmount}
            onChangeText={setMilestoneAmount}
          />
          <TouchableOpacity style={s.primaryBtn} onPress={handleAddMilestone}>
            <Text style={s.primaryBtnText}>Schedule Milestone</Text>
          </TouchableOpacity>

          {payments.map((m) => {
            const canPay = m.status === 'SCHEDULED' || m.status === 'PAYMENT_PENDING';
            const canRelease = m.status === 'AUTHORIZED';
            return (
              <View key={m.id} style={s.milestoneCard}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.milestoneTitle}>{m.title}</Text>
                  <Text style={s.milestoneAmount}>₹{m.amount.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={s.milestoneStatus}>Status: {m.status}</Text>

                <View style={s.milestoneActions}>
                  {canPay && (
                    <TouchableOpacity
                      style={s.payBtn}
                      onPress={() => startCashfreePayment(m)}
                    >
                      <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                      <Text style={s.payBtnText}>Pay via Cashfree</Text>
                    </TouchableOpacity>
                  )}

                  {canRelease && (
                    <TouchableOpacity
                      style={s.releaseBtn}
                      onPress={async () => {
                        try {
                          await service.releaseMilestone(id, m.id);
                          Alert.alert('Released', 'Milestone payment released to designer.');
                          await load();
                        } catch {
                          Alert.alert('Error', 'Could not release payment.');
                        }
                      }}
                    >
                      <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
                      <Text style={s.releaseBtnText}>Release Escrow Payout</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={s.invoiceBtn}
                    onPress={() => setSelectedMilestoneForInvoice(m.id)}
                  >
                    <Ionicons name="receipt-outline" size={14} color="#4F46E5" />
                    <Text style={s.invoiceBtnText}>
                      {m.invoiceReference ? `Invoice: ${m.invoiceReference}` : 'Link Invoice'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* BOQ Checkout Button */}
        <TouchableOpacity
          style={s.boqCheckoutBtn}
          onPress={async () => {
            try {
              const order = await service.checkoutBoq(id);
              Alert.alert('Procurement Order Created', `${order.orderNumber || 'Order'} generated from BOQ materials.`);
            } catch (e: any) {
              Alert.alert('Notice', e?.response?.data?.message || 'BOQ catalog products synced.');
            }
          }}
        >
          <Ionicons name="cube-outline" size={18} color="#FFFFFF" />
          <Text style={s.boqCheckoutText}>Procure Materials from Mapped BOQ</Text>
        </TouchableOpacity>
      </View>

      {/* ── MODAL: BOQ ITEM DETAILS ── */}
      <Modal visible={!!selectedQuote} transparent animationType="slide" onRequestClose={() => setSelectedQuote(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Itemized BOQ ({selectedQuote?.providerName})</Text>
              <TouchableOpacity onPress={() => setSelectedQuote(null)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.boqTotal}>Total Quoted: ₹{selectedQuote?.quotedAmount.toLocaleString('en-IN')}</Text>
              {selectedQuote?.lineItems?.map((item) => (
                <View key={item.id} style={s.boqLineItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.boqLineCategory}>{item.category}</Text>
                    <Text style={s.boqLineDesc}>{item.description}</Text>
                    <Text style={s.boqLineQty}>{item.quantity} {item.unit} @ ₹{item.unitPrice.toLocaleString()}</Text>
                  </View>
                  <Text style={s.boqLineTotal}>₹{item.lineTotal.toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: LINK INVOICE ── */}
      <Modal visible={selectedMilestoneForInvoice != null} transparent animationType="slide" onRequestClose={() => setSelectedMilestoneForInvoice(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Link Tax Invoice Reference</Text>
              <TouchableOpacity onPress={() => setSelectedMilestoneForInvoice(null)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.input}
              placeholder="e.g. INV-2026-8840"
              placeholderTextColor={COLORS.textMuted}
              value={invoiceRef}
              onChangeText={setInvoiceRef}
            />

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: SPACING.md }]}
              onPress={async () => {
                if (!invoiceRef.trim() || selectedMilestoneForInvoice == null) return;
                try {
                  await service.linkInvoice(id, selectedMilestoneForInvoice, invoiceRef.trim());
                  setSelectedMilestoneForInvoice(null);
                  setInvoiceRef('');
                  Alert.alert('Invoice Linked', 'Tax invoice reference updated.');
                  await load();
                } catch {
                  Alert.alert('Error', 'Failed to link invoice.');
                }
              }}
            >
              <Text style={s.primaryBtnText}>Save Invoice Reference</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl * 2 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  loadingText: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },

  headerCard: {
    backgroundColor: '#1E1B4B',
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  statusPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 4 },
  stepItem: { flex: 1, alignItems: 'center' },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: { backgroundColor: '#4F46E5' },
  stepNumber: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  stepLabelActive: { color: '#FFFFFF' },

  body: { padding: SPACING.md, gap: SPACING.md },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    ...SHADOWS.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  cardSub: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scopeText: { fontSize: 13, color: '#334155', lineHeight: 19 },
  specRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  specLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  specValue: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },

  emptyHint: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 8 },

  quoteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  acceptedQuoteCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quoteProvider: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  quoteMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  quoteAmount: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  quoteStatus: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  quoteActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  boqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    backgroundColor: '#EEF2FF',
  },
  boqBtnText: { fontSize: 11, fontWeight: '700', color: '#4F46E5' },
  acceptBtn: {
    backgroundColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  acceptBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    padding: 10,
    fontSize: 13,
    color: COLORS.text,
  },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  changeItem: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    gap: 4,
  },
  changeDesc: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  changeMeta: { fontSize: 11, color: COLORS.textMuted },
  pillGreen: { backgroundColor: '#D1FAE5' },
  pillGray: { backgroundColor: '#F1F5F9' },
  decisionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  decisionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },

  milestoneCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    gap: 6,
  },
  milestoneTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  milestoneAmount: { fontSize: 14, fontWeight: '800', color: '#059669' },
  milestoneStatus: { fontSize: 10, color: COLORS.textMuted },
  milestoneActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  payBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  releaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  releaseBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  invoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  invoiceBtnText: { color: '#4F46E5', fontSize: 11, fontWeight: '700' },

  boqCheckoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F766E',
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  boqCheckoutText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  boqTotal: { fontSize: 14, fontWeight: '800', color: '#059669', marginBottom: 12 },
  boqLineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  boqLineCategory: { fontSize: 10, fontWeight: '700', color: '#4F46E5', textTransform: 'uppercase' },
  boqLineDesc: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  boqLineQty: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  boqLineTotal: { fontSize: 13, fontWeight: '700', color: COLORS.text },
});