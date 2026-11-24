import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { THEME } from '@/constants/theme';
import {
  broadcastService,
  Broadcast,
  BroadcastCategory,
  BroadcastPriority,
  BroadcastTarget,
  SendBroadcastRequest,
} from '@/services/broadcastService';

const CATEGORY_META: Record<BroadcastCategory, { label: string; emoji: string; color: string; bg: string }> = {
  WATER:       { label: 'Water',       emoji: '💧', color: '#2563EB', bg: '#DBEAFE' },
  POWER:       { label: 'Power',       emoji: '⚡', color: '#D97706', bg: '#FEF3C7' },
  SECURITY:    { label: 'Security',    emoji: '🔒', color: '#DC2626', bg: '#FEE2E2' },
  MAINTENANCE: { label: 'Maintenance', emoji: '🔧', color: '#6B7280', bg: '#F3F4F6' },
  EMERGENCY:   { label: 'Emergency',   emoji: '🚨', color: '#DC2626', bg: '#FEE2E2' },
  GENERAL:     { label: 'General',     emoji: '📢', color: COLORS.primary, bg: '#EEF2FF' },
};

const PRIORITY_META: Record<BroadcastPriority, { label: string; color: string; bg: string }> = {
  LOW:      { label: 'Low',      color: '#059669', bg: '#D1FAE5' },
  MEDIUM:   { label: 'Medium',   color: '#D97706', bg: '#FEF3C7' },
  HIGH:     { label: 'High',     color: '#EA580C', bg: '#FFEDD5' },
  CRITICAL: { label: 'Critical', color: '#DC2626', bg: '#FEE2E2' },
};

const TARGET_OPTIONS: { value: BroadcastTarget; label: string }[] = [
  { value: 'ALL',          label: 'All Residents' },
  { value: 'BLOCK_A',      label: 'Block A' },
  { value: 'BLOCK_B',      label: 'Block B' },
  { value: 'BLOCK_C',      label: 'Block C' },
  { value: 'OWNERS_ONLY',  label: 'Owners Only' },
  { value: 'TENANTS_ONLY', label: 'Tenants Only' },
];

