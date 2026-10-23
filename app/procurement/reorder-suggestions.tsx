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
import type { ReorderSuggestion, ReorderUrgency } from '@/types/procurement';

const URGENCY_CONFIG: Record<ReorderUrgency, { label: string; bg: string; border: string; text: string; dot: string }> = {
  OVERDUE:  { label: 'Overdue',  bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', dot: '#DC2626' },
  URGENT:   { label: 'Urgent',   bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', dot: '#F97316' },
  DUE_SOON: { label: 'Due Soon', bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', dot: '#F59E0B' },
  UPCOMING: { label: 'Upcoming', bg: '#F0FDF4', border: '#BBF7D0', text: '#059669', dot: '#34D399' },
};

const CATEGORY_EMOJI: Record<string, string> = {
  CLEANING_SUPPLIES: '🧹', ELECTRICAL: '⚡', PLUMBING: '🔧',
  OFFICE_SUPPLIES: '📎', GARDENING: '🌿', SECURITY_EQUIPMENT: '🔒',
  FURNITURE: '🪑', IT_EQUIPMENT: '💻', FOOD_BEVERAGE: '🍽️',
  MAINTENANCE: '🔨', PACKAGING: '📦', OTHER: '🏷️',
};

const FREQ_LABEL: Record<string, string> = {
  WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly',
  BIANNUAL: 'Bi-Annual', ANNUAL: 'Annual',
};

function daysLabel(nextDueDate: string): string {
  const diff = new Date(nextDueDate).getTime() - Date.now();
  const days = Math.round(Math.abs(diff) / 86400000);
  if (diff < 0) return `${days}d overdue`;
  if (days === 0) return 'Due today';
  return `Due in ${days}d`;
}

export default function ReorderSuggestions() {
  const router = useRouter();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);

  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ['reorder-suggestions'],
    queryFn: procurementHubService.getReorderSuggestions,
  });

  const createRFQMutation = useMutation({
    mutationFn: (id: number) => procurementHubService.createRFQFromCalendar(id),
    onSuccess: (rfq, id) => {
      setCreating(null);
      qc.invalidateQueries({ queryKey: ['reorder-suggestions'] });
      qc.invalidateQueries({ queryKey: ['rfqs'] });
      Alert.alert('✅ RFQ Created', `${rfq.rfqNumber} is ready for quotes.`, [
        { text: 'View RFQ', onPress: () => router.push(`/procurement/rfq/${rfq.id}` as any) },
        { text: 'Stay', style: 'cancel' },
      ]);
    },
    onError: () => { setCreating(null); Alert.alert('Error', 'Could not create RFQ.'); },
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const overdue  = suggestions.filter(s => s.urgency === 'OVERDUE');
  const urgent   = suggestions.filter(s => s.urgency === 'URGENT');
  const dueSoon  = suggestions.filter(s => s.urgency === 'DUE_SOON');
  const upcoming = suggestions.filter(s => s.urgency === 'UPCOMING');

  const actionNeeded = overdue.length + urgent.length;

  return (
    <View style={st.root}>
      <LinearGradient colors={['#7C2D12', '#C2410C']} style={st.header}>
        <View style={st.headerRow}>
          <View>
            <Text style={st.headerTitle}>Smart Reorder</Text>
            <Text style={st.headerSub}>AI-powered replenishment reminders</Text>
          </View>
          <TouchableOpacity
            style={st.buddyBtn}
            onPress={() => router.push('/procurement/mana-buddy' as any)}
          >
            <Text style={st.buddyBtnText}>🤖 Buddy</Text>
          </TouchableOpacity>
        </View>
        <View style={st.statsRow}>
          <HeaderStat val={suggestions.length}  label="Scheduled" />
          <HeaderStat val={actionNeeded}         label="Action Needed" accent={actionNeeded > 0} />
          <HeaderStat val={overdue.length}       label="Overdue"    accent={overdue.length > 0} />
          <HeaderStat val={upcoming.length}      label="Upcoming" />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={st.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#C2410C']} />}
      >
        {isLoading && <ActivityIndicator color="#C2410C" style={{ marginTop: 32 }} />}

        {!isLoading && suggestions.length === 0 && (
          <View style={st.empty}>
            <Text style={st.emptyIcon}>🔄</Text>
            <Text style={st.emptyTitle}>No reorder items yet</Text>
            <Text style={st.emptySub}>Add recurring items to the Purchase Calendar and they'll appear here with smart reminders</Text>
            <TouchableOpacity
              style={st.emptyBtn}
              onPress={() => router.push('/procurement/calendar/new' as any)}
            >
              <Text style={st.emptyBtnText}>Add to Calendar</Text>
            </TouchableOpacity>
          </View>
        )}

        {overdue.length > 0 && (
          <Section title="🚨 Overdue" count={overdue.length} color="#DC2626">
            {overdue.map(s => <SuggestionCard key={s.calendarEntryId} item={s} creating={creating === s.calendarEntryId} onCreate={() => { setCreating(s.calendarEntryId); createRFQMutation.mutate(s.calendarEntryId); }} />)}
          </Section>
        )}

        {urgent.length > 0 && (
          <Section title="⚡ Urgent — Order This Week" count={urgent.length} color="#C2410C">
            {urgent.map(s => <SuggestionCard key={s.calendarEntryId} item={s} creating={creating === s.calendarEntryId} onCreate={() => { setCreating(s.calendarEntryId); createRFQMutation.mutate(s.calendarEntryId); }} />)}
          </Section>
        )}

        {dueSoon.length > 0 && (
          <Section title="📅 Due Soon — Next 3 Weeks" count={dueSoon.length} color="#D97706">
            {dueSoon.map(s => <SuggestionCard key={s.calendarEntryId} item={s} creating={creating === s.calendarEntryId} onCreate={() => { setCreating(s.calendarEntryId); createRFQMutation.mutate(s.calendarEntryId); }} />)}
          </Section>
        )}

        {upcoming.length > 0 && (
          <Section title="🗓️ Upcoming" count={upcoming.length}>
            {upcoming.map(s => <SuggestionCard key={s.calendarEntryId} item={s} creating={creating === s.calendarEntryId} onCreate={() => { setCreating(s.calendarEntryId); createRFQMutation.mutate(s.calendarEntryId); }} />)}
          </Section>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function HeaderStat({ val, label, accent }: { val: number; label: string; accent?: boolean }) {
  return (
    <View style={st.stat}>
      <Text style={[st.statVal, accent && st.statValAccent]}>{val}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, count, color, children }: { title: string; count: number; color?: string; children: React.ReactNode }) {
  return (
    <View style={sec.root}>
      <View style={sec.header}>
        <Text style={[sec.title, color ? { color } : {}]}>{title}</Text>
        <View style={sec.badge}>
          <Text style={sec.badgeText}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function SuggestionCard({ item: s, creating, onCreate }: {
  item: ReorderSuggestion; creating: boolean; onCreate: () => void;
}) {
  const cfg = URGENCY_CONFIG[s.urgency];
  return (
    <View style={[card.root, { borderColor: cfg.border }]}>
      <View style={card.top}>
        <View style={[card.dot, { backgroundColor: cfg.dot }]} />
        <View style={{ flex: 1 }}>
          <View style={card.nameRow}>
            <Text style={card.emoji}>{CATEGORY_EMOJI[s.category] || '📋'}</Text>
            <Text style={card.title} numberOfLines={1}>{s.title}</Text>
          </View>
          <View style={card.metaRow}>
            <View style={card.freqBadge}>
              <Text style={card.freqText}>{FREQ_LABEL[s.frequency] || s.frequency}</Text>
            </View>
            <Text style={[card.urgencyText, { color: cfg.text, backgroundColor: cfg.bg }]}>
              {daysLabel(s.nextDueDate)}
            </Text>
          </View>
        </View>
      </View>

      <View style={card.details}>
        <Detail icon="cube-outline" val={`${s.quantity} ${s.unit}`} />
        {s.estimatedBudget ? (
          <Detail icon="cash-outline" val={`₹${s.estimatedBudget.toLocaleString('en-IN')}`} accent />
        ) : null}
        {s.lastRfqDate ? (
          <Detail icon="checkmark-circle-outline" val={`Last ordered ${s.daysSinceLastOrder}d ago`} />
        ) : (
          <Detail icon="alert-circle-outline" val="Never ordered" />
        )}
      </View>

      <TouchableOpacity
        style={[card.btn, creating && { opacity: 0.6 }]}
        onPress={onCreate}
        disabled={creating}
      >
        {creating
          ? <ActivityIndicator size="small" color="#fff" />
          : <>
              <Ionicons name="document-text-outline" size={14} color="#fff" />
              <Text style={card.btnText}>Create RFQ Now</Text>
            </>}
      </TouchableOpacity>
    </View>
  );
}

function Detail({ icon, val, accent }: { icon: string; val: string; accent?: boolean }) {
  return (
    <View style={card.detailItem}>
      <Ionicons name={icon as any} size={11} color={accent ? '#C2410C' : '#94A3B8'} />
      <Text style={[card.detailVal, accent && { color: '#C2410C', fontWeight: '700' }]}>{val}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { padding: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  buddyBtn: { backgroundColor: '#fff', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7 },
  buddyBtnText: { fontSize: 13, fontWeight: '800', color: '#C2410C' },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900', color: '#fff' },
  statValAccent: { color: '#FED7AA' },
  statLabel: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 2 },
  list: { padding: 12, gap: 14 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptySub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: {
    marginTop: 8, backgroundColor: '#C2410C', borderRadius: RADIUS.md,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const sec = StyleSheet.create({
  root: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 13, fontWeight: '800', color: '#334155' },
  badge: { backgroundColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
});

const card = StyleSheet.create({
  root: {
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
  urgencyText: { fontSize: 10, fontWeight: '800', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  details: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailVal: { fontSize: 11, color: '#64748B' },
  btn: {
    backgroundColor: '#C2410C', borderRadius: RADIUS.md, height: 38,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});
