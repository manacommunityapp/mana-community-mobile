import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { ProcurementRFQ, PurchaseOrder } from '@/types/procurement';

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#059669', DRAFT: '#6B7280', QUOTES_RECEIVED: '#0284C7',
  COMPARING: '#D97706', AWARDED: '#7C3AED', CANCELLED: '#DC2626',
  SENT: '#2563EB', ACKNOWLEDGED: '#059669', FULFILLED: '#166534', PARTIAL: '#D97706',
};

const QUICK_ACTIONS = [
  { emoji: '📋', label: 'New RFQ',         color: '#2563EB', bg: '#EFF6FF', route: '/procurement/rfq/new' },
  { emoji: '🏭', label: 'Suppliers',       color: '#059669', bg: '#ECFDF5', route: '/procurement/supplier-marketplace' },
  { emoji: '📦', label: 'Purchase Orders', color: '#7C3AED', bg: '#F5F3FF', route: '/procurement/purchase-orders' },
  { emoji: '🏢', label: 'Association',     color: '#D97706', bg: '#FFFBEB', route: '/procurement/association' },
  { emoji: '📊', label: 'Analytics',       color: '#0284C7', bg: '#E0F2FE', route: '/procurement/analytics' },
  { emoji: '👥', label: 'Manage Suppliers',color: '#374151', bg: '#F3F4F6', route: '/procurement/manage-suppliers' },
  { emoji: '🏦', label: 'Finance',          color: '#0F766E', bg: '#F0FDFA', route: '/procurement/finance' },
  { emoji: '🛒', label: 'BulkBuy',          color: '#7C3AED', bg: '#F5F3FF', route: '/procurement/bulkbuy/index' },
] as const;

const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  CLEANING_SUPPLIES: { icon: '🧹', color: '#0284C7', bg: '#E0F2FE' },
  ELECTRICAL:        { icon: '⚡', color: '#D97706', bg: '#FEF3C7' },
  PLUMBING:          { icon: '🔧', color: '#059669', bg: '#ECFDF5' },
  OFFICE_SUPPLIES:   { icon: '📎', color: '#6366F1', bg: '#EEF2FF' },
  GARDENING:         { icon: '🌿', color: '#16A34A', bg: '#DCFCE7' },
  SECURITY_EQUIPMENT:{ icon: '🔒', color: '#DC2626', bg: '#FEF2F2' },
  FURNITURE:         { icon: '🪑', color: '#92400E', bg: '#FEF3C7' },
  IT_EQUIPMENT:      { icon: '💻', color: '#4F46E5', bg: '#EEF2FF' },
  FOOD_BEVERAGE:     { icon: '🍽️', color: '#EA580C', bg: '#FFF7ED' },
  MAINTENANCE:       { icon: '🔨', color: '#374151', bg: '#F3F4F6' },
  OTHER:             { icon: '📦', color: '#6B7280', bg: '#F9FAFB' },
};

function rfqStatusLabel(s: string) {
  return s.replace(/_/g, ' ');
}

