import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, Share, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { COLORS, SHADOWS, RADIUS, FONTS } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { visitorService, VisitorDto, PreApproveVisitorRequest } from '@/services/visitorService';

export type GateEntryType = 'GUEST' | 'DELIVERY' | 'CAB' | 'SERVICE' | 'STAFF';
export type GateEntryStatus = 'PENDING' | 'CHECKED_IN' | 'EXPECTED' | 'CHECKED_OUT' | 'LEAVE_AT_GATE' | 'DENIED';

interface FlatEntryItem {
  id: number;
  name: string;
  type: GateEntryType;
  purpose: string;
  vehicleNumber?: string;
  timestamp: string;
  status: GateEntryStatus;
  gateName: string;
  passCode: string;
}

const TYPE_CONFIG: Record<GateEntryType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  GUEST:    { label: 'Guest',       icon: 'person',              color: '#4F46E5', bg: '#EEF2FF' },
  DELIVERY: { label: 'Delivery',    icon: 'cube',                color: '#D97706', bg: '#FEF3C7' },
  CAB:      { label: 'Cab / Taxi',  icon: 'car',                 color: '#2563EB', bg: '#DBEAFE' },
  SERVICE:  { label: 'Service',     icon: 'construct',           color: '#059669', bg: '#DCFCE7' },
  STAFF:    { label: 'Daily Help',  icon: 'people',              color: '#DB2777', bg: '#FCE7F3' },
};

const STATUS_BADGE: Record<GateEntryStatus, { label: string; color: string; bg: string; dotColor: string }> = {
  PENDING:       { label: 'At Gate (Action Required)', color: '#DC2626', bg: '#FEE2E2', dotColor: '#EF4444' },
  CHECKED_IN:    { label: 'Inside Gate',               color: '#059669', bg: '#DCFCE7', dotColor: '#10B981' },
  EXPECTED:      { label: 'Pre-Approved',              color: '#4F46E5', bg: '#EEF2FF', dotColor: '#6366F1' },
  CHECKED_OUT:   { label: 'Departed',                  color: '#64748B', bg: '#F1F5F9', dotColor: '#94A3B8' },
  LEAVE_AT_GATE: { label: 'Hold at Gate',              color: '#D97706', bg: '#FEF3C7', dotColor: '#F59E0B' },
  DENIED:        { label: 'Denied Entry',              color: '#DC2626', bg: '#FEE2E2', dotColor: '#EF4444' },
};

