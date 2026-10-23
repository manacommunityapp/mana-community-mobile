import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { BulkBuyCampaign } from '@/types/procurement';

const PROCUREMENT_CATEGORIES = [
  {
    title: 'Common Area Maintenance',
    emoji: '🏢',
    color: '#2563EB',
    bg: '#EFF6FF',
    category: 'CLEANING_SUPPLIES',
    items: ['Floor cleaning liquid', 'Toilet fresheners', 'Garbage bags', 'Mops & brooms', 'Phenyl'],
  },
  {
    title: 'Electrical & Plumbing',
    emoji: '⚡',
    color: '#D97706',
    bg: '#FFFBEB',
    category: 'ELECTRICAL',
    items: ['LED bulbs', 'MCB switches', 'PVC pipes', 'Water pump parts', 'Cable wires'],
  },
  {
    title: 'Gardening & Landscaping',
    emoji: '🌿',
    color: '#059669',
    bg: '#ECFDF5',
    category: 'GARDENING',
    items: ['Fertilizers', 'Plant pots', 'Garden soil', 'Seeds & plants', 'Garden tools'],
  },
  {
    title: 'Security Equipment',
    emoji: '🔒',
    color: '#DC2626',
    bg: '#FEF2F2',
    category: 'SECURITY_EQUIPMENT',
    items: ['CCTV cameras', 'Access cards', 'Visitor management', 'Barriers', 'Intercom parts'],
  },
  {
    title: 'Office Supplies',
    emoji: '📎',
    color: '#6366F1',
    bg: '#EEF2FF',
    category: 'OFFICE_SUPPLIES',
    items: ['Printer paper', 'Ink cartridges', 'Stationery', 'Files & folders', 'Stamps'],
  },
  {
    title: 'Repair & Services',
    emoji: '🔨',
    color: '#374151',
    bg: '#F3F4F6',
    category: 'MAINTENANCE',
    items: ['Painting services', 'Plumber visits', 'Electrician AMC', 'Lift maintenance', 'Pest control'],
  },
];