function poStatusLabel(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');
}

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function ProcurementHub() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['procurement-stats'],
    queryFn: procurementHubService.getProcurementStats,
  });
  const { data: rfqs = [], isLoading: loadingRFQs, refetch: refetchRFQs } = useQuery({
    queryKey: ['procurement-rfqs'],
    queryFn: () => procurementHubService.getRFQs(),
  });
  const { data: pos = [], refetch: refetchPOs } = useQuery({
    queryKey: ['procurement-pos'],
    queryFn: () => procurementHubService.getPurchaseOrders(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchRFQs(), refetchPOs()]);
    setRefreshing(false);
  }, [refetchStats, refetchRFQs, refetchPOs]);

  const activeRFQs = rfqs.filter(r => ['OPEN', 'QUOTES_RECEIVED', 'COMPARING'].includes(r.status));
  const recentPOs = pos.slice(0, 3);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A5F']} tintColor="#1E3A5F" />}
    >
      {/* ── Header ── */}
      <LinearGradient
        colors={['#0F2744', '#1E3A5F', '#2563EB']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerTop}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/tabs/feed')}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>🏭 Procurement Hub</Text>
            <Text style={s.headerSub}>RFQ · Suppliers · Purchase Orders</Text>
          </View>
          <TouchableOpacity style={s.backBtn} onPress={() => router.push('/procurement/rfq/new' as any)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        {stats && (
          <View style={s.statsStrip}>
            {[
              { label: 'Active RFQs',    value: String(stats.activeRFQs),    icon: 'document-text' as const },
              { label: 'Total POs',      value: String(stats.totalPOs),      icon: 'cube' as const },
              { label: 'Suppliers',      value: String(stats.activeSuppliers),icon: 'business' as const },
              { label: 'Savings',        value: fmt(stats.totalSavings),     icon: 'trending-down' as const },
            ].map(st => (
              <View key={st.label} style={s.statItem}>
                <Ionicons name={st.icon} size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.statVal}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* ── Quick Actions ── */}
      <View style={s.section}>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map(a => (
            <TouchableOpacity key={a.route} style={s.quickItem} onPress={() => router.push(a.route as any)} activeOpacity={0.8}>
              <View style={[s.quickIcon, { backgroundColor: a.bg }]}>
                <Text style={s.quickEmoji}>{a.emoji}</Text>
              </View>
              <Text style={s.quickLabel} numberOfLines={2}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Active RFQs ── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Active RFQs</Text>
          <TouchableOpacity onPress={() => router.push('/procurement/rfq/new' as any)}>
            <Text style={s.seeAll}>+ New</Text>
          </TouchableOpacity>
        </View>
        {loadingRFQs && <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />}
        {!loadingRFQs && activeRFQs.length === 0 && (
          <TouchableOpacity style={s.emptyCard} onPress={() => router.push('/procurement/rfq/new' as any)}>
            <Ionicons name="document-text-outline" size={28} color="#93C5FD" />
            <Text style={s.emptyCardTitle}>No active RFQs</Text>
            <Text style={s.emptyCardSub}>Tap to create your first Request for Quotation</Text>
          </TouchableOpacity>
        )}
        {activeRFQs.map(rfq => <RFQCard key={rfq.id} rfq={rfq} onPress={() => router.push((`/procurement/rfq/${rfq.id}`) as any)} />)}
        {rfqs.length > 3 && (
          <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push('/procurement/rfq/new' as any)}>
            <Text style={s.viewAllText}>View all {rfqs.length} RFQs</Text>
            <Ionicons name="chevron-forward" size={14} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Recent Purchase Orders ── */}
      {recentPOs.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/procurement/purchase-orders' as any)}>
              <Text style={s.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          {recentPOs.map(po => <POCard key={po.id} po={po} onPress={() => router.push('/procurement/purchase-orders' as any)} />)}
        </View>
      )}

      {/* ── Category Grid ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Browse by Category</Text>
        <View style={s.categoryGrid}>
          {Object.entries(CATEGORY_ICONS).map(([key, cfg]) => (
            <TouchableOpacity
              key={key}
              style={s.catItem}
              onPress={() => router.push((`/procurement/supplier-marketplace?category=${key}`) as any)}
              activeOpacity={0.75}
            >
              <View style={[s.catIcon, { backgroundColor: cfg.bg }]}>
                <Text style={s.catEmoji}>{cfg.icon}</Text>
              </View>
              <Text style={s.catLabel} numberOfLines={2}>
                {key.replace(/_/g, '\n')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Tip Card ── */}
      <View style={[s.section, { marginBottom: 32 }]}>
        <View style={s.tipCard}>
          <Ionicons name="bulb-outline" size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <Text style={s.tipTitle}>Save up to 30% with RFQs</Text>
            <Text style={s.tipSub}>
              Getting 3+ quotes on every purchase can cut costs significantly.
              Start by creating an RFQ for your next bulk requirement.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function RFQCard({ rfq, onPress }: { rfq: ProcurementRFQ; onPress: () => void }) {
  const color = STATUS_COLORS[rfq.status] || '#6B7280';
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(rfq.quotationDeadline).getTime() - Date.now()) / 86400000,
  ));
  return (
    <TouchableOpacity style={s.rfqCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.rfqTop}>
        <Text style={s.rfqNumber}>{rfq.rfqNumber}</Text>
        <View style={[s.statusBadge, { backgroundColor: color + '18' }]}>
          <View style={[s.statusDot, { backgroundColor: color }]} />
          <Text style={[s.statusText, { color }]}>{rfqStatusLabel(rfq.status)}</Text>
        </View>
      </View>
      <Text style={s.rfqTitle} numberOfLines={1}>{rfq.title}</Text>
      <View style={s.rfqMeta}>
        <View style={s.metaItem}>
          <Ionicons name="list-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.metaText}>{rfq.items.length} item{rfq.items.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="chatbubbles-outline" size={12} color={COLORS.textMuted} />
          <Text style={s.metaText}>{rfq.quotesReceived} quotes</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="time-outline" size={12} color={daysLeft <= 2 ? '#DC2626' : COLORS.textMuted} />
          <Text style={[s.metaText, daysLeft <= 2 && { color: '#DC2626', fontWeight: '700' }]}>
            {daysLeft}d left
          </Text>
        </View>
      </View>
      {rfq.estimatedValue ? (
        <Text style={s.rfqValue}>Est. value: ₹{rfq.estimatedValue.toLocaleString()}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

function POCard({ po, onPress }: { po: PurchaseOrder; onPress: () => void }) {
  const color = STATUS_COLORS[po.status] || '#6B7280';
  return (
    <TouchableOpacity style={s.poCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.poRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.poNumber}>{po.poNumber}</Text>
          <Text style={s.poSupplier} numberOfLines={1}>{po.supplierName}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={s.poAmount}>₹{po.grandTotal.toLocaleString()}</Text>
          <View style={[s.statusBadge, { backgroundColor: color + '18' }]}>
            <View style={[s.statusDot, { backgroundColor: color }]} />
            <Text style={[s.statusText, { color }]}>{poStatusLabel(po.status)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { paddingBottom: 32 },

  header: { padding: 14, paddingTop: 12, gap: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  statsStrip: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md, paddingVertical: 8,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textAlign: 'center' },

  section: { paddingHorizontal: 12, paddingTop: 16, gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  seeAll: { fontSize: 12, fontWeight: '700', color: '#2563EB' },

  quickGrid: { flexDirection: 'row', gap: 8 },
  quickItem: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickEmoji: { fontSize: 18 },
  quickLabel: { fontSize: 9, fontWeight: '700', color: '#374151', textAlign: 'center' },

  rfqCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  rfqTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rfqNumber: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  rfqTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  rfqMeta: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  rfqValue: { fontSize: 11, color: '#059669', fontWeight: '700' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },

  poCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  poRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  poNumber: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  poSupplier: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginTop: 2 },
  poAmount: { fontSize: 14, fontWeight: '800', color: '#1E293B' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catItem: {
    width: '21%', flexGrow: 1, alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: RADIUS.md, paddingVertical: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 17 },
  catLabel: { fontSize: 8, fontWeight: '700', color: '#374151', textAlign: 'center' },

  emptyCard: {
    backgroundColor: '#EFF6FF', borderRadius: RADIUS.lg, padding: 24,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#BFDBFE',
    borderStyle: 'dashed',
  },
  emptyCardTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF' },
  emptyCardSub: { fontSize: 12, color: '#3B82F6', textAlign: 'center' },

  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderRadius: RADIUS.md, padding: 10,
  },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },

  tipCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.lg, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  tipSub: { fontSize: 11, color: '#78350F', lineHeight: 16 },
});
