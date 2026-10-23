import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { SupplierQuote } from '@/types/procurement';

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#059669', DRAFT: '#6B7280', QUOTES_RECEIVED: '#0284C7',
  COMPARING: '#D97706', AWARDED: '#7C3AED', CANCELLED: '#DC2626',
  SUBMITTED: '#2563EB', SHORTLISTED: '#D97706', REJECTED: '#DC2626', WITHDRAWN: '#6B7280',
};

function fmt(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function dateFmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(d: string) {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
}

export default function RFQDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'QUOTES'>('DETAILS');
  const [awardingId, setAwardingId] = useState<number | null>(null);

  const rfqId = Number(id);

  const { data: rfq, isLoading: loadingRFQ } = useQuery({
    queryKey: ['rfq', rfqId],
    queryFn: () => procurementHubService.getRFQ(rfqId),
    enabled: !!rfqId,
  });

  const { data: quotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ['rfq-quotes', rfqId],
    queryFn: () => procurementHubService.getRFQQuotes(rfqId),
    enabled: !!rfqId && activeTab === 'QUOTES',
  });

  const awardMut = useMutation({
    mutationFn: (quoteId: number) => procurementHubService.awardQuote(rfqId, quoteId),
    onSuccess: (po) => {
      qc.invalidateQueries({ queryKey: ['rfq', rfqId] });
      qc.invalidateQueries({ queryKey: ['procurement-rfqs'] });
      qc.invalidateQueries({ queryKey: ['procurement-pos'] });
      Alert.alert('Purchase Order Created', `PO ${po.poNumber} has been created and sent to the supplier.`, [
        { text: 'View POs', onPress: () => router.push('/procurement/purchase-orders' as any) },
        { text: 'OK' },
      ]);
      setAwardingId(null);
    },
    onError: () => { Alert.alert('Error', 'Failed to award quote.'); setAwardingId(null); },
  });

  function handleAward(quote: SupplierQuote) {
    Alert.alert(
      'Award Quote',
      `Award this RFQ to ${quote.supplierName} for ${fmt(quote.grandTotal)}? A Purchase Order will be created.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Award',
          onPress: () => { setAwardingId(quote.id); awardMut.mutate(quote.id); },
        },
      ],
    );
  }

  if (loadingRFQ) {
    return <View style={s.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }
  if (!rfq) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>RFQ not found</Text>
      </View>
    );
  }

  const rfqColor = STATUS_COLORS[rfq.status] || '#6B7280';
  const deadline = daysUntil(rfq.quotationDeadline);
  const canAward = ['QUOTES_RECEIVED', 'COMPARING'].includes(rfq.status);

  const sortedQuotes = [...quotes].sort((a, b) => a.grandTotal - b.grandTotal);
  const lowestQuote = sortedQuotes[0];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Header card */}
      <View style={s.headerCard}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.rfqNum}>{rfq.rfqNumber}</Text>
            <Text style={s.rfqTitle}>{rfq.title}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: rfqColor + '18' }]}>
            <View style={[s.statusDot, { backgroundColor: rfqColor }]} />
            <Text style={[s.statusText, { color: rfqColor }]}>{rfq.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={s.metaGrid}>
          <MetaItem icon="list-outline" label="Items" value={String(rfq.items.length)} />
          <MetaItem icon="chatbubbles-outline" label="Quotes" value={String(rfq.quotesReceived)} />
          <MetaItem icon="time-outline" label="Quote Deadline" value={`${deadline}d`} color={deadline <= 2 ? '#DC2626' : undefined} />
          <MetaItem icon="location-outline" label="Delivery" value={rfq.deliveryLocation} />
        </View>

        {rfq.estimatedValue && (
          <View style={s.budgetRow}>
            <View style={s.budgetItem}>
              <Text style={s.budgetLabel}>Estimated Value</Text>
              <Text style={s.budgetVal}>{fmt(rfq.estimatedValue)}</Text>
            </View>
            {rfq.approvedBudget && (
              <View style={s.budgetItem}>
                <Text style={s.budgetLabel}>Approved Budget</Text>
                <Text style={s.budgetVal}>{fmt(rfq.approvedBudget)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['DETAILS', 'QUOTES'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, activeTab === t && s.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
              {t === 'DETAILS' ? '📋 Details' : `💬 Quotes (${rfq.quotesReceived})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* DETAILS tab */}
      {activeTab === 'DETAILS' && (
        <View style={s.section}>
          {rfq.description && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Description</Text>
              <Text style={s.cardBody}>{rfq.description}</Text>
            </View>
          )}

          <View style={s.card}>
            <Text style={s.cardTitle}>Line Items ({rfq.items.length})</Text>
            {rfq.items.map((item, idx) => (
              <View key={idx} style={s.lineItem}>
                <View style={{ flex: 1 }}>
                  <Text style={s.lineItemName}>{item.productName}</Text>
                  {item.description && <Text style={s.lineItemDesc}>{item.description}</Text>}
                  <Text style={s.lineItemMeta}>
                    {item.quantity} {item.unit} · {item.category.replace(/_/g, ' ')}
                    {item.targetPricePerUnit ? ` · Target ₹${item.targetPricePerUnit}/unit` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Timeline</Text>
            <View style={s.timelineRow}>
              <TimelineStep label="RFQ Created" date={rfq.createdAt} done />
              <TimelineStep label="Quote Deadline" date={rfq.quotationDeadline} done={new Date(rfq.quotationDeadline) < new Date()} />
              <TimelineStep label="Delivery By" date={rfq.deliveryDeadline} done={false} />
            </View>
          </View>

          {rfq.notes && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Notes</Text>
              <Text style={s.cardBody}>{rfq.notes}</Text>
            </View>
          )}
        </View>
      )}

      {/* QUOTES tab */}
      {activeTab === 'QUOTES' && (
        <View style={s.section}>
          {['OPEN', 'QUOTES_RECEIVED', 'COMPARING'].includes(rfq.status) && (
            <TouchableOpacity
              style={s.recordQuoteBtn}
              onPress={() => router.push(`/procurement/submit-quote?rfqId=${rfqId}&rfqTitle=${encodeURIComponent(rfq.title)}` as any)}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={s.recordQuoteBtnText}>Record Supplier Quote</Text>
            </TouchableOpacity>
          )}

          {loadingQuotes && <ActivityIndicator color="#2563EB" style={{ marginTop: 16 }} />}

          {!loadingQuotes && quotes.length === 0 && (
            <View style={s.emptyQuotes}>
              <Ionicons name="chatbubbles-outline" size={32} color="#93C5FD" />
              <Text style={s.emptyTitle}>No quotes yet</Text>
              <Text style={s.emptySub}>
                {rfq.status === 'OPEN'
                  ? 'Tap "Record Supplier Quote" above to enter a quote you received.'
                  : 'This RFQ has not received any quotes.'}
              </Text>
            </View>
          )}

          {sortedQuotes.map((quote, idx) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              isLowest={idx === 0 && quotes.length > 1}
              canAward={canAward}
              awarding={awardingId === quote.id}
              onAward={() => handleAward(quote)}
            />
          ))}

          {/* Quote comparison summary */}
          {quotes.length > 1 && lowestQuote && (
            <View style={s.comparisonCard}>
              <Text style={s.cardTitle}>Comparison Summary</Text>
              <Text style={s.comparisonSub}>
                Lowest quote: {fmt(lowestQuote.grandTotal)} from {lowestQuote.supplierName}
              </Text>
              {rfq.estimatedValue && lowestQuote.grandTotal < rfq.estimatedValue && (
                <View style={s.savingsBanner}>
                  <Ionicons name="trending-down" size={16} color="#059669" />
                  <Text style={s.savingsText}>
                    Saves {fmt(rfq.estimatedValue - lowestQuote.grandTotal)} vs estimated value
                    ({Math.round(((rfq.estimatedValue - lowestQuote.grandTotal) / rfq.estimatedValue) * 100)}%)
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function MetaItem({ icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) {
  return (
    <View style={s.metaItem}>
      <Ionicons name={icon} size={13} color={color || COLORS.textMuted} />
      <View>
        <Text style={s.metaLabel}>{label}</Text>
        <Text style={[s.metaValue, color ? { color } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

function TimelineStep({ label, date, done }: { label: string; date: string; done: boolean }) {
  return (
    <View style={s.timelineStep}>
      <View style={[s.timelineCircle, done ? s.timelineDone : s.timelinePending]}>
        {done && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={s.timelineLabel}>{label}</Text>
      <Text style={s.timelineDate}>{dateFmt(date)}</Text>
    </View>
  );
}

function QuoteCard({ quote, isLowest, canAward, awarding, onAward }: {
  quote: SupplierQuote;
  isLowest: boolean;
  canAward: boolean;
  awarding: boolean;
  onAward: () => void;
}) {
  const color = STATUS_COLORS[quote.status] || '#6B7280';
  return (
    <View style={[qc.card, isLowest && qc.cardLowest]}>
      {isLowest && (
        <View style={qc.lowestBadge}>
          <Ionicons name="trophy" size={12} color="#059669" />
          <Text style={qc.lowestText}>Lowest Quote</Text>
        </View>
      )}
      <View style={qc.header}>
        <View style={qc.supplierBadge}>
          <Text style={qc.supplierInitial}>{quote.supplierName.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={qc.supplierName}>{quote.supplierName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={qc.rating}>{quote.supplierRating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={qc.total}>{fmt(quote.grandTotal)}</Text>
          <View style={[s.statusBadge, { backgroundColor: color + '18' }]}>
            <View style={[s.statusDot, { backgroundColor: color }]} />
            <Text style={[s.statusText, { color }]}>{quote.status}</Text>
          </View>
        </View>
      </View>

      <View style={qc.breakdown}>
        <View style={qc.bRow}>
          <Text style={qc.bLabel}>Sub-total</Text>
          <Text style={qc.bVal}>{fmt(quote.subTotal)}</Text>
        </View>
        <View style={qc.bRow}>
          <Text style={qc.bLabel}>GST</Text>
          <Text style={qc.bVal}>{fmt(quote.gstAmount)}</Text>
        </View>
        <View style={qc.bRow}>
          <Text style={qc.bLabel}>Delivery</Text>
          <Text style={qc.bVal}>{quote.deliveryCharge === 0 ? 'Free' : fmt(quote.deliveryCharge)}</Text>
        </View>
      </View>

      <View style={qc.footer}>
        <View>
          <Text style={qc.footerLabel}>Delivery by {dateFmt(quote.deliveryDate)}</Text>
          <Text style={qc.footerLabel}>Valid till {dateFmt(quote.validUntil)}</Text>
          <Text style={qc.payTerms}>{quote.paymentTerms}</Text>
        </View>
        {canAward && quote.status === 'SUBMITTED' && (
          <TouchableOpacity style={qc.awardBtn} onPress={onAward} disabled={awarding}>
            {awarding
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={qc.awardBtnText}>Award</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>

      {quote.notes && <Text style={qc.notes}>{quote.notes}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 12, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: COLORS.textMuted },
  headerCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rfqNum: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  rfqTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, width: '45%' },
  metaLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  budgetRow: { flexDirection: 'row', gap: 12, backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10 },
  budgetItem: { flex: 1, gap: 2 },
  budgetLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  budgetVal: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1, paddingVertical: 9, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0',
  },
  tabActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#2563EB', fontWeight: '700' },
  section: { gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  cardBody: { fontSize: 13, color: '#374151', lineHeight: 18 },
  lineItem: { flexDirection: 'row', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  lineItemName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  lineItemDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  lineItemMeta: { fontSize: 11, color: '#2563EB', fontWeight: '600', marginTop: 2 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
  timelineStep: { alignItems: 'center', gap: 4, flex: 1 },
  timelineCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDone: { backgroundColor: '#059669' },
  timelinePending: { backgroundColor: '#E2E8F0', borderWidth: 2, borderColor: '#93C5FD' },
  timelineLabel: { fontSize: 10, fontWeight: '700', color: '#374151', textAlign: 'center' },
  timelineDate: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },
  recordQuoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563EB', borderRadius: 12, padding: 12, marginBottom: 4,
  },
  recordQuoteBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyQuotes: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  comparisonCard: {
    backgroundColor: '#F0FDF4', borderRadius: RADIUS.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  comparisonSub: { fontSize: 13, color: '#166534', fontWeight: '600' },
  savingsBanner: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: '#DCFCE7', borderRadius: RADIUS.md, padding: 10,
  },
  savingsText: { fontSize: 12, color: '#166534', fontWeight: '700', flex: 1 },
});

const qc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  cardLowest: { borderColor: '#86EFAC', borderWidth: 2 },
  lowestBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  lowestText: { fontSize: 10, fontWeight: '800', color: '#059669' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  supplierBadge: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
  },
  supplierInitial: { fontSize: 18, fontWeight: '800', color: '#1D4ED8' },
  supplierName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  rating: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  total: { fontSize: 18, fontWeight: '900', color: '#1E3A5F' },
  breakdown: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 10, gap: 6 },
  bRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bLabel: { fontSize: 12, color: COLORS.textMuted },
  bVal: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerLabel: { fontSize: 11, color: COLORS.textMuted },
  payTerms: { fontSize: 11, fontWeight: '600', color: '#374151', marginTop: 2 },
  awardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#059669', borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8, ...SHADOWS.sm,
  },
  awardBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  notes: { fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', paddingTop: 4 },
});
