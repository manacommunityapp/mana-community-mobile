import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOWS } from '@/constants/config';
import procurementHubService from '@/services/procurementHubService';
import type { PurchaseCalendarEntry } from '@/types/procurement';

type Status = 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'SCHEDULED';

const FREQ_LABEL: Record<string, string> = {
  WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly',
  BIANNUAL: 'Bi-Annual', ANNUAL: 'Annual',
};

const CATEGORY_EMOJI: Record<string, string> = {
  CLEANING_SUPPLIES: '🧹', ELECTRICAL: '⚡', PLUMBING: '🔧',
  OFFICE_SUPPLIES: '📎', GARDENING: '🌿', SECURITY_EQUIPMENT: '🔒',
  FURNITURE: '🪑', IT_EQUIPMENT: '💻', FOOD_BEVERAGE: '🍽️',
  MAINTENANCE: '🔨', PACKAGING: '📦', OTHER: '📋',
};

const STATUS_CONFIG = {
  OVERDUE:   { label: 'Overdue',   bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#DC2626' },
  DUE_SOON:  { label: 'Due Soon',  bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B' },
  UPCOMING:  { label: 'Upcoming',  bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB', dot: '#3B82F6' },
  SCHEDULED: { label: 'Scheduled', bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', dot: '#94A3B8' },
};

function getStatus(nextDueDate: string): Status {
  const diff = new Date(nextDueDate).getTime() - Date.now();
  const days = diff / 86400000;
  if (days < 0)  return 'OVERDUE';
  if (days < 7)  return 'DUE_SOON';
  if (days < 30) return 'UPCOMING';
  return 'SCHEDULED';
}

function daysLabel(nextDueDate: string): string {
  const diff = new Date(nextDueDate).getTime() - Date.now();
  const days = Math.round(Math.abs(diff) / 86400000);
  if (diff < 0) return `${days}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `in ${days}d`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function PurchaseCalendar() {
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['calendar-entries'],
    queryFn: procurementHubService.getCalendarEntries,
  });

  const createRFQMutation = useMutation({
    mutationFn: (id: number) => procurementHubService.createRFQFromCalendar(id),
    onSuccess: (rfq, id) => {
      qc.invalidateQueries({ queryKey: ['calendar-entries'] });
      qc.invalidateQueries({ queryKey: ['rfqs'] });
      setCreating(null);
      Alert.alert(
        '✅ RFQ Created',
        `${rfq.rfqNumber} is now open for quotes. Quotation deadline: ${rfq.quotationDeadline}`,
        [
          { text: 'View RFQ', onPress: () => router.push(`/procurement/rfq/${rfq.id}` as any) },
          { text: 'Stay', style: 'cancel' },
        ],
      );
    },
    onError: () => { setCreating(null); Alert.alert('Error', 'Could not create RFQ.'); },
  });

  const deleteMutation = useMutation({
    mutationFn: procurementHubService.deleteCalendarEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['calendar-entries'] }),
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const overdue  = entries.filter(e => getStatus(e.nextDueDate) === 'OVERDUE');
  const dueSoon  = entries.filter(e => getStatus(e.nextDueDate) === 'DUE_SOON');
  const upcoming = entries.filter(e => getStatus(e.nextDueDate) === 'UPCOMING');
  const scheduled= entries.filter(e => getStatus(e.nextDueDate) === 'SCHEDULED');

  const needsAttention = [...overdue, ...dueSoon];
  const totalBudget = entries.reduce((s, e) => s + (e.estimatedBudget || 0), 0);

  function onCreateRFQ(entry: PurchaseCalendarEntry) {
    Alert.alert(
      `Create RFQ for "${entry.title}"?`,
      `Quotation deadline: 14 days\nDelivery deadline: 30 days\nEstimated: ₹${entry.estimatedBudget?.toLocaleString('en-IN') ?? '—'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create RFQ',
          onPress: () => {
            setCreating(entry.id);
            createRFQMutation.mutate(entry.id);
          },
        },
      ],
    );
  }

  function onDelete(entry: PurchaseCalendarEntry) {
    Alert.alert(`Remove "${entry.title}"?`, 'This will hide it from the schedule.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(entry.id) },
    ]);
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={['#065F46', '#059669']} style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Purchase Calendar</Text>
            <Text style={s.headerSub}>Recurring procurement schedule</Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => router.push('/procurement/calendar/new' as any)}
          >
            <Ionicons name="add" size={18} color="#059669" />
            <Text style={s.newBtnText}>Schedule</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <HeaderStat val={entries.length} label="Scheduled" />
          <HeaderStat val={needsAttention.length} label="Action Needed" accent />
          <HeaderStat val={upcoming.length} label="This Month" />
          <HeaderStat val={`₹${totalBudget > 0 ? (totalBudget / 1000).toFixed(0) + 'K' : '—'}`} label="Est. Budget" />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} tintColor="#059669" />}
      >
        {isLoading && <ActivityIndicator color="#059669" style={{ marginTop: 32 }} />}

        {!isLoading && entries.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyTitle}>No schedules yet</Text>
            <Text style={s.emptySub}>Add recurring procurements — cleaning, maintenance, pest control — to stay ahead</Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => router.push('/procurement/calendar/new' as any)}
            >
              <Text style={s.emptyBtnText}>Add from Template</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action needed section */}
        {needsAttention.length > 0 && (
          <Section title="⚠️ Action Needed" count={needsAttention.length} accent="#DC2626">
            {needsAttention.map(e => (
              <CalendarCard
                key={e.id} entry={e}
                creating={creating === e.id}
                onCreateRFQ={() => onCreateRFQ(e)}
                onEdit={() => router.push(`/procurement/calendar/new?id=${e.id}` as any)}
                onDelete={() => onDelete(e)}
              />
            ))}
          </Section>
        )}

        {/* This month */}
        {upcoming.length > 0 && (
          <Section title="📅 Coming Up" count={upcoming.length}>
            {upcoming.map(e => (
              <CalendarCard
                key={e.id} entry={e}
                creating={creating === e.id}
                onCreateRFQ={() => onCreateRFQ(e)}
                onEdit={() => router.push(`/procurement/calendar/new?id=${e.id}` as any)}
                onDelete={() => onDelete(e)}
              />
            ))}
          </Section>
        )}

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <Section title="🗓️ Scheduled" count={scheduled.length}>
            {scheduled.map(e => (
              <CalendarCard
                key={e.id} entry={e}
                creating={creating === e.id}
                onCreateRFQ={() => onCreateRFQ(e)}
                onEdit={() => router.push(`/procurement/calendar/new?id=${e.id}` as any)}
                onDelete={() => onDelete(e)}
              />
            ))}
          </Section>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeaderStat({ val, label, accent }: { val: string | number; label: string; accent?: boolean }) {
  return (
    <View style={s.headerStat}>
      <Text style={[s.headerStatVal, accent && s.headerStatValAccent]}>{val}</Text>
      <Text style={s.headerStatLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, count, accent, children }: {
  title: string; count: number; accent?: string; children: React.ReactNode;
}) {
  return (
    <View style={sec.root}>
      <View style={sec.header}>
        <Text style={[sec.title, accent ? { color: accent } : {}]}>{title}</Text>
        <View style={sec.countBadge}>
          <Text style={sec.countText}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function CalendarCard({ entry: e, creating, onCreateRFQ, onEdit, onDelete }: {
  entry: PurchaseCalendarEntry;
  creating: boolean;
  onCreateRFQ: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = getStatus(e.nextDueDate);
  const cfg = STATUS_CONFIG[status];

  return (
    <View style={[cc.card, { borderColor: cfg.border }]}>
      <View style={cc.top}>
        <View style={[cc.dot, { backgroundColor: cfg.dot }]} />
        <View style={{ flex: 1 }}>
          <View style={cc.nameRow}>
            <Text style={cc.emoji}>{CATEGORY_EMOJI[e.category] || '📋'}</Text>
            <Text style={cc.title} numberOfLines={1}>{e.title}</Text>
          </View>
          <View style={cc.metaRow}>
            <View style={cc.freqBadge}>
              <Text style={cc.freqText}>{FREQ_LABEL[e.frequency] || e.frequency}</Text>
            </View>
            <Text style={[cc.dueBadge, { color: cfg.text, backgroundColor: cfg.bg }]}>
              {daysLabel(e.nextDueDate)}
            </Text>
          </View>
        </View>
        <View style={cc.actions}>
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={cc.iconBtn}>
            <Ionicons name="pencil-outline" size={15} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={cc.iconBtn}>
            <Ionicons name="trash-outline" size={15} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={cc.details}>
        <DetailItem icon="calendar-outline" val={`Due ${fmtDate(e.nextDueDate)}`} />
        {e.quantity > 0 && <DetailItem icon="cube-outline" val={`${e.quantity} ${e.unit}`} />}
        {e.estimatedBudget && (
          <DetailItem icon="cash-outline" val={`₹${e.estimatedBudget.toLocaleString('en-IN')}`} accent />
        )}
      </View>

      {e.lastRfqDate && (
        <View style={cc.lastRfq}>
          <Ionicons name="checkmark-circle-outline" size={13} color="#059669" />
          <Text style={cc.lastRfqText}>Last RFQ: {fmtDate(e.lastRfqDate)}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[cc.createBtn, creating && { opacity: 0.6 }]}
        onPress={onCreateRFQ}
        disabled={creating}
      >
        {creating
          ? <ActivityIndicator size="small" color="#fff" />
          : <>
              <Ionicons name="document-text-outline" size={14} color="#fff" />
              <Text style={cc.createBtnText}>Create RFQ</Text>
            </>}
      </TouchableOpacity>
    </View>
  );
}

function DetailItem({ icon, val, accent }: { icon: string; val: string; accent?: boolean }) {
  return (
    <View style={cc.detailItem}>
      <Ionicons name={icon as any} size={11} color={accent ? '#059669' : '#94A3B8'} />
      <Text style={[cc.detailVal, accent && { color: '#059669', fontWeight: '700' }]}>{val}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { padding: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  newBtnText: { fontSize: 13, fontWeight: '800', color: '#059669' },
  statsRow: { flexDirection: 'row' },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatVal: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerStatValAccent: { color: '#FDE68A' },
  headerStatLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },
  list: { padding: 12, gap: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#059669', borderRadius: RADIUS.md,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const sec = StyleSheet.create({
  root: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 13, fontWeight: '800', color: '#334155' },
  countBadge: { backgroundColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
});

const cc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg, padding: 12, gap: 10,
    borderWidth: 1, ...SHADOWS.sm,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emoji: { fontSize: 16 },
  title: { fontSize: 14, fontWeight: '800', color: '#1E293B', flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  freqBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  freqText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  dueBadge: { fontSize: 10, fontWeight: '800', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 4 },
  details: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailVal: { fontSize: 11, color: '#64748B' },
  lastRfq: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FDF4', borderRadius: RADIUS.md, padding: 6,
  },
  lastRfqText: { fontSize: 11, color: '#065F46', fontWeight: '600' },
  createBtn: {
    backgroundColor: '#059669', borderRadius: RADIUS.md, height: 38,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  createBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