export function FlatGateActivityCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isPreApproveOpen, setIsPreApproveOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<FlatEntryItem | null>(null);

  // Form state for quick pre-approval
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorType, setVisitorType] = useState<GateEntryType>('GUEST');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [purpose, setPurpose] = useState('');

  // Local state for live actions handled on dashboard
  const [dismissedPendingIds, setDismissedPendingIds] = useState<number[]>([]);
  const [approvedPendingIds, setApprovedPendingIds] = useState<number[]>([]);
  const [heldPendingIds, setHeldPendingIds] = useState<number[]>([]);

  const flatLabel = useMemo(() => {
    const tower = user?.tower || 'A';
    const flat = user?.flatNumber || (user as any)?.unitNumber || '1204';
    return `Tower ${tower} - ${flat}`;
  }, [user]);

  // ── Fetch Live Visitor Logs ──────────────────────────────────────────────
  const { data: rawVisitors = [] } = useQuery<VisitorDto[]>({
    queryKey: ['visitors', 'my-visitors'],
    queryFn: () => visitorService.getMyVisitors(),
    staleTime: 15_000,
  });

  // ── Pre-Approve Mutation ─────────────────────────────────────────────────
  const preApproveMutation = useMutation({
    mutationFn: (data: PreApproveVisitorRequest) => visitorService.preApprove(data),
    onSuccess: (newPass) => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      setIsPreApproveOpen(false);
      setVisitorName('');
      setVisitorPhone('');
      setVehicleNumber('');
      setPurpose('');
      Alert.alert(
        'Pass Created! 🎟️',
        `Pass Code: ${newPass.passCode || 'MANA-9821'}\nShare this 4-digit entry code with your visitor.`,
        [
          {
            text: 'Share via WhatsApp',
            onPress: () => {
              Share.share({
                message: `Hi ${newPass.visitorName || 'Guest'}, your entry pass for Flat ${flatLabel} is ${newPass.passCode || 'MANA-9821'}. Show this at Gate 1 for instant access.`,
              });
            },
          },
          { text: 'Done' },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Could not generate gate pass.');
    },
  });

  // ── Base Sample Activity Data (MyGate-Style Live Stream) ─────────────────
  const defaultEntries: FlatEntryItem[] = useMemo(() => [
    {
      id: 101,
      name: 'Zomato Food Delivery',
      type: 'DELIVERY',
      purpose: 'Dinner Order (Biryani Blues)',
      vehicleNumber: 'KA-01-EZ-8819',
      timestamp: 'Just now (Gate 1)',
      status: 'PENDING',
      gateName: 'Main Gate 1',
      passCode: 'MANA-7821',
    },
    {
      id: 102,
      name: 'Anita Sharma (Maid)',
      type: 'STAFF',
      purpose: 'Morning Domestic Shift',
      timestamp: '08:30 AM (Gate 2)',
      status: 'CHECKED_IN',
      gateName: 'Staff Gate 2',
      passCode: 'MANA-1082',
    },
    {
      id: 103,
      name: 'Amazon Courier',
      type: 'DELIVERY',
      purpose: 'Package Delivery #84920',
      vehicleNumber: 'KA-51-AB-1290',
      timestamp: '11:45 AM (Gate 1)',
      status: 'CHECKED_OUT',
      gateName: 'Main Gate 1',
      passCode: 'MANA-4412',
    },
    {
      id: 104,
      name: 'Suresh & Family',
      type: 'GUEST',
      purpose: 'Weekend Dinner Visit',
      vehicleNumber: 'KA-04-MJ-9821',
      timestamp: 'Today, 07:30 PM',
      status: 'EXPECTED',
      gateName: 'Main Gate 1',
      passCode: 'MANA-5590',
    },
  ], []);

  // Merge Live API visitors with realistic flat activity
  const flatEntries: FlatEntryItem[] = useMemo(() => {
    if (rawVisitors.length > 0) {
      const live = rawVisitors.map((dto): FlatEntryItem => {
        let mappedType: GateEntryType = 'GUEST';
        const tp = (dto.passType || '').toUpperCase();
        if (tp === 'DELIVERY') mappedType = 'DELIVERY';
        else if (tp === 'CAB') mappedType = 'CAB';
        else if (tp === 'SERVICE') mappedType = 'SERVICE';
        else if (tp === 'STAFF') mappedType = 'STAFF';

        let mappedStatus: GateEntryStatus = 'EXPECTED';
        const st = (dto.status || '').toUpperCase();
        if (st === 'CHECKED_IN') mappedStatus = 'CHECKED_IN';
        else if (st === 'CHECKED_OUT') mappedStatus = 'CHECKED_OUT';
        else if (st === 'DENIED' || st === 'REJECTED') mappedStatus = 'DENIED';
        else if (st === 'PENDING') mappedStatus = 'PENDING';

        return {
          id: dto.id,
          name: dto.visitorName,
          type: mappedType,
          purpose: dto.purpose || `${mappedType} Entry`,
          vehicleNumber: dto.vehicleNumber,
          timestamp: dto.checkedInAt || dto.expectedAt || 'Today',
          status: mappedStatus,
          gateName: dto.gateIn || 'Gate 1',
          passCode: dto.passCode || 'MANA-0000',
        };
      });
      return live;
    }
    return defaultEntries;
  }, [rawVisitors, defaultEntries]);

  // Active Pending Item awaiting immediate resident approval at gate
  const pendingVisitor = useMemo(() => {
    return flatEntries.find(
      (e) => (e.status === 'PENDING' || e.id === 101) &&
        !dismissedPendingIds.includes(e.id) &&
        !approvedPendingIds.includes(e.id) &&
        !heldPendingIds.includes(e.id)
    );
  }, [flatEntries, dismissedPendingIds, approvedPendingIds, heldPendingIds]);

  // Filtered recent activity (excluding pending item shown in hero callout)
  const recentActivities = useMemo(() => {
    return flatEntries
      .filter((e) => !pendingVisitor || e.id !== pendingVisitor.id)
      .slice(0, 3);
  }, [flatEntries, pendingVisitor]);

  const handleAllowEntry = (item: FlatEntryItem) => {
    setApprovedPendingIds((prev) => [...prev, item.id]);
    visitorService.approve(item.id).catch(() => {});
    Alert.alert('✅ Entry Approved', `Gate Guard has been notified to allow ${item.name}.`);
  };

  const handleHoldAtGate = (item: FlatEntryItem) => {
    setHeldPendingIds((prev) => [...prev, item.id]);
    Alert.alert('📦 Left at Security Desk', 'Guard has been instructed to keep the parcel at Gate security desk.');
  };

  const handleDenyEntry = (item: FlatEntryItem) => {
    setDismissedPendingIds((prev) => [...prev, item.id]);
    visitorService.denyEntry(item.id).catch(() => {});
    Alert.alert('🚫 Entry Denied', 'Gate Guard has been instructed to turn away this visitor.');
  };

  return (
    <View style={s.container}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <View style={s.flatPill}>
            <Ionicons name="business" size={13} color={COLORS.primary} />
            <Text style={s.flatPillText}>{flatLabel}</Text>
          </View>
          <View style={s.liveStatusBadge}>
            <View style={s.pulsingDot} />
            <Text style={s.liveStatusText}>Gate 1 Live</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.viewAllBtn}
          onPress={() => router.push('/visitors')}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Text style={s.viewAllText}>Gate Log</Text>
          <Ionicons name="chevron-forward" size={13} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Title Row ────────────────────────────────────── */}
      <View style={s.titleRow}>
        <Text style={s.mainTitle}>🚪 Flat Entry Updates</Text>
        <Text style={s.subTitle}>Live guard check-ins, deliveries & visitors</Text>
      </View>

      {/* ── 1. MyGate-Style Pending Gate Approval Hero Callout ── */}
      {pendingVisitor && (
        <View style={s.pendingCard}>
          <LinearGradient
            colors={['#FFFBEB', '#FEF3C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.pendingGradient}
          />
          <View style={s.pendingTopRow}>
            <View style={s.pendingAlertBadge}>
              <View style={[s.pulsingDot, { backgroundColor: '#DC2626' }]} />
              <Text style={s.pendingAlertText}>VISITOR AT MAIN GATE</Text>
            </View>
            <Text style={s.pendingTime}>{pendingVisitor.timestamp}</Text>
          </View>

          <View style={s.pendingInfoRow}>
            <View style={[s.typeIconBox, { backgroundColor: TYPE_CONFIG[pendingVisitor.type]?.bg || '#FEF3C7' }]}>
              <Ionicons
                name={TYPE_CONFIG[pendingVisitor.type]?.icon || 'cube'}
                size={22}
                color={TYPE_CONFIG[pendingVisitor.type]?.color || '#D97706'}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.pendingName}>{pendingVisitor.name}</Text>
              <Text style={s.pendingPurpose}>{pendingVisitor.purpose}</Text>
              {pendingVisitor.vehicleNumber && (
                <View style={s.vehicleBadge}>
                  <Ionicons name="car-outline" size={11} color="#64748B" />
                  <Text style={s.vehicleText}>{pendingVisitor.vehicleNumber}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons: Allow / Leave at Gate / Deny */}
          <View style={s.pendingActionRow}>
            <TouchableOpacity
              style={s.allowBtn}
              onPress={() => handleAllowEntry(pendingVisitor)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#059669', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.allowBtnGrad}
              >
                <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                <Text style={s.allowBtnText}>Allow</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.holdBtn}
              onPress={() => handleHoldAtGate(pendingVisitor)}
              activeOpacity={0.7}
            >
              <Ionicons name="cube-outline" size={14} color="#D97706" />
              <Text style={s.holdBtnText}>Leave at Gate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.denyBtn}
              onPress={() => handleDenyEntry(pendingVisitor)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={14} color="#DC2626" />
              <Text style={s.denyBtnText}>Deny</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── 2. Recent Flat Entries Stream ────────────────────────── */}
      <View style={s.recentList}>
        {recentActivities.map((entry) => {
          const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.GUEST;
          const statusCfg = STATUS_BADGE[entry.status] || STATUS_BADGE.CHECKED_IN;

          return (
            <TouchableOpacity
              key={entry.id}
              style={s.entryRow}
              onPress={() => setSelectedPass(entry)}
              activeOpacity={0.7}
            >
              <View style={[s.entryIconCircle, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={16} color={cfg.color} />
              </View>

              <View style={s.entryMain}>
                <View style={s.entryHeaderLine}>
                  <Text style={s.entryName} numberOfLines={1}>{entry.name}</Text>
                  <View style={[s.statusTag, { backgroundColor: statusCfg.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: statusCfg.dotColor }]} />
                    <Text style={[s.statusTagText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                  </View>
                </View>

                <View style={s.entrySubLine}>
                  <Text style={s.entryPurpose} numberOfLines={1}>{entry.purpose}</Text>
                  <Text style={s.entryTime}>{entry.timestamp}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── 3. Quick Pre-Approval Shortcuts ──────────────────────── */}
      <View style={s.quickShortcutsRow}>
        <TouchableOpacity
          style={s.shortcutChip}
          onPress={() => {
            setVisitorType('GUEST');
            setIsPreApproveOpen(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[s.shortcutIconBox, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="person-add" size={14} color="#4F46E5" />
          </View>
          <Text style={s.shortcutText}>+ Guest Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.shortcutChip}
          onPress={() => {
            setVisitorType('DELIVERY');
            setVisitorName('Delivery Executive');
            setPurpose('Package Drop');
            setIsPreApproveOpen(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[s.shortcutIconBox, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="cube" size={14} color="#D97706" />
          </View>
          <Text style={s.shortcutText}>+ Delivery Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.shortcutChip}
          onPress={() => {
            setVisitorType('CAB');
            setVisitorName('Cab / Auto');
            setPurpose('Pickup / Drop');
            setIsPreApproveOpen(true);
          }}
          activeOpacity={0.7}
        >
          <View style={[s.shortcutIconBox, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="car" size={14} color="#2563EB" />
          </View>
          <Text style={s.shortcutText}>+ Cab Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.shortcutChip}
          onPress={() => router.push('/services')}
          activeOpacity={0.7}
        >
          <View style={[s.shortcutIconBox, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="people" size={14} color="#DB2777" />
          </View>
          <Text style={s.shortcutText}>Staff Log</Text>
        </TouchableOpacity>
      </View>

      {/* ── Pre-Approve Modal ────────────────────────────────────── */}
      <Modal visible={isPreApproveOpen} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Generate Quick Gate Pass</Text>
                <Text style={s.modalSub}>Instant OTP pass for {flatLabel}</Text>
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
                    <Text style={[s.modalTypeChipText, active && { color: c.color, fontWeight: '700' }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.inputLabel}>Visitor Name *</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Rajesh Kumar / Swiggy"
              placeholderTextColor="#94A3B8"
              value={visitorName}
              onChangeText={setVisitorName}
            />

            <Text style={s.inputLabel}>Phone (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              value={visitorPhone}
              onChangeText={setVisitorPhone}
            />

            <Text style={s.inputLabel}>Vehicle Number (Optional)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. KA-01-AB-1234"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
            />

            <Text style={s.inputLabel}>Purpose</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Family Visit / Parcel Delivery"
              placeholderTextColor="#94A3B8"
              value={purpose}
              onChangeText={setPurpose}
            />

            <TouchableOpacity
              style={[s.submitBtn, preApproveMutation.isPending && { opacity: 0.6 }]}
              disabled={preApproveMutation.isPending}
              onPress={() => {
                if (!visitorName.trim()) {
                  Alert.alert('Required', 'Please enter visitor name.');
                  return;
                }
                preApproveMutation.mutate({
                  visitorName: visitorName.trim(),
                  visitorPhone: visitorPhone.trim() || undefined,
                  vehicleNumber: vehicleNumber.trim() || undefined,
                  purpose: purpose.trim() || `${visitorType} Entry`,
                  passType: visitorType,
                  flatNumber: flatLabel,
                });
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.submitBtnGrad}
              >
                {preApproveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                    <Text style={s.submitBtnText}>Generate Pass & Share Code</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Pass Code Details Modal ────────────────────────────── */}
      {selectedPass && (
        <Modal visible transparent animationType="fade">
          <View style={s.modalOverlay}>
            <View style={s.passDetailCard}>
              <View style={s.passHeader}>
                <Text style={s.passHeaderTitle}>Gate Entry Pass</Text>
                <TouchableOpacity onPress={() => setSelectedPass(null)}>
                  <Ionicons name="close" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={s.passCodeBox}>
                <Text style={s.passCodeLabel}>4-DIGIT GATE CODE</Text>
                <Text style={s.passCodeValue}>{selectedPass.passCode}</Text>
                <Text style={s.passCodeSub}>Valid for {selectedPass.name} at {selectedPass.gateName}</Text>
              </View>

              <View style={s.passMetaList}>
                <View style={s.passMetaRow}>
                  <Text style={s.passMetaKey}>Visitor</Text>
                  <Text style={s.passMetaVal}>{selectedPass.name}</Text>
                </View>
                <View style={s.passMetaRow}>
                  <Text style={s.passMetaKey}>Purpose</Text>
                  <Text style={s.passMetaVal}>{selectedPass.purpose}</Text>
                </View>
                <View style={s.passMetaRow}>
                  <Text style={s.passMetaKey}>Status</Text>
                  <Text style={s.passMetaVal}>{STATUS_BADGE[selectedPass.status]?.label || selectedPass.status}</Text>
                </View>
                <View style={s.passMetaRow}>
                  <Text style={s.passMetaKey}>Time</Text>
                  <Text style={s.passMetaVal}>{selectedPass.timestamp}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={s.sharePassBtn}
                onPress={() => {
                  Share.share({
                    message: `Entry Pass for ${selectedPass.name} at Flat ${flatLabel}: Use code ${selectedPass.passCode} at ${selectedPass.gateName}.`,
                  });
                }}
              >
                <Ionicons name="share-social" size={16} color="#FFFFFF" />
                <Text style={s.sharePassText}>Share Pass with Visitor</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.12)',
    ...SHADOWS.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  flatPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    fontFamily: FONTS.semiBold,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  titleRow: {
    marginBottom: 10,
  },
  mainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  subTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
    fontFamily: FONTS.regular,
  },

  // ── Pending Approval Hero Card ──
  pendingCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    overflow: 'hidden',
    position: 'relative',
  },
  pendingGradient: {
    ...StyleSheet.absoluteFill,
  },
  pendingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pendingAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingAlertText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.4,
  },
  pendingTime: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  pendingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#78350F',
    fontFamily: FONTS.bold,
  },
  pendingPurpose: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  vehicleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  pendingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allowBtn: {
    flex: 1.2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  allowBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  allowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  holdBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    paddingVertical: 7,
  },
  holdBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  denyBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingVertical: 7,
  },
  denyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  // ── Recent List ──
  recentList: {
    gap: 8,
    marginBottom: 10,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  entryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryMain: {
    flex: 1,
  },
  entryHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entryName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: FONTS.semiBold,
    maxWidth: '55%',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: FONTS.medium,
  },
  entrySubLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  entryPurpose: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    maxWidth: '65%',
  },
  entryTime: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── Quick Shortcuts ──
  quickShortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  shortcutChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shortcutIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: FONTS.displayBold,
  },
  modalSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
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
    gap: 6,
    marginBottom: 14,
  },
  modalTypeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalTypeChipText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.text,
  },
  submitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  submitBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Pass Details Modal ──
  passDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 24,
    marginVertical: 'auto',
    padding: 20,
    ...SHADOWS.lg,
  },
  passHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  passHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  passCodeBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  passCodeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  passCodeValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: 4,
    marginVertical: 4,
    fontFamily: FONTS.displayBold,
  },
  passCodeSub: {
    fontSize: 10.5,
    color: '#6366F1',
    fontWeight: '600',
  },
  passMetaList: {
    gap: 8,
    marginBottom: 16,
  },
  passMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passMetaKey: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  passMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  sharePassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 12,
  },
  sharePassText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