const QUICK_TEMPLATES = [
  { label: 'Monthly Cleaning',     emoji: '🧹', description: 'Floor cleaner, phenyl, toilet fresheners, garbage bags', id: 'monthly-cleaning' },
  { label: 'Quarterly Electrical', emoji: '⚡', description: 'LED replacements, switches, cable wire, MCBs', id: 'quarterly-electrical' },
  { label: 'Annual Maintenance',   emoji: '🏢', description: 'Painting, plumbing, lift servicing, pest control', id: 'annual-maintenance' },
  { label: 'Festival Setup',       emoji: '🎉', description: 'Decorations, lighting, sound equipment, banners', id: 'festival-setup' },
];

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function AssociationProcurement() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['procurement-stats'],
    queryFn: procurementHubService.getProcurementStats,
  });

  const { data: rfqs = [], refetch: refetchRFQs } = useQuery({
    queryKey: ['procurement-rfqs'],
    queryFn: () => procurementHubService.getRFQs(),
  });

  const { data: pos = [], refetch: refetchPOs } = useQuery({
    queryKey: ['procurement-pos'],
    queryFn: () => procurementHubService.getPurchaseOrders(),
  });

  const { data: activeCampaigns = [], refetch: refetchCampaigns } = useQuery({
    queryKey: ['bulkbuy-campaigns', 'ACTIVE'],
    queryFn: () => procurementHubService.getBulkBuyCampaigns('ACTIVE'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchRFQs(), refetchPOs(), refetchCampaigns()]);
    setRefreshing(false);
  }, [refetchStats, refetchRFQs, refetchPOs, refetchCampaigns]);

  const totalSpend = pos
    .filter(p => p.status === 'FULFILLED')
    .reduce((sum, p) => sum + p.grandTotal, 0);

  const pendingPOs = pos.filter(p => ['SENT', 'ACKNOWLEDGED', 'PARTIAL'].includes(p.status));
  const openRFQs = rfqs.filter(r => ['OPEN', 'QUOTES_RECEIVED', 'COMPARING'].includes(r.status));

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A5F']} tintColor="#1E3A5F" />}
    >
      {/* Dashboard strip */}
      <View style={s.dashCard}>
        <Text style={s.dashTitle}>Association Procurement Dashboard</Text>
        <View style={s.dashGrid}>
          <DashStat icon="document-text" label="Active RFQs" value={String(openRFQs.length)} color="#2563EB" />
          <DashStat icon="cube" label="Pending POs" value={String(pendingPOs.length)} color="#D97706" />
          <DashStat icon="trending-up" label="Total Spend" value={fmt(totalSpend)} color="#059669" />
          {stats && <DashStat icon="business" label="Suppliers" value={String(stats.activeSuppliers)} color="#7C3AED" />}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionGrid}>
          <ActionCard
            emoji="📋" title="New RFQ" subtitle="Create purchase request"
            color="#2563EB" bg="#EFF6FF"
            onPress={() => router.push('/procurement/rfq/new' as any)}
          />
          <ActionCard
            emoji="📦" title="Purchase Orders" subtitle="Track deliveries"
            color="#7C3AED" bg="#F5F3FF"
            onPress={() => router.push('/procurement/purchase-orders' as any)}
          />
          <ActionCard
            emoji="🏭" title="Suppliers" subtitle="Find verified vendors"
            color="#059669" bg="#ECFDF5"
            onPress={() => router.push('/procurement/supplier-marketplace' as any)}
          />
          <ActionCard
            emoji="📊" title="Savings Report" subtitle="Spend analytics & savings"
            color="#D97706" bg="#FFFBEB"
            onPress={() => router.push('/procurement/analytics' as any)}
          />
          <ActionCard
            emoji="🏦" title="Finance" subtitle="Working capital loans"
            color="#0284C7" bg="#E0F2FE"
            onPress={() => router.push('/procurement/finance' as any)}
          />
          <ActionCard
            emoji="🛒" title="BulkBuy" subtitle="Pool demand for savings"
            color="#7C3AED" bg="#F5F3FF"
            onPress={() => router.push('/procurement/bulkbuy/index' as any)}
          />
        </View>
      </View>

      {/* Active BulkBuy Campaigns */}
      {activeCampaigns.length > 0 && (
        <View style={s.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.sectionTitle}>🛒 Active BulkBuy Campaigns</Text>
            <TouchableOpacity onPress={() => router.push('/procurement/bulkbuy/index' as any)}>
              <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '700' }}>View All →</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 6 }}>
            {activeCampaigns.slice(0, 3).map(c => (
              <BulkBuyTeaser
                key={c.id}
                campaign={c}
                onPress={() => router.push(`/procurement/bulkbuy/${c.id}` as any)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Quick templates */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick Templates</Text>
        <Text style={s.sectionSub}>Start an RFQ from a common procurement template</Text>
        <View style={s.templateList}>
          {QUICK_TEMPLATES.map(t => (
            <TouchableOpacity
              key={t.label}
              style={s.templateCard}
              onPress={() => router.push(`/procurement/rfq/new?template=${t.id}` as any)}
              activeOpacity={0.85}
            >
              <Text style={s.templateEmoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.templateTitle}>{t.label}</Text>
                <Text style={s.templateDesc} numberOfLines={1}>{t.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category grid */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Browse by Need</Text>
        {PROCUREMENT_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.title}
            style={s.catCard}
            onPress={() => router.push(`/procurement/rfq/new?category=${(cat as any).category ?? 'OTHER'}` as any)}
            activeOpacity={0.85}
          >
            <View style={[s.catIcon, { backgroundColor: cat.bg }]}>
              <Text style={s.catEmoji}>{cat.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.catTitle}>{cat.title}</Text>
              <Text style={s.catItems} numberOfLines={1}>{cat.items.join(' · ')}</Text>
            </View>
            <View style={[s.createBtn, { backgroundColor: cat.bg }]}>
              <Text style={[s.createBtnText, { color: cat.color }]}>Create RFQ</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pending POs alert */}
      {pendingPOs.length > 0 && (
        <View style={s.section}>
          <View style={s.alertCard}>
            <Ionicons name="alert-circle" size={20} color="#D97706" />
            <View style={{ flex: 1 }}>
              <Text style={s.alertTitle}>{pendingPOs.length} Purchase Order{pendingPOs.length > 1 ? 's' : ''} Pending</Text>
              <Text style={s.alertSub}>
                {pendingPOs.map(p => p.poNumber).join(', ')} awaiting goods receipt confirmation.
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/procurement/purchase-orders' as any)}>
              <Text style={s.alertAction}>View →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tips */}
      <View style={s.section}>
        <View style={s.tipBox}>
          <Text style={s.tipTitle}>💡 Best Practices</Text>
          <View style={s.tipList}>
            {[
              'Always get at least 3 quotes for purchases above ₹10,000',
              'Set clear specifications to avoid supplier confusion',
              'Include delivery deadline in every RFQ to track accountability',
              'Check supplier verification status before awarding',
              'Keep purchase records linked to society invoices for audit',
            ].map((tip, i) => (
              <View key={i} style={s.tipItem}>
                <View style={s.tipDot} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function DashStat({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={s.dashStat}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[s.dashStatVal, { color }]}>{value}</Text>
      <Text style={s.dashStatLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ emoji, title, subtitle, color, bg, onPress }: {
  emoji: string; title: string; subtitle: string; color: string; bg: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.actionCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.actionIcon, { backgroundColor: bg }]}>
        <Text style={s.actionEmoji}>{emoji}</Text>
      </View>
      <Text style={s.actionTitle}>{title}</Text>
      <Text style={s.actionSub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function BulkBuyTeaser({ campaign: c, onPress }: { campaign: BulkBuyCampaign; onPress: () => void }) {
  const progress = c.minOrderQuantity > 0
    ? Math.min(1, c.currentQuantity / c.minOrderQuantity)
    : 0;
  const pct = Math.round(progress * 100);
  const days = Math.max(0, Math.ceil((new Date(c.deadlineDate).getTime() - Date.now()) / 86400000));
  const isJoined = c.myCommitmentQuantity != null && c.myCommitmentQuantity > 0;

  return (
    <TouchableOpacity style={s.teaserCard} onPress={onPress} activeOpacity={0.85}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Text style={{ fontSize: 20 }}>🛒</Text>
        <Text style={s.teaserTitle} numberOfLines={1}>{c.title}</Text>
        <Text style={[s.teaserDays, days <= 2 && { color: '#DC2626' }]}>{days}d left</Text>
      </View>
      <View style={s.teaserBar}>
        <View style={[s.teaserFill, { width: `${pct}%` as any }]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
        <Text style={s.teaserSub}>{c.currentQuantity}/{c.minOrderQuantity} {c.unit}</Text>
        {isJoined
          ? <Text style={s.teaserJoined}>✓ Joined</Text>
          : <Text style={s.teaserJoin}>Join →</Text>
        }
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 12, gap: 12 },

  dashCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  dashTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  dashGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dashStat: {
    width: '45%', flexGrow: 1, alignItems: 'center', gap: 3,
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.md, paddingVertical: 12,
  },
  dashStatVal: { fontSize: 18, fontWeight: '900' },
  dashStatLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  sectionSub: { fontSize: 12, color: COLORS.textMuted },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionCard: {
    width: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 12, gap: 6, borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionEmoji: { fontSize: 18 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  actionSub: { fontSize: 10, color: COLORS.textMuted },

  templateList: { gap: 6 },
  templateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  templateEmoji: { fontSize: 22 },
  templateTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  templateDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  catCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...SHADOWS.sm,
  },
  catIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 18 },
  catTitle: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  catItems: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  createBtn: { borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 5 },
  createBtnText: { fontSize: 11, fontWeight: '700' },

  alertCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFFBEB', borderRadius: RADIUS.lg, padding: 12,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  alertSub: { fontSize: 11, color: '#78350F', marginTop: 2 },
  alertAction: { fontSize: 12, fontWeight: '700', color: '#D97706', marginTop: 2 },

  tipBox: {
    backgroundColor: '#F8FAFC', borderRadius: RADIUS.lg, padding: 14, gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  tipTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  tipList: { gap: 7 },
  tipItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#2563EB', marginTop: 5 },
  tipText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 17 },

  teaserCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  teaserTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#1E293B' },
  teaserDays: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  teaserBar: { height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  teaserFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 3 },
  teaserSub: { fontSize: 10, color: COLORS.textMuted },
  teaserJoined: { fontSize: 10, color: '#059669', fontWeight: '700' },
  teaserJoin: { fontSize: 10, color: '#2563EB', fontWeight: '700' },
});
