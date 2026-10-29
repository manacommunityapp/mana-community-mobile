import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, SPACING } from '@/constants/config';
import { visitorApprovalService, PendingApproval } from '@/services/visitorApprovalService';

const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }> = {
  GUEST:    { icon: 'person',          color: COLORS.primary, bg: '#EEF2FF', label: 'Guest' },
  DELIVERY: { icon: 'cube',            color: '#D97706',      bg: '#FEF3C7', label: 'Delivery' },
  CAB:      { icon: 'car',             color: '#2563EB',      bg: '#DBEAFE', label: 'Cab' },
  SERVICE:  { icon: 'construct',       color: '#059669',      bg: '#D1FAE5', label: 'Service' },
  FAMILY:   { icon: 'heart',           color: '#DB2777',      bg: '#FCE7F3', label: 'Family' },
  COURIER:  { icon: 'mail',            color: '#0891B2',      bg: '#CFFAFE', label: 'Courier' },
};

type DecisionState = 'idle' | 'approved' | 'denied';

function useWaitTimer(arrivedAt: string) {
  const [secs, setSecs] = useState(() =>
    Math.floor((Date.now() - new Date(arrivedAt).getTime()) / 1000)
  );
  useEffect(() => {
    const id = setInterval(() => {
      setSecs(Math.floor((Date.now() - new Date(arrivedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [arrivedAt]);
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (mins === 0) return `${remSecs}s`;
  return `${mins}m ${remSecs}s`;
}

export default function ApproveVisitorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data: string }>();
  const queryClient = useQueryClient();

  const visitor: PendingApproval | null = (() => {
    try { return params.data ? JSON.parse(params.data) : null; }
    catch { return null; }
  })();

  const [decision, setDecision] = useState<DecisionState>('idle');
  const [showDenySheet, setShowDenySheet] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [approveErr, setApproveErr] = useState('');
  const [denyErr, setDenyErr] = useState('');

  const waitLabel = useWaitTimer(visitor?.arrivedAt ?? new Date().toISOString());

  const approveMutation = useMutation({
    mutationFn: (id: number) => visitorApprovalService.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setDecision('approved');
    },
    onError: (err: any) => setApproveErr(err?.message || 'Could not approve entry. Please try again.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      visitorApprovalService.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setShowDenySheet(false);
      setDenyReason('');
      setDecision('denied');
    },
    onError: (err: any) => setDenyErr(err?.message || 'Could not deny entry. Please try again.'),
  });

  if (!visitor) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={s.errorTitle}>Visitor not found</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeMeta = TYPE_META[visitor.passType?.toUpperCase()] ?? TYPE_META.GUEST;
  const isUrgent = Math.floor((Date.now() - new Date(visitor.arrivedAt).getTime()) / 60000) >= 5;

  if (decision === 'approved') {
    return (
      <SafeAreaView style={[s.container, s.decisionBg]} edges={['top', 'bottom']}>
        <View style={s.decisionScreen}>
          <View style={[s.decisionIcon, { backgroundColor: '#059669' }]}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={s.decisionTitle}>Entry Approved</Text>
          <Text style={s.decisionSub}>
            {visitor.visitorName} has been allowed in.{'\n'}Security gate has been notified.
          </Text>
          <TouchableOpacity style={[s.decisionBtn, { backgroundColor: '#059669' }]} onPress={() => router.back()}>
            <Text style={s.decisionBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (decision === 'denied') {
    return (
      <SafeAreaView style={[s.container, s.decisionBg]} edges={['top', 'bottom']}>
        <View style={s.decisionScreen}>
          <View style={[s.decisionIcon, { backgroundColor: '#DC2626' }]}>
            <Ionicons name="close" size={40} color="#fff" />
          </View>
          <Text style={s.decisionTitle}>Entry Denied</Text>
          <Text style={s.decisionSub}>
            {visitor.visitorName} has been turned away.{'\n'}Security gate has been notified.
          </Text>
          <TouchableOpacity style={[s.decisionBtn, { backgroundColor: '#DC2626' }]} onPress={() => router.back()}>
            <Text style={s.decisionBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBackBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Visitor at Gate</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Urgent banner */}
        {isUrgent && (
          <View style={s.urgentBanner}>
            <Ionicons name="time" size={14} color="#B45309" />
            <Text style={s.urgentText}>Waiting {waitLabel} — please respond soon</Text>
          </View>
        )}

        {/* Visitor card */}
        <View style={s.visitorCard}>
          <View style={[s.typeIconLarge, { backgroundColor: typeMeta.bg }]}>
            <Ionicons name={typeMeta.icon} size={36} color={typeMeta.color} />
          </View>

          <Text style={s.visitorName}>{visitor.visitorName}</Text>
          <View style={s.typeBadge}>
            <Text style={[s.typeBadgeText, { color: typeMeta.color }]}>{typeMeta.label}</Text>
          </View>

          {!isUrgent && (
            <View style={s.waitRow}>
              <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.waitLabel}>Waiting {waitLabel}</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={s.detailCard}>
          <Text style={s.detailSectionTitle}>Visit Details</Text>

          <DetailRow icon="clipboard-outline" label="Purpose" value={visitor.purpose} />
          {visitor.flatNumber && (
            <DetailRow icon="home-outline" label="Flat" value={visitor.flatNumber} />
          )}
          {visitor.vehicleNumber && (
            <DetailRow icon="car-outline" label="Vehicle" value={visitor.vehicleNumber} />
          )}
          {visitor.gate && (
            <DetailRow icon="location-outline" label="Gate" value={visitor.gate} />
          )}
          {visitor.passCode && (
            <DetailRow icon="key-outline" label="Pass Code" value={visitor.passCode} mono />
          )}
        </View>

        {/* Guard info */}
        {visitor.guardName && (
          <View style={s.guardCard}>
            <View style={s.guardRow}>
              <View style={s.guardAvatar}>
                <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.guardLabel}>Security Guard</Text>
                <Text style={s.guardName}>{visitor.guardName}</Text>
              </View>
              {visitor.visitorPhone ? (
                <TouchableOpacity
                  style={s.callBtn}
                  onPress={() => Linking.openURL(`tel:${visitor.visitorPhone}`)}
                >
                  <Ionicons name="call" size={16} color="#059669" />
                  <Text style={s.callBtnText}>Call Visitor</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* Spacer so content isn't hidden behind CTA bar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA bar */}
      <View style={s.ctaBar}>
        {approveErr ? (
          <View style={s.inlineErr}>
            <Ionicons name="alert-circle-outline" size={14} color="#991B1B" />
            <Text style={s.inlineErrText}>{approveErr}</Text>
          </View>
        ) : null}
        <View style={s.ctaBtns}>
        <TouchableOpacity
          style={s.denyBtn}
          onPress={() => { setApproveErr(''); setShowDenySheet(true); }}
          disabled={approveMutation.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name="close-circle" size={20} color="#DC2626" />
          <Text style={s.denyBtnText}>Deny</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.approveBtn, approveMutation.isPending && { opacity: 0.7 }]}
          onPress={() => { setApproveErr(''); approveMutation.mutate(visitor.id); }}
          disabled={approveMutation.isPending}
          activeOpacity={0.85}
        >
          {approveMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={s.approveBtnText}>Allow Entry</Text>
            </>
          )}
        </TouchableOpacity>
        </View>
      </View>

      {/* Deny bottom sheet */}
      {showDenySheet && (
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={s.sheetDismiss} onPress={() => setShowDenySheet(false)} activeOpacity={1} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Deny Entry</Text>
            <Text style={s.sheetSub}>
              Turn away <Text style={{ fontWeight: '800' }}>{visitor.visitorName}</Text>?
            </Text>

            <Text style={s.inputLabel}>Reason (optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Not expected, unknown person…"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              value={denyReason}
              onChangeText={setDenyReason}
              autoFocus
            />

            {denyErr ? (
              <View style={s.inlineErr}>
                <Ionicons name="alert-circle-outline" size={14} color="#991B1B" />
                <Text style={s.inlineErrText}>{denyErr}</Text>
              </View>
            ) : null}

            <View style={s.sheetActions}>
              <TouchableOpacity
                style={s.sheetCancel}
                onPress={() => { setShowDenySheet(false); setDenyReason(''); setDenyErr(''); }}
              >
                <Text style={s.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.sheetConfirmDeny, rejectMutation.isPending && { opacity: 0.7 }]}
                onPress={() => rejectMutation.mutate({ id: visitor.id, reason: denyReason.trim() || undefined })}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.sheetConfirmDenyText}>Deny Entry</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function DetailRow({
  icon, label, value, mono = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon} size={15} color={COLORS.textMuted} style={{ width: 20 }} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, mono && { fontFamily: 'monospace', letterSpacing: 1.5 }]}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerBackBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },

  content: { padding: SPACING.md, gap: SPACING.md },

  urgentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF3C7', borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  urgentText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#B45309' },

  visitorCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    alignItems: 'center', paddingVertical: SPACING.xl, gap: 6,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md,
  },
  typeIconLarge: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  visitorName: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  typeBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    backgroundColor: '#F1F5F9', borderRadius: RADIUS.full,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  waitLabel: { fontSize: 12, color: COLORS.textMuted },

  detailCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, gap: 14,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  detailSectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 13, color: COLORS.textMuted, width: 70 },
  detailValue: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text },

  guardCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  guardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guardAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
  },
  guardLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  guardName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 1 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#D1FAE5', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  callBtnText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  // CTA bar
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    gap: 8,
    paddingHorizontal: SPACING.md, paddingBottom: 32, paddingTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    ...SHADOWS.lg,
  },
  ctaBtns: { flexDirection: 'row', gap: SPACING.md },
  inlineErr: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  inlineErrText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#991B1B' },
  denyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.lg,
    backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA',
  },
  denyBtnText: { fontSize: 15, fontWeight: '800', color: '#DC2626' },
  approveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: RADIUS.lg,
    backgroundColor: '#059669', ...SHADOWS.sm,
  },
  approveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Bottom sheet
  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetDismiss: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.xl, paddingBottom: 40, gap: 8,
    ...SHADOWS.lg,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  sheetSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10,
    fontSize: 13, color: COLORS.text, textAlignVertical: 'top', minHeight: 80,
  },
  sheetActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  sheetCancel: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  sheetCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  sheetConfirmDeny: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.lg,
    backgroundColor: '#DC2626', alignItems: 'center', ...SHADOWS.sm,
  },
  sheetConfirmDenyText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // Decision screens
  decisionBg: { backgroundColor: COLORS.background },
  decisionScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: SPACING.xl },
  decisionIcon: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  decisionTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  decisionSub: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center', lineHeight: 22 },
  decisionBtn: {
    marginTop: 16, paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: RADIUS.lg, ...SHADOWS.sm,
  },
  decisionBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Error state
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  backBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: RADIUS.lg, backgroundColor: COLORS.primary },
  backBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