const TARGET_REACH: Record<BroadcastTarget, number> = {
  ALL: 240, BLOCK_A: 80, BLOCK_B: 80, BLOCK_C: 80, OWNERS_ONLY: 140, TENANTS_ONLY: 100,
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function BroadcastScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SendBroadcastRequest>({
    title: '',
    message: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    target: 'ALL',
  });
  const [confirmSend, setConfirmSend] = useState(false);
  const [formErr, setFormErr] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  const { data: rawHistory, isLoading } = useQuery<Broadcast[]>({
    queryKey: ['admin', 'broadcasts'],
    queryFn: () => broadcastService.getBroadcastHistory(),
    staleTime: 30_000,
  });
  const history = rawHistory ?? [];

  const sendMutation = useMutation({
    mutationFn: (data: SendBroadcastRequest) => broadcastService.sendBroadcast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      const reach = TARGET_REACH[form.target];
      setForm({ title: '', message: '', category: 'GENERAL', priority: 'MEDIUM', target: 'ALL' });
      setConfirmSend(false);
      setSendSuccess(`Broadcast sent to ${reach} residents.`);
      setTimeout(() => setSendSuccess(''), 3000);
    },
    onError: (err: any) => { setFormErr(err.message || 'Failed to send broadcast.'); setConfirmSend(false); },
  });

  const handleSend = () => {
    if (!form.title.trim()) { setFormErr('Please enter a broadcast title.'); return; }
    if (!form.message.trim()) { setFormErr('Please enter a message to broadcast.'); return; }
    setFormErr('');
    setConfirmSend(true);
  };

  const isHighPriority = form.priority === 'CRITICAL' || form.priority === 'HIGH';
  const msgLen = form.message.length;
  const catMeta = CATEGORY_META[form.category];

  const renderHistoryItem = ({ item }: { item: Broadcast }) => {
    const cm = CATEGORY_META[item.category];
    const pm = PRIORITY_META[item.priority];
    const isUrgent = item.priority === 'CRITICAL' || item.priority === 'HIGH';
    return (
      <View style={[s.histCard, isUrgent && s.histCardUrgent]}>
        <View style={s.histTop}>
          <View style={[s.histIcon, { backgroundColor: cm.bg }]}>
            <Text style={s.histEmoji}>{cm.emoji}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={s.histTitle}>{item.title}</Text>
            <Text style={s.histTime}>{timeAgo(item.sentAt!)} · {item.sentBy}</Text>
          </View>
          <View style={[s.priorityBadge, { backgroundColor: pm.bg }]}>
            <Text style={[s.priorityText, { color: pm.color }]}>{pm.label}</Text>
          </View>
        </View>
        <Text style={s.histMsg} numberOfLines={2}>{item.message}</Text>
        <View style={s.histFooter}>
          <View style={[s.targetChip, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="people-outline" size={11} color={COLORS.primary} />
            <Text style={s.targetChipText}>{TARGET_OPTIONS.find(t => t.value === item.target)?.label}</Text>
          </View>
          {item.reachCount != null && (
            <Text style={s.reachText}>Delivered to {item.reachCount} residents</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Emergency Broadcast</Text>
          <Text style={s.headerSub}>Send alerts to all residents</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Compose card */}
        <View style={s.composeCard}>
          <Text style={s.composeTitle}>New Broadcast</Text>

          {/* Category */}
          <Text style={s.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(Object.keys(CATEGORY_META) as BroadcastCategory[]).map(cat => {
                const meta = CATEGORY_META[cat];
                const active = form.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[s.catChip, active && { backgroundColor: meta.color, borderColor: meta.color }]}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    <Text>{meta.emoji}</Text>
                    <Text style={[s.catChipText, active && { color: '#fff' }]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Title */}
          <Text style={s.label}>Title *</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Water Supply Interruption"
            placeholderTextColor={COLORS.textMuted}
            value={form.title}
            onChangeText={v => setForm(f => ({ ...f, title: v }))}
          />

          {/* Message */}
          <View style={s.msgLabelRow}>
            <Text style={s.label}>Message *</Text>
            <Text style={[s.charCount, msgLen > 180 && { color: '#DC2626' }]}>{msgLen}/200</Text>
          </View>
          <TextInput
            style={[s.input, s.msgInput]}
            placeholder="Type your message to residents..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            maxLength={200}
            value={form.message}
            onChangeText={v => setForm(f => ({ ...f, message: v }))}
            textAlignVertical="top"
          />

          {/* Priority */}
          <Text style={s.label}>Priority</Text>
          <View style={s.priorityRow}>
            {(Object.keys(PRIORITY_META) as BroadcastPriority[]).map(p => {
              const pm = PRIORITY_META[p];
              const active = form.priority === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[s.priorityChip, active && { backgroundColor: pm.color, borderColor: pm.color }]}
                  onPress={() => setForm(f => ({ ...f, priority: p }))}
                >
                  <Text style={[s.priorityChipText, active && { color: '#fff' }]}>{pm.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Target */}
          <Text style={s.label}>Send To</Text>
          <View style={s.targetRow}>
            {TARGET_OPTIONS.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[s.targetChipBtn, form.target === t.value && s.targetChipBtnActive]}
                onPress={() => setForm(f => ({ ...f, target: t.value }))}
              >
                <Text style={[s.targetBtnText, form.target === t.value && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.reachRow}>
            <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
            <Text style={s.reachLabel}>Will reach ~{TARGET_REACH[form.target]} residents</Text>
          </View>

          {/* Status banners */}
          {!!sendSuccess && (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={s.successBannerText}>{sendSuccess}</Text>
            </View>
          )}
          {!!formErr && (
            <View style={s.inlineErr}>
              <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
              <Text style={s.inlineErrText}>{formErr}</Text>
            </View>
          )}

          {/* Send button */}
          <TouchableOpacity
            style={[
              s.sendBtn,
              isHighPriority ? s.sendBtnRed : s.sendBtnGreen,
              sendMutation.isPending && { opacity: 0.7 },
            ]}
            onPress={handleSend}
            disabled={sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name={isHighPriority ? 'warning-outline' : 'notifications-outline'} size={18} color="#fff" />
                <Text style={s.sendBtnText}>
                  {isHighPriority ? 'Send Urgent Broadcast' : 'Send Broadcast'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* History */}
        <View style={s.histSection}>
          <Text style={s.histSectionTitle}>Recent Broadcasts</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: SPACING.lg }} />
          ) : (
            history.map(item => (
              <View key={item.id}>
                {renderHistoryItem({ item })}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Confirm send modal */}
      <Modal visible={confirmSend} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setConfirmSend(false)}>
          <View style={s.confirmSheet}>
            <Text style={s.confirmTitle}>Send {PRIORITY_META[form.priority].label} Broadcast?</Text>
            <Text style={s.confirmMsg}>"{form.title}"{'\n\n'}This will be sent to {TARGET_REACH[form.target]} residents immediately.</Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity style={s.confirmCancel} onPress={() => setConfirmSend(false)}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmOk, form.priority === 'CRITICAL' && s.confirmOkRed]}
                onPress={() => sendMutation.mutate(form)}
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.confirmOkText}>Send Now</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: 'rgba(220,38,38,0.12)',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Outfit-Bold', fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1, fontFamily: 'DMSans-Regular' },

  composeCard: { margin: SPACING.md, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(220,38,38,0.12)', ...SHADOWS.md },
  composeTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginBottom: SPACING.md },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 5, fontFamily: 'DMSans-Medium' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans-Regular', marginBottom: SPACING.md },
  msgInput: { height: 90, textAlignVertical: 'top' },
  msgLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  charCount: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  catChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },

  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md, flexWrap: 'wrap' },
  priorityChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  priorityChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold' },

  targetRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: SPACING.sm },
  targetChipBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  targetChipBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  targetBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, fontFamily: 'DMSans-Medium' },
  reachRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SPACING.lg },
  reachLabel: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },

  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.md, ...SHADOWS.sm },
  sendBtnRed: { backgroundColor: '#DC2626' },
  sendBtnGreen: { backgroundColor: '#059669' },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },

  histSection: { paddingHorizontal: SPACING.md },
  histSectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold', marginBottom: SPACING.md },
  histCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: 'rgba(99,102,241,0.1)', ...SHADOWS.sm },
  histCardUrgent: { borderLeftWidth: 4, borderLeftColor: '#DC2626' },
  histTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  histIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  histEmoji: { fontSize: 18 },
  histTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  histTime: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular', marginTop: 1 },
  priorityBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700', fontFamily: 'Outfit-Bold' },
  histMsg: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 17, marginBottom: SPACING.sm },
  histFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  targetChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  targetChipText: { fontSize: 10, fontWeight: '600', color: COLORS.primary, fontFamily: 'DMSans-Medium' },
  reachText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'DMSans-Regular' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  confirmSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, gap: SPACING.md },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, fontFamily: 'Outfit-Bold' },
  confirmMsg: { fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans-Regular', lineHeight: 18 },
  confirmBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  confirmCancel: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  confirmCancelText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, fontFamily: 'Outfit-Bold' },
  confirmOk: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', backgroundColor: '#059669' },
  confirmOkRed: { backgroundColor: '#DC2626' },
  confirmOkText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Outfit-Bold' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  successBannerText: { flex: 1, fontSize: 13, color: '#065F46', fontFamily: 'DMSans-Medium', fontWeight: '600' },
  inlineErr: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  inlineErrText: { flex: 1, fontSize: 12, color: '#DC2626', fontFamily: 'DMSans-Regular', lineHeight: 17 },
});
