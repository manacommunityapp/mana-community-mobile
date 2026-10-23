import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { SupplierProfile, SupplierProduct, ProcurementCategory, SupplierReliabilityScore, SupplierPerformanceEvent } from '@/types/procurement';

type Tab = 'overview' | 'products' | 'reliability';

const CATEGORY_EMOJI: Record<string, string> = {
  CLEANING_SUPPLIES: '🧹', ELECTRICAL: '⚡', PLUMBING: '🔧',
  OFFICE_SUPPLIES: '📎', GARDENING: '🌿', SECURITY_EQUIPMENT: '🔒',
  FURNITURE: '🪑', IT_EQUIPMENT: '💻', FOOD_BEVERAGE: '🍽️',
  MAINTENANCE: '🔨', PACKAGING: '📦', OTHER: '🏷️',
};

export default function SupplierDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedCat, setSelectedCat] = useState<ProcurementCategory | 'ALL'>('ALL');
  const supplierId = Number(id);

  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => procurementHubService.getSupplier(supplierId),
    enabled: !!supplierId,
  });

  const catParam = selectedCat === 'ALL' ? undefined : selectedCat;
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['supplier-products', supplierId, catParam],
    queryFn: () => procurementHubService.getSupplierProducts(supplierId, catParam),
    enabled: !!supplierId && tab === 'products',
  });

  const { data: reliability } = useQuery({
    queryKey: ['supplier-reliability', supplierId],
    queryFn: () => procurementHubService.getSupplierReliability(supplierId),
    enabled: !!supplierId,
  });

  const { data: perfEvents = [], isLoading: loadingPerf } = useQuery({
    queryKey: ['supplier-performance', supplierId],
    queryFn: () => procurementHubService.getSupplierPerformance(supplierId),
    enabled: !!supplierId && tab === 'reliability',
  });

  if (isLoading || !supplier) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  const verified = supplier.verificationStatus === 'VERIFIED';

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#1E3A5F', '#2563EB']} style={s.hero}>
          <View style={s.heroAvatar}>
            <Text style={s.heroAvatarText}>{supplier.businessName.charAt(0)}</Text>
          </View>
          <View style={s.heroInfo}>
            <View style={s.heroNameRow}>
              <Text style={s.heroName} numberOfLines={1}>{supplier.businessName}</Text>
              {verified && <Ionicons name="checkmark-circle" size={18} color="#34D399" />}
            </View>
            <Text style={s.heroSub}>{supplier.city} · {supplier.contactPerson}</Text>
            <View style={s.heroBadges}>
              <View style={s.ratingBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={s.ratingText}>{supplier.rating.toFixed(1)} ({supplier.reviewCount})</Text>
              </View>
              <View style={[s.ratingBadge, { backgroundColor: verified ? 'rgba(52,211,153,0.2)' : 'rgba(251,191,36,0.2)' }]}>
                <Text style={[s.verifyText, { color: verified ? '#34D399' : '#FCD34D' }]}>
                  {verified ? '✓ Verified' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { val: String(supplier.totalOrders), label: 'Orders' },
            { val: `${supplier.fulfillmentRate}%`, label: 'Fulfillment' },
            { val: `${supplier.onTimeRate}%`, label: 'On-Time' },
            { val: String(supplier.reviewCount), label: 'Reviews' },
          ].map(m => (
            <View key={m.label} style={s.statBox}>
              <Text style={s.statVal}>{m.val}</Text>
              <Text style={s.statLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {(['overview', 'products', 'reliability'] as Tab[]).map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                {t === 'overview' ? '📋 Overview' : t === 'products' ? '📦 Products' : '⭐ Reliability'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'overview' && <OverviewTab supplier={supplier} />}

        {tab === 'products' && (
          <ProductsTab
            products={products}
            loading={loadingProducts}
            selectedCat={selectedCat}
            onCatChange={setSelectedCat}
            categories={supplier.categories}
            onAddToRFQ={() => router.push('/procurement/rfq/new' as any)}
          />
        )}

        {tab === 'reliability' && (
          <ReliabilityTab
            score={reliability ?? null}
            events={perfEvents}
            loading={loadingPerf}
            supplierId={supplierId}
            onRecord={() => router.push(`/procurement/record-delivery?supplierId=${supplierId}` as any)}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={s.ctaBar}>
        <TouchableOpacity
          style={s.ctaPhone}
          onPress={() => Linking.openURL(`tel:${supplier.mobile}`)}
        >
          <Ionicons name="call-outline" size={20} color="#059669" />
        </TouchableOpacity>
        <TouchableOpacity
          style={s.ctaPrimary}
          onPress={() => router.push(`/procurement/rfq/new?supplierId=${supplierId}` as any)}
        >
          <Ionicons name="document-text-outline" size={16} color="#fff" />
          <Text style={s.ctaPrimaryText}>Request Quote</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ supplier }: { supplier: SupplierProfile }) {
  return (
    <View style={ov.root}>
      <View style={ov.card}>
        <Text style={ov.cardTitle}>Categories</Text>
        <View style={ov.chips}>
          {supplier.categories.map(c => (
            <View key={c} style={ov.chip}>
              <Text style={ov.chipText}>{CATEGORY_EMOJI[c] || '📦'} {c.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={ov.card}>
        <Text style={ov.cardTitle}>Contact Information</Text>
        <InfoRow icon="person-outline" label="Contact" value={supplier.contactPerson} />
        <InfoRow icon="call-outline" label="Mobile" value={supplier.mobile} />
        <InfoRow icon="mail-outline" label="Email" value={supplier.email} />
        <InfoRow icon="location-outline" label="Address"
          value={`${supplier.address}, ${supplier.city} - ${supplier.pincode}`} />
      </View>

      {supplier.serviceArea.length > 0 && (
        <View style={ov.card}>
          <Text style={ov.cardTitle}>Service Areas</Text>
          <View style={ov.chips}>
            {supplier.serviceArea.map(area => (
              <View key={area} style={[ov.chip, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Text style={[ov.chipText, { color: '#0284C7' }]}>📍 {area}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {(supplier.gstNumber || supplier.pan) && (
        <View style={ov.card}>
          <Text style={ov.cardTitle}>Business Details</Text>
          {supplier.gstNumber && (
            <InfoRow icon="business-outline" label="GST" value={supplier.gstNumber} />
          )}
          {supplier.pan && (
            <InfoRow icon="card-outline" label="PAN" value={supplier.pan} />
          )}
        </View>
      )}

      {supplier.certifications && supplier.certifications.length > 0 && (
        <View style={ov.card}>
          <Text style={ov.cardTitle}>Certifications</Text>
          {supplier.certifications.map(cert => (
            <View key={cert} style={ov.certRow}>
              <Ionicons name="ribbon-outline" size={14} color="#7C3AED" />
              <Text style={ov.certText}>{cert}</Text>
            </View>
          ))}
        </View>
      )}

      {supplier.description && (
        <View style={ov.card}>
          <Text style={ov.cardTitle}>About</Text>
          <Text style={ov.about}>{supplier.description}</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={ov.row}>
      <Ionicons name={icon as any} size={14} color="#64748B" />
      <Text style={ov.rowLabel}>{label}</Text>
      <Text style={ov.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ── Products tab ──────────────────────────────────────────────────────────────

function ProductsTab({
  products, loading, selectedCat, onCatChange, categories, onAddToRFQ,
}: {
  products: SupplierProduct[];
  loading: boolean;
  selectedCat: ProcurementCategory | 'ALL';
  onCatChange: (c: ProcurementCategory | 'ALL') => void;
  categories: ProcurementCategory[];
  onAddToRFQ: () => void;
}) {
  return (
    <View style={pt.root}>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={pt.chips} style={{ maxHeight: 44 }}
      >
        <TouchableOpacity
          style={[pt.chip, selectedCat === 'ALL' && pt.chipActive]}
          onPress={() => onCatChange('ALL')}
        >
          <Text style={[pt.chipText, selectedCat === 'ALL' && pt.chipTextActive]}>🔍 All</Text>
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity
            key={c}
            style={[pt.chip, selectedCat === c && pt.chipActive]}
            onPress={() => onCatChange(c)}
          >
            <Text style={[pt.chipText, selectedCat === c && pt.chipTextActive]}>
              {CATEGORY_EMOJI[c] || '📦'} {c.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator color="#2563EB" style={{ marginTop: 32 }} />}

      {!loading && products.length === 0 && (
        <View style={pt.empty}>
          <Text style={pt.emptyIcon}>📦</Text>
          <Text style={pt.emptyText}>No products in this category</Text>
        </View>
      )}

      {!loading && products.map(p => (
        <View key={p.id} style={pt.card}>
          <View style={pt.top}>
            <View style={{ flex: 1 }}>
              <Text style={pt.name}>{p.name}</Text>
              {p.description && (
                <Text style={pt.desc} numberOfLines={2}>{p.description}</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={pt.price}>₹{p.wholesalePrice}/{p.unit}</Text>
              {p.retailPrice && (
                <Text style={pt.mrp}>MRP ₹{p.retailPrice}</Text>
              )}
            </View>
          </View>
          <View style={pt.meta}>
            <MetaPill label={`MOQ: ${p.moq} ${p.unit}`} />
            <MetaPill label={`Lead: ${p.leadTimeDays}d`} />
            <MetaPill label={`GST: ${p.gstPercent}%`} />
            <View style={[pt.stockBadge, { backgroundColor: p.inStock ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: p.inStock ? '#166534' : '#991B1B' }}>
                {p.inStock ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
          </View>
          {p.specifications && Object.keys(p.specifications).length > 0 && (
            <View style={pt.specs}>
              {Object.entries(p.specifications).slice(0, 4).map(([k, v]) => (
                <Text key={k} style={pt.specItem}>• {k}: {v}</Text>
              ))}
            </View>
          )}
          <TouchableOpacity style={pt.addBtn} onPress={onAddToRFQ}>
            <Ionicons name="add-circle-outline" size={15} color="#2563EB" />
            <Text style={pt.addBtnText}>Add to RFQ</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={pt.metaPill}>
      <Text style={pt.metaPillText}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  hero: { padding: 20, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  heroAvatar: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 24, fontWeight: '900', color: '#fff' },
  heroInfo: { flex: 1 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroName: { fontSize: 17, fontWeight: '900', color: '#fff', flex: 1 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  heroBadges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  ratingText: { fontSize: 11, fontWeight: '700', color: '#FCD34D' },
  verifyText: { fontSize: 11, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statVal: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingBottom: 8, paddingTop: 8, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: RADIUS.md,
    alignItems: 'center', backgroundColor: '#F1F5F9',
  },
  tabActive: { backgroundColor: '#EFF6FF' },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#2563EB', fontWeight: '700' },
  ctaBar: {
    flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 28,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
    ...SHADOWS.md,
  },
  ctaPhone: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaPrimary: {
    flex: 1, height: 48, borderRadius: RADIUS.md,
    backgroundColor: '#2563EB', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaPrimaryText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

const ov = StyleSheet.create({
  root: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: '#EFF6FF', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  chipText: { fontSize: 11, fontWeight: '600', color: '#1D4ED8' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', width: 60 },
  rowValue: { fontSize: 12, color: '#1E293B', fontWeight: '500', flex: 1 },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  certText: { fontSize: 12, color: '#6D28D9', fontWeight: '600' },
  about: { fontSize: 13, color: '#334155', lineHeight: 20 },
});

const pt = StyleSheet.create({
  root: { padding: 12, gap: 10 },
  chips: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  chipTextActive: { color: '#2563EB' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  desc: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  price: { fontSize: 16, fontWeight: '900', color: '#2563EB' },
  mrp: { fontSize: 11, color: COLORS.textMuted, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaPill: { backgroundColor: '#F8FAFC', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#E2E8F0' },
  metaPillText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  stockBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  specs: { backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, padding: 8, gap: 3 },
  specItem: { fontSize: 11, color: '#64748B' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
});

// ── Reliability Tab ───────────────────────────────────────────────────────────

const TIER_CONFIG = {
  EXCELLENT: { color: '#059669', bg: '#ECFDF5', label: 'Excellent' },
  GOOD:      { color: '#2563EB', bg: '#EFF6FF', label: 'Good' },
  AVERAGE:   { color: '#D97706', bg: '#FFFBEB', label: 'Average' },
  POOR:      { color: '#DC2626', bg: '#FEF2F2', label: 'Poor' },
};

const EVENT_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  DELIVERY_ON_TIME: { emoji: '✅', label: 'Delivered On Time',  color: '#059669' },
  DELIVERY_LATE:    { emoji: '🕐', label: 'Delivered Late',     color: '#D97706' },
  DELIVERY_PARTIAL: { emoji: '📦', label: 'Partial Delivery',   color: '#7C3AED' },
  DELIVERY_FAILED:  { emoji: '❌', label: 'Delivery Failed',    color: '#DC2626' },
  QUALITY_RATING:   { emoji: '⭐', label: 'Quality Rating',     color: '#F59E0B' },
  QUOTE_RESPONSE:   { emoji: '📋', label: 'Quote Responded',    color: '#2563EB' },
};

function ReliabilityTab({ score, events, loading, supplierId, onRecord }: {
  score: SupplierReliabilityScore | null;
  events: SupplierPerformanceEvent[];
  loading: boolean;
  supplierId: number;
  onRecord: () => void;
}) {
  const tier = (score?.tier ?? 'POOR') as keyof typeof TIER_CONFIG;
  const cfg = TIER_CONFIG[tier];
  const s = score?.reliabilityScore ?? 0;

  return (
    <View style={rt.root}>
      {/* Score Gauge */}
      {score && score.totalDeliveries > 0 ? (
        <>
          <View style={rt.scoreCard}>
            <View style={[rt.scoreBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[rt.scoreNum, { color: cfg.color }]}>{s.toFixed(0)}</Text>
              <Text style={[rt.scoreTier, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <View style={rt.scoreMetrics}>
              <ScoreMetric label="On-Time Rate"    val={`${score.onTimeRate}%`}    color="#059669" />
              <ScoreMetric label="Fulfillment"     val={`${score.fulfillmentRate}%`} color="#2563EB" />
              <ScoreMetric label="Quality Score"   val={score.avgQualityScore > 0 ? `${score.avgQualityScore}/5` : '—'} color="#F59E0B" />
              <ScoreMetric label="Total Deliveries" val={String(score.totalDeliveries)} color="#64748B" />
            </View>
          </View>

          {/* Score bar */}
          <View style={rt.barWrap}>
            <View style={[rt.barFill, { width: `${s}%`, backgroundColor: cfg.color }]} />
          </View>

          {/* Event timeline */}
          {events.length > 0 && (
            <View style={rt.section}>
              <Text style={rt.sectionTitle}>Performance History</Text>
              {events.slice(0, 10).map(ev => {
                const ec = EVENT_CONFIG[ev.eventType] ?? { emoji: '📌', label: ev.eventType, color: '#64748B' };
                return (
                  <View key={ev.id} style={rt.eventRow}>
                    <Text style={rt.eventEmoji}>{ec.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[rt.eventLabel, { color: ec.color }]}>{ec.label}</Text>
                      {ev.eventType === 'QUALITY_RATING' && ev.numericValue && (
                        <Text style={rt.eventSub}>Rated {ev.numericValue}/5</Text>
                      )}
                      {ev.notes && <Text style={rt.eventSub} numberOfLines={1}>{ev.notes}</Text>}
                    </View>
                    <Text style={rt.eventDate}>
                      {new Date(ev.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      ) : (
        <View style={rt.empty}>
          <Text style={rt.emptyIcon}>📊</Text>
          <Text style={rt.emptyTitle}>No performance data yet</Text>
          <Text style={rt.emptySub}>Record a delivery outcome after receiving goods from this supplier</Text>
        </View>
      )}

      <TouchableOpacity style={rt.recordBtn} onPress={onRecord}>
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={rt.recordBtnText}>Record Delivery Outcome</Text>
      </TouchableOpacity>
    </View>
  );
}

function ScoreMetric({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <View style={rt.metric}>
      <Text style={[rt.metricVal, { color }]}>{val}</Text>
      <Text style={rt.metricLabel}>{label}</Text>
    </View>
  );
}

const rt = StyleSheet.create({
  root: { padding: 12, gap: 12 },
  scoreCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  scoreBadge: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  scoreNum: { fontSize: 26, fontWeight: '900' },
  scoreTier: { fontSize: 10, fontWeight: '800' },
  scoreMetrics: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { width: '45%' },
  metricVal: { fontSize: 16, fontWeight: '900' },
  metricLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 1 },
  barWrap: {
    height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  section: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  eventEmoji: { fontSize: 16, width: 24 },
  eventLabel: { fontSize: 13, fontWeight: '700' },
  eventSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  eventDate: { fontSize: 11, color: COLORS.textMuted },
  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 24 },
  recordBtn: {
    backgroundColor: '#2563EB', borderRadius: RADIUS.md, height: 46,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  recordBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
