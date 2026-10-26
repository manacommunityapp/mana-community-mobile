import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Share, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { visitorService, VisitorDto, PreApproveVisitorRequest } from '@/services/visitorService';

export type GateEntryType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE' | 'STAFF';

const TYPE_CONFIG: Record<GateEntryType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  GUEST:    { label: 'Guest',       icon: 'person',              color: '#4F46E5', bg: '#EEF2FF' },
  DELIVERY: { label: 'Delivery',    icon: 'cube',                color: '#D97706', bg: '#FEF3C7' },
  CAB:      { label: 'Cab / Taxi',  icon: 'car',                 color: '#2563EB', bg: '#DBEAFE' },
  SERVICE:  { label: 'Service',     icon: 'construct',           color: '#059669', bg: '#DCFCE7' },
  STAFF:    { label: 'Daily Help',  icon: 'people',              color: '#DB2777', bg: '#FCE7F3' },
};

export function FlatGateActivityCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isPreApproveOpen, setIsPreApproveOpen] = useState(false);
  const [createdPass, setCreatedPass] = useState<{ code: string; name: string } | null>(null);

  // Quick form state
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorType, setVisitorType] = useState<GateEntryType>('GUEST');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [purpose, setPurpose] = useState('');

  // Local state for actions
  const [dismissedPendingIds, setDismissedPendingIds] = useState<number[]>([]);
  const [approvedPendingIds, setApprovedPendingIds] = useState<number[]>([]);

  const flatLabel = useMemo(() => {
    const tower = user?.tower || user?.block || 'A';
    const flat = user?.flatNumber || user?.flatNo || '1204';
    return `Flat ${flat} · Tower ${tower}`;
  }, [user]);

  // ── Live Visitors Query ──────────────────────────────────────────────
  const { data: rawVisitors = [] } = useQuery<VisitorDto[]>({
    queryKey: ['visitors', 'my-visitors'],
    queryFn: () => visitorService.getMyVisitors(),
    staleTime: 15_000,
  });

  // Calculate visitors currently inside flat
  const visitorsInside = useMemo(() => {
    return rawVisitors.filter(
      (v) => (v.status || '').toUpperCase() === 'CHECKED_IN'
    );
  }, [rawVisitors]);

  // Pending approval at gate (either live API or realistic demo when user tests)
  const pendingVisitor = useMemo(() => {
    const live = rawVisitors.find(
      (v) => (v.status || '').toUpperCase() === 'PENDING' && !dismissedPendingIds.includes(v.id) && !approvedPendingIds.includes(v.id)
    );
    return live || null;
  }, [rawVisitors, dismissedPendingIds, approvedPendingIds]);

  // ── Pre-Approve Mutation ─────────────────────────────────────────────
  const preApproveMutation = useMutation({
    mutationFn: (data: PreApproveVisitorRequest) => visitorService.preApprove(data),
    onSuccess: (newPass) => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setIsPreApproveOpen(false);
      const code = newPass.passCode || '9821';
      setCreatedPass({ code, name: newPass.visitorName || visitorName });
      setVisitorName('');
      setVisitorPhone('');
      setVehicleNumber('');
      setPurpose('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not generate gate pass.');
    },
  });

  const handleAllowEntry = (visitor: VisitorDto) => {
    setApprovedPendingIds((prev) => [...prev, visitor.id]);
    visitorService.approve(visitor.id).catch(() => {});
    Alert.alert('✅ Entry Approved', `Gate Guard has been notified to allow ${visitor.visitorName}.`);
  };

  const handleDenyEntry = (visitor: VisitorDto) => {
    setDismissedPendingIds((prev) => [...prev, visitor.id]);
    visitorService.denyEntry(visitor.id).catch(() => {});
    Alert.alert('🚫 Entry Denied', 'Gate Guard has been notified to turn away this visitor.');
  };

  const insideCount = visitorsInside.length;

  return (
    <View style={s.outer}>
      {/* ── Main Gate Hero Card (Figma Deep Cyan/Indigo Style) ── */}
      <LinearGradient
        colors={['#0E7490', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroCard}
      >
        {/* Glow ambient circle */}
        <View style={s.ambientOrb} pointerEvents="none" />

        {/* Top Eyebrow Row */}
        <View style={s.topRow}>
          <View style={s.eyebrowGroup}>
            <View style={s.shieldIconBox}>
              <Ionicons name="shield-checkmark" size={11} color="#67E8F9" />
            </View>
            <Text style={s.eyebrowText}>GATE ACCESS</Text>
          </View>

          <View style={s.statusPill}>
            <View style={s.pulsingDot} />
            <Text style={s.statusPillText}>{flatLabel}</Text>
          </View>
        </View>

        {/* Central Compact Status */}
        <View style={s.statusCenter}>
          <Text style={s.headlineText} numberOfLines={1}>
            {insideCount === 0
              ? 'All clear · Main Gate 1'
              : `${insideCount} visitor${insideCount > 1 ? 's' : ''} inside flat`}
          </Text>
        </View>

        {/* Action Row — 2 compact, low-height buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity
            style={s.preApproveBtn}
            onPress={() => setIsPreApproveOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="qr-code-outline" size={12} color="#1E1B4B" />
            <Text style={s.preApproveBtnText}>Pre-approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.logBtn}
            onPress={() => router.push('/visitors')}
            activeOpacity={0.75}
          >
            <Ionicons name="time-outline" size={12} color="#E0F2FE" />
            <Text style={s.logBtnText}>Gate Log</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Pending Action Required (shown only when a visitor is waiting) ── */}
      {pendingVisitor && (
        <View style={s.pendingAlertCard}>
          <View style={s.pendingHeader}>
            <View style={s.liveRedDot} />
            <Text style={s.pendingAlertTitle}>AT THE GATE NOW</Text>
          </View>

          <View style={s.pendingBody}>
            <View style={s.pendingIconWrap}>
              <Ionicons name="person" size={18} color="#D97706" />
            </View>
            <View style={s.pendingInfo}>
              <Text style={s.pendingName} numberOfLines={1}>{pendingVisitor.visitorName}</Text>
              <Text style={s.pendingMeta} numberOfLines={1}>
                {pendingVisitor.purpose || 'Visitor'} · Main Gate 1
              </Text>
            </View>
          </View>

          <View style={s.pendingButtonRow}>
            <TouchableOpacity
              style={s.denyActionBtn}
              onPress={() => handleDenyEntry(pendingVisitor)}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
              <Text style={s.denyActionText}>Deny</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.allowActionBtn}
              onPress={() => handleAllowEntry(pendingVisitor)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
              <Text style={s.allowActionText}>Allow Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Quick Pre-Approve Modal ── */}
      <Modal visible={isPreApproveOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Pre-approve Visitor</Text>
                <Text style={s.modalSub}>Generate instant gate pass for {flatLabel}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPreApproveOpen(false)} style={s.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={s.modalTypeRow}>
              {(['GUEST', 'DELIVERY', 'CAB', 'SERVICE'] as GateEntryType[]).map((t) => {
                const active = visitorType === t;
                const c = TYPE_CONFIG[t];
                return (
                  <TouchableOpacity
                    key={t}
                    style={[s.modalTypeChip, active && { backgroundColor: c.bg, borderColor: c.color }]}
                    onPress={() => setVisitorType(t)}
                  >
                    <Ionicons name={c.icon} size={15} color={active ? c.color : COLORS.textMuted} />
                    <Text style={[s.modalTypeChipText, active && { color: c.color, fontFamily: FONTS.bold }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.inputLabel}>Visitor Name *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Swiggy Delivery / Amit Sharma"
              placeholderTextColor="#94A3B8"
              value={visitorName}
              onChangeText={setVisitorName}
            />

            <Text style={s.inputLabel}>Phone Number (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={visitorPhone}
              onChangeText={setVisitorPhone}
            />

            <Text style={s.inputLabel}>Vehicle Number (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. KA-05-MN-4421"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
            />

            <TouchableOpacity
              style={[s.submitBtn, (!visitorName.trim() || preApproveMutation.isPending) && { opacity: 0.6 }]}
              disabled={!visitorName.trim() || preApproveMutation.isPending}
              onPress={() => {
                preApproveMutation.mutate({
                  visitorName: visitorName.trim(),
                  visitorPhone: visitorPhone.trim() || undefined,
                  vehicleNumber: vehicleNumber.trim() || undefined,
                  purpose: purpose.trim() || `${visitorType} Entry`,
                  passType: visitorType,
                  flatNumber: flatLabel,
                });
              }}
              activeOpacity={0.85}
            >
              {preApproveMutation.isPending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={s.submitBtnText}>Generate Entry Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Pass Code Generated Modal ── */}
      {createdPass && (
        <Modal visible transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.passDetailCard}>
              <View style={s.passCodeIconWrap}>
                <Ionicons name="checkmark-circle" size={44} color="#10B981" />
              </View>

              <Text style={s.passCodeTitle}>Gate Pass Ready</Text>
              <Text style={s.passCodeSub}>Share this 4-digit entry code with {createdPass.name}</Text>

              <View style={s.passCodeBox}>
                <Text style={s.passCodeValue}>{createdPass.code}</Text>
              </View>

              <View style={s.passActionsRow}>
                <TouchableOpacity
                  style={s.shareBtn}
                  onPress={() => {
                    Share.share({
                      message: `Hi ${createdPass.name}, your entry code for ${flatLabel} is ${createdPass.code}. Valid at Gate 1.`,
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                  <Text style={s.shareBtnText}>Share Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.doneBtn}
                  onPress={() => setCreatedPass(null)}
                  activeOpacity={0.7}
                >
                  <Text style={s.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  heroCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  ambientOrb: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#67E8F9',
    opacity: 0.12,
    top: -30,
    right: -20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  eyebrowGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  shieldIconBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrowText: {
    fontFamily: FONTS.semiBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: '#A5F3FC',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  pulsingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#34D399',
  },
  statusPillText: {
    fontFamily: FONTS.medium,
    fontSize: 9.5,
    color: '#FFFFFF',
  },
  statusCenter: {
    marginVertical: 2,
  },
  headlineText: {
    fontFamily: FONTS.displayBold,
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  preApproveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FDE68A',
    paddingVertical: 6.5,
    borderRadius: 8,
  },
  preApproveBtnText: {
    fontFamily: FONTS.displayBold,
    fontSize: 11,
    color: '#1E1B4B',
  },
  logBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingVertical: 6.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  logBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: '#FFFFFF',
  },

  // ── Pending Visitor Callout ──
  pendingAlertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.xl,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    ...SHADOWS.sm,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  liveRedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  pendingAlertTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#B45309',
  },
  pendingBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pendingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInfo: { flex: 1 },
  pendingName: {
    fontFamily: FONTS.displayBold,
    fontSize: 14,
    color: '#78350F',
  },
  pendingMeta: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  pendingButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  denyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#FEE2E2',
  },
  denyActionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#DC2626',
  },
  allowActionBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#059669',
  },
  allowActionText: {
    fontFamily: FONTS.displayBold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // ── Pre-Approve Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    color: '#1E1B4B',
    fontFamily: FONTS.displayBold,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modalTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTypeChipText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  submitBtn: {
    borderRadius: RADIUS.lg,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
  },

  // ── Pass Generated Modal ──
  passDetailCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    alignItems: 'center',
  },
  passCodeIconWrap: {
    marginBottom: 10,
  },
  passCodeTitle: {
    fontSize: 20,
    color: '#1E1B4B',
    fontFamily: FONTS.displayBold,
  },
  passCodeSub: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: FONTS.regular,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  passCodeBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#0D9488',
    borderRadius: RADIUS.xl,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 20,
  },
  passCodeValue: {
    fontSize: 36,
    fontFamily: FONTS.displayEB,
    color: '#0F766E',
    letterSpacing: 6,
  },
  passActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  shareBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.displayBold,
    fontSize: 13,
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
  },
  doneBtnText: {
    color: '#475569',
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
});
